"use client";
import React from 'react';
import { THEME } from '@/lib/theme';

interface LoadingScreenProps {
    message?: string;
    subMessage?: string;
    fullScreen?: boolean;
}

export default function LoadingScreen({ 
    message = 'جاري معالجة البيانات...', 
    subMessage = 'يرجى الانتظار لحين اكتمال التحميل',
    fullScreen = true 
}: LoadingScreenProps) {
    const containerStyle: React.CSSProperties = fullScreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(11, 14, 20, 0.88)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        zIndex: 99999,
        direction: 'rtl'
    } : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        width: '100%',
        padding: '50px',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.9) 0%, rgba(13, 16, 24, 0.8) 100%)',
        border: '1px solid rgba(0, 229, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        direction: 'rtl'
    };

    return (
        <div style={containerStyle} className="fade-in">
            {/* الدائرة المتحركة الاحترافية */}
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '30px' }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: '50%',
                    border: '4px solid rgba(0, 229, 255, 0.15)',
                    borderTopColor: '#00E5FF',
                    animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
                    boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)'
                }} />
                
                {/* تأثير النبض في المنتصف */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '30px', height: '30px',
                    backgroundColor: '#00E5FF',
                    borderRadius: '50%',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    boxShadow: '0 0 20px rgba(0, 229, 255, 0.6)'
                }} />
            </div>

            {/* النصوص الجمالية */}
            <h2 style={{
                color: '#F8FAFC',
                fontWeight: 900,
                fontSize: '1.5rem',
                margin: 0,
                marginBottom: '8px',
                textShadow: '0 0 15px rgba(0, 229, 255, 0.25)',
                letterSpacing: '-0.5px'
            }}>
                {message}
            </h2>
            <p style={{
                color: '#94A3B8',
                fontWeight: 600,
                fontSize: '1rem',
                margin: 0,
                opacity: 0.9
            }}>
                {subMessage}
            </p>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
                }
                .fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
