"use client";
import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { fetchPaginatedData } from '@/lib/supabase-pagination';
import { getInvoiceSummaryAndAging } from '@/lib/helpers';

const updateInventoryQty = async (itemId: string, warehouseId: string, qtyChange: number) => {
    const { data } = await supabase.from('warehouse_inventory').select('*').eq('item_id', itemId).eq('warehouse_id', warehouseId).single();
    if (data) {
        await supabase.from('warehouse_inventory').update({ quantity: Number(data.quantity) + qtyChange }).eq('id', data.id);
    } else if (qtyChange > 0) {
        await supabase.from('warehouse_inventory').insert({ warehouse_id: warehouseId, item_id: itemId, quantity: qtyChange });
    }
};

export function usePosInvoicesLogic() {
    const router = useRouter();
    const { showToast } = useToast(); 
    const queryClient = useQueryClient();
    
    const updateRowsInCache = (targetIds: any[], updatedFields: any) => {
        queryClient.setQueryData(['pos_invoices'], (oldData: any[]) => {
            if (!oldData) return [];
            const stringIds = targetIds.map(String);
            return oldData.map(row => 
                stringIds.includes(String(row.id)) ? { ...row, ...updatedFields } : row 
            );
        });
    };

    const [permissions, setPermissions] = useState<any>({ isAdmin: false });
    
    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch); 
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<any>({ lines: [] });

    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<any>(null);

    useEffect(() => {
        const fetchAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, permissions, is_admin')
                    .eq('id', session.user.id)
                    .single();
                
                const userRole = String(profile?.role || '').toLowerCase();
                setPermissions({ 
                    isAdmin: (userRole === 'admin' || userRole === 'super_admin') || profile?.is_admin === true, 
                    ...profile?.permissions 
                });
            }
        };
        fetchAuth();
    }, []);

    const { data: invoices = [], isLoading: isInvLoading } = useQuery({
        queryKey: ['pos_invoices'],
        queryFn: async () => {
            const buildQuery = () => supabase
                .from('invoices')
                .select('*, partners:partners!invoices_partner_id_fkey(*), debit_acc:accounts!invoices_debit_acc_fkey(name)')
                .ilike('invoice_number', 'INV-POS-%').order('date', { ascending: false });
            return await fetchPaginatedData(buildQuery, 'id');
        }
    });

    const { data: projects = [], isLoading: isProjLoading } = useQuery({
        queryKey: ['job_orders'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_orders').select('*').eq('status', 'قيد التنفيذ');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: fleetOperations = [] } = useQuery({
        queryKey: ['fleet_operations_open'],
        queryFn: async () => {
            const { data, error } = await supabase.from('fleet_operations').select('id, operation_number, operation_date, status, vehicle_id, driver_id, description, vehicle:fleet_vehicles(plate_number), driver:partners(name), description').eq('status', 'مفتوح');
            if (error) throw error;
            return data?.map((op:any) => ({
                id: op.id,
                operation_number: op.operation_number,
                status: op.status,
                vehicle_id: op.vehicle_id,
                driver_id: op.driver_id,
                name: ``
            })) || [];
        }
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const { data, error } = await supabase.from('warehouses').select('*').eq('is_active', true).order('type');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: delegates = [] } = useQuery({
        queryKey: ['delegates'],
        queryFn: async () => {
            const { data, error } = await supabase.from('partners').select('*').in('partner_type', ['موظف', 'مندوب']);
            if (error) throw error;
            return data || [];
        }
    });

    const { data: warehouseItems = [] } = useQuery({
        queryKey: ['warehouse_items', currentRecord?.warehouse_id],
        queryFn: async () => {
            if (currentRecord?.warehouse_id) {
                const { data, error } = await supabase
                    .from('warehouse_inventory')
                    .select('quantity, item_id, inventory_items(name, unit, default_price)')
                    .eq('warehouse_id', currentRecord.warehouse_id)
                    .gt('quantity', 0);
                if (error) throw error;
                return data?.map((d: any) => ({
                    id: d.item_id,
                    name: d.inventory_items?.name,
                    unit: d.inventory_items?.unit,
                    price: d.inventory_items?.default_price || 0,
                    quantity: d.quantity
                })) || [];
            } else {
                const { data, error } = await supabase.from('inventory_items').select('id, name, unit, default_price');
                if (error) throw error;
                return data?.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    unit: d.unit,
                    price: d.default_price || 0,
                    quantity: 'غير محدد'
                })) || [];
            }
        },
        enabled: true
    });

    const allFiltered = useMemo(() => {
        if (!invoices) return [];
        return invoices.filter((inv: any) => {
            const searchLower = (deferredSearch || '').toLowerCase();
            const matchesSearch = 
                inv.invoice_number?.toLowerCase().includes(searchLower) || 
                inv.client_name?.toLowerCase().includes(searchLower);
            
            let matchesDate = true;
            const invDate = inv.date ? new Date(inv.date) : null;
            if (invDate) {
                if (dateFrom) matchesDate = matchesDate && invDate >= new Date(dateFrom);
                if (dateTo) matchesDate = matchesDate && invDate <= new Date(dateTo);
            }
            return matchesSearch && matchesDate;
        }).map((inv: any) => {
            const total = Number(inv.total_amount || 0);
            const paid = Number(inv.paid_amount || 0);
            const balance = total - paid;
            
            let paymentStatus = 'unpaid'; 
            if (paid > total && total > 0) paymentStatus = 'overpaid'; 
            else if (paid === total && total > 0) paymentStatus = 'paid'; 
            else if (paid > 0) paymentStatus = 'partial'; 

            return {
                ...inv,
                remaining_amount: balance,
                payment_display_status: paymentStatus
            };
        });
    }, [invoices, deferredSearch, dateFrom, dateTo]);

    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return allFiltered.slice(start, start + rowsPerPage);
    }, [allFiltered, currentPage, rowsPerPage]);

    const kpis = useMemo(() => ({
        total: allFiltered.length,
        posted: allFiltered.filter((i: any) => (i.status === 'posted' || i.status === 'معتمد')).length,
        pending: allFiltered.filter((i: any) => (i.status !== 'posted' && i.status !== 'معتمد')).length
    }), [allFiltered]);

    const summary = useMemo(() => getInvoiceSummaryAndAging(allFiltered), [allFiltered]);

    const handleOpenPaymentModal = async (inv: any) => {
        const balance = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        
        const pName = inv.client_name || inv.partners?.name || '';

        setSelectedInvoiceForPay({
            id: undefined, 
            invoice_id: inv.id, 
            invoice_number: inv.invoice_number,
            date: new Date().toISOString().split('T')[0], 
            partner_id: inv.partner_id, 
            partner_name: pName,
            amount: balance > 0 ? balance : 0, 
            payment_method: 'نقدي (كاش)',
            partner_acc_id: inv.debit_account_id || '4f828d0d-a1f4-4762-83e3-c17dafae802d',
            partner_acc_name: inv.debit_acc?.name || 'العملاء (أصحاب الفروع)', 
            safe_bank_acc_id: '21b8a1db-bc9f-4cf8-b741-1efeded0963c',
            safe_bank_acc_name: 'الخزينة الرئيسية',
            delegate_id: inv.delegate_id,
            fleet_operation_id: inv.fleet_operation_id,
            job_order_id: inv.job_order_id,
        });
        setIsReceiptModalOpen(true);
    };

    const handlePayInvoice = (inv: any) => {
        const balance = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        const defaultAmount = balance > 0 ? balance : 0;
        
        const params = new URLSearchParams({
            invoice_id: inv.id, 
            amount: defaultAmount.toString(), 
            client_name: inv.client_name || '', 
            ref: inv.invoice_number || ''
        });
        router.push(`/ReceiptVouchers?${params.toString()}`);
    };

    const handleAddNew = () => { 
        setCurrentRecord({ 
            lines: [], 
            date: new Date().toISOString().split('T')[0], 
            debit_account_id: '4f828d0d-a1f4-4762-83e3-c17dafae802d',
            debit_account_name: 'العملاء ',
            credit_account_id: '6667f91a-9478-49ab-9721-521ee09381fa',
            credit_account_name: 'إيرادات المبيعات',
            payment_method: 'آجل'
        }); 
        setIsEditModalOpen(true); 
    };

    const handleEdit = (inv: any) => {
        if (inv.is_posted || inv.status === 'posted' || inv.status === 'معتمد') {
            showToast("⚠️ لا يمكن تعديل فاتورة معتمدة! لتسجيل الدفعات استخدم زر (💰) الموجود بالجدول. ولتعديل بيانات الأصناف يجب فك الترحيل أولاً.", "error");
            return;
        }

        setCurrentRecord({ ...inv, client_name: inv.client_name || inv.partners?.name || '' });
        setIsEditModalOpen(true);
    };

    const saveMutation = useMutation({
        mutationFn: async (record: any) => {
            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
            
            if (record.id) {
                const { data: currentInv } = await supabase.from('invoices').select('status').eq('id', record.id).single();
                if (currentInv && (currentInv.status === 'posted' || currentInv.status === 'معتمد')) {
                    throw new Error("لا يمكن حفظ التعديلات! الفاتورة معتمدة بالفعل في النظام. يرجى فك الترحيل أولاً.");
                }
            }

            const invoiceHeader = {
                invoice_number: (record.invoice_number || '').startsWith('INV-POS-') ? record.invoice_number : `INV-POS-${record.invoice_number || Date.now().toString().slice(-6)}`, 
                date: record.date, 
                partner_id: cleanId(record.partner_id),
                client_name: record.client_name, 
                description: record.description, 
                materials_discount: Number(record.materials_discount) || 0, 
                taxable_amount: Number(record.taxable_amount) || 0,
                tax_amount: Number(record.tax_amount) || 0, 
                guarantee_percent: Number(record.guarantee_percent) || 0,
                guarantee_amount: Number(record.guarantee_amount) || 0, 
                total_amount: Number(record.total_amount) || 0,
                debit_account_id: cleanId(record.debit_account_id), 
                credit_account_id: cleanId(record.credit_account_id),
                materials_acc_id: cleanId(record.materials_acc_id), 
                guarantee_acc_id: cleanId(record.guarantee_acc_id),
                tax_acc_id: cleanId(record.tax_acc_id), 
                status: record.status || 'معلق', 
                due_in_days: Number(record.due_in_days) || 0,
                due_date: record.due_date, 
                paid_amount: Number(record.paid_amount) || 0, 
                skip_zatca: record.skip_zatca || false,
                fleet_operation_id: cleanId(record.fleet_operation_id),
                warehouse_id: cleanId(record.warehouse_id),
                delegate_id: cleanId(record.delegate_id),
                payment_method: record.payment_method || 'آجل',
                lines_data: record.lines || record.items || [] 
            };

            if (record.id) {
                const { error: headErr } = await supabase.from('invoices').update(invoiceHeader).eq('id', record.id);
                if (headErr) throw headErr;
            } else {
                const { data: inserted, error: headErr } = await supabase.from('invoices').insert([invoiceHeader]).select().single();
                if (headErr) throw headErr;

                // AUTO POST INVOICE (If Warehouse is specified)
                if (invoiceHeader.warehouse_id && inserted) {
                     await supabase.rpc('post_invoices_bulk', { p_ids: [inserted.id] });
                }
            }
        },
        onSuccess: () => {
            setIsEditModalOpen(false);
            showToast("تم حفظ الفاتورة بنجاح 💾", "success");
            queryClient.invalidateQueries({ queryKey: ['pos_invoices'] });
        },
        onError: (err: any) => {
            showToast(`حدث خطأ أثناء الحفظ! ❌ ${err.message}`, "error");
        }
    });

    const postMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return;
            const { error } = await supabase.rpc('post_invoices_bulk', { p_ids: selectedIds });
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم الاعتماد والترحيل بنجاح ✅", "success");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['pos_invoices'] });
            queryClient.invalidateQueries({ queryKey: ['accounts_report_with_lines'] }); 
            queryClient.invalidateQueries({ queryKey: ['journal_master_view'] }); 
        },
        onError: (err: any) => showToast(`خطأ في الترحيل: ${err.message}`, "error")
    });

    const unpostMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return;
            const { error } = await supabase.rpc('unpost_invoices_bulk', { p_ids: selectedIds });
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم فك الترحيل بنجاح 🔄", "warning");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['pos_invoices'] });
        },
        onError: (err: any) => showToast(`${err.message}`, "error") 
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!selectedIds.length) return;
            const { error } = await supabase.rpc('delete_invoices_bulk', { p_ids: selectedIds });
            if (error) throw error;
        },
        onSuccess: () => {
            showToast("تم الحذف النهائي بنجاح 🗑️", "success");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['pos_invoices'] });
        },
        onError: (err: any) => showToast(`خطأ في الحذف: ${err.message}`, "error")
    });

    const payMutation = useMutation({
        mutationFn: async (receiptData: any) => {
            const autoNumber = `RV-${Date.now()}`;
            const cleanId = (id: any) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
            const finalAmount = Number(receiptData.amount || 0);
            if (finalAmount <= 0) throw new Error("AMOUNT_ZERO");

            const dataToSave = {
                receipt_number: receiptData.receipt_number || autoNumber,
                date: receiptData.date || new Date().toISOString().split('T')[0],
                amount: finalAmount,
                payment_method: receiptData.payment_method || 'نقدي (كاش)',
                notes: receiptData.notes || `سداد دفعة من فاتورة مبيعات #${receiptData.invoice_number}`,
                invoice_id: cleanId(receiptData.id || receiptData.invoice_id),
                partner_id: cleanId(receiptData.partner_id),
                safe_bank_acc_id: cleanId(receiptData.safe_bank_acc_id), 
                partner_acc_id: cleanId(receiptData.partner_acc_id),
            };

            const { error: receiptErr } = await supabase.from('receipt_vouchers').insert([dataToSave]);
            if (receiptErr) throw receiptErr;

        },
        onError: (err: any) => {
            if (err.message === "AMOUNT_ZERO") showToast("المبلغ المدفوع يجب أن يكون أكبر من صفر ⚠️", "warning");
            else showToast(`حدث خطأ أثناء إنشاء سند القبض: ${err.message}`, "error");
        },
        onSuccess: () => {
            setIsReceiptModalOpen(false);
            setSelectedInvoiceForPay(null);
            showToast("تم إنشاء سند قبض كمسودة بنجاح 💰", "success");
            queryClient.invalidateQueries({ queryKey: ['pos_invoices'] });
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
        }
    });

    const isSaving = saveMutation.isPending || postMutation.isPending || unpostMutation.isPending || deleteMutation.isPending || payMutation.isPending;
    const isLoading = isInvLoading || isProjLoading || isSaving;

    return {
        invoices: paginatedInvoices,
        allFiltered,
        projects,
        fleetOperations,
        warehouses,
        delegates,
        summary,
        isLoading,
        isSaving,
        permissions,
        handlePayInvoice,
        isReceiptModalOpen, setIsReceiptModalOpen,
        selectedInvoiceForPay, setSelectedInvoiceForPay, 
        handleOpenPaymentModal,
        globalSearch, setGlobalSearch: (v: string) => { setGlobalSearch(v); setCurrentPage(1); },
        dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setCurrentPage(1); },
        dateTo, setDateTo: (v: string) => { setDateTo(v); setCurrentPage(1); },
        selectedIds, setSelectedIds,
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage: (v: number) => { setRowsPerPage(v); setCurrentPage(1); },
        kpis,
        isEditModalOpen, setIsEditModalOpen,
        currentRecord, setCurrentRecord,
        handleAddNew, handleEdit, 
        handleSave: (record: any) => saveMutation.mutate(record),
        handlePostSelected: () => postMutation.mutate(), 
        handleUnpostSelected: () => unpostMutation.mutate(), 
        warehouseItems,
        handleDeleteSelected: () => {
            const posted = invoices.filter((inv:any) => selectedIds.includes(String(inv.id)) && inv.status === 'معتمد');
            if (posted.length > 0) {
                return showToast("⚠️ لا يمكن حذف فواتير معتمدة. يرجى فك الترحيل أولاً.", "error");
            }
            if (!selectedIds.length || !confirm("هل أنت متأكد من الحذف النهائي للفواتير والقيود المرتبطة بها؟")) return;
            deleteMutation.mutate();
        },
        handleSavePayment: (record: any) => payMutation.mutate(record), 
    };
}

