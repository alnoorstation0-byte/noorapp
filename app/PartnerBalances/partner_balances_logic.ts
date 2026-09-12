"use client";
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/components/authGuard';

export function usePartnerBalancesLogic() {
  const { showToast } = useToast();
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { profile, can } = useAuth();
  
  // 🚀 سحب البيانات من الـ View الجاهز والمحسوب في السيرفر
  const { data: balances = [], isLoading, error } = useQuery({
    queryKey: ['partner_balances_summary', profile?.id],
    queryFn: async () => {
      let q = supabase
        .from('all_partners_account_summary')
        .select('*')
        .order('net_balance', { ascending: false }); // ترتيب بالأعلى رصيداً
      
      if (profile) {
          const role = String(profile.role || '').toLowerCase();
          const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
          if (!isGlobalAdmin && profile.linked_partner_id) {
              q = q.eq('partner_id', profile.linked_partner_id);
          }
      }

      const { data, error } = await q;
      
      if (error) {
        showToast("فشل جلب الأرصدة", 'error');
        throw error;
      }
      return (data || []).map((row: any) => ({
        ...row,
        total_earned: Number(row.total_earned ?? row.total_debit ?? 0),
        total_paid: Number(row.total_paid ?? row.total_credit ?? 0),
        current_balance: Number(row.current_balance ?? row.net_balance ?? 0)
      }));
    },
    enabled: !!profile
  });

  // 🛡️ التصفية اللحظية
  const filteredData = useMemo(() => {
    if (!balances) return [];
    return balances.filter((item: any) => 
      item.partner_name?.toLowerCase().includes(globalSearch.toLowerCase()) ||
      item.partner_type?.toLowerCase().includes(globalSearch.toLowerCase())
    );
  }, [balances, globalSearch]);

  // 📊 إجماليات الرادار
  const totals = useMemo(() => {
    return filteredData.reduce((acc: any, row: any) => {
      acc.earned += Number(row.total_earned || row.total_debit || 0);
      acc.paid += Number(row.total_paid || row.total_credit || 0);
      acc.balance += Number(row.current_balance || row.net_balance || 0);
      return acc;
    }, { earned: 0, paid: 0, balance: 0 });
  }, [filteredData]);

  return {
    filteredData,
    isLoading,
    globalSearch,
    setGlobalSearch,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totals
  };
}
