"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useDelegateSettlementsLogic() {
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const tripsQuery = useQuery({
        queryKey: ['delegate_settlements_trips', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase
                .from('fleet_operations')
                .select('id, operation_number, operation_date, status, driver:partners(name)')
                .order('operation_date', { ascending: false });

            if (dateFrom) q = q.gte('operation_date', dateFrom);
            if (dateTo) q = q.lte('operation_date', dateTo);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const invoicesQuery = useQuery({
        queryKey: ['delegate_settlements_invoices', dateFrom, dateTo],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invoices')
                .select('fleet_operation_id, total_amount, payment_method')
                .not('fleet_operation_id', 'is', null)
                .neq('status', 'مسودة');
            if (error) throw error;
            return data || [];
        }
    });

    const receiptsQuery = useQuery({
        queryKey: ['delegate_settlements_receipts', dateFrom, dateTo],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('journal_headers')
                .select('fleet_operation_id, total_amount')
                .not('fleet_operation_id', 'is', null)
                .in('reference_type', ['سند قبض', 'receipt', 'قبض']);
            if (error) throw error;
            return data || [];
        }
    });

    const rawTrips = tripsQuery.data || [];
    const rawInvoices = invoicesQuery.data || [];
    const rawReceipts = receiptsQuery.data || [];

    const processedSettlements = useMemo(() => {
        // Map sales by trip
        const salesMap = new Map<string, { cash: number, credit: number, total: number }>();
        rawInvoices.forEach(inv => {
            const opId = inv.fleet_operation_id;
            if (opId) {
                const current = salesMap.get(opId) || { cash: 0, credit: 0, total: 0 };
                const amt = Number(inv.total_amount || 0);
                current.total += amt;
                if (inv.payment_method === 'آجل') {
                    current.credit += amt;
                } else {
                    current.cash += amt;
                }
                salesMap.set(opId, current);
            }
        });

        // Map receipts by trip
        const receiptsMap = new Map<string, number>();
        rawReceipts.forEach(rec => {
            const opId = rec.fleet_operation_id;
            if (opId) {
                receiptsMap.set(opId, (receiptsMap.get(opId) || 0) + Number(rec.total_amount || 0));
            }
        });

        return rawTrips.map((trip: any) => {
            const sales = salesMap.get(trip.id) || { cash: 0, credit: 0, total: 0 };
            const totalCash = receiptsMap.get(trip.id) || 0;
            const difference = sales.cash - totalCash;

            return {
                id: trip.id,
                operationNumber: trip.operation_number,
                date: trip.operation_date,
                status: trip.status,
                delegateName: trip.driver?.name || 'بدون مندوب',
                totalSales: sales.total,
                creditSales: sales.credit,
                cashSales: sales.cash,
                totalCash,
                difference
            };
        });
    }, [rawTrips, rawInvoices, rawReceipts]);

    const filteredSettlements = useMemo(() => {
        let res = processedSettlements;
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            res = res.filter(ts => 
                ts.delegateName.toLowerCase().includes(s) || 
                String(ts.operationNumber).includes(s)
            );
        }
        return res;
    }, [processedSettlements, globalSearch]);

    const totals = filteredSettlements.reduce((acc, curr) => {
        acc.totalSales += curr.totalSales;
        acc.creditSales += curr.creditSales;
        acc.cashSales += curr.cashSales;
        acc.totalCash += curr.totalCash;
        acc.totalDifference += curr.difference;
        return acc;
    }, { totalSales: 0, creditSales: 0, cashSales: 0, totalCash: 0, totalDifference: 0 });

    const exportToExcel = () => {
        const exportData = filteredSettlements.map(s => ({
            'رقم الرحلة': s.operationNumber,
            'التاريخ': s.date,
            'اسم المندوب': s.delegateName,
            'حالة الرحلة': s.status,
            'إجمالي المبيعات': s.totalSales,
            'المبيعات الآجلة': s.creditSales,
            'المطالبة النقدية': s.cashSales,
            'النقدية المستلمة (السدادات)': s.totalCash,
            'الفرق (العهد المتبقية)': s.difference
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تسويات عهد المناديب");
        XLSX.writeFile(wb, `Delegate_Settlements_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        filteredSettlements,
        globalSearch,
        setGlobalSearch,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        totals,
        isLoading: tripsQuery.isLoading || invoicesQuery.isLoading || receiptsQuery.isLoading,
        exportToExcel
    };
}
