import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { showGlobalToast } from '@/lib/toast-context';
import { useRealtimeListener } from '@/lib/useRealtimeSync';

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
      
      const grouped = (data || []).reduce((acc: any, curr: any) => {
          let baseNumber = curr.transaction_number;
          if (/-\d+$/.test(baseNumber)) {
              baseNumber = baseNumber.replace(/-\d+$/, '');
          }

          if (!acc[baseNumber]) {
              acc[baseNumber] = {
                  id: curr.id, // Primary ID for rendering or passing to other functions if needed
                  ids: [], // Array of all IDs in this transaction for mass approval/deletion
                  transaction_number: baseNumber,
                  transaction_date: curr.transaction_date,
                  partner_id: curr.partner_id,
                  partners: curr.partners,
                  status: curr.status,
                  items: [],
                  notes: curr.notes,
                  total_amount: 0,
                  tax_amount: 0,
                  quantity: 0
              };
          }
          acc[baseNumber].ids.push(curr.id);
          acc[baseNumber].items.push(curr);
          acc[baseNumber].tax_amount += (curr.tax_amount || 0);
          acc[baseNumber].total_amount += ((curr.quantity * curr.unit_price) + (curr.tax_amount || 0));
          acc[baseNumber].quantity += curr.quantity; // Just for display fallback if needed
          
          return acc;
      }, {});

      setTransactions(Object.values(grouped).sort((a:any, b:any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()));
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

  // 🔄 مزامنة فورية - تحديث تلقائي عند تغيير الحركات (من أي شاشة)
  useRealtimeListener('inventory_transactions', () => fetchTransactions());

  const handleApproveTransaction = async (transaction: any) => {
    try {
      setIsLoading(true);
      for (const id of transaction.ids) {
          const { error: rpcError } = await supabase.rpc('approve_inventory_transaction', { p_id: id });
          if (rpcError) throw new Error(rpcError.message);
      }

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
        for (const id of transaction.ids) {
            // Fetch transaction details
            const { data: txn, error: txnError } = await supabase
                .from('inventory_transactions')
                .select('*')
                .eq('id', id)
                .single();
            if (txnError || !txn) throw new Error('Transaction not found');

            // 1. Subtract from main inventory
            const { data: itemData } = await supabase.from('inventory_items').select('current_quantity').eq('id', txn.item_id).single();
            if (itemData) {
                await supabase.from('inventory_items').update({
                    current_quantity: Number(itemData.current_quantity) - Number(txn.quantity)
                }).eq('id', txn.item_id);
            }

            // 2. Subtract from warehouse inventory (if applicable)
            const targetWarehouseId = txn.warehouse_id || '11111111-1111-1111-1111-111111111111';
            const { data: whInv } = await supabase.from('warehouse_inventory').select('id, quantity').eq('warehouse_id', targetWarehouseId).eq('item_id', txn.item_id).maybeSingle();
            
            if (whInv) {
                await supabase.from('warehouse_inventory').update({
                    quantity: Number(whInv.quantity) - Number(txn.quantity)
                }).eq('id', whInv.id);
            }

            // 3. Delete Journal Entry
            if (txn.journal_id) {
                await supabase.from('journal_headers').delete().eq('id', txn.journal_id);
            }

            // 4. Reset Transaction Status
            await supabase.from('inventory_transactions').update({
                status: 'pending',
                journal_id: null
            }).eq('id', id);
        }

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
      // transaction_number may already start with "PO-", so avoid duplication
      const rawNum = transaction.transaction_number?.replace(/^PO-/, '') || transaction.transaction_number;
      const expNo = `PO-${rawNum}`;
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('expense_number', expNo);
        
      if (existing && existing.length > 0) {
        return showGlobalToast('تم إنشاء سند استحقاق مسبقاً لهذا الأمر في المصروفات!', 'warning');
      }

      const subTotal = transaction.total_amount - (transaction.tax_amount || 0);
      const taxAmount = transaction.tax_amount || 0;
      const desc = `فاتورة مشتريات مجمعة لأمر الشراء #${rawNum}`;

      // Create Expense Record
      const expensePayload = {
        exp_date: new Date().toISOString().split('T')[0],
        description: desc,
        creditor_account: '219 - فواتير قيد الاستلام', // (دائن)
        payment_method: 'آجل',
        payment_account: '211 - الموردين', // (مدين)
        payee_id: transaction.partner_id || null,
        payee_name: transaction.partners?.name || null,
        quantity: 1,
        unit_price: subTotal,
        vat_amount: taxAmount,
        discount_amount: 0,
        paid_amount: 0,
        notes: 'تم التوليد آلياً من أمر الشراء',
        is_posted: false,
        expense_number: expNo,
        main_category: 'شراء بضاعة'
      };

      const { error: expErr } = await supabase.from('expenses').insert([expensePayload]);
      if (expErr) throw expErr;

      showGlobalToast('تم انشاء سند استحقاق صرف', 'success');
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