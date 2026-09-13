import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// تهيئة عميل Supabase بصلاحيات الإدارة (Service Role)
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvfxxonuxkskrthsnrhu.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
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

        // 4️⃣ جلب وعرض القائمة الكاملة مع بيانات الشركاء
        let allProfiles: any[] = [];
        const { data: profWithPartners, error: fetchError } = await admin
            .from('profiles')
            .select('*, partners(name)')
            .order('created_at', { ascending: false });

        if (fetchError) {
            // خط دفاع احتياطي في حال عدم وجود علاقة مباشرة مع الشركاء
            const { data: simpleProfiles } = await admin
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            allProfiles = simpleProfiles || [];
        } else {
            allProfiles = profWithPartners || [];
        }

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

        // 3️⃣ إنشاء أو تحديث بيانات الـ Profile فوراً ومباشرة عبر upsert (دون الاعتماد على Trigger)
        const { error: profileError } = await getSupabaseAdmin()
            .from('profiles')
            .upsert({
                id: userId,
                full_name,
                email,
                phone_number: cleanedPhone,
                role: safeRole,
                linked_partner_id: linked_partner_id || null,
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
