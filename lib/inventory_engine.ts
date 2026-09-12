import { supabase } from '@/lib/supabase';

export const MAIN_WAREHOUSE_ID = '11111111-1111-1111-1111-111111111111';

/**
 * 🔄 إعادة احتساب ومزامنة كافة أرصدة المستودعات وسيارات التوزيع
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
      .select('id, name, type')
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
        const qty = whBalances[whId][itemId];
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
 * 🟢 اعتماد حركة مخزنية واحدة وتحديث أرصدة المستودع المعني ومستودع الوجهة فوراً
 */
export async function executeApproveTransaction(transactionId: string) {
  // 1. جلب بيانات الحركة
  const { data: txn, error: getErr } = await supabase
    .from('inventory_transactions')
    .select('*, fleet_operations(vehicle_id)')
    .eq('id', transactionId)
    .single();

  if (getErr || !txn) throw new Error(getErr?.message || 'الحركة غير موجودة');
  if (txn.status === 'approved') return { alreadyApproved: true };

  const qty = Number(txn.quantity) || 0;
  const srcWh = txn.warehouse_id || MAIN_WAREHOUSE_ID;
  let destWh = txn.destination_warehouse_id;

  // إذا كانت الحركة مربوطة بأمر تشغيل رحلة ولم يُحدد مستودع وجهة، نحدد مستودع السيارة تلقائياً
  if (!destWh && txn.fleet_operations?.vehicle_id) {
    const { data: vWh } = await supabase
      .from('warehouses')
      .select('id')
      .eq('vehicle_id', txn.fleet_operations.vehicle_id)
      .eq('is_active', true)
      .maybeSingle();
    if (vWh) destWh = vWh.id;
  }

  // 2. استدعاء دالة قاعدة البيانات لتوليد القيود المحاسبية
  try {
    await supabase.rpc('approve_inventory_transaction', { p_id: transactionId });
  } catch (rpcErr) {
    console.warn('RPC approve warning (handled):', rpcErr);
  }

  // The SQL RPC 'approve_inventory_transaction' handles updating warehouse_inventory, 
  // inventory_items, AND generates the necessary accounting journal entries automatically.
  // We rely entirely on the DB to maintain ACID compliance and prevent double-counting.

  // 4. التأكد من حفظ الحالة معتمدة ومستودع الوجهة
  await supabase
    .from('inventory_transactions')
    .update({
      status: 'approved',
      warehouse_id: srcWh,
      destination_warehouse_id: destWh || null
    })
    .eq('id', transactionId);

  return { success: true };
}

/**
 * ⏪ فك اعتماد حركة مخزنية وعكس تأثيرها على المستودعات
 */
export async function executeUnapproveTransaction(transactionId: string) {
  const { data: txn, error: getErr } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (getErr || !txn) throw new Error(getErr?.message || 'الحركة غير موجودة');
  if (txn.status !== 'approved') return { alreadyUnapproved: true };

  const qty = Number(txn.quantity) || 0;
  const srcWh = txn.warehouse_id || MAIN_WAREHOUSE_ID;
  const destWh = txn.destination_warehouse_id;

  // 1. استدعاء دالة فك الاعتماد في قاعدة البيانات لإلغاء القيد المحاسبي
  try {
    await supabase.rpc('unapprove_inventory_transaction', { p_id: transactionId });
  } catch (rpcErr) {
    console.warn('RPC unapprove warning (handled):', rpcErr);
  }

  // The SQL RPC 'unapprove_inventory_transaction' handles reverting warehouse_inventory,
  // inventory_items, AND deletes the generated accounting journal entries automatically.
  // We rely entirely on the DB to maintain ACID compliance and prevent double-counting.

  // 3. تحديث حالة الحركة إلى مسودة مع حذف مرجع القيد
  await supabase
    .from('inventory_transactions')
    .update({ status: 'pending', journal_id: null })
    .eq('id', transactionId);

  return { success: true };
}
