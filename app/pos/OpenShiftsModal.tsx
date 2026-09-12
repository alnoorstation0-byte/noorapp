"use client";
import React from 'react';

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
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            padding: '15px'
        }}>
            <style>{`
                .shift-card-item {
                    background: rgba(255, 255, 255, 0.85);
                    border: 1.5px solid rgba(28, 115, 171, 0.18);
                    border-radius: 18px;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
                }
                .shift-card-item:hover {
                    transform: translateY(-3px);
                    border-color: #2891C8;
                    box-shadow: 0 8px 25px rgba(28, 115, 171, 0.15);
                    background: rgba(255, 255, 255, 0.98);
                }
                .shift-card-item.active {
                    border: 2px solid #16a34a;
                    background: rgba(240, 253, 244, 0.95);
                }
                .btn-switch-shift {
                    background: linear-gradient(135deg, #1C73AB 0%, #2891C8 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 10px 18px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(28, 115, 171, 0.25);
                }
                .btn-switch-shift:hover {
                    transform: scale(1.03);
                    background: linear-gradient(135deg, #2891C8 0%, #7FD4E3 100%);
                }
            `}</style>

            <div style={{
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '24px',
                width: '95vw',
                maxWidth: '620px',
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: '28px 24px',
                textAlign: 'right',
                direction: 'rtl',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ color: '#1C73AB', margin: 0, fontSize: '20px', fontWeight: 900 }}>
                            📋 الورديات النشطة حالياً بالنظام ({openShifts.length})
                        </h2>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                            لكل مندوب ولكل مستودع وردية مستقلة تماماً
                        </span>
                    </div>
                    <button 
                        onClick={onClose} 
                        type="button"
                        style={{ 
                            background: '#fee2e2', 
                            color: '#ef4444', 
                            border: 'none', 
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
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                        <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#1C73AB', marginBottom: '6px' }}>
                            لا توجد أي وردية نشطة حالياً
                        </h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                            يمكنك اختيار منفذ البيع والمندوب ثم الضغط على فتح وردية جديدة للبدء.
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
                            ✨ فتح وردية جديدة الآن
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {openShifts.map((shift: any) => {
                            const wh = warehouses.find((w: any) => w.id === shift.warehouse_id);
                            const del = delegates.find((d: any) => d.id === shift.delegate_id);
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
                                                background: '#16a34a',
                                                boxShadow: '0 0 8px #16a34a',
                                                display: 'inline-block' 
                                            }}></span>
                                            <strong style={{ color: '#0f172a', fontSize: '15px', fontWeight: 900 }}>
                                                {wh?.name || 'مستودع غير محدد'}
                                            </strong>
                                            {wh?.type === 'vehicle' && (
                                                <span style={{ 
                                                    background: '#e0f2fe', 
                                                    color: '#0284c7', 
                                                    fontSize: '10px', 
                                                    fontWeight: 800, 
                                                    padding: '2px 8px', 
                                                    borderRadius: '8px' 
                                                }}>
                                                    🚚 سيارة
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '2px' }}>
                                            <span>
                                                👤 <strong style={{ color: del ? '#16a34a' : '#64748b' }}>
                                                    {del?.name || 'مبيعات مباشرة (بدون مندوب)'}
                                                </strong>
                                            </span>
                                            <span>
                                                💵 العهدة: <strong>{Number(shift.starting_cash || 0).toFixed(2)} ريال</strong>
                                            </span>
                                            <span>
                                                🕒 الفتح: <strong>
                                                    {shift.opened_at ? new Date(shift.opened_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </strong>
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            رقم الوردية: #{String(shift.id).slice(-6)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {onViewDetails && (
                                            <button
                                                type="button"
                                                onClick={() => onViewDetails(shift.id)}
                                                style={{
                                                    background: 'rgba(28, 115, 171, 0.08)',
                                                    color: '#1C73AB',
                                                    border: '1.5px solid rgba(28, 115, 171, 0.25)',
                                                    padding: '9px 12px',
                                                    borderRadius: '12px',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                title="مراجعة ملف وتفاصيل الوردية كمرجع"
                                            >
                                                🔍 التفاصيل
                                            </button>
                                        )}
                                        {isCurrent ? (
                                            <span style={{ 
                                                background: '#dcfce7', 
                                                color: '#16a34a', 
                                                fontWeight: 900, 
                                                fontSize: '12px', 
                                                padding: '8px 14px', 
                                                borderRadius: '10px',
                                                display: 'inline-block' 
                                            }}>
                                                🟢 معروضة حالياً
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
                                                ⚡ التبديل إليها
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
                                    background: 'transparent',
                                    border: '1.5px dashed #1C73AB',
                                    color: '#1C73AB',
                                    padding: '12px',
                                    borderRadius: '14px',
                                    width: '100%',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                ➕ فتح وردية جديدة لمستودع أو مندوب آخر
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
