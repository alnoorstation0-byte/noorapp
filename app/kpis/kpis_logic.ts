"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useKpisLogic() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const invoicesQuery = useQuery({
        queryKey: ['kpis_invoices', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase.from('invoices').select('total_amount, date, status, type').neq('status', 'مسودة');
            if (dateFrom) q = q.gte('date', dateFrom);
            if (dateTo) q = q.lte('date', dateTo);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const receiptsQuery = useQuery({
        queryKey: ['kpis_receipts', dateFrom, dateTo],
        queryFn: async () => {
            // Wait, receipt vouchers are typically in 'journal_headers' or 'receipt_vouchers' if such table exists.
            // In earlier exploration, we saw 'journal_headers' has 'receipt' type.
            // Let's just fetch journal_headers where type is 'receipt'
            let q = supabase.from('journal_headers').select('total_amount, journal_date, reference_type').in('reference_type', ['سند قبض', 'receipt', 'قبض']);
            if (dateFrom) q = q.gte('journal_date', dateFrom);
            if (dateTo) q = q.lte('journal_date', dateTo);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const clientsQuery = useQuery({
        queryKey: ['kpis_clients'],
        queryFn: async () => {
            const { data, error } = await supabase.from('partners').select('current_balance').eq('partner_type', 'عميل');
            if (error) throw error;
            return data || [];
        }
    });

    const rawInvoices = invoicesQuery.data || [];
    const rawReceipts = receiptsQuery.data || [];
    const rawClients = clientsQuery.data || [];

    const {
        totalSales,
        totalCollections,
        totalOutstandingDebts,
        collectionRate
    } = useMemo(() => {
        // Calculate Sales (filter out non-sales if needed, usually invoices table contains sales)
        const totalSales = rawInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        
        // Calculate Collections
        const totalCollections = rawReceipts.reduce((sum, rec) => sum + Number(rec.total_amount || 0), 0);

        // Calculate Outstanding Debts (from partners where type = عميل)
        // Usually positive balance means they owe us money.
        const totalOutstandingDebts = rawClients.reduce((sum, client) => sum + Number(client.current_balance || 0), 0);

        // Collection Rate against Sales
        const collectionRate = totalSales > 0 ? (totalCollections / totalSales) * 100 : 0;

        return {
            totalSales,
            totalCollections,
            totalOutstandingDebts,
            collectionRate: Math.min(collectionRate, 100).toFixed(2) // Cap at 100% just in case for display, though it can theoretically exceed if paying old debts
        };
    }, [rawInvoices, rawReceipts, rawClients]);

    return {
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        totalSales,
        totalCollections,
        totalOutstandingDebts,
        collectionRate,
        isLoading: invoicesQuery.isLoading || receiptsQuery.isLoading || clientsQuery.isLoading
    };
}
