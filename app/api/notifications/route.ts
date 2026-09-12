import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// تهيئة عميل Supabase بصلاحيات الإدارة (Service Role) لضمان تجاوز قيود RLS عند إرسال الإشعارات
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// 1️⃣ جلب الإشعارات للمستخدم (GET)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const unreadOnly = searchParams.get('unread_only') === 'true';
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        if (!userId) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const admin = getSupabaseAdmin();
        let query = admin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        if (type && type !== 'all') {
            query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, notifications: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 2️⃣ إرسال وبث إشعار جديد إلى النظام والمستخدمين (POST)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            title,
            message,
            content,
            type = 'system',
            related_id = null,
            target_user_id = null,
            target_roles = null,
            action_url = null
        } = body;

        if (!message && !title) {
            return NextResponse.json({ error: 'Title or message is required' }, { status: 400 });
        }

        const admin = getSupabaseAdmin();
        const finalTitle = title || 'إشعار جديد';
        const finalMessage = message || content || finalTitle;

        let targetUserIds: string[] = [];

        // أ. إذا تم تحديد مستخدم معين
        if (target_user_id) {
            targetUserIds = [target_user_id];
        } 
        // ب. إذا تم تحديد أدوار معينة
        else if (Array.isArray(target_roles) && target_roles.length > 0) {
            // نضمن شمول طاقم العمل 'staff' مع الأدوار المطلوبة حتى لا يُستثنى المستخدم الحالي
            const effectiveRoles = Array.from(new Set([...target_roles, 'staff']));
            const { data: profs } = await admin
                .from('profiles')
                .select('id, role')
                .in('role', effectiveRoles);
            
            if (profs && profs.length > 0) {
                targetUserIds = profs.map(p => p.id);
            }
        } 
        // ج. الإرسال الافتراضي للإدارة العامة والمسؤولين وطاقم العمل
        else {
            const { data: profs } = await admin
                .from('profiles')
                .select('id, role');
            
            if (profs && profs.length > 0) {
                targetUserIds = profs.map(p => p.id);
            }
        }

        // د. إذا لم يتم العثور على أي مستخدم، نرسل لجميع المسجلين كإجراء وقائي
        if (targetUserIds.length === 0) {
            const { data: allProfs } = await admin.from('profiles').select('id').limit(50);
            targetUserIds = (allProfs || []).map(p => p.id);
        }

        if (targetUserIds.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'No target users found' });
        }

        // إعداد السجلات للإدراج في قاعدة البيانات
        const rowsToInsert = targetUserIds.map(uid => ({
            user_id: uid,
            title: finalTitle,
            message: finalMessage,
            content: action_url ? `${finalMessage}__ACTION__${action_url}` : finalMessage,
            type: type,
            related_id: related_id,
            is_read: false
        }));

        const { data: inserted, error } = await admin
            .from('notifications')
            .insert(rowsToInsert)
            .select();

        if (error) {
            console.error('Error inserting notifications:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: inserted?.length || 0,
            notifications: inserted
        });
    } catch (err: any) {
        console.error('API notifications POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 3️⃣ تحديث حالة الإشعار كمقروء (PATCH)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, user_id, mark_all } = body;

        const admin = getSupabaseAdmin();

        if (mark_all && user_id) {
            const { error } = await admin
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user_id)
                .eq('is_read', false);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        if (id) {
            const { error } = await admin
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'id or mark_all with user_id is required' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 4️⃣ حذف إشعار أو مسح الإشعارات المقروءة (DELETE)
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('user_id');
        const clearRead = searchParams.get('clear_read') === 'true';

        const admin = getSupabaseAdmin();

        if (clearRead && userId) {
            const { error } = await admin
                .from('notifications')
                .delete()
                .eq('user_id', userId)
                .eq('is_read', true);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        if (id) {
            const { error } = await admin
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'id or clear_read with user_id is required' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
