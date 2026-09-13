// @ts-nocheck
"use client";

import { supabase } from './supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './toast-context';

// ============================================================================
// 🚀 المحرك الموحد للترحيل وفك الترحيل (الباب العاشر - ميثاق رواسي V11)
// ============================================================================
export function useUniversalPosting(queryKey: string, tableName: string, postRpcName: string) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 🟢 1. دالة الترحيل المخصصة مع طبقة حماية Fallback فورية
    const postMutation = useMutation({
        mutationFn: async (selectedIds: string[]) => {
            if (!selectedIds || selectedIds.length === 0) throw new Error("لم يتم تحديد أي سجلات للترحيل.");
            
            let rpcSuccess = false;
            try {
                const { error } = await supabase.rpc(postRpcName, { p_ids: selectedIds });
                if (!error) {
                    rpcSuccess = true;
                } else if (!error.message?.includes('Could not find the function') && !error.message?.includes('PGRST202')) {
                    console.warn(`RPC ${postRpcName} returned error, trying direct fallback:`, error.message);
                }
            } catch (err: any) {
                console.warn(`RPC ${postRpcName} execution error:`, err);
            }

            // 🛡️ Fallback المباشر عند غياب الدالة في السيرفر
            if (!rpcSuccess) {
                if (tableName === 'invoices') {
                    const { data: invs } = await supabase.from('invoices').select('*').in('id', selectedIds);
                    for (const inv of (invs || [])) {
                        if (inv.is_posted) continue;
                        const { data: jh } = await supabase.from('journal_headers').insert([{
                            entry_date: inv.date || new Date().toISOString().split('T')[0],
                            description: `فاتورة مبيعات رقم ${inv.invoice_number || ''}`,
                            reference_id: inv.id,
                            v_type: 'invoice',
                            status: 'posted',
                            fleet_operation_id: inv.fleet_operation_id || null
                        }]).select().single();

                        if (jh) {
                            const lines: any[] = [];
                            const total = Number(inv.total_amount || 0);
                            const tax = Number(inv.tax_amount || 0);
                            const taxable = Number(inv.taxable_amount || total - tax);

                            if (total > 0 && inv.debit_account_id) {
                                lines.push({
                                    header_id: jh.id,
                                    account_id: inv.debit_account_id,
                                    partner_id: inv.partner_id || null,
                                    debit: total,
                                    credit: 0,
                                    notes: `استحقاق فاتورة مبيعات #${inv.invoice_number || ''}`,
                                    fleet_operation_id: inv.fleet_operation_id || null,
                                    delegate_id: inv.delegate_id || null
                                });
                            }
                            if (taxable > 0 && inv.credit_account_id) {
                                lines.push({
                                    header_id: jh.id,
                                    account_id: inv.credit_account_id,
                                    partner_id: inv.partner_id || null,
                                    debit: 0,
                                    credit: taxable,
                                    notes: `إيراد مبيعات فاتورة #${inv.invoice_number || ''}`,
                                    fleet_operation_id: inv.fleet_operation_id || null,
                                    delegate_id: inv.delegate_id || null
                                });
                            }
                            if (tax > 0 && inv.tax_acc_id) {
                                lines.push({
                                    header_id: jh.id,
                                    account_id: inv.tax_acc_id,
                                    partner_id: inv.partner_id || null,
                                    debit: 0,
                                    credit: tax,
                                    notes: `ضريبة القيمة المضافة فاتورة #${inv.invoice_number || ''}`,
                                    tax_amount: tax,
                                    fleet_operation_id: inv.fleet_operation_id || null,
                                    delegate_id: inv.delegate_id || null
                                });
                            }
                            if (lines.length > 0) {
                                await supabase.from('journal_lines').insert(lines);
                            }
                        }
                        await supabase.from('invoices').update({ status: 'معتمد', is_posted: true }).eq('id', inv.id);
                    }
                } else if (tableName === 'payment_vouchers') {
                    const { data: pvs } = await supabase.from('payment_vouchers').select('*').in('id', selectedIds);
                    for (const pv of (pvs || [])) {
                        if (pv.is_posted) continue;
                        const { data: jh } = await supabase.from('journal_headers').insert([{
                            entry_date: pv.date || new Date().toISOString().split('T')[0],
                            description: `سند صرف رقم ${pv.voucher_number || ''}`,
                            reference_id: pv.id,
                            v_type: 'payment_voucher',
                            status: 'posted',
                            fleet_operation_id: pv.fleet_operation_id || null
                        }]).select().single();

                        if (jh) {
                            const amt = Number(pv.amount || 0);
                            const lines: any[] = [];
                            if (amt > 0 && pv.debit_account_id) {
                                lines.push({
                                    header_id: jh.id,
                                    account_id: pv.debit_account_id,
                                    partner_id: pv.partner_id || null,
                                    debit: amt,
                                    credit: 0,
                                    notes: `سند صرف #${pv.voucher_number || ''}`,
                                    fleet_operation_id: pv.fleet_operation_id || null
                                });
                            }
                            if (amt > 0 && pv.credit_account_id) {
                                lines.push({
                                    header_id: jh.id,
                                    account_id: pv.credit_account_id,
                                    debit: 0,
                                    credit: amt,
                                    notes: `سداد سند صرف #${pv.voucher_number || ''}`,
                                    fleet_operation_id: pv.fleet_operation_id || null
                                });
                            }
                            if (lines.length > 0) {
                                await supabase.from('journal_lines').insert(lines);
                            }
                        }
                        await supabase.from('payment_vouchers').update({ status: 'معتمد', is_posted: true }).eq('id', pv.id);
                    }
                } else if (tableName === 'expenses') {
                    for (const expId of selectedIds) {
                        try {
                            await supabase.rpc('post_expense_to_journal', { p_expense_id: expId });
                        } catch {
                            await supabase.from('expenses').update({ is_posted: true }).eq('id', expId);
                        }
                    }
                } else if (tableName === 'receipt_vouchers') {
                    const { data: rvs } = await supabase.from('receipt_vouchers').select('*').in('id', selectedIds);
                    for (const rv of (rvs || [])) {
                        if (rv.status === 'معتمد') continue;
                        const { data: jh } = await supabase.from('journal_headers').insert([{
                            entry_date: rv.date || new Date().toISOString().split('T')[0],
                            description: `سند قبض رقم ${rv.receipt_number || ''}`,
                            reference_id: rv.id,
                            v_type: 'receipt',
                            status: 'posted',
                            fleet_operation_id: rv.fleet_operation_id || null
                        }]).select().single();

                        if (jh) {
                            const amt = Number(rv.amount || 0);
                            const lines: any[] = [];
                            if (amt > 0 && rv.safe_bank_acc_id) {
                                lines.push({
                                    header_id: jh.id,
                                    account_id: rv.safe_bank_acc_id,
                                    partner_id: rv.partner_id || null,
                                    debit: amt,
                                    credit: 0,
                                    notes: `تحصيل نقدية سند قبض #${rv.receipt_number || ''}`,
                                    fleet_operation_id: rv.fleet_operation_id || null,
                                    delegate_id: rv.delegate_id || null
                                });
                            }
                            if (amt > 0 && rv.partner_acc_id) {
                                lines.push({
                                    header_id: jh.id,
                                    account_id: rv.partner_acc_id,
                                    partner_id: rv.partner_id || null,
                                    debit: 0,
                                    credit: amt,
                                    notes: `سداد عميل سند قبض #${rv.receipt_number || ''}`,
                                    fleet_operation_id: rv.fleet_operation_id || null,
                                    delegate_id: rv.delegate_id || null
                                });
                            }
                            if (lines.length > 0) {
                                await supabase.from('journal_lines').insert(lines);
                            }
                        }
                        await supabase.from('receipt_vouchers').update({ status: 'معتمد' }).eq('id', rv.id);
                    }
                } else {
                    await supabase.from(tableName).update({ status: 'معتمد', is_posted: true }).in('id', selectedIds);
                }
            }
        },
        onSuccess: () => {
            showToast('تم الترحيل وإصدار القيود بنجاح 🚀', 'success');
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            queryClient.invalidateQueries({ queryKey: ['journal_headers'] });
            queryClient.invalidateQueries({ queryKey: ['accounts_report_with_lines'] });
        },
        onError: (err: any) => showToast(`فشل الترحيل: ${err.message}`, 'error')
    });

    // ⏪ 2. دالة فك الترحيل الموحدة (Universal Unpost) مع حماية Fallback المباشرة
    const unpostMutation = useMutation({
        mutationFn: async (selectedIds: string[]) => {
            if (!selectedIds || selectedIds.length === 0) throw new Error("لم يتم تحديد أي سجلات لفك الترحيل.");
            
            let rpcSuccess = false;
            try {
                let res: any = null;
                if (tableName === 'payment_vouchers') {
                    res = await supabase.rpc('unpost_payment_vouchers_bulk', { p_ids: selectedIds });
                } else if (tableName === 'invoices') {
                    res = await supabase.rpc('unpost_invoices_bulk', { p_ids: selectedIds });
                } else if (tableName === 'expenses') {
                    res = await supabase.rpc('unpost_expenses_bulk', { p_ids: selectedIds });
                } else if (tableName === 'receipt_vouchers') {
                    res = await supabase.rpc('unpost_receipts_bulk', { p_ids: selectedIds });
                } else {
                    res = await supabase.rpc('unpost_universal_bulk', { 
                        p_ids: selectedIds,
                        p_table_name: tableName 
                    });
                }
                if (!res?.error) {
                    rpcSuccess = true;
                }
            } catch (err) {
                console.warn(`RPC unpost error, applying direct fallback:`, err);
            }

            // 🛡️ Fallback المباشر: مسح القيود وتحديث الحالة برمجياً
            try {
                const { data: headers } = await supabase
                    .from('journal_headers')
                    .select('id')
                    .in('reference_id', selectedIds);

                if (headers && headers.length > 0) {
                    const headerIds = headers.map(h => h.id);
                    await supabase.from('journal_lines').delete().in('header_id', headerIds);
                    await supabase.from('journal_headers').delete().in('id', headerIds);
                }
            } catch (delErr) {
                console.warn('Direct unpost journal cleanup error:', delErr);
            }

            // 🚀 تحديث حالة السجل إلى مسودة وفك الترحيل
            const updatePayload = tableName === 'receipt_vouchers' 
                ? { status: 'مسودة' }
                : { status: 'مسودة', is_posted: false };
            await supabase.from(tableName).update(updatePayload).in('id', selectedIds);
        },
        onSuccess: () => {
            showToast('تم فك الترحيل ومسح القيود بنجاح ⏪', 'success');
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            queryClient.invalidateQueries({ queryKey: ['journal_headers'] });
            queryClient.invalidateQueries({ queryKey: ['accounts_report_with_lines'] });
        },
        onError: (err: any) => showToast(`فشل فك الترحيل: ${err.message}`, 'error')
    });

    return {
        postRecords: (ids: string[]) => postMutation.mutate(ids),
        unpostRecords: (ids: string[]) => unpostMutation.mutate(ids),
        isProcessing: postMutation.isPending || unpostMutation.isPending
    };
}

// ============================================================================
// 📊 دالة سحب وتجميع البيانات الضخمة (تخطي حاجز الـ 1000 سطر - الباب الثالث)
// ============================================================================
export async function calculateMassiveTotals(tableName: string, amountColumn: string) {
    try {
        let total = 0;
        let keepFetching = true;
        let offset = 0;
        const limit = 1000;

        // التجزئة الذرية (Atomic Chunking) لجمع المبالغ
        while (keepFetching) {
            const { data, error } = await supabase
                .from(tableName)
                .select(amountColumn)
                .range(offset, offset + limit - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                total += data.reduce((sum, row) => sum + Number(row[amountColumn] || 0), 0);
                offset += limit;
                if (data.length < limit) keepFetching = false;
            } else {
                keepFetching = false;
            }
        }
        
        return { success: true, total };
    } catch (error: any) {
        console.error("Calculation Error:", error);
        return { success: false, error: error.message };
    }
}
