"use client";
import React, { useRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/helpers';

interface PosSettlementPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    shift: any;
}

export default function PosSettlementPrintModal({
    isOpen,
    onClose,
    shift
}: PosSettlementPrintModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !shift) return null;

    const handlePrint = () => {
        window.print();
    };

    const netCashDue = Number(shift.netCashDue || 0);
    const handedOver = Number(shift.handedOverCash || shift.actualCash || 0);
    const variance = Number(shift.shortageOverage || 0);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(18, 41, 70, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            direction: 'rtl'
        }}>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .pos-print-content, .pos-print-content * {
                        visibility: visible !important;
                    }
                    .pos-print-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        background: #ffffff !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div style={{
                background: '#ffffff',
                borderRadius: '26px',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden'
            }}>
                {/* Modal Top Bar */}
                <div className="no-print" style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🖨️</span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                            معاينة وطباعة سند تسوية ومخالصة عهدة منفذ بيع
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={handlePrint}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '50px',
                                border: 'none',
                                background: '#16a34a',
                                color: '#ffffff',
                                fontWeight: 900,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                            }}
                        >
                            <span>🖨️ طباعة السند (A4)</span>
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(255, 255, 255, 0.2)',
                                color: '#ffffff',
                                fontSize: '16px',
                                fontWeight: 900,
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Printable Document (A4 format) */}
                <div ref={printRef} className="pos-print-content" style={{ padding: '36px 40px', overflowY: 'auto', flex: 1, color: '#122946' }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '2.5px solid #1C73AB',
                        paddingBottom: '16px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 900, color: '#1C73AB' }}>
                                صيدلية تاج المودة البيطرية
                            </h1>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                مبيعات الجملة والتجزئة ومنافذ التوزيع المعتمدة
                            </div>
                            <div style={{ fontSize: '12px', color: '#122946', fontWeight: 800, marginTop: '2px' }}>
                                الرقم الضريبي: <span style={{ fontFamily: 'monospace', color: '#1C73AB' }}>300000000000003</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'left' }}>
                            <div style={{
                                display: 'inline-block',
                                background: '#1C73AB',
                                color: '#ffffff',
                                padding: '6px 14px',
                                borderRadius: '10px',
                                fontWeight: 900,
                                fontSize: '14px',
                                marginBottom: '6px'
                            }}>
                                سند تسوية ومخالصة عهدة
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                رقم الوردية: <b style={{ color: '#122946' }}>{shift.shiftNumber}</b>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}
                            </div>
                        </div>
                    </div>

                    {/* Outlet & Shift Info Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        background: '#f8fafc',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>منفذ البيع / الفرع:</span>{' '}
                            <b style={{ color: '#1C73AB', fontSize: '14px' }}>{shift.warehouseName}</b>
                            {shift.warehouseLocation && <span style={{ color: '#64748b' }}> ({shift.warehouseLocation})</span>}
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>الكاشير / المسؤول:</span>{' '}
                            <b style={{ color: '#122946', fontSize: '13px' }}>{shift.cashierName}</b>
                            {shift.cashierPhone && <span> - 📞 {shift.cashierPhone}</span>}
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>وقت فتح الوردية:</span>{' '}
                            <b>{formatDate(shift.openedAt)}</b>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>وقت إغلاق الوردية:</span>{' '}
                            <b>{shift.closedAt ? formatDate(shift.closedAt) : 'مفتوحة'}</b>
                        </div>
                    </div>

                    {/* Section 1: Sales & Financial Breakdown */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 900, color: '#1C73AB', borderRight: '3px solid #1C73AB', paddingRight: '8px' }}>
                            أولاً: تفصيل المبيعات والمقبوضات خلال الوردية
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>بيان الحركة</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>مبيعات نقدية (كاش)</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>مبيعات شبكة (مدى)</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>مبيعات آجلة</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>تحصيلات سابقة</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>إجمالي المبيعات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>مبيعات فواتير الكاشير</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#1C73AB' }}>{formatCurrency(shift.cashSales)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>{formatCurrency(shift.cardSales)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>{formatCurrency(shift.creditSales)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(shift.totalCollections)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 900, color: '#122946', background: '#f8fafc' }}>{formatCurrency(shift.totalSales)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 2: Cash Reconciliation */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 900, color: '#1C73AB', borderRight: '3px solid #1C73AB', paddingRight: '8px' }}>
                            ثانياً: المطابقة النقدية لدرج الصندوق وتوريد الخزينة
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px', width: '60%', color: '#64748b' }}>1. العهدة النقدية الافتتاحية بالدرج (+)</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, textAlign: 'left' }}>{formatCurrency(shift.startingCash)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px', color: '#64748b' }}>2. المقبوضات والمبيعات النقدية الفعلية (+)</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, textAlign: 'left', color: '#1C73AB' }}>{formatCurrency(shift.cashSales + shift.totalCollections)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px', color: '#64748b' }}>3. المصروفات النقدية المسددة من الصندوق (-)</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, textAlign: 'left', color: '#ef4444' }}>{formatCurrency(shift.totalExpenses)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1.5px solid #cbd5e1', background: '#f8fafc' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 900, color: '#122946' }}>صافي النقد المتوقع بالدرج (المطالبة النقدية للوردية)</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 900, textAlign: 'left', color: '#b45309', fontSize: '13px' }}>{formatCurrency(netCashDue)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 900, color: '#16a34a' }}>النقد الفعلي المسلّم والمورد للخزينة الرئيسية / البنك</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 900, textAlign: 'left', color: '#16a34a', fontSize: '14px' }}>{formatCurrency(handedOver)}</td>
                                </tr>
                                <tr style={{ background: variance < 0 ? '#fef2f2' : (variance > 0 ? '#f0fdf4' : '#ffffff') }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 900, color: variance < 0 ? '#ef4444' : (variance > 0 ? '#16a34a' : '#122946') }}>
                                        فروقات الصندوق ({variance < 0 ? 'عجز نقدية ⚠️' : (variance > 0 ? 'زيادة نقدية 🎉' : 'متطابق تماماً ✅')})
                                    </td>
                                    <td style={{ padding: '8px 12px', fontWeight: 900, textAlign: 'left', color: variance < 0 ? '#ef4444' : (variance > 0 ? '#16a34a' : '#16a34a'), fontSize: '13px' }}>
                                        {formatCurrency(variance)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 3: Bottles Custody */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 900, color: '#1C73AB', borderRight: '3px solid #1C73AB', paddingRight: '8px' }}>
                            ثالثاً: عهدة العبوات والمستلزمات
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center', fontSize: '11px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div>
                                <span style={{ color: '#64748b' }}>فوارغ البداية:</span>
                                <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px' }}>{shift.startingBottles}</div>
                            </div>
                            <div>
                                <span style={{ color: '#1C73AB' }}>فوارغ مباعة:</span>
                                <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px', color: '#1C73AB' }}>{shift.bottlesSold}</div>
                            </div>
                            <div>
                                <span style={{ color: '#16a34a' }}>فوارغ مستلمة (مرتجع):</span>
                                <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px', color: '#16a34a' }}>{shift.bottlesReturned}</div>
                            </div>
                            <div>
                                <span style={{ color: '#b45309' }}>الرصيد المتبقي بالمنفذ:</span>
                                <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px', color: '#b45309' }}>{shift.expectedBottles}</div>
                            </div>
                            <div>
                                <span style={{ color: '#ef4444' }}>عجز الفوارغ:</span>
                                <div style={{ fontWeight: 800, fontSize: '13px', marginTop: '2px', color: '#ef4444' }}>{shift.bottlesShortage}</div>
                            </div>
                        </div>
                    </div>

                    {/* Clearance Statement */}
                    <div style={{
                        background: '#f8fafc',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                        lineHeight: 1.6,
                        color: '#334155',
                        marginBottom: '26px'
                    }}>
                        <b>إقرار ومخالصة:</b> نشهد نحن الموقعين أدناه أنه تمت مراجعة وتدقيق مبيعات وإيرادات وصندوق ومخزون منفذ بيع (<b>{shift.warehouseName}</b>) للوردية الموضحة، وتم استلام وتوريد المبالغ النقدية المحددة بالخزينة المركزية وترحيل القيود المحاسبية بالنظام، وتعتبر ذمة الكاشير/المسؤول مبرأة نظامياً ومحاسبياً عن هذه الوردية.
                    </div>

                    {/* Signature Blocks */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '14px',
                        textAlign: 'center',
                        fontSize: '11px',
                        borderTop: '1px solid #cbd5e1',
                        paddingTop: '14px'
                    }}>
                        <div>
                            <b style={{ color: '#122946' }}>الكاشير / مسؤول المنفذ</b>
                            <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>{shift.cashierName}</div>
                            <div style={{ height: '40px' }}></div>
                            <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}>التوقيع</div>
                        </div>
                        <div>
                            <b style={{ color: '#122946' }}>أمين الصندوق (المستلم)</b>
                            <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>الخزينة المركزية</div>
                            <div style={{ height: '40px' }}></div>
                            <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}>التوقيع</div>
                        </div>
                        <div>
                            <b style={{ color: '#122946' }}>المحاسب المسؤول</b>
                            <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>التدقيق المالي</div>
                            <div style={{ height: '40px' }}></div>
                            <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}>التوقيع</div>
                        </div>
                        <div>
                            <b style={{ color: '#122946' }}>المدير المالي والإداري</b>
                            <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>اعتماد الإدارة</div>
                            <div style={{ height: '40px' }}></div>
                            <div style={{ borderTop: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}>الختم والاعتماد</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
