"use client";

/**
 * 📱🔔 خدمة إشعارات المتصفح والجوال الفورية لشركة مياه غيام
 * تدعم HTML5 Notifications API و Web Push Service Worker مع الاهتزاز والنغمات الصوتية
 */

// التحقق من دعم المتصفح للإشعارات
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

// جلب حالة الإذن الحالي
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// طلب إذن الإشعارات من المستخدم (للجوال والمتصفح)
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('⚠️ الإشعارات غير مدعومة في هذا المتصفح');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // إرسال إشعار ترحيبي تجريبي للتأكيد
      showBrowserNotification(
        '✅ تم تفعيل إشعارات مياه غيام',
        'ستصلك الآن كافة التنبيهات والعمليات المهمة فور حدوثها على جوالك ومتصفحك!',
        { actionUrl: '/notifications' }
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error('خطأ أثناء طلب إذن الإشعارات:', err);
    return false;
  }
}

// التحقق هل الجهاز جوال
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// التحقق هل الصوت مفعل
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('ghayam_notif_sound') !== 'false';
}

// تبديل تفعيل/كتم الصوت
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ghayam_notif_sound', enabled ? 'true' : 'false');
}

/**
 * 🎵 تشغيل نغمة تنبيه صوتية عصرية وخفيفة عبر Web Audio API
 * (لا تحتاج ملف صوت خارجي وتعمل بكفاءة 100% في جميع المتصفحات)
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined' || !isNotificationSoundEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // نغمة كروية مزدوجة ناعمة (Aqua Water Chime)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6
    osc2.frequency.exponentialRampToValueAtTime(1760.00, ctx.currentTime + 0.15); // A6

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // القيود الأمنية تمنع الصوت قبل تفاعل المستخدم
  }
}

/**
 * 📲 إظهار إشعار النظام المباشر على الجوال أو المتصفح
 */
export async function showBrowserNotification(
  title: string,
  body: string,
  options?: {
    actionUrl?: string;
    id?: string;
    type?: string;
    tag?: string;
  }
): Promise<void> {
  if (typeof window === 'undefined' || !isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const notifOptions: NotificationOptions = {
    body,
    icon: '/ghayam_logo.png',
    badge: '/ghayam_logo.png',
    vibrate: [200, 100, 200] as any,
    tag: options?.tag || 'ghayam-system-alert',
    renotify: true,
    data: {
      url: options?.actionUrl || '/notifications',
      id: options?.id,
      timestamp: Date.now()
    }
  };

  try {
    // محاولة الإرسال عبر Service Worker (أفضل للجوال والأجهزة اللوحية وتعمل في الخلفية)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notifOptions);
        return;
      }
    }

    // الطريقة القياسية المباشرة (Fallback)
    const notification = new Notification(title, notifOptions);
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options?.actionUrl) {
        window.location.href = options.actionUrl;
      }
      notification.close();
    };
  } catch (err) {
    console.warn('تعذر إظهار إشعار المتصفح المباشر:', err);
  }
}
