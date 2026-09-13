"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { fetchAllSupabaseData } from '@/lib/helpers';
import { fetchPaginatedData } from '@/lib/supabase-pagination';

export function useLedgerLogic() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // 📥 1. جلب قائمة الحسابات بمحرك القوة (React Query) 
  const { data: accounts = [] } = useQuery({
    queryKey: ['ledger_accounts_list'],
    queryFn: async () => {
      return await fetchAllSupabaseData(supabase, 'accounts', 'id, name, code', 'code') || [];
    }
  });

  // 📥 2. جلب الحركات عبر العرض المحاسبي الموحد الآمن (journal_master_view)
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['ledger_entries', selectedAccountId],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const buildQuery = () => supabase
        .from('journal_master_view')
        .select('*')
        .eq('account_id', selectedAccountId)
        .order('entry_date', { ascending: true })
        .order('line_id', { ascending: true });
      
      const raw = await fetchPaginatedData(buildQuery, 'line_id');
      return (raw || []).map((r: any) => ({
        id: r.line_id,
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0),
        item_name: r.item_name,
        notes: r.line_notes,
        journal_headers: {
          entry_date: r.entry_date,
          description: r.header_description
        },
        partners: {
          name: r.partner_name
        }
      }));
    }
  });

  // 📊 3. الحسابات والفلترة داخل useMemo حصراً [cite: 6]
  const ledgerStats = useMemo(() => {
    let runningBalance = 0;
    const enrichedEntries = entries.map((entry: any) => {
      runningBalance += (Number(entry.debit) - Number(entry.credit));
      return { ...entry, runningBalance };
    });

    const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);

    return {
      entries: enrichedEntries,
      totalDebit,
      totalCredit,
      currentBalance: totalDebit - totalCredit
    };
  }, [entries]);

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    isLoading,
    ...ledgerStats
  };
}
