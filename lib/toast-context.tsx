"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

// تحديد أنواع الألرت المتاحة
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// تعريف شكل البيانات
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// دالة جلوبال عشان نقدر نستدعي الألرت من أي مكان بدون الحاجة للـ Hook
export let showGlobalToast: (message: string, type?: ToastType) => void = (message, type) => {
  if (typeof window !== 'undefined' && (window as any)._activeShowToast) {
    (window as any)._activeShowToast(message, type);
  } else {
    console.warn("ToastProvider is not mounted yet: " + message);
  }
};

if (typeof globalThis !== 'undefined') {
  (globalThis as any).showGlobalToast = (...args: any[]) => showGlobalToast(...args);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // دمج حالة الظهور والرسالة والنوع في State واحد
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    // 1. إظهار الألرت
    setToast({ message, type, visible: true });

    // 2. إخفاء الألرت أوتوماتيك بعد 4 ثواني (عشان اليوزر ميقفلش بنفسه)
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  React.useEffect(() => {
    showGlobalToast = showToast;
    if (typeof window !== 'undefined') {
      (window as any)._activeShowToast = showToast;
      (window as any).showGlobalToast = showToast;
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* 🍏 واجهة الألرت الزجاجي (Apple Dynamic Toast) */}
      {toast.visible && (
        <div className={`apple-global-toast ${toast.type}`}>
          {/* إضافة أيقونات تفاعلية بناءً على النوع */}
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '⚠️ '}
          {toast.type === 'warning' && '⏸️ '}
          {toast.type === 'info' && 'ℹ️ '}
          {toast.message}
        </div>
      )}

      {/* ستايل الألرت المدمج لضمان ظهوره في كل صفحات السيستم */}
      <style>{`
        .apple-global-toast {
          position: fixed; 
          top: 24px; 
          left: 50%; 
          transform: translateX(-50%);
          background: rgba(18, 41, 70, 0.95); /* Deep Ocean Navy */
          backdrop-filter: blur(15px) saturate(200%);
          -webkit-backdrop-filter: blur(15px) saturate(200%);
          padding: 14px 28px; 
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(40,145,200,0.3), inset 0 1px 1px rgba(255,255,255,0.1);
          border: 1px solid rgba(127,212,227,0.3);
          font-size: 15px; 
          font-weight: 700; 
          color: #ffffff;
          z-index: 9999999999;
          display: flex; 
          align-items: center; 
          gap: 12px;
          animation: slideDownToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          direction: rtl;
          min-width: 300px;
          justify-content: center;
        }
        
        .apple-global-toast.success { border-bottom: 3px solid #7FD4E3; color: #E0F7FA; }
        .apple-global-toast.error { border-bottom: 3px solid #ff3b30; color: #ffe5e5; }
        .apple-global-toast.warning { border-bottom: 3px solid #ff9500; color: #fff3e0; }
        .apple-global-toast.info { border-bottom: 3px solid #2891C8; color: #e1f5fe; }

        @keyframes slideDownToast {
          0% { top: -50px; opacity: 0; transform: translateX(-50%) scale(0.9); }
          100% { top: 24px; opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// الهوك اللي هتستخدمه في أي صفحة
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};