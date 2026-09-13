import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvfxxonuxkskrthsnrhu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_UGUED8I6BhPdWNE21OH9Vg_X1NLN3t5';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!id) {
            return NextResponse.json({ success: false, error: 'معرف الوردية مطلوب' }, { status: 400 });
        }

        // 1. التجميع المباشر اللحظي من الجداول لضمان دقة الحسابات، تكلفة البضاعة المباعة (COGS)، وهوامش الربح الحقيقية
        const { data: rawShift, error: shiftErr } = await supabaseAdmin
            .from('pos_shifts')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (shiftErr || !rawShift) {
            return NextResponse.json({ success: false, error: 'الوردية غير موجودة أو تم حذفها' }, { status: 404 });
        }

        // جلب بيانات المستودع والمندوب والكاشير بشكل آمن
        const [whRes, delRes, profRes] = await Promise.all([
            rawShift.warehouse_id ? supabaseAdmin.from('warehouses').select('id, name, type, location, phone, vehicle_id').eq('id', rawShift.warehouse_id).maybeSingle() : Promise.resolve({ data: null }),
            rawShift.delegate_id ? supabaseAdmin.from('partners').select('id, name, phone, code').eq('id', rawShift.delegate_id).maybeSingle() : Promise.resolve({ data: null }),
            rawShift.user_id ? supabaseAdmin.from('profiles').select('id, full_name, username, email').eq('id', rawShift.user_id).maybeSingle() : Promise.resolve({ data: null })
        ]);

        const warehouse = whRes.data || null;
        const delegate = delRes.data || null;
        const profile = profRes.data || null;

        let cashierName = delegate?.name || profile?.full_name || profile?.username || profile?.email || 'كاشير النظام';

        const shift = {
            ...rawShift,
            warehouse,
            delegate: delegate || (profile ? { id: profile.id, name: profile.full_name || profile.username } : null),
            cashier: { id: rawShift.user_id, name: cashierName }
        };


        // جلب الفواتير التابعة للوردية (باستثناء الملغاة)
        const { data: invoices = [] } = await supabaseAdmin
            .from('invoices')
            .select('id, invoice_number, date, created_at, client_name, partner_id, total_amount, tax_amount, taxable_amount, paid_amount, payment_method, status, fleet_operation_id, lines_data')
            .eq('shift_id', id)
            .neq('status', 'ملغي')
            .order('created_at', { ascending: false });

        // جلب أسعار التكلفة للأصناف لحساب تكلفة البضاعة المباعة COGS وهامش الربحية
        const { data: invItems } = await supabaseAdmin
            .from('inventory_items')
            .select('id, name, cost_price, default_price');
        const costMap: Record<string, number> = {};
        (invItems || []).forEach((it: any) => {
            costMap[it.id] = Number(it.cost_price || 0);
        });

        // خط دفاع إضافي: جلب أحدث أسعار شراء للأصناف التي ليس لها سعر تكلفة مسجل
        const { data: purchaseTxns } = await supabaseAdmin
            .from('inventory_transactions')
            .select('item_id, unit_price')
            .eq('type', 'in')
            .order('transaction_date', { ascending: false });
        (purchaseTxns || []).forEach((tx: any) => {
            if ((!costMap[tx.item_id] || costMap[tx.item_id] === 0) && tx.unit_price > 0) {
                costMap[tx.item_id] = Number(tx.unit_price);
            }
        });

        // جلب المصروفات التشغيلية المرتبطة بالوردية (باستثناء المحذوفة)
        const { data: shiftExpenses } = await supabaseAdmin
            .from('expenses')
            .select('id, total_price, expense_number, exp_date, description, payment_method')
            .eq('shift_id', id)
            .neq('is_deleted', true);
        const recordedExpenses = (shiftExpenses || []).reduce((sum, e: any) => sum + Number(e.total_price || e.amount || 0), 0);
        const totalExpenses = Math.max(recordedExpenses, Number(shift.total_expenses || 0));

        // تجميع الأصناف المباعة خلال الوردية مع حساب التكلفة وهامش الربح
        let totalCOGS = 0;
        const itemMap = new Map();
        (invoices || []).forEach((inv: any) => {
            const lines = Array.isArray(inv.lines_data) ? inv.lines_data : [];
            lines.forEach((line: any) => {
                const key = line.item_id || line.id || line.name;
                const name = line.name || line.inventory_items?.name || 'صنف';
                const qty = Number(line.quantity || line.qty || 0);
                const price = Number(line.unit_price || line.price || line.selected_price || 0);
                const total = Number(line.total || (qty * price));
                const unitCost = costMap[key] || Number(line.cost_price || 0);
                const lineCOGS = qty * unitCost;
                totalCOGS += lineCOGS;

                if (!itemMap.has(key)) {
                    itemMap.set(key, { 
                        item_id: key, 
                        item_name: name, 
                        total_quantity: 0, 
                        total_amount: 0,
                        unit_cost: unitCost,
                        total_cogs: 0,
                        gross_profit: 0
                    });
                }
                const item = itemMap.get(key);
                item.total_quantity += qty;
                item.total_amount += total;
                item.total_cogs += lineCOGS;
                item.gross_profit += (total - lineCOGS);
            });
        });

        const itemsSummary = Array.from(itemMap.values()).map(i => ({
            ...i,
            avg_price: i.total_quantity > 0 ? Number((i.total_amount / i.total_quantity).toFixed(2)) : 0,
            profit_margin: i.total_amount > 0 ? Number(((i.gross_profit / i.total_amount) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.total_quantity - a.total_quantity);

        // جلب أي سندات قبض مرتبطة بهذه الفواتير
        const invoiceIds = (invoices || []).map((inv: any) => inv.id);
        let receipts: any[] = [];
        if (invoiceIds.length > 0) {
            const { data: rcData } = await supabaseAdmin
                .from('receipt_vouchers')
                .select('id, receipt_number, amount, payment_method, date')
                .in('invoice_id', invoiceIds)
                .neq('status', 'ملغي')
                .order('created_at', { ascending: false });
            receipts = rcData || [];
        }

        const durationMinutes = shift.closed_at
            ? Math.round((new Date(shift.closed_at).getTime() - new Date(shift.opened_at).getTime()) / 60000)
            : Math.round((Date.now() - new Date(shift.opened_at).getTime()) / 60000);

        // حساب إجماليات المبيعات الحية بدقة (نقدي، شبكة، آجل)
        let liveCash = 0, liveCard = 0, liveCredit = 0;
        (invoices || []).forEach((inv: any) => {
            const amt = Number(inv.total_amount || 0);
            const m = (inv.payment_method || '').toLowerCase().trim();
            if (m.includes('آجل') || m.includes('اجل') || m.includes('أجل') || m.includes('ذمم') || m.includes('حساب') || m === 'credit') {
                liveCredit += amt;
            } else if (m.includes('شبك') || m.includes('مدى') || m.includes('بطاق') || m.includes('بنك') || m.includes('تحويل') || m === 'card' || m === 'bank') {
                liveCard += amt;
            } else {
                liveCash += amt;
            }
        });

        const isShiftClosed = shift.status === 'closed' && (Number(shift.total_sales || 0) > 0 || (invoices || []).length === 0);
        const finalTotalCash = isShiftClosed ? Number(shift.total_cash_sales || 0) : liveCash;
        const finalTotalCard = isShiftClosed ? Number(shift.total_card_sales || 0) : liveCard;
        const finalTotalCredit = isShiftClosed ? Number(shift.total_credit_sales || 0) : liveCredit;
        const finalTotalSales = isShiftClosed ? Number(shift.total_sales || 0) : (liveCash + liveCard + liveCredit);
        const startingCash = Number(shift.starting_cash || 0);
        const finalExpectedCash = isShiftClosed ? Number(shift.expected_cash || 0) : (startingCash + liveCash);

        // 💰 احتساب مقاييس الربحية للوردية (المبيعات - تكلفة البضاعة - المصروفات)
        const grossProfit = finalTotalSales - totalCOGS;
        const netProfit = grossProfit - totalExpenses;
        const profitMargin = finalTotalSales > 0 ? Number(((netProfit / finalTotalSales) * 100).toFixed(1)) : 0;

        const fullDossier = {
            shift_id: shift.id,
            status: shift.status,
            opened_at: shift.opened_at,
            closed_at: shift.closed_at,
            created_at: shift.created_at,
            duration_minutes: durationMinutes,
            warehouse: {
                id: shift.warehouse?.id,
                name: shift.warehouse?.name || 'مستودع غير محدد',
                type: shift.warehouse?.type || 'main'
            },
            delegate: {
                id: shift.delegate?.id,
                name: shift.delegate?.name || 'مبيعات مباشرة (بدون مندوب)',
                phone: shift.delegate?.phone,
                code: shift.delegate?.code
            },
            cashier: {
                id: shift.user_id,
                name: cashierName
            },
            financials: {
                starting_cash: startingCash,
                expected_cash: finalExpectedCash,
                actual_cash: Number(shift.actual_cash || 0),
                shortage_overage: shift.status === 'closed' ? Number(shift.shortage_overage || 0) : (Number(shift.actual_cash || 0) - finalExpectedCash),
                total_sales: finalTotalSales,
                total_cash_sales: finalTotalCash,
                total_card_sales: finalTotalCard,
                total_credit_sales: finalTotalCredit,
                total_cogs: totalCOGS,
                total_expenses: totalExpenses,
                gross_profit: grossProfit,
                net_profit: netProfit,
                profit_margin: profitMargin
            },
            bottles: {
                sold: Number(shift.bottles_sold || 0),
                returned: Number(shift.bottles_returned || 0),
                shortage: Number(shift.bottles_shortage || 0)
            },
            invoices_count: (invoices || []).length,
            invoices: (invoices || []).map((inv: any) => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                date: inv.date,
                created_at: inv.created_at,
                client_name: inv.client_name || 'عميل نقدي',
                partner_id: inv.partner_id,
                total_amount: Number(inv.total_amount || 0),
                tax_amount: Number(inv.tax_amount || 0),
                taxable_amount: Number(inv.taxable_amount || 0),
                paid_amount: Number(inv.paid_amount || 0),
                payment_method: inv.payment_method,
                status: inv.status,
                fleet_operation_id: inv.fleet_operation_id,
                lines_count: Array.isArray(inv.lines_data) ? inv.lines_data.length : 0
            })),
            items_summary: itemsSummary,
            receipts: receipts
        };

        return NextResponse.json({ success: true, source: 'direct_computed', data: fullDossier });
    } catch (error: any) {
        console.error('Error in GET /api/pos/shifts/[id]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
