"use client";
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { THEME } from '@/lib/theme';

interface AquaModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: string;
    width?: string;
    children: React.ReactNode;
    headerExtra?: React.ReactNode;
}

export default function AquaModalWrapper({ isOpen, onClose, title, icon, width = '950px', children, headerExtra }: AquaModalWrapperProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

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
                    background: linear-gradient(135deg, ${THEME.accent}, ${THEME.primary});
                    color: white; border: none; padding: 12px 20px; border-radius: 12px;
                    font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.3s;
                    box-shadow: 0 10px 25px rgba(40, 145, 200, 0.4);
                }
                .btn-glass-save:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 15px 35px rgba(40, 145, 200, 0.5); }
                .btn-glass-save:active:not(:disabled) { transform: scale(0.98); }
                .btn-glass-save:disabled { opacity: 0.7; cursor: not-allowed; }

                .btn-glass-cancel {
                    background: rgba(255, 255, 255, 0.6);
                    color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.8); padding: 12px 20px; border-radius: 12px;
                    font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.3s;
                }
                .btn-glass-cancel:hover { background: rgba(255, 255, 255, 0.9); transform: translateY(-2px); }

                @keyframes modalScaleUp { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

                @media (max-width: 768px) {
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

            <div className="cinematic-scroll glass-modal-container" onClick={(e) => e.stopPropagation()} style={{ 
                width: width, maxHeight: '95vh', background: 'rgba(248, 250, 252, 0.85)', 
                backdropFilter: 'blur(12px)', borderRadius: '25px', padding: '15px 25px', 
                boxShadow: '0 30px 60px rgba(0,0,0,0.25)', overflowY: 'auto', direction: 'rtl',
                border: '1px solid rgba(255,255,255,0.7)',
                animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                
                <div className="modal-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: `2px solid ${THEME.accent}50`, paddingBottom: '15px' }}>
                    <h2 style={{ color: THEME.primary, fontWeight: 900, margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {icon && <span>{icon}</span>}
                        <span>{title}</span>
                    </h2>

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
