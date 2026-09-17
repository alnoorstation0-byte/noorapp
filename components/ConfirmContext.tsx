"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';

// 1. تعريف نوع البيانات
type ConfirmOptions = {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning';
};

type ConfirmContextType = {
    showConfirm: (options: ConfirmOptions) => void;
};

// 2. إنشاء الـ Context
const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

// 3. الـ Provider اللي هيغلف السيستم كله
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; options: ConfirmOptions | null }>({
        isOpen: false,
        options: null,
    });

    const showConfirm = (options: ConfirmOptions) => {
        setConfirmState({ isOpen: true, options });
    };

    const closeConfirm = React.useCallback(() => {
        setConfirmState({ isOpen: false, options: null });
    }, []);

    const handleConfirm = React.useCallback(() => {
        if (confirmState.options?.onConfirm) {
            confirmState.options.onConfirm();
        }
        closeConfirm();
    }, [confirmState.options, closeConfirm]);

    // ⌨️ الاستجابة لمفاتيح Enter للتأكيد و Escape للإلغاء
    React.useEffect(() => {
        if (!confirmState.isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.code === 'NumpadEnter') {
                e.preventDefault();
                e.stopPropagation();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmState.isOpen, handleConfirm, closeConfirm]);

    return (
        <ConfirmContext.Provider value={{ showConfirm }}>
            {children}

            {/* 🚀 نافذة التأكيد الزجاجية الفخمة تظهر هنا على مستوى السيستم */}
            {confirmState.isOpen && confirmState.options && typeof document !== 'undefined' && createPortal(
                <div className="warm-portal-overlay-fullscreen" style={{ position: 'fixed', inset: 0, zIndex: 999999999, isolation: 'isolate', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', direction: 'rtl' }}>
                    <div style={{ background: 'white', padding: '35px', borderRadius: '24px', maxWidth: '450px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #fee2e2', animation: 'fadeIn 0.2s ease-out' }}>
                        
                        <div style={{ fontSize: '55px', marginBottom: '15px', animation: 'pulse-alert 2s infinite' }}>
                            {confirmState.options.type === 'warning' ? '⚠️' : '🚨'}
                        </div>
                        
                        <h3 style={{ color: confirmState.options.type === 'warning' ? '#b45309' : THEME.danger, fontWeight: 900, fontSize: '22px', marginBottom: '15px' }}>
                            {confirmState.options.title}
                        </h3>
                        
                        <p style={{ color: '#475569', fontSize: '15px', fontWeight: 800, marginBottom: '30px', lineHeight: 1.6 }}>
                            {confirmState.options.message}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button 
                                onClick={handleConfirm} 
                                style={{ flex: 1, background: confirmState.options.type === 'warning' ? '#f59e0b' : THEME.danger, color: 'white', padding: '14px', borderRadius: '14px', border: 'none', fontWeight: 900, fontSize: '15px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <span>{confirmState.options.confirmText || 'نعم، تأكيد'}</span>
                                <span style={{ opacity: 0.8, fontSize: '12px' }}>↵</span>
                            </button>
                            <button 
                                onClick={closeConfirm} 
                                style={{ flex: 1, background: 'rgba(255, 255, 255, 0.4)', color: '#64748b', padding: '14px', borderRadius: '14px', border: 'none', fontWeight: 900, fontSize: '15px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <span>{confirmState.options.cancelText || 'إلغاء والتراجع'}</span>
                                <span style={{ opacity: 0.7, fontSize: '11px' }}>(Esc)</span>
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes pulse-alert { 0% { transform: scale(0.95); } 50% { transform: scale(1.1); } 100% { transform: scale(0.95); } }
                        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                    `}</style>
                </div>,
                document.body
            )}
        </ConfirmContext.Provider>
    );
};

// 4. دالة الاستدعاء (Hook)
export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
    return context;
};
