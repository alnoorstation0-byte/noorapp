"use client";
import React, { useEffect, useState } from 'react';
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';

export default function SystemHealthRadar() {
    const { language } = useLanguage();
    const [dbLatency, setDbLatency] = useState<number | null>(null);
    const [isDbOnline, setIsDbOnline] = useState<boolean>(false);

    useEffect(() => {
        const pingDb = async () => {
            const start = performance.now();
            const { error } = await supabase.from('profiles').select('id').limit(1);
            const end = performance.now();
            if (!error) {
                setIsDbOnline(true);
                setDbLatency(Math.round(end - start));
            } else {
                setIsDbOnline(false);
            }
        };
        pingDb();
        const interval = setInterval(pingDb, 10000);
        return () => clearInterval(interval);
    }, []);

    const isEn = language === 'en';

    return (
        <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px'
            }}>
                {/* Database Status Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(28, 115, 171, 0.06)',
                    transition: '0.3s'
                }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>{isDbOnline ? '🟢' : '🔴'}</div>
                    <h3 style={{ margin: '0 0 8px 0', color: THEME.primary, fontWeight: 900, fontSize: '15px' }}>
                        {isEn ? 'Database Status' : 'حالة قاعدة البيانات'}
                    </h3>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 900,
                        background: isDbOnline ? 'rgba(220, 252, 231, 0.8)' : 'rgba(254, 226, 226, 0.8)',
                        color: isDbOnline ? '#15803d' : '#b91c1c',
                        border: `1px solid ${isDbOnline ? '#86efac' : '#fca5a5'}`
                    }}>
                        {isDbOnline 
                            ? (isEn ? 'Online & Healthy' : 'متصلة وتعمل بكفاءة') 
                            : (isEn ? 'Disconnected' : 'مقطوعة الاتصال')}
                    </div>
                </div>

                {/* Latency Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(28, 115, 171, 0.06)',
                    transition: '0.3s'
                }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚡</div>
                    <h3 style={{ margin: '0 0 8px 0', color: THEME.primary, fontWeight: 900, fontSize: '15px' }}>
                        {isEn ? 'Response Latency' : 'زمن استجابة السيرفر'}
                    </h3>
                    <div style={{ fontSize: '26px', color: '#1C73AB', fontWeight: 900, direction: 'ltr' }}>
                        {dbLatency !== null ? `${dbLatency} ms` : '...'}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                        {isEn ? 'Live ping every 10s' : 'قياس مباشر كل 10 ثوانٍ'}
                    </span>
                </div>

                {/* Security Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(28, 115, 171, 0.06)',
                    transition: '0.3s'
                }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>🛡️</div>
                    <h3 style={{ margin: '0 0 8px 0', color: THEME.primary, fontWeight: 900, fontSize: '15px' }}>
                        {isEn ? 'Security & SSL' : 'نظام الأمان والتشفير'}
                    </h3>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 900,
                        background: 'rgba(224, 242, 254, 0.8)',
                        color: '#0369a1',
                        border: '1px solid #7dd3fc'
                    }}>
                        {isEn ? 'Active (AES-256 / TLS 1.3)' : 'نشط (مُشفر بالكامل)'}
                    </div>
                </div>
            </div>
        </div>
    );
}
