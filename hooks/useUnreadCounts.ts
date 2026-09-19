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

            const [notifRes, msgRes] = await Promise.all([
                supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('is_read', false)
                    .neq('type', 'message'),
                supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('is_read', false)
                    .eq('type', 'message')
            ]);
            
            setCounts({
                unread_messages: Number(msgRes.count || 0),
                unread_notifications: Number(notifRes.count || 0)
            });
        } catch {
            // تجاهل أي خطأ اتصال مؤقت
        }
    }, []);

    useEffect(() => {
        fetchCounts();

        // ⏱️ فحص احتياطي كل 10 ثوانٍ لضمان التحديث بدون ريفرش إطلاقاً
        const interval = setInterval(fetchCounts, 10000);

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
    useRealtimeListener(['notifications'], fetchCounts, 100);

    return counts;
}
