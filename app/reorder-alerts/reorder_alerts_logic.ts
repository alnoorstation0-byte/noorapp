"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useReorderAlertsLogic() {
    const [globalSearch, setGlobalSearch] = useState('');

    const itemsQuery = useQuery({
        queryKey: ['reorder_alerts_items'],
        queryFn: async () => {
            const { data, error } = await supabase.from('inventory_items').select('*');
            if (error) throw error;
            return data || [];
        }
    });

    const rawItems = itemsQuery.data || [];

    const processedItems = useMemo(() => {
        return rawItems
            .map(item => {
                const currentQty = Number(item.current_quantity || 0);
                const reorderLevel = Number(item.reorder_level || 0);
                const shortage = reorderLevel - currentQty;
                const status = currentQty <= 0 ? 'نفذ من المخزون' : currentQty <= reorderLevel ? 'نواقص' : 'متوفر';
                
                return {
                    ...item,
                    currentQty,
                    reorderLevel,
                    shortage: shortage > 0 ? shortage : 0,
                    status
                };
            })
            .filter(item => item.status !== 'متوفر'); // Only show items that are out of stock or running low
    }, [rawItems]);

    const filteredItems = useMemo(() => {
        let res = processedItems;
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            res = res.filter(i => 
                (i.name && i.name.toLowerCase().includes(s)) || 
                (i.code && i.code.toLowerCase().includes(s))
            );
        }
        return res.sort((a, b) => b.currentQty - a.currentQty); // Sort from lowest to highest theoretically, but shortage is better
    }, [processedItems, globalSearch]);

    // Sorting by shortage severity (Empty first, then lowest qty)
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => a.currentQty - b.currentQty);
    }, [filteredItems]);

    const totalShortageItems = sortedItems.length;
    const outOfStockItems = sortedItems.filter(i => i.status === 'نفذ من المخزون').length;
    const totalRequiredQty = sortedItems.reduce((sum, item) => sum + item.shortage, 0);

    const exportToExcel = () => {
        const exportData = sortedItems.map(i => ({
            'كود الصنف': i.code,
            'اسم الصنف': i.name,
            'الرصيد الحالي': i.currentQty,
            'الحد الأدنى (نقطة إعادة الطلب)': i.reorderLevel,
            'الكمية المطلوبة (النقص)': i.shortage,
            'حالة التوفر': i.status
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "نواقص المخزون");
        XLSX.writeFile(wb, `Reorder_Alerts_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        sortedItems,
        globalSearch,
        setGlobalSearch,
        totalShortageItems,
        outOfStockItems,
        totalRequiredQty,
        isLoading: itemsQuery.isLoading,
        exportToExcel
    };
}
