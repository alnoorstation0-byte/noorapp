import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || null;
        const warehouseId = searchParams.get('warehouse_id') || null;
        const delegateId = searchParams.get('delegate_id') || null;
        const fromDate = searchParams.get('from') || null;
        const toDate = searchParams.get('to') || null;
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // 1. تجربة RPC إذا كان متوفراً
        const { data: rpcShifts, error: rpcError } = await supabaseAdmin.rpc('get_pos_shifts_list', {
            p_status: status,
            p_warehouse_id: warehouseId,
            p_delegate_id: delegateId,
            p_start_date: fromDate,
            p_end_date: toDate,
            p_limit: limit,
            p_offset: offset
        });

        if (!rpcError && rpcShifts) {
            return NextResponse.json({ success: true, source: 'rpc', data: rpcShifts });
        }

        // 2. خط الدفاع الثاني: استعلام مباشر متوافق تماماً مع السكيما
        let query = supabaseAdmin
            .from('pos_shifts')
            .select(`
                *,
                warehouse:warehouses(id, name, type),
                delegate:partners!delegate_id(id, name, phone, code)
            `)
            .order('opened_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        if (delegateId) query = query.eq('delegate_id', delegateId);
        if (fromDate) query = query.gte('opened_at', fromDate);
        if (toDate) query = query.lte('opened_at', toDate);

        const { data: shifts = [], error: shiftErr } = await query;
        if (shiftErr) throw shiftErr;

        // جلب عدد الفواتير لكل وردية
        const shiftIds = (shifts || []).map((s: any) => s.id);
        const invoiceCounts: Record<string, number> = {};
        if (shiftIds.length > 0) {
            const { data: invRows } = await supabaseAdmin
                .from('invoices')
                .select('shift_id')
                .in('shift_id', shiftIds);
            (invRows || []).forEach((r: any) => {
                if (r.shift_id) {
                    invoiceCounts[r.shift_id] = (invoiceCounts[r.shift_id] || 0) + 1;
                }
            });
        }

        const formatted = (shifts || []).map((s: any) => ({
            id: s.id,
            status: s.status,
            opened_at: s.opened_at,
            closed_at: s.closed_at,
            warehouse_id: s.warehouse_id,
            warehouse_name: s.warehouse?.name || 'مستودع غير محدد',
            warehouse_type: s.warehouse?.type || 'main',
            delegate_id: s.delegate_id,
            delegate_name: s.delegate?.name || 'مبيعات مباشرة (بدون مندوب)',
            starting_cash: Number(s.starting_cash || 0),
            expected_cash: Number(s.expected_cash || 0),
            actual_cash: Number(s.actual_cash || 0),
            shortage_overage: Number(s.shortage_overage || 0),
            total_sales: Number(s.total_sales || 0),
            total_cash_sales: Number(s.total_cash_sales || 0),
            total_card_sales: Number(s.total_card_sales || 0),
            total_credit_sales: Number(s.total_credit_sales || 0),
            bottles_sold: Number(s.bottles_sold || 0),
            bottles_returned: Number(s.bottles_returned || 0),
            bottles_shortage: Number(s.bottles_shortage || 0),
            invoices_count: invoiceCounts[s.id] || 0
        }));

        return NextResponse.json({ success: true, source: 'direct_computed', data: formatted });
    } catch (error: any) {
        console.error('Error in GET /api/pos/shifts:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { warehouse_id, delegate_id, user_id, starting_cash } = body;

        if (!warehouse_id) {
            return NextResponse.json(
                { success: false, error: 'يرجى تحديد منفذ البيع / المستودع' },
                { status: 400 }
            );
        }

        // 🔒 1. فحص المستودع: هل توجد أي وردية نشطة مفتوحة حالياً في هذا المستودع؟
        const { data: existingWarehouseShifts, error: whCheckErr } = await supabaseAdmin
            .from('pos_shifts')
            .select(`
                id,
                status,
                opened_at,
                starting_cash,
                warehouse:warehouses(id, name, type),
                delegate:partners!delegate_id(id, name)
            `)
            .eq('warehouse_id', warehouse_id)
            .eq('status', 'open')
            .limit(1);

        if (whCheckErr) {
            console.error('Error checking existing shift:', whCheckErr);
        }

        const existingWarehouseShift = existingWarehouseShifts?.[0];

        if (existingWarehouseShift) {
            const whName = existingWarehouseShift.warehouse?.name || 'هذا المستودع';
            const delegateName = existingWarehouseShift.delegate?.name || 'مبيعات مباشرة';
            return NextResponse.json(
                {
                    success: false,
                    code: 'WAREHOUSE_HAS_OPEN_SHIFT',
                    error: `⛔ لا يمكن فتح أكثر من وردية في نفس المستودع في نفس الوقت! توجد حالياً وردية مفتوحة ونشطة في (${whName}) والمسؤول عنها: (${delegateName}). يجب إنهاء وتقفيل الوردية الحالية أولاً لبدء وردية جديدة.`,
                    existing_shift: existingWarehouseShift
                },
                { status: 409 }
            );
        }

        // 🔒 2. فحص المندوب: هل المندوب المختار لديه وردية مفتوحة بالفعل في أي مستودع آخر؟
        if (delegate_id) {
            const { data: existingDelegateShifts, error: delCheckErr } = await supabaseAdmin
                .from('pos_shifts')
                .select(`
                    id,
                    status,
                    opened_at,
                    warehouse:warehouses(id, name)
                `)
                .eq('delegate_id', delegate_id)
                .eq('status', 'open')
                .limit(1);

            if (delCheckErr) {
                console.error('Error checking delegate shift:', delCheckErr);
            }

            const existingDelegateShift = existingDelegateShifts?.[0];

            if (existingDelegateShift) {
                const whName = existingDelegateShift.warehouse?.name || 'منفذ آخر';
                return NextResponse.json(
                    {
                        success: false,
                        code: 'DELEGATE_HAS_OPEN_SHIFT',
                        error: `⛔ لا يمكن فتح الوردية! هذا المندوب لديه بالفعل وردية نشطة مفتوحة حالياً في (${whName}). المسؤول شخص واحد ولا يمكن تشغيل ورديتين لنفس الشخص، يجب تقفيل ورديته السابقة أولاً.`,
                        existing_shift: existingDelegateShift
                    },
                    { status: 409 }
                );
            }
        }

        // 3. التحقق من المستخدم الحالي (Fallback إلى session/admin إذا لم يتم تمريره)
        let resolvedUserId = user_id;
        if (!resolvedUserId) {
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            if (users && users.length > 0) resolvedUserId = users[0].id;
        }

        // 4. إنشاء الوردية بأمان تام
        const { data: newShift, error: insertError } = await supabaseAdmin
            .from('pos_shifts')
            .insert([{
                warehouse_id,
                delegate_id: delegate_id || null,
                user_id: resolvedUserId,
                starting_cash: Number(starting_cash) || 0,
                status: 'open',
                opened_at: new Date().toISOString()
            }])
            .select(`
                *,
                warehouse:warehouses(id, name, type),
                delegate:partners!delegate_id(id, name, phone, code)
            `)
            .single();

        if (insertError) {
            console.error('Error inserting pos shift:', insertError);
            if (insertError.code === '23505') {
                return NextResponse.json(
                    {
                        success: false,
                        code: 'DUPLICATE_OPEN_SHIFT',
                        error: '⚠️ تعارض: توجد بالفعل وردية نشطة مفتوحة لهذا المستودع أو المندوب. يرجى تحديث الصفحة.'
                    },
                    { status: 409 }
                );
            }
            throw insertError;
        }

        return NextResponse.json({
            success: true,
            message: 'تم فتح الوردية بنجاح 🚀',
            data: newShift
        });

    } catch (error: any) {
        console.error('Error in POST /api/pos/shifts:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'حدث خطأ أثناء فتح الوردية' },
            { status: 500 }
        );
    }
}

