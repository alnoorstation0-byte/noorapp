"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { useNotificationsLogic, NotificationCategory } from '@/app/notifications/NotificationsLogic';
import { THEME } from '@/lib/theme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// دالة لتنسيق الوقت المنقضي بطريقة عربية مريحة
function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'الآن';
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    if (diffSec < 172800) return 'أمس';
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'مؤخراً';
  }
}

// تحديد أيقونة ولون الإشعار حسب نوعه
function getNotificationBadge(type: string) {
  switch (type) {
    case 'alert':
      return { icon: '🚨', label: 'تنبيه حرج', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' };
    case 'sale':
      return { icon: '🧾', label: 'مبيعات', color: '#1C73AB', bg: '#eff6ff', border: '#bfdbfe' };
    case 'pos':
      return { icon: '🛒', label: 'نقاط البيع', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
    case 'finance':
      return { icon: '💰', label: 'مالية وسندات', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    case 'inventory':
      return { icon: '📦', label: 'مخزون وأسطول', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    default:
      return { icon: '🔔', label: 'نظام عام', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };
  }
}

export default function NotificationsModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const {
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
    isMobile
  } = useNotificationsLogic();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // استخراج رابط الانتقال السريع إن وُجد
  const extractActionUrl = (notif: any): string | null => {
    if (notif.content && typeof notif.content === 'string' && notif.content.includes('__ACTION__')) {
      return notif.content.split('__ACTION__')[1] || null;
    }
    if (notif.type === 'sale') return '/invoices';
    if (notif.type === 'pos') return '/pos/dashboard';
    if (notif.type === 'finance') return '/journal';
    if (notif.type === 'inventory') return '/inventory';
    return null;
  };

  const handleActionClick = (notif: any) => {
    const url = extractActionUrl(notif);
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    onClose();
    if (url) {
      router.push(url);
    }
  };

  const categories: { id: NotificationCategory; label: string; count?: number }[] = [
    { id: 'all', label: 'الكل', count: totalCount },
    { id: 'unread', label: 'غير مقروءة', count: unreadCount },
    { id: 'alerts', label: 'تنبيهات حرجة', count: alertsCount },
    { id: 'sales', label: 'المبيعات ونقاط البيع' },
    { id: 'finance', label: 'المالية والسندات' },
    { id: 'inventory', label: 'المخزون والأسطول' }
  ];

  return (
    <AquaModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="مركز الإشعارات والتنبيهات المباشرة"
      icon="🔔"
      width="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* 📱 بانر تفعيل إشعارات الجوال والمتصفح */}
        {pushPermission !== 'granted' ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(28, 115, 171, 0.08), rgba(40, 145, 200, 0.15))',
            border: '1px solid rgba(40, 145, 200, 0.3)',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>📲</span>
              <div>
                <div style={{ fontWeight: 900, color: '#1C73AB', fontSize: '13px' }}>
                  تفعيل إشعارات الجوال والمتصفح الفورية
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  احصل على تنبيهات الفواتير، الورديات، والمصروفات فوراً على شاشة هاتفك
                </div>
              </div>
            </div>
            <button
              onClick={handleRequestPush}
              style={{
                background: 'linear-gradient(135deg, #1C73AB, #2891C8)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(28, 115, 171, 0.25)',
                transition: '0.2s'
              }}
            >
              🔔 تفعيل الآن
            </button>
          </div>
        ) : (
          <div style={{
            background: 'rgba(240, 253, 244, 0.7)',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            fontWeight: 800,
            color: '#15803d'
          }}>
            <span>📱 إشعارات الجوال والمتصفح: <strong>مفعلة وتعمل مباشرة بنجاح</strong> ✅</span>
            <span style={{ fontSize: '10px', background: '#dcfce7', padding: '2px 8px', borderRadius: '8px' }}>Web Push النشط</span>
          </div>
        )}

        {/* 🎛️ شريط التحكم السريع والتصنيفات */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(40,145,200,0.15)', paddingBottom: '12px' }}>
          
          {/* تبويبات التصنيف */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', flex: 1, minWidth: '280px' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  background: activeCategory === cat.id ? 'linear-gradient(135deg, #1C73AB, #2891C8)' : 'rgba(255,255,255,0.7)',
                  color: activeCategory === cat.id ? 'white' : '#475569',
                  border: `1px solid ${activeCategory === cat.id ? '#1C73AB' : 'rgba(40,145,200,0.2)'}`,
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: '0.2s'
                }}
              >
                <span>{cat.label}</span>
                {cat.count !== undefined && cat.count > 0 && (
                  <span style={{
                    background: activeCategory === cat.id ? 'rgba(255,255,255,0.25)' : cat.id === 'unread' ? '#ef4444' : '#e2e8f0',
                    color: activeCategory === cat.id || cat.id === 'unread' ? 'white' : '#334155',
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 900
                  }}>
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={toggleSound}
              title={isSoundOn ? 'كتم نغمة الإشعارات' : 'تفعيل نغمة الإشعارات'}
              style={{
                background: isSoundOn ? 'rgba(240, 253, 244, 0.9)' : 'rgba(254, 242, 242, 0.9)',
                border: `1px solid ${isSoundOn ? '#bbf7d0' : '#fecaca'}`,
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 800,
                color: isSoundOn ? '#16a34a' : '#dc2626'
              }}
            >
              {isSoundOn ? '🔊' : '🔇'}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(40,145,200,0.25)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  color: '#1C73AB',
                  transition: '0.2s'
                }}
              >
                ✓ قراءة الكل
              </button>
            )}

            <button
              onClick={clearReadNotifications}
              style={{
                background: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(239,68,68,0.2)',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
                color: '#dc2626',
                transition: '0.2s'
              }}
            >
              🧹 مسح المقروء
            </button>
          </div>

        </div>

        {/* 📋 قائمة الإشعارات */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite', marginBottom: '10px' }}>⚙️</div>
            <div style={{ fontWeight: 900, color: THEME.primary, fontSize: '13px' }}>جاري تحميل الإشعارات الفورية...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '45px 20px',
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '2px dashed rgba(40, 145, 200, 0.25)'
          }}>
            <div style={{ fontSize: '46px', marginBottom: '10px' }}>📭</div>
            <div style={{ fontWeight: 900, color: '#1C73AB', fontSize: '16px' }}>لا توجد إشعارات في هذا القسم حالياً</div>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '6px 0 0 0', fontWeight: 700 }}>
              سيتم تنبيهك هنا وتصلك إشعارات على جوالك فور حدوث أي عمليات جديدة في النظام!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredNotifications.map((notif) => {
              const badge = getNotificationBadge(notif.type);
              const actionUrl = extractActionUrl(notif);

              return (
                <div
                  key={notif.id}
                  style={{
                    background: notif.is_read ? 'rgba(255, 255, 255, 0.7)' : 'rgba(240, 249, 255, 0.95)',
                    backdropFilter: 'blur(15px)',
                    border: `1.5px solid ${notif.is_read ? 'rgba(255, 255, 255, 0.8)' : '#7dd3fc'}`,
                    borderRadius: '16px',
                    padding: '14px 16px',
                    boxShadow: notif.is_read ? '0 2px 8px rgba(0,0,0,0.02)' : '0 4px 15px rgba(28, 115, 171, 0.1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {/* شارة نقطة غير المقروء */}
                  {!notif.is_read && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      boxShadow: '0 0 8px #0284c7'
                    }} />
                  )}

                  {/* أيقونة النوع */}
                  <div style={{
                    fontSize: '22px',
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {badge.icon}
                  </div>

                  {/* التفاصيل والمحتوى */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 900,
                          color: badge.color,
                          background: badge.bg,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.label}
                        </span>
                        <h4 style={{
                          margin: 0,
                          fontSize: '13.5px',
                          fontWeight: 900,
                          color: notif.is_read ? '#334155' : '#0f172a',
                          letterSpacing: '-0.2px'
                        }}>
                          {notif.title || 'تنبيه نظام'}
                        </h4>
                      </div>

                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p style={{
                      margin: '4px 0 10px 0',
                      fontSize: '12px',
                      color: notif.is_read ? '#64748b' : '#1e293b',
                      lineHeight: 1.5,
                      fontWeight: 700
                    }}>
                      {notif.message}
                    </p>

                    {/* أزرار الأكشن والتفاعل */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {actionUrl && (
                        <button
                          onClick={() => handleActionClick(notif)}
                          style={{
                            background: 'linear-gradient(135deg, #1C73AB, #2891C8)',
                            color: 'white',
                            border: 'none',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: '0.2s'
                          }}
                        >
                          👁️ الانتقال للعملية
                        </button>
                      )}

                      {!notif.is_read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          style={{
                            background: 'rgba(255,255,255,0.8)',
                            border: '1px solid rgba(40,145,200,0.2)',
                            color: '#1C73AB',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: '0.2s'
                          }}
                        >
                          ✓ تم الاطلاع
                        </button>
                      )}

                      <button
                        onClick={() => deleteNotification(notif.id)}
                        title="حذف هذا الإشعار"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          transition: '0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      >
                        🗑️
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AquaModalWrapper>
  );
}
