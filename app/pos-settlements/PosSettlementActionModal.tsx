"use client";
import React, { useState, useEffect, useMemo } from 'react';
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
    const [activeTab, setActiveTab] = useState<'cash' | 'bottles' | 'inventory' | 'preview'>('cash');

    // Form States
    const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSafeAcc, setSelectedSafeAcc] = useState<string>(ACC.CASH_BOX);
    const [actualCashHandedOver, setActualCashHandedOver] = useState<number>(0);
    const [shortageAction, setShortageAction] = useState<'debt_on_cashier' | 'shortage_expense' | 'rounding' | 'none'>('debt_on_cashier');
    const [settlementNotes, setSettlementNotes] = useState<string>('');

    // Bottles
    const [bottlesReturned, setBottlesReturned] = useState<number>(0);
    const [bottlesShortage, setBottlesShortage] = useState<number>(0);
    const [returnBottlesToMain, setReturnBottlesToMain] = useState<boolean>(true);

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

            // Bottles
            setBottlesReturned(Number(shift.bottlesReturned || 0));
            setBottlesShortage(Number(shift.bottlesShortage || 0));
            setReturnBottlesToMain(true);

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
            bottlesSold: shift.bottlesSold,
            bottlesReturned,
            bottlesShortage,
            returnBottlesToMain,
            inventoryReturns: returnRows,
            notes: settlementNotes
        };

        onExecuteSettlement(payload);
    };

    if (!isOpen || !shift) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(18, 41, 70, 0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            direction: 'rtl'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 250, 255, 0.94) 100%)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                border: '1.5px solid rgba(255, 255, 255, 0.95)',
                borderRadius: '30px',
                width: '100%',
                maxWidth: '920px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 65px rgba(28, 115, 171, 0.28), inset 0 2px 3px rgba(255, 255, 255, 1)',
                overflow: 'hidden',
                animation: 'modalSlideUp 0.3s ease-out'
            }}>
                <style>{`
                    @keyframes modalSlideUp {
                        from { opacity: 0; transform: translateY(25px) scale(0.97); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .aqua-tab-btn {
                        padding: 12px 20px;
                        border-radius: 14px;
                        font-weight: 800;
                        font-size: 13px;
                        cursor: pointer;
                        border: none;
                        transition: all 0.25s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .aqua-tab-btn.active {
                        background: linear-gradient(135deg, #1C73AB 0%, #2891C8 100%);
                        color: #ffffff;
                        box-shadow: 0 4px 15px rgba(28, 115, 171, 0.3);
                    }
                    .aqua-tab-btn:not(.active) {
                        background: rgba(28, 115, 171, 0.08);
                        color: #1C73AB;
                    }
                    .aqua-tab-btn:not(.active):hover {
                        background: rgba(28, 115, 171, 0.16);
                    }
                    .field-input {
                        width: 100%;
                        padding: 11px 16px;
                        border-radius: 14px;
                        border: 1px solid rgba(28, 115, 171, 0.25);
                        background: rgba(255, 255, 255, 0.85);
                        font-size: 14px;
                        font-weight: 700;
                        color: #122946;
                        outline: none;
                        transition: all 0.2s;
                        box-sizing: border-box;
                    }
                    .field-input:focus {
                        border-color: #1C73AB;
                        box-shadow: 0 0 0 3px rgba(28, 115, 171, 0.18);
                    }
                `}</style>

                {/* Header */}
                <div style={{
                    padding: '24px 30px',
                    borderBottom: '1px solid rgba(28, 115, 171, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, rgba(28, 115, 171, 0.08) 0%, rgba(40, 145, 200, 0.03) 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: '#fff',
                            boxShadow: '0 8px 20px rgba(28, 115, 171, 0.25)'
                        }}>
                            🏪
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#122946' }}>
                                    تسوية عهدة منفذ [{shift.warehouseName}]
                                </h2>
                                <span style={{
                                    background: 'rgba(28, 115, 171, 0.12)',
                                    color: '#1C73AB',
                                    padding: '3px 10px',
                                    borderRadius: '50px',
                                    fontSize: '12px',
                                    fontWeight: 800
                                }}>
                                    {shift.shiftNumber}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                الكاشير / المسؤول: <b style={{ color: '#122946' }}>{shift.cashierName}</b> | تاريخ الفتح: {formatDate(shift.openedAt)}
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
                            border: '1px solid rgba(28, 115, 171, 0.2)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            color: '#1C73AB',
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
                    borderBottom: '1px solid rgba(28, 115, 171, 0.08)',
                    display: 'flex',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.5)',
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
                        className={`aqua-tab-btn ${activeTab === 'bottles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bottles')}
                    >
                        <span>💧</span>
                        <span>عهدة فوارغ المياه</span>
                    </button>
                    <button
                        type="button"
                        className={`aqua-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        <span>📦</span>
                        <span>جرد ومخزون المنفذ</span>
                        {totalInventoryReturnQty > 0 && (
                            <span style={{ background: '#fff', color: '#1C73AB', padding: '1px 6px', borderRadius: '20px', fontSize: '11px', fontWeight: 900 }}>
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
                                <div style={{ background: 'rgba(255, 255, 255, 0.8)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(28, 115, 171, 0.15)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>العهدة الافتتاحية 💵</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#122946', marginTop: '4px' }}>
                                        {formatCurrency(shift.startingCash)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(28, 115, 171, 0.08)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(28, 115, 171, 0.2)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#1C73AB' }}>المبيعات النقدية (كاش) 💰</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#1C73AB', marginTop: '4px' }}>
                                        {formatCurrency(shift.cashSales)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.8)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(28, 115, 171, 0.15)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>مبيعات الشبكة (مدى) 💳</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#122946', marginTop: '4px' }}>
                                        {formatCurrency(shift.cardSales)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px 18px', borderRadius: '18px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444' }}>مصروفات الدرج (-) 💸</div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444', marginTop: '4px' }}>
                                        {formatCurrency(shift.totalExpenses)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '14px 18px', borderRadius: '18px', border: '1.5px solid rgba(245, 158, 11, 0.3)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#b45309' }}>المطالبة النقدية للدرج ⚖️</div>
                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
                                        {formatCurrency(netCashDue)}
                                    </div>
                                </div>
                            </div>

                            {/* Handover & Safe Selection */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.85)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(28, 115, 171, 0.15)',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 900, color: '#122946' }}>
                                    📥 إثبات توريد النقدية إلى الخزينة المركزية أو البنك
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                    {/* Date */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '6px' }}>
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
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '6px' }}>
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
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '6px' }}>
                                            المبلغ المورد والمحصور فعلياً (ر.س) 💵
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={actualCashHandedOver}
                                            onChange={(e) => setActualCashHandedOver(Math.max(0, Number(e.target.value) || 0))}
                                            className="field-input"
                                            style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}
                                        />
                                    </div>
                                </div>

                                {/* Variance Analysis */}
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    background: isShortage ? 'rgba(239, 68, 68, 0.08)' : (isOverage ? 'rgba(22, 163, 74, 0.08)' : 'rgba(28, 115, 171, 0.08)'),
                                    border: `1px solid ${isShortage ? 'rgba(239, 68, 68, 0.3)' : (isOverage ? 'rgba(22, 163, 74, 0.3)' : 'rgba(28, 115, 171, 0.2)')}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: isShortage ? '#ef4444' : (isOverage ? '#16a34a' : '#1C73AB') }}>
                                            {isShortage ? '⚠️ يوجد عجز في الصندوق بمقدار:' : (isOverage ? '🎉 توجد زيادة نقدية في الصندوق بمقدار:' : '✅ الصندوق متطابق 100% بدون أي فروقات')}
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 900, color: isShortage ? '#ef4444' : (isOverage ? '#16a34a' : '#16a34a'), marginTop: '2px' }}>
                                            {formatCurrency(Math.abs(cashVariance))}
                                        </div>
                                    </div>

                                    {/* Action on Shortage */}
                                    {isShortage && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#122946' }}>معالجة العجز:</span>
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

                    {/* TAB 2: BOTTLES CUSTODY */}
                    {activeTab === 'bottles' && (
                        <div>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.85)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(28, 115, 171, 0.15)',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 900, color: '#122946' }}>
                                    💧 مطابقة وتسوية عهدة فوارغ المياه بالمنفذ
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                                    <div style={{ background: 'rgba(28, 115, 171, 0.08)', padding: '14px 16px', borderRadius: '16px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#1C73AB' }}>رصيد فوارغ البداية 📦</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#122946', marginTop: '4px' }}>
                                            {shift.startingBottles} قارورة
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(28, 115, 171, 0.08)', padding: '14px 16px', borderRadius: '16px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#1C73AB' }}>فوارغ مباعة مع المياه 🛒</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#1C73AB', marginTop: '4px' }}>
                                            {shift.bottlesSold} قارورة
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(22, 163, 74, 0.08)', padding: '14px 16px', borderRadius: '16px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>فوارغ مستلمة من العملاء 🔄</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>
                                            {shift.bottlesReturned} قارورة
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '14px 16px', borderRadius: '16px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309' }}>الرصيد الفعلي المتوقع ⚖️</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
                                            {shift.expectedBottles} قارورة
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '6px' }}>
                                            الفوارغ المرتجعة الموردة للمستودع 🔄
                                        </label>
                                        <input
                                            type="number"
                                            value={bottlesReturned}
                                            onChange={(e) => setBottlesReturned(Math.max(0, Number(e.target.value) || 0))}
                                            className="field-input"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '6px' }}>
                                            عجز الفوارغ المفقودة (إن وُجد) ⚠️
                                        </label>
                                        <input
                                            type="number"
                                            value={bottlesShortage}
                                            onChange={(e) => setBottlesShortage(Math.max(0, Number(e.target.value) || 0))}
                                            className="field-input"
                                            style={{ color: '#ef4444' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="returnBottles"
                                        checked={returnBottlesToMain}
                                        onChange={(e) => setReturnBottlesToMain(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="returnBottles" style={{ fontSize: '13px', fontWeight: 800, color: '#122946', cursor: 'pointer' }}>
                                        نقل الفوارغ المستلمة ({bottlesReturned} قارورة) آلياً إلى عهدة المستودع الرئيسي 🚚
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: INVENTORY RECONCILIATION */}
                    {activeTab === 'inventory' && (
                        <div>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.85)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(28, 115, 171, 0.15)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#122946' }}>
                                        📦 بضاعة ومخزون منفذ البيع وإرجاع الفائض
                                    </h3>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                                        إجمالي الرصيد بالمنفذ: <b style={{ color: '#1C73AB' }}>{shift.totalRemainingStock} حبة</b>
                                    </div>
                                </div>

                                {returnRows.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(28, 115, 171, 0.08)', borderBottom: '1.5px solid rgba(28, 115, 171, 0.15)' }}>
                                                    <th style={{ padding: '10px 14px', textAlign: 'right', color: '#1C73AB', fontWeight: 800 }}>الصنف</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#122946', fontWeight: 800 }}>الرصيد الحالي</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>المباع بالوردية</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#1C73AB', fontWeight: 800 }}>إرجاع للمستودع الرئيسي 🚚</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#f59e0b', fontWeight: 800 }}>تالف / هالك ⚠️</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>عجز جرد ❌</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'right', color: '#64748b', fontWeight: 800 }}>ملاحظات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {returnRows.map((row, idx) => (
                                                    <tr key={row.itemId || idx} style={{ borderBottom: '1px solid rgba(28, 115, 171, 0.06)' }}>
                                                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#122946' }}>
                                                            {row.itemName}
                                                            <div style={{ fontSize: '10px', color: '#64748b' }}>تكلفة: {formatCurrency(row.costPrice)}</div>
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#122946' }}>
                                                            {row.currentStock} {row.unit}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                                                            {row.soldQty}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={row.currentStock}
                                                                value={row.returnQty}
                                                                onChange={(e) => handleUpdateRow(idx, 'returnQty', Number(e.target.value) || 0)}
                                                                style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(28, 115, 171, 0.3)', textAlign: 'center', fontWeight: 800 }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={row.wasteQty}
                                                                onChange={(e) => handleUpdateRow(idx, 'wasteQty', Number(e.target.value) || 0)}
                                                                style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', textAlign: 'center', fontWeight: 800, color: '#b45309' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={row.shortageQty}
                                                                onChange={(e) => handleUpdateRow(idx, 'shortageQty', Number(e.target.value) || 0)}
                                                                style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center', fontWeight: 800, color: '#ef4444' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px 14px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="ملاحظات التسوية..."
                                                                value={row.notes || ''}
                                                                onChange={(e) => handleUpdateRow(idx, 'notes', e.target.value)}
                                                                style={{ width: '130px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(28, 115, 171, 0.2)', fontSize: '11px' }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
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
                                background: 'rgba(255, 255, 255, 0.85)',
                                padding: '22px 24px',
                                borderRadius: '22px',
                                border: '1px solid rgba(28, 115, 171, 0.15)',
                                marginBottom: '20px'
                            }}>
                                <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 900, color: '#122946' }}>
                                    ⚖️ معاينة القيد المحاسبي المتولد آلياً (القيد المزدوج)
                                </h3>

                                <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(28, 115, 171, 0.08)', borderBottom: '1.5px solid rgba(28, 115, 171, 0.15)' }}>
                                                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#1C73AB', fontWeight: 800 }}>الحساب المحاسبي</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'right', color: '#122946', fontWeight: 800 }}>البيان والتوضيح</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>مدين (Debit)</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>دائن (Credit)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Debit Safe */}
                                            <tr style={{ borderBottom: '1px solid rgba(28, 115, 171, 0.08)' }}>
                                                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#122946' }}>
                                                    حـ/ الخزينة الرئيسية أو البنك ({accounts.find(a => a.id === selectedSafeAcc)?.code || '122'})
                                                </td>
                                                <td style={{ padding: '12px 14px', color: '#1e293b', fontSize: '12px' }}>
                                                    توريد نقدية للخزينة من عهدة منفذ [{shift.warehouseName}] | {shift.shiftNumber} | المسئول: {shift.cashierName}{shift.cashierPhone ? ` (${shift.cashierPhone})` : ''}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                                                    {formatCurrency(actualCashHandedOver)}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>0.00 ر.س</td>
                                            </tr>

                                            {/* Credit Custody */}
                                            <tr style={{ borderBottom: '1px solid rgba(28, 115, 171, 0.08)' }}>
                                                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#122946' }}>
                                                    حـ/ عهدة موظفين ونقاط بيع (125) - {shift.cashierName}
                                                </td>
                                                <td style={{ padding: '12px 14px', color: '#1e293b', fontSize: '12px' }}>
                                                    إخلاء عهدة كاشير منفذ [{shift.warehouseName}] بالتوريد للخزينة | {shift.shiftNumber} | المسئول: {shift.cashierName}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>0.00 ر.س</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#ef4444' }}>
                                                    {formatCurrency(actualCashHandedOver)}
                                                </td>
                                            </tr>

                                            {/* Shortage row if applicable (Balanced Double Entry) */}
                                            {isShortage && shortageAction !== 'none' && (
                                                <>
                                                    <tr style={{ borderBottom: '1px solid rgba(28, 115, 171, 0.08)', background: 'rgba(239, 68, 68, 0.04)' }}>
                                                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#ef4444' }}>
                                                            {shortageAction === 'debt_on_cashier' ? `حـ/ سلف وذمم موظفين ومناديب (128) - ${shift.cashierName}` : 'حـ/ تسويات وفروق هللات ومصروف عجز الصندوق (527)'}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', color: '#ef4444', fontSize: '12px' }}>
                                                            {shortageAction === 'debt_on_cashier' 
                                                                ? `إثبات عجز عهدة صندوق منفذ [${shift.warehouseName}] كذمة مستحقة على الكاشير ${shift.cashierName}` 
                                                                : `تسجيل فروقات/عجز تسوية صندوق منفذ [${shift.warehouseName}] كمصروف`}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                                                            {formatCurrency(Math.abs(cashVariance))}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>
                                                            0.00 ر.س
                                                        </td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid rgba(28, 115, 171, 0.08)', background: 'rgba(239, 68, 68, 0.04)' }}>
                                                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#ef4444' }}>
                                                            حـ/ عهدة موظفين ونقاط بيع (125) - {shift.cashierName}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', color: '#ef4444', fontSize: '12px' }}>
                                                            إقفال عجز عهدة صندوق منفذ [{shift.warehouseName}] {shortageAction === 'debt_on_cashier' ? `بذمة الكاشير ${shift.cashierName}` : 'كمصروف تسوية'}
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>
                                                            0.00 ر.س
                                                        </td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, color: '#ef4444' }}>
                                                            {formatCurrency(Math.abs(cashVariance))}
                                                        </td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'rgba(28, 115, 171, 0.04)', fontWeight: 900 }}>
                                                <td colSpan={2} style={{ padding: '12px 14px', color: '#122946' }}>
                                                    إجمالي اتزان القيد ⚖️
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#16a34a' }}>
                                                    {formatCurrency(actualCashHandedOver + (isShortage && shortageAction !== 'none' ? Math.abs(cashVariance) : 0))}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#ef4444' }}>
                                                    {formatCurrency(actualCashHandedOver + (isShortage && shortageAction !== 'none' ? Math.abs(cashVariance) : 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Notes Input */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '6px' }}>
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
                    borderTop: '1px solid rgba(28, 115, 171, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 248, 255, 0.9) 100%)'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            padding: '10px 22px',
                            borderRadius: '50px',
                            border: '1px solid rgba(28, 115, 171, 0.25)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            color: '#1C73AB',
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
                                    if (activeTab === 'cash') setActiveTab('bottles');
                                    else if (activeTab === 'bottles') setActiveTab('inventory');
                                    else if (activeTab === 'inventory') setActiveTab('preview');
                                }}
                                style={{
                                    padding: '11px 26px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                                    color: '#fff',
                                    fontWeight: 900,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(28, 115, 171, 0.3)'
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
                                    background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                                    color: '#fff',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(22, 163, 74, 0.35)',
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
        </div>
    );
}
