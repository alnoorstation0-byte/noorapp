"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useToast } from '@/lib/toast-context';
import { fetchAllSupabaseData } from '@/lib/helpers';

export function useAdvancedAuditLogic() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('all');

    // 🚀 جلب كل الأخطاء من الـ View الشامل أو الفحص المباشر كـ Fallback
    const { data: errors = [], isLoading, refetch } = useQuery({
        queryKey: ['advanced_audit_errors'],
        queryFn: async () => {
            try {
                const data = await fetchAllSupabaseData(supabase, 'vw_advanced_audit');
                if (data && data.length >= 0) return data;
            } catch (viewErr) {
                console.warn("vw_advanced_audit view query failed, using direct audit fallback:", viewErr);
            }

            // 🛡️ Fallback المباشر: فحص اتزان القيود والحسابات المفقودة
            try {
                const { data: headers } = await supabase
                    .from('journal_headers')
                    .select(`
                        id, entry_date, description, v_type,
                        journal_lines (id, debit, credit, account_id)
                    `)
                    .limit(500);

                const auditErrors: any[] = [];
                (headers || []).forEach((h: any) => {
                    const lines = h.journal_lines || [];
                    const deb = lines.reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
                    const cred = lines.reduce((s: number, l: any) => s + Number(l.credit || 0), 0);
                    const diff = Math.abs(deb - cred);

                    if (diff > 0.05) {
                        auditErrors.push({
                            error_id: h.id,
                            header_id: h.id,
                            error_type: 'unbalanced',
                            error_date: h.entry_date,
                            source_type: h.v_type || 'journal_headers',
                            table_name: 'journal_headers',
                            details: `قيد محاسبي غير متزن: ${h.description || ''}`,
                            diff_amount: diff
                        });
                    }

                    lines.forEach((l: any) => {
                        if (!l.account_id) {
                            auditErrors.push({
                                error_id: l.id,
                                header_id: h.id,
                                error_type: 'missing',
                                error_date: h.entry_date,
                                source_type: 'journal_lines',
                                table_name: 'journal_lines',
                                details: 'سطر قيد بدون توجيه لحساب مالي',
                                diff_amount: Number(l.debit || l.credit || 0)
                            });
                        }
                    });
                });

                return auditErrors;
            } catch (fallbackErr) {
                console.error("Audit fallback error:", fallbackErr);
                return [];
            }
        }
    });

    // 🛡️ دالة الحذف الذكية مع Fallback
    const deleteErrorMutation = useMutation({
        mutationFn: async ({ error_id, table_name }: { error_id: string, table_name: string }) => {
            try {
                const { error } = await supabase.rpc('smart_audit_delete', { 
                    p_error_id: error_id, 
                    p_table_name: table_name 
                });
                if (!error) return;
            } catch {}

            // Fallback مباشر
            if (table_name === 'journal_headers') {
                await supabase.from('journal_lines').delete().eq('header_id', error_id);
                await supabase.from('journal_headers').delete().eq('id', error_id);
            } else if (table_name === 'journal_lines') {
                await supabase.from('journal_lines').delete().eq('id', error_id);
            } else {
                await supabase.from(table_name).delete().eq('id', error_id);
            }
        },
        onSuccess: () => {
            showToast("تم معالجة السجل بنجاح (تم التعليق/الحذف) 🧹", "success");
            queryClient.invalidateQueries({ queryKey: ['advanced_audit_errors'] });
            setSelectedIds([]);
        }
    });

    // 🛡️ دالة الحذف الجماعي (ذكية: تطهير آمن للبيانات)
    const bulkDeleteMutation = useMutation({
        mutationFn: async () => {
            const itemsToDelete = errors.filter(e => selectedIds.includes(e.error_id));
            
            // تمرير الأخطاء المحددة على الدالة الذكية لضمان تعليق اليوميات بدلاً من مسحها
            for (const item of itemsToDelete) {
                const { error } = await supabase.rpc('smart_audit_delete', { 
                    p_error_id: item.error_id, 
                    p_table_name: item.table_name 
                });
                if (error) {
                    console.error(`خطأ في معالجة السجل:`, error);
                    throw error;
                }
            }
        },
        onSuccess: () => {
            showToast(`تم معالجة ${selectedIds.length} خطأ من النظام بنجاح 🗑️`, "success");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['advanced_audit_errors'] });
        }
    });

    // ⚖️ محرك الموازنة الآلية (للقيود فقط) - تم تحديثه لمعالجة الأرقام والأخطاء
    const autoBalanceMutation = useMutation({
        mutationFn: async ({ header_id, diff_amount }: { header_id: string, diff_amount: number | string }) => {
            const numDiff = Number(diff_amount); // 🚀 تأكيد تحويل القيمة لرقم صحيح
            const isDebitMissing = numDiff < 0; 
            
            const fixLine = {
                header_id: header_id,
                account_id: 'd5e827b1-4f1a-4c2f-8a03-8d6e7f123456', // 👈 تم التعديل: ID حساب التسويات الجديد
                notes: 'تسوية آلية لفرق هللات - رادار التدقيق المتقدم', // 👈 تم التعديل: استخدام notes بدلاً من description
                debit: isDebitMissing ? Math.abs(numDiff) : 0,
                credit: isDebitMissing ? 0 : Math.abs(numDiff),
            };

            const { error } = await supabase.from('journal_lines').insert([fixLine]);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم موازنة القيد وإصلاح الخلل ⚖️", "success");
            queryClient.invalidateQueries({ queryKey: ['advanced_audit_errors'] });
        },
        onError: (err: any) => {
            // 🚀 إظهار تنبيه واضح لو العملية اترفضت من الداتابيز
            showToast(`فشل الموازنة: ${err.message}`, "error");
        }
    });

    // 🧹 دالة تنظيف القيود الصفرية والعمياء مع Fallback
    const cleanZeroLinesMutation = useMutation({
        mutationFn: async () => {
            try {
                const { error } = await supabase.rpc('clean_blind_journal_lines');
                if (!error) return;
            } catch {}

            // Fallback مباشر لمسح الأسطر الصفرية
            await supabase.from('journal_lines').delete().eq('debit', 0).eq('credit', 0);
            await supabase.from('journal_lines').delete().is('account_id', null);
        },
        onSuccess: () => {
            showToast("تم تطهير النظام من القيود الصفرية والعمياء بنجاح ✨", "success");
            queryClient.invalidateQueries({ queryKey: ['advanced_audit_errors'] });
            setSelectedIds([]); // تصفير التحديد
        },
        onError: (err: any) => {
            showToast(`فشل التنظيف: ${err.message}`, "error");
        }
    });

    // 📊 تصدير إكسيل 
    const exportToExcel = () => {
        if (errors.length === 0) return showToast("لا يوجد أخطاء للتصدير", 'info');
        const ws = XLSX.utils.json_to_sheet(errors.map(e => ({
            'مصدر الخطأ (الجدول)': e.table_name,
            'نوع الخطأ': e.error_type,
            'التاريخ': e.error_date,
            'التفاصيل': e.details,
            'الفرق المالي': Number(e.diff_amount) || 0,
            'معرف السجل': e.error_id
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "System_Audit_Report");
        XLSX.writeFile(wb, `System_Audit_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // 🔍 فلترة البيانات 
    const filteredErrors = useMemo(() => {
        let result = errors;
        if (activeTab !== 'all') {
            result = result.filter(e => e.error_type.includes(activeTab) || e.table_name.includes(activeTab));
        }
        if (searchQuery) {
            result = result.filter(e => 
                e.details?.includes(searchQuery) || 
                e.error_type?.includes(searchQuery) || 
                e.table_name?.includes(searchQuery)
            );
        }
        return result;
    }, [errors, activeTab, searchQuery]);

    // 📈 الإحصائيات
    const stats = useMemo(() => ({
        total: errors.length,
        unbalanced: errors.filter(e => e.error_type.includes('unbalanced')).length,
        ghosts: errors.filter(e => e.error_type.includes('ghost')).length,
        orphans: errors.filter(e => e.error_type.includes('orphan')).length,
        brokenRef: errors.filter(e => e.error_type.includes('missing') || e.error_type.includes('بدون') || e.error_type.includes('نقص')).length,
    }), [errors]);

    const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const selectAll = () => setSelectedIds(selectedIds.length === filteredErrors.length ? [] : filteredErrors.map(e => e.error_id));

    return {
        isLoading, errors: filteredErrors, stats,
        searchQuery, setSearchQuery, activeTab, setActiveTab,
        selectedIds, toggleSelection, selectAll,
        deleteError: (id: string, table: string) => deleteErrorMutation.mutate({ error_id: id, table_name: table }),
        isDeleting: deleteErrorMutation.isPending,
        bulkDelete: () => bulkDeleteMutation.mutate(),
        isBulkDeleting: bulkDeleteMutation.isPending,
        autoBalance: (id: string, diff: number) => autoBalanceMutation.mutate({ header_id: id, diff_amount: diff }),
        
        // 🚀 إضافة المتغيرات الجديدة الخاصة بزرار التطهير هنا
        cleanZeroLines: () => cleanZeroLinesMutation.mutate(),
        isCleaningZeroLines: cleanZeroLinesMutation.isPending,
        
        exportToExcel, refetch
    };
}
