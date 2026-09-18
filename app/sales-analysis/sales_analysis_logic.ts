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
                    paid_amount,
                    lines_data, 
                    client_name,
                    partner_id,
                    delegate_id
                `)
                // ✅ فقط الفواتير المعتمدة/المرحلة - لا تشمل المعلقة أو الملغاة
                .in('status', ['مرحل', 'معتمد', 'مغلق', 'مدفوع']);

            if (dateFrom) q = q.gte('date', dateFrom);
            if (dateTo) q = q.lte('date', dateTo);

            const { data, error } = await q;
            if (error) throw error;

            // ✅ جلب تكلفة الأصناف والشركاء بشكل متزامن
            const [{ data: itemsCost }, { data: partnersData }] = await Promise.all([
                supabase.from('inventory_items').select('id, name, cost_price'),
                supabase.from('partners').select('id, name')
            ]);

            const costMap: Record<string, number> = {};
            itemsCost?.forEach(i => { costMap[i.id] = Number(i.cost_price || 0); });

            const partnerMap: Record<string, string> = {};
            partnersData?.forEach(p => { partnerMap[p.id] = p.name; });

            const invoices = (data || []).map(inv => ({
                ...inv,
                partner: { name: partnerMap[inv.partner_id] },
                delegate: { name: partnerMap[inv.delegate_id] }
            }));

            return { invoices, costMap };
        }
    });

    const rawInvoices = invoicesQuery.data?.invoices || [];
    const costMap = invoicesQuery.data?.costMap || {};

    const {
        topClients,
        topDelegates,
        topItems,
        totalRevenue,
        totalInvoices,
        averageInvoiceValue,
        totalCOGS,
        grossProfit,
        grossMargin,
        totalOutstanding
    } = useMemo(() => {
        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalOutstanding = 0;
        const clientsMap = new Map<string, { name: string, total: number, count: number }>();
        const delegatesMap = new Map<string, { name: string, total: number, count: number }>();
        const itemsMap = new Map<string, { name: string, qty: number, revenue: number, cogs: number, profit: number }>();

        rawInvoices.forEach((inv: any) => {
            const amount = Number(inv.total_amount || 0);
            const paid = Number(inv.paid_amount || 0);
            totalRevenue += amount;
            totalOutstanding += Math.max(0, amount - paid);

            // Clients
            const clientName = (inv.partner as any)?.name || inv.client_name || 'عميل نقدي';
            if (!clientsMap.has(clientName)) clientsMap.set(clientName, { name: clientName, total: 0, count: 0 });
            const c = clientsMap.get(clientName)!;
            c.total += amount; c.count += 1;

            // Operators / Delegates
            const delegateName = (inv.delegate as any)?.name || 'بدون مشغل محطة';
            if (!delegatesMap.has(delegateName)) delegatesMap.set(delegateName, { name: delegateName, total: 0, count: 0 });
            const d = delegatesMap.get(delegateName)!;
            d.total += amount; d.count += 1;

            // Items + COGS
            if (inv.lines_data) {
                let lines: any[] = [];
                if (typeof inv.lines_data === 'string') {
                    try { lines = JSON.parse(inv.lines_data); } catch(e){}
                } else if (Array.isArray(inv.lines_data)) {
                    lines = inv.lines_data;
                }

                lines.forEach((line: any) => {
                    const itemName = line.item_name || line.name || 'صنف غير معروف';
                    const itemId = line.item_id || '';
                    const qty = Number(line.quantity || 0);
                    const unitPrice = Number(line.unit_price || line.price || 0);
                    const lineRevenue = qty * unitPrice;
                    // ✅ حساب التكلفة (COGS) من cost_price
                    const lineCOGS = qty * (costMap[itemId] || 0);
                    const lineProfit = lineRevenue - lineCOGS;

                    totalCOGS += lineCOGS;

                    if (!itemsMap.has(itemName)) {
                        itemsMap.set(itemName, { name: itemName, qty: 0, revenue: 0, cogs: 0, profit: 0 });
                    }
                    const i = itemsMap.get(itemName)!;
                    i.qty += qty;
                    i.revenue += lineRevenue;
                    i.cogs += lineCOGS;
                    i.profit += lineProfit;
                });
            }
        });

        const grossProfit = totalRevenue - totalCOGS;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const topClients = Array.from(clientsMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
        const topDelegates = Array.from(delegatesMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
        const topItems = Array.from(itemsMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
        const averageInvoiceValue = rawInvoices.length > 0 ? totalRevenue / rawInvoices.length : 0;

        return {
            topClients, topDelegates, topItems,
            totalRevenue, totalInvoices: rawInvoices.length,
            averageInvoiceValue, totalCOGS, grossProfit, grossMargin, totalOutstanding
        };
    }, [rawInvoices, costMap]);


    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
            topClients.map(c => ({ 'اسم العميل': c.name, 'عدد الفواتير': c.count, 'إجمالي المبيعات': c.total.toFixed(2) }))
        ), "أفضل العملاء");

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
            topDelegates.map(d => ({ 'مشغل المحطة': d.name, 'عدد الفواتير': d.count, 'إجمالي المبيعات': d.total.toFixed(2) }))
        ), "أداء مشغلي المحطات");

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
            topItems.map((i: any) => ({
                'نوع الوقود / الصنف': i.name,
                'الكمية المباعة (لتر/وحدة)': i.qty,
                'إجمالي الإيراد': i.revenue.toFixed(2),
                'تكلفة الوقود والمبيعات (COGS)': i.cogs.toFixed(2),
                'إجمالي الربح': i.profit.toFixed(2),
                'هامش الربح %': i.revenue > 0 ? ((i.profit / i.revenue) * 100).toFixed(1) + '%' : '0%'
            }))
        ), "ربحية أنواع الوقود والمنتجات");

        XLSX.writeFile(wb, `Sales_Profitability_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        topClients, topDelegates, topItems,
        totalRevenue, totalInvoices, averageInvoiceValue,
        // ✅ قيم الربحية الجديدة
        totalCOGS, grossProfit, grossMargin, totalOutstanding,
        isLoading: invoicesQuery.isLoading,
        exportToExcel
    };
}
