"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/authGuard';
import { useToast } from '@/lib/toast-context';
import { ACC } from '@/lib/account-ids';
import { MAIN_WAREHOUSE_ID, syncAllWarehouseBalances } from '@/lib/inventory_engine';
import { emitTableChange, useRealtimeListener } from '@/lib/useRealtimeSync';
import { sendSystemNotification } from '@/lib/notificationService';

export interface PosOutletInventoryItem {
    itemId: string;
    itemName: string;
    unit: string;
    costPrice: number;
    defaultPrice: number;
    currentStock: number;
    soldQty: number;
    returnQty: number;
    wasteQty: number;
    shortageQty: number;
}

export interface PosSettlementPayload {
    shiftId: string;
    shiftNumber?: string;
    warehouseId: string;
    warehouseName: string;
    warehouseLocation?: string;
    cashierId?: string | null;
    cashierName: string;
    cashierPhone?: string;
    settlementDate: string;
    // Cash Settlement
    cashAmount: number;
    safeBankAccId: string;
    expectedCash: number;
    cashShortageOverage: number;
    shortageAction: 'debt_on_cashier' | 'shortage_expense' | 'rounding' | 'none';
    totalSales?: number;
    cashSales?: number;
    cardSales?: number;
    creditSales?: number;
    totalExpenses?: number;
    totalCollections?: number;
    startingCash?: number;
    // Bottles Custody
    bottlesSold: number;
    bottlesReturned: number;
    bottlesShortage: number;
    returnBottlesToMain: boolean;
    // Inventory Settlement
    inventoryReturns: Array<{
        itemId: string;
        itemName: string;
        costPrice: number;
        returnQty: number;
        wasteQty: number;
        shortageQty: number;
        notes?: string;
    }>;
    notes: string;
}

export function usePosSettlementsLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { profile } = useAuth();

    // Filters
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled' | 'shortage'>('all');

    // Modals
    const [selectedShiftForSettlement, setSelectedShiftForSettlement] = useState<any | null>(null);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [selectedShiftForPrint, setSelectedShiftForPrint] = useState<any | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // 1. Fetch Warehouses (Sales Outlets)
    const warehousesQuery = useQuery({
        queryKey: ['pos_settlements_warehouses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('warehouses')
                .select('id, name, type, location, phone, manager_name, is_active')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 5
    });

    // 1.5. Fetch Partners & Profiles for Cashiers
    const cashiersQuery = useQuery({
        queryKey: ['pos_settlements_cashiers'],
        queryFn: async () => {
            const [partRes, profRes] = await Promise.all([
                supabase.from('partners').select('id, name, phone, code'),
                supabase.from('profiles').select('id, full_name, phone_number, role, linked_partner_id')
            ]);
            return {
                partners: partRes.data || [],
                profiles: profRes.data || []
            };
        },
        staleTime: 1000 * 60 * 5
    });

    // 2. Fetch POS Shifts (بأمان تام دون أخطاء قيود العلاقات PGRST200)
    const shiftsQuery = useQuery({
        queryKey: ['pos_settlements_shifts', dateFrom, dateTo, selectedWarehouseId],
        queryFn: async () => {
            let q = supabase
                .from('pos_shifts')
                .select('*')
                .order('opened_at', { ascending: false });

            if (selectedWarehouseId !== 'all') {
                q = q.eq('warehouse_id', selectedWarehouseId);
            }
            if (dateFrom) {
                q = q.gte('opened_at', `${dateFrom}T00:00:00Z`);
            }
            if (dateTo) {
                q = q.lte('opened_at', `${dateTo}T23:59:59Z`);
            }

            const { data, error } = await q;
            if (error) {
                console.warn('Error fetching pos settlements shifts:', error);
                return [];
            }
            return data || [];
        },
        staleTime: 0
    });

    // 3. Fetch Invoices for Shifts
    const invoicesQuery = useQuery({
        queryKey: ['pos_settlements_invoices', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase
                .from('invoices')
                .select(`
                    id, invoice_number, date, total_amount, paid_amount, status,
                    warehouse_id, delegate_id, shift_id, payment_method, lines_data, created_at
                `)
                .not('status', 'in', '("ملغي","cancelled","draft","مسودة")');

            if (dateFrom) q = q.gte('date', dateFrom);
            if (dateTo) q = q.lte('date', dateTo);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 4. Fetch Receipts for Shifts
    const receiptsQuery = useQuery({
        queryKey: ['pos_settlements_receipts', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase
                .from('receipt_vouchers')
                .select(`
                    id, receipt_number, date, amount, payment_method, 
                    shift_id, delegate_id, status, notes, safe_bank_acc_id
                `)
                .in('status', ['معتمد', 'مرحل', 'posted', 'approved']);

            if (dateFrom) q = q.gte('date', dateFrom);
            if (dateTo) q = q.lte('date', dateTo);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 5. Fetch Shift Expenses
    const expensesQuery = useQuery({
        queryKey: ['pos_settlements_expenses', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase
                .from('expenses')
                .select(`
                    id, exp_date, total_price, paid_amount, 
                    shift_id, description, main_category
                `);

            if (dateFrom) q = q.gte('exp_date', dateFrom);
            if (dateTo) q = q.lte('exp_date', dateTo);

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 6. Fetch Warehouse Inventory Balances
    const warehouseInventoryQuery = useQuery({
        queryKey: ['pos_settlements_warehouse_inventory'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .select(`
                    id, warehouse_id, item_id, quantity,
                    item:inventory_items!item_id(id, name, unit, cost_price, default_price, code)
                `);
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 7. Fetch Cash / Bank Accounts
    const accountsQuery = useQuery({
        queryKey: ['pos_settlements_cash_accounts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('accounts')
                .select('id, code, name, account_type')
                .or('code.ilike.122%,code.ilike.129%,code.ilike.121%')
                .order('code');
            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 10
    });

    // 8. Fetch Active Inventory Items
    const inventoryItemsQuery = useQuery({
        queryKey: ['pos_settlements_active_items'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('id, name, unit, current_quantity, cost_price, default_price, code')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 5
    });

    // 🔄 Realtime listeners
    useRealtimeListener(
        ['pos_shifts', 'invoices', 'receipt_vouchers', 'expenses', 'warehouse_inventory'],
        () => {
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_shifts'] });
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_invoices'] });
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_receipts'] });
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_expenses'] });
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_warehouse_inventory'] });
        }
    );

    const rawShifts = shiftsQuery.data || [];
    const rawInvoices = invoicesQuery.data || [];
    const rawReceipts = receiptsQuery.data || [];
    const rawExpenses = expensesQuery.data || [];
    const rawInventory = warehouseInventoryQuery.data || [];

    // Helper to check payment methods
    const isCashMethod = (method: string) => {
        if (!method) return true;
        const m = method.toLowerCase();
        return m.includes('كاش') || m.includes('نقدي') || m === 'cash';
    };

    const isCardMethod = (method: string) => {
        if (!method) return false;
        const m = method.toLowerCase();
        return m.includes('شبك') || m.includes('مدى') || m.includes('بطاق') || m.includes('بنك') || m === 'card';
    };

    const isCreditMethod = (method: string) => {
        if (!method) return false;
        const m = method.toLowerCase();
        return m.includes('آجل') || m.includes('اجل') || m === 'credit';
    };

    // Process & Aggregate All Data by Shift
    const processedSettlements = useMemo(() => {
        const whMap = new Map((warehousesQuery.data || []).map((w: any) => [w.id, w]));
        const partnerMap = new Map((cashiersQuery.data?.partners || []).map((p: any) => [p.id, p]));
        const profileMap = new Map((cashiersQuery.data?.profiles || []).map((p: any) => [p.id, p]));

        // Group invoices by shift
        const invoicesByShift = new Map<string, any[]>();
        rawInvoices.forEach(inv => {
            if (inv.shift_id) {
                const list = invoicesByShift.get(inv.shift_id) || [];
                list.push(inv);
                invoicesByShift.set(inv.shift_id, list);
            }
        });

        // Group receipts by shift (separate sales payments vs settlement handovers)
        const receiptsByShift = new Map<string, { collections: any[], settlements: any[] }>();
        rawReceipts.forEach(rc => {
            if (rc.shift_id) {
                const current = receiptsByShift.get(rc.shift_id) || { collections: [], settlements: [] };
                const isSettlement = String(rc.receipt_number || '').includes('SETTLE') || 
                                     String(rc.notes || '').includes('تسوية عهدة') || 
                                     String(rc.notes || '').includes('توريد نقدية');
                if (isSettlement) {
                    current.settlements.push(rc);
                } else {
                    current.collections.push(rc);
                }
                receiptsByShift.set(rc.shift_id, current);
            }
        });

        // Group expenses by shift
        const expensesByShift = new Map<string, any[]>();
        rawExpenses.forEach(exp => {
            if (exp.shift_id) {
                const list = expensesByShift.get(exp.shift_id) || [];
                list.push(exp);
                expensesByShift.set(exp.shift_id, list);
            }
        });

        // Map outlet inventory items
        const inventoryByWh = new Map<string, any[]>();
        rawInventory.forEach(inv => {
            const list = inventoryByWh.get(inv.warehouse_id) || [];
            list.push(inv);
            inventoryByWh.set(inv.warehouse_id, list);
        });

        return rawShifts.map(shift => {
            const shiftInvoices = invoicesByShift.get(shift.id) || [];
            const shiftReceipts = receiptsByShift.get(shift.id) || { collections: [], settlements: [] };
            const shiftExpenses = expensesByShift.get(shift.id) || [];
            const whItems = inventoryByWh.get(shift.warehouse_id) || [];

            // 1. Sales breakdown
            let totalSales = Number(shift.total_sales || 0);
            let cashSales = Number(shift.total_cash_sales || 0);
            let cardSales = Number(shift.total_card_sales || 0);
            let creditSales = Number(shift.total_credit_sales || 0);

            // Recompute from invoices if shift totals were zero
            if (totalSales === 0 && shiftInvoices.length > 0) {
                let invTotal = 0;
                let invCash = 0;
                let invCard = 0;
                let invCredit = 0;

                shiftInvoices.forEach(inv => {
                    const amt = Number(inv.total_amount || 0);
                    invTotal += amt;
                    if (isCardMethod(inv.payment_method)) invCard += amt;
                    else if (isCreditMethod(inv.payment_method)) invCredit += amt;
                    else invCash += amt;
                });

                totalSales = invTotal;
                cashSales = invCash;
                cardSales = invCard;
                creditSales = invCredit;
            }

            // 2. Collections (Customer payments made at the outlet)
            const totalCollections = shiftReceipts.collections.reduce((sum, rc) => sum + Number(rc.amount || 0), 0);

            // 3. Expenses paid from the cash drawer
            const totalExpenses = shiftExpenses.reduce((sum, exp) => sum + Number(exp.paid_amount || exp.total_price || 0), 0);

            // 4. Starting Cash
            const startingCash = Number(shift.starting_cash || 0);

            // 5. Expected Cash in Drawer
            // Formula: Starting Drawer Cash + Cash Sales + Customer Collections - Drawer Expenses
            const netCashDue = startingCash + cashSales + totalCollections - totalExpenses;

            // 6. Actual Cash Counted & Handed Over to Treasury
            const handedOverCash = shiftReceipts.settlements.reduce((sum, rc) => sum + Number(rc.amount || 0), 0);
            const actualCash = Number(shift.actual_cash !== null && shift.actual_cash !== undefined ? shift.actual_cash : handedOverCash);

            // 7. Drawer Shortage / Overage
            // Positive = Overage (زيادة), Negative = Shortage (عجز)
            const shortageOverage = Number(shift.shortage_overage !== null && shift.shortage_overage !== undefined 
                ? shift.shortage_overage 
                : (actualCash - netCashDue));

            // Remaining Cash Custody waiting to be remitted
            const remainingCashCustody = Math.max(0, netCashDue - handedOverCash);

            // 8. Bottles Custody
            const startingBottles = Number(shift.starting_bottles || 0);
            const bottlesSold = Number(shift.bottles_sold || 0);
            const bottlesReturned = Number(shift.bottles_returned || 0);
            const bottlesShortage = Number(shift.bottles_shortage || 0);
            const expectedBottles = startingBottles + bottlesReturned - bottlesSold;
            const actualBottles = Number(shift.actual_bottles || expectedBottles);

            // 9. Outlet Inventory Items
            const itemSoldMap = new Map<string, number>();
            shiftInvoices.forEach(inv => {
                if (Array.isArray(inv.lines_data)) {
                    inv.lines_data.forEach((line: any) => {
                        const itId = line.item_id || line.id;
                        if (itId) {
                            const q = Number(line.quantity || line.qty || 0);
                            itemSoldMap.set(itId, (itemSoldMap.get(itId) || 0) + q);
                        }
                    });
                }
            });

            const outletInventoryItems: PosOutletInventoryItem[] = whItems.map(wi => {
                const it = wi.item || {};
                const soldQty = itemSoldMap.get(wi.item_id) || 0;
                const currentStock = Number(wi.quantity || 0);
                return {
                    itemId: wi.item_id,
                    itemName: it.name || 'صنف',
                    unit: it.unit || 'عدد',
                    costPrice: Number(it.cost_price || 0),
                    defaultPrice: Number(it.default_price || 0),
                    currentStock,
                    soldQty,
                    returnQty: 0,
                    wasteQty: 0,
                    shortageQty: 0
                };
            });

            const totalRemainingStock = outletInventoryItems.reduce((sum, it) => sum + it.currentStock, 0);

            // 10. Settlement Status
            let settlementStatus: 'open' | 'pending' | 'settled' | 'partial' = 'pending';
            if (shift.status === 'open') {
                settlementStatus = 'open';
            } else if (shift.status === 'settled' || (handedOverCash >= netCashDue && netCashDue > 0)) {
                settlementStatus = 'settled';
            } else if (handedOverCash > 0 && handedOverCash < netCashDue) {
                settlementStatus = 'partial';
            } else {
                settlementStatus = 'pending';
            }

            const whData = whMap.get(shift.warehouse_id) as any;
            const delData = partnerMap.get(shift.delegate_id) as any;
            const profData = profileMap.get(shift.user_id) as any;
            const cashierName = delData?.name || profData?.full_name || whData?.manager_name || 'الكاشير';
            const cashierPhone = delData?.phone || profData?.phone_number || '';

            return {
                id: shift.id,
                shiftNumber: `SH-${shift.id.slice(0, 6).toUpperCase()}`,
                openedAt: shift.opened_at,
                closedAt: shift.closed_at,
                status: shift.status,
                settlementStatus,
                warehouseId: shift.warehouse_id,
                warehouseName: whData?.name || 'منفذ بيع غير معروف',
                warehouseType: whData?.type || 'pos',
                warehouseLocation: whData?.location || '',
                warehousePhone: whData?.phone || '',
                cashierId: shift.delegate_id || shift.user_id,
                cashierName,
                cashierPhone,
                startingCash,
                totalSales,
                cashSales,
                cardSales,
                creditSales,
                totalCollections,
                totalExpenses,
                netCashDue,
                actualCash,
                handedOverCash,
                remainingCashCustody,
                shortageOverage,
                // Bottles
                startingBottles,
                bottlesSold,
                bottlesReturned,
                bottlesShortage,
                expectedBottles,
                actualBottles,
                // Inventory
                outletInventoryItems,
                totalRemainingStock,
                // Raw relations
                invoices: shiftInvoices,
                collections: shiftReceipts.collections,
                settlementReceipts: shiftReceipts.settlements,
                expenses: shiftExpenses,
                closingNotes: shift.closing_notes
            };
        });
    }, [rawShifts, rawInvoices, rawReceipts, rawExpenses, rawInventory, warehousesQuery.data, cashiersQuery.data]);

    // Filtered settlements based on UI controls
    const filteredSettlements = useMemo(() => {
        return processedSettlements.filter(item => {
            // Warehouse filter
            if (selectedWarehouseId !== 'all' && item.warehouseId !== selectedWarehouseId) {
                return false;
            }

            // Status filter
            if (statusFilter === 'pending' && (item.settlementStatus === 'settled')) return false;
            if (statusFilter === 'settled' && item.settlementStatus !== 'settled') return false;
            if (statusFilter === 'shortage' && item.shortageOverage >= 0 && item.remainingCashCustody <= 0) return false;

            // Global search
            if (globalSearch.trim()) {
                const s = globalSearch.toLowerCase().trim();
                const matchWh = item.warehouseName.toLowerCase().includes(s);
                const matchCashier = item.cashierName.toLowerCase().includes(s);
                const matchNum = item.shiftNumber.toLowerCase().includes(s);
                const matchPhone = item.cashierPhone.includes(s) || item.warehousePhone.includes(s);
                if (!matchWh && !matchCashier && !matchNum && !matchPhone) {
                    return false;
                }
            }

            return true;
        });
    }, [processedSettlements, selectedWarehouseId, statusFilter, globalSearch]);

    // KPI Totals across all shifts
    const totals = useMemo(() => {
        return filteredSettlements.reduce((acc, curr) => {
            acc.totalShifts += 1;
            if (curr.settlementStatus === 'settled') acc.settledShifts += 1;
            else if (curr.settlementStatus === 'open') acc.openShifts += 1;
            else acc.pendingShifts += 1;

            acc.totalSales += curr.totalSales;
            acc.cashSales += curr.cashSales;
            acc.cardSales += curr.cardSales;
            acc.creditSales += curr.creditSales;
            acc.totalCollections += curr.totalCollections;
            acc.totalExpenses += curr.totalExpenses;
            acc.totalNetCashDue += curr.netCashDue;
            acc.totalHandedOverCash += curr.handedOverCash;
            acc.totalRemainingCash += curr.remainingCashCustody;
            acc.totalShortage += curr.shortageOverage < 0 ? Math.abs(curr.shortageOverage) : 0;
            acc.totalOverage += curr.shortageOverage > 0 ? curr.shortageOverage : 0;
            acc.totalStock += curr.totalRemainingStock;
            acc.bottlesSold += curr.bottlesSold;
            acc.bottlesReturned += curr.bottlesReturned;

            return acc;
        }, {
            totalShifts: 0,
            settledShifts: 0,
            pendingShifts: 0,
            openShifts: 0,
            totalSales: 0,
            cashSales: 0,
            cardSales: 0,
            creditSales: 0,
            totalCollections: 0,
            totalExpenses: 0,
            totalNetCashDue: 0,
            totalHandedOverCash: 0,
            totalRemainingCash: 0,
            totalShortage: 0,
            totalOverage: 0,
            totalStock: 0,
            bottlesSold: 0,
            bottlesReturned: 0
        });
    }, [filteredSettlements]);

    // 🚀 Execute Settlement Mutation
    const executeSettlementMutation = useMutation({
        mutationFn: async (payload: PosSettlementPayload) => {
            const {
                shiftId,
                shiftNumber,
                warehouseId,
                warehouseName,
                warehouseLocation,
                cashierId,
                cashierName,
                cashierPhone,
                safeBankAccId,
                cashAmount,
                expectedCash,
                cashShortageOverage,
                shortageAction,
                totalSales,
                cashSales,
                cardSales,
                creditSales,
                totalExpenses,
                totalCollections,
                startingCash,
                inventoryReturns,
                bottlesReturned,
                returnBottlesToMain,
                settlementDate,
                notes
            } = payload;

            const date = settlementDate || new Date().toISOString().split('T')[0];
            const targetSafeAcc = safeBankAccId || ACC.CASH_BOX;

            let createdReceiptVoucherId: string | null = null;
            let createdJournalHeaderId: string | null = null;

            // Details string formatters
            const cashierInfo = `${cashierName}${cashierPhone ? ` (${cashierPhone})` : ''}`;
            const shiftLabel = shiftNumber || `وردية #${shiftId.slice(0, 8)}`;
            const locationInfo = warehouseLocation ? ` - ${warehouseLocation}` : '';
            const salesStr = totalSales !== undefined 
                ? ` | مبيعات: ${Number(totalSales).toFixed(2)} ر.س (كاش: ${Number(cashSales || 0).toFixed(2)} | شبكة: ${Number(cardSales || 0).toFixed(2)}${creditSales ? ` | آجل: ${Number(creditSales).toFixed(2)}` : ''})` 
                : '';
            const expStr = totalExpenses !== undefined && totalExpenses > 0 ? ` | مصاريف: ${Number(totalExpenses).toFixed(2)} ر.س` : '';
            const shortageStr = cashShortageOverage < 0 
                ? ` | عجز: ${Math.abs(cashShortageOverage).toFixed(2)} ر.س (${shortageAction === 'debt_on_cashier' ? 'ذمة على الكاشير' : 'فروق تسوية'})` 
                : (cashShortageOverage > 0 ? ` | زيادة: ${Number(cashShortageOverage).toFixed(2)} ر.س` : '');
            const extraNotes = notes ? ` | ملاحظات: ${notes}` : '';

            // ─────────────────────────────────────────────────────────────
            // 1. CASH SETTLEMENT: Insert Receipt Voucher & Journal
            // ─────────────────────────────────────────────────────────────
            if (cashAmount > 0) {
                const receiptNumber = `RV-SETTLE-POS-${Date.now().toString().slice(-6)}`;
                const voucherNotes = `توريد نقدية تسوية عهدة منفذ [${warehouseName}${locationInfo}] | ${shiftLabel} | المسئول: ${cashierInfo}${salesStr}${expStr} | المبلغ المورد للخزينة: ${cashAmount.toFixed(2)} ر.س${shortageStr}${extraNotes}`;

                // A. Insert into receipt_vouchers
                const { data: rvData, error: rvErr } = await supabase
                    .from('receipt_vouchers')
                    .insert([{
                        receipt_number: receiptNumber,
                        date,
                        amount: cashAmount,
                        payment_method: 'نقدي (كاش)',
                        partner_id: cashierId || null,
                        delegate_id: cashierId || null,
                        shift_id: shiftId,
                        safe_bank_acc_id: targetSafeAcc,
                        partner_acc_id: ACC.EMPLOYEE_CUSTODY, // 125 ذمة موظف/مندوب
                        status: 'معتمد',
                        notes: voucherNotes
                    }])
                    .select('id')
                    .single();

                if (rvErr) {
                    console.error("Receipt Voucher Insert Error:", rvErr);
                    throw new Error(`فشل تسجيل سند القبض: ${rvErr.message}`);
                }
                createdReceiptVoucherId = rvData?.id || null;

                // B. Insert Journal Header
                const journalHeaderDesc = `إخلاء وتوريد نقدية عهدة منفذ [${warehouseName}${locationInfo}] | ${shiftLabel} | المسئول: ${cashierInfo}${salesStr}${expStr} | المبلغ المورد للخزينة: ${cashAmount.toFixed(2)} ر.س${shortageStr}${extraNotes}`;

                const { data: jhData, error: jhErr } = await supabase
                    .from('journal_headers')
                    .insert([{
                        entry_date: date,
                        description: journalHeaderDesc,
                        status: 'posted',
                        v_type: 'تسوية عهدة منفذ',
                        reference_id: createdReceiptVoucherId || shiftId
                    }])
                    .select('id')
                    .single();

                if (jhErr) {
                    console.error("Journal Header Insert Error:", jhErr);
                    throw new Error(`فشل إنشاء قيد تسوية النقدية: ${jhErr.message}`);
                }
                createdJournalHeaderId = jhData?.id || null;

                // C. Insert Journal Lines (Double Entry)
                const journalLinesToInsert: any[] = [
                    // Debit: Main Treasury / Bank (122 / 129)
                    {
                        header_id: createdJournalHeaderId,
                        account_id: targetSafeAcc,
                        partner_id: null,
                        delegate_id: cashierId || null,
                        debit: cashAmount,
                        credit: 0,
                        notes: `توريد نقدية للخزينة من عهدة منفذ [${warehouseName}] | ${shiftLabel} | المسئول: ${cashierInfo}`
                    },
                    // Credit: Cashier Custody (125)
                    {
                        header_id: createdJournalHeaderId,
                        account_id: ACC.EMPLOYEE_CUSTODY,
                        partner_id: cashierId || null,
                        delegate_id: cashierId || null,
                        debit: 0,
                        credit: cashAmount,
                        notes: `إخلاء عهدة كاشير منفذ [${warehouseName}] بالتوريد للخزينة | ${shiftLabel} | المسئول: ${cashierInfo} | المبلغ: ${cashAmount.toFixed(2)} ر.س`
                    }
                ];

                // Shortage handling in accounting (Double Entry)
                if (cashShortageOverage < 0 && shortageAction !== 'none') {
                    const absShortage = Math.abs(cashShortageOverage);
                    if (shortageAction === 'debt_on_cashier') {
                        journalLinesToInsert.push({
                            header_id: createdJournalHeaderId,
                            account_id: ACC.EMPLOYEE_ADVANCES || '128',
                            partner_id: cashierId || null,
                            delegate_id: cashierId || null,
                            debit: absShortage,
                            credit: 0,
                            notes: `إثبات عجز عهدة صندوق منفذ [${warehouseName}] كذمة مستحقة على الكاشير ${cashierInfo} | ${shiftLabel}`
                        });
                        journalLinesToInsert.push({
                            header_id: createdJournalHeaderId,
                            account_id: ACC.EMPLOYEE_CUSTODY,
                            partner_id: cashierId || null,
                            delegate_id: cashierId || null,
                            debit: 0,
                            credit: absShortage,
                            notes: `إقفال عجز عهدة منفذ [${warehouseName}] بذمة الكاشير ${cashierInfo} | ${shiftLabel}`
                        });
                    } else if (shortageAction === 'shortage_expense' || shortageAction === 'rounding') {
                        journalLinesToInsert.push({
                            header_id: createdJournalHeaderId,
                            account_id: ACC.ROUNDING_DIFF || 'd5e827b1-4f1a-4c2f-8a03-8d6e7f123456',
                            partner_id: null,
                            delegate_id: cashierId || null,
                            debit: absShortage,
                            credit: 0,
                            notes: `تسجيل فروقات/عجز تسوية صندوق منفذ [${warehouseName}] كمصروف | ${shiftLabel} | المسئول: ${cashierInfo}`
                        });
                        journalLinesToInsert.push({
                            header_id: createdJournalHeaderId,
                            account_id: ACC.EMPLOYEE_CUSTODY,
                            partner_id: cashierId || null,
                            delegate_id: cashierId || null,
                            debit: 0,
                            credit: absShortage,
                            notes: `إقفال فرق تسوية عهدة منفذ [${warehouseName}] | ${shiftLabel} | المسئول: ${cashierInfo}`
                        });
                    }
                }

                const { error: jlErr } = await supabase.from('journal_lines').insert(journalLinesToInsert);
                if (jlErr) {
                    console.error("Journal Lines Insert Error:", jlErr);
                    throw new Error(`فشل تسجيل قيود التسوية: ${jlErr.message}`);
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 2. INVENTORY SETTLEMENT: Returns, Waste, and Adjustments
            // ─────────────────────────────────────────────────────────────
            const validReturns = (inventoryReturns || []).filter(r => 
                (r.returnQty > 0 || r.wasteQty > 0 || r.shortageQty > 0)
            );

            for (const ret of validReturns) {
                // A. Return surplus goods to Main Warehouse
                if (ret.returnQty > 0) {
                    const retTxNumber = `RET-POS-${Date.now().toString().slice(-6)}`;
                    await supabase.from('inventory_transactions').insert([{
                        transaction_number: retTxNumber,
                        transaction_date: date,
                        type: 'transfer',
                        quantity: ret.returnQty,
                        item_id: ret.itemId,
                        unit_price: ret.costPrice || 0,
                        total_price: (ret.returnQty * (ret.costPrice || 0)),
                        status: 'approved',
                        warehouse_id: warehouseId,
                        destination_warehouse_id: MAIN_WAREHOUSE_ID,
                        shift_id: shiftId,
                        notes: `إرجاع فائض بضاعة من منفذ ${warehouseName} إلى المستودع الرئيسي | ${shiftLabel} | الكاشير: ${cashierInfo} (${ret.notes || ''})`
                    }]);
                }

                // B. Waste / Damaged stock
                if (ret.wasteQty > 0) {
                    const wasteTxNumber = `WST-POS-${Date.now().toString().slice(-6)}`;
                    await supabase.from('inventory_transactions').insert([{
                        transaction_number: wasteTxNumber,
                        transaction_date: date,
                        type: 'waste',
                        quantity: ret.wasteQty,
                        item_id: ret.itemId,
                        unit_price: ret.costPrice || 0,
                        total_price: (ret.wasteQty * (ret.costPrice || 0)),
                        status: 'approved',
                        warehouse_id: warehouseId,
                        shift_id: shiftId,
                        notes: `تسجيل تالف/هالك بضاعة أثناء تشغيل منفذ ${warehouseName} | ${shiftLabel} | الكاشير: ${cashierInfo}`
                    }]);
                }

                // C. Inventory Shortage
                if (ret.shortageQty > 0) {
                    const shortTxNumber = `SHT-POS-${Date.now().toString().slice(-6)}`;
                    await supabase.from('inventory_transactions').insert([{
                        transaction_number: shortTxNumber,
                        transaction_date: date,
                        type: 'out',
                        quantity: ret.shortageQty,
                        item_id: ret.itemId,
                        unit_price: ret.costPrice || 0,
                        total_price: (ret.shortageQty * (ret.costPrice || 0)),
                        status: 'approved',
                        warehouse_id: warehouseId,
                        shift_id: shiftId,
                        notes: `تسجيل عجز جرد مخزني في منفذ ${warehouseName} | ${shiftLabel} | الكاشير: ${cashierInfo}`
                    }]);
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 3. BOTTLE RETURNS TO MAIN WAREHOUSE
            // ─────────────────────────────────────────────────────────────
            if (returnBottlesToMain && bottlesReturned > 0) {
                const btlTxNumber = `BTL-RET-${Date.now().toString().slice(-6)}`;
                try {
                    await supabase.from('inventory_transactions').insert([{
                        transaction_number: btlTxNumber,
                        transaction_date: date,
                        type: 'transfer',
                        quantity: bottlesReturned,
                        item_id: 'c5efa035-c8d5-4d13-bf33-7c7cd854f393',
                        status: 'approved',
                        warehouse_id: warehouseId,
                        destination_warehouse_id: MAIN_WAREHOUSE_ID,
                        shift_id: shiftId,
                        notes: `توريد عبوات ومستلزمات مستردة (${bottlesReturned} قارورة) من منفذ ${warehouseName} للمستودع الرئيسي`
                    }]);
                } catch (btlErr) {
                    console.warn("Bottle return insert error:", btlErr);
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 4. SYNC WAREHOUSE BALANCES
            // ─────────────────────────────────────────────────────────────
            try {
                await syncAllWarehouseBalances();
            } catch (syncErr) {
                console.warn("Sync balances warning after POS settlement:", syncErr);
            }

            // ─────────────────────────────────────────────────────────────
            // 5. UPDATE POS SHIFT RECORD
            // ─────────────────────────────────────────────────────────────
            const { error: shiftUpdateErr } = await supabase
                .from('pos_shifts')
                .update({
                    status: 'settled',
                    actual_cash: (Number(payload.expectedCash) + Number(cashShortageOverage)),
                    shortage_overage: cashShortageOverage,
                    closing_notes: `تمت التسوية بنجاح بتاريخ ${date}. توريد: ${cashAmount} ر.س. ${notes || ''}`
                })
                .eq('id', shiftId);

            if (shiftUpdateErr) {
                console.error("Shift Status Update Error:", shiftUpdateErr);
            }

            // Realtime & Notifications
            emitTableChange('pos_shifts');
            emitTableChange('receipt_vouchers');
            emitTableChange('journal_headers');
            emitTableChange('warehouse_inventory');

            sendSystemNotification({
                title: `🤝 تمت تسوية عهدة منفذ [${warehouseName}]`,
                message: `تم اعتماد تسوية الوردية وتوريد ${cashAmount} ر.س للخزينة بنجاح بواسطة ${profile?.full_name || 'المحاسب'}.`,
                type: 'pos'
            }).catch(() => {});

            return { success: true };
        },
        onSuccess: () => {
            showToast("تم اعتماد تسوية عهدة منفذ البيع وتوريد النقدية بنجاح! 🤝✅", "success");
            setIsSettlementModalOpen(false);
            setSelectedShiftForSettlement(null);
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_shifts'] });
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_receipts'] });
            queryClient.invalidateQueries({ queryKey: ['pos_settlements_warehouse_inventory'] });
        },
        onError: (err: any) => {
            showToast(`فشلت التسوية: ${err.message}`, "error");
        }
    });

    // Export to Excel
    const exportToExcel = () => {
        if (filteredSettlements.length === 0) {
            showToast("لا توجد بيانات لتصديرها!", "warning");
            return;
        }

        const dataToExport = filteredSettlements.map((item, index) => ({
            'م': index + 1,
            'رقم الوردية': item.shiftNumber,
            'منفذ البيع': item.warehouseName,
            'الكاشير / المسؤول': item.cashierName,
            'تاريخ الفتح': new Date(item.openedAt).toLocaleDateString('ar-SA'),
            'تاريخ الإغلاق': item.closedAt ? new Date(item.closedAt).toLocaleDateString('ar-SA') : 'مفتوحة',
            'إجمالي المبيعات': item.totalSales,
            'مبيعات كاش': item.cashSales,
            'مبيعات شبكة (مدى)': item.cardSales,
            'مبيعات آجل': item.creditSales,
            'تحصيلات المنفذ': item.totalCollections,
            'مصروفات الدرج': item.totalExpenses,
            'المطالبة النقدية': item.netCashDue,
            'المورد للخزينة': item.handedOverCash,
            'فروقات الصندوق (عجز/زيادة)': item.shortageOverage,
            'متبقي العهدة': item.remainingCashCustody,
            'فوارغ مباعة': item.bottlesSold,
            'فوارغ مرتجعة': item.bottlesReturned,
            'مخزون المنفذ المتبقي': item.totalRemainingStock,
            'حالة التسوية': item.settlementStatus === 'settled' ? 'تمت التسوية' : (item.settlementStatus === 'open' ? 'مفتوحة' : 'بانتظار التسوية')
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تسويات منافذ البيع");
        XLSX.writeFile(wb, `تسويات_منافذ_البيع_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("تم تصدير ملف الإكسيل بنجاح 📑", "success");
    };

    return {
        // Data & Filters
        filteredSettlements,
        warehouses: warehousesQuery.data || [],
        accounts: accountsQuery.data || [],
        inventoryItems: inventoryItemsQuery.data || [],
        selectedWarehouseId,
        setSelectedWarehouseId,
        globalSearch,
        setGlobalSearch,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        statusFilter,
        setStatusFilter,
        totals,
        isLoading: shiftsQuery.isLoading || warehousesQuery.isLoading,
        exportToExcel,
        // Modals
        selectedShiftForSettlement,
        setSelectedShiftForSettlement,
        isSettlementModalOpen,
        setIsSettlementModalOpen,
        selectedShiftForPrint,
        setSelectedShiftForPrint,
        isPrintModalOpen,
        setIsPrintModalOpen,
        // Mutations
        executeSettlement: executeSettlementMutation.mutate,
        isSettling: executeSettlementMutation.isPending
    };
}
