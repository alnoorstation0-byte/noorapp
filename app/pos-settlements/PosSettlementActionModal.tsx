"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { ACC } from '@/lib/account-ids';

interface PosSettlementActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    shift: any;
    accounts: any[];
    inventoryItems: any[];
    onExecuteSettlement: (payload: any) => void;
    isSubmitting: boolean;
}

export default function PosSettlementActionModal({
    isOpen,
    onClose,
    shift,
    accounts,
    inventoryItems,
    onExecuteSettlement,
    isSubmitting
}: PosSettlementActionModalProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [activeTab, setActiveTab] = useState<'cash' | 'pumps' | 'inventory' | 'preview'>('cash');

    // Form States
    const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSafeAcc, setSelectedSafeAcc] = useState<string>(ACC.CASH_BOX);
    const [actualCashHandedOver, setActualCashHandedOver] = useState<number>(0);
    const [shortageAction, setShortageAction] = useState<'debt_on_cashier' | 'shortage_expense' | 'rounding' | 'none'>('debt_on_cashier');
    const [settlementNotes, setSettlementNotes] = useState<string>('');

    // Fuel Pumps
    const [pumps, setPumps] = useState<Array<{
        id?: string;
        pump_id: string;
        pump_number?: string;
        pump_name?: string;
        fuel_type?: string;
        unit_price: number;
        start_reading: number;
        end_reading: number | null;
        liters_pumped: number;
        expected_amount: number;
        notes?: string;
    }>>([]);

    // Legacy Bottles
    const [bottlesReturned, setBottlesReturned] = useState<number>(0);
    const [bottlesShortage, setBottlesShortage] = useState<number>(0);
    const [returnBottlesToMain, setReturnBottlesToMain] = useState<boolean>(false);

    // Inventory return rows
    const [returnRows, setReturnRows] = useState<Array<{
        itemId: string;
        itemName: string;
        unit: string;
        costPrice: number;
        currentStock: number;
        soldQty: number;
        returnQty: number;
        wasteQty: number;
        shortageQty: number;
        notes?: string;
    }>>([]);

    // Initialize data when modal opens
    useEffect(() => {
        if (shift && isOpen) {
            setSettlementDate(new Date().toISOString().split('T')[0]);
            setSelectedSafeAcc(ACC.CASH_BOX);
            setSettlementNotes('');
            setActiveTab('cash');

            // Default cash handed over to remaining cash custody
            const defaultCash = Math.max(0, Number(shift.remainingCashCustody !== undefined ? shift.remainingCashCustody : shift.netCashDue || 0));
            setActualCashHandedOver(defaultCash);

            // Fuel Pumps
            setPumps(Array.isArray(shift.pumpReadings) ? shift.pumpReadings : []);

            // Bottles (legacy)
            setBottlesReturned(Number(shift.bottlesReturned || 0));
            setBottlesShortage(Number(shift.bottlesShortage || 0));
            setReturnBottlesToMain(false);

            // Populate inventory items
            const rows = (shift.outletInventoryItems || []).map((item: any) => ({
                itemId: item.itemId,
                itemName: item.itemName,
                unit: item.unit,
                costPrice: Number(item.costPrice || 0),
                currentStock: Number(item.currentStock || 0),
                soldQty: Number(item.soldQty || 0),
                returnQty: 0,
                wasteQty: 0,
                shortageQty: 0,
                notes: ''
            }));
            setReturnRows(rows);
        }
    }, [shift, isOpen]);

    // Cash calculations
    const netCashDue = Number(shift?.netCashDue || 0);
    const cashVariance = Number(actualCashHandedOver || 0) - netCashDue; // positive = overage, negative = shortage
    const isShortage = cashVariance < -0.01;
    const isOverage = cashVariance > 0.01;

    // Inventory totals
    const totalInventoryReturnQty = returnRows.reduce((sum, r) => sum + (Number(r.returnQty) || 0), 0);
    const totalWasteQty = returnRows.reduce((sum, r) => sum + (Number(r.wasteQty) || 0), 0);
    const totalShortageQty = returnRows.reduce((sum, r) => sum + (Number(r.shortageQty) || 0), 0);
    const totalWasteCost = returnRows.reduce((sum, r) => sum + ((Number(r.wasteQty) || 0) * r.costPrice), 0);
    const totalShortageCost = returnRows.reduce((sum, r) => sum + ((Number(r.shortageQty) || 0) * r.costPrice), 0);

    const handleUpdateRow = (idx: number, field: 'returnQty' | 'wasteQty' | 'shortageQty' | 'notes', value: any) => {
        setReturnRows(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shift) return;

        const payload = {
            shiftId: shift.id,
            shiftNumber: shift.shiftNumber,
            warehouseId: shift.warehouseId,
            warehouseName: shift.warehouseName,
            warehouseLocation: shift.warehouseLocation,
            cashierId: shift.cashierId,
            cashierName: shift.cashierName,
            cashierPhone: shift.cashierPhone,
            settlementDate,
            cashAmount: actualCashHandedOver,
            safeBankAccId: selectedSafeAcc,
            expectedCash: netCashDue,
            cashShortageOverage: cashVariance,
            shortageAction,
            totalSales: shift.totalSales,
            cashSales: shift.cashSales,
            cardSales: shift.cardSales,
            creditSales: shift.creditSales,
            totalExpenses: shift.totalExpenses,
            totalCollections: shift.totalCollections,
            startingCash: shift.startingCash,
            totalLitersSold: shift.totalLitersSold,
            meterTotalAmount: shift.meterTotalAmount,
            meterSalesVariance: shift.meterSalesVariance,
            pumpReadings: pumps,
            bottlesSold: 0,
            bottlesReturned: 0,
            bottlesShortage: 0,
            returnBottlesToMain: false,
            inventoryReturns: returnRows,
            notes: settlementNotes
        };

        onExecuteSettlement(payload);
    };

    // ⌨️ إغلاق المودال بزر Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (!isSubmitting) onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen || !shift || !mounted) return null;

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={onClose} style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(11, 14, 20, 0.88)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            direction: 'rtl'
        }}>
            <div 
                className="pos-settlement-modal-box glass-modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(11, 14, 20, 0.95) 100%)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '920px',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 65px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    overflow: 'hidden',
                    animation: 'modalSlideUp 0.3s ease-out'
                }}
            >
                <style>{`
                    @keyframes modalSlideUp {
                        from { opacity: 0; transform: translateY(25px) scale(0.97); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .aqua-tab-btn {
                        padding: 10px 18px;
                        border-radius: 12px;
                        font-weight: 800;
                        font-size: 13px;
                        cursor: pointer;
                        border: 1px solid transparent;
                        transition: all 0.25s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        white-space: nowrap;
                    }
                    .aqua-tab-btn.active {
                        background: linear-gradient(135deg, #00E5FF 0%, #00B4D8 100%);
                        color: #0B0E14;
                        border-color: #00E5FF;
                        box-shadow: 0 4px 15px rgba(0, 229, 255, 0.35);
                    }
                    .aqua-tab-btn:not(.active) {
                        background: rgba(30, 41, 59, 0.6);
                        color: #94A3B8;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    .aqua-tab-btn:not(.active):hover {
                        background: rgba(30, 41, 59, 0.9);
                        color: #F8FAFC;
                    }
                    .field-input {
                        width: 100%;
                        padding: 11px 16px;
                        border-radius: 12px;
                        border: 1px solid rgba(0, 229, 255, 0.2);
                        background: rgba(11, 14, 20, 0.7);
                        font-size: 14px;
                        font-weight: 700;
                        color: #F8FAFC;
                        outline: none;
                        transition: all 0.2s;
                        box-sizing: border-box;
                    }
                    .field-input:focus {
                        border-color: #00E5FF;
                        background: rgba(20, 24, 34, 0.95);
                        box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.25);
                    }

                    @media (max-width: 768px) {
                        .pos-settlement-modal-box {
                            width: 95vw !important;
                            max-width: 95vw !important;
                            max-height: 94vh !important;
                            border-radius: 18px !important;
                        }
                        .pos-settlement-header {
                            padding: 14px 16px !important;
                        }
                        .pos-settlement-header h2 {
                            font-size: 16px !important;
                        }
                        .pos-settlement-tabs {
                            padding: 10px 12px !important;
                            gap: 6px !important;
                        }
                        .aqua-tab-btn {
                            padding: 8px 12px !important;
                            font-size: 11.5px !important;
                        }
                        .pos-settlement-body {
                            padding: 16px 14px !important;
                        }
                        .settlement-summary-grid {
                            grid-template-columns: repeat(2, 1fr) !important;
                            gap: 8px !important;
                        }
                        .settlement-actions-footer {
                            padding: 12px 14px !important;
                            flex-direction: column !important;
                            gap: 10px !important;
                        }
                        .settlement-actions-footer button {
                            width: 100% !important;
                            min-height: 44px !important;
                        }
                    }
                `}</style>

                {/* Header */}
                <div className="pos-settlement-header" style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(20, 24, 34, 0.95)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #00E5FF 0%, #00B4D8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: '#0B0E14',
                            boxShadow: '0 8px 20px rgba(0, 229, 255, 0.3)'
                        }}>
                            🏪
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#F8FAFC' }}>
                                    تسوية عهدة منفذ [{shift.warehouseName}]
                                </h2>
                                <span style={{
                                    background: 'rgba(0, 229, 255, 0.1)',
                                    color: '#00E5FF',
                                    padding: '3px 10px',
                                    borderRadius: '50px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    border: '1px solid rgba(0, 229, 255, 0.25)'
                                }}>
                                    {shift.shiftNumber}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
                                الكاشير / المسؤول: <b style={{ color: '#00E5FF' }}>{shift.cashierName}</b> | تاريخ الفتح: {formatDate(shift.openedAt)}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(30, 41, 59, 0.6)',
                            color: '#94A3B8',
                            fontSize: '18px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div style={{
                    padding: '14px 30px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
                    display: 'flex',
                    gap: '10px',
                    background: 'rgba(11, 14, 20, 0.6)',
                    overflowX: 'auto'
                }}>
                    <button
                        type="button"
                        className={`aqua-tab-btn ${activeTab === 'cash' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cash')}
                    >
                        <span>💵</span>
                        <span>المطابقة والتوريد النقدي</span>
                    </button>
                    <button
                        type="button"
                        className={`aqua-tab-btn ${activeTab === 'pumps' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pumps')}
                    >
                        <span>⛽</span>
                        <span>عدادات المضخات والوقود</span>
                    </button>
                    <button
                        type="button"
                        className={`aqua-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        <span>📦</span>
                        <span>جرد ومخزون المنفذ</span>
                        {totalInventoryReturnQty > 0 && (
                            <span style={{ background: '#00E5FF', color: '#0B0E14', padding: '1px 6px', borderRadius: '20px', fontSize: '11px', fontWeight: 900 }}>
                                {totalInventoryReturnQty}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        className={`aqua-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preview')}
                    >
                        <span>⚖️</span>
                        <span>معاينة القيد والاعتماد</span>
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px 30px', overflowY: 'auto', flex: 1 }}>
                    {/* TAB 1: CASH SETTLEMENT */}
                    {activeTab === 'cash' && (
                        <div>
                            {/* Summary Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '14px',
                                marginBottom: '24px'
                            }}>
                                <div style={{ background: 'rgba(20, 24, 34, 0.95)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8' }}>العهدة الافتتاحية 💵</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', marginTop: '4px' }}>
                                        {formatCurrency(shift.startingCash)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(20, 24, 34, 0.95)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#00E5FF' }}>المبيعات النقدية (كاش) 💰</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#00E5FF', marginTop: '4px' }}>
                                        {formatCurrency(shift.cashSales)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(20, 24, 34, 0.95)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8' }}>مبيعات الشبكة (مدى) 💳</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', marginTop: '4px' }}>
                                        {formatCurrency(shift.cardSales)}
                                    </div>
                                </div>
                                {Number(shift.totalCollections || 0) > 0 && (
                                    <div style={{ background: 'rgba(20, 24, 34, 0.95)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8' }}>تحصيلات إضافية (+) 📥</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#00E5FF', marginTop: '4px' }}>
                                            {formatCurrency(shift.totalCollections)}
                                        </div>
                                    </div>
                                )}
                                <div style={{ background: 'rgba(20, 24, 34, 0.95)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444' }}>مصروفات الدرج (-) 💸</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#EF4444', marginTop: '4px' }}>
                                        {formatCurrency(shift.totalExpenses)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(20, 24, 34, 0.95)', padding: '14px 18px', borderRadius: '18px', border: '1.5px solid rgba(245, 158, 11, 0.35)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#F59E0B' }}>المطالبة النقدية للدرج ⚖️</div>
                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>
                                        {formatCurrency(netCashDue)}
                                    </div>
                                </div>
                            </div>

                            {/* Handover & Safe Selection */}
                            <div style={{
                                background: 'rgba(20, 24, 34, 0.95)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(0, 229, 255, 0.2)',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>
                                    📥 إثبات توريد النقدية إلى الخزينة المركزية أو البنك
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                    {/* Date */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>
                                            تاريخ التوريد والتسوية 📅
                                        </label>
                                        <input
                                            type="date"
                                            value={settlementDate}
                                            onChange={(e) => setSettlementDate(e.target.value)}
                                            className="field-input"
                                        />
                                    </div>

                                    {/* Safe / Bank Selection */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>
                                            إيداع إلى حساب (الخزينة / البنك) 🏦
                                        </label>
                                        <select
                                            value={selectedSafeAcc}
                                            onChange={(e) => setSelectedSafeAcc(e.target.value)}
                                            className="field-input"
                                        >
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.code} - {acc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Actual Cash Handed Over */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>
                                            المبلغ المورد والمحصور فعلياً (ر.س) 💵
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={actualCashHandedOver}
                                            onChange={(e) => setActualCashHandedOver(Math.max(0, Number(e.target.value) || 0))}
                                            className="field-input"
                                            style={{ fontSize: '16px', fontWeight: 900, color: '#10B981' }}
                                        />
                                    </div>
                                </div>

                                {/* Variance Analysis */}
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    background: isShortage ? 'rgba(239, 68, 68, 0.1)' : (isOverage ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 229, 255, 0.1)'),
                                    border: `1px solid ${isShortage ? 'rgba(239, 68, 68, 0.35)' : (isOverage ? 'rgba(16, 185, 129, 0.35)' : 'rgba(0, 229, 255, 0.25)')}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: isShortage ? '#EF4444' : (isOverage ? '#10B981' : '#00E5FF') }}>
                                            {isShortage ? '⚠️ يوجد عجز في الصندوق بمقدار:' : (isOverage ? '🎉 توجد زيادة نقدية في الصندوق بمقدار:' : '✅ الصندوق متطابق 100% بدون أي فروقات')}
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 900, color: isShortage ? '#EF4444' : (isOverage ? '#10B981' : '#10B981'), marginTop: '2px' }}>
                                            {formatCurrency(Math.abs(cashVariance))}
                                        </div>
                                    </div>

                                    {/* Action on Shortage */}
                                    {isShortage && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#F8FAFC' }}>معالجة العجز:</span>
                                            <select
                                                value={shortageAction}
                                                onChange={(e) => setShortageAction(e.target.value as any)}
                                                className="field-input"
                                                style={{ width: 'auto', padding: '8px 14px' }}
                                            >
                                                <option value="debt_on_cashier">تحميل العجز كذمة على الكاشير (125)</option>
                                                <option value="shortage_expense">إثبات العجز كمصروف فروقات تسوية (53)</option>
                                                <option value="none">تجاهل القيد المحاسبي للعجز</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: FUEL PUMP METERS */}
                    {activeTab === 'pumps' && (
                        <div>
                            <div style={{
                                background: 'rgba(20, 24, 34, 0.95)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(0, 229, 255, 0.25)',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>
                                        ⛽ جرد ومطابقة عدادات مضخات المحروقات
                                    </h3>
                                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                        مقارنة كمية الوقود المضخوخ مع إجمالي الفواتير الصادرة
                                    </span>
                                </div>

                                {/* KPIs Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                                    <div style={{ background: 'rgba(20, 24, 34, 0.6)', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#00E5FF' }}>إجمالي اللترات المباعة ⛽</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', marginTop: '4px' }}>
                                            {Number(shift.totalLitersSold || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} لتر
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(20, 24, 34, 0.6)', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#00E5FF' }}>قيمة الوقود بالعدادات 💰</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', marginTop: '4px' }}>
                                            {formatCurrency(shift.meterTotalAmount || 0)}
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(20, 24, 34, 0.6)', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#00E5FF' }}>إجمالي مبيعات الكاشير 🧾</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', marginTop: '4px' }}>
                                            {formatCurrency(shift.totalSales || 0)}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        background: Math.abs(shift.meterSalesVariance || 0) <= 5 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                        padding: '14px 16px', 
                                        borderRadius: '16px', 
                                        border: `1px solid ${Math.abs(shift.meterSalesVariance || 0) <= 5 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: Math.abs(shift.meterSalesVariance || 0) <= 5 ? '#10B981' : '#EF4444' }}>
                                            فارق المطابقة (عدادات - فواتير) ⚖️
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: Math.abs(shift.meterSalesVariance || 0) <= 5 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                                            {Math.abs(shift.meterSalesVariance || 0) <= 5 
                                                ? '✅ مطابق تماماً' 
                                                : `${(shift.meterSalesVariance || 0) > 0 ? '+' : ''}${formatCurrency(shift.meterSalesVariance || 0)}`}
                                        </div>
                                    </div>
                                </div>

                                {/* Pump Readings Table */}
                                {pumps.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(11, 14, 20, 0.8)', borderBottom: '1.5px solid rgba(0, 229, 255, 0.25)' }}>
                                                    <th style={{ padding: '10px 14px', textAlign: 'right', color: '#F8FAFC' }}>المضخة</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#F8FAFC' }}>نوع الوقود</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#F8FAFC' }}>سعر اللتر</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#94A3B8' }}>قراءة البداية</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#F59E0B' }}>قراءة النهاية</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#F8FAFC' }}>اللترات المضخوخة</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#00E5FF' }}>القيمة المتوقعة</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pumps.map((p, pIdx) => {
                                                    const isOctane91 = p.fuel_type?.includes('91');
                                                    const isOctane95 = p.fuel_type?.includes('95');
                                                    const badgeBg = isOctane91 ? 'rgba(16, 185, 129, 0.15)' : isOctane95 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
                                                    const badgeColor = isOctane91 ? '#10B981' : isOctane95 ? '#EF4444' : '#F59E0B';

                                                    return (
                                                        <tr key={p.pump_id || pIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                            <td style={{ padding: '10px 14px', fontWeight: 800 }}>
                                                                ⛽ {p.pump_name || `مضخة #${p.pump_number}`}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: badgeBg, color: badgeColor }}>
                                                                    {p.fuel_type}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                                                                {Number(p.unit_price || 0).toFixed(2)} ر.س
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#94A3B8' }}>
                                                                {Number(p.start_reading || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#F59E0B' }}>
                                                                {p.end_reading !== null && p.end_reading !== undefined
                                                                    ? Number(p.end_reading).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
                                                                    : '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 900, color: '#F8FAFC' }}>
                                                                {Number(p.liters_pumped || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} لتر
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 900, color: '#00E5FF' }}>
                                                                {formatCurrency(Number(p.expected_amount || 0))}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
                                        لم يتم تسجيل قراءات مضخات مفصلة لهذه الوردية.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: INVENTORY RECONCILIATION */}
                    {activeTab === 'inventory' && (
                        <div>
                            <div style={{
                                background: 'rgba(20, 24, 34, 0.95)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(0, 229, 255, 0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>
                                        📦 بضاعة ومخزون منفذ البيع وإرجاع الفائض
                                    </h3>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                                        إجمالي الرصيد بالمنفذ: <b style={{ color: '#00E5FF' }}>{shift.totalRemainingStock} حبة</b>
                                    </div>
                                </div>

                                {returnRows.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(11, 14, 20, 0.8)', borderBottom: '1.5px solid rgba(0, 229, 255, 0.25)' }}>
                                                    <th style={{ padding: '10px 14px', textAlign: 'right', color: '#00E5FF', fontWeight: 800 }}>الصنف</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#F8FAFC', fontWeight: 800 }}>الرصيد الحالي</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#10B981', fontWeight: 800 }}>المباع بالوردية</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#00E5FF', fontWeight: 800 }}>إرجاع للمستودع الرئيسي 🚚</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#F59E0B', fontWeight: 800 }}>تالف / هالك ⚠️</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#EF4444', fontWeight: 800 }}>عجز جرد ❌</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'right', color: '#94A3B8', fontWeight: 800 }}>ملاحظات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {returnRows.map((row, idx) => (
                                                    <tr key={row.itemId || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#F8FAFC' }}>
                                                            {row.itemName}
                                                            <div style={{ fontSize: '10px', color: '#94A3B8' }}>تكلفة: {formatCurrency(row.costPrice)}</div>
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#F8FAFC' }}>
                                                            {row.currentStock} {row.unit}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#10B981' }}>
                                                            {row.soldQty}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={row.currentStock}
                                                                value={row.returnQty}
                                                                onChange={(e) => handleUpdateRow(idx, 'returnQty', Number(e.target.value) || 0)}
                                                                style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.3)', background: 'rgba(11, 14, 20, 0.7)', color: '#00E5FF', textAlign: 'center', fontWeight: 800 }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={row.wasteQty}
                                                                onChange={(e) => handleUpdateRow(idx, 'wasteQty', Number(e.target.value) || 0)}
                                                                style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(11, 14, 20, 0.7)', textAlign: 'center', fontWeight: 800, color: '#F59E0B' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={row.shortageQty}
                                                                onChange={(e) => handleUpdateRow(idx, 'shortageQty', Number(e.target.value) || 0)}
                                                                style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(11, 14, 20, 0.7)', textAlign: 'center', fontWeight: 800, color: '#EF4444' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="ملاحظات التسوية..."
                                                                value={row.notes || ''}
                                                                onChange={(e) => handleUpdateRow(idx, 'notes', e.target.value)}
                                                                style={{ width: '130px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(11, 14, 20, 0.7)', color: '#F8FAFC', fontSize: '11px' }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                                        لا توجد أصناف مسجلة حالياً في هذا المستودع.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: ACCOUNTING PREVIEW & CLEARANCE */}
                    {activeTab === 'preview' && (
                        <div>
                            <div style={{
                                background: 'rgba(20, 24, 34, 0.95)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(0, 229, 255, 0.2)',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>
                                    ⚖️ معاينة القيد المحاسبي المتولد آلياً (القيد المزدوج)
                                </h3>

                                <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(11, 14, 20, 0.8)', borderBottom: '1.5px solid rgba(0, 229, 255, 0.25)' }}>
                                                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#00E5FF', fontWeight: 800 }}>الحساب المحاسبي</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#F8FAFC', fontWeight: 800 }}>البيان والتوضيح</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#10B981', fontWeight: 800 }}>مدين (Debit)</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#EF4444', fontWeight: 800 }}>دائن (Credit)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Debit Safe */}
                                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#F8FAFC' }}>
                                                    حـ/ الخزينة الرئيسية أو البنك ({accounts.find(a => a.id === selectedSafeAcc)?.code || '122'})
                                                </td>
                                                <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: '12px' }}>
                                                    توريد نقدية للخزينة من عهدة منفذ [{shift.warehouseName}] | {shift.shiftNumber} | المسئول: {shift.cashierName}{shift.cashierPhone ? ` (${shift.cashierPhone})` : ''}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#10B981' }}>
                                                    {formatCurrency(actualCashHandedOver)}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748B' }}>0.00 ر.س</td>
                                            </tr>

                                            {/* Credit Custody */}
                                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#F8FAFC' }}>
                                                    حـ/ عهدة موظفين ونقاط بيع (125) - {shift.cashierName}
                                                </td>
                                                <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: '12px' }}>
                                                    إخلاء عهدة كاشير منفذ [{shift.warehouseName}] بالتوريد للخزينة | {shift.shiftNumber} | المسئول: {shift.cashierName}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748B' }}>0.00 ر.س</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#EF4444' }}>
                                                    {formatCurrency(actualCashHandedOver)}
                                                </td>
                                            </tr>

                                            {/* Shortage row if applicable */}
                                            {isShortage && shortageAction !== 'none' && (
                                                <>
                                                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(239, 68, 68, 0.06)' }}>
                                                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#EF4444' }}>
                                                            {shortageAction === 'debt_on_cashier' ? `حـ/ سلف وذمم موظفين ومناديب (128) - ${shift.cashierName}` : 'حـ/ تسويات وفروق هللات ومصروف عجز الصندوق (527)'}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', color: '#FCA5A5', fontSize: '12px' }}>
                                                            {shortageAction === 'debt_on_cashier' 
                                                                ? `إثبات عجز عهدة صندوق منفذ [${shift.warehouseName}] كذمة مستحقة على الكاشير ${shift.cashierName}` 
                                                                : `تسجيل فروقات/عجز تسوية صندوق منفذ [${shift.warehouseName}] كمصروف`}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#10B981' }}>
                                                            {formatCurrency(Math.abs(cashVariance))}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748B' }}>
                                                            0.00 ر.س
                                                        </td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(239, 68, 68, 0.06)' }}>
                                                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#EF4444' }}>
                                                            حـ/ عهدة موظفين ونقاط بيع (125) - {shift.cashierName}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', color: '#FCA5A5', fontSize: '12px' }}>
                                                            إقفال عجز عهدة صندوق منفذ [{shift.warehouseName}] {shortageAction === 'debt_on_cashier' ? `بذمة الكاشير ${shift.cashierName}` : 'كمصروف تسوية'}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748B' }}>
                                                            0.00 ر.س
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#EF4444' }}>
                                                            {formatCurrency(Math.abs(cashVariance))}
                                                        </td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'rgba(11, 14, 20, 0.6)', fontWeight: 900 }}>
                                                <td colSpan={2} style={{ padding: '12px 14px', color: '#F8FAFC' }}>
                                                    إجمالي اتزان القيد ⚖️
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#10B981' }}>
                                                    {formatCurrency(actualCashHandedOver + (isShortage && shortageAction !== 'none' ? Math.abs(cashVariance) : 0))}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#EF4444' }}>
                                                    {formatCurrency(actualCashHandedOver + (isShortage && shortageAction !== 'none' ? Math.abs(cashVariance) : 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Notes Input */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>
                                        ملاحظات التسوية والمخالصة العامة ✍️
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={settlementNotes}
                                        onChange={(e) => setSettlementNotes(e.target.value)}
                                        placeholder="اكتب أي توضيحات إضافية للتسوية ليتم تدوينها في سند المخالصة..."
                                        className="field-input"
                                        style={{ resize: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div style={{
                    padding: '18px 30px',
                    borderTop: '1px solid rgba(0, 229, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(20, 24, 34, 0.98)'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            padding: '10px 22px',
                            borderRadius: '50px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(30, 41, 59, 0.6)',
                            color: '#94A3B8',
                            fontWeight: 800,
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        إلغاء التراجع
                    </button>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {activeTab !== 'preview' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeTab === 'cash') setActiveTab('pumps');
                                    else if (activeTab === 'pumps') setActiveTab('inventory');
                                    else if (activeTab === 'inventory') setActiveTab('preview');
                                }}
                                style={{
                                    padding: '11px 26px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #00E5FF 0%, #00B4D8 100%)',
                                    color: '#0B0E14',
                                    fontWeight: 900,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(0, 229, 255, 0.3)'
                                }}
                            >
                                التالي ⬅️
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{
                                    padding: '12px 30px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    color: '#FFFFFF',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span>{isSubmitting ? 'جاري الترحيل...' : '🤝 اعتماد وترحيل التسوية رسمياً'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
