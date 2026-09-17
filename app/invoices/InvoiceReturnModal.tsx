"use client";
import React, { useState, useEffect, useMemo } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { THEME } from '@/lib/theme';

interface InvoiceReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    onConfirmReturn: (payload: {
        originalInvoice: any;
        returnedItems: any[];
        returnStockToWarehouse: boolean;
        refundCashFromDrawer: boolean;
        reason: string;
    }) => void;
    isSubmitting: boolean;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);
};

export default function InvoiceReturnModal({
    isOpen,
    onClose,
    invoice,
    onConfirmReturn,
    isSubmitting
}: InvoiceReturnModalProps) {
    const [mounted, setMounted] = useState(false);
    const [returnStockToWarehouse, setReturnStockToWarehouse] = useState(true);
    const [refundCashFromDrawer, setRefundCashFromDrawer] = useState(true);
    const [reason, setReason] = useState('إرجاع بطلب من العميل');
    const [itemsToReturn, setItemsToReturn] = useState<any[]>([]);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (isOpen && invoice) {
            const rawLines = invoice.lines_data || invoice.lines || invoice.items || [];
            // تهيئة بنود المرتجع بناء على الفاتورة الأصلية
            const initialItems = rawLines.map((line: any, idx: number) => {
                const qty = Number(line.quantity || line.qty || 1);
                const unitPrice = Number(line.unit_price || line.price || 0);
                const discount = Number(line.discount || 0);
                const lineTotal = line.total !== undefined ? Number(line.total) : ((qty * unitPrice) - discount);
                const taxRate = (line.tax_rate !== undefined && line.tax_rate !== null) ? Number(line.tax_rate) : (invoice.skip_zatca ? 0 : 15);

                return {
                    idx,
                    item_id: line.item_id || line.id,
                    name: line.name || line.description || `صنف #${idx + 1}`,
                    original_qty: qty,
                    return_qty: qty, // افتراضياً إرجاع الكمية كاملة
                    unit_price: unitPrice,
                    tax_rate: taxRate,
                    unit: line.unit || 'حبة',
                    is_selected: true
                };
            });
            setItemsToReturn(initialItems);
            setReturnStockToWarehouse(true);
            setRefundCashFromDrawer(invoice.payment_method === 'نقدي (كاش)' || invoice.payment_method === 'نقدي');
        }
    }, [isOpen, invoice]);

    const updateItemReturnQty = (idx: number, newQty: number) => {
        setItemsToReturn(prev => prev.map(it => {
            if (it.idx !== idx) return it;
            const validQty = Math.max(0, Math.min(it.original_qty, newQty));
            return { ...it, return_qty: validQty, is_selected: validQty > 0 };
        }));
    };

    const toggleItemSelection = (idx: number) => {
        setItemsToReturn(prev => prev.map(it => {
            if (it.idx !== idx) return it;
            const willSelect = !it.is_selected;
            return {
                ...it,
                is_selected: willSelect,
                return_qty: willSelect ? (it.return_qty > 0 ? it.return_qty : it.original_qty) : 0
            };
        }));
    };

    // احتساب مجاميع المرتجع
    const returnSummary = useMemo(() => {
        const selectedItems = itemsToReturn.filter(it => it.is_selected && it.return_qty > 0);
        let subtotal = 0;
        let tax = 0;

        selectedItems.forEach(it => {
            const lineGross = it.return_qty * it.unit_price;
            if (it.tax_rate === 0 || invoice?.skip_zatca) {
                subtotal += lineGross;
            } else {
                const lineSub = lineGross / (1 + (it.tax_rate / 100));
                const lineTax = lineGross - lineSub;
                subtotal += lineSub;
                tax += lineTax;
            }
        });

        const total = subtotal + tax;
        return {
            selectedCount: selectedItems.length,
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            total: Math.round(total * 100) / 100,
            selectedItems: selectedItems.map(it => ({
                item_id: it.item_id,
                name: it.name,
                quantity: it.return_qty,
                unit: it.unit,
                unit_price: it.unit_price,
                tax_rate: it.tax_rate,
                total: Math.round((it.return_qty * it.unit_price) * 100) / 100
            }))
        };
    }, [itemsToReturn, invoice?.skip_zatca]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (returnSummary.selectedItems.length === 0) {
            alert("يرجى اختيار صنف واحد على الأقل لإرجاعه وتحديد كميته.");
            return;
        }

        onConfirmReturn({
            originalInvoice: invoice,
            returnedItems: returnSummary.selectedItems,
            returnStockToWarehouse,
            refundCashFromDrawer,
            reason
        });
    };

    if (!isOpen || !mounted || !invoice) return null;

    const isCashInvoice = invoice.payment_method === 'نقدي (كاش)' || invoice.payment_method === 'نقدي';

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={`إجراء مرتجع مبيعات للفاتورة #${invoice.invoice_number} 🔄`}
            icon="↩️"
            width="780px"
        >
            <style>{`
                .return-sec-card {
                    background: rgba(20, 24, 34, 0.75);
                    border: 1px solid rgba(0, 229, 255, 0.2);
                    border-radius: 16px;
                    padding: 14px 18px;
                    margin-bottom: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                .return-sec-title {
                    font-size: 13px;
                    font-weight: 900;
                    color: #00E5FF;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    border-bottom: 1px dashed rgba(0, 229, 255, 0.25);
                    padding-bottom: 6px;
                }
                .return-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                .return-table th {
                    background: rgba(255, 255, 255, 0.04);
                    color: #94A3B8;
                    padding: 8px 10px;
                    font-weight: 900;
                    text-align: right;
                }
                .return-table td {
                    padding: 8px 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    vertical-align: middle;
                    color: #F8FAFC;
                }
                .return-toggle-option {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(20, 24, 34, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 10px 14px;
                    border-radius: 12px;
                    cursor: pointer;
                    margin-bottom: 8px;
                    transition: 0.2s;
                }
                .return-toggle-option.active {
                    background: rgba(0, 229, 255, 0.1);
                    border-color: #00E5FF;
                }
                .return-qty-stepper {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    background: rgba(11, 14, 20, 0.8);
                    border: 1px solid rgba(0, 229, 255, 0.3);
                    border-radius: 8px;
                    padding: 2px 4px;
                }
                .return-qty-btn {
                    width: 26px;
                    height: 26px;
                    border: none;
                    background: rgba(0, 229, 255, 0.15);
                    color: #00E5FF;
                    border-radius: 6px;
                    font-weight: 900;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .return-qty-btn:hover {
                    background: #00E5FF;
                    color: #0B0E14;
                }

                /* Daylight Desert Glassmorphism */
                .daylight-theme .return-sec-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 4px 12px rgba(44, 26, 18, 0.06) !important;
                }
                .daylight-theme .return-sec-card strong,
                .daylight-theme .return-sec-card div {
                    color: #2C1A12 !important;
                }
                .daylight-theme .return-sec-card span[style*="color: #94A3B8"],
                .daylight-theme .return-sec-card span[style*="color:#94A3B8"] {
                    color: rgba(44, 26, 18, 0.65) !important;
                }
                .daylight-theme .return-sec-title {
                    color: #A8573C !important;
                    border-bottom: 1px dashed rgba(194, 155, 98, 0.35) !important;
                }
                .daylight-theme .return-table th {
                    background: rgba(194, 155, 98, 0.12) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .return-table td {
                    border-bottom: 1px solid rgba(194, 155, 98, 0.15) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .return-toggle-option {
                    background: rgba(255, 255, 255, 0.7) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                }
                .daylight-theme .return-toggle-option.active {
                    background: rgba(194, 155, 98, 0.15) !important;
                    border-color: #C29B62 !important;
                }
                .daylight-theme .return-qty-stepper {
                    background: #FFFFFF !important;
                    border: 1px solid rgba(194, 155, 98, 0.4) !important;
                }
                .daylight-theme .return-qty-stepper input {
                    color: #2C1A12 !important;
                }
                .daylight-theme .return-qty-btn {
                    background: rgba(194, 155, 98, 0.2) !important;
                    color: #A8573C !important;
                }
                .daylight-theme .return-qty-btn:hover {
                    background: #C29B62 !important;
                    color: #FFFFFF !important;
                }
                .daylight-theme .return-footer-summary {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(245, 238, 228, 0.95) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.4) !important;
                    box-shadow: 0 8px 25px rgba(44, 26, 18, 0.12) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .return-footer-summary div {
                    color: #2C1A12 !important;
                }
                .daylight-theme .return-footer-summary .btn-glass-save {
                    background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%) !important;
                    color: #FFFFFF !important;
                    box-shadow: 0 4px 15px rgba(168, 87, 60, 0.3) !important;
                }
            `}</style>

            <form onSubmit={handleSubmit}>
                {/* 1. ملخص الفاتورة الأصلية */}
                <div className="return-sec-card">
                    <div className="return-sec-title">
                        <span>🧾</span>
                        <span>بيانات الفاتورة الأصلية المراد عمل مرتجع لها</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '12px' }}>
                        <div>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>رقم الفاتورة:</span>{' '}
                            <strong style={{ color: '#F8FAFC' }}>#{invoice.invoice_number}</strong>
                        </div>
                        <div>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>العميل:</span>{' '}
                            <strong style={{ color: '#F8FAFC' }}>{invoice.client_name || 'عميل نقدي'}</strong>
                        </div>
                        <div>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>التاريخ:</span>{' '}
                            <strong style={{ color: '#F8FAFC' }}>{invoice.date ? new Date(invoice.date).toLocaleDateString('ar-EG') : '-'}</strong>
                        </div>
                        <div>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>طريقة الدفع:</span>{' '}
                            <span style={{ 
                                background: isCashInvoice ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 229, 255, 0.15)',
                                color: isCashInvoice ? '#10B981' : '#00E5FF',
                                padding: '2px 8px', borderRadius: '6px', fontWeight: 800
                            }}>
                                {invoice.payment_method || 'نقدي (كاش)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. جدول الأصناف المراد إرجاعها */}
                <div className="return-sec-card">
                    <div className="return-sec-title" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📦</span>
                            <span>حدد الأصناف والكميات المراد إرجاعها</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>
                            (يمكن إرجاع الفاتورة بالكامل أو تحديد أصناف وكميات جزئية)
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="return-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>تضمين</th>
                                    <th>الصنف</th>
                                    <th style={{ textAlign: 'center' }}>الكمية المباعة</th>
                                    <th style={{ textAlign: 'center' }}>الكمية المرتجعة</th>
                                    <th style={{ textAlign: 'center' }}>سعر الوحدة</th>
                                    <th style={{ textAlign: 'center' }}>الضريبة</th>
                                    <th style={{ textAlign: 'center' }}>إجمالي الاسترداد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsToReturn.map(it => {
                                    const lineRefund = it.return_qty * it.unit_price;
                                    return (
                                        <tr key={it.idx} style={{ opacity: it.is_selected ? 1 : 0.45 }}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={it.is_selected} 
                                                    onChange={() => toggleItemSelection(it.idx)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00E5FF' }}
                                                />
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 800, color: '#F8FAFC' }}>{it.name}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#94A3B8' }}>
                                                {it.original_qty} {it.unit}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="return-qty-stepper">
                                                    <button 
                                                        type="button" 
                                                        className="return-qty-btn"
                                                        onClick={() => updateItemReturnQty(it.idx, it.return_qty - 1)}
                                                        disabled={!it.is_selected || it.return_qty <= 0}
                                                    >
                                                        -
                                                    </button>
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        max={it.original_qty}
                                                        value={it.return_qty}
                                                        onChange={(e) => updateItemReturnQty(it.idx, Number(e.target.value) || 0)}
                                                        disabled={!it.is_selected}
                                                        style={{ width: '44px', textAlign: 'center', border: 'none', fontWeight: 900, outline: 'none', color: '#F8FAFC', background: 'transparent' }}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        className="return-qty-btn"
                                                        onClick={() => updateItemReturnQty(it.idx, it.return_qty + 1)}
                                                        disabled={!it.is_selected || it.return_qty >= it.original_qty}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                                {formatCurrency(it.unit_price)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {it.tax_rate === 0 ? (
                                                    <span style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '6px' }}>
                                                        0% معفي
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 700 }}>
                                                        15%
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 900, color: '#10B981' }}>
                                                {formatCurrency(lineRefund)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. خيارات المعالجة والأثر المالي والمخزني */}
                <div className="return-sec-card">
                    <div className="return-sec-title">
                        <span>⚙️</span>
                        <span>خيارات الأثر المخزني والمالي للمرتجع</span>
                    </div>

                    {/* خيار إعادة الوقود/المنتجات للخزانات */}
                    <div 
                        onClick={() => setReturnStockToWarehouse(!returnStockToWarehouse)}
                        className={`return-toggle-option ${returnStockToWarehouse ? 'active' : ''}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>⛽</span>
                            <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 900, color: 'var(--text-main, #F8FAFC)' }}>
                                    إعادة كميات الوقود والمنتجات إلى رصيد الخزانات
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
                                    يقوم النظام بزيادة رصيد الوقود في خزان المحطة فوراً وإثبات حركة وارد مرتجع
                                </div>
                            </div>
                        </div>
                        <div style={{
                            width: '22px', height: '22px', borderRadius: '6px',
                            border: returnStockToWarehouse ? '2px solid #00E5FF' : '2px solid rgba(255, 255, 255, 0.2)',
                            background: returnStockToWarehouse ? '#00E5FF' : 'transparent',
                            color: '#0B0E14', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 900
                        }}>
                            {returnStockToWarehouse ? '✓' : ''}
                        </div>
                    </div>

                    {/* خيار استرداد الكاش من الدرج */}
                    {isCashInvoice && (
                        <div 
                            onClick={() => setRefundCashFromDrawer(!refundCashFromDrawer)}
                            className={`return-toggle-option ${refundCashFromDrawer ? 'active' : ''}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '20px' }}>💵</span>
                                <div>
                                    <div style={{ fontSize: '12.5px', fontWeight: 900, color: 'var(--text-main, #F8FAFC)' }}>
                                        استرداد المبلغ نقداً وخصمه من نقدية الدرج / الوردية
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
                                        يقوم النظام بخصم المبلغ المرتجع من نقدية الوردية بالكاشير لضبط مطابقة الدرج
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                width: '22px', height: '22px', borderRadius: '6px',
                                border: refundCashFromDrawer ? '2px solid #00E5FF' : '2px solid rgba(255, 255, 255, 0.2)',
                                background: refundCashFromDrawer ? '#00E5FF' : 'transparent',
                                color: '#0B0E14', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: 900
                            }}>
                                {refundCashFromDrawer ? '✓' : ''}
                            </div>
                        </div>
                    )}

                    {/* سبب المرتجع */}
                    <div style={{ marginTop: '10px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                            سبب المرتجع وملاحظات:
                        </label>
                        <input 
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="مثال: رغبة العميل، عيب مصنعي، استبدال..."
                            className="glass-input-field"
                            style={{ width: '100%', height: '38px', borderRadius: '10px', fontSize: '12px' }}
                        />
                    </div>
                </div>

                {/* 4. ملخص مبالغ الاسترداد والزر النهائي */}
                <div className="return-footer-summary" style={{
                    background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(11, 14, 20, 0.95) 100%)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>الأصناف المرتجعة</div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>{returnSummary.selectedCount} أصناف</div>
                        </div>
                        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />
                        <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>المسترد قبل الضريبة</div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>{formatCurrency(returnSummary.subtotal)}</div>
                        </div>
                        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />
                        <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>الضريبة المستردة</div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>{formatCurrency(returnSummary.tax)}</div>
                        </div>
                        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />
                        <div>
                            <div style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 900 }}>إجمالي المبلغ المسترد للعميل</div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: '#00E5FF' }}>{formatCurrency(returnSummary.total)}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-glass-cancel"
                            style={{ minWidth: '90px', margin: 0, height: '42px', borderRadius: '10px' }}
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || returnSummary.total <= 0}
                            className="btn-glass-save"
                            style={{ 
                                minWidth: '150px', margin: 0, height: '42px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #00E5FF 0%, #0077B6 100%)',
                                color: '#0B0E14', fontWeight: 900, fontSize: '13px',
                                boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)'
                            }}
                        >
                            {isSubmitting ? '⏳ جاري المعالجة...' : '🔄 تأكيد المرتجع وإصدار الإشعار'}
                        </button>
                    </div>
                </div>
            </form>
        </AquaModalWrapper>
    );
}
