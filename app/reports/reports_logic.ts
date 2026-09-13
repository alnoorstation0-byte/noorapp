// app/reports/reports_logic.ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';

export function useReportsLogic() {
  const { showToast } = useToast();
  
  // فلتر التاريخ (الافتراضي: الشهر الحالي)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // 🚀 جلب البيانات باستخدام محرك React Query مع Fallback ذكي
  const { data: reportData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard_reports', dateRange.start, dateRange.end],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_comprehensive_dashboard', {
          start_date: dateRange.start,
          end_date: dateRange.end
        });
        if (!error && data) return data;
      } catch (rpcErr) {
        console.warn("get_comprehensive_dashboard RPC not available, using direct calculation:", rpcErr);
      }

      // 🛡️ Fallback المباشر: حساب مؤشرات لوحة التحكم من الجداول الأساسية
      try {
        const [invRes, expRes, recRes, payRes] = await Promise.all([
          supabase.from('invoices').select('total_amount').gte('date', dateRange.start).lte('date', dateRange.end).neq('status', 'مسودة'),
          supabase.from('expenses').select('total_price, quantity, unit_price, is_deleted').gte('exp_date', dateRange.start).lte('exp_date', dateRange.end),
          supabase.from('receipt_vouchers').select('amount').gte('date', dateRange.start).lte('date', dateRange.end),
          supabase.from('payment_vouchers').select('amount').gte('date', dateRange.start).lte('date', dateRange.end)
        ]);

        const totalSales = (invRes.data || []).reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);
        const totalExpenses = (expRes.data || [])
          .filter((r: any) => r.is_deleted !== true)
          .reduce((sum: number, r: any) => sum + Number(r.total_price || (r.quantity * r.unit_price) || 0), 0);
        const totalReceipts = (recRes.data || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
        const totalDisbursements = (payRes.data || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

        return {
          total_sales: totalSales,
          total_expenses: totalExpenses,
          total_receipts: totalReceipts,
          total_disbursements: totalDisbursements
        };
      } catch (fallbackErr: any) {
        console.error("Dashboard Fallback Error:", fallbackErr);
        return { total_sales: 0, total_expenses: 0, total_receipts: 0, total_disbursements: 0 };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // دالة لتحديث النطاق الزمني
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // دالة التحديث اليدوي
  const handleRefresh = () => {
    refetch();
    showToast('تم تحديث البيانات بنجاح', 'success');
  };

  return {
    reportData,
    isLoading: isLoading || isRefetching,
    dateRange,
    handleDateChange,
    handleRefresh
  };
}
