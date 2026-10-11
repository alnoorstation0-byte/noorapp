import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udnjxypodlsnkiuurnup.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4B7_1imifPgld9OL1pz8ow_mwaqi1X9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ ده بيخلي الجلسة متتمسحش لما تقفل الصفحة
    autoRefreshToken: true,
  }
});