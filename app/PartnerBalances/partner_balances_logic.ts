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
  
  // 🚀 سحب البيانات من الـ View أو الجداول الأساسية كـ Fallback
  const { data: balances = [], isLoading, error } = useQuery({
    queryKey: ['partner_balances_summary', profile?.id],
    queryFn: async () => {
      try {
        let q = supabase
          .from('all_partners_account_summary')
          .select('*')
          .order('net_balance', { ascending: false });
        
        if (profile) {
            const role = String(profile.role || '').toLowerCase();
            const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
            if (!isGlobalAdmin && profile.linked_partner_id) {
                q = q.eq('partner_id', profile.linked_partner_id);
            }
        }

        const { data, error } = await q;
        if (!error && data) {
          return data.map((row: any) => ({
            ...row,
            total_earned: Number(row.total_earned ?? row.total_debit ?? 0),
            total_paid: Number(row.total_paid ?? row.total_credit ?? 0),
            current_balance: Number(row.current_balance ?? row.net_balance ?? 0)
          }));
        }
      } catch (viewErr) {
        console.warn("all_partners_account_summary query failed, using direct fallback:", viewErr);
      }

      // 🛡️ Fallback المباشر: حساب أرصدة الشركاء من جدول partners و journal_lines
      try {
        let pQuery = supabase.from('partners').select('id, name, partner_type, phone');
        if (profile) {
          const role = String(profile.role || '').toLowerCase();
          const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
          if (!isGlobalAdmin && profile.linked_partner_id) {
            pQuery = pQuery.eq('id', profile.linked_partner_id);
          }
        }

        const [partnersRes, linesRes] = await Promise.all([
          pQuery,
          supabase.from('journal_lines').select('partner_id, debit, credit').not('partner_id', 'is', null)
        ]);

        const partnersList = partnersRes.data || [];
        const lines = linesRes.data || [];

        const balanceMap = new Map<string, { debit: number, credit: number }>();
        lines.forEach((l: any) => {
          const prev = balanceMap.get(l.partner_id) || { debit: 0, credit: 0 };
          prev.debit += Number(l.debit || 0);
          prev.credit += Number(l.credit || 0);
          balanceMap.set(l.partner_id, prev);
        });

        return partnersList.map((p: any) => {
          const b = balanceMap.get(p.id) || { debit: 0, credit: 0 };
          const net = b.debit - b.credit;
          return {
            partner_id: p.id,
            partner_name: p.name,
            partner_type: p.partner_type,
            phone: p.phone,
            total_debit: b.debit,
            total_credit: b.credit,
            total_earned: b.debit,
            total_paid: b.credit,
            net_balance: net,
            current_balance: net
          };
        }).sort((a, b) => b.net_balance - a.net_balance);
      } catch (fallbackErr: any) {
        console.error("Partner balances fallback error:", fallbackErr);
        showToast("فشل جلب الأرصدة", 'error');
        return [];
      }
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
