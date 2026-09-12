import { supabase } from '@/lib/supabase';
import { emitTableChange } from '@/lib/useRealtimeSync';
import { classifyPaymentMethod } from '@/lib/helpers';
import { syncAllWarehouseBalances } from '@/lib/inventory_engine';

/**
 * 🔄 إعادة احتساب وتحديث إجماليات ونقدية ومبيعات وردية كاشير بدقة 100%
 */
export async function recalculatePosShift(shiftId: string) {
  if (!shiftId) return null;

  try {
    const { data: shift, error: sErr } = await supabase
      .from('pos_shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (sErr || !shift) {
      console.warn(`Shift ${shiftId} not found for recalculation`);
      return null;
    }

    // 1. الفواتير النشطة (غير الملغية)
    const { data: invoices = [] } = await supabase
      .from('invoices')
      .select('id, total_amount, payment_method, lines_data, status')
      .eq('shift_id', shiftId)
      .neq('status', 'ملغي');

    // 2. المصروفات النشطة (غير المحذوفة)
    const { data: expenses = [] } = await supabase
      .from('expenses')
      .select('id, total_price, paid_amount, payment_method, is_deleted')
      .eq('shift_id', shiftId)
      .neq('is_deleted', true);

    // 3. سندات القبض النشطة التابعة للوردية
    const { data: receipts = [] } = await supabase
      .from('receipt_vouchers')
      .select('id, amount, payment_method, invoice_id, status')
      .eq('shift_id', shiftId)
      .neq('status', 'ملغي');

    // 4. جلب الأصناف الخاضعة لعهدة فوارغ المياه
    const { data: retItems } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('is_returnable_bottle', true);
    const retSet = new Set((retItems || []).map(r => r.id));

    let cashSales = 0, cardSales = 0, creditSales = 0;
    let bottlesSold = 0;

    (invoices || []).forEach(inv => {
      const amt = Number(inv.total_amount || 0);
      const cat = classifyPaymentMethod(inv.payment_method);
      if (cat === 'card') cardSales += amt;
      else if (cat === 'credit') creditSales += amt;
      else cashSales += amt;

      let lines: any[] = [];
      try {
        lines = Array.isArray(inv.lines_data)
          ? inv.lines_data
          : (typeof inv.lines_data === 'string' ? JSON.parse(inv.lines_data) : []);
      } catch (e) {
        lines = [];
      }

      lines.forEach((line: any) => {
        if (line.is_returnable_bottle || retSet.has(line.item_id || line.id)) {
          bottlesSold += Number(line.quantity || line.qty || 0);
        }
      });
    });

    const totalSales = cashSales + cardSales + creditSales;

    let totalExpenses = 0, cashExpenses = 0;
    (expenses || []).forEach(exp => {
      const amt = Number(exp.total_price || exp.paid_amount || 0);
      totalExpenses += amt;
      if (classifyPaymentMethod(exp.payment_method) === 'cash') {
        cashExpenses += amt;
      }
    });

    const shiftInvSet = new Set((invoices || []).map(i => i.id));
    let standaloneCashReceipts = 0;
    (receipts || []).forEach((rc: any) => {
      if (!rc.invoice_id || !shiftInvSet.has(rc.invoice_id)) {
        if (classifyPaymentMethod(rc.payment_method) === 'cash') {
          standaloneCashReceipts += Number(rc.amount || 0);
        }
      }
    });

    const startingCash = Number(shift.starting_cash || 0);
    const expectedCash = startingCash + cashSales + standaloneCashReceipts - cashExpenses;
    const actualCash = Number(shift.actual_cash || 0);
    const shortageOverage = (shift.status === 'closed' || actualCash > 0) ? (actualCash - expectedCash) : 0;
    const bottlesShortage = bottlesSold - Number(shift.bottles_returned || 0);

    // تحديث جدول pos_shifts
    await supabase.from('pos_shifts').update({
      total_sales: totalSales,
      total_cash_sales: cashSales,
      total_card_sales: cardSales,
      total_credit_sales: creditSales,
      total_expenses: totalExpenses,
      expected_cash: expectedCash,
      shortage_overage: shortageOverage,
      bottles_sold: bottlesSold,
      bottles_shortage: bottlesShortage
    }).eq('id', shiftId);

    emitTableChange('pos_shifts');
    return {
      shiftId,
      totalSales,
      cashSales,
      cardSales,
      creditSales,
      totalExpenses,
      expectedCash,
      shortageOverage
    };
  } catch (err) {
    console.error('Error recalculating pos shift:', err);
    return null;
  }
}

/**
 * 🗑️ حذف قيود اليومية مع فحص وتعديل الورديات المرتبطة تلقائياً
 */
export async function reconcileShiftOnJournalDeletion(headerIds: string[]) {
  if (!headerIds || headerIds.length === 0) {
    return { success: false, message: 'لا توجد قيود محددة' };
  }

  // 1. جلب بيانات القيود المحددة
  const { data: headers, error: hErr } = await supabase
    .from('journal_headers')
    .select('id, v_type, reference_id, description')
    .in('id', headerIds);

  if (hErr) throw hErr;

  const affectedShiftIds = new Set<string>();
  const invoicesToCancel: string[] = [];
  const receiptsToCancel: string[] = [];
  const expensesToCancel: string[] = [];
  const extraHeaderIdsToDelete: string[] = [];

  // جمع كافة المراجع
  const referenceIds = (headers || []).map(h => h.reference_id).filter(Boolean);

  // 2. فحص الفواتير
  if (referenceIds.length > 0) {
    const { data: linkedInvoices } = await supabase
      .from('invoices')
      .select('id, shift_id, warehouse_id, lines_data, status')
      .in('id', referenceIds);

    for (const inv of (linkedInvoices || [])) {
      if (inv.shift_id) {
        affectedShiftIds.add(inv.shift_id);
      }
      invoicesToCancel.push(inv.id);

      // إعادة كميات الأصناف للمستودع إن كانت الفاتورة نشطة
      if (inv.status !== 'ملغي') {
        let lines: any[] = [];
        try {
          lines = Array.isArray(inv.lines_data)
            ? inv.lines_data
            : (typeof inv.lines_data === 'string' ? JSON.parse(inv.lines_data) : []);
        } catch (e) {
          lines = [];
        }

        for (const line of lines) {
          const qty = Number(line.quantity || line.qty || 0);
          const itemId = line.item_id || line.id;
          const whId = line.warehouse_id || inv.warehouse_id;

          if (itemId && qty > 0) {
            // إعادة للرصيد الكلي
            const { data: catItem } = await supabase
              .from('inventory_items')
              .select('current_quantity')
              .eq('id', itemId)
              .maybeSingle();
            if (catItem) {
              await supabase
                .from('inventory_items')
                .update({ current_quantity: (Number(catItem.current_quantity) || 0) + qty })
                .eq('id', itemId);
            }

            // إعادة لرصيد المستودع
            if (whId) {
              const { data: whInv } = await supabase
                .from('warehouse_inventory')
                .select('id, quantity')
                .eq('warehouse_id', whId)
                .eq('item_id', itemId)
                .maybeSingle();
              if (whInv) {
                await supabase
                  .from('warehouse_inventory')
                  .update({ quantity: (Number(whInv.quantity) || 0) + qty })
                  .eq('id', whInv.id);
              }
            }
          }
        }
      }

      // البحث عن أي سند قبض مرتبط بهذه الفاتورة
      const { data: invReceipts } = await supabase
        .from('receipt_vouchers')
        .select('id')
        .eq('invoice_id', inv.id);

      (invReceipts || []).forEach(r => receiptsToCancel.push(r.id));
    }

    // 3. فحص سندات القبض
    const { data: linkedReceipts } = await supabase
      .from('receipt_vouchers')
      .select('id, shift_id, invoice_id')
      .in('id', referenceIds);

    for (const rc of (linkedReceipts || [])) {
      if (rc.shift_id) affectedShiftIds.add(rc.shift_id);
      receiptsToCancel.push(rc.id);
    }

    // 4. فحص المصروفات
    const { data: linkedExpenses } = await supabase
      .from('expenses')
      .select('id, shift_id')
      .in('id', referenceIds);

    for (const exp of (linkedExpenses || [])) {
      if (exp.shift_id) affectedShiftIds.add(exp.shift_id);
      expensesToCancel.push(exp.id);
    }
  }

  // 5. إلغاء الفواتير المرتبطة
  if (invoicesToCancel.length > 0) {
    await supabase
      .from('invoices')
      .update({ status: 'ملغي', payment_status: 'cancelled' })
      .in('id', invoicesToCancel);
    emitTableChange('invoices');
  }

  // 6. إلغاء سندات القبض المرتبطة وجلب قيودها لحذفها
  if (receiptsToCancel.length > 0) {
    await supabase
      .from('receipt_vouchers')
      .update({ status: 'ملغي' })
      .in('id', receiptsToCancel);

    const { data: rcJournals } = await supabase
      .from('journal_headers')
      .select('id')
      .in('reference_id', receiptsToCancel);
    (rcJournals || []).forEach(j => extraHeaderIdsToDelete.push(j.id));
    emitTableChange('receipt_vouchers');
  }

  // 7. حذف المصروفات المرتبطة
  if (expensesToCancel.length > 0) {
    await supabase
      .from('expenses')
      .update({ is_deleted: true, is_posted: false })
      .in('id', expensesToCancel);
    emitTableChange('expenses');
  }

  // 8. حذف سطور وقيود اليومية
  const allHeadersToDelete = Array.from(new Set([...headerIds, ...extraHeaderIdsToDelete]));
  if (allHeadersToDelete.length > 0) {
    await supabase.from('journal_lines').delete().in('header_id', allHeadersToDelete);
    await supabase.from('journal_headers').delete().in('id', allHeadersToDelete);
    emitTableChange('journal_headers');
    emitTableChange('journal_lines');
  }

  // 9. إعادة احتساب جميع الورديات المتأثرة
  for (const shiftId of affectedShiftIds) {
    await recalculatePosShift(shiftId);
  }

  if (invoicesToCancel.length > 0) {
    emitTableChange('warehouse_inventory');
    emitTableChange('inventory_items');
    syncAllWarehouseBalances().catch(() => {});
  }

  return {
    success: true,
    deletedHeadersCount: allHeadersToDelete.length,
    affectedShiftsCount: affectedShiftIds.size,
    cancelledInvoicesCount: invoicesToCancel.length
  };
}

/**
 * ↩️ فك ترحيل قيد يومية مع تحديث حالة الوردية والفاتورة المرتبطة
 */
export async function reconcileShiftOnJournalUnpost(headerId: string) {
  if (!headerId) return;

  const { data: header } = await supabase
    .from('journal_headers')
    .select('id, v_type, reference_id')
    .eq('id', headerId)
    .single();

  await supabase
    .from('journal_headers')
    .update({ status: 'draft' })
    .eq('id', headerId);

  if (header?.reference_id) {
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, shift_id')
      .eq('id', header.reference_id)
      .maybeSingle();

    if (inv?.shift_id) {
      await supabase
        .from('invoices')
        .update({ status: 'مسودة' })
        .eq('id', inv.id);

      await recalculatePosShift(inv.shift_id);
      emitTableChange('invoices');
    }
  }

  emitTableChange('journal_headers');
}
