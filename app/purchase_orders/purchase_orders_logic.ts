import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { showGlobalToast } from '@/lib/toast-context';

export function usePurchaseOrdersLogic() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

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

      showGlobalToast('تم إلغاء الاستلام بنجاح', 'warning');
      fetchTransactions();
    } catch (error: any) {
      console.error('Error unapproving PO:', error);
      showGlobalToast('حدث خطأ في إلغاء الاعتماد: ' + error.message, 'error');
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
    fetchTransactions,
    handleApproveTransaction,
    handleUnapproveTransaction
  };
}