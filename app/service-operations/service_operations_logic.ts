import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import { ACC } from '@/lib/account-ids';
import { useRealtimeListener } from '@/lib/useRealtimeSync';

export interface ServiceOperation {
    id: string;
    operation_date: string;
    operation_type: string;
    description: string;
    client_id: string | null;
    employee_id: string | null;
    total_amount: number;
    commission_percentage: number;
    commission_amount: number;
    net_profit: number;
    debit_account_id: string | null;
    revenue_account_id: string | null;
    commission_expense_account_id: string | null;
    journal_id: string | null;
    status: string;
    created_at: string;
    created_by: string | null;
    client?: { id: string; name: string; code: string; phone: string } | null;
    employee?: { id: string; name: string; code: string; phone: string; account_id: string | null } | null;
    debit_account?: { id: string; name: string; code: string } | null;
    revenue_account?: { id: string; name: string; code: string } | null;
    journal?: { id: string; entry_date: string; status: string; description: string } | null;
}

export const SERVICE_TYPES = [
    { label: 'إدارة وتشغيل مواقع/مشاريع للغير', value: 'إدارة وتشغيل', icon: '🏢' },
    { label: 'خدمات نقل وتوصيل وشحن', value: 'خدمة توصيل', icon: '🚚' },
    { label: 'أعمال استشارية وإدارية', value: 'خدمة إدارية واستشارات', icon: '📑' },
    { label: 'صيانة ودعم فني وتشغيلي', value: 'صيانة ودعم فني', icon: '🛠️' },
    { label: 'إيرادات وساطة وعمولات تجارية', value: 'وساطة وعمولات', icon: '🤝' },
    { label: 'أعمال وخدمات أخرى متنوعة', value: 'خدمات أخرى', icon: '✨' }
];

export function useServiceOperationsLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 🎛️ حالة الفلترة والبحث
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterType, setFilterType] = useState('الكل');
    const [filterClient, setFilterClient] = useState('الكل');
    const [filterEmployee, setFilterEmployee] = useState('الكل');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    // 🚀 حالة المودالات
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<ServiceOperation | null>(null);

    // 1. جلب العمليات الخدمية
    const { 
        data: operations = [], 
        isLoading, 
        refetch 
    } = useQuery({
        queryKey: ['service_operations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('service_operations')
                .select(`
                    *,
                    client:partners!service_operations_client_id_fkey(id, name, code, phone),
                    employee:partners!service_operations_employee_id_fkey(id, name, code, phone, account_id),
                    debit_account:accounts!service_operations_debit_account_id_fkey(id, name, code),
                    revenue_account:accounts!service_operations_revenue_account_id_fkey(id, name, code),
                    journal:journal_headers!service_operations_journal_id_fkey(id, entry_date, status, description)
                `)
                .order('operation_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as ServiceOperation[];
        },
        staleTime: 0
    });

    // 🔄 الاستماع المباشر للتحديثات اللحظية
    useRealtimeListener(['service_operations', 'journal_headers'], () => {
        refetch();
    });

    // 2. جلب الشركاء (عملاء وموظفين)
    const { data: partners = [] } = useQuery({
        queryKey: ['service_partners_all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('partners')
                .select('id, name, code, partner_type, phone, account_id')
                .eq('is_active', true)
                .order('name');
            if (error) return [];
            return data || [];
        },
        staleTime: 1000 * 60 * 10
    });

    const clientsList = useMemo(() => {
        return partners.filter(p => p.partner_type === 'عميل' || p.partner_type === 'customer');
    }, [partners]);

    const employeesList = useMemo(() => {
        return partners.filter(p => 
            p.partner_type === 'موظف' || 
            p.partner_type === 'employee' || 
            p.partner_type === 'delegate' || 
            p.partner_type === 'مندوب' ||
            p.partner_type === 'شريك'
        );
    }, [partners]);

    // 3. جلب الحسابات المصنفة (الخزائن، البنوك، الإيرادات، المصروفات)
    const { data: allAccounts = [] } = useQuery({
        queryKey: ['service_accounts_all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('accounts')
                .select('id, name, code, account_type')
                .order('code');
            if (error) return [];
            return data || [];
        },
        staleTime: 1000 * 60 * 30
    });

    // 🧮 التصفية والبحث
    const filteredOperations = useMemo(() => {
        return operations.filter(op => {
            // البحث النصي العام
            if (globalSearch.trim()) {
                const q = globalSearch.toLowerCase().trim();
                const matchesDesc = op.description?.toLowerCase().includes(q);
                const matchesType = op.operation_type?.toLowerCase().includes(q);
                const matchesClient = op.client?.name?.toLowerCase().includes(q);
                const matchesEmployee = op.employee?.name?.toLowerCase().includes(q);
                if (!matchesDesc && !matchesType && !matchesClient && !matchesEmployee) return false;
            }

            // الفلترة بالتاريخ
            if (dateFrom && op.operation_date < dateFrom) return false;
            if (dateTo && op.operation_date > dateTo) return false;

            // الفلترة بنوع الخدمة
            if (filterType !== 'الكل' && op.operation_type !== filterType) return false;

            // الفلترة بالعميل
            if (filterClient !== 'الكل' && op.client_id !== filterClient) return false;

            // الفلترة بالموظف
            if (filterEmployee !== 'الكل' && op.employee_id !== filterEmployee) return false;

            return true;
        });
    }, [operations, globalSearch, dateFrom, dateTo, filterType, filterClient, filterEmployee]);

    // 📊 الإحصائيات والمؤشرات المالية (KPIs)
    const stats = useMemo(() => {
        let totalRev = 0;
        let totalComm = 0;
        let totalNet = 0;
        let withCommissionCount = 0;

        filteredOperations.forEach(op => {
            totalRev += Number(op.total_amount || 0);
            totalComm += Number(op.commission_amount || 0);
            totalNet += Number(op.net_profit || 0);
            if (Number(op.commission_amount || 0) > 0) withCommissionCount++;
        });

        return {
            totalRevenue: totalRev,
            totalCommissions: totalComm,
            totalNetProfit: totalNet,
            count: filteredOperations.length,
            withCommissionCount,
            profitMargin: totalRev > 0 ? ((totalNet / totalRev) * 100).toFixed(1) : '0'
        };
    }, [filteredOperations]);

    // 📄 التقسيم لصفحات (Pagination)
    const paginatedOperations = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredOperations.slice(start, start + rowsPerPage);
    }, [filteredOperations, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(filteredOperations.length / rowsPerPage) || 1;

    // 🚀 حفظ عملية خدمية جديدة مع القيد المحاسبي المركب
    const saveOperationMutation = useMutation({
        mutationFn: async (payload: {
            operation_date: string;
            operation_type: string;
            description: string;
            client_id: string | null;
            employee_id: string | null;
            total_amount: number;
            commission_percentage: number;
            payment_channel: 'cash' | 'bank' | 'credit';
            custom_debit_account_id?: string | null;
            revenue_account_id?: string | null;
        }) => {
            if (!payload.description.trim()) {
                throw new Error("يرجى إدخال تفاصيل وبيان العملية الخدمية.");
            }
            if (!payload.total_amount || payload.total_amount <= 0) {
                throw new Error("يرجى إدخال مبلغ صحيح للعملية.");
            }

            // تحديد حساب المدين (الخزينة، البنك، أو حساب العميل)
            let debitAccId = payload.custom_debit_account_id;
            if (!debitAccId) {
                if (payload.payment_channel === 'cash') {
                    debitAccId = ACC.CASH_BOX;
                } else if (payload.payment_channel === 'bank') {
                    debitAccId = ACC.BANKS;
                } else if (payload.payment_channel === 'credit') {
                    debitAccId = ACC.CUSTOMERS_AR;
                } else {
                    debitAccId = ACC.CASH_BOX;
                }
            }

            // تحديد حساب الإيراد
            const revAccId = payload.revenue_account_id || ACC.OTHER_REVENUE;

            // تحديد حساب مصروف العمولات
            const commExpenseAccId = ACC.ADMIN_SALARIES;

            // التأكد من ارتباط الموظف بحساب في شجرة الحسابات إذا كانت هناك عمولة
            if (payload.employee_id && payload.commission_percentage > 0) {
                const emp = partners.find(p => p.id === payload.employee_id);
                if (emp && !emp.account_id) {
                    // ربط الموظف تلقائياً بحساب مستحقات الرواتب والعمولات
                    await supabase
                        .from('partners')
                        .update({ account_id: ACC.ACCRUED_SALARIES })
                        .eq('id', payload.employee_id);
                }
            }

            // الحصول على معرف المستخدم الحالي
            const { data: { user } } = await supabase.auth.getUser();

            const commAmount = payload.commission_percentage > 0
                ? Math.round(((payload.total_amount * payload.commission_percentage) / 100) * 100) / 100
                : 0;
            const netProfit = payload.total_amount - commAmount;

            let operationId: string | null = null;

            // استدعاء دالة الـ RPC
            const { data: rpcOpId, error: rpcErr } = await supabase.rpc('create_service_operation_with_journal', {
                p_operation_date: payload.operation_date,
                p_operation_type: payload.operation_type,
                p_description: payload.description,
                p_client_id: payload.client_id || null,
                p_employee_id: payload.employee_id || null,
                p_total_amount: payload.total_amount,
                p_commission_percentage: payload.commission_percentage || 0,
                p_debit_account_id: debitAccId,
                p_revenue_account_id: revAccId,
                p_commission_expense_account_id: commExpenseAccId,
                p_created_by: user?.id || null
            });

            if (!rpcErr && rpcOpId) {
                operationId = rpcOpId;
            } else {
                // Fallback: Direct DB insertion for service operation and journal entries
                const { data: newOp, error: opErr } = await supabase
                    .from('service_operations')
                    .insert({
                        operation_date: payload.operation_date,
                        operation_type: payload.operation_type,
                        description: payload.description,
                        client_id: payload.client_id || null,
                        employee_id: payload.employee_id || null,
                        total_amount: payload.total_amount,
                        commission_percentage: payload.commission_percentage || 0,
                        commission_amount: commAmount,
                        net_profit: netProfit,
                        debit_account_id: debitAccId,
                        revenue_account_id: revAccId,
                        commission_expense_account_id: commExpenseAccId,
                        created_by: user?.id || null,
                        status: 'posted'
                    })
                    .select('id')
                    .single();

                if (opErr) throw new Error(opErr.message);
                operationId = newOp.id;

                // إنشاء قيد اليومية
                const { data: jh, error: jhErr } = await supabase
                    .from('journal_headers')
                    .insert({
                        entry_date: payload.operation_date,
                        description: `عملية خدمية: ${payload.description || payload.operation_type}`,
                        reference_id: operationId,
                        v_type: 'service_operation',
                        status: 'posted',
                        created_by: user?.id || null
                    })
                    .select('id')
                    .single();

                if (!jhErr && jh) {
                    const lines: any[] = [];
                    // طرف المدين (نقدية / بنك / عميل)
                    if (payload.total_amount > 0 && debitAccId) {
                        lines.push({
                            header_id: jh.id,
                            account_id: debitAccId,
                            partner_id: payload.client_id || null,
                            debit: payload.total_amount,
                            credit: 0,
                            notes: `استحقاق عملية خدمية ${payload.operation_type}`
                        });
                    }
                    // طرف الدائن (الإيراد)
                    if (payload.total_amount > 0 && revAccId) {
                        lines.push({
                            header_id: jh.id,
                            account_id: revAccId,
                            debit: 0,
                            credit: payload.total_amount,
                            notes: `إيراد عملية خدمية ${payload.operation_type}`
                        });
                    }
                    // قيود العمولة (إن وجدت)
                    if (commAmount > 0 && commExpenseAccId) {
                        lines.push({
                            header_id: jh.id,
                            account_id: commExpenseAccId,
                            debit: commAmount,
                            credit: 0,
                            notes: `مصروف عمولة فني: ${payload.description || ''}`
                        });

                        let empAccId: string | null = null;
                        if (payload.employee_id) {
                            const emp = partners.find(p => p.id === payload.employee_id);
                            empAccId = emp?.account_id || null;
                        }
                        if (!empAccId) {
                            const found = allAccounts.find(a => a.code === '2104' || a.name?.includes('رواتب') || a.name?.includes('عمولات'));
                            empAccId = found?.id || null;
                        }

                        if (empAccId) {
                            lines.push({
                                header_id: jh.id,
                                account_id: empAccId,
                                partner_id: payload.employee_id || null,
                                debit: 0,
                                credit: commAmount,
                                notes: 'استحقاق عمولة خدمة'
                            });
                        }
                    }

                    if (lines.length > 0) {
                        await supabase.from('journal_lines').insert(lines);
                    }

                    await supabase
                        .from('service_operations')
                        .update({ journal_id: jh.id })
                        .eq('id', operationId);
                }
            }

            return operationId;
        },
        onSuccess: () => {
            showToast('تم تسجيل العملية الخدمية وترحيل القيد المحاسبي بنجاح! 🚀', 'success');
            queryClient.invalidateQueries({ queryKey: ['service_operations'] });
            queryClient.invalidateQueries({ queryKey: ['journal_headers'] });
            queryClient.invalidateQueries({ queryKey: ['partner_statement_raw'] });
            setIsModalOpen(false);
        },
        onError: (err: any) => {
            showToast(`فشل في حفظ العملية: ${err.message}`, 'error');
        }
    });

    // 🗑️ حذف أو إلغاء عملية
    const deleteOperationMutation = useMutation({
        mutationFn: async (operation: ServiceOperation) => {
            if (operation.journal_id) {
                await supabase.from('journal_lines').delete().eq('header_id', operation.journal_id);
                await supabase.from('journal_headers').delete().eq('id', operation.journal_id);
            }
            const { error } = await supabase.from('service_operations').delete().eq('id', operation.id);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast('تم حذف العملية الخدمية وقيدها بنجاح 🗑️', 'info');
            queryClient.invalidateQueries({ queryKey: ['service_operations'] });
            queryClient.invalidateQueries({ queryKey: ['journal_headers'] });
        },
        onError: (err: any) => {
            showToast(`فشل في الحذف: ${err.message}`, 'error');
        }
    });

    return {
        state: {
            operations: filteredOperations,
            paginatedOperations,
            rawOperations: operations,
            isLoading,
            stats,
            currentPage,
            totalPages,
            rowsPerPage,
            globalSearch,
            dateFrom,
            dateTo,
            filterType,
            filterClient,
            filterEmployee,
            isModalOpen,
            isPrintModalOpen,
            selectedRecord,
            clientsList,
            employeesList,
            allAccounts
        },
        actions: {
            setGlobalSearch,
            setDateFrom,
            setDateTo,
            setFilterType,
            setFilterClient,
            setFilterEmployee,
            setCurrentPage,
            setRowsPerPage,
            setIsModalOpen,
            setIsPrintModalOpen,
            setSelectedRecord,
            saveOperation: saveOperationMutation.mutateAsync,
            isSaving: saveOperationMutation.isPending,
            deleteOperation: deleteOperationMutation.mutateAsync,
            isDeleting: deleteOperationMutation.isPending,
            refetch
        }
    };
}
