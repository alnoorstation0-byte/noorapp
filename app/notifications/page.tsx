"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import MasterPage from '@/components/MasterPage';
import GlassContainer from '@/components/GlassContainer';
import { useNotificationsLogic, NotificationCategory } from './NotificationsLogic';
import { THEME } from '@/lib/theme';

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

export default function NotificationsPage() {
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
    handleRequestPush
  } = useNotificationsLogic();

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
    <MasterPage icon="🔔" title="مركز الإشعارات والتنبيهات المباشرة" hideTitleOnMobile={true}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease-out' }}>
        
        {/* بانر علوي لإشعارات الجوال والتحكم */}
        <GlassContainer>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ fontSize: '18px', color: THEME.primary, margin: '0 0 4px 0', fontWeight: 900 }}>
                🔔 مركز المراقبة والإشعارات الفورية
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                متابعة دورية لحركات البيع، إغلاق الورديات، السندات، وتنبيهات الأرصدة بدون تأخير.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {pushPermission !== 'granted' ? (
                <button
                  onClick={handleRequestPush}
                  style={{
                    background: 'linear-gradient(135deg, #C29B62, #A8573C)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📲</span> تفعيل إشعارات الجوال
                </button>
              ) : (
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '6px 12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  📱 إشعارات الجوال مفعلة ✅
                </span>
              )}

              <button
                onClick={toggleSound}
                title={isSoundOn ? 'كتم الصوت' : 'تشغيل الصوت'}
                style={{
                  background: isSoundOn ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${isSoundOn ? '#bbf7d0' : '#fecaca'}`,
                  color: isSoundOn ? '#16a34a' : '#dc2626',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: '12px'
                }}
              >
                {isSoundOn ? '🔊 نغمة نشطة' : '🔇 نغمة مكتومة'}
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'white',
                    border: '1px solid rgba(40,145,200,0.3)',
                    color: '#1C73AB',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  ✓ قراءة الكل
                </button>
              )}

              <button
                onClick={clearReadNotifications}
                style={{
                  background: 'white',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#dc2626',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                🧹 مسح المقروء
              </button>
            </div>
          </div>

          {/* تبويبات الفلترة */}
          <div className="notif-page-tabs-section">
            <style>{`
              .notif-page-tabs-wrapper {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                padding-bottom: 5px;
                margin-top: 18px;
                border-top: 1px solid rgba(40, 145, 200, 0.15);
                padding-top: 15px;
                width: 100%;
              }
              .notif-page-tabs-wrapper::-webkit-scrollbar {
                display: none;
              }
              .notif-tab-btn {
                white-space: nowrap !important;
                word-break: keep-all !important;
                word-wrap: normal !important;
                flex-shrink: 0 !important;
                display: inline-flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 6px !important;
                padding: 8px 16px !important;
                border-radius: 12px !important;
                font-size: 12px !important;
                font-weight: 900 !important;
                cursor: pointer !important;
                transition: 0.2s !important;
                border: 1px solid rgba(194, 155, 98, 0.25) !important;
                background: white !important;
                color: #2C1A12 !important;
                height: 38px !important;
                min-height: 38px !important;
                max-height: 38px !important;
                user-select: none !important;
                width: auto !important;
              }
              .notif-tab-btn.active {
                background: linear-gradient(135deg, #C29B62, #A8573C) !important;
                color: white !important;
                border-color: #C29B62 !important;
                box-shadow: 0 4px 12px rgba(168, 87, 60, 0.25) !important;
              }
              .notif-tab-btn span {
                white-space: nowrap !important;
                word-break: keep-all !important;
              }
              @media (max-width: 768px) {
                .notif-page-tabs-wrapper {
                  padding-top: 10px !important;
                  margin-top: 12px !important;
                  gap: 6px !important;
                }
                .notif-tab-btn {
                  height: 36px !important;
                  min-height: 36px !important;
                  padding: 0 12px !important;
                  font-size: 11.5px !important;
                  border-radius: 10px !important;
                }
              }
            `}</style>
            
            <div className="notif-page-tabs-wrapper">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`notif-tab-btn tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                >
                  <span>{cat.label}</span>
                  {cat.count !== undefined && cat.count > 0 && (
                    <span style={{
                      background: activeCategory === cat.id ? 'rgba(255,255,255,0.25)' : cat.id === 'unread' ? '#ef4444' : '#e2e8f0',
                      color: activeCategory === cat.id || cat.id === 'unread' ? 'white' : '#334155',
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      fontWeight: 900
                    }}>
                      {cat.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </GlassContainer>

        {/* عرض قائمة الإشعارات */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ fontSize: '36px', animation: 'spin 1s linear infinite', marginBottom: '12px' }}>⚙️</div>
            <div style={{ fontWeight: 900, color: THEME.primary, fontSize: '14px' }}>جاري تحميل الإشعارات المباشرة...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <GlassContainer>
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div style={{ fontSize: '50px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontWeight: 900, color: '#1C73AB', fontSize: '18px' }}>لا توجد إشعارات حالياً في هذا القسم</div>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0 0', fontWeight: 700 }}>
                النظام في حالة سكون ممتازة! ستظهر هنا وتصلك إشعارات على هاتفك فور تسجيل أي فواتير أو حركات جديدة.
              </p>
            </div>
          </GlassContainer>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredNotifications.map((notif) => {
              const badge = getNotificationBadge(notif.type);
              const actionUrl = extractActionUrl(notif);

              return (
                <div
                  key={notif.id}
                  style={{
                    background: notif.is_read ? 'rgba(255, 255, 255, 0.75)' : 'rgba(240, 249, 255, 0.98)',
                    backdropFilter: 'blur(15px)',
                    border: `1.5px solid ${notif.is_read ? 'rgba(255, 255, 255, 0.8)' : '#7dd3fc'}`,
                    borderRadius: '18px',
                    padding: '16px 20px',
                    boxShadow: notif.is_read ? '0 2px 10px rgba(0,0,0,0.02)' : '0 4px 20px rgba(28, 115, 171, 0.12)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    position: 'relative'
                  }}
                >
                  {!notif.is_read && (
                    <span style={{
                      position: 'absolute',
                      top: '14px',
                      left: '14px',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      boxShadow: '0 0 10px #0284c7'
                    }} />
                  )}

                  <div style={{
                    fontSize: '24px',
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {badge.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 900,
                          color: badge.color,
                          background: badge.bg,
                          padding: '2px 9px',
                          borderRadius: '8px',
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.label}
                        </span>
                        <h4 style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: 900,
                          color: notif.is_read ? '#334155' : '#0f172a'
                        }}>
                          {notif.title || 'إشعار نظام'}
                        </h4>
                      </div>

                      <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p style={{
                      margin: '4px 0 12px 0',
                      fontSize: '13px',
                      color: notif.is_read ? '#64748b' : '#1e293b',
                      lineHeight: 1.6,
                      fontWeight: 700
                    }}>
                      {notif.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {actionUrl && (
                        <button
                          onClick={() => handleActionClick(notif)}
                          style={{
                            background: 'linear-gradient(135deg, #C29B62, #A8573C)',
                            color: 'white',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          👁️ الانتقال إلى العملية
                        </button>
                      )}

                      {!notif.is_read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          style={{
                            background: 'white',
                            border: '1px solid rgba(40,145,200,0.25)',
                            color: '#1C73AB',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ✓ تم الاطلاع
                        </button>
                      )}

                      <button
                        onClick={() => deleteNotification(notif.id)}
                        title="حذف الإشعار"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '4px 8px'
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
    </MasterPage>
  );
}
