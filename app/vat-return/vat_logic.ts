import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface VATTransaction {
  id: string;
  date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  base_amount: number;
  vat_amount: number;
  type: 'input' | 'output'; // input (مشتريات/مصروفات), output (مبيعات)
}

export function useVATReturnLogic() {
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<VATTransaction[]>([]);
  const [summary, setSummary] = useState({
    totalInputVAT: 0,
    totalOutputVAT: 0,
    netVAT: 0,
    inputBase: 0,
    outputBase: 0
  });

  const getFirstDayOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };

  const getLastDayOfMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  };

  const [dateRange, setDateRange] = useState({
    start: getFirstDayOfMonth(),
    end: getLastDayOfMonth(),
  });

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Find VAT Account
      const { data: accounts, error: accError } = await supabase
        .from('accounts')
        .select('id, name')
        .or('name.ilike.%ضريب%,name.ilike.%Tax%,name.ilike.%VAT%')
        .limit(1);

      if (accError) throw accError;
      if (!accounts || accounts.length === 0) {
        console.warn('لم يتم العثور على حساب الضريبة في شجرة الحسابات');
        setIsLoading(false);
        return;
      }

      const vatAccountId = accounts[0].id;

      // 2. Fetch journal lines for VAT account in date range
      // Because we want to filter by entry_date, we need to join with journal_headers.
      // In Supabase, if the foreign key is properly setup, we can filter using inner join syntax.
      const { data: lines, error: linesError } = await (supabase
        .from('journal_lines')
        .select(`
          id,
          debit,
          credit,
          notes,
          journal_headers!inner (
            id,
            entry_date,
            description,
            v_type,
            reference_id
          )
        `)
        .eq('account_id', vatAccountId)
        .gte('journal_headers.entry_date', dateRange.start)
        .lte('journal_headers.entry_date', dateRange.end)
        .order('id', { ascending: false })) as any;

      if (linesError) throw linesError;

      let totalInput = 0;
      let totalOutput = 0;
      const trans: VATTransaction[] = [];

      for (const line of lines || []) {
        const header = line.journal_headers;
        if (!header) continue;

        // Input VAT (مدخلات) = Debit
        // Output VAT (مخرجات) = Credit
        const isInput = (line.debit || 0) > 0;
        const isOutput = (line.credit || 0) > 0;
        
        const vatAmount = isInput ? (line.debit || 0) : (line.credit || 0);
        // Base amount is roughly VAT / 15% assuming standard rate. 
        // In reality, this is an estimate, but it's mathematically sound for 15% standard rate.
        const baseAmount = vatAmount / 0.15;

        if (isInput) totalInput += vatAmount;
        if (isOutput) totalOutput += vatAmount;

        if (vatAmount > 0) {
          trans.push({
            id: line.id,
            date: header.entry_date,
            description: line.notes || header.description || 'حركة ضريبية',
            reference_type: header.v_type,
            reference_id: header.reference_id,
            base_amount: baseAmount,
            vat_amount: vatAmount,
            type: isInput ? 'input' : 'output'
          });
        }
      }

      // Sort transactions by date descending
      trans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(trans);
      setSummary({
        totalInputVAT: totalInput,
        totalOutputVAT: totalOutput,
        netVAT: totalOutput - totalInput, // Positive = Payable, Negative = Refundable
        inputBase: totalInput / 0.15,
        outputBase: totalOutput / 0.15,
      });

    } catch (error) {
      console.error('Error fetching VAT return data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    isLoading,
    dateRange,
    handleDateChange,
    transactions,
    summary,
    handleRefresh: fetchData
  };
}
