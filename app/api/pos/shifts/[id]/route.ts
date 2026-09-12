import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

        // 1. محاولة استدعاء الدالة المركزية RPC من قاعدة البيانات
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_pos_shift_details', {
            p_shift_id: id
        });

        if (!rpcError && rpcData) {
            return NextResponse.json({ success: true, source: 'rpc', data: rpcData });
        }

        // 2. خط الدفاع الثاني: التجميع المباشر من الجداول لضمان العمل 100% بدون أي انقطاع
        const { data: shift, error: shiftErr } = await supabaseAdmin
            .from('pos_shifts')
            .select(`
                *,
                warehouse:warehouses(id, name, type, location, phone, vehicle_id),
                delegate:partners!delegate_id(id, name, phone, code)
            `)
            .eq('id', id)
            .maybeSingle();

        if (shiftErr || !shift) {
            return NextResponse.json({ success: false, error: 'الوردية غير موجودة أو تم حذفها' }, { status: 404 });
        }

        // جلب بيانات الكاشير / المستخدم
        let cashierName = 'كاشير النظام';
        if (shift.user_id) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, username, email')
                .eq('id', shift.user_id)
                .maybeSingle();
            if (profile) {
                cashierName = profile.full_name || profile.username || profile.email || 'كاشير النظام';
            }
        }

        // جلب الفواتير التابعة للوردية
        const { data: invoices = [] } = await supabaseAdmin
            .from('invoices')
            .select('id, invoice_number, date, created_at, client_name, partner_id, total_amount, tax_amount, taxable_amount, paid_amount, payment_method, status, fleet_operation_id, lines_data')
            .eq('shift_id', id)
            .order('created_at', { ascending: false });

        // تجميع الأصناف المباعة خلال الوردية
        const itemMap = new Map();
        (invoices || []).forEach((inv: any) => {
            const lines = Array.isArray(inv.lines_data) ? inv.lines_data : [];
            lines.forEach((line: any) => {
                const key = line.item_id || line.id || line.name;
                const name = line.name || line.inventory_items?.name || 'صنف';
                const qty = Number(line.quantity || line.qty || 0);
                const price = Number(line.unit_price || line.price || line.selected_price || 0);
                const total = Number(line.total || (qty * price));

                if (!itemMap.has(key)) {
                    itemMap.set(key, { item_id: key, item_name: name, total_quantity: 0, total_amount: 0 });
                }
                const item = itemMap.get(key);
                item.total_quantity += qty;
                item.total_amount += total;
            });
        });

        const itemsSummary = Array.from(itemMap.values()).map(i => ({
            ...i,
            avg_price: i.total_quantity > 0 ? Number((i.total_amount / i.total_quantity).toFixed(2)) : 0
        })).sort((a, b) => b.total_quantity - a.total_quantity);

        // جلب أي سندات قبض مرتبطة بهذه الفواتير
        const invoiceIds = (invoices || []).map((inv: any) => inv.id);
        let receipts: any[] = [];
        if (invoiceIds.length > 0) {
            const { data: rcData } = await supabaseAdmin
                .from('receipt_vouchers')
                .select('id, receipt_number, amount, payment_method, date')
                .in('invoice_id', invoiceIds)
                .order('created_at', { ascending: false });
            receipts = rcData || [];
        }

        const durationMinutes = shift.closed_at
            ? Math.round((new Date(shift.closed_at).getTime() - new Date(shift.opened_at).getTime()) / 60000)
            : Math.round((Date.now() - new Date(shift.opened_at).getTime()) / 60000);

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
                starting_cash: Number(shift.starting_cash || 0),
                expected_cash: Number(shift.expected_cash || 0),
                actual_cash: Number(shift.actual_cash || 0),
                shortage_overage: Number(shift.shortage_overage || 0),
                total_sales: Number(shift.total_sales || 0),
                total_cash_sales: Number(shift.total_cash_sales || 0),
                total_card_sales: Number(shift.total_card_sales || 0),
                total_credit_sales: Number(shift.total_credit_sales || 0)
            },
            bottles: {
                sold: Number(shift.bottles_sold || 0),
                returned: Number(shift.bottles_returned || 0),
                shortage: Number(shift.bottles_shortage || 0)
            },
            invoices_count: invoices.length,
            invoices: invoices.map((inv: any) => ({
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
