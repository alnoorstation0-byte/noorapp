"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useItemCardLogic() {
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Fetch all items for the dropdown
    const itemsQuery = useQuery({
        queryKey: ['inventory_items_list'],
        queryFn: async () => {
            const { data, error } = await supabase.from('inventory_items').select('id, code, name, unit').order('name');
            if (error) throw error;
            return data || [];
        }
    });

    // Fetch transactions for the selected item
    const transactionsQuery = useQuery({
        queryKey: ['item_transactions', selectedItemId, dateFrom, dateTo],
        queryFn: async () => {
            if (!selectedItemId) return [];
            
            let q = supabase
                .from('inventory_transactions')
                .select(`
                    id, 
                    transaction_date, 
                    type, 
                    quantity, 
                    notes,
                    warehouse:warehouses!inventory_transactions_warehouse_id_fkey(name)
                `)
                .eq('item_id', selectedItemId)
                .order('transaction_date', { ascending: true })
                .order('created_at', { ascending: true }); // Ensure proper chronological order if same date

            const { data, error } = await q;
            if (error) throw error;

            // Apply date filtering post-query if we want to show a starting balance, 
            // but for simplicity, let's filter in JS to calculate running balance correctly from the beginning of time.
            return data || [];
        },
        enabled: !!selectedItemId
    });

    const rawTransactions = transactionsQuery.data || [];

    // Calculate Running Balance
    const processedTransactions = useMemo(() => {
        let runningBalance = 0;
        let totalIn = 0;
        let totalOut = 0;

        const allMapped = rawTransactions.map(tx => {
            const isOut = tx.type === 'out' || tx.type === 'صرف';
            const qty = Number(tx.quantity);
            const actualQty = isOut ? -qty : qty;
            
            runningBalance += actualQty;

            if (!isOut) totalIn += qty;
            if (isOut) totalOut += qty;

            return {
                ...tx,
                actualQty,
                runningBalance,
                warehouseName: (tx.warehouse as any)?.name || (Array.isArray(tx.warehouse) ? tx.warehouse[0]?.name : 'غير محدد') || 'غير محدد'
            };
        });

        // Filter by date AFTER calculating balance so the running balance remains accurate for the shown period
        return {
            filtered: allMapped.filter(tx => {
                if (dateFrom && tx.transaction_date < dateFrom) return false;
                if (dateTo && tx.transaction_date > dateTo) return false;
                return true;
            }),
            totalIn,
            totalOut,
            finalBalance: runningBalance
        };
    }, [rawTransactions, dateFrom, dateTo]);

    const exportToExcel = () => {
        if (processedTransactions.filtered.length === 0) return;
        
        const selectedItemName = itemsQuery.data?.find(i => String(i.id) === selectedItemId)?.name || 'Item';
        
        const exportData = processedTransactions.filtered.map(tx => ({
            'التاريخ': tx.transaction_date,
            'نوع الحركة': (tx.type === 'in' || tx.type === 'توريد') ? 'وارد 📥' : 'منصرف 📤',
            'الكمية': tx.actualQty > 0 ? tx.actualQty : Math.abs(tx.actualQty),
            'الرصيد المتراكم': tx.runningBalance,
            'المستودع': tx.warehouseName,
            'البيان': tx.notes
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "كارت الصنف");
        XLSX.writeFile(wb, `ItemCard_${selectedItemName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        itemsList: itemsQuery.data || [],
        selectedItemId,
        setSelectedItemId,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        transactions: processedTransactions.filtered,
        totalIn: processedTransactions.totalIn,
        totalOut: processedTransactions.totalOut,
        finalBalance: processedTransactions.finalBalance,
        isLoading: itemsQuery.isLoading || transactionsQuery.isLoading,
        exportToExcel
    };
}
