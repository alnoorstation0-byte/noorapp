"use client";
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSmartFilter } from '@/lib/useSmartFilter'; 
import { fetchPaginatedData } from '@/lib/supabase-pagination'; 
import { useUniversalPosting } from '@/lib/accounting_engine'; 
import { useToast , showGlobalToast} from '@/lib/toast-context'; 
import { checkAdminApprovalPrivilege } from '@/lib/helpers';
import { useRealtimeInvalidate } from '@/lib/useRealtimeSync';
import { useAuth } from '@/components/authGuard';
import { notifyExpenseCreated } from '@/lib/notificationService';


export function useExpensesLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast(); 

    // 🔄 مزامنة فورية - تحديث تلقائي ذكي بدون سحب داتا
    useRealtimeInvalidate(['expenses', 'payment_vouchers'], ['expenses', 'payment_vouchers']);

    // 🎯 دالة مساعدة لتحديث سطر في الكاش بدقة شديدة
    const updateRowsInCache = (targetIds: any[], updatedFields: any) => {
        queryClient.setQueryData(['expenses'], (oldData: any[]) => {
            if (!oldData) return [];
            const stringIds = targetIds.map(String);
            return oldData.map(row => 
                stringIds.includes(String(row.id)) 
                    ? { ...row, ...updatedFields } 
                    : row 
            );
        });
    };

    // 1. إدارة الحالة الأساسية
    const [userRole, setUserRole] = useState<string>('viewer');
    const [userPermissions, setUserPermissions] = useState<any>({});
    
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    
    const [paymentFilter, setPaymentFilter] = useState<string>('الكل');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isBulkFixModalOpen, setIsBulkFixModalOpen] = useState(false);
    const [bulkFixAccounts, setBulkFixAccounts] = useState<{ creditor_account: string; payment_account: string; creditor_account_id?: string | null; payment_account_id?: string | null }>({ creditor_account: '', payment_account: '' });

    const [disburseProgress, setDisburseProgress] = useState({ current: 0, total: 0, isActive: false });
    const [rowActionLoadingId, setRowActionLoadingId] = useState<string | null>(null);

    // 🚀 القيمة الافتراضية أصبحت "آجل" تماشياً مع التحديث المحاسبي
    const defaultExp = { 
        exp_date: new Date().toISOString().split('T')[0], main_category: '',       
        creditor_account: '', description: '', payee_name: '', payment_method: 'آجل', payment_account: '', 
        employee_name: '', quantity: 1, unit_price: 0, vat_amount: 0, discount_amount: 0, discount_account: '', 
        notes: '', invoice_image: null, is_auto_distributed: false, expense_number: '',
        payee_id: null
    };
    const [currentExpense, setCurrentExpense] = useState<any>(defaultExp);

    const { profile, can } = useAuth();

    // 📥 2. جلب البيانات الأساسية
    const expensesQuery = useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            const buildQuery = () => {
                let q = supabase.from('expenses').select('*').order('exp_date', { ascending: false });
                
                // 🛡️ Data Scoping
                if (profile) {
                    const role = String(profile.role || '').toLowerCase();
                    const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
                    if (!isGlobalAdmin && profile.linked_partner_id) {
                        q = q.eq('payee_id', profile.linked_partner_id);
                    }
                }
                return q;
            };
            const allData = await fetchPaginatedData(buildQuery, 'id');

            const groupedExpenses = new Map();
            allData.forEach((exp: any) => {
                let parsedLines = [];
                if (typeof exp.lines_data === 'string') {
                    try { parsedLines = JSON.parse(exp.lines_data); } catch (e) {}
                } else if (Array.isArray(exp.lines_data)) {
                    parsedLines = exp.lines_data;
                }

                if (!exp.expense_number) {
                    groupedExpenses.set(exp.id, { ...exp, lines_data: parsedLines });
                } else {
                    if (groupedExpenses.has(exp.expense_number)) {
                        const existing = groupedExpenses.get(exp.expense_number);
                        
                        existing.lines_data.push({
                            id: exp.id,
                            description: exp.description,
                            quantity: exp.quantity,
                            unit_price: exp.unit_price,
                            vat_amount: exp.vat_amount,
                            discount_amount: exp.discount_amount,
                            total_price: exp.total_price
                        });
                        
                        existing.vat_amount = Number(existing.vat_amount || 0) + Number(exp.vat_amount || 0);
                        existing.discount_amount = Number(existing.discount_amount || 0) + Number(exp.discount_amount || 0);
                        existing.total_price = Number(existing.total_price || 0) + Number(exp.total_price || 0);
                        
                    } else {
                        groupedExpenses.set(exp.expense_number, {
                            ...exp,
                            lines_data: parsedLines.length > 0 ? parsedLines : [{
                                id: exp.id,
                                description: exp.description,
                                quantity: exp.quantity,
                                unit_price: exp.unit_price,
                                vat_amount: exp.vat_amount,
                                discount_amount: exp.discount_amount,
                                total_price: exp.total_price
                            }]
                        });
                    }
                }
            });

            return Array.from(groupedExpenses.values());
        },
        enabled: !!profile,
        staleTime: 0,       // ← مهم: دائماً اعتبر البيانات قديمة لضمان التحديث الفوري
        gcTime: 1000 * 60 * 10,
        retry: 1
    });
    const expenses = expensesQuery.data || [];

    // 📥 جلب البيانات المساعدة
    const supportDataQuery = useQuery({
        queryKey: ['expenses_support_data'],
        queryFn: async () => {
            const [part, acc] = await Promise.all([
                supabase.from('partners').select('id, name, partner_type'),
                supabase.from('accounts').select('id, code, name')
            ]);
            
            const partnersData = part.data || [];

            return {
                projects: [],
                contractors: partnersData.filter(p => p.partner_type === 'مورد'),
                payees: partnersData.filter(p => p.partner_type === 'مورد' || p.partner_type === 'مشغل' || p.partner_type?.includes('مشغل') || p.partner_type === 'مندوب'),
                accounts_raw: acc.data || [], 
                accounts: (acc.data || []).map(a => ({ id: a.id, code: a.code, name: `${a.code} - ${a.name}` })),
                boqItems: [],
                fleetOperations: [],
                fleetVehicles: []
            };
        },
        staleTime: 1000 * 60 * 5,
        retry: 1
    });
    const supportData = supportDataQuery.data;

    useEffect(() => {
        const fetchPerms = async () => {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
                const { data: profile } = await supabase.from('profiles').select('role, permissions').eq('id', authData.user.id).single();
                if (profile) { setUserRole(profile.role); setUserPermissions(profile.permissions || {}); }
            }
        };
        fetchPerms();
    }, []);

    // 🚀 3. الفلترة الذكية
    const { filteredData: allFiltered, setFilter, customFilters, globalSearch, setGlobalSearch } = useSmartFilter(
        expenses, 
        ['payee_name', 'description', 'notes', 'creditor_account', 'main_category'], 
        'exp_date' 
    );

    const finalFilteredExpenses = useMemo(() => {
        if (paymentFilter === 'الكل') return allFiltered;
        
        return allFiltered.filter((exp: any) => {
            let baseAmount = 0;
            if (exp.lines_data && Array.isArray(exp.lines_data) && exp.lines_data.length > 0) {
                baseAmount = exp.lines_data.reduce((sum: number, line: any) => sum + (Number(line.total_price) || (Number(line.quantity || 1) * Number(line.unit_price || 0))), 0);
            } else {
                baseAmount = Number(exp.total_price) || (Number(exp.quantity || 1) * Number(exp.unit_price || 0));
            }
            const total = Math.round((baseAmount + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)) * 100) / 100;
            const paid = Math.round(Number(exp.paid_amount || 0) * 100) / 100;
            
            if (paymentFilter === 'غير مسدد') return paid <= 0;
            if (paymentFilter === 'مسدد جزئي') return paid > 0 && paid < total - 0.01;
            if (paymentFilter === 'مسدد') return paid >= total - 0.01 && total > 0;
            return true;
        });
    }, [allFiltered, paymentFilter]);

    const totalAmount = useMemo(() => finalFilteredExpenses.reduce((sum, exp) => sum + ((Number(exp.quantity) * Number(exp.unit_price)) + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)), 0), [finalFilteredExpenses]);
    const totalPages = Math.ceil(finalFilteredExpenses.length / rowsPerPage) || 1;
    
    const historicalData = useMemo(() => {
        const payees = new Set<string>(), descriptions = new Set<string>(), notes = new Set<string>();
        expenses.forEach(exp => {
            if (exp.payee_name) payees.add(exp.payee_name);
            if (exp.description) descriptions.add(exp.description);
            if (exp.notes) notes.add(exp.notes);
        });
        return { sites: [], contractors: [], payees: Array.from(payees), descriptions: Array.from(descriptions), notes: Array.from(notes) };
    }, [expenses]);

    const { isProcessing } = useUniversalPosting('expenses', 'expenses', 'post_expenses_bulk');

    // 💾 5. الحفظ المطور والمعتمد كلياً على الـ RPC والتوست الموحد
    const saveMutation = useMutation({
        mutationFn: async (passedRecord: any) => {
            if (!passedRecord || !passedRecord.exp_date) throw new Error("حدث خطأ في استلام البيانات من النافذة، يرجى المحاولة مرة أخرى.");
            
            // 🛡️ فحص صلاحيات التعديل للقيود المعتمدة
            if (editingId) {
                const existingRecord = expenses.find(e => String(e.id) === String(editingId));
                if (existingRecord) {
                    await checkAdminApprovalPrivilege([existingRecord], 'تعديل');
                }
            }

            let generatedDescription = passedRecord.description;
            if ((!generatedDescription || generatedDescription.trim() === '') && passedRecord.lines_data && Array.isArray(passedRecord.lines_data) && passedRecord.lines_data.length > 0) {
                generatedDescription = passedRecord.lines_data.map((line: any) => line.description || line.item_name || line.work_item).filter(Boolean).join(' + ');
            }
            const finalDescription = generatedDescription && generatedDescription.trim() !== '' ? generatedDescription : 'مصروف عام';
            
            const payload = {
                p_id: editingId || null,
                p_exp_date: passedRecord.exp_date, 
                p_main_category: passedRecord.main_category, 
                p_creditor_account: passedRecord.creditor_account, 
                p_description: finalDescription, 
                p_payee_name: passedRecord.payee_name || null, 
                p_payment_method: passedRecord.payment_method || 'آجل', 
                p_payment_account: passedRecord.payment_account || null, 
                p_employee_name: passedRecord.employee_name || null, 
                p_quantity: Number(passedRecord.quantity) || 1, 
                p_unit_price: Number(passedRecord.unit_price) || 0, 
                p_vat_amount: Number(passedRecord.vat_amount) || 0, 
                p_discount_amount: Number(passedRecord.discount_amount) || 0, 
                p_discount_account: passedRecord.discount_account || null, 
                p_notes: passedRecord.notes || null, 
                p_invoice_image: passedRecord.invoice_image || null, 
                p_lines_data: passedRecord.lines_data || [], 
                p_is_auto_distributed: passedRecord.is_auto_distributed || false,
                p_payee_id: passedRecord.payee_id || null
            };

            const { data, error } = await supabase.rpc('save_expense_with_settlement', payload);
            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error);

            // 🚀 حفظ shift_id بشكل منفصل إن وجد
            let updates: any = {};
            if (passedRecord.shift_id !== undefined) updates.shift_id = passedRecord.shift_id || null;

            if (Object.keys(updates).length > 0 && data.expense_number) {
                const { error: updErr } = await supabase.from('expenses').update(updates).eq('expense_number', data.expense_number);
                if (updErr) console.warn("Failed to update extra fields:", updErr);
            }

            // 🔔 بث إشعار المصروف في النظام وعبر الجوال
            if (!editingId) {
                notifyExpenseCreated({
                    expenseNumber: data?.expense_number || passedRecord.expense_number,
                    amount: Number(passedRecord.amount) || 0,
                    category: passedRecord.category_id || passedRecord.category,
                    description: passedRecord.description
                }).catch(() => {});
            }

            return { type: editingId ? 'update' : 'insert' };

        },
        onSuccess: (res) => {
            showToast('تم حفظ القيد بنجاح 💾', 'success');
            setIsEditModalOpen(false);
            setEditingId(null);
            setCurrentExpense(defaultExp);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: (err: any) => {
            console.error("Save Error Details:", err);
            showToast(`فشل الحفظ: ${err.message}`, 'error'); 
        }
    });

    // 🛡️ دوال الترحيل وفك الترحيل والحذف المباشر مع طبقة Fallback
    const directPostExpenses = async (ids: string[]) => {
        try {
            const { error } = await supabase.rpc('post_expenses_bulk', { p_ids: ids });
            if (!error) return;
        } catch {}

        for (const expId of ids) {
            try {
                await supabase.rpc('post_expense_to_journal', { p_expense_id: expId });
            } catch {
                await supabase.from('expenses').update({ is_posted: true }).eq('id', expId);
            }
        }
    };

    const directUnpostExpenses = async (ids: string[]) => {
        try {
            const { error } = await supabase.rpc('unpost_expenses_bulk', { p_ids: ids });
            if (!error) return;
        } catch {}

        const { data: headers } = await supabase.from('journal_headers').select('id').in('reference_id', ids);
        if (headers && headers.length > 0) {
            const headerIds = headers.map(h => h.id);
            await supabase.from('journal_lines').delete().in('header_id', headerIds);
            await supabase.from('journal_headers').delete().in('id', headerIds);
        }
        await supabase.from('expenses').update({ is_posted: false, paid_amount: 0 }).in('id', ids);
    };

    const directDeleteExpenses = async (ids: string[]) => {
        try {
            const { error } = await supabase.rpc('delete_expenses_bulk', { record_ids: ids });
            if (!error) return;
        } catch {}

        await directUnpostExpenses(ids);
        await supabase.from('expenses').delete().in('id', ids);
    };

    // 🗑️ الحذف المتسلسل
    const deleteMutation = useMutation({
        mutationFn: async () => {
            // 🛡️ فحص صلاحيات الحذف للقيود المعتمدة
            const targetExpenses = expenses.filter(e => selectedIds.includes(String(e.id)));
            await checkAdminApprovalPrivilege(targetExpenses, 'حذف');

            await directDeleteExpenses(selectedIds);
            return selectedIds; 
        },
        onSuccess: (deletedIds) => {
            showToast('تم المسح التسلسلي بنجاح 🗑️✅', 'success');
            const stringDeletedIds = deletedIds.map(String);
            queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.filter(exp => !stringDeletedIds.includes(String(exp.id)));
            });
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        },
        onError: (err: any) => showToast(`حدث خطأ أثناء الحذف: ${err.message}`, 'error')
    });

    // 💸 6. سداد السطر الواحد (محول لـ Mutation لتجنب المضاعفة)
    const paymentMutation = useMutation({
        mutationFn: async (paymentData: any) => {
            const targetId = paymentData.id || paymentData.related_expense_id || paymentData.expense_id;
            if (!targetId) throw new Error("لا يوجد ID للفاتورة مبعوث من المودال!");

            // استخراج الحسابات
            let resolvedDebitId = null, resolvedCreditId = null;
            if (supportData?.accounts_raw) {
                const foundDebit = supportData.accounts_raw.find((a: any) => `${a.code} - ${a.name}` === paymentData.payment_account || a.name === paymentData.payment_account);
                if (foundDebit) resolvedDebitId = foundDebit.id;
                
                const targetCreditName = paymentData.creditor_account || paymentData.payment_account; 
                const foundCredit = supportData.accounts_raw.find((a: any) => `${a.code} - ${a.name}` === targetCreditName || a.name === targetCreditName);
                if (foundCredit) resolvedCreditId = foundCredit.id;
            }

            // 🚀 السحب الحقيقي من الداتابيز لتجنب أخطاء الكاش (Doubling Fix)
            const { data: realExpense, error: fetchErr } = await supabase
                .from('expenses')
                .select('paid_amount, description, site_ref')
                .eq('id', targetId)
                .single();
            if (fetchErr) throw fetchErr;

            const oldPaidAmount = Number(realExpense.paid_amount || 0);
            const addedAmount = Number(paymentData.amount || 0);
            const newPaidAmount = oldPaidAmount + addedAmount;

            const { data: { session } } = await supabase.auth.getSession();

            const voucherPayload = {
                related_expense_id: targetId, 
                voucher_number: `PV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`, 
                date: paymentData.payment_date || new Date().toISOString().split('T')[0], 
                amount: addedAmount, 
                payment_method: paymentData.payment_method || 'آجل', 
                debit_account_id: resolvedDebitId, 
                credit_account_id: resolvedCreditId, 
                site_ref: paymentData.site_ref || realExpense.site_ref, 
                description: paymentData.payment_notes || `سداد مصروف لـ ${realExpense.description || 'عمليات تجارية'}`, 
                reference_no: paymentData.reference_number || paymentData.reference_no || '', 
                is_posted: false, 
                created_by: session?.user?.id
            };
            
            // إنشاء سند الصرف
            const { error: voucherErr } = await supabase.from('payment_vouchers').insert([voucherPayload]);
            if (voucherErr) throw voucherErr;

            // تحديث قيمة السداد في المصروف نفسه
            const { error: expErr } = await supabase.from('expenses').update({ paid_amount: newPaidAmount }).eq('id', targetId);
            if (expErr) throw expErr;

            return { targetId, newPaidAmount };
        },
        onSuccess: ({ targetId, newPaidAmount }) => {
            // تحديث الكاش بهدوء بعد اكتمال العملية
            queryClient.setQueryData(['expenses'], (oldData: any[]) => {
                if (!oldData) return [];
                return oldData.map(exp => 
                    String(exp.id) === String(targetId) ? { ...exp, paid_amount: newPaidAmount } : exp
                );
            });
            showToast('تم الصرف بنجاح ✅', 'success');
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        },
        onError: (err: any) => {
            showToast(`خطأ أثناء الصرف: ${err.message}`, 'error');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
    });

    // 🔧 التصحيح المجمع
    const handleBulkFixSave = async () => {
        if (selectedIds.length === 0 || (!bulkFixAccounts.creditor_account && !bulkFixAccounts.payment_account)) return;
        const updatePayload: any = {};
        if (bulkFixAccounts.creditor_account) updatePayload.creditor_account = bulkFixAccounts.creditor_account;
        if (bulkFixAccounts.payment_account) updatePayload.payment_account = bulkFixAccounts.payment_account;
        
        await queryClient.cancelQueries({ queryKey: ['expenses'] });
        const previousData = queryClient.getQueryData(['expenses']);
        
        updateRowsInCache(selectedIds, updatePayload);

        try {
            const CHUNK_SIZE = 20; 
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from('expenses').update(updatePayload).in('id', chunk).eq('is_posted', false); 
                if (error) throw new Error(error.message);
            }
            setIsBulkFixModalOpen(false); 
            setBulkFixAccounts({ creditor_account: '', payment_account: '' });
            setSelectedIds([]); 
            showToast(`✅ تم التصحيح المجمع بنجاح!`, 'success');
        } catch (error: any) {
            queryClient.setQueryData(['expenses'], previousData); 
            showToast("خطأ أثناء التحديث: " + error.message, 'error');
        }
    };
    
    // الصرف الجماعي
    const bulkDisburseMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) throw new Error("يجب تسجيل الدخول أولاً");

            const CHUNK_SIZE = 20; 
            let totalProcessedCount = 0;
            let totalDisbursedSum = 0;

            setDisburseProgress({ current: 0, total: ids.length, isActive: true });

            for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
                const chunk = ids.slice(i, i + CHUNK_SIZE);
                let { data, error } = await supabase.rpc('bulk_disburse_v2', { p_ids: chunk, p_user_id: session.user.id });

                if (error) {
                    // Fallback مباشر: إنشاء سندات صرف وتحديث المصروفات مباشرة
                    const { data: expList } = await supabase
                        .from('expenses')
                        .select('*')
                        .in('id', chunk);

                    if (expList && expList.length > 0) {
                        for (const exp of expList) {
                            const amt = (Number(exp.total_price || (Number(exp.quantity || 1) * Number(exp.unit_price || 0))) + Number(exp.vat_amount || 0)) - Number(exp.paid_amount || 0);
                            if (amt <= 0) continue;

                            const pvNum = 'PV-EXP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                            const { data: newPv } = await supabase.from('payment_vouchers').insert({
                                voucher_number: pvNum,
                                date: exp.exp_date || new Date().toISOString().split('T')[0],
                                amount: amt,
                                partner_id: exp.payee_id || null,
                                payment_method: exp.payment_method || 'نقدي',
                                description: `صرف مصروف: ${exp.description || ''}`,
                                status: 'معتمد',
                                is_posted: true,
                                created_by: session.user.id,
                                shift_id: exp.shift_id || null
                            }).select('id').single();

                            if (newPv) {
                                await supabase.from('expenses').update({
                                    paid_amount: (Number(exp.paid_amount) || 0) + amt
                                }).eq('id', exp.id);

                                totalProcessedCount += 1;
                                totalDisbursedSum += amt;
                            }
                        }
                    }
                } else if (data && data[0]) {
                    totalProcessedCount += data[0].processed_count;
                    totalDisbursedSum += Number(data[0].total_amount);
                }

                const currentProgress = Math.min(i + CHUNK_SIZE, ids.length);
                setDisburseProgress(prev => ({ ...prev, current: currentProgress }));
            }

            return { processed_count: totalProcessedCount, total_amount: totalDisbursedSum };
        },
        onSuccess: (res) => {
            if (res.processed_count > 0) {
                showToast(`تم إنشاء ${res.processed_count} سند صرف بإجمالي ${Number(res.total_amount).toLocaleString()} ريال 💰✅`, 'success');
            } else {
                showToast("لم يتم إنشاء أي سندات، قد تكون السجلات مسددة بالفعل!", 'warning');
            }
            setSelectedIds([]); 
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
        },
        onError: (err: any) => {
            showToast(`فشلت العملية: ${err.message}`, 'error');
        },
        onSettled: () => {
            setTimeout(() => setDisburseProgress({ current: 0, total: 0, isActive: false }), 2000);
        }
    });

    const canAdd = (userRole === 'admin' || userRole === 'super_admin') || userPermissions?.expenses?.create;
    const canEdit = (userRole === 'admin' || userRole === 'super_admin') || userPermissions?.expenses?.edit;
    const canDelete = (userRole === 'admin' || userRole === 'super_admin') || userPermissions?.expenses?.delete;
    const canPost = (userRole === 'admin' || userRole === 'super_admin') || userPermissions?.expenses?.post;
    const canView = (userRole === 'admin' || userRole === 'super_admin') || userPermissions?.expenses?.view;
    const canExport = (userRole === 'admin' || userRole === 'super_admin') || userPermissions?.expenses?.print;

    const mergedHistoricalData = useMemo(() => {
        return {
            ...historicalData,
            ...supportData,
            payees: supportData?.payees || [],
            accounts: supportData?.accounts || [],
            fleetOperations: supportData?.fleetOperations || [],
            fleetVehicles: supportData?.fleetVehicles || [],
        };
    }, [historicalData, supportData]);

    return {
        // 🚀 الـ إخراج المباشر وحل التعليقة النهائي
        isSaving: saveMutation.isPending, 
        isSavingPayment: paymentMutation.isPending, // 👈 تم إضافة حالة التحميل لزرار السداد لمنع التدبيل
        isLoading: expensesQuery.isLoading || supportDataQuery.isLoading || isProcessing || deleteMutation.isPending,
        refreshData: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        
        filteredExpenses: finalFilteredExpenses, totalAmount, totalPages, totalResults: finalFilteredExpenses.length,
        paymentFilter, setPaymentFilter,
        disburseProgress,
        
        selectedIds, setSelectedIds, currentPage, setCurrentPage, rowsPerPage, setRowsPerPage, isEditModalOpen, setIsEditModalOpen, currentExpense, setCurrentExpense, editingId, projects: supportData?.projects || [], contractors: supportData?.contractors || [], payees: supportData?.payees || [], accounts: supportData?.accounts || [], boqItems: supportData?.boqItems || [], accounts_raw: supportData?.accounts_raw || [], isBulkFixModalOpen, setIsBulkFixModalOpen, bulkFixAccounts, setBulkFixAccounts, handleBulkFixSave, canAdd, canEdit, canDelete, canPost, canView, canExport, userRole, historicalData: mergedHistoricalData,
        
        setFilterStatus: (val: string) => setFilter('is_posted', val === 'الكل' ? null : val === 'معتمد'),
        setFilterAccount: (val: string) => setFilter('creditor_account', val === 'الكل' ? null : val),
        filterAccount: customFilters['creditor_account'] || 'الكل',
        filterStatus: customFilters['is_posted'] === undefined ? 'الكل' : (customFilters['is_posted'] ? 'معتمد' : 'معلق'),
        
        handleSaveExpense: (data: any) => {
            if (!data) return showToast("لم يتم استلام البيانات!", "error");
            if (data.is_posted) return showToast("⚠️ لا يمكن تعديل سجل مرحل. يرجى فك الترحيل أولاً.", "error");
            saveMutation.mutate(data);
        },
        handleSavePayment: (data: any) => paymentMutation.mutate(data), // 👈 استخدام الـ Mutation
        handleAddNew: () => { setCurrentExpense(defaultExp); setEditingId(null); setIsEditModalOpen(true); }, 
        handleEditSelected: () => {
            if (selectedIds.length !== 1) return showGlobalToast("اختر سجلاً واحداً للتعديل", 'warning');
            const exp = expenses.find(e => e.id === selectedIds[0]);
            setCurrentExpense({...exp}); setEditingId(exp.id); setIsEditModalOpen(true);
        }, 
        exportToExcel: () => {},
        handleDeleteSelected: () => {
            const posted = expenses.filter((e:any) => selectedIds.includes(e.id) && e.is_posted);
            if (posted.length > 0) return showToast("⚠️ لا يمكن حذف سجلات مرحلة. يرجى فك الترحيل أولاً.", "error");
            deleteMutation.mutate();
        },
        
        handlePostSelected: async () => {
            if (selectedIds.length === 0) return;
            const idsToProcess = [...selectedIds];
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);
            updateRowsInCache(idsToProcess, { is_posted: true });
            setSelectedIds([]);

            try {
                await directPostExpenses(idsToProcess);
                showToast('تم الترحيل بنجاح ✅', 'success');
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                import('@/lib/audit').then(({ logCustomAuditEvent }) => logCustomAuditEvent('expenses', 'FAILED_POST', idsToProcess[0], null, { error: error.message }));
                showToast(`خطأ: ${error.message}`, 'error');
            }
        },
        
        handleUnpostSelected: async () => {
            if (selectedIds.length === 0) return;
            const idsToProcess = [...selectedIds];
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);
            updateRowsInCache(idsToProcess, { is_posted: false, paid_amount: 0 });
            setSelectedIds([]);

            try {
                await directUnpostExpenses(idsToProcess);
                showToast('تم فك الترحيل بنجاح ↩️', 'success');
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
                queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                showToast(`خطأ: ${error.message}`, 'error');
            }
        },
        
        handlePostAllUnposted: async () => {
            const unposted = allFiltered.filter((e:any) => !e.is_posted).map((e:any) => e.id);
            if (unposted.length === 0) return showToast("لا يوجد سجلات معلقة!", 'info');
            const idsToProcess = [...unposted];
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);
            updateRowsInCache(idsToProcess, { is_posted: true });
            
            try {
                await directPostExpenses(idsToProcess);
                showToast('تم الترحيل بالكامل ✅', 'success');
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
                setSelectedIds([]);
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                showToast(`خطأ الترحيل: ${error.message}`, 'error');
            }
        },

        handleBulkDisburse: () => {
            if (selectedIds.length === 0) return;
            if (confirm(`هل أنت متأكد من إنشاء سندات صرف لـ ${selectedIds.length} سجل؟`)) {
                bulkDisburseMutation.mutate(selectedIds);
            }
        },
        isDisbursing: bulkDisburseMutation.isPending,

        rowActionLoadingId,
        handlePostSingle: async (id: string) => {
            if (!id) return;
            setRowActionLoadingId(id);
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);
            updateRowsInCache([id], { is_posted: true });

            try {
                await directPostExpenses([id]);
                showToast('تم اعتماد وترحيل المصروف بنجاح 🚀', 'success');
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                import('@/lib/audit').then(({ logCustomAuditEvent }) => logCustomAuditEvent('expenses', 'FAILED_POST', id, null, { error: error.message }));
                showToast(`خطأ في الترحيل: ${error.message}`, 'error');
            } finally {
                setRowActionLoadingId(null);
            }
        },

        handleUnpostSingle: async (id: string) => {
            if (!id) return;
            setRowActionLoadingId(id);
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousData = queryClient.getQueryData(['expenses']);
            updateRowsInCache([id], { is_posted: false, paid_amount: 0 });

            try {
                await directUnpostExpenses([id]);
                showToast('تم فك ترحيل المصروف بنجاح ↩️', 'success');
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
                queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            } catch (error: any) {
                queryClient.setQueryData(['expenses'], previousData);
                showToast(`خطأ في فك الترحيل: ${error.message}`, 'error');
            } finally {
                setRowActionLoadingId(null);
            }
        }
    };
}
