"use client";
import { useLanguage } from '@/lib/LanguageContext';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function OpenShiftsModal({
    isOpen,
    onClose,
    openShifts = [],
    warehouses = [],
    delegates = [],
    currentShiftId,
    onSelectShift,
    onOpenNewShift,
    onViewDetails
}: any) {
    const { language } = useLanguage();
    const isEn = language === 'en';
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(11, 14, 20, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999999999,
            padding: '15px'
        }}>
            <style>{`
                .shift-card-item {
                    background: rgba(20, 24, 34, 0.7);
                    border: 1.5px solid rgba(0, 229, 255, 0.18);
                    border-radius: 18px;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                }
                .shift-card-item:hover {
                    transform: translateY(-3px);
                    border-color: #00E5FF;
                    box-shadow: 0 8px 25px rgba(0, 229, 255, 0.2);
                    background: rgba(25, 30, 44, 0.9);
                }
                .shift-card-item.active {
                    border: 2px solid #10B981;
                    background: rgba(16, 185, 129, 0.1);
                }
                .btn-switch-shift {
                    background: linear-gradient(135deg, #00E5FF 0%, #0284C7 100%);
                    color: #0B0E14;
                    border: none;
                    border-radius: 12px;
                    padding: 10px 18px;
                    min-height: 44px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(0, 229, 255, 0.25);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-switch-shift:hover {
                    transform: scale(1.03);
                    background: linear-gradient(135deg, #0284C7 0%, #00E5FF 100%);
                }
                @media (max-width: 768px) {
                    .shift-card-item {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                        padding: 14px;
                    }
                    .shift-card-item > div:last-child {
                        display: flex;
                        justify-content: stretch;
                        gap: 8px;
                        width: 100%;
                    }
                    .shift-card-item > div:last-child > button,
                    .shift-card-item > div:last-child > span {
                        flex: 1;
                        text-align: center;
                        justify-content: center;
                    }
                }

                /* Daylight Desert Glassmorphism */
                .daylight-theme .open-shifts-modal-box {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(245, 238, 228, 0.95) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.4) !important;
                    box-shadow: 0 25px 60px rgba(44, 26, 18, 0.2) !important;
                }
                .daylight-theme .open-shifts-modal-box h2 {
                    color: #A8573C !important;
                }
                .daylight-theme .open-shifts-modal-box span {
                    color: rgba(44, 26, 18, 0.7) !important;
                }
                .daylight-theme .open-shifts-modal-box strong {
                    color: #2C1A12 !important;
                }
                .daylight-theme .shift-card-item {
                    background: rgba(255, 255, 255, 0.9) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 4px 15px rgba(44, 26, 18, 0.06) !important;
                }
                .daylight-theme .shift-card-item:hover {
                    border-color: #C29B62 !important;
                    box-shadow: 0 8px 25px rgba(168, 87, 60, 0.15) !important;
                    background: #FFFFFF !important;
                }
                .daylight-theme .shift-card-item.active {
                    border: 2px solid #4E734F !important;
                    background: rgba(78, 115, 79, 0.1) !important;
                }
                .daylight-theme .btn-switch-shift {
                    background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%) !important;
                    color: #FFFFFF !important;
                    box-shadow: 0 4px 12px rgba(168, 87, 60, 0.25) !important;
                }
                .daylight-theme .btn-switch-shift:hover {
                    background: linear-gradient(135deg, #A8573C 0%, #C29B62 100%) !important;
                }
            `}</style>

            <div className="open-shifts-modal-box" style={{
                background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(15, 20, 30, 0.98) 100%)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '24px',
                width: '95vw',
                maxWidth: '620px',
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: '28px 24px',
                textAlign: 'right',
                direction: 'rtl',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65), 0 0 25px rgba(0, 229, 255, 0.1)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ color: '#00E5FF', margin: 0, fontSize: '20px', fontWeight: 900 }}>
                            📋 {isEn ? 'Currently Active Shifts in System' : 'الورديات النشطة حالياً بالنظام'} ({openShifts.length})
                        </h2>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                            {isEn ? 'Each operator and gas station has an independent shift' : 'لكل مشغل ولكل محطة وقود وردية مستقلة تماماً'}
                        </span>
                    </div>
                    <button 
                        onClick={onClose} 
                        type="button"
                        style={{ 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            color: '#f87171', 
                            border: '1px solid rgba(239, 68, 68, 0.3)', 
                            width: '34px', 
                            height: '34px', 
                            borderRadius: '50%', 
                            fontSize: '16px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 'bold' 
                        }}
                    >
                        ✕
                    </button>
                </div>

                {openShifts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                        <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#00E5FF', marginBottom: '6px' }}>
                            {isEn ? 'No active shifts currently' : 'لا توجد أي وردية نشطة حالياً'}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                            {isEn ? 'You can select a gas station and operator, then click open new shift to start.' : 'يمكنك اختيار محطة الوقود والمشغل ثم الضغط على فتح وردية جديدة للبدء.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenNewShift();
                            }}
                            className="btn-switch-shift"
                            style={{ padding: '12px 26px', fontSize: '15px' }}
                        >
                            ✨ {isEn ? 'Open New Shift Now' : 'فتح وردية جديدة الآن'}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {openShifts.map((shift: any) => {
                            const wh = shift.warehouse || warehouses.find((w: any) => w.id === shift.warehouse_id);
                            const del = shift.delegate || delegates.find((d: any) => 
                                (shift.delegate_id && (d.id === shift.delegate_id || d.partnerId === shift.delegate_id)) ||
                                (shift.user_id && d.userId === shift.user_id)
                            );
                            const isCurrent = currentShiftId === shift.id;

                            return (
                                <div 
                                    key={shift.id} 
                                    className={`shift-card-item ${isCurrent ? 'active' : ''}`}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ 
                                                width: '10px', 
                                                height: '10px', 
                                                borderRadius: '50%', 
                                                background: '#10B981',
                                                boxShadow: '0 0 8px #10B981',
                                                display: 'inline-block' 
                                            }}></span>
                                            <strong style={{ color: '#F8FAFC', fontSize: '15px', fontWeight: 900 }}>
                                                {wh?.name || (isEn ? 'Unknown Branch' : 'مستودع غير محدد')}
                                            </strong>
                                            {wh?.type === 'vehicle' && (
                                                <span style={{ 
                                                    background: 'rgba(0, 229, 255, 0.15)', 
                                                    color: '#00E5FF', 
                                                    fontSize: '10px', 
                                                    fontWeight: 800, 
                                                    padding: '2px 8px', 
                                                    borderRadius: '8px' 
                                                }}>
                                                    🚚 {isEn ? 'Van' : 'سيارة'}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '13px', color: '#94A3B8', display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '2px' }}>
                                            <span>
                                                👤 <strong style={{ color: del ? '#10B981' : '#64748b' }}>
                                                    {del?.name || (isEn ? 'Direct Sales' : 'مبيعات مباشرة')}
                                                </strong>
                                            </span>
                                            <span>
                                                💵 {isEn ? 'Opening Cash:' : 'العهدة:'} <strong style={{ color: '#F8FAFC' }}>{Number(shift.starting_cash || 0).toFixed(2)} {isEn ? 'SAR' : 'ريال'}</strong>
                                            </span>
                                            <span>
                                                🕒 {isEn ? 'Opened:' : 'الفتح:'} <strong style={{ color: '#F8FAFC' }}>
                                                    {shift.opened_at ? new Date(shift.opened_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </strong>
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                            {isEn ? 'Shift ID:' : 'رقم الوردية:'} #{String(shift.id).slice(-6)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {onViewDetails && (
                                            <button
                                                type="button"
                                                onClick={() => onViewDetails(shift.id)}
                                                style={{
                                                    background: 'rgba(0, 229, 255, 0.08)',
                                                    color: '#00E5FF',
                                                    border: '1.5px solid rgba(0, 229, 255, 0.25)',
                                                    padding: '9px 12px',
                                                    borderRadius: '12px',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                title={isEn ? 'Review shift file and details' : 'مراجعة ملف وتفاصيل الوردية كمرجع'}
                                            >
                                                🔍 {isEn ? 'Details' : 'التفاصيل'}
                                            </button>
                                        )}
                                        {isCurrent ? (
                                            <span style={{ 
                                                background: 'rgba(16, 185, 129, 0.15)', 
                                                color: '#10B981', 
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                fontWeight: 900, 
                                                fontSize: '12px', 
                                                padding: '8px 14px', 
                                                borderRadius: '10px',
                                                display: 'inline-block' 
                                            }}>
                                                🟢 {isEn ? 'Currently Displayed' : 'معروضة حالياً'}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onSelectShift(shift);
                                                    onClose();
                                                }}
                                                className="btn-switch-shift"
                                            >
                                                ⚡ {isEn ? 'Switch to this' : 'التبديل إليها'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenNewShift();
                                }}
                                style={{
                                    background: 'rgba(0, 229, 255, 0.05)',
                                    border: '1.5px dashed rgba(0, 229, 255, 0.4)',
                                    color: '#00E5FF',
                                    padding: '12px',
                                    borderRadius: '14px',
                                    width: '100%',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                ➕ {isEn ? 'Open new shift for another station/operator' : 'فتح وردية جديدة لمحطة وقود أو مشغل آخر'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
