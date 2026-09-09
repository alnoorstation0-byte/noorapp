import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { showGlobalToast } from '@/lib/toast-context';

export function usePurchaseOrdersLogic() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [printingTransaction, setPrintingTransaction] = useState<any>(null);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('inventory_transactions')
        .select('id, transaction_number, transaction_date, type, quantity, unit_price, tax_amount, include_tax, notes, status, item_id, partner_id, inventory_items ( name, unit ), partners!inventory_transactions_partner_id_fkey ( name )')
        .eq('type', 'in')
        .order('transaction_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      showGlobalToast('حدث خطأ أثناء جلب أوامر الشراء', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleApproveTransaction = async (transaction: any) => {
    try {
      setIsLoading(true);
      const { error: rpcError } = await supabase.rpc('approve_inventory_transaction', { p_id: transaction.id });
      if (rpcError) throw new Error(rpcError.message);

      showGlobalToast('تم اعتماد أمر الشراء واستلامه بالمستودع بنجاح', 'success');
      fetchTransactions();
    } catch (error: any) {
      console.error('Error approving PO:', error);
      showGlobalToast('حدث خطأ في الاعتماد: ' + error.message, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleUnapproveTransaction = async (transaction: any) => {
    const confirmUnpost = confirm('هل أنت متأكد من إلغاء الاستلام؟ سيتم خصم الكمية من المستودع وعكس القيد المحاسبي.');
    if (!confirmUnpost) return;

    try {
      setIsLoading(true);
      const { error: rpcError } = await supabase.rpc('unapprove_inventory_transaction', { p_id: transaction.id });
      if (rpcError) throw new Error(rpcError.message);

      // Clean up entitlement vouchers if any from expenses
      await supabase.from('expenses').delete().eq('expense_number', `PO-${transaction.transaction_number}`);

      showGlobalToast('تم إلغاء الاستلام بنجاح', 'warning');
      fetchTransactions();
    } catch (error: any) {
      console.error('Error unapproving PO:', error);
      showGlobalToast('حدث خطأ في إلغاء الاعتماد: ' + error.message, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateEntitlement = async (transaction: any) => {
    try {
      setIsLoading(true);

      // Check if entitlement already exists in expenses
      const expNo = `PO-${transaction.transaction_number}`;
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('expense_number', expNo);
        
      if (existing && existing.length > 0) {
        return showGlobalToast('تم إنشاء سند استحقاق مسبقاً لهذا الأمر في المصروفات!', 'warning');
      }

      const baseAmount = transaction.quantity * transaction.unit_price;
      const taxAmount = transaction.tax_amount || 0;
      const desc = `استحقاق مشتريات لأمر الشراء #${transaction.transaction_number}`;

      // Create Expense Record
      const expensePayload = {
        exp_date: new Date().toISOString().split('T')[0],
        description: desc,
        creditor_account: '219 - فواتير قيد الاستلام', // (مدين)
        payment_method: 'آجل',
        payment_account: '211 - موردين', // (دائن)
        payee_id: transaction.partner_id || null,
        payee_name: transaction.partners?.name || null,
        quantity: transaction.quantity || 1,
        unit_price: transaction.unit_price || 0,
        vat_amount: taxAmount,
        discount_amount: 0,
        notes: 'تم التوليد آلياً من أمر الشراء',
        is_posted: false,
        expense_number: expNo
      };

      const { error: expErr } = await supabase.from('expenses').insert([expensePayload]);
      if (expErr) throw expErr;

      showGlobalToast('تم إنشاء سند الاستحقاق بنجاح! راجع قسم المصروفات/فواتير المشتريات', 'success');
    } catch (error: any) {
      console.error('Error creating entitlement in expenses:', error);
      showGlobalToast('حدث خطأ أثناء إنشاء السند: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.transaction_number?.toLowerCase().includes(q) ||
      t.partners?.name?.toLowerCase().includes(q) ||
      t.inventory_items?.name?.toLowerCase().includes(q)
    );
  });

  return {
    transactions: filteredTransactions,
    isLoading,
    searchQuery, setSearchQuery,
    isActionModalOpen, setIsActionModalOpen,
    editingTransaction, setEditingTransaction,
    printingTransaction, setPrintingTransaction,
    fetchTransactions,
    handleApproveTransaction,
    handleUnapproveTransaction,
    handleCreateEntitlement
  };
}