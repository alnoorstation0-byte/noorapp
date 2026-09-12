"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function usePosDashboardLogic() {
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
    
    // افتراضياً: آخر 30 يوماً حتى اليوم
    const getThirtyDaysAgo = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    };
    const getToday = () => new Date().toISOString().split('T')[0];

    const [dateRange, setDateRange] = useState({
        start: getThirtyDaysAgo(),
        end: getToday()
    });

    // 1. جلب كافة المنافذ والمستودعات النشطة
    const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
        queryKey: ['pos_dashboard_warehouses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('warehouses')
                .select('id, name, type, is_active, vehicle_id')
                .eq('is_active', true)
                .order('name');
            if (error) console.error('Error fetching warehouses:', error);
            return data || [];
        }
    });

    // 2. جلب خريطة تكلفة الأصناف (Cost Price Map) من المخزون لحساب تكلفة البضاعة المباعة COGS
    const { data: costMap = {}, isLoading: loadingCosts } = useQuery({
        queryKey: ['pos_dashboard_item_costs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('id, name, cost_price, default_price, unit');
            if (error) console.error('Error fetching item costs:', error);
            const map: Record<string, { name: string; cost: number; price: number; unit: string }> = {};
            (data || []).forEach((it: any) => {
                map[it.id] = {
                    name: it.name,
                    cost: Number(it.cost_price || 0),
                    price: Number(it.default_price || 0),
                    unit: it.unit || 'عدد'
                };
            });
            return map;
        }
    });

    // 3. جلب فواتير منافذ البيع والكاشير مع البنود التفصيلية lines_data
    const { data: rawInvoices = [], isLoading: loadingSales } = useQuery({
        queryKey: ['pos_dashboard_sales_all', selectedWarehouseId, dateRange],
        queryFn: async () => {
            let query = supabase
                .from('invoices')
                .select(`
                    id, invoice_number, date, total_amount, paid_amount, status,
                    warehouse_id, delegate_id, shift_id, lines_data, payment_method, created_at,
                    warehouses (id, name, type),
                    delegate:partners!delegate_id (id, name)
                `)
                .neq('status', 'ملغي');

            if (selectedWarehouseId !== 'all') {
                query = query.eq('warehouse_id', selectedWarehouseId);
            }
            if (dateRange.start) query = query.gte('date', dateRange.start);
            if (dateRange.end) query = query.lte('date', dateRange.end);

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching pos invoices:', error);
                return [];
            }
            return data || [];
        }
    });

    // 4. جلب الورديات (المفتوحة والنشطة + المغلقة السابقة)
    const { data: rawShifts = [], isLoading: loadingShifts } = useQuery({
        queryKey: ['pos_dashboard_shifts_all', selectedWarehouseId, dateRange],
        queryFn: async () => {
            let query = supabase
                .from('pos_shifts')
                .select(`
                    *,
                    warehouse:warehouses(id, name, type),
                    delegate:partners!delegate_id(id, name, phone, code)
                `)
                .order('opened_at', { ascending: false });

            if (selectedWarehouseId !== 'all') {
                query = query.eq('warehouse_id', selectedWarehouseId);
            }
            if (dateRange.start) query = query.gte('opened_at', `${dateRange.start}T00:00:00Z`);
            if (dateRange.end) query = query.lte('opened_at', `${dateRange.end}T23:59:59Z`);

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching pos shifts:', error);
                return [];
            }
            return data || [];
        }
    });

    // 5. جلب مصروفات الورديات والمنافذ
    const { data: shiftExpenses = [], isLoading: loadingExpenses } = useQuery({
        queryKey: ['pos_dashboard_expenses_all', dateRange],
        queryFn: async () => {
            let query = supabase
                .from('expenses')
                .select('id, total_price, exp_date, shift_id, description, payment_method');
            if (dateRange.start) query = query.gte('exp_date', dateRange.start);
            if (dateRange.end) query = query.lte('exp_date', dateRange.end);
            const { data, error } = await query;
            if (error) console.error('Error fetching shift expenses:', error);
            return data || [];
        }
    });

    // 🧮 المحرك الحسابي المتقدم للربحية والتشغيل اللحظي
    const profitabilityData = useMemo(() => {
        // خريطة المصروفات لكل وردية
        const expensesByShift: Record<string, number> = {};
        shiftExpenses.forEach((exp: any) => {
            if (exp.shift_id) {
                expensesByShift[exp.shift_id] = (expensesByShift[exp.shift_id] || 0) + Number(exp.total_price || exp.amount || 0);
            }
        });

        // خريطة الفواتير لكل وردية
        const invoicesByShift: Record<string, any[]> = {};
        rawInvoices.forEach((inv: any) => {
            if (inv.shift_id) {
                if (!invoicesByShift[inv.shift_id]) invoicesByShift[inv.shift_id] = [];
                invoicesByShift[inv.shift_id].push(inv);
            }
        });

        // خريطة ربحية كل صنف مباع
        const itemsProfitMap = new Map<string, {
            name: string;
            unit: string;
            soldQty: number;
            revenue: number;
            cogs: number;
            grossProfit: number;
            margin: number;
        }>();

        // حساب ربحية كل وردية / منفذ
        const enrichedShifts = rawShifts.map((shift: any) => {
            const shiftInvs = invoicesByShift[shift.id] || [];
            
            let shiftSales = 0;
            let shiftCashSales = 0;
            let shiftCardSales = 0;
            let shiftCreditSales = 0;
            let shiftCOGS = 0;

            if (shiftInvs.length > 0) {
                shiftInvs.forEach((inv: any) => {
                    const invTotal = Number(inv.total_amount || 0);
                    shiftSales += invTotal;

                    const pMethod = (inv.payment_method || '').toLowerCase().trim();
                    if (pMethod.includes('آجل') || pMethod.includes('اجل') || pMethod.includes('أجل') || pMethod.includes('ذمم') || pMethod === 'credit') {
                        shiftCreditSales += invTotal;
                    } else if (pMethod.includes('شبك') || pMethod.includes('مدى') || pMethod.includes('بطاق') || pMethod.includes('card') || pMethod.includes('تحويل')) {
                        shiftCardSales += invTotal;
                    } else {
                        shiftCashSales += invTotal;
                    }

                    // حساب تكلفة الأصناف
                    let lines: any[] = [];
                    try {
                        lines = Array.isArray(inv.lines_data)
                            ? inv.lines_data
                            : (typeof inv.lines_data === 'string' ? JSON.parse(inv.lines_data) : []);
                    } catch (e) {
                        lines = [];
                    }

                    lines.forEach((line: any) => {
                        const itemId = line.item_id || line.id;
                        const itemName = line.name || line.item_name || costMap[itemId]?.name || 'صنف غير محدد';
                        const qty = Number(line.quantity || line.qty || 0);
                        const price = Number(line.unit_price || line.price || 0);
                        const lineRev = Number(line.total || (qty * price));
                        const unitCost = costMap[itemId]?.cost || Number(line.cost_price || 0);
                        const lineCost = qty * unitCost;

                        shiftCOGS += lineCost;

                        // تجميع ربحية الصنف
                        if (!itemsProfitMap.has(itemName)) {
                            itemsProfitMap.set(itemName, {
                                name: itemName,
                                unit: costMap[itemId]?.unit || line.unit || 'عدد',
                                soldQty: 0,
                                revenue: 0,
                                cogs: 0,
                                grossProfit: 0,
                                margin: 0
                            });
                        }
                        const itm = itemsProfitMap.get(itemName)!;
                        itm.soldQty += qty;
                        itm.revenue += lineRev;
                        itm.cogs += lineCost;
                        itm.grossProfit += (lineRev - lineCost);
                    });
                });
            } else {
                // Fallback للقيم المخزنة بالوردية
                shiftSales = Number(shift.total_sales || 0);
                shiftCashSales = Number(shift.total_cash_sales || 0);
                shiftCardSales = Number(shift.total_card_sales || 0);
                shiftCreditSales = Number(shift.total_credit_sales || 0);
            }

            const recordedExp = expensesByShift[shift.id] || 0;
            const shiftExpensesTotal = Math.max(recordedExp, Number(shift.total_expenses || 0));
            const grossProfit = shiftSales - shiftCOGS;
            const netProfit = grossProfit - shiftExpensesTotal;
            const profitMargin = shiftSales > 0 ? Number(((netProfit / shiftSales) * 100).toFixed(1)) : 0;

            const durationMinutes = shift.closed_at
                ? Math.round((new Date(shift.closed_at).getTime() - new Date(shift.opened_at).getTime()) / 60000)
                : Math.round((Date.now() - new Date(shift.opened_at).getTime()) / 60000);

            return {
                ...shift,
                invoices_count: shiftInvs.length,
                computed_sales: shiftSales,
                computed_cash: shiftCashSales,
                computed_card: shiftCardSales,
                computed_credit: shiftCreditSales,
                computed_cogs: shiftCOGS,
                computed_expenses: shiftExpensesTotal,
                gross_profit: grossProfit,
                net_profit: netProfit,
                profit_margin: profitMargin,
                duration_minutes: durationMinutes,
                is_live: shift.status === 'open'
            };
        });

        // تصفية الورديات بحسب الحالة
        const filteredShifts = enrichedShifts.filter((s: any) => {
            if (statusFilter === 'all') return true;
            return s.status === statusFilter;
        });

        // المنافذ الشغالة حالياً في الوقت الفعلي (Live Running Outlets)
        const liveRunningOutlets = enrichedShifts.filter((s: any) => s.status === 'open');

        // قائمة الأصناف مع حساب نسب الهامش
        const itemsList = Array.from(itemsProfitMap.values()).map(it => ({
            ...it,
            margin: it.revenue > 0 ? Number(((it.grossProfit / it.revenue) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.revenue - a.revenue);

        // الإجماليات الكلية لكافة المنافذ في الفترة المختارة
        const totalRevenue = enrichedShifts.reduce((sum, s) => sum + s.computed_sales, 0);
        const totalCOGS = enrichedShifts.reduce((sum, s) => sum + s.computed_cogs, 0);
        const totalExpenses = enrichedShifts.reduce((sum, s) => sum + s.computed_expenses, 0);
        const totalGrossProfit = totalRevenue - totalCOGS;
        const totalNetProfit = totalGrossProfit - totalExpenses;
        const overallMargin = totalRevenue > 0 ? Number(((totalNetProfit / totalRevenue) * 100).toFixed(1)) : 0;

        // إجمالي المبيعات الحية اللحظية للمنافذ الشغالة الآن
        const liveTotalRevenue = liveRunningOutlets.reduce((sum, s) => sum + s.computed_sales, 0);
        const liveTotalCOGS = liveRunningOutlets.reduce((sum, s) => sum + s.computed_cogs, 0);
        const liveTotalNetProfit = liveRunningOutlets.reduce((sum, s) => sum + s.net_profit, 0);

        return {
            allShifts: enrichedShifts,
            filteredShifts,
            liveRunningOutlets,
            itemsProfitability: itemsList,
            totals: {
                totalRevenue,
                totalCOGS,
                totalExpenses,
                totalGrossProfit,
                totalNetProfit,
                overallMargin,
                shiftsCount: enrichedShifts.length,
                liveCount: liveRunningOutlets.length,
                liveTotalRevenue,
                liveTotalCOGS,
                liveTotalNetProfit
            }
        };
    }, [rawShifts, rawInvoices, shiftExpenses, costMap, statusFilter]);

    return {
        warehouses,
        selectedWarehouseId,
        setSelectedWarehouseId,
        statusFilter,
        setStatusFilter,
        dateRange,
        setDateRange,
        profitabilityData,
        isLoading: loadingWarehouses || loadingCosts || loadingSales || loadingShifts || loadingExpenses
    };
}
