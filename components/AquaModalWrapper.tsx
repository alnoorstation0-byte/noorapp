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
                    background: rgba(11, 14, 20, 0.85) !important;
                    backdrop-filter: blur(20px) saturate(160%) !important;
                    -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
                    display: flex !important; align-items: center !important; justify-content: center !important;
                    zIndex: 999999999 !important;
                }

                .cinematic-scroll::-webkit-scrollbar { width: 6px; }
                .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
                .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.2); border-radius: 10px; }
                .cinematic-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0, 229, 255, 0.4); }

                .glass-input-field {
                    width: 100%; padding: 8px 10px; border-radius: 12px;
                    background: rgba(11, 14, 20, 0.8);
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
                    outline: none; transition: all 0.2s;
                    font-weight: 700; color: #F8FAFC;
                }
                .glass-input-field:focus {
                    background: rgba(15, 20, 30, 0.95); border-color: #00E5FF;
                    box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.2), 0 0 15px rgba(0, 229, 255, 0.15);
                }
                
                .btn-glass-save {
                    background: linear-gradient(135deg, #00E5FF 0%, #0088CC 100%);
                    color: #0B0E14; border: none; padding: 12px 20px; border-radius: 12px;
                    font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.3s;
                    box-shadow: 0 4px 15px rgba(0, 229, 255, 0.35);
                }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.08); box-shadow: 0 8px 24px rgba(0, 229, 255, 0.5); }
                .btn-glass-save:active:not(:disabled) { transform: scale(0.98); }
                .btn-glass-save:disabled { opacity: 0.6; cursor: not-allowed; }

                .btn-glass-cancel {
                    background: rgba(20, 24, 34, 0.8);
                    color: #94A3B8; border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px 20px; border-radius: 12px;
                    font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.3s;
                }
                .btn-glass-cancel:hover { background: rgba(26, 32, 46, 1); color: #F8FAFC; transform: translateY(-2px); border-color: rgba(0, 229, 255, 0.3); }

                @keyframes modalScaleUp { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

                .modal-kbd-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: rgba(0, 229, 255, 0.1);
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 800;
                    color: #00E5FF;
                    white-space: nowrap;
                }

                @media (max-width: 768px) {
                    .modal-kbd-badge { display: none !important; }
                    .glass-modal-container {
                        width: 95vw !important;
                        max-width: 95vw !important;
                        padding: 16px 14px !important;
                        max-height: 94vh !important;
                        border-radius: 20px !important;
                    }
                    .modal-header-title { 
                        flex-direction: row !important; 
                        align-items: center !important; 
                        justify-content: space-between !important; 
                        gap: 10px !important; 
                        padding-bottom: 12px !important;
                        margin-bottom: 12px !important;
                    }
                    .modal-header-title h2 { font-size: 17px !important; }
                    .responsive-form-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .responsive-form-grid > div { grid-column: span 1 !important; }
                    .responsive-summary-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; padding: 12px !important; }
                    .responsive-summary-grid > div { padding: 8px !important; }
                    .responsive-summary-grid div:nth-child(2) { font-size: 15px !important; }
                    .responsive-actions { flex-direction: column !important; gap: 10px !important; margin-top: 15px !important; }
                    .responsive-actions button { width: 100% !important; min-height: 44px !important; padding: 12px !important; }
                }

                .btn-modal-close {
                    background: rgba(239, 68, 68, 0.12);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    width: 38px;
                    height: 38px;
                    min-width: 38px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 17px;
                    font-weight: 900;
                    transition: all 0.2s ease;
                }
                .btn-modal-close:hover {
                    background: rgba(239, 68, 68, 0.25);
                    border-color: #ef4444;
                    transform: scale(1.05);
                }
            `}</style>

            <div ref={containerRef} className="cinematic-scroll glass-modal-container" onClick={(e) => e.stopPropagation()} style={{ 
                width: width, maxHeight: '95vh', background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.96) 0%, rgba(13, 16, 24, 0.92) 100%)', 
                backdropFilter: 'blur(24px) saturate(160%)', borderRadius: '24px', padding: '20px 25px', 
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.12)', overflowY: 'auto', direction: 'rtl',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                
                <div className="modal-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(0, 229, 255, 0.25)', paddingBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h2 style={{ color: '#F8FAFC', fontWeight: 900, margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {icon && <span>{icon}</span>}
                            <span>{title}</span>
                        </h2>
                        <span className="modal-kbd-badge" title="اختصارات لوحة المفاتيح">
                            💾 Ctrl+Enter للحفظ | Esc للإلغاء
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {headerExtra}
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="btn-modal-close"
                            title="إغلاق (Esc)"
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
