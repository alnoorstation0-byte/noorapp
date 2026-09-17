import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvfxxonuxkskrthsnrhu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_UGUED8I6BhPdWNE21OH9Vg_X1NLN3t5';

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

        // 2. خط الدفاع الثاني: استعلام مباشر متوافق تماماً وبأمان تام دون الاعتماد على قيود العلاقات
        let query = supabaseAdmin
            .from('pos_shifts')
            .select('*')
            .order('opened_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        if (delegateId) query = query.eq('delegate_id', delegateId);
        if (fromDate) query = query.gte('opened_at', fromDate);
        if (toDate) query = query.lte('opened_at', toDate);

        const { data: shifts = [], error: shiftErr } = await query;
        if (shiftErr) throw shiftErr;

        // جلب الجداول المرجعية لربط البيانات بأمان تام
        const [whRes, partRes, profRes] = await Promise.all([
            supabaseAdmin.from('warehouses').select('id, name, type'),
            supabaseAdmin.from('partners').select('id, name, phone, code'),
            supabaseAdmin.from('profiles').select('id, full_name, username, email, role')
        ]);

        const whMap = new Map((whRes.data || []).map((w: any) => [w.id, w]));
        const partMap = new Map((partRes.data || []).map((p: any) => [p.id, p]));
        const profMap = new Map((profRes.data || []).map((p: any) => [p.id, p]));

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

            const wh = whMap.get(s.warehouse_id);
            const del = partMap.get(s.delegate_id);
            const prof = profMap.get(s.user_id);
            const cashierName = del?.name || prof?.full_name || prof?.username || prof?.email || 'كاشير النظام';

            return {
                id: s.id,
                status: s.status,
                opened_at: s.opened_at,
                closed_at: s.closed_at,
                warehouse_id: s.warehouse_id,
                warehouse_name: wh?.name || 'مستودع غير محدد',
                warehouse_type: wh?.type || 'main',
                delegate_id: s.delegate_id,
                delegate_name: cashierName,
                cashier_name: cashierName,
                user_id: s.user_id,
                user_name: prof?.full_name || prof?.email || '',
                starting_cash: starting,
                expected_cash: expectedCash,
                actual_cash: Number(s.actual_cash || 0),
                shortage_overage: isClosed ? Number(s.shortage_overage || 0) : (Number(s.actual_cash || 0) - expectedCash),
                total_sales: totalSales,
                total_cash_sales: totalCash,
                total_card_sales: totalCard,
                total_credit_sales: totalCredit,
                total_liters_sold: Number(s.total_liters_sold || 0),
                meter_total_amount: Number(s.meter_total_amount || 0),
                meter_sales_variance: Number(s.meter_sales_variance || 0),
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
        let { warehouse_id, delegate_id, user_id, starting_cash } = body;

        if (!warehouse_id) {
            return NextResponse.json(
                { success: false, error: 'يرجى تحديد منفذ البيع / المستودع' },
                { status: 400 }
            );
        }

        // 0. التحقق من المستخدم والمندوب والربط التلقائي بين profiles و partners
        let resolvedUserId = user_id;
        if (!resolvedUserId) {
            const { data: defProf } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
            if (defProf) resolvedUserId = defProf.id;
        }

        // إذا تم تمرير delegate_id لكنه في الحقيقة profile.id أو العكس
        let resolvedDelegateId = delegate_id || null;

        // فحص هل delegate_id موجود في partners
        if (resolvedDelegateId) {
            const { data: checkPart } = await supabaseAdmin.from('partners').select('id, name').eq('id', resolvedDelegateId).maybeSingle();
            if (!checkPart) {
                // ربما هذا هو معرف بروفايل في profiles
                const { data: checkProf } = await supabaseAdmin.from('profiles').select('id, full_name, role, linked_partner_id').eq('id', resolvedDelegateId).maybeSingle();
                if (checkProf) {
                    resolvedUserId = checkProf.id;
                    resolvedDelegateId = checkProf.linked_partner_id || null;
                }
            }
        }

        // إذا كان delegate_id لا يزال فارغاً لكن لدينا user_id: استخراج الشريك المربوط بالبروفايل
        if (!resolvedDelegateId && resolvedUserId) {
            const { data: prof } = await supabaseAdmin.from('profiles').select('id, full_name, role, linked_partner_id').eq('id', resolvedUserId).maybeSingle();
            if (prof?.linked_partner_id) {
                resolvedDelegateId = prof.linked_partner_id;
            } else if (prof) {
                // إنشاء أو إيجاد شريك موظف تلقائياً لربط كافة العمليات المحاسبية والعهد به
                const empName = (prof.full_name || 'موظف').trim();
                const { data: existingP } = await supabaseAdmin.from('partners').select('id').ilike('name', empName).maybeSingle();
                if (existingP) {
                    resolvedDelegateId = existingP.id;
                } else {
                    const { data: newP } = await supabaseAdmin.from('partners').insert([{
                        code: String(Date.now()).slice(-4),
                        name: empName,
                        partner_type: 'موظف',
                        job_role: prof.role || 'موظف',
                        is_active: true
                    }]).select('id').single();
                    if (newP) resolvedDelegateId = newP.id;
                }
                if (resolvedDelegateId) {
                    await supabaseAdmin.from('profiles').update({ linked_partner_id: resolvedDelegateId }).eq('id', prof.id);
                }
            }
        }

        // 🔒 1. فحص المستودع: هل توجد أي وردية نشطة مفتوحة حالياً في هذا المستودع؟
        const { data: existingWarehouseShifts, error: whCheckErr } = await supabaseAdmin
            .from('pos_shifts')
            .select('id, status, opened_at, starting_cash, warehouse_id, delegate_id, user_id')
            .eq('warehouse_id', warehouse_id)
            .eq('status', 'open')
            .limit(1);

        if (whCheckErr) {
            console.error('Error checking existing shift:', whCheckErr);
        }

        const existingWarehouseShift = existingWarehouseShifts?.[0];

        if (existingWarehouseShift) {
            const { data: wh } = await supabaseAdmin.from('warehouses').select('name').eq('id', warehouse_id).maybeSingle();
            let delegateName = 'مبيعات مباشرة';
            if (existingWarehouseShift.delegate_id) {
                const { data: del } = await supabaseAdmin.from('partners').select('name').eq('id', existingWarehouseShift.delegate_id).maybeSingle();
                if (del) delegateName = del.name;
            } else if (existingWarehouseShift.user_id) {
                const { data: usr } = await supabaseAdmin.from('profiles').select('full_name').eq('id', existingWarehouseShift.user_id).maybeSingle();
                if (usr?.full_name) delegateName = usr.full_name;
            }
            const whName = wh?.name || 'هذا المستودع';
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

        // 🔒 2. فحص المندوب: هل المندوب / الموظف لديه وردية مفتوحة بالفعل في أي مستودع آخر؟
        // 👑 يُستثنى من ذلك المدراء والمشرفون (super_admin, admin, manager) لتمكينهم من إدارة وفتح ورديات مستقلة لعدة فروع
        let isManagerOrAdminUser = false;
        if (resolvedUserId) {
            const { data: userProf } = await supabaseAdmin.from('profiles').select('role').eq('id', resolvedUserId).maybeSingle();
            if (userProf && ['super_admin', 'admin', 'manager'].includes(userProf.role)) {
                isManagerOrAdminUser = true;
            }
        }

        if (resolvedDelegateId && !isManagerOrAdminUser) {
            const { data: existingDelegateShifts, error: delCheckErr } = await supabaseAdmin
                .from('pos_shifts')
                .select('id, status, opened_at, warehouse_id')
                .eq('delegate_id', resolvedDelegateId)
                .eq('status', 'open')
                .limit(1);

            if (delCheckErr) {
                console.error('Error checking delegate shift:', delCheckErr);
            }

            const existingDelegateShift = existingDelegateShifts?.[0];

            if (existingDelegateShift) {
                const { data: delWh } = await supabaseAdmin.from('warehouses').select('name').eq('id', existingDelegateShift.warehouse_id).maybeSingle();
                const whName = delWh?.name || 'منفذ آخر';
                return NextResponse.json(
                    {
                        success: false,
                        code: 'DELEGATE_HAS_OPEN_SHIFT',
                        error: `⛔ لا يمكن فتح الوردية! هذا الموظف / المندوب لديه بالفعل وردية نشطة مفتوحة حالياً في (${whName}). المسؤول شخص واحد ولا يمكن تشغيل ورديتين لنفس الشخص، يجب تقفيل ورديته السابقة أولاً.`,
                        existing_shift: existingDelegateShift
                    },
                    { status: 409 }
                );
            }
        }

        // 🔄 3.5. فحص استئناف الوردية في نفس اليوم لنفس المندوب أو البائع
        const now = new Date();
        const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayStartIso = `${todayDateStr}T00:00:00.000Z`;

        let closedShiftQuery = supabaseAdmin
            .from('pos_shifts')
            .select('*')
            .eq('warehouse_id', warehouse_id)
            .eq('status', 'closed')
            .gte('opened_at', todayStartIso)
            .order('closed_at', { ascending: false })
            .limit(1);

        if (resolvedDelegateId) {
            closedShiftQuery = closedShiftQuery.eq('delegate_id', resolvedDelegateId);
        } else if (resolvedUserId) {
            closedShiftQuery = closedShiftQuery.is('delegate_id', null).eq('user_id', resolvedUserId);
        }

        const { data: closedShiftsToday, error: closedShiftErr } = await closedShiftQuery;
        if (closedShiftErr) {
            console.error('Error checking closed shift for today:', closedShiftErr);
        }

        const existingClosedShift = closedShiftsToday?.[0];

        // 🌟 إذا وُجدت وردية مغلقة اليوم لنفس الموظف والمنفذ: استئناف نفس الوردية!
        if (existingClosedShift) {
            const shiftNumberDisplay = existingClosedShift.shift_number ? `#${existingClosedShift.shift_number}` : (existingClosedShift.id ? `#${existingClosedShift.id.slice(0, 8)}` : '');
            
            const updatePayload: any = {
                status: 'open',
                closed_at: null
            };

            if (Number(starting_cash) > 0 && (!existingClosedShift.starting_cash || existingClosedShift.starting_cash === 0)) {
                updatePayload.starting_cash = Number(starting_cash);
            }

            const { data: resumedShift, error: resumeErr } = await supabaseAdmin
                .from('pos_shifts')
                .update(updatePayload)
                .eq('id', existingClosedShift.id)
                .select('*')
                .single();

            if (resumeErr) {
                console.error('Error resuming shift:', resumeErr);
                throw resumeErr;
            }

            // إرفاق بيانات المستودع والشريك
            const [whR, delR] = await Promise.all([
                supabaseAdmin.from('warehouses').select('id, name, type').eq('id', warehouse_id).maybeSingle(),
                resolvedDelegateId ? supabaseAdmin.from('partners').select('id, name, phone, code').eq('id', resolvedDelegateId).maybeSingle() : Promise.resolve({ data: null })
            ]);

            const enrichedResumed = {
                ...resumedShift,
                warehouse: whR.data || null,
                delegate: delR.data || null
            };

            return NextResponse.json({
                success: true,
                is_resumed: true,
                message: `تم استئناف وردية اليوم السابقة للموظف بنجاح (${shiftNumberDisplay}) لتكملة مبيعات اليوم عليها دون ازدواجية 🔄`,
                data: enrichedResumed
            });
        }

        // 4. إنشاء الوردية بأمان تام لموظف / مندوب جديد
        const { data: newShift, error: insertError } = await supabaseAdmin
            .from('pos_shifts')
            .insert([{
                warehouse_id,
                delegate_id: resolvedDelegateId || null,
                user_id: resolvedUserId,
                starting_cash: Number(starting_cash) || 0,
                status: 'open',
                opened_at: new Date().toISOString()
            }])
            .select('*')
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

        // ⛽ تهيئة قراءات عدادات المضخات آلياً للوردية الجديدة
        try {
            await supabaseAdmin.rpc('get_or_init_shift_pump_readings', { p_shift_id: newShift.id });
        } catch (pumpErr) {
            console.warn('Error initializing pump readings:', pumpErr);
        }

        // إرفاق بيانات المستودع والشريك
        const [whR, delR] = await Promise.all([
            supabaseAdmin.from('warehouses').select('id, name, type').eq('id', warehouse_id).maybeSingle(),
            resolvedDelegateId ? supabaseAdmin.from('partners').select('id, name, phone, code').eq('id', resolvedDelegateId).maybeSingle() : Promise.resolve({ data: null })
        ]);

        const enrichedNew = {
            ...newShift,
            warehouse: whR.data || null,
            delegate: delR.data || null
        };

        return NextResponse.json({
            success: true,
            is_resumed: false,
            message: 'تم فتح الوردية وربط الموظف بها بنجاح 🚀',
            data: enrichedNew
        });

    } catch (error: any) {
        console.error('Error in POST /api/pos/shifts:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'حدث خطأ أثناء فتح الوردية' },
            { status: 500 }
        );
    }
}


