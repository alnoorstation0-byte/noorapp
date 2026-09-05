import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DelegateInvoice {
  id: string;
  invoice_number: string;
  date: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: string;
}

export interface DelegateDebtSummary {
  delegate_id: string;
  delegate_name: string;
  total_debt: number;
  invoice_count: number;
  invoices: DelegateInvoice[];
}

export function useDelegateDebtsLogic() {
  const [isLoading, setIsLoading] = useState(false);
  const [delegatesData, setDelegatesData] = useState<DelegateDebtSummary[]>([]);
  const [grandTotalDebt, setGrandTotalDebt] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all unpaid or partially paid invoices that have a delegate assigned
      // 'مدفوعة' means fully paid. We want to exclude those. 
      // Also, we ensure delegate_id is not null.
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, invoice_number, date, client_name, total_amount, paid_amount, due_date, status, delegate_id')
        .not('status', 'eq', 'مدفوعة')
        .not('delegate_id', 'is', null);

      if (invError) throw invError;

      // 2. Fetch partners (delegates) to map names
      const { data: partners, error: partError } = await supabase
        .from('partners')
        .select('id, name')
        .eq('job_role', 'مندوب');

      if (partError) throw partError;

      const partnerMap = new Map<string, string>();
      partners.forEach(p => partnerMap.set(p.id, p.name));

      // 3. Group by delegate
      const grouped = new Map<string, DelegateDebtSummary>();
      let totalMarketDebt = 0;

      for (const inv of invoices || []) {
        const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
        
        // Skip if mathematically paid (sometimes status might not be fully updated, though it should be)
        if (remaining <= 0.01) continue;

        const delId = inv.delegate_id;
        if (!grouped.has(delId)) {
          grouped.set(delId, {
            delegate_id: delId,
            delegate_name: partnerMap.get(delId) || 'مندوب غير معروف',
            total_debt: 0,
            invoice_count: 0,
            invoices: []
          });
        }

        const summary = grouped.get(delId)!;
        summary.total_debt += remaining;
        summary.invoice_count += 1;
        summary.invoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          date: inv.date,
          client_name: inv.client_name || 'عميل نقدي',
          total_amount: inv.total_amount || 0,
          paid_amount: inv.paid_amount || 0,
          remaining_amount: remaining,
          due_date: inv.due_date,
          status: inv.status
        });
        
        totalMarketDebt += remaining;
      }

      // Sort invoices within delegates by date
      for (const summary of grouped.values()) {
        summary.invoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      // Convert to array and sort by total debt descending
      const resultArray = Array.from(grouped.values()).sort((a, b) => b.total_debt - a.total_debt);

      setDelegatesData(resultArray);
      setGrandTotalDebt(totalMarketDebt);

    } catch (error) {
      console.error('Error fetching delegate debts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    isLoading,
    delegatesData,
    grandTotalDebt,
    handleRefresh: fetchData
  };
}
