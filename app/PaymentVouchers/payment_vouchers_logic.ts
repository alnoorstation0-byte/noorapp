import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { useUniversalPosting } from '@/lib/accounting_engine'; 
import { useRealtimeInvalidate } from '@/lib/useRealtimeSync';
import { useAuth } from '@/components/authGuard';
import { notifyVoucherCreated } from '@/lib/notificationService';


export function usePaymentVouchersLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // 🔄 تحديث فوري ذكي
    useRealtimeInvalidate(['payment_vouchers', 'expenses'], ['payment_vouchers']);

    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch);
    const [filterStatus, setFilterStatus] = useState('الكل'); 
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentVoucher, setCurrentVoucher] = useState<any>({});
    const [isBulkFixModalOpen, setIsBulkFixModalOpen] = useState(false);
    const [bulkFixAccounts, setBulkFixAccounts] = useState({ credit_account_id: '', debit_account_id: '' });

    const currentPartnerId = currentVoucher.partner_id || currentVoucher.payee_id;
    const { data: partnerBalance, isLoading: isBalanceLoading } = useQuery({
        queryKey: ['partner_balance', currentPartnerId],
        queryFn: async () => {
            if (!currentPartnerId) return 0;
            const { data, error } = await supabase.rpc('get_partner_balance', { p_partner_id: currentPartnerId });
            if (error) return 0;
            return data || 0;
        },
        enabled: !!currentPartnerId 
    });

    const { data: serverTotals } = useQuery({
        queryKey: ['vouchers_server_totals'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_dashboard_totals');
            if (error) return null;
            return data?.[0] || null;
        }
    });

    const { data: fleetOperations = [] } = useQuery({
        queryKey: ['fleet_operations_open'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fleet_operations')
                .select('id, operation_number, operation_date, status, vehicle_id, description, vehicle:fleet_vehicles(plate_number), driver:partners(name)')
                .neq('status', 'مغلق')
                .neq('status', 'closed')
                .order('operation_date', { ascending: false });
            if (error) throw error;
            return data?.map((op:any) => ({
                id: op.id,
                operation_number: op.operation_number,
                status: op.status,
                vehicle_id: op.vehicle_id,
                name: `رقم الرحلة: ${op.operation_number} | ${op.operation_date} | 🚚 ${op.vehicle?.plate_number || 'بدون سيارة'} | 👤 ${op.driver?.name || 'بدون مندوب'}`
            })) || [];
        }
    });

    const { profile, can } = useAuth();

    const { data: vouchers = [], isLoading: isFetching } = useQuery({
        queryKey: ['payment_vouchers'],
        staleTime: 0,
        queryFn: async () => {
            let q = supabase
                .from('payment_vouchers')
                .select(`
                    *,
                    payee:partners!partner_id(name),
                    credit_account:accounts!credit_account_id(name),
                    debit_account:accounts!debit_account_id(name)
                `)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(2000);

            if (profile) {
                const role = String(profile.role || '').toLowerCase();
                const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
                if (!isGlobalAdmin && profile.linked_partner_id) {
                    q = q.eq('partner_id', profile.linked_partner_id);
                }
            }

            const { data, error } = await q;

            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: !!profile
    });

    const displayedVouchers = useMemo(() => {
        let result = vouchers;

        if (dateRange.start) result = result.filter(v => new Date(v.date) >= new Date(dateRange.start));
        if (dateRange.end) result = result.filter(v => new Date(v.date) <= new Date(dateRange.end));

        if (filterStatus !== 'الكل') {
            const isPostedTarget = filterStatus === 'معتمد';
            result = result.filter(v => v.is_posted === isPostedTarget);
        }

        if (deferredSearch) {
            const lower = deferredSearch.toLowerCase().trim();
            result = result.filter(v => 
                (v.voucher_number?.toString().toLowerCase().includes(lower)) ||
                (v.description?.toString().toLowerCase().includes(lower)) ||
                (v.payee?.name?.toString().toLowerCase().includes(lower)) ||
                (v.credit_account?.name?.toString().toLowerCase().includes(lower)) ||
                (v.debit_account?.name?.toString().toLowerCase().includes(lower)) ||
                (v.amount?.toString().includes(lower))
            );
        }

        return result;
    }, [vouchers, deferredSearch, filterStatus, dateRange]);

    const totals = useMemo(() => {
        const totalAmount = displayedVouchers.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
        return { 
            totalAmount: parseFloat(totalAmount.toFixed(2)), 
            count: displayedVouchers.length,
            serverTotalPosted: serverTotals?.total_posted_vouchers || 0,
            serverTotalPending: serverTotals?.total_pending_vouchers || 0
        };
    }, [displayedVouchers, serverTotals]);

    const { postRecords, unpostRecords, isProcessing } = useUniversalPosting(
        'payment_vouchers',
        'payment_vouchers',
        'post_payment_vouchers_bulk'
    );

    const saveMutation = useMutation({
        mutationFn: async (voucherData: any) => {
            const payload = { ...voucherData };
            
            if (payload.payee_id && !payload.partner_id) {
                payload.partner_id = payload.payee_id;
            }
            delete payload.payee_id;
            delete payload.payee_name;
            delete payload.debit_account_name;
            delete payload.credit_account_name;
            delete payload.partner;
            delete payload.credit_account;
            delete payload.debit_account;
            delete payload.fleet_operations;
            delete payload.payee;

            if (payload.id) {
                const { data: existing } = await supabase.from('payment_vouchers').select('is_posted, status').eq('id', payload.id).single();
                if (existing && (existing.is_posted || existing.status === 'مرحل' || existing.status === 'معتمد')) {
                    throw new Error("لا يمكن تعديل سند معتمد. قم بفك الاعتماد أولاً.");
                }
            }

            if (payload.id) {
                const { error } = await supabase.from('payment_vouchers').update(payload).eq('id', payload.id);
                if (error) throw error;
            } else {
                payload.voucher_number = `PV-${Date.now().toString().slice(-6)}`;
                payload.is_posted = false;
                payload.status = 'مسودة';

                const { error } = await supabase.from('payment_vouchers').insert([payload]);
                if (error) throw new Error(error.message);

                // 🔔 بث إشعار سند الصرف في النظام وعبر الجوال
                notifyVoucherCreated({
                    voucherType: 'payment',
                    voucherNumber: payload.voucher_number,
                    amount: Number(payload.amount) || 0,
                    partnerName: payload.partner_name
                }).catch(() => {});
            }

        },
        onSuccess: () => {
            showToast('تم حفظ السند بنجاح 💾', 'success');
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['vouchers_server_totals'] }); 
        },
        onError: (error: any) => showToast(error.message, 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const postedVouchers = vouchers.filter(v => selectedIds.includes(v.id) && v.is_posted);
            if (postedVouchers.length > 0) throw new Error('لا يمكن حذف سندات معتمدة. قم بفك الاعتماد أولاً.');

            const CHUNK_SIZE = 20;
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from('payment_vouchers').delete().in('id', chunk);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            showToast('تم الحذف بنجاح 🗑️', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['vouchers_server_totals'] });
        },
        onError: (err: any) => showToast(err.message, 'error')
    });

    const handleBulkFixSave = async () => {
        if (selectedIds.length === 0 || (!bulkFixAccounts.credit_account_id && !bulkFixAccounts.debit_account_id)) return;
        
        const updatePayload: any = {};
        if (bulkFixAccounts.credit_account_id) updatePayload.credit_account_id = bulkFixAccounts.credit_account_id;
        if (bulkFixAccounts.debit_account_id) updatePayload.debit_account_id = bulkFixAccounts.debit_account_id;

        try {
            const CHUNK_SIZE = 20;
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from('payment_vouchers').update(updatePayload).in('id', chunk).eq('is_posted', false); 
                if (error) throw new Error(error.message);
            }
            setIsBulkFixModalOpen(false); 
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            showToast('تم تصحيح الحسابات المحددة بنجاح', 'success');
        } catch(err: any) {
            showToast(err.message, 'error');
        }
    };

    return {
        data: displayedVouchers,
        isLoading: isFetching || isProcessing || saveMutation.isPending, 
        totals,
        state: {
            globalSearch, filterStatus, dateRange, selectedIds, currentPage, rowsPerPage,
            isEditModalOpen, currentVoucher, partnerBalance, isBalanceLoading,
            isBulkFixModalOpen, bulkFixAccounts, fleetOperations
        },
        actions: {
            setGlobalSearch, setFilterStatus, setSelectedIds, setCurrentPage, setRowsPerPage,
            setIsEditModalOpen, setCurrentVoucher, setIsBulkFixModalOpen, setBulkFixAccounts,
            handleAddNew: () => {
                setCurrentVoucher({ 
                    date: new Date().toISOString().split('T')[0], 
                    payment_method: 'نقدي', 
                    amount: '', 
                    debit_account_id: null, debit_account_name: '', credit_account_id: null, credit_account_name: '',
                    partner_id: null, payee_id: '', payee_name: '', is_posted: false, status: 'مسودة', fleet_operation_id: null
                });
                setIsEditModalOpen(true);
            },
            handleEditSelected: () => {
                const selected = vouchers.find(v => v.id === selectedIds[0]);
                if (selected) {
                    const voucherForEdit = {
                        ...selected,
                        partner_id: selected.partner_id || null,
                        payee_id: selected.partner_id || '',
                        payee_name: selected.payee?.name || '',
                        debit_account_name: selected.debit_account?.name || '',
                        credit_account_name: selected.credit_account?.name || ''
                    };
                    setCurrentVoucher(voucherForEdit);
                    setIsEditModalOpen(true);
                }
            },
            handleDeleteSelected: () => {
                if (confirm('تأكيد الحذف النهائي للسندات المحددة؟')) deleteMutation.mutate();
            },
            handleSaveVoucher: async (dataFromOutside?: any) => {
                const dataToSave = (dataFromOutside && Object.keys(dataFromOutside).length > 0) ? dataFromOutside : currentVoucher;
                return await saveMutation.mutateAsync(dataToSave);
            },
            handlePostSelected: async () => {
                await postRecords(selectedIds);
                queryClient.invalidateQueries({ queryKey: ['vouchers_server_totals'] });
                queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            },
            handleUnpostSelected: async () => {
                await unpostRecords(selectedIds);
                queryClient.invalidateQueries({ queryKey: ['vouchers_server_totals'] });
                queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
            },
            handlePostSingle: async (id: string) => {
                if (!id) return;
                await postRecords([id]);
                queryClient.invalidateQueries({ queryKey: ['vouchers_server_totals'] });
                queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            },
            handleUnpostSingle: async (id: string) => {
                if (!id) return;
                await unpostRecords([id]);
                queryClient.invalidateQueries({ queryKey: ['vouchers_server_totals'] });
                queryClient.invalidateQueries({ queryKey: ['payment_vouchers'] });
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            },
            isProcessing,
            handleBulkFixSave,
            exportToExcel: () => {}
        }
    };
}
