import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeListener } from '@/lib/useRealtimeSync';

export function useUnreadCounts() {
    const [counts, setCounts] = useState({ unread_messages: 0, unread_notifications: 0 });

    const fetchCounts = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

            const userId = session.user.id;

            // استعلام مزدوج لضمان الدقة اللحظية 100%
            const [vwRes, notifRes] = await Promise.all([
                supabase
                    .from('vw_unread_counts')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle(),
                supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('is_read', false)
            ]);
            
            const unreadNotifs = typeof notifRes.count === 'number' 
                ? notifRes.count 
                : Number(vwRes.data?.unread_notifications || 0);

            setCounts({
                unread_messages: Number(vwRes.data?.unread_messages || 0),
                unread_notifications: unreadNotifs
            });
        } catch {
            // تجاهل أي خطأ اتصال مؤقت
        }
    }, []);

    useEffect(() => {
        fetchCounts();

        // ⏱️ فحص احتياطي كل 5 ثوانٍ لضمان التحديث بدون ريفرش إطلاقاً
        const interval = setInterval(fetchCounts, 5000);

        // الاستماع لأحداث التحديث الفوري المحلي وتغيير التبويب
        const handleRefresh = () => fetchCounts();
        window.addEventListener('unread_counts_refresh', handleRefresh);
        window.addEventListener('focus', handleRefresh);
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') fetchCounts();
        });

        return () => {
            clearInterval(interval);
            window.removeEventListener('unread_counts_refresh', handleRefresh);
            window.removeEventListener('focus', handleRefresh);
        };
    }, [fetchCounts]);

    // ⚡ تحديث فوري فائق السرعة بمجرد وصول أو قراءة أو حذف أي إشعار عبر Realtime
    useRealtimeListener(['notifications', 'messages'], fetchCounts, 100);

    return counts;
}
