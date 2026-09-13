import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase.from('promotions').select('*').eq('status', 'active');
        if (error) {
            // Table doesn't exist yet in Supabase schema cache
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json({ success: true, data: data || [] });
    } catch {
        return NextResponse.json({ success: true, data: [] });
    }
}
