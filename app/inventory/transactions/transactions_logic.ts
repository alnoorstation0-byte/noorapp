import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { showGlobalToast } from '@/lib/toast-context';
import { useRealtimeListener } from '@/lib/useRealtimeSync';

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

      const formattedData = (data || []).map(row => ({
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
    // Hardcoded known account IDs based on user input
    const INVENTORY_ACCOUNT_ID = 'c5efa035-c8d5-4d13-bf33-7c7cd854f393'; // مخزون الخامات والمواد
    const TREASURY_ACCOUNT_ID = '21b8a1db-bc9f-4cf8-b741-1efeded0963c';  // الخزينة الرئيسية
    
    // Determine Partner Account ID. Fallbacks: 211 for suppliers (IN), 123 for customers (OUT)
    const PARTNER_ACCOUNT_ID = transaction.partner_account_id || 
      (transaction.type === 'in' ? '2ca6f54c-5f37-49a0-8c41-e37f94b09752' : '4f828d0d-a1f4-4762-83e3-c17dafae802d');

    const isSupply = transaction.type === 'in' || transaction.type === 'transfer_in'; 
    const totalAmount = transaction.quantity * transaction.unit_price;

    if (!transaction.unit_price || totalAmount <= 0) {
      showGlobalToast("⚠️ يرجى التأكد من إدخال سعر الوحدة قبل اعتماد الحركة لتوليد القيد المالي.", 'warning');
      return;
    }

    try {
      setIsLoading(true);

      const { error: rpcError } = await supabase.rpc('approve_inventory_transaction', { p_id: transaction.id });
      
      if (rpcError) {
          throw new Error(`خطأ في الاعتماد: ${rpcError.message}`);
      }

      showGlobalToast("✅ تم الاعتماد وتوليد القيود المحاسبية وتحديث المستودع بنجاح.", 'warning');
      fetchTransactions();
    } catch (error: any) {
      console.error("خطأ في الاعتماد:", error);
      showGlobalToast(`❌ حدث خطأ أثناء الاعتماد: ${error.message || ''}`, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnapproveTransaction = async (transaction: any) => {
    const confirmUnpost = confirm("⚠️ تحذير: سيتم فك اعتماد الحركة وإرجاع كمية المستودع (ومسح القيود إن وجدت). هل أنت متأكد؟");
    if (!confirmUnpost) return;

    try {
      setIsLoading(true);

      const { error: rpcError } = await supabase.rpc('unapprove_inventory_transaction', { p_id: transaction.id });
      if (rpcError) {
          throw new Error(`خطأ في الإلغاء: ${rpcError.message}`);
      }

      showGlobalToast("✅ تم فك الاعتماد ومسح القيد المحاسبي بنجاح.", 'warning');
      fetchTransactions();
    } catch (error: any) {
      console.error("خطأ في فك الاعتماد:", error);
      showGlobalToast(`❌ حدث خطأ أثناء فك الاعتماد: ${error.message || ''}`, 'warning');
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
    handleUnapproveTransaction
  };
}
