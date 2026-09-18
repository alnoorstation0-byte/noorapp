
"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useProfitDashboardLogic() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const invoicesQuery = useQuery({
        queryKey: ['profit_dash_invoices', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase.from('invoices').select(`
                id, total_amount, paid_amount, lines_data, status, date, delegate_id
            `).neq('status', 'ملغي');
            
            if (dateFrom) q = q.gte('date', dateFrom);
            if (dateTo) q = q.lte('date', dateTo);
            
            const { data: invData, error: invErr } = await q;
            if (invErr) throw invErr;

            const [{ data: itemsCost }, { data: partners }] = await Promise.all([
                supabase.from('inventory_items').select('id, name, cost_price'),
                supabase.from('partners').select('id, name')
            ]);

            const costMap: Record<string, number> = {};
            itemsCost?.forEach(i => { costMap[i.id] = Number(i.cost_price || 0); });

            const partnerMap: Record<string, string> = {};
            partners?.forEach(p => { partnerMap[p.id] = p.name; });

            const invoices = (invData || []).map(inv => ({
                ...inv,
                delegate: { name: partnerMap[inv.delegate_id] }
            }));

            return { invoices, costMap };
        }
    });

    const shiftsQuery = useQuery({
        queryKey: ['profit_dash_shifts', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase.from('pos_shifts').select('id, total_sales, total_expenses, total_liters_sold, status, opened_at');
            if (dateFrom) q = q.gte('opened_at', dateFrom);
            if (dateTo) q = q.lte('opened_at', dateTo);
            
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const dashboardData = useMemo(() => {
        const rawInvoices = invoicesQuery.data?.invoices || [];
        const costMap = invoicesQuery.data?.costMap || {};
        const rawShifts = shiftsQuery.data || [];

        let totalRevenue = 0, totalCOGS = 0;
        const itemsMap = new Map<string, { name: string, revenue: number, cogs: number, profit: number }>();
        const delegatesMap = new Map<string, { name: string, revenue: number, cogs: number, profit: number }>();

        rawInvoices.forEach((inv: any) => {
            const amount = Number(inv.total_amount || 0);
            totalRevenue += amount;
            
            const delegateName = (inv.delegate as any)?.name || 'بدون مشغل محطة';
            if (!delegatesMap.has(delegateName)) delegatesMap.set(delegateName, { name: delegateName, revenue: 0, cogs: 0, profit: 0 });
            const d = delegatesMap.get(delegateName)!;
            d.revenue += amount;

            let invCogs = 0;
            if (inv.lines_data) {
                let lines: any[] = [];
                try {
                    lines = typeof inv.lines_data === 'string' ? JSON.parse(inv.lines_data) : inv.lines_data;
                } catch(e){}

                lines.forEach((line: any) => {
                    const itemName = line.item_name || line.name || 'صنف غير معروف';
                    const itemId = line.item_id || '';
                    const qty = Number(line.quantity || 0);
                    const lineRev = qty * Number(line.unit_price || line.price || 0);
                    const lineCogs = qty * (costMap[itemId] || 0);
                    
                    invCogs += lineCogs;
                    totalCOGS += lineCogs;

                    if (!itemsMap.has(itemName)) itemsMap.set(itemName, { name: itemName, revenue: 0, cogs: 0, profit: 0 });
                    const i = itemsMap.get(itemName)!;
                    i.revenue += lineRev; 
                    i.cogs += lineCogs; 
                    i.profit += (lineRev - lineCogs);
                });
            }
            d.cogs += invCogs;
            d.profit += (amount - invCogs);
        });

        let shiftSales = 0, shiftExp = 0, shiftLiters = 0, shiftProfit = 0;
        rawShifts.forEach((s: any) => {
            const sales = Number(s.total_sales || 0);
            const exp = Number(s.total_expenses || 0);
            shiftSales += sales;
            shiftExp += exp;
            shiftLiters += Number(s.total_liters_sold || 0);
            shiftProfit += (sales - exp);
        });

        const grossProfit = totalRevenue - totalCOGS;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
            grossProfit,
            grossMargin,
            totalRevenue, 
            totalCOGS,
            topItems: Array.from(itemsMap.values()).sort((a,b) => b.profit - a.profit).slice(0, 7),
            topDelegates: Array.from(delegatesMap.values()).sort((a,b) => b.profit - a.profit).slice(0, 5),
            trips: { sales: shiftSales, expenses: shiftExp, invCost: shiftLiters, profit: shiftProfit, count: rawShifts.length }
        };
    }, [invoicesQuery.data, shiftsQuery.data]);

    return {
        dateFrom, setDateFrom, 
        dateTo, setDateTo,
        isLoading: invoicesQuery.isLoading || shiftsQuery.isLoading,
        ...dashboardData
    };
}
