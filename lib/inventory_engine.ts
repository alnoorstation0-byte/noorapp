import { supabase } from '@/lib/supabase';
import { ACC } from '@/lib/account-ids';
import { emitTableChange } from '@/lib/useRealtimeSync';

export const MAIN_WAREHOUSE_ID = '11111111-1111-1111-1111-111111111111';

/**
 * 🔄 إعادة احتساب ومزامنة كافة أرصدة المستودعات وخزانات الوقود
 * متوافقة 100% مع اسكيما قاعدة البيانات
 */
export async function syncAllWarehouseBalances() {
  try {
    // 1. جلب كافة الحركات المعتمدة
    const { data: transactions, error: txErr } = await supabase
      .from('inventory_transactions')
      .select('id, type, quantity, item_id, warehouse_id, destination_warehouse_id, status')
      .eq('status', 'approved');

    if (txErr) throw txErr;

    // 2. جلب الأصناف والمستودعات النشطة
    const { data: items, error: itmErr } = await supabase
      .from('inventory_items')
      .select('id, current_quantity');
    if (itmErr) throw itmErr;

    const { data: warehouses, error: whErr } = await supabase
      .from('warehouses')
      .select('id, name, type, tank_capacity_liters, fuel_type')
      .eq('is_active', true);
    if (whErr) throw whErr;

    // 3. حساب الأرصدة في الذاكرة
    // whBalances: { [wh_id]: { [item_id]: number } }
    const whBalances: Record<string, Record<string, number>> = {};
    const itemTotals: Record<string, number> = {};

    (items || []).forEach(i => {
      itemTotals[i.id] = 0;
    });

    (warehouses || []).forEach(wh => {
      whBalances[wh.id] = {};
      (items || []).forEach(i => {
        whBalances[wh.id][i.id] = 0;
      });
    });

    (transactions || []).forEach(tx => {
      const qty = Number(tx.quantity) || 0;
      if (!tx.item_id || qty <= 0) return;

      const srcWh = tx.warehouse_id || MAIN_WAREHOUSE_ID;
      const destWh = tx.destination_warehouse_id;

      if (!whBalances[srcWh]) whBalances[srcWh] = {};
      if (whBalances[srcWh][tx.item_id] === undefined) whBalances[srcWh][tx.item_id] = 0;

      if (tx.type === 'in' || tx.type === 'transfer_in' || tx.type === 'empty_return') {
        whBalances[srcWh][tx.item_id] += qty;
        itemTotals[tx.item_id] = (itemTotals[tx.item_id] || 0) + qty;
      } else if (tx.type === 'waste') {
        whBalances[srcWh][tx.item_id] -= qty;
        itemTotals[tx.item_id] = (itemTotals[tx.item_id] || 0) - qty;
      } else if (tx.type === 'out' || tx.type === 'transfer_out' || tx.type === 'sales_deduction') {
        whBalances[srcWh][tx.item_id] -= qty;

        if (destWh) {
          // تحويل داخلي لسيارة أو مستودع آخر
          if (!whBalances[destWh]) whBalances[destWh] = {};
          if (whBalances[destWh][tx.item_id] === undefined) whBalances[destWh][tx.item_id] = 0;
          whBalances[destWh][tx.item_id] += qty;
          // في التحويل الداخلي لا تتغير الكمية الإجمالية للشركة
        } else {
          // صرف نهائي خارجي
          itemTotals[tx.item_id] = (itemTotals[tx.item_id] || 0) - qty;
        }
      }
    });

    // 4. تحديث جدول warehouse_inventory
    const { data: existingWhInv } = await supabase.from('warehouse_inventory').select('*');
    const existingMap = new Map<string, any>();
    (existingWhInv || []).forEach(row => {
      existingMap.set(`${row.warehouse_id}_${row.item_id}`, row);
    });

    for (const whId of Object.keys(whBalances)) {
      for (const itemId of Object.keys(whBalances[whId])) {
        const qty = Math.max(0, whBalances[whId][itemId] || 0);
        const key = `${whId}_${itemId}`;
        const existing = existingMap.get(key);

        if (existing) {
          if (Number(existing.quantity) !== qty) {
            await supabase
              .from('warehouse_inventory')
              .update({ quantity: qty, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
          }
        } else if (qty > 0) {
          await supabase
            .from('warehouse_inventory')
            .insert([{ warehouse_id: whId, item_id: itemId, quantity: qty }]);
        }
      }
    }

    // 5. تحديث الكمية الإجمالية في جدول inventory_items
    for (const item of (items || [])) {
      const totalQty = Math.max(0, itemTotals[item.id] || 0);
      if (Number(item.current_quantity) !== totalQty) {
        await supabase
          .from('inventory_items')
          .update({ current_quantity: totalQty })
          .eq('id', item.id);
      }
    }

    return { success: true, count: transactions?.length || 0 };
  } catch (err: any) {
    console.error('Error in syncAllWarehouseBalances:', err);
    throw err;
  }
}

/**
 * 🟢 اعتماد حركة مخزنية واحدة وتحديث أرصدة المستودع المعني ومستودع الوجهة وتوليد القيود المحاسبية فوراً
 */
export async function executeApproveTransaction(transactionId: string, options?: { skipSync?: boolean }) {
  // 1. جلب بيانات الحركة الأساسية أولاً بأمان لتفادي أي تعارض في العلاقات (PGRST201 Foreign Key Ambiguity)
  const { data: txn, error: getErr } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (getErr || !txn) throw new Error(getErr?.message || 'الحركة غير موجودة');

  // جلب البيانات المرتبطة بأمان تام بدون المخاطرة بفشل الاستعلام الرئيسي
  let itemName = 'صنف';
  if (txn.item_id) {
    try {
      const { data: itm } = await supabase.from('inventory_items').select('name').eq('id', txn.item_id).maybeSingle();
      if (itm?.name) itemName = itm.name;
    } catch {}
  }

  let partnerAccountId: string | null = null;
  if (txn.partner_id) {
    try {
      const { data: p } = await supabase.from('partners').select('name, account_id').eq('id', txn.partner_id).maybeSingle();
      if (p?.account_id) partnerAccountId = p.account_id;
    } catch {}
  }

  const qty = Number(txn.quantity) || 0;
  const unitPrice = Number(txn.unit_price) || 0;
  const totalAmount = qty * unitPrice;
  const srcWh = txn.warehouse_id || MAIN_WAREHOUSE_ID;
  const destWh = txn.destination_warehouse_id;

  // 2. توليد القيد المحاسبي المزدوج لحركة المخزون (إن لم يكن موجوداً)
  let journalId = txn.journal_id;
  if (!journalId && totalAmount > 0) {
    const date = txn.transaction_date || new Date().toISOString().split('T')[0];

    let headerDesc = '';
    let debitAcc = '';
    let creditAcc = '';
    let debitNotes = '';
    let creditNotes = '';
    let partnerIdForLine: string | null = null;

    if (txn.type === 'in' || txn.type === 'transfer_in') {
      // توريد مخزني / شراء: من حـ/ 126 مخزون البضائع (مدين) إلى حـ/ 219 فواتير قيد الاستلام أو المورد (دائن)
      headerDesc = `توريد مخزني #${txn.transaction_number || ''} - صنف: ${itemName} (كمية: ${qty})`;
      debitAcc = ACC.INVENTORY;
      creditAcc = partnerAccountId || ACC.PENDING_INVOICES;
      debitNotes = 'إضافة لمخزون البضائع/المحروقات (مدين)';
      creditNotes = 'استحقاق قيد الاستلام / مورد (دائن)';
      partnerIdForLine = txn.partner_id || null;
    } else if (txn.type === 'waste') {
      // إتلاف مخزني: من حـ/ 528 خسائر توالف (مدين) إلى حـ/ 126 مخزون البضائع (دائن)
      headerDesc = `إتلاف وهدر مخزني #${txn.transaction_number || ''} - صنف: ${itemName}`;
      debitAcc = ACC.WASTE_LOSS;
      creditAcc = ACC.INVENTORY;
      debitNotes = 'خسائر توالف وهدر مخزني (مدين)';
      creditNotes = 'تخفيض مخزون البضائع/المحروقات (دائن)';
    } else if (destWh) {
      // تحويل مخزني بين خزانات الوقود أو المستودعات
      headerDesc = `تحويل مخزني #${txn.transaction_number || ''} - صنف: ${itemName} (كمية: ${qty})`;
      debitAcc = ACC.INVENTORY;
      creditAcc = ACC.INVENTORY;
      debitNotes = 'تحويل إلى مستودع/خزان الوجهة (مدين)';
      creditNotes = 'صرف من مستودع/خزان المصدر (دائن)';
      partnerIdForLine = txn.partner_id || null;
    } else {
      // صرف مخزني عادي
      headerDesc = `صرف مخزني #${txn.transaction_number || ''} - صنف: ${itemName} (كمية: ${qty})`;
      debitAcc = partnerAccountId || ACC.CUSTOMERS_AR;
      creditAcc = ACC.INVENTORY;
      debitNotes = 'استحقاق مدين (ذمة)';
      creditNotes = 'صرف من مخزون البضائع/المحروقات (دائن)';
      partnerIdForLine = txn.partner_id || null;
    }

    try {
      const { data: jHeader, error: jhErr } = await supabase
        .from('journal_headers')
        .insert([{
          entry_date: date,
          description: headerDesc,
          status: 'posted',
          v_type: 'inventory',
          reference_id: transactionId
        }])
        .select('id')
        .single();

      if (!jhErr && jHeader) {
        journalId = jHeader.id;
        await supabase.from('journal_lines').insert([
          {
            header_id: journalId,
            account_id: debitAcc,
            partner_id: (txn.type === 'in' ? null : partnerIdForLine),
            debit: totalAmount,
            credit: 0,
            notes: debitNotes
          },
          {
            header_id: journalId,
            account_id: creditAcc,
            partner_id: (txn.type === 'in' ? partnerIdForLine : null),
            debit: 0,
            credit: totalAmount,
            notes: creditNotes
          }
        ]);
      }
    } catch (jErr) {
      console.warn('Could not create journal entry for inventory txn:', jErr);
    }
  }

  // 3. تحديث الحالة ومستودع الوجهة ورقم القيد
  await supabase
    .from('inventory_transactions')
    .update({
      status: 'approved',
      journal_id: journalId || null,
      warehouse_id: srcWh,
      destination_warehouse_id: destWh || null
    })
    .eq('id', transactionId);

  // تحديث سعر التكلفة للصنف تلقائياً عند اعتماد حركة توريد أو شراء
  if ((txn.type === 'in' || txn.type === 'purchase') && unitPrice > 0 && txn.item_id) {
    try {
      await supabase
        .from('inventory_items')
        .update({ cost_price: unitPrice })
        .eq('id', txn.item_id);
      emitTableChange('inventory_items');
    } catch (costErr) {
      console.warn('Could not auto-sync cost_price:', costErr);
    }
  }

  // 4. استدعاء دالة قاعدة البيانات كإجراء إضافي
  try {
    await supabase.rpc('approve_inventory_transaction', { p_id: transactionId });
  } catch (rpcErr) {
    console.warn('RPC approve warning (handled):', rpcErr);
  }

  if (!options?.skipSync) {
    // 5. 🚀 إعادة مزامنة وتحديث أرصدة كافة المستودعات وسيارات التوزيع فوراً
    await syncAllWarehouseBalances();

    // 6. بث التحديث اللحظي لجميع الشاشات
    emitTableChange('inventory_transactions');
    emitTableChange('journal_headers');
    emitTableChange('journal_lines');
  }

  return { success: true };
}

/**
 * ⏪ فك اعتماد حركة مخزنية وعكس تأثيرها على المستودعات والقيود
 */
export async function executeUnapproveTransaction(transactionId: string) {
  const { data: txn, error: getErr } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (getErr || !txn) throw new Error(getErr?.message || 'الحركة غير موجودة');

  // 1. حذف القيد المحاسبي المرتبط إن وجد
  if (txn.journal_id) {
    try {
      await supabase.from('journal_lines').delete().eq('header_id', txn.journal_id);
      await supabase.from('journal_headers').delete().eq('id', txn.journal_id);
    } catch (jErr) {
      console.warn('Could not delete journal entry:', jErr);
    }
  }

  // 2. استدعاء دالة فك الاعتماد في قاعدة البيانات
  try {
    await supabase.rpc('unapprove_inventory_transaction', { p_id: transactionId });
  } catch (rpcErr) {
    console.warn('RPC unapprove warning (handled):', rpcErr);
  }

  // 3. تحديث حالة الحركة إلى مسودة مع حذف مرجع القيد
  await supabase
    .from('inventory_transactions')
    .update({ status: 'pending', journal_id: null })
    .eq('id', transactionId);

  // 4. 🚀 إعادة مزامنة وتحديث أرصدة كافة المستودعات وخزانات الوقود فوراً
  await syncAllWarehouseBalances();

  // 5. بث التحديث اللحظي
  emitTableChange('inventory_transactions');
  emitTableChange('journal_headers');
  emitTableChange('journal_lines');

  return { success: true };
}
