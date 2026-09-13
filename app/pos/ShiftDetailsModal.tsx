"use client";
import { useLanguage } from '@/lib/LanguageContext';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ShiftDetailsModal({
    isOpen,
    onClose,
    shiftId
}: {
    isOpen: boolean;
    onClose: () => void;
    shiftId: string | null;
}) {
    const { language } = useLanguage();
    const isEn = language === 'en';

    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'financial' | 'items' | 'invoices'>('financial');

    useEffect(() => {
        if (isOpen && shiftId) {
            fetchShiftDetails(shiftId);
        } else {
            setDetails(null);
            setError(null);
        }
    }, [isOpen, shiftId]);

    const fetchShiftDetails = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/pos/shifts/${id}`);
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || (isEn ? 'Failed to fetch shift details' : 'فشل جلب تفاصيل الوردية'));
            }
            setDetails(json.data);
        } catch (err: any) {
            console.error('Failed to load shift details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amt: number) => {
        return (Number(amt) || 0).toLocaleString(isEn ? 'en-US' : 'ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (isEn ? ' SAR' : ' ريال');
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999999,
            padding: '15px'
        }}>
            <style>{`
                .shift-det-tab {
                    padding: 9px 18px;
                    border-radius: 12px;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    font-weight: 800;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .shift-det-tab.active {
                    background: #1C73AB;
                    color: white;
                    box-shadow: 0 4px 12px rgba(28, 115, 171, 0.25);
                }
                .shift-kpi-box {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(28, 115, 171, 0.15);
                    border-radius: 14px;
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .shift-table th {
                    background: rgba(28, 115, 171, 0.08);
                    color: #1C73AB;
                    font-weight: 900;
                    padding: 10px 12px;
                    font-size: 12px;
                    text-align: right;
                    border-bottom: 1.5px solid rgba(28, 115, 171, 0.2);
                }
                .shift-table td {
                    padding: 10px 12px;
                    font-size: 13px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #1e293b;
                }
                .shift-table tr:hover td {
                    background: rgba(248, 250, 252, 0.8);
                }
                @media print {
                    body * { visibility: hidden; }
                    .print-area-dossier, .print-area-dossier * { visibility: visible; }
                    .print-area-dossier { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="print-area-dossier" style={{
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '24px',
                width: '95vw',
                maxWidth: '820px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '28px 24px',
                textAlign: 'right',
                direction: 'rtl',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '22px' }}>📊</span>
                            <h2 style={{ color: '#1C73AB', margin: 0, fontSize: '20px', fontWeight: 900 }}>
                                {isEn ? 'Shift Details & Review File' : 'ملف تفاصيل ومراجعة الوردية'}
                            </h2>
                            {details && (
                                <span style={{
                                    background: details.status === 'open' ? '#dcfce7' : '#f1f5f9',
                                    color: details.status === 'open' ? '#16a34a' : '#64748b',
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 900
                                }}>
                                    {details.status === 'open' ? (isEn ? '🟢 Open Now' : '🟢 مفتوحة حالياً') : (isEn ? '🔒 Closed' : '🔒 مغلقة')}
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                            {isEn ? 'Approved accounting reference for cash register, sales, invoices, and returnables' : 'مرجع محاسبي معتمد لجرد الصندوق، المبيعات، الفواتير، وفوارغ العبوات'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }} className="no-print">
                        <button
                            type="button"
                            onClick={handlePrint}
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#1C73AB',
                                padding: '6px 12px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            🖨️ {isEn ? 'Print Reference' : 'طباعة المرجع'}
                        </button>
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
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontWeight: 800, fontSize: '15px' }}>
                        {isEn ? '⏳ Retrieving shift details and checking journals...' : '⏳ جاري استرجاع تفاصيل الوردية وفحص القيود...'}
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444', fontWeight: 800 }}>
                        ⚠️ {error}
                    </div>
                ) : details ? (
                    <div>
                        {/* بطاقة معلومات الوردية الأساسية */}
                        <div style={{
                            background: 'rgba(28, 115, 171, 0.05)',
                            border: '1px solid rgba(28, 115, 171, 0.18)',
                            borderRadius: '16px',
                            padding: '14px 18px',
                            marginBottom: '18px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '12px',
                            fontSize: '12px'
                        }}>
                            <div>
                                <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>{isEn ? 'Shift ID:' : 'رقم الوردية:'}</span>
                                <strong style={{ color: '#0f172a', fontSize: '13px' }}>#{String(details.shift_id).slice(-6)}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>{isEn ? 'Branch / Warehouse:' : 'منفذ البيع / المستودع:'}</span>
                                <strong style={{ color: '#1C73AB', fontSize: '13px' }}>{details.warehouse?.name}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>{isEn ? 'Responsible Rep:' : 'المندوب المسؤول:'}</span>
                                <strong style={{ color: '#16a34a', fontSize: '13px' }}>{details.delegate?.name}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>{isEn ? 'Cashier:' : 'أمين الصندوق (الكاشير):'}</span>
                                <strong style={{ color: '#334155', fontSize: '13px' }}>{details.cashier?.name}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>{isEn ? 'Opened At:' : 'تاريخ ووقت الفتح:'}</span>
                                <strong style={{ color: '#0f172a' }}>
                                    {new Date(details.opened_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                </strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>{isEn ? 'Closed At:' : 'تاريخ ووقت الإغلاق:'}</span>
                                <strong style={{ color: '#0f172a' }}>
                                    {details.closed_at ? new Date(details.closed_at).toLocaleString(isEn ? 'en-US' : 'ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : (isEn ? 'Running ⏳' : 'قيد التشغيل ⏳')}
                                </strong>
                            </div>
                        </div>

                        {/* شريط التبويبات */}
                        <div className="no-print" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '14px', marginBottom: '18px' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('financial')}
                                className={`shift-det-tab ${activeTab === 'financial' ? 'active' : ''}`}
                            >
                                💰 {isEn ? 'Financials & Register' : 'المطابقة المالية والصندوق'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('items')}
                                className={`shift-det-tab ${activeTab === 'items' ? 'active' : ''}`}
                            >
                                📦 {isEn ? 'Sold Items' : 'الأصناف المباعة'} ({details.items_summary?.length || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('invoices')}
                                className={`shift-det-tab ${activeTab === 'invoices' ? 'active' : ''}`}
                            >
                                📋 {isEn ? 'Invoices Log' : 'سجل الفواتير'} ({details.invoices_count || 0})
                            </button>
                        </div>

                        {/* التبويب 1: المطابقة المالية والصندوق */}
                        {(activeTab === 'financial') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                                    <div className="shift-kpi-box">
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>💵 {isEn ? 'Opening Cash:' : 'العهدة الافتتاحية:'}</span>
                                        <strong style={{ fontSize: '18px', color: '#0f172a', fontWeight: 900 }}>
                                            {formatCurrency(details.financials.starting_cash)}
                                        </strong>
                                    </div>
                                    <div className="shift-kpi-box">
                                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>💰 {isEn ? 'Cash Received:' : 'المقبوض نقداً (كاش):'}</span>
                                        <strong style={{ fontSize: '18px', color: '#16a34a', fontWeight: 900 }}>
                                            + {formatCurrency(details.financials.total_cash_sales)}
                                        </strong>
                                    </div>
                                    <div className="shift-kpi-box">
                                        <span style={{ fontSize: '11px', color: '#1C73AB', fontWeight: 700 }}>🏦 {isEn ? 'Expected Cash:' : 'النقد المتوقع بالدرج:'}</span>
                                        <strong style={{ fontSize: '18px', color: '#1C73AB', fontWeight: 900 }}>
                                            = {formatCurrency(details.financials.expected_cash)}
                                        </strong>
                                    </div>
                                    <div className="shift-kpi-box">
                                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>💵 {isEn ? 'Actual Cash Counted:' : 'النقد الفعلي عند الجرد:'}</span>
                                        <strong style={{ fontSize: '18px', color: '#0284c7', fontWeight: 900 }}>
                                            {details.status === 'open' ? (isEn ? 'Running' : 'قيد العمل') : formatCurrency(details.financials.actual_cash)}
                                        </strong>
                                    </div>
                                </div>

                                {/* مؤشر العجز / الزيادة */}
                                {details.status !== 'open' && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '14px',
                                        borderRadius: '14px',
                                        fontWeight: 900,
                                        fontSize: '15px',
                                        background: details.financials.shortage_overage === 0 ? '#dcfce7' : details.financials.shortage_overage > 0 ? '#e0f2fe' : '#fee2e2',
                                        color: details.financials.shortage_overage === 0 ? '#16a34a' : details.financials.shortage_overage > 0 ? '#0284c7' : '#dc2626',
                                        border: `1.5px solid ${details.financials.shortage_overage === 0 ? '#86efac' : details.financials.shortage_overage > 0 ? '#7dd3fc' : '#fca5a5'}`
                                    }}>
                                        {details.financials.shortage_overage === 0
                                            ? (isEn ? '✅ Register matches 100% perfectly (No variance)' : '✅ الصندوق مطابق تماماً بنسبة 100% (لا يوجد عجز أو زيادة)')
                                            : details.financials.shortage_overage > 0
                                                ? (isEn ? `💰 Surplus cash in register: +${formatCurrency(details.financials.shortage_overage)}` : `💰 يوجد زيادة في الصندوق بقيمة: +${formatCurrency(details.financials.shortage_overage)}`)
                                                : (isEn ? `⚠️ Cash shortage in register: -${formatCurrency(Math.abs(details.financials.shortage_overage))}` : `⚠️ يوجد عجز نقدي في الصندوق بقيمة: -${formatCurrency(Math.abs(details.financials.shortage_overage))}`)}
                                    </div>
                                )}

                                {/* ملخص المبيعات الإلكترونية والآجلة */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1C73AB', fontWeight: 900 }}>
                                        💳 {isEn ? 'Payment Channels & Total Revenue' : 'تفصيل قنوات السداد والإيرادات الإجمالية'}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ color: '#64748b', fontWeight: 700 }}>💳 {isEn ? 'Card / POS Sales:' : 'مبيعات الشبكة (مدى):'}</span>
                                            <strong style={{ color: '#2891C8' }}>{formatCurrency(details.financials.total_card_sales)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ color: '#64748b', fontWeight: 700 }}>📋 {isEn ? 'Credit Sales (A/R):' : 'المبيعات الآجلة (ذمم عملاء):'}</span>
                                            <strong style={{ color: '#d97706' }}>{formatCurrency(details.financials.total_credit_sales)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0', borderTop: '2px solid #e2e8f0' }}>
                                            <span style={{ color: '#0f172a', fontWeight: 900 }}>🛒 {isEn ? 'Total Shift Sales:' : 'إجمالي مبيعات الوردية:'}</span>
                                            <strong style={{ color: '#16a34a', fontSize: '16px' }}>{formatCurrency(details.financials.total_sales)}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* 📈 تحليل ربحية الوردية الفعلي */}
                                {(() => {
                                    const net = Number(details.financials.net_profit || 0);
                                    const isLoss = net < 0;
                                    const gross = Number(details.financials.gross_profit || 0);
                                    const margin = Number(details.financials.profit_margin || 0);
                                    return (
                                        <div style={{
                                            background: isLoss 
                                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.12) 100%)' 
                                                : 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, rgba(40, 145, 200, 0.08) 100%)',
                                            border: `1.5px solid ${isLoss ? 'rgba(239, 68, 68, 0.4)' : 'rgba(22, 163, 74, 0.3)'}`,
                                            borderRadius: '16px',
                                            padding: '16px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                                <h4 style={{ margin: 0, fontSize: '14px', color: isLoss ? '#dc2626' : '#15803d', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{isLoss ? '📉' : '📈'}</span>
                                                    <span>{isLoss ? (isEn ? 'Shift Results (Shortage / Operating Loss)' : 'تحليل نتائج الوردية (عجز / خسائر تشغيلية)') : (isEn ? 'Shift Profitability & Operations' : 'تحليل أرباح الوردية والتشغيل (Profitability)')}</span>
                                                </h4>
                                                <span style={{
                                                    background: isLoss ? '#fee2e2' : '#dcfce7',
                                                    color: isLoss ? '#dc2626' : '#15803d',
                                                    fontWeight: 900,
                                                    fontSize: '12px',
                                                    padding: '3px 10px',
                                                    borderRadius: '20px',
                                                    border: `1px solid ${isLoss ? '#fca5a5' : '#86efac'}`
                                                }}>
                                                    {isEn ? 'Profit Margin:' : 'هامش الربح:'} {margin}%
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                                                <div className="shift-kpi-box" style={{ background: 'rgba(255,255,255,0.85)' }}>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>📦 {isEn ? 'Cost of Goods Sold (COGS):' : 'تكلفة البضاعة المباعة (COGS):'}</span>
                                                    <strong style={{ fontSize: '16px', color: '#dc2626', fontWeight: 900 }}>
                                                        - {formatCurrency(details.financials.total_cogs || 0)}
                                                    </strong>
                                                </div>
                                                <div className="shift-kpi-box" style={{ background: 'rgba(255,255,255,0.85)' }}>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>💸 {isEn ? 'Operating Expenses:' : 'مصروفات الوردية التشغيلية:'}</span>
                                                    <strong style={{ fontSize: '16px', color: '#ea580c', fontWeight: 900 }}>
                                                        - {formatCurrency(details.financials.total_expenses || 0)}
                                                    </strong>
                                                </div>
                                                <div className="shift-kpi-box" style={{ background: 'rgba(255,255,255,0.85)' }}>
                                                    <span style={{ fontSize: '11px', color: gross >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                                                        {gross >= 0 ? (isEn ? '✨ Gross Profit (Before Exp.):' : '✨ مجمل الربح (قبل المصروفات):') : (isEn ? '⚠️ Gross Loss (Before Exp.):' : '⚠️ مجمل الخسارة (قبل المصروفات):')}
                                                    </span>
                                                    <strong style={{ fontSize: '16px', color: gross >= 0 ? '#15803d' : '#dc2626', fontWeight: 900 }}>
                                                        {gross >= 0 ? `+${formatCurrency(gross)}` : formatCurrency(gross)}
                                                    </strong>
                                                </div>
                                                <div className="shift-kpi-box" style={{ 
                                                    background: isLoss ? '#fee2e2' : '#dcfce7', 
                                                    border: `1.5px solid ${isLoss ? '#fca5a5' : '#86efac'}` 
                                                }}>
                                                    <span style={{ fontSize: '11px', color: isLoss ? '#991b1b' : '#166534', fontWeight: 800 }}>
                                                        {isLoss ? (isEn ? '🚨 Net Shift Loss:' : '🚨 صافي خسائر الوردية النهائي:') : (isEn ? '🎯 Net Shift Profit:' : '🎯 صافي ربح الوردية النهائي:')}
                                                    </span>
                                                    <strong style={{ fontSize: '18px', color: isLoss ? '#dc2626' : '#14532d', fontWeight: 900 }}>
                                                        {isLoss ? formatCurrency(net) : `+${formatCurrency(net)}`}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* مطابقة عهدة العبوات والمستلزمات المستردة */}
                                <div style={{ background: 'rgba(240, 249, 255, 0.9)', border: '1.5px solid rgba(40, 145, 200, 0.3)', borderRadius: '16px', padding: '16px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1C73AB', fontWeight: 900 }}>
                                        🔄 {isEn ? 'Returnables Custody Inventory' : 'جرد عهدة العبوات والمستلزمات المستردة'}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{isEn ? 'Bottles Sold:' : 'العبوات المباعة:'}</span>
                                            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{details.bottles.sold} {isEn ? 'Bottles' : 'عبوة'}</strong>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{isEn ? 'Actual Returnables:' : 'الفوارغ المستلمة فعلياً:'}</span>
                                            <strong style={{ fontSize: '16px', color: '#16a34a' }}>{details.bottles.returned} {isEn ? 'Bottles' : 'عبوة'}</strong>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{isEn ? 'Returnables Variance:' : 'عجز / فارق الفوارغ:'}</span>
                                            <strong style={{ fontSize: '16px', color: details.bottles.shortage === 0 ? '#16a34a' : '#ef4444' }}>
                                                {details.bottles.shortage === 0 ? (isEn ? 'Matches perfectly ✅' : 'مطابقة تماماً ✅') : (isEn ? `${details.bottles.shortage} bottles short ⚠️` : `${details.bottles.shortage} عبوة عجز ⚠️`)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* التبويب 2: تقرير الأصناف المباعة */}
                        {(activeTab === 'items') && (
                            <div>
                                {details.items_summary && details.items_summary.length > 0 ? (
                                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                                        <table className="shift-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>{isEn ? 'Item Name' : 'اسم الصنف'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Qty Sold' : 'الكمية المباعة'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Avg Price' : 'متوسط السعر'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Total Revenue' : 'إجمالي الإيراد'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Total Cost' : 'إجمالي التكلفة'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Gross Profit' : 'مجمل الربح'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Profit Margin' : 'هامش الربح'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {details.items_summary.map((item: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td style={{ color: '#94a3b8', fontSize: '12px' }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: 800 }}>{item.item_name}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 900, color: '#1C73AB' }}>
                                                            {item.total_quantity}
                                                        </td>
                                                        <td style={{ textAlign: 'center', color: '#64748b' }}>
                                                            {formatCurrency(item.avg_price)}
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                                                            {formatCurrency(item.total_amount)}
                                                        </td>
                                                        <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>
                                                            {formatCurrency(item.total_cogs || 0)}
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 900, color: (item.gross_profit || 0) >= 0 ? '#15803d' : '#dc2626' }}>
                                                            {(item.gross_profit || 0) >= 0 ? `+${formatCurrency(item.gross_profit || 0)}` : formatCurrency(item.gross_profit || 0)}
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 800, color: (item.profit_margin || 0) >= 0 ? '#0284c7' : '#dc2626' }}>
                                                            {item.profit_margin || 0}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        {isEn ? 'No item sales recorded in this shift yet.' : 'لم يتم تسجيل أي مبيعات أصناف في هذه الوردية بعد.'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* التبويب 3: سجل الفواتير */}
                        {(activeTab === 'invoices') && (
                            <div>
                                {details.invoices && details.invoices.length > 0 ? (
                                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                                        <table className="shift-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    <th>{isEn ? 'Invoice ID' : 'رقم الفاتورة'}</th>
                                                    <th>{isEn ? 'Customer' : 'العميل'}</th>
                                                    <th>{isEn ? 'Payment Method' : 'طريقة الدفع'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Time' : 'الوقت'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Amount' : 'المبلغ'}</th>
                                                    <th style={{ textAlign: 'center' }}>{isEn ? 'Status' : 'الحالة'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {details.invoices.map((inv: any) => (
                                                    <tr key={inv.id}>
                                                        <td style={{ fontWeight: 900, color: '#1C73AB' }}>{inv.invoice_number}</td>
                                                        <td style={{ fontWeight: 700 }}>{inv.client_name}</td>
                                                        <td>
                                                            <span style={{
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 800,
                                                                background: inv.payment_method?.includes('كاش') || inv.payment_method?.toLowerCase().includes('cash') ? '#dcfce7' : inv.payment_method?.includes('آجل') || inv.payment_method?.toLowerCase().includes('credit') ? '#fef3c7' : '#e0f2fe',
                                                                color: inv.payment_method?.includes('كاش') || inv.payment_method?.toLowerCase().includes('cash') ? '#16a34a' : inv.payment_method?.includes('آجل') || inv.payment_method?.toLowerCase().includes('credit') ? '#d97706' : '#0284c7'
                                                            }}>
                                                                {inv.payment_method}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                                            {new Date(inv.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                                                            {formatCurrency(inv.total_amount)}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{inv.status || (isEn ? 'Approved' : 'معتمد')}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        {isEn ? 'No invoices issued in this shift.' : 'لا توجد فواتير مصدرة ضمن هذه الوردية.'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
