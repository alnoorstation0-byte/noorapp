"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { showGlobalToast } from '@/lib/toast-context';

export function useTrialBalanceLogic() {
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // افتراضياً: من أول الشهر لآخره
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

    const fetchTrialBalance = async () => {
        setIsLoading(true);
        try {
            let trialData: any[] | null = null;
            try {
                const { data, error } = await supabase.rpc('get_trial_balance', {
                    p_start_date: startDate,
                    p_end_date: endDate
                });
                if (!error && data) {
                    trialData = data;
                }
            } catch (rpcErr) {
                console.warn("Trial balance RPC not available, using direct calculation:", rpcErr);
            }

            // 🛡️ Fallback المباشر: حساب ميزان المراجعة من الدفاتر مباشرة
            if (!trialData) {
                const [accountsRes, linesRes, headersRes] = await Promise.all([
                    supabase.from('accounts').select('id, code, name, is_transactional').order('code'),
                    supabase.from('journal_lines').select('header_id, account_id, debit, credit'),
                    supabase.from('journal_headers').select('id, entry_date, status')
                ]);

                const accounts = accountsRes.data || [];
                const lines = linesRes.data || [];
                const headers = headersRes.data || [];
                const headerMap = new Map(headers.map((h: any) => [h.id, h]));

                const accMap = new Map<string, any>();
                accounts.forEach(a => {
                    accMap.set(a.id, {
                        account_id: a.id,
                        account_code: a.code,
                        account_name: a.name,
                        opening_debit: 0,
                        opening_credit: 0,
                        period_debit: 0,
                        period_credit: 0,
                        ending_debit: 0,
                        ending_credit: 0,
                        has_activity: false
                    });
                });

                lines.forEach((l: any) => {
                    const row = accMap.get(l.account_id);
                    if (!row) return;
                    const h = headerMap.get(l.header_id);
                    const date = h?.entry_date || '';
                    if (endDate && date > endDate) return;

                    const d = Number(l.debit || 0);
                    const c = Number(l.credit || 0);
                    if (d !== 0 || c !== 0) row.has_activity = true;

                    if (startDate && date < startDate) {
                        row.opening_debit += d;
                        row.opening_credit += c;
                    } else if ((!startDate || date >= startDate) && (!endDate || date <= endDate)) {
                        row.period_debit += d;
                        row.period_credit += c;
                    }
                });

                trialData = Array.from(accMap.values())
                    .map(r => ({
                        ...r,
                        ending_debit: r.opening_debit + r.period_debit,
                        ending_credit: r.opening_credit + r.period_credit
                    }))
                    .filter(r => r.has_activity || accounts.find(a => a.id === r.account_id)?.is_transactional);
            }

            setRecords(trialData || []);
            
        } catch (err: any) {
            console.error("Error fetching Trial Balance:", err.message);
            showGlobalToast("❌ حدث خطأ أثناء جلب ميزان المراجعة", 'warning');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTrialBalance();
    }, [startDate, endDate]);

    // حساب إجماليات الميزان (يجب أن يتطابق المدين مع الدائن دائماً)
    const totals = useMemo(() => {
        return records.reduce((acc, r) => {
            acc.op_debit += Number(r.opening_debit) || 0;
            acc.op_credit += Number(r.opening_credit) || 0;
            acc.per_debit += Number(r.period_debit) || 0;
            acc.per_credit += Number(r.period_credit) || 0;
            acc.end_debit += Number(r.ending_debit) || 0;
            acc.end_credit += Number(r.ending_credit) || 0;
            return acc;
        }, { op_debit: 0, op_credit: 0, per_debit: 0, per_credit: 0, end_debit: 0, end_credit: 0 });
    }, [records]);

    // تصدير احترافي للإكسيل
    const exportToExcel = () => {
        const dataToExport = records.map(r => ({
            "رقم الحساب": r.account_code,
            "اسم الحساب": r.account_name,
            "رصيد افتتاحي (مدين)": Number(r.opening_debit) || 0,
            "رصيد افتتاحي (دائن)": Number(r.opening_credit) || 0,
            "حركة الفترة (مدين)": Number(r.period_debit) || 0,
            "حركة الفترة (دائن)": Number(r.period_credit) || 0,
            "الرصيد الختامي (مدين)": Number(r.ending_debit) || 0,
            "الرصيد الختامي (دائن)": Number(r.ending_credit) || 0,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [{wch: 15}, {wch: 35}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 18}];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ميزان المراجعة");
        XLSX.writeFile(wb, `ميزان_المراجعة_${startDate}_إلى_${endDate}.xlsx`);
    };

    return {
        records,
        isLoading,
        startDate, setStartDate,
        endDate, setEndDate,
        fetchTrialBalance,
        totals,
        exportToExcel
    };
}
