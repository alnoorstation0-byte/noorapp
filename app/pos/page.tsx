"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { usePosLogic } from './pos_logic';
import { THEME } from '@/lib/theme';
import LoadingScreen from '@/components/LoadingScreen';
import BarcodeScannerWidget from '@/components/BarcodeScannerWidget';
import InvoicePrintModal from '../invoices/InvoicePrintModal';
import ThermalReceiptModal from '../invoices/ThermalReceiptModal';
import ShiftOpenModal from './ShiftOpenModal';
import ShiftCloseModal from './ShiftCloseModal';
import OpenShiftsModal from './OpenShiftsModal';
import ShiftDetailsModal from './ShiftDetailsModal';
import { FaPlus, FaMinus, FaTrash, FaCheckCircle, FaBarcode } from 'react-icons/fa';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);
};

interface PosItemNumpadModalProps {
    item: any;
    isTaxInclusive: boolean;
    onUpdateItem: (updated: any) => void;
    onConfirm: () => void;
    onClose: () => void;
}

function PosItemNumpadModal({
    item,
    isTaxInclusive,
    onUpdateItem,
    onConfirm,
    onClose,
}: PosItemNumpadModalProps) {
    const [activeField, setActiveField] = React.useState<'qty' | 'price'>('qty');
    const [isFirstPress, setIsFirstPress] = React.useState(true);

    const handleNumpad = (key: string) => {
        const currentVal = activeField === 'qty'
            ? String(item.selected_qty ?? '')
            : String(item.selected_price ?? '');

        let newVal: string;

        if (key === '⌫') {
            newVal = currentVal.slice(0, -1);
            if (!newVal || newVal === '') newVal = '0';
        } else if (key === '.') {
            if (isFirstPress) {
                newVal = '0.';
            } else {
                newVal = currentVal.includes('.') ? currentVal : currentVal + '.';
            }
        } else {
            newVal = (isFirstPress || currentVal === '0') ? key : currentVal + key;
        }

        setIsFirstPress(false);
        const num = parseFloat(newVal) || 0;

        if (activeField === 'qty') {
            onUpdateItem({ ...item, selected_qty: key === '⌫' ? (Number(newVal) || 0) : num });
        } else {
            onUpdateItem({ ...item, selected_price: key === '⌫' ? (Number(newVal) || 0) : (parseFloat(newVal) || 0) });
        }
    };

    const switchField = (field: 'qty' | 'price') => {
        setActiveField(field);
        setIsFirstPress(true);
    };

    // 📱 Phone dialer layout: 1, 2, 3 at top
    const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

    const isExceeded = (item.selected_qty || 0) > (item.available_qty || 0);
    const totalPrice = (item.selected_qty || 0) * (item.selected_price || 0);

    return (
        <div className="pos-numpad-overlay">
            <style>{`
                .pos-numpad-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.65);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    padding: 16px;
                    box-sizing: border-box;
                    direction: rtl;
                }
                .pos-numpad-card {
                    background: rgba(255, 255, 255, 0.98);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 410px;
                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    animation: posCardFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    overflow: hidden;
                }
                .pos-mobile-drag-bar {
                    display: none;
                }
                .pos-numpad-header {
                    background: linear-gradient(135deg, #1C73AB 0%, #2891C8 100%);
                    padding: 12px 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                    position: relative;
                }
                .pos-numpad-body {
                    padding: 14px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    box-sizing: border-box;
                }
                .pos-field-box {
                    border-radius: 14px;
                    padding: 8px 10px;
                    cursor: pointer;
                    transition: 0.18s;
                    text-align: center;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .pos-field-box:active {
                    transform: scale(0.98);
                }
                .pos-qty-display {
                    font-size: 26px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                }
                .pos-price-display {
                    font-size: 22px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                }
                .pos-key-btn {
                    height: 44px;
                    border-radius: 12px;
                    border: 1px solid rgba(28, 115, 171, 0.12);
                    font-weight: 900;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                    transition: transform 0.08s, background 0.12s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .pos-key-btn:active {
                    transform: scale(0.92) !important;
                }
                .pos-quick-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    font-size: 18px;
                    font-weight: 900;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.08s;
                    -webkit-tap-highlight-color: transparent;
                }
                .pos-quick-btn:active {
                    transform: scale(0.9) !important;
                }
                .pos-fields-grid {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 8px !important;
                    flex-direction: unset !important;
                    box-sizing: border-box !important;
                }
                .pos-numpad-grid {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 6px !important;
                    direction: ltr !important;
                    flex-direction: unset !important;
                    box-sizing: border-box !important;
                }
                .pos-action-grid {
                    display: grid !important;
                    grid-template-columns: 1fr 2.2fr !important;
                    gap: 8px !important;
                    margin-top: 2px !important;
                    flex-direction: unset !important;
                    box-sizing: border-box !important;
                }

                @keyframes posCardFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes posSheetSlideUp {
                    from { opacity: 0.8; transform: translateY(100%); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* 📱 MOBILE RESPONSIVENESS (<= 768px) - ZERO SCROLL GUARANTEE */
                @media (max-width: 768px) {
                    .pos-numpad-overlay {
                        align-items: flex-end !important;
                        padding: 0 !important;
                    }
                    .pos-numpad-card {
                        max-width: 100vw !important;
                        width: 100vw !important;
                        border-radius: 22px 22px 0 0 !important;
                        max-height: 98vh !important;
                        overflow: hidden !important;
                        animation: posSheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
                        border-bottom: none !important;
                        border-left: none !important;
                        border-right: none !important;
                    }
                    .pos-mobile-drag-bar {
                        display: block;
                        width: 36px;
                        height: 4px;
                        background: rgba(255, 255, 255, 0.7);
                        border-radius: 999px;
                        margin: 0 auto 6px auto;
                    }
                    .pos-numpad-header {
                        padding: 8px 14px 10px 14px !important;
                        flex-direction: column !important;
                        align-items: stretch !important;
                        border-radius: 22px 22px 0 0 !important;
                    }
                    .pos-numpad-header-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        width: 100%;
                    }
                    .pos-numpad-title {
                        font-size: 15px !important;
                        line-height: 1.2 !important;
                    }
                    .pos-numpad-sub {
                        font-size: 11px !important;
                        margin-top: 1px !important;
                    }
                    .pos-numpad-body {
                        padding: 10px 12px 14px 12px !important;
                        gap: 6px !important;
                        overflow: hidden !important;
                        padding-bottom: max(14px, env(safe-area-inset-bottom, 14px)) !important;
                    }
                    .pos-fields-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 6px !important;
                        flex-direction: unset !important;
                    }
                    .pos-field-box {
                        padding: 6px 8px !important;
                        border-radius: 12px !important;
                    }
                    .pos-qty-display {
                        font-size: 22px !important;
                    }
                    .pos-price-display {
                        font-size: 19px !important;
                    }
                    .pos-quick-btn {
                        width: 30px !important;
                        height: 30px !important;
                        font-size: 17px !important;
                    }
                    .pos-quick-label {
                        font-size: 11px !important;
                        min-width: 65px !important;
                    }
                    .pos-numpad-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 5px !important;
                        direction: ltr !important;
                        flex-direction: unset !important;
                    }
                    .pos-key-btn {
                        height: 38px !important;
                        font-size: 18px !important;
                        border-radius: 10px !important;
                    }
                    .pos-action-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 2.2fr !important;
                        gap: 6px !important;
                        margin-top: 2px !important;
                        flex-direction: unset !important;
                    }
                    .pos-action-btn-main {
                        height: 42px !important;
                        font-size: 13px !important;
                        border-radius: 11px !important;
                    }
                    .pos-action-btn-sub {
                        height: 42px !important;
                        font-size: 13px !important;
                        border-radius: 11px !important;
                    }
                }
            `}</style>

            <div className="pos-numpad-card">
                {/* Header */}
                <div className="pos-numpad-header">
                    <div className="pos-mobile-drag-bar" />
                    <div className="pos-numpad-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingLeft: '8px' }}>
                            <div className="pos-numpad-title" style={{ color: 'white', fontWeight: 900, fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.name}
                            </div>
                            <div className="pos-numpad-sub" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>
                                الرصيد المتاح: <span style={{ fontWeight: 800, color: '#fff' }}>{item.available_qty}</span> {item.unit}
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            style={{ background: 'rgba(255,255,255,0.22)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '17px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            aria-label="إغلاق"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="pos-numpad-body">

                    {/* Active Field Displays */}
                    <div className="pos-fields-grid">
                        {/* Qty Field */}
                        <div
                            onClick={() => switchField('qty')}
                            className="pos-field-box"
                            style={{ 
                                background: isExceeded
                                    ? '#fee2e2'
                                    : (activeField === 'qty' ? 'linear-gradient(135deg,#1C73AB,#2891C8)' : '#f8fafc'), 
                                border: isExceeded
                                    ? '2px solid #ef4444'
                                    : (activeField === 'qty' ? '2px solid #2891C8' : '1.5px solid #e2e8f0'), 
                                boxShadow: activeField === 'qty' ? '0 4px 12px rgba(28, 115, 171, 0.25)' : 'none'
                            }}
                        >
                            <div style={{ fontSize: '10px', fontWeight: 800, color: isExceeded ? '#dc2626' : (activeField === 'qty' ? 'rgba(255,255,255,0.9)' : '#64748b'), marginBottom: '2px' }}>
                                {isExceeded ? '⚠️ تجاوز المخزون' : 'الكمية المطلوبة'}
                            </div>
                            <div className="pos-qty-display" style={{ color: isExceeded ? '#dc2626' : (activeField === 'qty' ? 'white' : '#0f172a') }}>
                                {item.selected_qty || 0}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: isExceeded ? '#dc2626' : (activeField === 'qty' ? 'rgba(255,255,255,0.75)' : '#94a3b8'), marginTop: '1px' }}>
                                {item.unit || 'حبة'}
                            </div>
                        </div>

                        {/* Price Field */}
                        <div
                            onClick={() => switchField('price')}
                            className="pos-field-box"
                            style={{ 
                                background: activeField === 'price' ? 'linear-gradient(135deg,#16a34a,#10b981)' : '#f8fafc', 
                                border: activeField === 'price' ? '2px solid #16a34a' : '1.5px solid #e2e8f0', 
                                boxShadow: activeField === 'price' ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none'
                            }}
                        >
                            <div style={{ fontSize: '10px', fontWeight: 800, color: activeField === 'price' ? 'rgba(255,255,255,0.9)' : '#64748b', marginBottom: '2px' }}>
                                {isTaxInclusive ? 'السعر (شامل الضريبة)' : 'السعر (قبل الضريبة)'}
                            </div>
                            <div className="pos-price-display" style={{ color: activeField === 'price' ? 'white' : '#16a34a' }}>
                                {Number(item.selected_price || 0).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: activeField === 'price' ? 'rgba(255,255,255,0.75)' : '#94a3b8', marginTop: '1px' }}>
                                ريال
                            </div>
                        </div>
                    </div>

                    {/* Stock Warning Message */}
                    {isExceeded && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 8px', color: '#b91c1c', fontSize: '11px', fontWeight: 800, textAlign: 'center' }}>
                            ⛔ الكمية المطلوبة ({item.selected_qty}) تتجاوز الرصيد ({item.available_qty})!
                        </div>
                    )}

                    {/* Quick +/- for Qty */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => { onUpdateItem({ ...item, selected_qty: Math.max(1, (item.selected_qty || 1) - 1) }); setIsFirstPress(false); }}
                            className="pos-quick-btn"
                            style={{ background: '#fee2e2', color: '#dc2626' }}
                            title="إنقاص الكمية 1"
                        >
                            −
                        </button>
                        <span className="pos-quick-label" style={{ fontSize: '12px', color: '#64748b', fontWeight: 800, minWidth: '70px', textAlign: 'center' }}>
                            تعديل سريع
                        </span>
                        <button
                            type="button"
                            onClick={() => { const next = (item.selected_qty || 1) + 1; if(next <= (item.available_qty || 999999)) { onUpdateItem({ ...item, selected_qty: next }); setIsFirstPress(false); } }}
                            className="pos-quick-btn"
                            style={{ background: '#dcfce7', color: '#16a34a' }}
                            title="زيادة الكمية 1"
                        >
                            +
                        </button>
                    </div>

                    {/* 📱 Phone Dialer Numpad: 1 2 3 at top */}
                    <div className="pos-numpad-grid">
                        {numpadKeys.map(key => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleNumpad(key)}
                                className="pos-key-btn"
                                style={{
                                    background: key === '⌫' ? '#fee2e2' : key === '.' ? '#f0f9ff' : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                                    color: key === '⌫' ? '#dc2626' : key === '.' ? '#0284c7' : '#0f172a',
                                }}
                            >
                                {key}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons with Integrated Total */}
                    <div className="pos-action-grid">
                        <button
                            type="button"
                            onClick={onClose}
                            className="pos-action-btn-sub"
                            style={{ 
                                height: '44px', 
                                background: '#f8fafc', 
                                color: '#64748b', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '12px', 
                                fontWeight: 800, 
                                fontSize: '13px', 
                                cursor: 'pointer' 
                            }}
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={!item.selected_qty || item.selected_qty <= 0 || isExceeded}
                            className="pos-action-btn-main"
                            style={{ 
                                height: '44px', 
                                background: isExceeded
                                    ? 'linear-gradient(135deg, #ef4444, #991b1b)'
                                    : 'linear-gradient(135deg,#1C73AB,#2891C8)', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontWeight: 900, 
                                fontSize: '13px', 
                                cursor: isExceeded ? 'not-allowed' : 'pointer', 
                                boxShadow: isExceeded ? 'none' : '0 4px 15px rgba(28, 115, 171, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: '0.15s'
                            }}
                        >
                            {isExceeded ? (
                                <span>⛔ تجاوز المخزون ({item.available_qty})</span>
                            ) : (
                                <>
                                    <span>🛒 إضافة للسلة</span>
                                    <span style={{ opacity: 0.65 }}>|</span>
                                    <span style={{ fontWeight: 900, fontSize: '14px' }}>
                                        {formatCurrency(totalPrice)}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function PosPage() {
    const logic = usePosLogic();
    const [inspectShiftId, setInspectShiftId] = React.useState<string | null>(null);

    return (
        <MasterPage 
            title="نقاط البيع (POS)" 
            subtitle="شاشة المبيعات السريعة (كاشير) من منافذ البيع" 
            icon="🛍️"
        >
            <style>{`
                /* 🎛️ شريط تحكم الكاشير الماسي */
                .pos-control-bar {
                    background: rgba(255, 255, 255, 0.72);
                    backdrop-filter: blur(25px) saturate(180%);
                    -webkit-backdrop-filter: blur(25px);
                    border: 1px solid rgba(255, 255, 255, 0.85);
                    border-radius: 20px;
                    box-shadow: 0 8px 25px rgba(28, 115, 171, 0.08);
                    padding: 12px 20px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 14px;
                }
                .pos-selectors-group {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    flex-wrap: wrap;
                }
                .pos-select-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .pos-item-label {
                    font-size: 13px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    white-space: nowrap;
                }
                .pos-glass-select {
                    padding: 9px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 800;
                    color: #122946;
                    background: rgba(255, 255, 255, 0.95);
                    border: 1.5px solid rgba(28, 115, 171, 0.22);
                    box-shadow: 0 2px 8px rgba(28, 115, 171, 0.06);
                    outline: none;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    min-height: 42px;
                }
                .pos-glass-select:focus {
                    border-color: #1C73AB;
                    box-shadow: 0 0 0 3px rgba(28, 115, 171, 0.15);
                }
                .pos-badge-delegate {
                    font-size: 11px;
                    font-weight: 800;
                    color: #16a34a;
                    background: rgba(22, 163, 74, 0.12);
                    padding: 4px 10px;
                    border-radius: 20px;
                    white-space: nowrap;
                    border: 1px solid rgba(22, 163, 74, 0.25);
                }
                .pos-shift-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .pos-shift-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 14px;
                    font-size: 12px;
                    font-weight: 800;
                }
                .pos-shift-status.open {
                    background: rgba(22, 163, 74, 0.08);
                    color: #16a34a;
                    border: 1px solid rgba(22, 163, 74, 0.25);
                }
                .pos-shift-status.closed {
                    background: rgba(100, 116, 139, 0.08);
                    color: #64748b;
                    border: 1px solid rgba(100, 116, 139, 0.2);
                }
                .pos-pulse-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                }
                .pos-pulse-dot.green {
                    background: #16a34a;
                    box-shadow: 0 0 8px #16a34a;
                    animation: pulseDot 2s infinite;
                }
                .pos-pulse-dot.gray {
                    background: #94a3b8;
                }
                @keyframes pulseDot {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
                }
                .pos-btn-shift {
                    padding: 9px 20px;
                    border-radius: 12px;
                    border: none;
                    cursor: pointer;
                    font-weight: 800;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: 0.2s;
                    min-height: 42px;
                }
                .pos-btn-shift.open {
                    background: linear-gradient(135deg, #16a34a 0%, #10b981 100%);
                    color: white;
                    box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
                }
                .pos-btn-shift.close {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
                }
                .pos-btn-shift:hover {
                    transform: translateY(-2px);
                }

                .pos-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                    height: calc(100vh - 235px);
                    min-height: 480px;
                }
                @media (max-width: 1024px) {
                    .pos-grid { grid-template-columns: 1fr; height: auto; }
                }
                @media (max-width: 768px) {
                    .pos-control-bar {
                        padding: 12px;
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }
                    .pos-selectors-group {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                    }
                    .pos-select-item {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 4px;
                    }
                    .pos-glass-select {
                        width: 100% !important;
                    }
                    .pos-shift-group {
                        flex-direction: column;
                        align-items: stretch;
                        width: 100%;
                        gap: 8px;
                    }
                    .pos-btn-shift {
                        width: 100%;
                        justify-content: center;
                    }
                }
                .items-section, .cart-section {
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(20px);
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.8);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .items-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 15px;
                    overflow-y: auto;
                    padding-right: 5px;
                    margin-top: 15px;
                }
                .pos-item-card {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(28, 115, 171, 0.1);
                    border-radius: 16px;
                    padding: 15px;
                    cursor: pointer;
                    transition: 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 10px;
                    position: relative;
                }
                .pos-item-card.critical {
                    border: 1.5px solid #ef4444;
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
                    background: rgba(254, 242, 242, 0.85);
                }
                .pos-item-card.near-low {
                    border: 1.5px solid #f59e0b;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.18);
                    background: rgba(255, 251, 235, 0.85);
                }
                .pos-item-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 20px rgba(28, 115, 171, 0.15);
                    border-color: ${THEME.goldAccent};
                }
                .pos-item-name { font-weight: 900; color: #122946; fontSize: 14px; }
                .pos-item-price { font-weight: 900; color: #16a34a; fontSize: 16px; }
                .pos-item-qty { font-size: 11px; color: #64748b; font-weight: bold; background: #f1f5f9; padding: 3px 8px; border-radius: 10px; }
                
                .cart-list {
                    flex: 1;
                    overflow-y: auto;
                    margin-top: 15px;
                    padding-right: 5px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .cart-item {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 10px 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .qty-btn {
                    width: 28px; height: 28px;
                    border-radius: 50%;
                    border: none;
                    background: #f1f5f9;
                    color: #0f172a;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                }
                .qty-btn:hover { background: #e2e8f0; }
                .remove-btn { color: #ef4444; background: #fee2e2; border: none; padding: 5px 10px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: bold; }
                .checkout-panel {
                    background: #122946;
                    color: white;
                    border-radius: 20px;
                    padding: 20px;
                    margin-top: 15px;
                }
                .summary-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #cbd5e1; }
                .summary-total { display: flex; justify-content: space-between; font-size: 22px; font-weight: 900; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); color: #10b981; }
            `}</style>

            {/* 🎛️ شريط تحكم الكاشير المتكامل (منفذ البيع + المندوب + الوردية) */}
            <div className="pos-control-bar">
                <div className="pos-selectors-group">
                    {/* منفذ البيع */}
                    <div className="pos-select-item">
                        <span className="pos-item-label" style={{ color: THEME.primary }}>
                            🏪 منفذ البيع:
                        </span>
                        <select 
                            className="pos-glass-select" 
                            value={logic.selectedWarehouseId}
                            onChange={(e) => logic.setSelectedWarehouseId(e.target.value)}
                            style={{ minWidth: '190px' }}
                            disabled={logic.isDelegateLocked}
                        >
                            <option value="" disabled>-- اختر منفذ البيع --</option>
                            {logic.warehouses.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* المندوب */}
                    <div className="pos-select-item">
                        <span className="pos-item-label" style={{ color: '#16a34a' }}>
                            👤 المندوب / الكاشير:
                        </span>
                        <select 
                            className="pos-glass-select" 
                            value={logic.delegateId}
                            onChange={(e) => logic.setDelegateId(e.target.value)}
                            style={{ 
                                minWidth: '180px',
                                borderColor: logic.delegateId ? '#16a34a' : undefined
                            }}
                            disabled={logic.isDelegateLocked}
                        >
                            <option value="">-- اختر المندوب --</option>
                            {logic.delegates.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {logic.delegateId && (
                            <span className="pos-badge-delegate">
                                ✅ {logic.isDelegateLocked ? 'حسابك المقترن' : 'تم التعيين'}
                            </span>
                        )}
                    </div>

                    {/* أمر تشغيل الرحلة المرتبط تلقائياً */}
                    {logic.activeFleetOperation && (
                        <div className="pos-select-item" style={{
                            background: 'rgba(2, 132, 199, 0.08)',
                            border: '1.5px solid rgba(2, 132, 199, 0.3)',
                            padding: '5px 12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#0284c7' }}>
                                🚚 أمر التشغيل:
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                                {logic.activeFleetOperation.operation_number}
                            </span>
                            {((Array.isArray(logic.activeFleetOperation.vehicle) ? logic.activeFleetOperation.vehicle[0]?.plate_number : (logic.activeFleetOperation.vehicle as any)?.plate_number)) && (
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>
                                    ({Array.isArray(logic.activeFleetOperation.vehicle) ? logic.activeFleetOperation.vehicle[0]?.plate_number : (logic.activeFleetOperation.vehicle as any)?.plate_number})
                                </span>
                            )}
                            <span style={{ 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                background: '#dcfce7', 
                                color: '#16a34a', 
                                padding: '2px 6px', 
                                borderRadius: '6px' 
                            }}>
                                مربوط تلقائياً ⚡
                            </span>
                        </div>
                    )}
                </div>

                {/* إدارة الوردية */}
                <div className="pos-shift-group">
                    {logic.activeShift ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div className="pos-shift-status open" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="pos-pulse-dot green"></span>
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: '13px' }}>
                                        وردية نشطة #{String(logic.activeShift.id).slice(-4)}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>
                                        {logic.warehouses.find((w: any) => w.id === logic.activeShift.warehouse_id)?.name || ''}
                                        {logic.activeShift.delegate_id && ` • ${logic.delegates.find((d: any) => d.id === logic.activeShift.delegate_id)?.name || ''}`}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setInspectShiftId(logic.activeShift.id)}
                                type="button"
                                style={{
                                    padding: '9px 14px',
                                    borderRadius: '12px',
                                    border: '1.5px solid rgba(28, 115, 171, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.85)',
                                    color: '#1C73AB',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    backdropFilter: 'blur(10px)',
                                    minHeight: '40px'
                                }}
                                title="مراجعة وتدقيق تفاصيل الوردية كمرجع"
                            >
                                🔍 تفاصيل الوردية
                            </button>
                            <button 
                                onClick={() => logic.setIsShiftCloseModalOpen(true)}
                                className="pos-btn-shift close"
                            >
                                🔒 إغلاق الوردية
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div className="pos-shift-status closed" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="pos-pulse-dot gray"></span>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '13px' }}>لا توجد وردية مفتوحة</div>
                                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                                        {logic.warehouses.find((w: any) => w.id === logic.selectedWarehouseId)?.name || 'اختر منفذ البيع'}
                                        {logic.delegateId && ` • ${logic.delegates.find((d: any) => d.id === logic.delegateId)?.name || ''}`}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => logic.setIsShiftOpenModalOpen(true)}
                                className="pos-btn-shift open"
                            >
                                ✨ فتح وردية جديدة
                            </button>
                        </div>
                    )}

                    {/* زر استعراض الورديات المفتوحة لكل المناديب والمستودعات */}
                    {logic.allOpenShifts && logic.allOpenShifts.length > 0 && (
                        <button
                            type="button"
                            onClick={() => logic.setIsOpenShiftsDrawerOpen(true)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.75)',
                                border: '1.5px solid rgba(28, 115, 171, 0.3)',
                                color: '#1C73AB',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backdropFilter: 'blur(10px)',
                                minHeight: '40px'
                            }}
                            title="عرض ورديات كل المناديب والمستودعات والتبديل بينها"
                        >
                            📋 الورديات النشطة ({logic.allOpenShifts.length})
                        </button>
                    )}
                </div>
            </div>

            {logic.isLoading ? (
                <LoadingScreen message="جاري تحضير شاشة الكاشير..." fullScreen={false} />
            ) : (
                <div className="pos-grid">

                    
                    {/* Left: Items Selection */}
                    <div className="items-section">
                        {/* Shift Required Alert Banner */}
                        {!logic.activeShift && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.05) 100%)',
                                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                                borderRadius: '16px',
                                padding: '14px 20px',
                                marginBottom: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.08)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '42px', height: '42px', borderRadius: '12px',
                                        background: '#fee2e2', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '22px'
                                    }}>
                                        🔒
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '14px', color: '#b91c1c' }}>
                                            الوردية مغلقة حالياً — لا يمكن إجراء أي عملية بيع
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>
                                            يجب على المندوب أو البائع الضغط على "بدء الوردية" لتسجيل العهدة وتفعيل نقطة البيع
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => logic.setIsShiftOpenModalOpen(true)}
                                    style={{
                                        background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '10px 20px',
                                        fontSize: '13px',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(28, 115, 171, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>✨</span>
                                    <span>بدء الوردية الآن</span>
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Barcode Scanner */}
                            <BarcodeScannerWidget onScan={logic.handleBarcodeScan} />
                            
                            {/* Low Stock Alert Banner */}
                            {logic.lowStockCount > 0 && (
                                <div style={{
                                    background: 'rgba(254, 243, 199, 0.85)',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    borderRadius: '14px',
                                    padding: '8px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backdropFilter: 'blur(10px)',
                                    gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: '#92400e' }}>
                                        <span style={{ fontSize: '16px' }}>⚠️</span>
                                        <span>تنبيه: يوجد <strong>{logic.lowStockCount}</strong> صنف وصل لحد إعادة الطلب في هذا المنفذ!</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => logic.setOnlyLowStock(!logic.onlyLowStock)}
                                        style={{
                                            background: logic.onlyLowStock ? '#d97706' : 'white',
                                            color: logic.onlyLowStock ? 'white' : '#92400e',
                                            border: '1px solid #d97706',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: '0.2s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {logic.onlyLowStock ? 'عرض كل الأصناف' : 'تصفية النواقص فقط 🔍'}
                                    </button>
                                </div>
                            )}

                            <input 
                                type="text" 
                                className="glass-input-field" 
                                placeholder="ابحث عن صنف بالاسم..." 
                                value={logic.searchQuery}
                                onChange={(e) => logic.setSearchQuery(e.target.value)}
                                style={{ flex: 1 }}
                            />
                        </div>
                        
                        <div className="items-grid cinematic-scroll">
                            {logic.inventoryItems.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#64748b', fontWeight: 'bold' }}>
                                    {logic.onlyLowStock ? 'لا توجد أصناف تحت حد الطلب حالياً 🎉' : 'لا توجد أصناف متاحة في هذا المنفذ حالياً'}
                                </div>
                            ) : (
                                logic.inventoryItems.map((item: any) => {
                                    const cardClass = `pos-item-card ${item.isCriticalLow ? 'critical' : (item.isNearLow ? 'near-low' : '')}`;
                                    return (
                                        <div key={item.id} className={cardClass} onClick={() => logic.handleItemClick(item)}>
                                            {item.isCriticalLow ? (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    color: '#b91c1c',
                                                    background: '#fee2e2',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)'
                                                }}>
                                                    ⚠️ حد الطلب ({item.reorder_level})
                                                </span>
                                            ) : item.isNearLow ? (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    fontSize: '9px',
                                                    fontWeight: 800,
                                                    color: '#b45309',
                                                    background: '#fef3c7',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(245, 158, 11, 0.4)'
                                                }}>
                                                    ⚡ قارب على النفاد
                                                </span>
                                            ) : null}
                                            <div className="pos-item-name" style={{ marginTop: (item.isCriticalLow || item.isNearLow) ? '16px' : '0' }}>{item.name}</div>
                                            <div className="pos-item-price">{formatCurrency(item.suggested_price || item.price || 0)}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', width: '100%' }}>
                                                <div className="pos-item-qty" style={{
                                                    background: item.isCriticalLow ? '#fecaca' : (item.isNearLow ? '#fef08a' : '#f1f5f9'),
                                                    color: item.isCriticalLow ? '#991b1b' : (item.isNearLow ? '#854d0e' : '#64748b'),
                                                    fontWeight: 800,
                                                    flex: 1
                                                }}>
                                                    المتاح: {item.available_qty} {item.unit}
                                                </div>
                                                {item.is_returnable_bottle && (
                                                    <span style={{
                                                        background: 'rgba(40, 145, 200, 0.15)',
                                                        border: '1px solid rgba(40, 145, 200, 0.35)',
                                                        color: '#1C73AB',
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        padding: '4px 6px',
                                                        borderRadius: '8px',
                                                        whiteSpace: 'nowrap',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '2px'
                                                    }}>
                                                        🔄 عهدة
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Cart & Checkout */}
                    <div className="cart-section">
                        <h3 style={{ margin: 0, color: THEME.primary, fontWeight: 900, borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
                            🛒 الفاتورة الحالية
                        </h3>

                        <div className="cart-list cinematic-scroll">
                            {logic.cart.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontWeight: 'bold' }}>
                                    السلة فارغة. انقر على الأصناف لإضافتها.
                                </div>
                            ) : (
                                logic.cart.map((item: any) => (
                                    <div key={item.id} className="cart-item">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 900, fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span>{item.name}</span>
                                                {item.is_returnable_bottle && (
                                                    <span style={{
                                                        background: 'rgba(40, 145, 200, 0.15)',
                                                        color: '#1C73AB',
                                                        border: '1px solid rgba(40, 145, 200, 0.3)',
                                                        borderRadius: '6px',
                                                        padding: '1px 6px',
                                                        fontSize: '10px',
                                                        fontWeight: 800
                                                    }}>
                                                        🔄 عهدة ({item.qty} فوارغ)
                                                    </span>
                                                )}
                                            </div>
                                            <input 
                                                type="number" 
                                                value={item.unit_price !== undefined ? item.unit_price : (item.price || 0)}
                                                onChange={(e) => logic.updateCartItemPrice(item.id, Number(e.target.value))}
                                                onFocus={(e) => e.target.select()}
                                                style={{ width: '80px', fontSize: '12px', color: '#16a34a', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 5px', marginTop: '2px' }}
                                                min={0}
                                                step="any"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 15px' }}>
                                            <button className="qty-btn" onClick={() => logic.updateCartItemQty(item.id, item.qty + 1)}>+</button>
                                            <input 
                                                type="number" 
                                                value={item.qty}
                                                onChange={(e) => logic.updateCartItemQty(item.id, Number(e.target.value))}
                                                onFocus={(e) => e.target.select()}
                                                style={{ width: '40px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px' }}
                                                min={1}
                                            />
                                            <button className="qty-btn" onClick={() => logic.updateCartItemQty(item.id, item.qty - 1)}>-</button>
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '14px', color: '#0f172a', width: '70px', textAlign: 'left' }}>
                                            {formatCurrency(item.qty * (item.unit_price || item.price || 0))}
                                        </div>
                                        <button className="remove-btn" onClick={() => logic.removeFromCart(item.id)}>❌</button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="checkout-panel">
                            {/* Customer & Payment Method */}
                            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <select 
                                    className="glass-input-field" 
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                    value={logic.partnerId}
                                    onChange={e => logic.setPartnerId(e.target.value)}
                                >
                                    <option value="" style={{ color: 'black' }}>عميل نقدي (بدون اسم)</option>
                                    {logic.customers.map((c: any) => (
                                        <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>
                                    ))}
                                </select>
                                <select 
                                    className="glass-input-field" 
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                    value={logic.paymentMethod}
                                    onChange={(e: any) => logic.setPaymentMethod(e.target.value)}
                                >
                                    <option value="نقدي (كاش)" style={{ color: 'black' }}>الدفع نقدي (كاش)</option>
                                    <option value="شبكة (مدى)" style={{ color: 'black' }}>شبكة (مدى / بطاقة)</option>
                                    <option value="آجل" style={{ color: 'black' }}>آجل (على الحساب)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '10px' }}>
                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>طريقة الحساب:</span>
                                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button 
                                        onClick={() => logic.setIsTaxInclusive(true)}
                                        style={{ border: 'none', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: logic.isTaxInclusive ? '#16a34a' : 'transparent', color: logic.isTaxInclusive ? 'white' : '#475569', transition: '0.3s' }}
                                    >شامل الضريبة</button>
                                    <button 
                                        onClick={() => logic.setIsTaxInclusive(false)}
                                        style={{ border: 'none', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: !logic.isTaxInclusive ? '#3b82f6' : 'transparent', color: !logic.isTaxInclusive ? 'white' : '#475569', transition: '0.3s' }}
                                    >غير شامل</button>
                                </div>
                            </div>
                            <div className="summary-row">
                                <span>المجموع الفرعي:</span>
                                <span>{formatCurrency(logic.cartTotal.subtotal)}</span>
                            </div>
                            <div className="summary-row">
                                <span>ضريبة القيمة المضافة (15%):</span>
                                <span>{formatCurrency(logic.cartTotal.tax)}</span>
                            </div>
                            <div className="summary-total">
                                <span>الإجمالي المطلوب:</span>
                                <span>{formatCurrency(logic.cartTotal.total)}</span>
                            </div>

                            {/* 🔄 إشعار عهدة الفوارغ المستحقة إن وُجدت أصناف فوارغ بالسلة */}
                            {(() => {
                                const totalReturnable = logic.cart.reduce((acc: number, it: any) => acc + (it.is_returnable_bottle ? (Number(it.qty) || 0) : 0), 0);
                                if (totalReturnable <= 0) return null;
                                return (
                                    <div style={{
                                        margin: '12px 0',
                                        padding: '10px 14px',
                                        background: 'linear-gradient(135deg, rgba(40, 145, 200, 0.15) 0%, rgba(127, 212, 227, 0.25) 100%)',
                                        border: '1.5px solid rgba(40, 145, 200, 0.4)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        boxShadow: '0 4px 12px rgba(40, 145, 200, 0.08)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '20px' }}>🔄</span>
                                            <div>
                                                <div style={{ fontSize: '12.5px', fontWeight: 900, color: '#1C73AB' }}>عهدة فوارغ مستحقة:</div>
                                                <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>تنزل تلقائياً بالوردية وحساب العميل</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#122946', background: 'white', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(40, 145, 200, 0.3)' }}>
                                            {totalReturnable} عبوة / جالون
                                        </span>
                                    </div>
                                );
                            })()}

                            {!logic.activeShift ? (
                                <button 
                                    type="button"
                                    onClick={() => logic.setIsShiftOpenModalOpen(true)}
                                    className="btn-main-glass"
                                    style={{ 
                                        width: '100%', marginTop: '20px', 
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                                        color: 'white', fontSize: '15px', fontWeight: 900, padding: '15px',
                                        boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <span>🔒</span>
                                    <span>اضغط لبدء الوردية أولاً لإتمام البيع</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={logic.handleCheckout}
                                    disabled={logic.cart.length === 0 || logic.isCheckingOut}
                                    className="btn-main-glass"
                                    style={{ 
                                        width: '100%', marginTop: '20px', 
                                        background: logic.cart.length > 0 ? '#10b981' : 'rgba(255,255,255,0.1)', 
                                        color: 'white', fontSize: '18px', padding: '15px' 
                                    }}
                                >
                                    {logic.isCheckingOut ? '⏳ جاري الإصدار...' : '✅ الدفع وإصدار الفاتورة'}
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            )}
        
            {/* ===== NUMPAD MODAL ===== */}
            {logic.selectedItemForCart && (
                <PosItemNumpadModal
                    item={logic.selectedItemForCart}
                    isTaxInclusive={logic.isTaxInclusive}
                    onUpdateItem={logic.setSelectedItemForCart}
                    onConfirm={logic.confirmAddToCart}
                    onClose={() => logic.setSelectedItemForCart(null)}
                />
            )}


        
            <ThermalReceiptModal 
                isOpen={logic.isThermalPrintModalOpen}
                onClose={() => logic.setIsThermalPrintModalOpen(false)}
                record={logic.lastInvoice || {}}
                onOpenA4={() => logic.setIsPrintModalOpen(true)}
            />

            <InvoicePrintModal 
                isOpen={logic.isPrintModalOpen}
                onClose={() => logic.setIsPrintModalOpen(false)}
                record={logic.lastInvoice || {}}
            />

            <ShiftOpenModal 
                isOpen={logic.isShiftOpenModalOpen} 
                onClose={() => logic.setIsShiftOpenModalOpen(false)} 
                userProfile={logic.userProfile} 
                delegateId={logic.delegateId} 
                warehouseId={logic.selectedWarehouseId} 
                warehouses={logic.warehouses}
                delegates={logic.delegates}
                onWarehouseChange={(id: string) => logic.setSelectedWarehouseId(id)}
                onDelegateChange={(id: string) => logic.setDelegateId(id)}
            />

            <ShiftCloseModal 
                isOpen={logic.isShiftCloseModalOpen} 
                onClose={() => logic.setIsShiftCloseModalOpen(false)} 
                activeShift={logic.activeShift} 
                warehouses={logic.warehouses}
                delegates={logic.delegates}
            />

            <OpenShiftsModal
                isOpen={logic.isOpenShiftsDrawerOpen}
                onClose={() => logic.setIsOpenShiftsDrawerOpen(false)}
                openShifts={logic.allOpenShifts}
                warehouses={logic.warehouses}
                delegates={logic.delegates}
                currentShiftId={logic.activeShift?.id}
                onSelectShift={(shift: any) => logic.switchToShift(shift)}
                onOpenNewShift={() => logic.setIsShiftOpenModalOpen(true)}
                onViewDetails={(id: string) => setInspectShiftId(id)}
            />

            <ShiftDetailsModal
                isOpen={!!inspectShiftId}
                onClose={() => setInspectShiftId(null)}
                shiftId={inspectShiftId}
            />
        </MasterPage>

    );
}
