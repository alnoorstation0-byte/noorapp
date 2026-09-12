"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useCashFlowsLogic() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, inflow, outflow
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data: cashFlows = [], isLoading } = useQuery({
        queryKey: ['cash_flows_list'],
        queryFn: async () => {
            let allData: any[] = [];
            
            // 1. جلب التدفقات المسجلة بجدول cash_flows إن وُجدت
            try {
                const { data: cfData, error: cfError } = await supabase
                    .from('cash_flows')
                    .select(`
                        *,
                        partner:partners(name),
                        account:accounts(name)
                    `)
                    .order('transaction_date', { ascending: false });
                if (!cfError && cfData) {
                    allData.push(...cfData);
                }
            } catch (e) {
                console.warn("Could not fetch cash_flows table:", e);
            }

            // 2. 🌊 جلب سندات القبض المعتمدة كتدفقات نقدية داخلة (Inflows)
            try {
                const { data: receipts, error: rvError } = await supabase
                    .from('receipt_vouchers')
                    .select(`
                        id,
                        receipt_number,
                        date,
                        amount,
                        payment_method,
                        notes,
                        partner:partners!receipt_vouchers_partner_id_fkey(name),
                        account:accounts!receipt_vouchers_safe_bank_acc_id_fkey(name)
                    `)
                    .in('status', ['مرحل', 'معتمد', 'posted'])
                    .order('date', { ascending: false });

                if (!rvError && receipts) {
                    const mappedReceipts = receipts.map((r: any) => ({
                        id: r.id,
                        transaction_date: r.date,
                        flow_type: 'inflow',
                        amount: Number(r.amount) || 0,
                        category: 'مقبوضات',
                        sub_category: 'سند قبض / مبيعات',
                        payment_method: r.payment_method || 'نقدي',
                        reference_number: r.receipt_number || '',
                        description: r.notes || `سند قبض #${r.receipt_number}`,
                        partner: r.partner,
                        account: r.account,
                        source_type: 'receipt_voucher',
                        source_id: r.id
                    }));
                    allData.push(...mappedReceipts);
                }
            } catch (rvErr) {
                console.error("Error fetching receipts for cash flow:", rvErr);
            }

            // 3. 🌊 جلب سندات الصرف المعتمدة كتدفقات نقدية خارجة (Outflows)
            try {
                const { data: payments, error: pvError } = await supabase
                    .from('payment_vouchers')
                    .select(`
                        id,
                        voucher_number,
                        date,
                        amount,
                        payment_method,
                        description,
                        notes,
                        partner:partners(name),
                        account:accounts!payment_vouchers_credit_account_id_fkey(name)
                    `)
                    .or('is_posted.eq.true,status.in.(مرحل,معتمد,posted)')
                    .order('date', { ascending: false });

                if (!pvError && payments) {
                    const mappedPayments = payments.map((p: any) => ({
                        id: p.id,
                        transaction_date: p.date,
                        flow_type: 'outflow',
                        amount: Number(p.amount) || 0,
                        category: 'مدفوعات',
                        sub_category: 'سند صرف / موردين',
                        payment_method: p.payment_method || 'نقدي',
                        reference_number: p.voucher_number || '',
                        description: p.description || p.notes || `سند صرف #${p.voucher_number}`,
                        partner: p.partner,
                        account: p.account,
                        source_type: 'payment_voucher',
                        source_id: p.id
                    }));
                    allData.push(...mappedPayments);
                }
            } catch (pvErr) {
                console.error("Error fetching payments for cash flow:", pvErr);
            }
            
            // 🛡️ درع الحماية المالي: فلترة ومنع تكرار الـ ID نهائياً لضمان سلامة الحسابات
            const uniqueDataMap = new Map();
            allData.forEach((item) => {
                if (item.id && !uniqueDataMap.has(item.id)) {
                    uniqueDataMap.set(item.id, item);
                }
            });
            
            return Array.from(uniqueDataMap.values()).sort((a: any, b: any) => 
                new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
            );
        },
        // ⚡ تحسينات الأداء والـ Caching:
        staleTime: 1000 * 60 * 5, // الاحتفاظ بالبيانات لمدة 5 دقائق بدون إعادة سحب من السيرفر
        refetchOnWindowFocus: false, // منع سحب البيانات تلقائياً عند التنقل بين نوافذ المتصفح
    });

    return {
        cashFlows,
        isLoading,
        searchTerm, setSearchTerm,
        filterType, setFilterType,
        dateFrom, setDateFrom,
        dateTo, setDateTo
    };
}

