import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { showGlobalToast } from '@/lib/toast-context';
import { useRealtimeListener, emitTableChange } from '@/lib/useRealtimeSync';
import { executeApproveTransaction, executeUnapproveTransaction, syncAllWarehouseBalances } from '@/lib/inventory_engine';

export function useInventoryTransactionsLogic() {
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [globalSearch, setGlobalSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // تم إزالة projects تماماً من هنا
      let query = supabase
        .from('inventory_transactions')
        .select(`
          id,
          transaction_number,
          transaction_date,
          type,
          quantity,
          unit_price,
          notes,
          status,
          journal_id,
          item_id,
          partner_id,
          fleet_operation_id,
          inventory_items ( name, unit ),
          partners!inventory_transactions_partner_id_fkey ( name, account_id, partner_type ),
          fleet_operations ( operation_number, vehicle_id, driver_id, vehicle:fleet_vehicles(plate_number), driver:partners(name, account_id) )
        `)
        .order('transaction_date', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }
      if (dateFrom) {
        query = query.gte('transaction_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('transaction_date', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedData = (data || []).map((row: any) => ({
        id: row.id,
        transaction_number: row.transaction_number || '-',
        transaction_date: row.transaction_date,
        type: row.type,
        quantity: row.quantity,
        unit_price: row.unit_price,
        notes: row.notes,
        status: row.status || 'pending',
        journal_id: row.journal_id,
        item_id: row.item_id,
        partner_id: row.partner_id,
        item_name: row.inventory_items?.name || 'غير معروف',
        unit: row.inventory_items?.unit || '',
        partner: row.partners?.name || '',
        partner_type: row.partners?.partner_type || '',
        partner_account_id: row.partners?.account_id,
        fleet_operation: row.fleet_operations ? `${row.fleet_operations.operation_number} - ${row.fleet_operations.vehicle?.plate_number}` : '',
        vehicle_id: row.fleet_operations?.vehicle_id,
        vehicle_plate: row.fleet_operations?.vehicle?.plate_number || 'بدون سيارة',
        driver_id: row.fleet_operations?.driver_id,
        driver_name: row.fleet_operations?.driver?.name || 'بدون مندوب',
        driver_account_id: row.fleet_operations?.driver?.account_id,
        fleet_operation_number: row.fleet_operations?.operation_number
      }));

      setRawRecords(formattedData);
    } catch (err: any) {
      console.error("خطأ في جلب حركات المستودع:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTransaction = async (transaction: any) => {
    const isSupply = transaction.type === 'in' || transaction.type === 'transfer_in'; 
    const totalAmount = transaction.quantity * transaction.unit_price;

    if ((!transaction.unit_price || totalAmount <= 0) && transaction.type !== 'empty_return') {
      showGlobalToast("⚠️ يرجى التأكد من إدخال سعر الوحدة قبل اعتماد الحركة لتوليد القيد المالي.", 'warning');
      return;
    }

    // ⚡ تحديث تفاؤلي فوري في الواجهة ليظهر التغيير بـ 0 ثانية تأخير
    setRawRecords(prev => prev.map(r => r.id === transaction.id ? { ...r, status: 'approved' } : r));

    try {
      setIsLoading(true);

      await executeApproveTransaction(transaction.id);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pending_counts_refresh'));
        window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
      }

      showGlobalToast("✅ تم الاعتماد وتوليد القيود المحاسبية وتحديث المستودع بنجاح.", 'success');
      await fetchTransactions();
    } catch (error: any) {
      console.error("خطأ في الاعتماد:", error);
      showGlobalToast(`❌ حدث خطأ أثناء الاعتماد: ${error.message || ''}`, 'error');
      await fetchTransactions();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    const pendingList = rawRecords.filter(r => r.status === 'pending' || r.status === 'مسودة' || !r.status);
    if (pendingList.length === 0) {
      showGlobalToast("لا توجد حركات معلقة للاعتماد.", 'warning');
      return;
    }
    const confirmApprove = confirm(`هل أنت متأكد من اعتماد جميع الحركات المخزنية المعلقة (${pendingList.length}) دفعة واحدة وتحديث أرصدة المستودعات وترحيل القيود؟`);
    if (!confirmApprove) return;

    // ⚡ تحديث تفاؤلي فوري في الـ State ليختفي الإشعار وتتغير الحالة على الفور بدون ريفرش
    const pendingIds = new Set(pendingList.map(t => t.id));
    setRawRecords(prev => prev.map(row => 
      pendingIds.has(row.id) ? { ...row, status: 'approved' } : row
    ));

    try {
      setIsLoading(true);
      let success = 0;
      for (const t of pendingList) {
        try {
          await executeApproveTransaction(t.id, { skipSync: true });
          success++;
        } catch (subErr) {
          console.error(`Failed to approve ${t.id}:`, subErr);
        }
      }

      // مزامنة الأرصدة وبث التحديثات مرة واحدة لجميع الشاشات
      await syncAllWarehouseBalances();
      emitTableChange('inventory_transactions');
      emitTableChange('journal_headers');
      emitTableChange('journal_lines');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pending_counts_refresh'));
        window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
      }

      if (success === pendingList.length) {
        showGlobalToast(`✅ تم اعتماد جميع الحركات المخزنية (${success}) وتحديث القيود بنجاح!`, 'success');
      } else {
        showGlobalToast(`⚠️ تم اعتماد ${success} من أصل ${pendingList.length} حركة مخزنية.`, 'warning');
      }

      await fetchTransactions();
    } catch (err: any) {
      console.error(err);
      showGlobalToast(`❌ حدث خطأ أثناء الاعتماد الجماعي: ${err.message}`, 'error');
      await fetchTransactions();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnapproveTransaction = async (transaction: any) => {
    const confirmUnpost = confirm("⚠️ تحذير: سيتم فك اعتماد الحركة وإرجاع كمية المستودع (ومسح القيود إن وجدت). هل أنت متأكد؟");
    if (!confirmUnpost) return;

    // ⚡ تحديث تفاؤلي فوري
    setRawRecords(prev => prev.map(r => r.id === transaction.id ? { ...r, status: 'pending' } : r));

    try {
      setIsLoading(true);

      await executeUnapproveTransaction(transaction.id);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pending_counts_refresh'));
        window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
      }

      showGlobalToast("✅ تم فك الاعتماد ومسح القيد المحاسبي وعكس أرصدة المستودع بنجاح.", 'success');
      await fetchTransactions();
    } catch (error: any) {
      console.error("خطأ في فك الاعتماد:", error);
      showGlobalToast(`❌ حدث خطأ أثناء فك الاعتماد: ${error.message || ''}`, 'error');
      await fetchTransactions();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحركة نهائياً؟')) return;

    // ⚡ تحديث تفاؤلي فوري
    setRawRecords(prev => prev.filter(r => r.id !== id));

    try {
      setIsLoading(true);
      await supabase.from('inventory_transactions').delete().eq('id', id);
      await syncAllWarehouseBalances();
      emitTableChange('inventory_transactions');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pending_counts_refresh'));
        window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
      }
      showGlobalToast("🗑️ تم حذف الحركة وتحديث الأرصدة بنجاح.", 'success');
      await fetchTransactions();
    } catch (err: any) {
      console.error("خطأ في الحذف:", err);
      showGlobalToast(`❌ حدث خطأ أثناء الحذف: ${err.message || ''}`, 'error');
      await fetchTransactions();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType, dateFrom, dateTo]);

  // 🔄 مزامنة فورية - تحديث تلقائي عند أي تغيير في قاعدة البيانات
  useRealtimeListener('inventory_transactions', () => fetchTransactions());

  const data = useMemo(() => {
    if (!globalSearch) return rawRecords;
    const lowerSearch = globalSearch.toLowerCase();
    
    return rawRecords.filter(row => 
      (row.transaction_number && row.transaction_number.toString().toLowerCase().includes(lowerSearch)) ||
      (row.item_name && row.item_name.toLowerCase().includes(lowerSearch)) ||
      (row.partner && row.partner.toLowerCase().includes(lowerSearch))
    );
  }, [rawRecords, globalSearch]);

  const stats = useMemo(() => {
    let wasteCost = 0;
    let wasteQty = 0;
    let emptyReturnQty = 0;
    let pendingCount = 0;

    rawRecords.forEach(r => {
      const isPending = r.status === 'pending' || r.status === 'مسودة' || !r.status;
      if (isPending) pendingCount++;

      if (r.type === 'waste' || r.type === 'damage') {
        const qty = Number(r.quantity) || 0;
        const price = Number(r.unit_price) || 0;
        wasteQty += qty;
        wasteCost += (qty * price);
      } else if (r.type === 'empty_return') {
        emptyReturnQty += (Number(r.quantity) || 0);
      }
    });

    return {
      wasteCost,
      wasteQty,
      emptyReturnQty,
      pendingCount
    };
  }, [rawRecords]);

  return {
    data,
    rawRecords,
    stats,
    isLoading,
    globalSearch, setGlobalSearch,
    filterType, setFilterType,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    fetchTransactions,
    handleApproveTransaction,
    handleUnapproveTransaction,
    handleBulkApprove,
    handleDeleteTransaction
  };
}
