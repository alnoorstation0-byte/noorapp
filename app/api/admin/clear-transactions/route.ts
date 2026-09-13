import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// تهيئة عميل Supabase الإداري المباشر بصلاحيات Service Role لتجاوز أي قيود RLS
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// الترتيب الصارم لحذف الحركات والعمليات (الأبناء أولاً لمنع تعارض Foreign Keys)
const TRANSACTION_TABLES_ORDER = [
    'vehicle_inventory',        // عهد سيارات التوزيع
    'inventory_transactions',   // حركات المخزون
    'journal_lines',            // أسطر قيود اليومية
    'journal_headers',          // ترويسات قيود اليومية
    'manual_journals',          // القيود اليدوية
    'receipt_vouchers',         // سندات القبض
    'payment_vouchers',         // سندات الصرف
    'expenses',                 // المصروفات
    'invoices',                 // فواتير المبيعات
    'cash_flows',               // التدفقات النقدية
    'pos_shifts',               // 🔒 سجل الورديات
    'fleet_operations',         // 🚚 أوامر تشغيل الرحلات
    'journal_errors'            // أخطاء القيود
];

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const action = body?.action || 'clear_transactions';
        const admin = getSupabaseAdmin();

        if (action === 'clear_transactions' || action === 'factory_reset') {
            const results: Record<string, { deleted: boolean; error?: string }> = {};

            // 1. مسح الجداول التشغيلية بالترتيب العكسي الآمن
            for (const table of TRANSACTION_TABLES_ORDER) {
                const { error } = await admin
                    .from(table)
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000');

                if (error) {
                    console.warn(`Admin Wipe Warning for table ${table}:`, error.message);
                    results[table] = { deleted: false, error: error.message };
                } else {
                    results[table] = { deleted: true };
                }
            }

            // 2. تصفير أرصدة المخزون وعهد الفوارغ (للإبقاء على الأصناف والعملاء والمستودعات)
            try {
                await admin.from('warehouse_inventory').update({ quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
            } catch (e: any) {
                console.warn('Reset warehouse_inventory warning:', e?.message);
            }

            try {
                await admin.from('inventory_items').update({ current_quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
            } catch (e: any) {
                console.warn('Reset inventory_items warning:', e?.message);
            }

            try {
                await admin.from('partners').update({ bottle_custody: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
            } catch (e: any) {
                console.warn('Reset partners bottle custody warning:', e?.message);
            }

            // 3. إذا كان المطلوب إعادة ضبط المصنع الشاملة
            if (action === 'factory_reset') {
                const extraTables = [
                    'notifications',
                    'user_requests',
                    'user_tasks',
                    'payroll_slips',
                    'fleet_vehicles',
                    'partners',
                    'inventory_items'
                ];

                for (const table of extraTables) {
                    try {
                        await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    } catch (e: any) {
                        console.warn(`Factory reset extra table ${table} warning:`, e?.message);
                    }
                }

                // مسح المستودعات باستثناء المستودع الرئيسي الافتراضي
                try {
                    await admin.from('warehouses').delete().neq('id', '11111111-1111-1111-1111-111111111111');
                } catch (e: any) {}
            }

            return NextResponse.json({
                success: true,
                message: action === 'factory_reset' 
                    ? 'تمت إعادة ضبط المصنع الشاملة بنجاح.'
                    : 'تم مسح القيود وسجل الورديات وأوامر تشغيل الرحلات وتصفير الحركات بنجاح.',
                results
            });
        }

        return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
    } catch (err: any) {
        console.error('Clear transactions API error:', err);
        return NextResponse.json({ success: false, error: err.message || 'حدث خطأ غير متوقع' }, { status: 500 });
    }
}
