import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeListener } from '@/lib/useRealtimeSync';

export function useUnreadCounts() {
    const [counts, setCounts] = useState({ unread_messages: 0, unread_notifications: 0 });

    const fetchCounts = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('vw_unread_counts')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (data && !error) {
                setCounts({
                    unread_messages: Number(data.unread_messages || 0),
                    unread_notifications: Number(data.unread_notifications || 0)
                });
            }
        } catch {
            // تجاهل أي خطأ اتصال مؤقت
        }
    }, []);

    useEffect(() => {
        fetchCounts();

        // تحديث كل 60 ثانية كاحتياط
        const interval = setInterval(fetchCounts, 60000);

        // الاستماع لحدث التحديث اليدوي الداخلي
        const handleManualRefresh = () => fetchCounts();
        window.addEventListener('unread_counts_refresh', handleManualRefresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('unread_counts_refresh', handleManualRefresh);
        };
    }, [fetchCounts]);

    // ⚡ تحديث فوري فائق السرعة بمجرد وصول أو قراءة أي إشعار أو رسالة عبر Realtime
    useRealtimeListener(['notifications', 'messages'], fetchCounts, 100);

    return counts;
}
