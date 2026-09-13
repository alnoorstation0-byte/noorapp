"use client";
import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { fetchPaginatedData } from '@/lib/supabase-pagination';
import { useAuth } from '@/components/authGuard';
import { reconcileShiftOnJournalDeletion } from '@/lib/shift_sync_engine';

/**
 * العقل المدبر لدفتر اليومية الشامل - رواسي V12
 * 🟢 سحب على مراحل (1000 × 1000) مع حماية من التكرار
 * 🟢 فلترة شاملة حسب الفترة والحساب والشريك والفرع ونوع القيد
 */
export function useJournalLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 1. إدارة الحالة (State Management)
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
    const [filterPartnerId, setFilterPartnerId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('الكل'); 
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { profile, can } = useAuth();

    // 📥 2. محرك جلب البيانات - سحب على مراحل (React Query) مع Fallback ذكي
    const { data: journalMaster = [], isLoading, isError } = useQuery({
        queryKey: ['journal_master_view', dateFrom, dateTo, filterAccountId, filterPartnerId, filterStatus, profile?.id], 
        queryFn: async () => {
            try {
                const buildQuery = () => {
                    let query = supabase
                        .from('journal_master_view') 
                        .select('*')
                        .order('entry_date', { ascending: false })
                        .order('line_created_at', { ascending: false })
                        .order('line_id', { ascending: false });
                    
                    if (dateFrom) query = query.gte('entry_date', dateFrom);
                    if (dateTo) query = query.lte('entry_date', dateTo);
                    if (filterAccountId) query = query.eq('account_id', filterAccountId);
                    
                    // 🛡️ Data Scoping
                    if (profile) {
                        const role = String(profile.role || '').toLowerCase();
                        const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
                        if (!isGlobalAdmin && profile.linked_partner_id) {
                            query = query.eq('partner_id', profile.linked_partner_id);
                        } else if (filterPartnerId) {
                            query = query.eq('partner_id', filterPartnerId);
                        }
                    } else if (filterPartnerId) {
                        query = query.eq('partner_id', filterPartnerId);
                    }
                    
                    if (filterStatus === 'معتمد') query = query.in('header_status', ['posted', 'معتمد', 'مرحل', 'approved']);
                    if (filterStatus === 'مسودة') query = query.in('header_status', ['draft', 'pending', 'مسودة', 'غير مرحل']);

                    return query;
                };

                const res = await fetchPaginatedData(buildQuery, 'line_id');
                if (res && res.length >= 0) return res;
            } catch (viewErr) {
                console.warn("journal_master_view query failed, using direct table fallback:", viewErr);
            }

            // 🛡️ Fallback المباشر: استعلام الجداول الأساسية مباشرة
            try {
                let q = supabase.from('journal_lines').select(`
                    id, debit, credit, item_name, notes, created_at, account_id, partner_id, delegate_id, fleet_operation_id, tax_amount, tax_rate,
                    journal_headers!inner (id, entry_date, description, reference_id, v_type, status),
                    accounts (code, name),
                    partners (name)
                `).order('created_at', { ascending: false });

                if (dateFrom) q = q.gte('journal_headers.entry_date', dateFrom);
                if (dateTo) q = q.lte('journal_headers.entry_date', dateTo);
                if (filterAccountId) q = q.eq('account_id', filterAccountId);
                if (filterPartnerId) q = q.eq('partner_id', filterPartnerId);

                const { data: rawLines } = await q.limit(1000);
                return (rawLines || []).map((l: any) => ({
                    line_id: l.id,
                    header_id: l.journal_headers?.id,
                    entry_date: l.journal_headers?.entry_date,
                    header_description: l.journal_headers?.description,
                    reference_id: l.journal_headers?.reference_id,
                    v_type: l.journal_headers?.v_type,
                    header_status: l.journal_headers?.status,
                    account_id: l.account_id,
                    account_code: l.accounts?.code,
                    account_name: l.accounts?.name,
                    partner_id: l.partner_id,
                    partner_name: l.partners?.name,
                    debit: Number(l.debit || 0),
                    credit: Number(l.credit || 0),
                    item_name: l.item_name,
                    line_notes: l.notes,
                    tax_amount: l.tax_amount,
                    tax_rate: l.tax_rate,
                    line_created_at: l.created_at,
                    fleet_operation_id: l.fleet_operation_id,
                    delegate_id: l.delegate_id
                }));
            } catch (fallbackErr) {
                console.error("Journal fallback error:", fallbackErr);
                return [];
            }
        },
        enabled: !!profile,
        staleTime: 60 * 1000 
    });

    // 🔍 3. التصفية المتقدمة
    const displayedLines = useMemo(() => {
        if (!journalMaster || journalMaster.length === 0) return [];
        let result = journalMaster;

        if (filterStatus !== 'الكل') {
            if (filterStatus === 'معتمد') {
                result = result.filter(r => ['posted', 'معتمد', 'مرحل', 'approved'].includes(String(r.header_status || '').trim().toLowerCase()));
            } else if (filterStatus === 'مسودة') {
                result = result.filter(r => ['draft', 'pending', 'مسودة', 'غير مرحل'].includes(String(r.header_status || '').trim().toLowerCase()));
            }
        }

        if (deferredSearch) {
            const lower = deferredSearch.toLowerCase();
            result = result.filter(r => 
                (r.line_notes && String(r.line_notes).toLowerCase().includes(lower)) ||
                (r.header_description && String(r.header_description).toLowerCase().includes(lower)) ||
                (r.reference_id && String(r.reference_id).toLowerCase().includes(lower)) ||
                (r.account_name && String(r.account_name).toLowerCase().includes(lower)) ||
                (r.partner_name && String(r.partner_name).toLowerCase().includes(lower))
            );
        }
        return result;
    }, [journalMaster, deferredSearch, filterStatus]);

    // 🧮 4. محرك الحسابات المالية
    const totals = useMemo(() => {
        let totalDebit = 0;
        let totalCredit = 0;
        
        displayedLines.forEach(line => {
            const safeDebit = parseFloat(String(line.debit || 0).replace(/,/g, ''));
            const safeCredit = parseFloat(String(line.credit || 0).replace(/,/g, ''));
            
            totalDebit += isNaN(safeDebit) ? 0 : safeDebit;
            totalCredit += isNaN(safeCredit) ? 0 : safeCredit;
        });
        
        return { 
            totalDebit, 
            totalCredit, 
            balance: totalDebit - totalCredit, 
            count: displayedLines.length 
        };
    }, [displayedLines]);

    // 🚀 5. محرك الحذف المجمع مع تعديل الورديات تلقائياً
    const deleteHeadersMutation = useMutation({
        mutationFn: async () => {
            const selectedLines = journalMaster.filter(l => selectedIds.includes(String(l.line_id)));
            const headerIds = [...new Set(selectedLines.map(l => l.header_id))];

            if (headerIds.length === 0) throw new Error('لم يتم تحديد أي قيود صالحة.');

            return await reconcileShiftOnJournalDeletion(headerIds);
        },
        onSuccess: (res: any) => {
            if (res?.affectedShiftsCount > 0) {
                showToast(`تم حذف القيود وتحديث ${res.affectedShiftsCount} وردية مرتبطة بنجاح 🔄`, 'success');
            } else {
                showToast('تم حذف القيود وارتباطاتها بنجاح 🗑️', 'success');
            }
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            queryClient.invalidateQueries({ queryKey: ['pending_journals_count'] });
            queryClient.invalidateQueries({ queryKey: ['active_pos_shift'] });
            queryClient.invalidateQueries({ queryKey: ['pos_dashboard_sales_all'] });
            queryClient.invalidateQueries({ queryKey: ['pos_dashboard_shifts_all'] });
        },
        onError: (err: any) => showToast(`فشل الحذف: ${err.message}`, 'error')
    });

    const handleDeleteHeaders = useCallback(() => {
        if (confirm('تنبيه هام ⚠️: سيتم حذف القيود المحددة بالكامل.\nإذا كان أي قيد مرتبطاً بوردية كاشير، سيتم إلغاء الفاتورة وتعديل إجماليات الوردية وإرجاع البضاعة للمستودع تلقائياً.\nهل تريد الاستمرار؟')) {
            deleteHeadersMutation.mutate();
        }
    }, [deleteHeadersMutation]);

    const isFiltered = !!(filterAccountId || filterPartnerId || dateFrom || dateTo || (filterStatus !== 'الكل'));

    // 💎 6. تجريد المخرجات
    return {
        data: displayedLines,
        isLoading,
        isError,
        totals,
        isFiltered,
        state: {
            globalSearch,
            dateFrom,
            dateTo,
            filterAccountId,
            filterPartnerId,
            filterStatus,
            selectedIds
        },
        actions: {
            setGlobalSearch,
            setDateFrom,
            setDateTo,
            setFilterAccountId,
            setFilterPartnerId,
            setFilterStatus,
            setSelectedIds,
            handleDeleteHeaders
        }
    };
}
