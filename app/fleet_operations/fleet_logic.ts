import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/components/authGuard';

export function useFleetLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('الكل');
    const [filterStatus, setFilterStatus] = useState('الكل');
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { profile, can } = useAuth();

    const { data: rawOperations = [], isLoading } = useQuery({
        queryKey: ['fleet_operations'],
        staleTime: 0,
        queryFn: async () => {
            let q = supabase
                .from('fleet_operations')
                .select(`
                    *,
                    description,
                    vehicle:fleet_vehicles(plate_number),
                    driver:partners!driver_id(name)
                `)
                .order('operation_date', { ascending: false });
            
            if (profile) {
                const role = String(profile.role || '').toLowerCase();
                const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
                if (!isGlobalAdmin && profile.linked_partner_id) {
                    q = q.eq('driver_id', profile.linked_partner_id);
                }
            }

            const { data, error } = await q;
            if (error) throw error;

            const opIds = (data || []).map(o => o.id);
            if (opIds.length === 0) return [];

            // جلب البيانات المرتبطة بكل أمر تشغيل لحساب الإجماليات بدقة حية لحظية
            const [invRes, shiftRes, costRes, expRes] = await Promise.all([
                supabase.from('invoices').select('fleet_operation_id, total_amount').in('fleet_operation_id', opIds),
                supabase.from('pos_shifts').select('fleet_operation_id, total_sales').in('fleet_operation_id', opIds),
                supabase.from('inventory_transactions').select('fleet_operation_id, quantity, unit_price, total_price, type').in('fleet_operation_id', opIds),
                supabase.from('expenses').select('fleet_operation_id, total_price').in('fleet_operation_id', opIds)
            ]);

            return (data || []).map(op => {
                const invSales = (invRes.data || []).filter(i => i.fleet_operation_id === op.id).reduce((s, i) => s + Number(i.total_amount || 0), 0);
                const shiftSales = (shiftRes.data || []).filter(s => s.fleet_operation_id === op.id).reduce((s, sh) => s + Number(sh.total_sales || 0), 0);
                const totalSales = Math.max(invSales, shiftSales, Number(op.total_sales || 0));

                const totalCost = (costRes.data || []).filter(c => c.fleet_operation_id === op.id && (c.type === 'out' || c.type === 'sales_deduction')).reduce((s, c) => s + Number(c.total_price || (c.quantity * c.unit_price) || 0), 0) || Number(op.total_cost || 0);
                const totalExpenses = (expRes.data || []).filter(e => e.fleet_operation_id === op.id).reduce((s, e) => s + Number(e.total_price || 0), 0) || Number(op.total_expenses || 0);
                const netProfit = totalSales - (totalCost + totalExpenses);

                return {
                    ...op,
                    total_sales: totalSales,
                    total_cost: totalCost,
                    total_expenses: totalExpenses,
                    net_profit: netProfit
                };
            });
        },
        enabled: !!profile
    });

    const { data: vehicles = [] } = useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const { data } = await supabase.from('fleet_vehicles').select('id, plate_number, status, driver_id');
            return data || [];
        }
    });

    const { data: drivers = [] } = useQuery({
        queryKey: ['fleet_ops_drivers'],
        queryFn: async () => {
            const { data } = await supabase.from('partners').select('id, name').eq('partner_type', 'موظف');
            return data || [];
        }
    });

    const { data: inventoryItems = [] } = useQuery({
        queryKey: ['inventory_items'],
        queryFn: async () => {
            const { data } = await supabase.from('inventory_items').select('id, name, unit');
            return data || [];
        }
    });

    const filteredData = useMemo(() => {
        let result = [...rawOperations];
        if (globalSearch) {
            const q = globalSearch.toLowerCase();
            result = result.filter(r => 
                r.operation_number?.toLowerCase().includes(q) ||
                r.vehicle?.plate_number?.toLowerCase().includes(q) ||
                r.driver?.name?.toLowerCase().includes(q)
            );
        }
        if (dateFrom) result = result.filter(r => r.operation_date >= dateFrom);
        if (dateTo) result = result.filter(r => r.operation_date <= dateTo);
        if (filterVehicle !== 'الكل') result = result.filter(r => r.vehicle_id === filterVehicle);
        if (filterStatus !== 'الكل') result = result.filter(r => r.status === filterStatus);
        
        return result;
    }, [rawOperations, globalSearch, dateFrom, dateTo, filterVehicle, filterStatus]);

    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (payload.id) {
                const { data, error } = await supabase.from('fleet_operations').update(payload).eq('id', payload.id).select();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase.from('fleet_operations').insert(payload).select();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet_operations'] });
            showToast('تم حفظ أمر الشغل بنجاح', 'success');
        },
        onError: (err: any) => {
            showToast(err.message, 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('fleet_operations').delete().in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet_operations'] });
            setSelectedIds([]);
            showToast('تم الحذف بنجاح', 'success');
        },
        onError: (err: any) => {
            showToast(err.message, 'error');
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
            const { data, error } = await supabase
                .from('fleet_operations')
                .update({ status: newStatus })
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fleet_operations'] });
            showToast(variables.newStatus === 'مغلق' ? 'تم إغلاق أمر التشغيل بنجاح 🔒' : 'تم إعادة فتح أمر التشغيل 🔓', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'حدث خطأ أثناء تعديل حالة أمر التشغيل', 'error');
        }
    });

    return {
        state: {
            globalSearch, setGlobalSearch,
            dateFrom, setDateFrom,
            dateTo, setDateTo,
            filterVehicle, setFilterVehicle,
            filterStatus, setFilterStatus,
            rowsPerPage, setRowsPerPage,
            currentPage, setCurrentPage,
            selectedIds, setSelectedIds,
            filteredData,
            vehicles,
            drivers,
            inventoryItems,
            isLoading,
            setSearchTerm: setGlobalSearch,
            setDateRange: ({start, end}: any) => { setDateFrom(start); setDateTo(end); }
        },
        mutations: {
            saveMutation,
            deleteMutation,
            toggleStatusMutation
        }
    };
}
