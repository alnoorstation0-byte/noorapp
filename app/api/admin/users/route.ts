import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DEFAULT_SERVICE_ROLE_KEY = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    Buffer.from('c2Jfc2VjcmV0X1BtOUNCWXFNUjVTZG5XdlRrU1Y3SkFfNlpxN2FfZjc=', 'base64').toString('utf-8');

// تهيئة عميل Supabase بصلاحيات الإدارة (Service Role)
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvfxxonuxkskrthsnrhu.supabase.co',
    DEFAULT_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// دالة لتنظيف وتنسيق رقم الجوال للبروفايل
function cleanPhoneNumber(phone?: string) {
    if (!phone) return null;
    let p = String(phone).trim();
    // تحويل الأرقام العربية إلى إنجليزية إن وجدت
    p = p.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    return p || null;
}

// 0. جلب ومزامنة المستخدمين تلقائياً (GET)
export async function GET() {
    try {
        const admin = getSupabaseAdmin();

        // 1️⃣ جلب جميع حسابات المستخدمين من نظام المصادقة Auth
        const { data: authData, error: authError } = await admin.auth.admin.listUsers();
        if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

        const authUsers = authData.users || [];

        // 2️⃣ جلب جميع معرفات الـ Profiles الموجودة حالياً
        const { data: existingProfiles, error: profError } = await admin
            .from('profiles')
            .select('id');
        
        if (profError) return NextResponse.json({ error: profError.message }, { status: 400 });

        const existingProfileIds = new Set((existingProfiles || []).map(p => p.id));

        // 3️⃣ العثور على أي مستخدم موجود في Auth وليس له ملف شخصي في profiles
        const missingUsers = authUsers.filter(u => !existingProfileIds.has(u.id));

        if (missingUsers.length > 0) {
            const profilesToInsert = missingUsers.map(u => ({
                id: u.id,
                email: u.email,
                full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'مستخدم جديد',
                phone_number: u.user_metadata?.phone_number || null,
                role: 'staff',
                is_admin: false,
                is_active: true
            }));

            await admin.from('profiles').upsert(profilesToInsert, { onConflict: 'id' });
        }

        // 4️⃣ جلب وعرض القائمة الكاملة وضمان ربط كافة الموظفين بسجلات شركاء
        const { data: simpleProfiles, error: fetchError } = await admin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 400 });
        }

        const { data: partners } = await admin
            .from('partners')
            .select('id, name, partner_type');

        const partnersMap = new Map((partners || []).map((p: any) => [p.id, p.name]));
        const partnerNameMap = new Map((partners || []).map((p: any) => [p.name.trim().toLowerCase(), p.id]));

        // الربط التلقائي لأي بروفايل غير مربوط
        for (const p of (simpleProfiles || [])) {
            if (!p.linked_partner_id || !partnersMap.has(p.linked_partner_id)) {
                const name = (p.full_name || p.email?.split('@')[0] || 'موظف').trim();
                let matchedPartnerId = partnerNameMap.get(name.toLowerCase());
                if (!matchedPartnerId) {
                    const { data: newPart } = await admin.from('partners').insert([{
                        code: String(Date.now()).slice(-4),
                        name,
                        partner_type: 'موظف',
                        job_role: p.role || 'موظف',
                        phone: p.phone_number || null,
                        is_active: p.is_active !== false
                    }]).select('id').single();
                    if (newPart) {
                        matchedPartnerId = newPart.id;
                        partnersMap.set(newPart.id, name);
                        partnerNameMap.set(name.toLowerCase(), newPart.id);
                    }
                }
                if (matchedPartnerId) {
                    p.linked_partner_id = matchedPartnerId;
                    await admin.from('profiles').update({ linked_partner_id: matchedPartnerId }).eq('id', p.id);
                }
            }
        }

        const allProfiles = (simpleProfiles || []).map((p: any) => ({
            ...p,
            partners: p.linked_partner_id ? { name: partnersMap.get(p.linked_partner_id) || null } : null
        }));

        return NextResponse.json({ 
            success: true, 
            profiles: allProfiles || [],
            syncedCount: missingUsers.length
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'حدث خطأ أثناء المزامنة' }, { status: 500 });
    }
}

// 1. إضافة مستخدم جديد (POST)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, phone, full_name, role, linked_partner_id, permissions, is_active } = body;

        const cleanedPhone = cleanPhoneNumber(phone);

        // 1️⃣ إنشاء الحساب في المصادقة (Auth) عبر البريد وكلمة المرور
        const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                phone_number: cleanedPhone
            }
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2️⃣ ضمان توافق الدور الوظيفي مع قيود قاعدة البيانات
        const allowedRoles = ['super_admin', 'admin', 'manager', 'staff', 'contractor', 'client'];
        const safeRole = allowedRoles.includes(role) ? role : 'staff';
        const isAdminFlag = safeRole === 'super_admin' || safeRole === 'admin';

        // 2.5 ضمان إنشاء وربط سجل شريك (موظف) في جدول partners
        let targetPartnerId = linked_partner_id || null;
        if (!targetPartnerId && full_name) {
            const trimmedName = full_name.trim();
            const { data: existingPart } = await getSupabaseAdmin()
                .from('partners')
                .select('id')
                .ilike('name', trimmedName)
                .maybeSingle();

            if (existingPart) {
                targetPartnerId = existingPart.id;
            } else {
                const { data: newPart } = await getSupabaseAdmin()
                    .from('partners')
                    .insert([{
                        code: String(Date.now()).slice(-4),
                        name: trimmedName,
                        partner_type: 'موظف',
                        job_role: safeRole || 'موظف',
                        phone: cleanedPhone,
                        is_active: is_active ?? true
                    }])
                    .select('id')
                    .single();
                if (newPart) targetPartnerId = newPart.id;
            }
        }

        // 3️⃣ إنشاء أو تحديث بيانات الـ Profile فوراً ومباشرة عبر upsert
        const { error: profileError } = await getSupabaseAdmin()
            .from('profiles')
            .upsert({
                id: userId,
                full_name,
                email,
                phone_number: cleanedPhone,
                role: safeRole,
                linked_partner_id: targetPartnerId,
                permissions: permissions || {},
                is_admin: isAdminFlag,
                is_active: is_active ?? true
            }, { onConflict: 'id' });

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'تم إنشاء المستخدم وحفظ ملفه بنجاح', userId });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'حدث خطأ غير متوقع' }, { status: 500 });
    }
}

// 2. تعديل مستخدم حالي (PUT)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { userId, email, password, phone, full_name, role, linked_partner_id, permissions, is_active } = body;

        if (!userId) return NextResponse.json({ error: 'معرف المستخدم مفقود' }, { status: 400 });

        const cleanedPhone = phone !== undefined ? cleanPhoneNumber(phone) : undefined;

        // 1️⃣ تحديث بيانات المصادقة (Auth)
        const updateParams: any = {};
        if (email) updateParams.email = email;
        if (password) updateParams.password = password;
        if (cleanedPhone !== undefined) {
            updateParams.user_metadata = { phone_number: cleanedPhone };
        }
        
        // إيقاف أو تشغيل الحساب على مستوى Auth نفسه لزيادة الأمان
        if (is_active === false) {
            updateParams.ban_duration = '876000h'; // حظر لـ 100 سنة
        } else if (is_active === true) {
            updateParams.ban_duration = 'none'; // رفع الحظر
        }

        if (Object.keys(updateParams).length > 0) {
            const { error: authError } = await getSupabaseAdmin().auth.admin.updateUserById(userId, updateParams);
            if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 2️⃣ تحديث الـ Profile
        const isAdminFlag = role === 'super_admin' || role === 'admin';
        const { error: profileError } = await getSupabaseAdmin()
            .from('profiles')
            .update({
                full_name,
                ...(email && { email }), // تحديث الإيميل إذا تغير
                ...(phone !== undefined && { phone_number: cleanedPhone }), // تحديث الجوال
                role,
                linked_partner_id: linked_partner_id || null,
                permissions,
                is_admin: isAdminFlag,
                is_active
            })
            .eq('id', userId);

        if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

        return NextResponse.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح' });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'حدث خطأ غير متوقع' }, { status: 500 });
    }
}

// 3. التحكم الجماعي: إيقاف أو تشغيل كل المستخدمين (PATCH)
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { action } = body; // 'suspend_all' أو 'activate_all'

        if (!action) return NextResponse.json({ error: 'الإجراء مفقود' }, { status: 400 });

        const isActivating = action === 'activate_all';
        const banDuration = isActivating ? 'none' : '876000h';

        // 1️⃣ جلب جميع المستخدمين باستثناء السوبر أدمن
        const { data: users, error: fetchError } = await getSupabaseAdmin()
            .from('profiles')
            .select('id, role')
            .neq('role', 'super_admin'); // لا تقم بحظر السوبر أدمن أبداً!

        if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });

        // 2️⃣ تطبيق التغييرات على Auth و Profiles
        const updatePromises = users.map(async (u) => {
            await getSupabaseAdmin().auth.admin.updateUserById(u.id, { ban_duration: banDuration });
            await getSupabaseAdmin().from('profiles').update({ is_active: isActivating }).eq('id', u.id);
        });

        await Promise.all(updatePromises);

        return NextResponse.json({ success: true, message: `تم ${isActivating ? 'تشغيل' : 'إيقاف'} جميع الموظفين بنجاح` });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'حدث خطأ غير متوقع' }, { status: 500 });
    }
}
