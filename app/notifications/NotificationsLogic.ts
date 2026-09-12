"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isMobileDevice,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  playNotificationSound
} from '@/lib/pushNotificationService';
import { useToast } from '@/lib/toast-context';
import { emitTableChange, useRealtimeListener } from '@/lib/useRealtimeSync';

export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  content?: string;
  type: string;
  related_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationCategory = 'all' | 'unread' | 'alerts' | 'sales' | 'finance' | 'inventory';

export function useNotificationsLogic() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  
  // إعدادات الصوت وإشعارات الجوال
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const { showToast } = useToast();

  // 1️⃣ جلب بيانات المستخدم والإشعارات المبدئية
  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setNotifications(data as SystemNotification[]);
      }
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // ⏱️ فحص دوري كل 5 ثوانٍ لضمان عدم الحاجة لأي ريفرش إطلاقاً
    const interval = setInterval(fetchNotifications, 5000);

    const handleRefresh = () => fetchNotifications();
    window.addEventListener('unread_counts_refresh', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    });

    // فحص دعم المتصفح وحالة الصوت
    setIsSoundOn(isNotificationSoundEnabled());
    setPushPermission(getNotificationPermission());
    setIsMobile(isMobileDevice());

    return () => {
      clearInterval(interval);
      window.removeEventListener('unread_counts_refresh', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [fetchNotifications]);

  // ⚡ الاستماع للمزامنة اللحظية الشاملة
  useRealtimeListener('notifications', fetchNotifications, 100);

  // 2️⃣ الاشتراك الفوري Realtime على جدول notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-user-${userId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload.new) {
            setNotifications(prev => {
              // تفادي التكرار
              if (prev.some(n => n.id === payload.new.id)) return prev;
              return [payload.new as SystemNotification, ...prev];
            });
            window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
          }
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload.new) {
            setNotifications(prev =>
              prev.map(n => (n.id === payload.new.id ? (payload.new as SystemNotification) : n))
            );
            window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
          }
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload: any) => {
          if (payload.old && payload.old.id) {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 3️⃣ تمييز إشعار محدد كمقروء (Optimistic Update 0ms + API Service Role)
  const markAsRead = async (id: string) => {
    // تحديث فوري فائق السرعة بدون انتظار الشبكة
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
    emitTableChange('notifications');

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (err) {
      console.warn('Error marking notification as read via API:', err);
    }
  };

  // 4️⃣ تمييز جميع الإشعارات كمقروءة (Optimistic Update 0ms + API Service Role)
  const markAllAsRead = async () => {
    if (!userId) return;

    // تحديث فوري بالواجهة
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
    emitTableChange('notifications');
    showToast('✅ تم تحديد جميع الإشعارات كمقروءة', 'success');

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true, user_id: userId })
      });
    } catch (err) {
      console.warn('Error marking all notifications as read via API:', err);
    }
  };

  // 5️⃣ حذف إشعار محدد (Optimistic Update 0ms + API Service Role)
  const deleteNotification = async (id: string) => {
    // إزالة فورية من القائمة
    setNotifications(prev => prev.filter(n => n.id !== id));
    window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
    emitTableChange('notifications');

    try {
      await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Error deleting notification via API:', err);
    }
  };

  // 6️⃣ مسح جميع الإشعارات المقروءة (Optimistic Update 0ms + API Service Role)
  const clearReadNotifications = async () => {
    if (!userId) return;

    const readCount = notifications.filter(n => n.is_read).length;
    if (readCount === 0) {
      showToast('⚠️ لا توجد إشعارات مقروءة لمسحها', 'warning');
      return;
    }

    setNotifications(prev => prev.filter(n => !n.is_read));
    window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
    emitTableChange('notifications');
    showToast(`🧹 تم مسح ${readCount} إشعار مقروء بنجاح`, 'success');

    try {
      await fetch(`/api/notifications?user_id=${encodeURIComponent(userId)}&clear_read=true`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Error clearing read notifications via API:', err);
    }
  };

  // 7️⃣ تبديل تفعيل/كتم الصوت
  const toggleSound = () => {
    const nextState = !isSoundOn;
    setIsSoundOn(nextState);
    setNotificationSoundEnabled(nextState);
    if (nextState) {
      playNotificationSound();
      showToast('🔊 تم تفعيل نغمة الإشعارات', 'info');
    } else {
      showToast('🔇 تم كتم نغمة الإشعارات', 'info');
    }
  };

  // 8️⃣ طلب تفعيل إشعارات الجوال والمتصفح
  const handleRequestPush = async () => {
    const granted = await requestNotificationPermission();
    const current = getNotificationPermission();
    setPushPermission(current);

    if (granted) {
      showToast('🎉 تم تفعيل إشعارات الجوال والمتصفح بنجاح!', 'success');
    } else if (current === 'denied') {
      showToast('❌ تم رفض إذن الإشعارات من إعدادات المتصفح', 'error');
    }
  };

  // 9️⃣ تصفية الإشعارات حسب التبويب النشط
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeCategory === 'unread') return !n.is_read;
      if (activeCategory === 'alerts') return n.type === 'alert';
      if (activeCategory === 'sales') return n.type === 'sale' || n.type === 'pos';
      if (activeCategory === 'finance') return n.type === 'finance';
      if (activeCategory === 'inventory') return n.type === 'inventory';
      return true; // 'all'
    });
  }, [notifications, activeCategory]);

  // إحصائيات سريعة
  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
  const alertsCount = useMemo(() => notifications.filter(n => n.type === 'alert').length, [notifications]);
  const totalCount = notifications.length;

  return {
    notifications,
    filteredNotifications,
    isLoading,
    activeCategory,
    setActiveCategory,
    unreadCount,
    alertsCount,
    totalCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    isSoundOn,
    toggleSound,
    pushPermission,
    handleRequestPush,
    isMobile,
    refresh: fetchNotifications
  };
}
