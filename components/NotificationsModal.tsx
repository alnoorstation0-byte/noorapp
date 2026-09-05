"use client";
import React, { useEffect, useState } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { useNotificationsLogic } from '@/app/notifications/NotificationsLogic';
import { THEME } from '@/lib/theme';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationsModal({ isOpen, onClose }: Props) {
    const { notifications, isLoading, markAsRead, markAllAsRead } = useNotificationsLogic();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const headerExtra = notifications.some(n => !n.is_read) ? (
        <button 
            onClick={markAllAsRead}
            style={{ background: 'rgba(255, 255, 255, 0.4)', color: '#475569', border: '1px solid rgba(40, 145, 200, 0.2)', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, transition: '0.3s', fontSize: '12px' }}
        >
            ✓ تحديد الكل كمقروء
        </button>
    ) : null;

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="مركز الإشعارات"
            icon="🔔"
            width="700px"
            headerExtra={headerExtra}
        >
                <div style={{ padding: '0', overflowY: 'auto', flex: 1, maxHeight: '60vh' }}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <div style={{ fontSize: '30px', animation: 'spin 1s linear infinite', marginBottom: '15px' }}>⏳</div>
                            <div style={{ fontWeight: 800, color: THEME.primary }}>جاري جلب الإشعارات...</div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(255,255,255,0.5)', borderRadius: '20px', border: '2px dashed rgba(40, 145, 200, 0.2)' }}>
                            <div style={{ fontSize: '50px', marginBottom: '15px', opacity: 0.5 }}>📭</div>
                            <div style={{ fontWeight: 900, color: '#475569', fontSize: '18px' }}>لا توجد إشعارات حالياً</div>
                            <p style={{ color: '#475569', margin: '5px 0 0 0', fontWeight: 700 }}>سيتم إعلامك هنا عند وجود أي تحديثات مهمة</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {notifications.map(notif => (
                                <div key={notif.id} 
                                     style={{ 
                                         background: notif.is_read ? 'white' : '#f0f9ff',
                                         padding: '20px', 
                                         borderRadius: '16px',
                                         border: `1px solid ${notif.is_read ? 'rgba(40, 145, 200, 0.15)' : '#bae6fd'}`,
                                         boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                                         display: 'flex',
                                         alignItems: 'flex-start',
                                         gap: '15px',
                                         transition: 'all 0.3s ease'
                                     }}>
                                    <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>
                                        {notif.type === 'alert' ? '🚨' : notif.type === 'success' ? '✅' : notif.type === 'task' ? '📋' : '🔔'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: notif.is_read ? '#475569' : '#0f172a' }}>
                                                {notif.message || notif.content}
                                            </h4>
                                            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {new Date(notif.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        {!notif.is_read && (
                                            <button 
                                                onClick={() => markAsRead(notif.id)}
                                                style={{ background: 'transparent', border: 'none', color: THEME.primary, fontWeight: 800, fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '5px' }}
                                            >
                                                علامة كمقروء
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
        </AquaModalWrapper>
    );
}
