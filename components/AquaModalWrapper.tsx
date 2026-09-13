"use client";
import { createPortal } from 'react-dom';
import React, { useEffect, useState, useRef } from 'react';
import { THEME } from '@/lib/theme';

interface AquaModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    icon?: string;
    width?: string;
    children: React.ReactNode;
    headerExtra?: React.ReactNode;
}

export default function AquaModalWrapper({ isOpen, onClose, onConfirm, title, icon, width = '950px', children, headerExtra }: AquaModalWrapperProps) {
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);

    const onCloseRef = useRef(onClose);
    const onConfirmRef = useRef(onConfirm);
    const hasAutoFocusedRef = useRef(false);

    useEffect(() => {
        onCloseRef.current = onClose;
        onConfirmRef.current = onConfirm;
    });

    // 🎯 التركيز التلقائي على أول حقل مرة واحدة فقط عند فتح المودال (للديسكتوب فقط)
    useEffect(() => {
        if (!isOpen) {
            hasAutoFocusedRef.current = false;
            return;
        }

        if (!hasAutoFocusedRef.current) {
            hasAutoFocusedRef.current = true;
            // يتم التركيز لمرة واحدة فقط عند الفتح ولا يُعاد تشغيله مع إعادة الرسم
            if (typeof window !== 'undefined' && window.innerWidth > 768) {
                const timer = setTimeout(() => {
                    if (containerRef.current) {
                        const firstInput = containerRef.current.querySelector<HTMLElement>(
                            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
                        );
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }
                }, 80);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen]);

    // ⌨️ الاختصارات العامة داخل المودال (Escape للإغلاق و Ctrl+Enter للحفظ)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. Esc -> إغلاق المودال
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onCloseRef.current?.();
                return;
            }

            // 2. Ctrl + Enter (أو Cmd + Enter على الماك) -> حفظ وموافقة
            if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'NumpadEnter')) {
                e.preventDefault();
                e.stopPropagation();

                if (onConfirmRef.current) {
                    onConfirmRef.current();
                    return;
                }

                // البحث التلقائي عن زر الحفظ والاعتماد داخل المودال
                if (containerRef.current) {
                    const saveBtn = containerRef.current.querySelector<HTMLButtonElement>(
                        '.btn-glass-save, button[type="submit"], [data-shortcut="save"]'
                    );
                    if (saveBtn && !saveBtn.disabled) {
                        saveBtn.click();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="warm-portal-overlay-fullscreen" onClick={onClose}>
            <style>{`
                .warm-portal-overlay-fullscreen {
                    position: fixed !important;
                    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                    width: 100vw !important; height: 100vh !important;
                    background: radial-gradient(circle at center, rgba(40, 145, 200, 0.3) 0%, rgba(18, 41, 70, 0.9) 100%) !important;
                    backdrop-filter: blur(8px) !important;
                    -webkit-backdrop-filter: blur(8px) !important;
                    display: flex !important; align-items: center !important; justify-content: center !important;
                    z-index: 999999999 !important;
                }

                .cinematic-scroll::-webkit-scrollbar { width: 6px; }
                .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
                .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }
                .cinematic-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }

                .glass-input-field {
                    width: 100%; padding: 8px 10px; border-radius: 12px;
                    background: rgba(255, 255, 255, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                    outline: none; transition: all 0.2s;
                    font-weight: 700; color: #1e293b;
                }
                .glass-input-field:focus {
                    background: #ffffff; border-color: ${THEME.accent};
                    box-shadow: 0 0 0 4px rgba(202, 138, 4, 0.15);
                }
                
                .btn-glass-save {
                    background: linear-gradient(135deg, ${THEME.accent}, ${THEME.terracotta});
                    color: white; border: none; padding: 12px 20px; border-radius: 12px;
                    font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.3s;
                    box-shadow: 0 4px 15px rgba(194, 155, 98, 0.35);
                }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.05); box-shadow: 0 8px 20px rgba(168, 87, 60, 0.35); }
                .btn-glass-save:active:not(:disabled) { transform: scale(0.98); }
                .btn-glass-save:disabled { opacity: 0.7; cursor: not-allowed; }

                .btn-glass-cancel {
                    background: rgba(255, 253, 250, 0.7);
                    color: #2C1A12; border: 1px solid rgba(194, 155, 98, 0.3); padding: 12px 20px; border-radius: 12px;
                    font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.3s;
                }
                .btn-glass-cancel:hover { background: rgba(255, 253, 250, 0.95); transform: translateY(-2px); border-color: ${THEME.accent}; }

                @keyframes modalScaleUp { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

                .modal-kbd-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: rgba(194, 155, 98, 0.12);
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 800;
                    color: ${THEME.terracotta};
                    white-space: nowrap;
                }

                @media (max-width: 768px) {
                    .modal-kbd-badge { display: none !important; }
                    .glass-modal-container {
                        width: 95% !important;
                        padding: 20px !important;
                        max-height: 95vh !important;
                    }
                    .modal-header-title { flex-direction: column; align-items: flex-start !important; gap: 15px; }
                    .modal-header-title h2 { font-size: 20px !important; }
                    .responsive-form-grid { grid-template-columns: 1fr !important; gap: 15px !important; }
                    .responsive-form-grid > div { grid-column: span 1 !important; }
                    .responsive-summary-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; padding: 15px !important; }
                    .responsive-summary-grid > div { padding: 10px !important; }
                    .responsive-summary-grid div:nth-child(2) { font-size: 16px !important; }
                    .responsive-actions { flex-direction: column !important; gap: 10px !important; margin-top: 20px !important; }
                    .responsive-actions button { width: 100% !important; padding: 14px !important; }
                }
            `}</style>

            <div ref={containerRef} className="cinematic-scroll glass-modal-container" onClick={(e) => e.stopPropagation()} style={{ 
                width: width, maxHeight: '95vh', background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(255, 253, 250, 0.85) 100%)', 
                backdropFilter: 'blur(24px) saturate(160%)', borderRadius: '24px', padding: '20px 25px', 
                boxShadow: '0 20px 40px rgba(44, 26, 18, 0.15)', overflowY: 'auto', direction: 'rtl',
                border: '1px solid rgba(194, 155, 98, 0.35)',
                animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                
                <div className="modal-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: `2px solid ${THEME.accent}50`, paddingBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h2 style={{ color: THEME.primary, fontWeight: 900, margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {icon && <span>{icon}</span>}
                            <span>{title}</span>
                        </h2>
                        <span className="modal-kbd-badge" title="اختصارات لوحة المفاتيح">
                            💾 Ctrl+Enter للحفظ | Esc للإلغاء
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {headerExtra}
                        <button onClick={onClose} style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                            border: 'none', width: '35px', height: '35px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '18px', transition: '0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
