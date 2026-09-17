"use client";
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// الشاشة اللي هتظهر لو حصل أي كراش في السيستم
function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0B0E14', fontFamily: "'Cairo', sans-serif", padding: '20px', textAlign: 'center' }}>
        <div style={{ background: '#141822', padding: '40px', borderRadius: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 25px rgba(239, 68, 68, 0.15)', maxWidth: '500px', width: '100%', border: '1px solid rgba(0, 229, 255, 0.2)', borderTop: '5px solid #EF4444' }}>
            <div style={{ fontSize: '50px', marginBottom: '10px' }}>⚠️</div>
            <h2 style={{ color: '#F8FAFC', fontWeight: 900, margin: '0 0 10px 0', fontSize: '24px' }}>عذراً، حدث خطأ غير متوقع!</h2>
            <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                نظام محطات النور للوقود واجه مشكلة تقنية بسيطة أثناء معالجة البيانات. لا تقلق، لم تفقد بياناتك.
            </p>
            
            {/* عرض الخطأ التقني */}
            <div style={{ background: 'rgba(11, 14, 20, 0.85)', padding: '15px', borderRadius: '12px', fontSize: '11px', color: '#EF4444', textAlign: 'left', direction: 'ltr', overflowX: 'auto', marginBottom: '25px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <code>{error.message}</code>
            </div>

            <button 
                onClick={resetErrorBoundary} 
                style={{ background: 'linear-gradient(135deg, #00E5FF, #0077B6)', color: '#0B0E14', border: 'none', padding: '15px 30px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer', fontSize: '16px', width: '100%', transition: '0.3s', boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)' }}
            >
                🔄 إعادة تحميل الصفحة
            </button>
        </div>
    </div>
  );
}

export default function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
