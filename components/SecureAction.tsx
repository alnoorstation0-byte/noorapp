// @ts-nocheck
"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePermissions } from '@/lib/PermissionsContext';
import { THEME } from '@/lib/theme';
import { toast } from 'react-hot-toast';

interface SecureActionProps {
    module: string;
    action: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function SecureAction({ module, action, children, fallback = null }: SecureActionProps) {
    const { can, loading, role } = usePermissions();
    const [mounted, setMounted] = useState(false);
    const [showDeniedModal, setShowDeniedModal] = useState(false);
    
    // لحالة تأكيد الحذف
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<any>(null);
    const [originalOnClick, setOriginalOnClick] = useState<((e: any) => void) | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (loading) return null; 

    // 🛠️ دالة مساعدة لتغليف أزرار الحذف برسالة تأكيد كوميدية
    const renderWithDeleteConfirmation = (content: React.ReactNode) => {
        if (action !== 'delete') return <>{content}</>;
        
        return (
            <>
                {React.Children.map(content, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as any, {
                            onClick: (e: any) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // نحفظ الدالة الأصلية والحدث لنمررهم لاحقاً
                                setOriginalOnClick(() => child.props.onClick);
                                setPendingEvent(e);
                                setShowDeleteConfirm(true);
                            }
                        });
                    }
                    return child;
                })}

                {showDeleteConfirm && mounted && typeof document !== 'undefined' && createPortal(
                    <div 
                        className="secure-action-delete-modal-overlay" 
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                        style={{ 
                            position: 'fixed', 
                            inset: 0, 
                            top: 0, left: 0, right: 0, bottom: 0,
                            width: '100vw', height: '100vh', 
                            background: 'rgba(15, 23, 42, 0.82)', 
                            backdropFilter: 'blur(10px)', 
                            WebkitBackdropFilter: 'blur(10px)',
                            zIndex: 999999999, 
                            isolation: 'isolate',
                            pointerEvents: 'auto',
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            padding: '20px'
                        }}
                    >
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.95)', 
                                padding: '30px', 
                                borderRadius: '24px', 
                                textAlign: 'center', 
                                boxShadow: '0 25px 60px rgba(0,0,0,0.5)', 
                                animation: 'scaleUp 0.25s ease-out', 
                                maxWidth: '420px', 
                                width: '90%', 
                                border: `2px solid ${THEME.danger || '#ef4444'}` 
                            }}
                        >
                            <div style={{ marginBottom: '15px', fontSize: '42px' }}>
                                ⚠️
                            </div>
                            <h2 style={{ color: THEME.danger || '#ef4444', fontWeight: 900, marginBottom: '10px', fontSize: '22px' }}>
                                هل أنت متأكد من الحذف؟
                            </h2>
                            <p style={{ color: '#475569', fontSize: '14px', fontWeight: 700, marginBottom: '25px', lineHeight: 1.6 }}>
                                لا يمكن التراجع عن هذه العملية بعد إتمامها نهائياً.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        if (originalOnClick) {
                                            originalOnClick(pendingEvent);
                                        }
                                    }}
                                    style={{ flex: 1, padding: '12px', background: THEME.danger || '#ef4444', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '15px', transition: '0.2s', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}
                                >
                                    نعم، احذف
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{ flex: 1, padding: '12px', background: 'rgba(203, 213, 225, 0.6)', color: '#1e293b', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '15px', transition: '0.2s' }}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                        <style>{`
                            @keyframes scaleUp {
                                from { transform: scale(0.85); opacity: 0; }
                                to { transform: scale(1); opacity: 1; }
                            }
                        `}</style>
                    </div>,
                    document.body
                )}
            </>
        );
    };

    const hasAccess = role === 'super_admin' || role === 'admin' || can(module, action);

    if (hasAccess) {
        return renderWithDeleteConfirmation(children);
    }
    
    // إذا كان الأكشن "post" (ترحيل) ومفيش صلاحية، نظهر الزر، ولما يضغط تطلع له توست عادية
    if (action === 'post') {
        return (
            <>
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as any, {
                            onClick: (e: any) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toast.error('عفواً، لا تملك صلاحية الترحيل');
                            }
                        });
                    }
                    return child;
                })}
            </>
        );
    }

    return <>{fallback}</>;
}
