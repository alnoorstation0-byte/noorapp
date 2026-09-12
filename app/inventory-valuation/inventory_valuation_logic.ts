"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useInventoryValuationLogic() {
    const [globalSearch, setGlobalSearch] = useState('');

    const itemsQuery = useQuery({
        queryKey: ['inventory_valuation_items'],
        queryFn: async () => {
            // We fetch from inventory_items, which has current_quantity and potentially cost
            // To be robust across multiple warehouses, we should probably fetch warehouse_inventory 
            // and aggregate quantities by item, but if current_quantity in inventory_items is maintained, we use it.
            // Let's fetch both to be safe and accurate, or rely on inventory_items as the master summary.
            const { data: items, error } = await supabase.from('inventory_items').select('*');
            if (error) throw error;
            
            // To get accurate costs if 'cost' field is missing or empty, we fetch the latest purchase price
            const { data: txs } = await supabase.from('inventory_transactions')
                .select('item_id, unit_price')
                .eq('type', 'in')
                .order('transaction_date', { ascending: false });
                
            const lastPrices: Record<string, number> = {};
            if (txs) {
                txs.forEach(tx => {
                    if (!lastPrices[tx.item_id] && tx.unit_price) {
                        lastPrices[tx.item_id] = Number(tx.unit_price);
                    }
                });
            }

            return { items: items || [], lastPrices };
        }
    });

    const rawData = itemsQuery.data;

    const processedItems = useMemo(() => {
        if (!rawData) return [];

        return rawData.items.map(item => {
            const qty = Number(item.current_quantity || 0);
            // Get cost: prefer item.cost_price, fallback to item.cost, fallback to default_price, fallback to last purchase price, fallback to 0
            const cost = Number(item.cost_price) > 0 
                ? Number(item.cost_price) 
                : (Number(item.cost) > 0 ? Number(item.cost) : (Number(item.default_price) > 0 ? Number(item.default_price) : (rawData.lastPrices[item.id] || 0)));
            const totalValue = qty * cost;

            return {
                ...item,
                qty,
                cost,
                totalValue
            };
        });
    }, [rawData]);

    const filteredItems = useMemo(() => {
        let res = processedItems;
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            res = res.filter(i => 
                (i.name && i.name.toLowerCase().includes(s)) || 
                (i.code && i.code.toLowerCase().includes(s))
            );
        }
        return res.sort((a, b) => b.totalValue - a.totalValue);
    }, [processedItems, globalSearch]);

    const totalInventoryValue = filteredItems.reduce((sum, item) => sum + item.totalValue, 0);
    const totalItemsCount = filteredItems.length;
    const totalPhysicalUnits = filteredItems.reduce((sum, item) => sum + item.qty, 0);

    const exportToExcel = () => {
        const exportData = filteredItems.map(i => ({
            'كود الصنف': i.code,
            'اسم الصنف': i.name,
            'الكمية الحالية': i.qty,
            'متوسط التكلفة': i.cost,
            'إجمالي القيمة': i.totalValue
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تقييم المخزون");
        XLSX.writeFile(wb, `Inventory_Valuation_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        filteredItems,
        globalSearch,
        setGlobalSearch,
        totalInventoryValue,
        totalItemsCount,
        totalPhysicalUnits,
        isLoading: itemsQuery.isLoading,
        exportToExcel
    };
}
