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
            let q = supabase.from('receipt_vouchers').select('amount, date').eq('status', 'مرحل');
            if (dateFrom) q = q.gte('date', dateFrom);
            if (dateTo) q = q.lte('date', dateTo);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const clientsQuery = useQuery({
        queryKey: ['kpis_clients'],
        queryFn: async () => {
            // Outstanding debts = Debit - Credit on AR Account (4f828d0d-a1f4-4762-83e3-c17dafae802d)
            const { data, error } = await supabase.from('journal_lines')
                .select('debit, credit')
                .eq('account_id', '4f828d0d-a1f4-4762-83e3-c17dafae802d');
            if (error) throw error;
            return data || [];
        }
    });

    const rawInvoices = invoicesQuery.data || [];
    const rawReceipts = receiptsQuery.data || [];
    const rawClientsLines = clientsQuery.data || [];
    const {
        totalSales,
        totalCollections,
        totalOutstandingDebts,
        collectionRate
    } = useMemo(() => {
        // Calculate Sales
        const totalSales = rawInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        
        // Calculate Collections
        const totalCollections = rawReceipts.reduce((sum, rec) => sum + Number(rec.amount || 0), 0);

        // Calculate Outstanding Debts (AR Debit - AR Credit)
        const totalOutstandingDebts = rawClientsLines.reduce((sum, line) => sum + (Number(line.debit || 0) - Number(line.credit || 0)), 0);

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
