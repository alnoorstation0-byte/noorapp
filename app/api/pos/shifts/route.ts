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

        // جلب عدد الفواتير والمبيعات الحية لكل وردية
        const shiftIds = (shifts || []).map((s: any) => s.id);
        const invoiceCounts: Record<string, number> = {};
        const liveSalesByShift: Record<string, { cash: number; card: number; credit: number; total: number }> = {};

        if (shiftIds.length > 0) {
            const { data: invRows } = await supabaseAdmin
                .from('invoices')
                .select('shift_id, total_amount, payment_method')
                .in('shift_id', shiftIds);

            (invRows || []).forEach((r: any) => {
                if (r.shift_id) {
                    invoiceCounts[r.shift_id] = (invoiceCounts[r.shift_id] || 0) + 1;
                    if (!liveSalesByShift[r.shift_id]) {
                        liveSalesByShift[r.shift_id] = { cash: 0, card: 0, credit: 0, total: 0 };
                    }
                    const amt = Number(r.total_amount || 0);
                    const m = (r.payment_method || '').toLowerCase().trim();
                    if (m.includes('آجل') || m.includes('اجل') || m.includes('أجل') || m.includes('ذمم') || m.includes('حساب') || m === 'credit') {
                        liveSalesByShift[r.shift_id].credit += amt;
                    } else if (m.includes('شبك') || m.includes('مدى') || m.includes('بطاق') || m.includes('بنك') || m.includes('تحويل') || m === 'card' || m === 'bank') {
                        liveSalesByShift[r.shift_id].card += amt;
                    } else {
                        liveSalesByShift[r.shift_id].cash += amt;
                    }
                    liveSalesByShift[r.shift_id].total += amt;
                }
            });
        }

        const formatted = (shifts || []).map((s: any) => {
            const isClosed = s.status === 'closed' && (Number(s.total_sales || 0) > 0 || (invoiceCounts[s.id] || 0) === 0);
            const live = liveSalesByShift[s.id] || { cash: 0, card: 0, credit: 0, total: 0 };
            const starting = Number(s.starting_cash || 0);

            const totalSales = isClosed ? Number(s.total_sales || 0) : live.total;
            const totalCash = isClosed ? Number(s.total_cash_sales || 0) : live.cash;
            const totalCard = isClosed ? Number(s.total_card_sales || 0) : live.card;
            const totalCredit = isClosed ? Number(s.total_credit_sales || 0) : live.credit;
            const expectedCash = isClosed ? Number(s.expected_cash || 0) : (starting + live.cash);

            return {
                id: s.id,
                status: s.status,
                opened_at: s.opened_at,
                closed_at: s.closed_at,
                warehouse_id: s.warehouse_id,
                warehouse_name: s.warehouse?.name || 'مستودع غير محدد',
                warehouse_type: s.warehouse?.type || 'main',
                delegate_id: s.delegate_id,
                delegate_name: s.delegate?.name || 'مبيعات مباشرة (بدون مندوب)',
                starting_cash: starting,
                expected_cash: expectedCash,
                actual_cash: Number(s.actual_cash || 0),
                shortage_overage: isClosed ? Number(s.shortage_overage || 0) : (Number(s.actual_cash || 0) - expectedCash),
                total_sales: totalSales,
                total_cash_sales: totalCash,
                total_card_sales: totalCard,
                total_credit_sales: totalCredit,
                bottles_sold: Number(s.bottles_sold || 0),
                bottles_returned: Number(s.bottles_returned || 0),
                bottles_shortage: Number(s.bottles_shortage || 0),
                invoices_count: invoiceCounts[s.id] || 0
            };
        });

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
            const wh: any = existingWarehouseShift.warehouse;
            const del: any = existingWarehouseShift.delegate;
            const whName = (Array.isArray(wh) ? wh[0]?.name : wh?.name) || 'هذا المستودع';
            const delegateName = (Array.isArray(del) ? del[0]?.name : del?.name) || 'مبيعات مباشرة';
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
                const delWh: any = existingDelegateShift.warehouse;
                const whName = (Array.isArray(delWh) ? delWh[0]?.name : delWh?.name) || 'منفذ آخر';
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

        // 🔄 3.5. فحص استئناف الوردية في نفس اليوم لنفس المندوب أو البائع
        // إذا كان نفس المندوب لديه وردية مغلقة اليوم في نفس المستودع، يتم استئنافها وتكملة المبيعات عليها
        const now = new Date();
        const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayStartIso = `${todayDateStr}T00:00:00.000Z`;

        let closedShiftQuery = supabaseAdmin
            .from('pos_shifts')
            .select(`
                *,
                warehouse:warehouses(id, name, type),
                delegate:partners!delegate_id(id, name, phone, code)
            `)
            .eq('warehouse_id', warehouse_id)
            .eq('status', 'closed')
            .gte('opened_at', todayStartIso)
            .order('closed_at', { ascending: false })
            .limit(1);

        if (delegate_id) {
            closedShiftQuery = closedShiftQuery.eq('delegate_id', delegate_id);
        } else if (resolvedUserId) {
            closedShiftQuery = closedShiftQuery.is('delegate_id', null).eq('user_id', resolvedUserId);
        }

        const { data: closedShiftsToday, error: closedShiftErr } = await closedShiftQuery;
        if (closedShiftErr) {
            console.error('Error checking closed shift for today:', closedShiftErr);
        }

        const existingClosedShift = closedShiftsToday?.[0];

        // 🌟 إذا وُجدت وردية مغلقة اليوم لنفس المندوب والمنفذ: استئناف نفس الوردية!
        if (existingClosedShift) {
            const shiftNumberDisplay = existingClosedShift.shift_number ? `#${existingClosedShift.shift_number}` : (existingClosedShift.id ? `#${existingClosedShift.id.slice(0, 8)}` : '');
            
            // تحديث الوردية لتصبح مفتوحة ومستأنفة
            const updatePayload: any = {
                status: 'open',
                closed_at: null
            };

            // إذا أدخل الكاشير عهدة بداية وكانت السابقة 0
            if (Number(starting_cash) > 0 && (!existingClosedShift.starting_cash || existingClosedShift.starting_cash === 0)) {
                updatePayload.starting_cash = Number(starting_cash);
            }

            const { data: resumedShift, error: resumeErr } = await supabaseAdmin
                .from('pos_shifts')
                .update(updatePayload)
                .eq('id', existingClosedShift.id)
                .select(`
                    *,
                    warehouse:warehouses(id, name, type),
                    delegate:partners!delegate_id(id, name, phone, code)
                `)
                .single();

            if (resumeErr) {
                console.error('Error resuming shift:', resumeErr);
                throw resumeErr;
            }

            return NextResponse.json({
                success: true,
                is_resumed: true,
                message: `تم استئناف وردية اليوم السابقة للمندوب بنجاح (${shiftNumberDisplay}) لتكملة مبيعات اليوم عليها دون ازدواجية 🔄`,
                data: resumedShift
            });
        }

        // 4. إنشاء الوردية بأمان تام لمندوب جديد أو لبداية يوم جديد
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
            is_resumed: false,
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

