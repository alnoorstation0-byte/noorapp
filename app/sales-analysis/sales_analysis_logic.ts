"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useSalesAnalysisLogic() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const invoicesQuery = useQuery({
        queryKey: ['sales_analysis_invoices', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase
                .from('invoices')
                .select(`
                    id, 
                    date, 
                    total_amount, 
                    taxable_amount, 
                    tax_amount, 
                    lines_data, 
                    client_name,
                    partner_id,
                    delegate_id,
                    partner:partners!invoices_partner_id_fkey(name),
                    delegate:partners!invoices_delegate_id_fkey(name)
                `)
                .neq('status', 'مسودة');

            if (dateFrom) q = q.gte('date', dateFrom);
            if (dateTo) q = q.lte('date', dateTo);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const rawInvoices = invoicesQuery.data || [];

    const {
        topClients,
        topDelegates,
        topItems,
        totalRevenue,
        totalInvoices,
        averageInvoiceValue
    } = useMemo(() => {
        let totalRevenue = 0;
        const clientsMap = new Map<string, { name: string, total: number, count: number }>();
        const delegatesMap = new Map<string, { name: string, total: number, count: number }>();
        const itemsMap = new Map<string, { name: string, qty: number, revenue: number }>();

        rawInvoices.forEach(inv => {
            const amount = Number(inv.total_amount || 0);
            totalRevenue += amount;

            // Clients
            const clientName = inv.partner?.name || inv.client_name || 'عميل نقدي / غير محدد';
            if (!clientsMap.has(clientName)) {
                clientsMap.set(clientName, { name: clientName, total: 0, count: 0 });
            }
            const c = clientsMap.get(clientName)!;
            c.total += amount;
            c.count += 1;

            // Delegates
            const delegateName = inv.delegate?.name || 'غير محدد';
            if (!delegatesMap.has(delegateName)) {
                delegatesMap.set(delegateName, { name: delegateName, total: 0, count: 0 });
            }
            const d = delegatesMap.get(delegateName)!;
            d.total += amount;
            d.count += 1;

            // Items
            if (inv.lines_data) {
                let lines = [];
                if (typeof inv.lines_data === 'string') {
                    try { lines = JSON.parse(inv.lines_data); } catch(e){}
                } else if (Array.isArray(inv.lines_data)) {
                    lines = inv.lines_data;
                }

                lines.forEach((line: any) => {
                    const itemName = line.item_name || line.name || 'صنف غير معروف';
                    const qty = Number(line.quantity || 0);
                    const unitPrice = Number(line.unit_price || line.price || 0);
                    const lineTotal = qty * unitPrice;

                    if (!itemsMap.has(itemName)) {
                        itemsMap.set(itemName, { name: itemName, qty: 0, revenue: 0 });
                    }
                    const i = itemsMap.get(itemName)!;
                    i.qty += qty;
                    i.revenue += lineTotal;
                });
            }
        });

        const topClients = Array.from(clientsMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
        const topDelegates = Array.from(delegatesMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
        const topItems = Array.from(itemsMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10); // Sort by quantity for items

        const averageInvoiceValue = rawInvoices.length > 0 ? totalRevenue / rawInvoices.length : 0;

        return {
            topClients,
            topDelegates,
            topItems,
            totalRevenue,
            totalInvoices: rawInvoices.length,
            averageInvoiceValue
        };
    }, [rawInvoices]);


    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topClients.map(c => ({ 'اسم العميل': c.name, 'عدد الفواتير': c.count, 'إجمالي المبيعات': c.total }))), "أفضل العملاء");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topDelegates.map(d => ({ 'المندوب': d.name, 'عدد الفواتير': d.count, 'إجمالي المبيعات': d.total }))), "أفضل المناديب");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topItems.map(i => ({ 'الصنف': i.name, 'الكمية المباعة': i.qty, 'إجمالي الإيراد': i.revenue }))), "أفضل الأصناف");

        XLSX.writeFile(wb, `Sales_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        topClients,
        topDelegates,
        topItems,
        totalRevenue,
        totalInvoices,
        averageInvoiceValue,
        isLoading: invoicesQuery.isLoading,
        exportToExcel
    };
}
