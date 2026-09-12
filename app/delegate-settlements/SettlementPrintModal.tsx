"use client";
import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate, tafqeet } from '@/lib/helpers';
import { QRCodeSVG } from 'qrcode.react';

interface SettlementPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: any;
}

export default function SettlementPrintModal({
    isOpen,
    onClose,
    trip
}: SettlementPrintModalProps) {
    const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

    if (!isOpen || !trip) return null;

    const handlePrint = () => {
        document.title = `مخالصة_عهدة_رحلة_${trip.operationNumber}_${trip.driverName}`;
        window.print();
    };

    const creationDateObj = trip.date ? new Date(trip.date) : new Date();
    const creationDate = formatDate(trip.date);
    const creationTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    // QR Verification Text
    const qrData = `شركة مياه غيام\nسند تسوية عهدة رقم: ${trip.operationNumber}\nالمندوب: ${trip.driverName}\nالتاريخ: ${creationDate}\nصافي النقدية: ${trip.netCashDue} ر.س\nالمورد: ${trip.handedOverCash} ر.س`;

    const totalReturnQty = (trip.inventoryItems || []).reduce((s: number, i: any) => s + Number(i.returnedQty || 0), 0);
    const totalWasteQty = (trip.inventoryItems || []).reduce((s: number, i: any) => s + Number(i.wasteQty || 0), 0);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(18, 41, 70, 0.7)',
            backdropFilter: 'blur(12px)',
            padding: '20px',
            direction: 'rtl',
            boxSizing: 'border-box'
        }}>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        box-shadow: none !important;
                        background: #fff !important;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                color: '#122946'
            }}>
                {/* Control Bar (Hidden on Print) */}
                <div className="no-print" style={{
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 900, fontSize: '15px', color: '#1C73AB' }}>
                            🖨️ طباعة سند تسوية ومخالصة عهدة
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={handlePrint}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '50px',
                                border: 'none',
                                background: '#1C73AB',
                                color: '#FFFFFF',
                                fontWeight: 900,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(28, 115, 171, 0.3)'
                            }}
                        >
                            <span>طباعة فورية</span>
                            <span>🖨️</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '50px',
                                border: '1px solid #cbd5e1',
                                background: '#FFFFFF',
                                color: '#64748b',
                                fontWeight: 800,
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            إغلاق
                        </button>
                    </div>
                </div>

                {/* Printable Document Area */}
                <div className="print-area" style={{
                    padding: '35px 40px',
                    overflowY: 'auto',
                    flex: 1,
                    background: '#FFFFFF'
                }}>
                    {/* Official Document Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '2px solid #1C73AB',
                        paddingBottom: '20px',
                        marginBottom: '25px'
                    }}>
                        <div>
                            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: 900, color: '#122946' }}>
                                شركة مياه غيام المحدودة
                            </h1>
                            <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                El-Ghayam Water Co. | قسم التوزيع والخدمات اللوجستية
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                س.ت: 1010892341 | الرقم الضريبي: 31089234100003
                            </p>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                border: '2px dashed #1C73AB',
                                padding: '8px 18px',
                                borderRadius: '12px',
                                background: 'rgba(28, 115, 171, 0.04)'
                            }}>
                                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#1C73AB' }}>
                                    سند تسوية ومخالصة عهدة
                                </h2>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#122946' }}>
                                    SETTLEMENT CLEARANCE
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800, marginTop: '6px' }}>
                                معتمد ومقفل رسمياً ✅
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <QRCodeSVG value={qrData} size={75} />
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '15px',
                        background: '#f8fafc',
                        padding: '16px 20px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '25px',
                        fontSize: '13px'
                    }}>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>رقم أمر التشغيل: </span>
                            <b style={{ color: '#1C73AB' }}>{trip.operationNumber}</b>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>تاريخ الرحلة: </span>
                            <b>{creationDate}</b>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>وقت التسوية: </span>
                            <b>{creationTime}</b>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>اسم المندوب: </span>
                            <b style={{ color: '#122946' }}>{trip.driverName}</b>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>رقم لوحة السيارة: </span>
                            <b>{trip.vehiclePlate} ({trip.vehicleModel || 'شاحنة توزيع'})</b>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontWeight: 700 }}>معرف الشريك (ID): </span>
                            <code style={{ fontSize: '11px', color: '#1C73AB' }}>{trip.driverId || '---'}</code>
                        </div>
                    </div>

                    {/* Section 1: Inventory Return Summary */}
                    <div style={{ marginBottom: '25px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderBottom: '1.5px solid #1C73AB',
                            paddingBottom: '6px',
                            marginBottom: '12px'
                        }}>
                            <span style={{ fontSize: '16px' }}>📦</span>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#1C73AB' }}>
                                أولاً: كشف تسوية حركة البضائع وإرجاع الفائض للمستودع الرئيسي
                            </h3>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                            <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                <tr>
                                    <th style={{ padding: '8px 12px', color: '#122946' }}>الصنف</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>الكمية المحملة</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>المبيعات</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#16a34a' }}>المرتجع للمستودع الرئيسي 🔄</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>التوالف / الهدر ⚠️</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>المتبقي في السيارة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(trip.inventoryItems && trip.inventoryItems.length > 0) ? trip.inventoryItems.map((item: any, idx: number) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px 12px', fontWeight: 800 }}>{item.itemName}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.loadedQty}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.soldQty}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                                            {item.returnedQty || item.remainingQty || 0}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>{item.wasteQty || 0}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>{item.remainingQty || 0}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>
                                            تمت تسوية بضاعة الرحلة بالكامل
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Section 2: Cash Settlement Summary */}
                    <div style={{ marginBottom: '30px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderBottom: '1.5px solid #1C73AB',
                            paddingBottom: '6px',
                            marginBottom: '12px'
                        }}>
                            <span style={{ fontSize: '16px' }}>💵</span>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#1C73AB' }}>
                                ثانياً: كشف تسوية النقدية وتوريد الصندوق
                            </h3>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '20px',
                            background: '#f8fafc',
                            padding: '16px 20px',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>إجمالي مبيعات الرحلة:</span>
                                    <b style={{ color: '#122946' }}>{formatCurrency(trip.totalSales)}</b>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>مبيعات الكاش (+):</span>
                                    <b>{formatCurrency(trip.cashSales)}</b>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>المبيعات الآجلة (ذمم عملاء):</span>
                                    <b>{formatCurrency(trip.creditSales)}</b>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>تحصيلات من العملاء (+):</span>
                                    <b>{formatCurrency(trip.totalCollections)}</b>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>مصروفات الرحلة المسددة (-):</span>
                                    <b style={{ color: '#ef4444' }}>{formatCurrency(trip.totalExpenses)}</b>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '10px',
                                borderRight: '2px solid #e2e8f0',
                                paddingRight: '20px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C73AB' }}>صافي النقدية المستحقة:</span>
                                    <span style={{ fontSize: '17px', fontWeight: 900, color: '#1C73AB' }}>{formatCurrency(trip.netCashDue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>النقدية الموردة للخزينة:</span>
                                    <span style={{ fontSize: '17px', fontWeight: 900, color: '#16a34a' }}>
                                        {formatCurrency(trip.handedOverCash || trip.netCashDue)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: trip.remainingCashCustody <= 0 ? '#16a34a' : '#ef4444' }}>
                                        فارق العهدة المتبقية:
                                    </span>
                                    <span style={{ fontSize: '16px', fontWeight: 900, color: trip.remainingCashCustody <= 0 ? '#16a34a' : '#ef4444' }}>
                                        {trip.remainingCashCustody <= 0 ? '0.00 ر.س (مطابقة ✅)' : formatCurrency(trip.remainingCashCustody)}
                                    </span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                                    المبلغ كتابةً: {tafqeet(Number(trip.handedOverCash || trip.netCashDue || 0))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Tri-party Signatures */}
                    <div style={{
                        marginTop: '40px',
                        paddingTop: '20px',
                        borderTop: '2px solid #1C73AB'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                            إقرار واعتماد تسوية العهدة وإخلاء الطرف النهائي
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '20px',
                            textAlign: 'center'
                        }}>
                            {/* Signature 1: Delegate */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 900, color: '#122946', marginBottom: '4px' }}>
                                    المندوب المسلِّم
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '35px' }}>
                                    أقر بتسليم النقدية والبضاعة أعلاه
                                </div>
                                <div style={{ borderBottom: '1px dashed #94a3b8', width: '80%', margin: '0 auto 8px auto' }}></div>
                                <div style={{ fontSize: '12px', fontWeight: 800 }}>{trip.driverName}</div>
                            </div>

                            {/* Signature 2: Warehouse Keeper */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 900, color: '#122946', marginBottom: '4px' }}>
                                    أمين المستودع الرئيسي
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '35px' }}>
                                    استلام وفحص البضائع المرتجعة
                                </div>
                                <div style={{ borderBottom: '1px dashed #94a3b8', width: '80%', margin: '0 auto 8px auto' }}></div>
                                <div style={{ fontSize: '12px', fontWeight: 800 }}>أمين المستودع المعتمد</div>
                            </div>

                            {/* Signature 3: Accountant / Financial Manager */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 900, color: '#122946', marginBottom: '4px' }}>
                                    المحاسب / الإدارة المالية
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '35px' }}>
                                    استلام النقدية واعتماد القيود
                                </div>
                                <div style={{ borderBottom: '1px dashed #94a3b8', width: '80%', margin: '0 auto 8px auto' }}></div>
                                <div style={{ fontSize: '12px', fontWeight: 800 }}>المحاسب العام</div>
                            </div>
                        </div>
                    </div>

                    {/* Footer notice */}
                    <div style={{
                        marginTop: '30px',
                        textAlign: 'center',
                        fontSize: '10px',
                        color: '#94a3b8',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '10px'
                    }}>
                        تم إنشاء هذا السند آلياً عبر نظام مياه غيام السحابي ويعد وثيقة رسمية معتمدة لإخلاء عهدة التوزيع والتشغيل.
                    </div>
                </div>
            </div>
        </div>
    );
}
