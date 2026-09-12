"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function usePosDashboardLogic() {
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Fetch Warehouses
    const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
        queryKey: ['pos_dashboard_warehouses'],
        queryFn: async () => {
            const { data } = await supabase.from('warehouses').select('*').eq('is_active', true).order('name');
            return data || [];
        }
    });

    // Fetch Inventory Balances
    const { data: inventoryBalances = [], isLoading: loadingInv } = useQuery({
        queryKey: ['pos_dashboard_inventory', selectedWarehouseId],
        queryFn: async () => {
            let query = supabase
                .from('warehouse_inventory')
                .select(`
                    id, quantity,
                    warehouse_id,
                    warehouses (name),
                    inventory_items (name, default_price, unit)
                `)
                .gt('quantity', 0);
            
            if (selectedWarehouseId !== 'all') {
                query = query.eq('warehouse_id', selectedWarehouseId);
            }

            const { data } = await query;
            return data?.map((row: any) => ({
                id: row.id,
                warehouse_name: row.warehouses?.name,
                item_name: row.inventory_items?.name,
                unit: row.inventory_items?.unit,
                quantity: row.quantity,
                value: row.quantity * (row.inventory_items?.default_price || 0)
            })) || [];
        }
    });

    // Fetch POS Sales (Invoices)
    const { data: sales = [], isLoading: loadingSales } = useQuery({
        queryKey: ['pos_dashboard_sales', selectedWarehouseId, dateRange],
        queryFn: async () => {
            let query = supabase
                .from('invoices')
                .select(`
                    id, invoice_number, date, total_amount, paid_amount, status,
                    warehouse_id, warehouses (name), client_name, payment_method
                `)
                .not('warehouse_id', 'is', null);

            if (selectedWarehouseId !== 'all') {
                query = query.eq('warehouse_id', selectedWarehouseId);
            }
            if (dateRange.start) query = query.gte('date', dateRange.start);
            if (dateRange.end) query = query.lte('date', dateRange.end);

            const { data } = await query;
            return data || [];
        }
    });

    // Fetch Shifts History for Audit & Review
    const { data: shiftsHistory = [], isLoading: loadingShifts } = useQuery({
        queryKey: ['pos_dashboard_shifts', selectedWarehouseId, dateRange],
        queryFn: async () => {
            let query = supabase
                .from('pos_shifts')
                .select(`
                    *,
                    warehouse:warehouses(id, name, type),
                    delegate:partners!delegate_id(id, name, phone, code)
                `)
                .order('opened_at', { ascending: false });

            if (selectedWarehouseId !== 'all') {
                query = query.eq('warehouse_id', selectedWarehouseId);
            }
            if (dateRange.start) query = query.gte('opened_at', `${dateRange.start}T00:00:00Z`);
            if (dateRange.end) query = query.lte('opened_at', `${dateRange.end}T23:59:59Z`);

            const { data } = await query;
            return data || [];
        }
    });

    const totalStockValue = useMemo(() => inventoryBalances.reduce((sum: number, item: any) => sum + item.value, 0), [inventoryBalances]);
    const totalSalesValue = useMemo(() => sales.reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0), [sales]);
    const totalCollected = useMemo(() => sales.reduce((sum: number, inv: any) => sum + Number(inv.paid_amount), 0), [sales]);

    return {
        warehouses, selectedWarehouseId, setSelectedWarehouseId,
        dateRange, setDateRange,
        inventoryBalances, sales, shiftsHistory,
        totalStockValue, totalSalesValue, totalCollected,
        isLoading: loadingWarehouses || loadingInv || loadingSales || loadingShifts
    };
}
