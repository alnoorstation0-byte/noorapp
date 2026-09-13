"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/authGuard';
import { useToast } from '@/lib/toast-context';
import { ACC } from '@/lib/account-ids';
import { MAIN_WAREHOUSE_ID, syncAllWarehouseBalances } from '@/lib/inventory_engine';
import { emitTableChange } from '@/lib/useRealtimeSync';
import { sendSystemNotification } from '@/lib/notificationService';

export interface TripInventoryItem {
    itemId: string;
    itemName: string;
    unit: string;
    costPrice: number;
    defaultPrice: number;
    loadedQty: number;
    soldQty: number;
    returnedQty: number;
    wasteQty: number;
    shortageQty: number;
    remainingQty: number;
}

export interface SettlementPayload {
    tripId: string;
    operationNumber: string;
    driverId: string;
    driverName: string;
    driverPhone?: string;
    driverCode?: string;
    vehicleId?: string | null;
    vehiclePlate?: string;
    warehouseId?: string | null;
    warehouseName?: string;
    mainWarehouseId: string;
    settlementDate: string;
    // Cash Settlement
    cashAmount: number;
    safeBankAccId: string;
    netCashDue: number;
    cashShortage: number;
    shortageAction: 'debt_on_delegate' | 'rounding' | 'none';
    totalSales?: number;
    cashSales?: number;
    creditSales?: number;
    totalCollections?: number;
    totalExpenses?: number;
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
    closeTrip: boolean;
    notes: string;
}

export function useDelegateSettlementsLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { profile } = useAuth();

    // Filters
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled' | 'shortage'>('all');

    // Selected trip for settlement modal
    const [selectedTripForSettlement, setSelectedTripForSettlement] = useState<any | null>(null);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

    // Selected trip for print modal
    const [selectedTripForPrint, setSelectedTripForPrint] = useState<any | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // 1. Fetch Fleet Operations (Trips)
    const tripsQuery = useQuery({
        queryKey: ['delegate_settlements_trips', dateFrom, dateTo, profile?.id],
        queryFn: async () => {
            let q = supabase
                .from('fleet_operations')
                .select(`
                    id, 
                    operation_number, 
                    operation_date, 
                    status, 
                    vehicle_id, 
                    driver_id, 
                    warehouse_id, 
                    total_sales, 
                    total_expenses, 
                    inventory_cost, 
                    net_profit, 
                    notes, 
                    created_at,
                    driver:partners!driver_id(id, name, phone, code, partner_type, account_id),
                    vehicle:fleet_vehicles!vehicle_id(id, plate_number, vehicle_model),
                    warehouse:warehouses!warehouse_id(id, name, type)
                `)
                .order('operation_date', { ascending: false });

            if (dateFrom) q = q.gte('operation_date', dateFrom);
            if (dateTo) q = q.lte('operation_date', dateTo);

            if (profile) {
                const role = String(profile.role || '').toLowerCase();
                const isGlobalAdmin = role === 'admin' || role === 'super_admin' || role === 'manager' || profile.is_admin === true;
                if (!isGlobalAdmin && profile.linked_partner_id) {
                    q = q.eq('driver_id', profile.linked_partner_id);
                }
            }

            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile,
        staleTime: 0
    });

    // 2. Fetch Invoices for trips
    const invoicesQuery = useQuery({
        queryKey: ['delegate_settlements_invoices', dateFrom, dateTo],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invoices')
                .select('id, invoice_number, date, total_amount, payment_method, status, fleet_operation_id, delegate_id, lines_data')
                .not('fleet_operation_id', 'is', null)
                .neq('status', 'ملغي');
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 3. Fetch Expenses for trips
    const expensesQuery = useQuery({
        queryKey: ['delegate_settlements_expenses', dateFrom, dateTo],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('expenses')
                .select('id, exp_date, description, total_price, paid_amount, payment_method, fleet_operation_id, payee_id')
                .not('fleet_operation_id', 'is', null)
                .neq('is_deleted', true);
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 4. Fetch Receipts (Customer collections & settlement receipts)
    const receiptsQuery = useQuery({
        queryKey: ['delegate_settlements_receipts', dateFrom, dateTo],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('receipt_vouchers')
                .select('id, receipt_number, date, amount, payment_method, fleet_operation_id, delegate_id, partner_id, status, notes, safe_bank_acc_id')
                .not('fleet_operation_id', 'is', null)
                .neq('status', 'ملغي');
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 5. Fetch Inventory Transactions for trips
    const inventoryTxnsQuery = useQuery({
        queryKey: ['delegate_settlements_inventory_txns', dateFrom, dateTo],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_transactions')
                .select(`
                    id, 
                    transaction_number, 
                    transaction_date, 
                    type, 
                    quantity, 
                    item_id, 
                    unit_price, 
                    total_price, 
                    status, 
                    fleet_operation_id, 
                    warehouse_id, 
                    destination_warehouse_id, 
                    delegate_id, 
                    partner_id,
                    notes,
                    item:inventory_items(id, name, unit, cost_price, default_price)
                `)
                .not('fleet_operation_id', 'is', null);
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 6. Fetch Vehicle Inventory
    const vehicleInventoryQuery = useQuery({
        queryKey: ['delegate_settlements_vehicle_inv'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vehicle_inventory')
                .select(`
                    id, 
                    fleet_operation_id, 
                    item_id, 
                    quantity, 
                    loaded_qty, 
                    sold_qty, 
                    returned_qty, 
                    waste_qty, 
                    shortage_qty,
                    item:inventory_items(id, name, unit, cost_price, default_price)
                `);
            if (error) throw error;
            return data || [];
        },
        staleTime: 0
    });

    // 7. Fetch Active Inventory Items (for adding manual items during settlement)
    const inventoryItemsQuery = useQuery({
        queryKey: ['delegate_settlements_active_items'],
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

    // 8. Fetch Cash/Bank Accounts
    const accountsQuery = useQuery({
        queryKey: ['delegate_settlements_cash_accounts'],
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

    // 9. Fetch Warehouses
    const warehousesQuery = useQuery({
        queryKey: ['delegate_settlements_warehouses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('warehouses')
                .select('id, name, type, vehicle_id')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 10
    });

    const rawTrips = tripsQuery.data || [];
    const rawInvoices = invoicesQuery.data || [];
    const rawExpenses = expensesQuery.data || [];
    const rawReceipts = receiptsQuery.data || [];
    const rawTxns = inventoryTxnsQuery.data || [];
    const rawVehicleInv = vehicleInventoryQuery.data || [];

    // Helper to check if payment method is cash
    const isCashMethod = (method: string) => {
        if (!method) return true;
        const m = method.toLowerCase();
        return m.includes('كاش') || m.includes('نقدي') || m === 'cash';
    };

    // Helper to check if payment method is credit
    const isCreditMethod = (method: string) => {
        if (!method) return false;
        const m = method.toLowerCase();
        return m.includes('آجل') || m.includes('اجل') || m === 'credit';
    };

    // Process & Aggregate All Data by Trip
    const processedSettlements = useMemo(() => {
        // Group invoices by trip
        const invoicesByTrip = new Map<string, any[]>();
        rawInvoices.forEach(inv => {
            if (inv.fleet_operation_id) {
                const list = invoicesByTrip.get(inv.fleet_operation_id) || [];
                list.push(inv);
                invoicesByTrip.set(inv.fleet_operation_id, list);
            }
        });

        // Group expenses by trip
        const expensesByTrip = new Map<string, any[]>();
        rawExpenses.forEach(exp => {
            if (exp.fleet_operation_id) {
                const list = expensesByTrip.get(exp.fleet_operation_id) || [];
                list.push(exp);
                expensesByTrip.set(exp.fleet_operation_id, list);
            }
        });

        // Group receipts by trip (separate customer collections vs settlement handovers)
        const receiptsByTrip = new Map<string, { collections: any[], settlements: any[] }>();
        rawReceipts.forEach(rc => {
            if (rc.fleet_operation_id) {
                const current = receiptsByTrip.get(rc.fleet_operation_id) || { collections: [], settlements: [] };
                const isSettlement = String(rc.receipt_number || '').includes('SETTLE') || 
                                     String(rc.notes || '').includes('تسوية عهدة') || 
                                     String(rc.notes || '').includes('توريد نقدية');
                if (isSettlement) {
                    current.settlements.push(rc);
                } else {
                    current.collections.push(rc);
                }
                receiptsByTrip.set(rc.fleet_operation_id, current);
            }
        });

        // Group inventory transactions by trip
        const txnsByTrip = new Map<string, any[]>();
        rawTxns.forEach(tx => {
            if (tx.fleet_operation_id) {
                const list = txnsByTrip.get(tx.fleet_operation_id) || [];
                list.push(tx);
                txnsByTrip.set(tx.fleet_operation_id, list);
            }
        });

        // Group vehicle inventory by trip
        const vInvByTrip = new Map<string, any[]>();
        rawVehicleInv.forEach(vi => {
            if (vi.fleet_operation_id) {
                const list = vInvByTrip.get(vi.fleet_operation_id) || [];
                list.push(vi);
                vInvByTrip.set(vi.fleet_operation_id, list);
            }
        });

        return rawTrips.map((trip: any) => {
            const tripInvoices = invoicesByTrip.get(trip.id) || [];
            const tripExpenses = expensesByTrip.get(trip.id) || [];
            const tripReceipts = receiptsByTrip.get(trip.id) || { collections: [], settlements: [] };
            const tripTxns = txnsByTrip.get(trip.id) || [];
            const tripVInv = vInvByTrip.get(trip.id) || [];

            // 1. Sales breakdown
            let totalSales = 0;
            let cashSales = 0;
            let creditSales = 0;
            let otherSales = 0;

            tripInvoices.forEach(inv => {
                const amt = Number(inv.total_amount || 0);
                totalSales += amt;
                if (isCashMethod(inv.payment_method)) {
                    cashSales += amt;
                } else if (isCreditMethod(inv.payment_method)) {
                    creditSales += amt;
                } else {
                    otherSales += amt;
                }
            });

            // 2. Collections during trip
            const totalCollections = tripReceipts.collections.reduce((s, r) => s + Number(r.amount || 0), 0);

            // 3. Expenses paid by delegate
            const totalExpenses = tripExpenses.reduce((s, e) => s + Number(e.paid_amount || e.total_price || 0), 0);

            // 4. Cash settlements handed over to company safe
            const handedOverCash = tripReceipts.settlements.reduce((s, r) => s + Number(r.amount || 0), 0);

            // 5. Net cash custody due from delegate
            // Net cash due = (Cash sales + Collections from clients) - Expenses paid by delegate
            const netCashDue = Math.max(0, cashSales + totalCollections - totalExpenses);
            const remainingCashCustody = Math.max(0, netCashDue - handedOverCash);
            const cashDifference = handedOverCash - netCashDue;

            // 6. Inventory breakdown per item
            const itemMap = new Map<string, TripInventoryItem>();

            // Populate from vehicle_inventory if available
            tripVInv.forEach(vi => {
                const itm = vi.item || {};
                const loaded = Number(vi.loaded_qty || vi.quantity || 0);
                const sold = Number(vi.sold_qty || 0);
                const returned = Number(vi.returned_qty || 0);
                const waste = Number(vi.waste_qty || 0);
                const shortage = Number(vi.shortage_qty || 0);
                const rem = Math.max(0, loaded - sold - returned - waste - shortage);

                itemMap.set(vi.item_id, {
                    itemId: vi.item_id,
                    itemName: itm.name || 'صنف',
                    unit: itm.unit || 'حبة',
                    costPrice: Number(itm.cost_price || 0),
                    defaultPrice: Number(itm.default_price || 0),
                    loadedQty: loaded,
                    soldQty: sold,
                    returnedQty: returned,
                    wasteQty: waste,
                    shortageQty: shortage,
                    remainingQty: rem
                });
            });

            // Correlate with inventory_transactions
            tripTxns.forEach(tx => {
                const itmId = tx.item_id;
                if (!itmId) return;
                const existing = itemMap.get(itmId) || {
                    itemId: itmId,
                    itemName: tx.item?.name || 'صنف',
                    unit: tx.item?.unit || 'حبة',
                    costPrice: Number(tx.unit_price || tx.item?.cost_price || 0),
                    defaultPrice: Number(tx.item?.default_price || 0),
                    loadedQty: 0,
                    soldQty: 0,
                    returnedQty: 0,
                    wasteQty: 0,
                    shortageQty: 0,
                    remainingQty: 0
                };

                const qty = Number(tx.quantity || 0);
                if (tx.type === 'out' || tx.type === 'transfer_out') {
                    // Loaded onto vehicle
                    if (tripVInv.length === 0) existing.loadedQty += qty;
                } else if (tx.type === 'in' || tx.type === 'transfer_in') {
                    // Returned to main warehouse
                    if (tripVInv.length === 0) existing.returnedQty += qty;
                } else if (tx.type === 'waste') {
                    if (tripVInv.length === 0) existing.wasteQty += qty;
                } else if (tx.type === 'sales_deduction') {
                    if (tripVInv.length === 0) existing.soldQty += qty;
                }

                if (tripVInv.length === 0) {
                    existing.remainingQty = Math.max(0, existing.loadedQty - existing.soldQty - existing.returnedQty - existing.wasteQty);
                }

                itemMap.set(itmId, existing);
            });

            // Also check invoice lines for sold quantities if tripTxns had no sales_deduction
            if (tripVInv.length === 0) {
                tripInvoices.forEach(inv => {
                    if (Array.isArray(inv.lines_data)) {
                        inv.lines_data.forEach((line: any) => {
                            const lineItemId = line.item_id;
                            if (lineItemId && itemMap.has(lineItemId)) {
                                const itmObj = itemMap.get(lineItemId)!;
                                if (itmObj.soldQty === 0) {
                                    itmObj.soldQty += Number(line.quantity || line.qty || 0);
                                    itmObj.remainingQty = Math.max(0, itmObj.loadedQty - itmObj.soldQty - itmObj.returnedQty - itmObj.wasteQty);
                                }
                            }
                        });
                    }
                });
            }

            const inventoryItems = Array.from(itemMap.values());
            const totalLoadedQty = inventoryItems.reduce((s, i) => s + i.loadedQty, 0);
            const totalSoldQty = inventoryItems.reduce((s, i) => s + i.soldQty, 0);
            const totalReturnedQty = inventoryItems.reduce((s, i) => s + i.returnedQty, 0);
            const totalWasteQty = inventoryItems.reduce((s, i) => s + i.wasteQty, 0);
            const totalRemainingQty = inventoryItems.reduce((s, i) => s + i.remainingQty, 0);

            // Settlement Status
            const isFullySettled = (trip.status === 'مغلق' || (remainingCashCustody <= 0.05 && totalRemainingQty === 0 && (totalLoadedQty > 0 || totalSales > 0)));
            const isPartiallySettled = !isFullySettled && (handedOverCash > 0 || totalReturnedQty > 0);
            const settlementStatus: 'settled' | 'partial' | 'pending' = isFullySettled ? 'settled' : (isPartiallySettled ? 'partial' : 'pending');

            return {
                id: trip.id,
                operationNumber: trip.operation_number,
                date: trip.operation_date,
                status: trip.status || 'مفتوح',
                settlementStatus,
                driverId: trip.driver_id,
                driverName: trip.driver?.name || 'بدون مندوب',
                driverPhone: trip.driver?.phone || '',
                driverCode: trip.driver?.code || '',
                driverPartner: trip.driver,
                vehicleId: trip.vehicle_id,
                vehiclePlate: trip.vehicle?.plate_number || 'بدون سيارة',
                vehicleModel: trip.vehicle?.vehicle_model || '',
                warehouseId: trip.warehouse_id,
                warehouseName: trip.warehouse?.name || 'المستودع الرئيسي',
                // Sales
                totalSales,
                cashSales,
                creditSales,
                otherSales,
                invoicesCount: tripInvoices.length,
                // Receipts & Collections
                totalCollections,
                handedOverCash,
                settlementReceipts: tripReceipts.settlements,
                // Expenses
                totalExpenses,
                // Balances
                netCashDue,
                remainingCashCustody,
                cashDifference,
                // Inventory
                inventoryItems,
                totalLoadedQty,
                totalSoldQty,
                totalReturnedQty,
                totalWasteQty,
                totalRemainingQty
            };
        });
    }, [rawTrips, rawInvoices, rawExpenses, rawReceipts, rawTxns, rawVehicleInv]);

    // Filter by Search & Status Tab
    const filteredSettlements = useMemo(() => {
        let res = processedSettlements;

        // Status Filter Tab
        if (statusFilter === 'pending') {
            res = res.filter(ts => ts.settlementStatus === 'pending' || ts.settlementStatus === 'partial');
        } else if (statusFilter === 'settled') {
            res = res.filter(ts => ts.settlementStatus === 'settled');
        } else if (statusFilter === 'shortage') {
            res = res.filter(ts => ts.remainingCashCustody > 0 || ts.totalRemainingQty > 0);
        }

        // Global Text Search
        if (globalSearch.trim()) {
            const s = globalSearch.toLowerCase().trim();
            res = res.filter(ts =>
                ts.driverName.toLowerCase().includes(s) ||
                String(ts.operationNumber).toLowerCase().includes(s) ||
                ts.vehiclePlate.toLowerCase().includes(s) ||
                (ts.driverPhone && ts.driverPhone.includes(s))
            );
        }

        return res;
    }, [processedSettlements, statusFilter, globalSearch]);

    // KPI Totals across all trips
    const totals = useMemo(() => {
        return processedSettlements.reduce((acc, curr) => {
            acc.totalTrips += 1;
            if (curr.settlementStatus === 'settled') acc.settledTrips += 1;
            else acc.pendingTrips += 1;

            acc.totalSales += curr.totalSales;
            acc.cashSales += curr.cashSales;
            acc.creditSales += curr.creditSales;
            acc.totalCollections += curr.totalCollections;
            acc.totalExpenses += curr.totalExpenses;
            acc.totalNetCashDue += curr.netCashDue;
            acc.totalHandedOverCash += curr.handedOverCash;
            acc.totalRemainingCash += curr.remainingCashCustody;
            acc.totalRemainingItems += curr.totalRemainingQty;

            return acc;
        }, {
            totalTrips: 0,
            settledTrips: 0,
            pendingTrips: 0,
            totalSales: 0,
            cashSales: 0,
            creditSales: 0,
            totalCollections: 0,
            totalExpenses: 0,
            totalNetCashDue: 0,
            totalHandedOverCash: 0,
            totalRemainingCash: 0,
            totalRemainingItems: 0
        });
    }, [processedSettlements]);

    // 🚀 Execute Settlement Mutation
    const executeSettlementMutation = useMutation({
        mutationFn: async (payload: SettlementPayload) => {
            const {
                tripId,
                operationNumber,
                driverId,
                driverName,
                driverPhone,
                driverCode,
                vehicleId,
                vehiclePlate,
                warehouseId,
                warehouseName,
                safeBankAccId,
                cashAmount,
                netCashDue,
                cashShortage,
                shortageAction,
                totalSales,
                cashSales,
                creditSales,
                totalCollections,
                totalExpenses,
                inventoryReturns,
                closeTrip,
                settlementDate,
                notes,
                mainWarehouseId
            } = payload;

            const date = settlementDate || new Date().toISOString().split('T')[0];
            const targetMainWh = mainWarehouseId || MAIN_WAREHOUSE_ID;
            const targetSafeAcc = safeBankAccId || ACC.CASH_BOX;

            let createdReceiptVoucherId: string | null = null;
            let createdJournalHeaderId: string | null = null;

            // Details string formatters
            const driverInfo = `${driverName}${driverPhone ? ` (${driverPhone})` : ''}`;
            const vehicleInfo = vehiclePlate ? ` | مركبة: ${vehiclePlate}` : '';
            const salesSummary = totalSales !== undefined ? ` | المبيعات: ${Number(totalSales).toFixed(2)} ر.س` : '';
            const expSummary = totalExpenses !== undefined && totalExpenses > 0 ? ` | المصروفات: ${Number(totalExpenses).toFixed(2)} ر.س` : '';
            const shortageSummary = cashShortage > 0 
                ? ` | العجز: ${cashShortage.toFixed(2)} ر.س (${shortageAction === 'debt_on_delegate' ? 'تسجيل ذمة' : 'فرق تسوية'})` 
                : '';
            const extraNotes = notes ? ` | ملاحظات: ${notes}` : '';

            // ─────────────────────────────────────────────────────────────
            // 1. CASH SETTLEMENT: Insert Receipt Voucher & Cash Journal
            // ─────────────────────────────────────────────────────────────
            if (cashAmount > 0) {
                const receiptNumber = `RV-SETTLE-${operationNumber}-${Date.now().toString().slice(-4)}`;
                const voucherNotes = `توريد نقدية تسوية عهدة رحلة #${operationNumber} | المندوب المسؤول: ${driverInfo}${vehicleInfo}${salesSummary}${expSummary} | المبلغ المورد: ${cashAmount.toFixed(2)} ر.س${shortageSummary}${extraNotes}`;

                // A. Insert into receipt_vouchers
                const { data: rvData, error: rvErr } = await supabase
                    .from('receipt_vouchers')
                    .insert([{
                        receipt_number: receiptNumber,
                        date,
                        amount: cashAmount,
                        payment_method: 'نقدي (كاش)',
                        partner_id: driverId,
                        delegate_id: driverId,
                        fleet_operation_id: tripId,
                        safe_bank_acc_id: targetSafeAcc,
                        partner_acc_id: ACC.EMPLOYEE_CUSTODY, // 125 عهدة مناديب
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

                // B. Insert Journal Header for Cash Handover
                const cashHeaderDesc = `إخلاء وتوريد نقدية عهدة رحلة #${operationNumber} | المندوب المسؤول: ${driverInfo}${vehicleInfo}${salesSummary}${expSummary} | المبلغ المورد: ${cashAmount.toFixed(2)} ر.س${shortageSummary}${extraNotes}`;

                const { data: jhData, error: jhErr } = await supabase
                    .from('journal_headers')
                    .insert([{
                        entry_date: date,
                        description: cashHeaderDesc,
                        status: 'posted',
                        v_type: 'تسوية عهدة',
                        reference_id: createdReceiptVoucherId || tripId,
                        fleet_operation_id: tripId
                    }])
                    .select('id')
                    .single();

                if (jhErr) {
                    console.error("Journal Header Insert Error:", jhErr);
                    throw new Error(`فشل إنشاء قيد تسوية النقدية: ${jhErr.message}`);
                }
                createdJournalHeaderId = jhData?.id || null;

                // C. Insert Journal Lines for Cash Handover (Balanced Double-Entry)
                // Line 1: Debit Cash Box / Bank (الخزينة الرئيسية 122)
                // Line 2: Credit Employee Custody (125 عهدة موظفين ومناديب) linked to driver partner_id!
                const journalLinesToInsert: any[] = [
                    {
                        header_id: createdJournalHeaderId,
                        account_id: targetSafeAcc,
                        partner_id: null,
                        delegate_id: driverId,
                        fleet_operation_id: tripId,
                        debit: cashAmount,
                        credit: 0,
                        notes: `توريد نقدية للخزينة من عهدة رحلة #${operationNumber} | المندوب المسؤول: ${driverInfo}${vehicleInfo}`
                    },
                    {
                        header_id: createdJournalHeaderId,
                        account_id: ACC.EMPLOYEE_CUSTODY,
                        partner_id: driverId, // 🔑 ربط مباشر بمعرف المندوب!
                        delegate_id: driverId,
                        fleet_operation_id: tripId,
                        debit: 0,
                        credit: cashAmount,
                        notes: `إخلاء عهدة نقدية للمندوب ${driverInfo} | رحلة #${operationNumber} | المبلغ المورد: ${cashAmount.toFixed(2)} ر.س`
                    }
                ];

                // If there's a cash shortage and the user chose to record it:
                if (cashShortage > 0) {
                    if (shortageAction === 'debt_on_delegate') {
                        // Debit: 128 سلف وذمم مناديب (partner_id: driverId)
                        // Credit: 125 عهدة مناديب (partner_id: driverId)
                        journalLinesToInsert.push(
                            {
                                header_id: createdJournalHeaderId,
                                account_id: ACC.EMPLOYEE_ADVANCES,
                                partner_id: driverId,
                                delegate_id: driverId,
                                fleet_operation_id: tripId,
                                debit: cashShortage,
                                credit: 0,
                                notes: `إثبات عجز عهدة نقدية كذمة مستحقة على المندوب ${driverInfo} | رحلة #${operationNumber}`
                            },
                            {
                                header_id: createdJournalHeaderId,
                                account_id: ACC.EMPLOYEE_CUSTODY,
                                partner_id: driverId,
                                delegate_id: driverId,
                                fleet_operation_id: tripId,
                                debit: 0,
                                credit: cashShortage,
                                notes: `إقفال عجز عهدة رحلة #${operationNumber} بذمة المندوب ${driverInfo}`
                            }
                        );
                    } else if (shortageAction === 'rounding') {
                        // Debit: 527 تسويات وفروق هللات
                        // Credit: 125 عهدة مناديب
                        journalLinesToInsert.push(
                            {
                                header_id: createdJournalHeaderId,
                                account_id: ACC.ROUNDING_DIFF,
                                partner_id: null,
                                delegate_id: driverId,
                                fleet_operation_id: tripId,
                                debit: cashShortage,
                                credit: 0,
                                notes: `فروق وهللات تسوية عهدة رحلة #${operationNumber} | المندوب: ${driverInfo}`
                            },
                            {
                                header_id: createdJournalHeaderId,
                                account_id: ACC.EMPLOYEE_CUSTODY,
                                partner_id: driverId,
                                delegate_id: driverId,
                                fleet_operation_id: tripId,
                                debit: 0,
                                credit: cashShortage,
                                notes: `إقفال فرق هللات تسوية عهدة رحلة #${operationNumber} للمندوب ${driverInfo}`
                            }
                        );
                    }
                }

                const { error: jlErr } = await supabase.from('journal_lines').insert(journalLinesToInsert);
                if (jlErr) {
                    console.error("Journal Lines Error:", jlErr);
                    throw new Error(`فشل إدخال أسطر القيد: ${jlErr.message}`);
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 2. INVENTORY SETTLEMENT: Return remaining stock to Main Warehouse
            // ─────────────────────────────────────────────────────────────
            const validReturns = (inventoryReturns || []).filter(r => (Number(r.returnQty) > 0 || Number(r.wasteQty) > 0 || Number(r.shortageQty) > 0));

            if (validReturns.length > 0) {
                let totalReturnInventoryValue = 0;
                let totalWasteInventoryValue = 0;
                let totalShortageInventoryValue = 0;

                for (const item of validReturns) {
                    const returnQty = Number(item.returnQty || 0);
                    const wasteQty = Number(item.wasteQty || 0);
                    const shortageQty = Number(item.shortageQty || 0);
                    const costPrice = Number(item.costPrice || 0);

                    // A. Return to Main Warehouse (type: 'in' into targetMainWh)
                    if (returnQty > 0) {
                        const txTotal = returnQty * costPrice;
                        totalReturnInventoryValue += txTotal;

                        const { error: itErr } = await supabase.from('inventory_transactions').insert([{
                            transaction_number: `RET-${operationNumber}-${Date.now().toString().slice(-4)}`,
                            transaction_date: date,
                            type: 'in', // وارد للمستودع الرئيسي
                            quantity: returnQty,
                            item_id: item.itemId,
                            unit_price: costPrice,
                            total_price: txTotal,
                            warehouse_id: targetMainWh, // المستودع الرئيسي المستلم
                            destination_warehouse_id: null,
                            fleet_operation_id: tripId,
                            delegate_id: driverId,
                            partner_id: driverId, // 🔑 ربط بمعرف المندوب!
                            status: 'approved',
                            notes: `إرجاع فائض بضاعة للمستودع الرئيسي من رحلة #${operationNumber} للمندوب ${driverName}`
                        }]);

                        if (itErr) console.warn("Return Txn Error:", itErr);
                    }

                    // B. Damaged / Waste stock (type: 'waste')
                    if (wasteQty > 0) {
                        const wasteTotal = wasteQty * costPrice;
                        totalWasteInventoryValue += wasteTotal;

                        const { error: wErr } = await supabase.from('inventory_transactions').insert([{
                            transaction_number: `WST-${operationNumber}-${Date.now().toString().slice(-4)}`,
                            transaction_date: date,
                            type: 'waste',
                            quantity: wasteQty,
                            item_id: item.itemId,
                            unit_price: costPrice,
                            total_price: wasteTotal,
                            warehouse_id: targetMainWh,
                            fleet_operation_id: tripId,
                            delegate_id: driverId,
                            partner_id: driverId,
                            status: 'approved',
                            notes: `توالف وهدر بضاعة رحلة #${operationNumber} - المندوب: ${driverName}`
                        }]);

                        if (wErr) console.warn("Waste Txn Error:", wErr);
                    }

                    // C. Update vehicle_inventory record if exists, or insert new
                    try {
                        const { data: existingVInv } = await supabase
                            .from('vehicle_inventory')
                            .select('id, loaded_qty, sold_qty, returned_qty, waste_qty, shortage_qty')
                            .eq('fleet_operation_id', tripId)
                            .eq('item_id', item.itemId)
                            .maybeSingle();

                        if (existingVInv) {
                            await supabase.from('vehicle_inventory').update({
                                returned_qty: (Number(existingVInv.returned_qty || 0) + returnQty),
                                waste_qty: (Number(existingVInv.waste_qty || 0) + wasteQty),
                                shortage_qty: (Number(existingVInv.shortage_qty || 0) + shortageQty),
                                quantity: 0,
                                updated_at: new Date().toISOString()
                            }).eq('id', existingVInv.id);
                        } else {
                            await supabase.from('vehicle_inventory').insert([{
                                fleet_operation_id: tripId,
                                item_id: item.itemId,
                                loaded_qty: returnQty + wasteQty + shortageQty,
                                sold_qty: 0,
                                returned_qty: returnQty,
                                waste_qty: wasteQty,
                                shortage_qty: shortageQty,
                                quantity: 0
                            }]);
                        }
                    } catch (viErr) {
                        console.warn("Vehicle Inv Update Warn:", viErr);
                    }
                }

                // D. Generate Journal Entries for Inventory Return
                const totalInvJournalValue = totalReturnInventoryValue + totalWasteInventoryValue + totalShortageInventoryValue;
                if (totalInvJournalValue > 0) {
                    try {
                        const returnedItemsSummary = (inventoryReturns || [])
                            .filter(r => r.returnQty > 0)
                            .map(r => `${r.itemName} (${r.returnQty})`)
                            .join('، ');
                        const wasteItemsSummary = (inventoryReturns || [])
                            .filter(r => r.wasteQty > 0)
                            .map(r => `${r.itemName} (${r.wasteQty})`)
                            .join('، ');
                        const shortageItemsSummary = (inventoryReturns || [])
                            .filter(r => r.shortageQty > 0)
                            .map(r => `${r.itemName} (${r.shortageQty})`)
                            .join('، ');

                        const invHeaderDesc = `إرجاع وتسوية مخزون بضاعة رحلة #${operationNumber} | المندوب المسؤول: ${driverInfo}${vehicleInfo}${returnedItemsSummary ? ` | المرتجع: [${returnedItemsSummary}]` : ''}${wasteItemsSummary ? ` | التوالف: [${wasteItemsSummary}]` : ''}${shortageItemsSummary ? ` | العجز: [${shortageItemsSummary}]` : ''}`;

                        const { data: invJh, error: invJhErr } = await supabase
                            .from('journal_headers')
                            .insert([{
                                entry_date: date,
                                description: invHeaderDesc,
                                status: 'posted',
                                v_type: 'تسوية مخزون',
                                reference_id: tripId,
                                fleet_operation_id: tripId
                            }])
                            .select('id')
                            .single();

                        if (!invJhErr && invJh) {
                            const invLines: any[] = [];

                            // 1. Returned Stock to Main Warehouse:
                            // Debit: ACC.INVENTORY (126 مخزون البضائع بالمستودع الرئيسي)
                            // Credit: ACC.INVENTORY_CUSTODY (130 عهدة مخزون) with partner_id: driverId!
                            if (totalReturnInventoryValue > 0) {
                                invLines.push(
                                    {
                                        header_id: invJh.id,
                                        account_id: ACC.INVENTORY,
                                        partner_id: null,
                                        delegate_id: driverId,
                                        fleet_operation_id: tripId,
                                        debit: totalReturnInventoryValue,
                                        credit: 0,
                                        notes: `إرجاع بضاعة للمستودع الرئيسي من عهدة رحلة #${operationNumber} | المندوب: ${driverInfo}${returnedItemsSummary ? ` [${returnedItemsSummary}]` : ''}`
                                    },
                                    {
                                        header_id: invJh.id,
                                        account_id: ACC.INVENTORY_CUSTODY,
                                        partner_id: driverId, // 🔑 ربط بالمعرف المندوب!
                                        delegate_id: driverId,
                                        fleet_operation_id: tripId,
                                        debit: 0,
                                        credit: totalReturnInventoryValue,
                                        notes: `إخلاء عهدة مخزون بضاعة مرتجعة للمندوب ${driverInfo} | رحلة #${operationNumber}`
                                    }
                                );
                            }

                            // 2. Damaged / Waste stock:
                            // Debit: ACC.WASTE_LOSS (528 خسائر توالف وهدر مخزني)
                            // Credit: ACC.INVENTORY_CUSTODY (130)
                            if (totalWasteInventoryValue > 0) {
                                invLines.push(
                                    {
                                        header_id: invJh.id,
                                        account_id: ACC.WASTE_LOSS,
                                        partner_id: null,
                                        delegate_id: driverId,
                                        fleet_operation_id: tripId,
                                        debit: totalWasteInventoryValue,
                                        credit: 0,
                                        notes: `إثبات توالف وهدر بضاعة رحلة #${operationNumber} | المندوب: ${driverInfo}${wasteItemsSummary ? ` [${wasteItemsSummary}]` : ''}`
                                    },
                                    {
                                        header_id: invJh.id,
                                        account_id: ACC.INVENTORY_CUSTODY,
                                        partner_id: driverId,
                                        delegate_id: driverId,
                                        fleet_operation_id: tripId,
                                        debit: 0,
                                        credit: totalWasteInventoryValue,
                                        notes: `تخفيض عهدة المخزون بالتوالف للمندوب ${driverInfo} | رحلة #${operationNumber}`
                                    }
                                );
                            }

                            // 3. Shortage stock:
                            // Debit: ACC.EMPLOYEE_ADVANCES (128 سلف وذمم مناديب)
                            // Credit: ACC.INVENTORY_CUSTODY (130)
                            if (totalShortageInventoryValue > 0) {
                                invLines.push(
                                    {
                                        header_id: invJh.id,
                                        account_id: ACC.EMPLOYEE_ADVANCES,
                                        partner_id: driverId,
                                        delegate_id: driverId,
                                        fleet_operation_id: tripId,
                                        debit: totalShortageInventoryValue,
                                        credit: 0,
                                        notes: `عجز بضاعة مفقودة محمل كذمة على المندوب ${driverInfo} | رحلة #${operationNumber}${shortageItemsSummary ? ` [${shortageItemsSummary}]` : ''}`
                                    },
                                    {
                                        header_id: invJh.id,
                                        account_id: ACC.INVENTORY_CUSTODY,
                                        partner_id: driverId,
                                        delegate_id: driverId,
                                        fleet_operation_id: tripId,
                                        debit: 0,
                                        credit: totalShortageInventoryValue,
                                        notes: `إقفال عهدة المخزون بالعجز المحمل على المندوب ${driverInfo} | رحلة #${operationNumber}`
                                    }
                                );
                            }

                            if (invLines.length > 0) {
                                await supabase.from('journal_lines').insert(invLines);
                            }
                        }
                    } catch (invJournalErr) {
                        console.warn("Inventory Journal Creation Warn:", invJournalErr);
                    }
                }

                // 🔄 Recalculate and synchronize all warehouse balances so Main Warehouse is immediately updated!
                try {
                    await syncAllWarehouseBalances();
                } catch (syncErr) {
                    console.warn("syncAllWarehouseBalances warning:", syncErr);
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 3. TRIP CLOSURE & STATUS UPDATE
            // ─────────────────────────────────────────────────────────────
            if (closeTrip) {
                const updatedNotes = `${notes ? notes + ' | ' : ''}تمت تسوية العهدة بالكامل وتوريد النقدية والمخزون بتاريخ ${date}`;
                const { error: opErr } = await supabase
                    .from('fleet_operations')
                    .update({
                        status: 'مغلق',
                        notes: updatedNotes
                    })
                    .eq('id', tripId);

                if (opErr) console.warn("Trip Close Error:", opErr);
            }

            // ─────────────────────────────────────────────────────────────
            // 4. REALTIME NOTIFICATIONS & CACHE INVALIDATIONS
            // ─────────────────────────────────────────────────────────────
            emitTableChange('fleet_operations');
            emitTableChange('receipt_vouchers');
            emitTableChange('inventory_transactions');
            emitTableChange('warehouse_inventory');
            emitTableChange('vehicle_inventory');
            emitTableChange('journal_headers');

            sendSystemNotification({
                title: `🤝 تسوية عهدة رحلة #${operationNumber}`,
                message: `تم اعتماد تسوية عهدة المندوب ${driverName} بنجاح، وتوريد مبلغ ${cashAmount.toLocaleString('ar-SA')} ر.س للخزينة وإرجاع البضائع للمستودع الرئيسي.`,
                type: 'finance',
                action_url: `/delegate-settlements`
            }).catch(() => {});

            return {
                success: true,
                receiptVoucherId: createdReceiptVoucherId,
                journalHeaderId: createdJournalHeaderId
            };
        },
        onSuccess: () => {
            showToast("تم اعتماد تسوية العهدة وتوريد النقدية وإرجاع البضائع للمستودع الرئيسي بنجاح! 🚀", "success");
            setIsSettlementModalOpen(false);
            setSelectedTripForSettlement(null);

            // Invalidate all related caches
            queryClient.invalidateQueries({ queryKey: ['delegate_settlements_trips'] });
            queryClient.invalidateQueries({ queryKey: ['delegate_settlements_receipts'] });
            queryClient.invalidateQueries({ queryKey: ['delegate_settlements_inventory_txns'] });
            queryClient.invalidateQueries({ queryKey: ['delegate_settlements_vehicle_inv'] });
            queryClient.invalidateQueries({ queryKey: ['fleet_operations'] });
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse_inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
            queryClient.invalidateQueries({ queryKey: ['accounts_report_with_lines'] });
        },
        onError: (err: any) => {
            showToast(`فشلت التسوية: ${err.message || err}`, "error");
        }
    });

    // 📑 Export to Excel
    const exportToExcel = () => {
        const exportData = filteredSettlements.map(s => ({
            'رقم الرحلة': s.operationNumber,
            'التاريخ': s.date,
            'اسم المندوب': s.driverName,
            'رقم الجوال': s.driverPhone || '---',
            'السيارة': s.vehiclePlate,
            'حالة الرحلة': s.status,
            'حالة التسوية': s.settlementStatus === 'settled' ? 'تمت التسوية' : (s.settlementStatus === 'partial' ? 'تسوية جزئية' : 'بانتظار التسوية'),
            'إجمالي المبيعات (ر.س)': s.totalSales,
            'مبيعات نقدية (ر.س)': s.cashSales,
            'مبيعات آجلة (ر.س)': s.creditSales,
            'التحصيلات النقدية (ر.س)': s.totalCollections,
            'المصروفات المسددة (ر.س)': s.totalExpenses,
            'صافي النقدية المستحقة (ر.س)': s.netCashDue,
            'المورد فعلياً للخزينة (ر.س)': s.handedOverCash,
            'المتبقي في العهدة (ر.س)': s.remainingCashCustody,
            'إجمالي المحمل بالسيارة': s.totalLoadedQty,
            'إجمالي المباع بالسيارة': s.totalSoldQty,
            'إجمالي المرتجع للمستودع': s.totalReturnedQty,
            'المتبقي بالسيارة': s.totalRemainingQty
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تسويات عهد المناديب");
        XLSX.writeFile(wb, `Delegate_Settlements_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        // Data & Filters
        processedSettlements,
        filteredSettlements,
        globalSearch,
        setGlobalSearch,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        statusFilter,
        setStatusFilter,
        totals,
        // Supporting data
        inventoryItems: inventoryItemsQuery.data || [],
        accounts: accountsQuery.data || [],
        warehouses: warehousesQuery.data || [],
        // Modals state
        selectedTripForSettlement,
        setSelectedTripForSettlement,
        isSettlementModalOpen,
        setIsSettlementModalOpen,
        selectedTripForPrint,
        setSelectedTripForPrint,
        isPrintModalOpen,
        setIsPrintModalOpen,
        // Actions
        executeSettlement: executeSettlementMutation.mutate,
        isSettling: executeSettlementMutation.isPending,
        exportToExcel,
        isLoading: tripsQuery.isLoading || invoicesQuery.isLoading || receiptsQuery.isLoading
    };
}
