import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase.from('receipt_vouchers').select('*');
        return NextResponse.json({ success: true, count: data?.length, data, error });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
