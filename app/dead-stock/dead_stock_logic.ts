"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useDeadStockLogic() {
    const [globalSearch, setGlobalSearch] = useState('');
    const [stagnantDays, setStagnantDays] = useState<number>(90); // Default to 90 days

    const itemsQuery = useQuery({
        queryKey: ['dead_stock_items'],
        queryFn: async () => {
            // Fetch all items that actually have stock
            const { data: items, error } = await supabase
                .from('inventory_items')
                .select('*')
                .gt('current_quantity', 0);
            if (error) throw error;
            return items || [];
        }
    });

    const transactionsQuery = useQuery({
        queryKey: ['dead_stock_transactions'],
        queryFn: async () => {
            // Fetch all out-transactions to see the last time an item was moved out/sold
            const { data: txs, error } = await supabase
                .from('inventory_transactions')
                .select('item_id, transaction_date')
                .in('type', ['out', 'صرف', 'transfer'])
                .order('transaction_date', { ascending: false });
            if (error) throw error;
            return txs || [];
        }
    });

    const rawItems = itemsQuery.data || [];
    const rawTxs = transactionsQuery.data || [];

    const processedItems = useMemo(() => {
        const lastTxMap = new Map<string, string>(); // item_id -> latest date
        rawTxs.forEach(tx => {
            if (tx.item_id && tx.transaction_date) {
                if (!lastTxMap.has(tx.item_id)) {
                    lastTxMap.set(tx.item_id, tx.transaction_date);
                } else {
                    const currentLast = lastTxMap.get(tx.item_id)!;
                    if (new Date(tx.transaction_date) > new Date(currentLast)) {
                        lastTxMap.set(tx.item_id, tx.transaction_date);
                    }
                }
            }
        });

        const today = new Date();

        return rawItems.map(item => {
            const lastMovementDateStr = lastTxMap.get(item.id) || item.created_at || new Date().toISOString();
            const lastMovementDate = new Date(lastMovementDateStr);
            
            // Calculate days difference
            const diffTime = Math.abs(today.getTime() - lastMovementDate.getTime());
            const daysSinceLastMovement = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const cost = Number(item.cost || 0);
            const qty = Number(item.current_quantity || 0);
            const frozenCapital = qty * cost;

            return {
                ...item,
                qty,
                cost,
                frozenCapital,
                lastMovementDate: lastMovementDateStr.split('T')[0],
                daysSinceLastMovement
            };
        });
    }, [rawItems, rawTxs]);

    const filteredItems = useMemo(() => {
        let res = processedItems.filter(item => item.daysSinceLastMovement >= stagnantDays);
        
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            res = res.filter(i => 
                (i.name && i.name.toLowerCase().includes(s)) || 
                (i.code && i.code.toLowerCase().includes(s))
            );
        }
        // Sort by frozen capital (most valuable dead stock first)
        return res.sort((a, b) => b.frozenCapital - a.frozenCapital);
    }, [processedItems, globalSearch, stagnantDays]);

    const totalDeadItems = filteredItems.length;
    const totalFrozenCapital = filteredItems.reduce((sum, item) => sum + item.frozenCapital, 0);

    const exportToExcel = () => {
        const exportData = filteredItems.map(i => ({
            'كود الصنف': i.code,
            'اسم الصنف': i.name,
            'الكمية الراكدة': i.qty,
            'متوسط التكلفة': i.cost,
            'إجمالي رأس المال المجمد': i.frozenCapital,
            'تاريخ آخر حركة منصرف': i.lastMovementDate,
            'أيام الركود': i.daysSinceLastMovement
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "المخزون الراكد");
        XLSX.writeFile(wb, `Dead_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        filteredItems,
        globalSearch,
        setGlobalSearch,
        stagnantDays,
        setStagnantDays,
        totalDeadItems,
        totalFrozenCapital,
        isLoading: itemsQuery.isLoading || transactionsQuery.isLoading,
        exportToExcel
    };
}
