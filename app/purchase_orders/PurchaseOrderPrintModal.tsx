"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';

export default function PurchaseOrderPrintModal({ isOpen, onClose, record }: any) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted || !record) return null;

    const printInvoice = () => {
        const originalTitle = document.title;
        document.title = record?.transaction_number ? `Purchase_Order_${record.transaction_number}` : 'Purchase_Order';
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    };

    return createPortal(
        <div className="print-modal-wrapper" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
            zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: '20px', overflowY: 'auto'
        }}>
            <div className="print-modal-content" style={{
                background: 'white', borderRadius: '15px', width: '100%', maxWidth: '800px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header Actions */}
                <div className="no-print" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                    <h2 style={{ margin: 0, color: THEME.primary, fontWeight: 800 }}>طباعة أمر الشراء</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={printInvoice} className="btn-main-glass" style={{ background: THEME.goldAccent, color: THEME.primary, margin: 0, padding: '8px 15px' }}>🖨️ طباعة المستند</button>
                        <button onClick={onClose} className="btn-main-glass" style={{ background: '#ef4444', color: 'white', margin: 0, padding: '8px 15px' }}>❌ إغلاق</button>
                    </div>
                </div>

                {/* Printable Area */}
                <div id="printable-po" className="print-container" style={{ padding: '40px', background: 'white', color: 'black' }} dir="rtl">
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>أمر شراء (Purchase Order)</h1>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>رقم الأمر: {record.transaction_number}</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>التاريخ: {record.transaction_date}</p>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>مؤسسة غيدام التجارية</h2>
                        </div>
                    </div>

                    {/* Parties Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                        <div style={{ width: '48%', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>معلومات المورد:</h3>
                            <p style={{ margin: '5px 0' }}><strong>الاسم:</strong> {record.partners?.name || 'غير محدد'}</p>
                        </div>
                        <div style={{ width: '48%', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>معلومات الاستلام:</h3>
                            {record.fleet_operation_id ? (
                                <>
                                    <p style={{ margin: '5px 0' }}><strong>رقم الرحلة:</strong> {record.fleet_operations?.operation_number}</p>
                                    <p style={{ margin: '5px 0' }}><strong>السيارة:</strong> {record.fleet_operations?.fleet_vehicles?.plate_number}</p>
                                </>
                            ) : (
                                <p style={{ margin: '5px 0' }}><strong>المستودع:</strong> {record.warehouses?.name || 'المستودع الرئيسي'}</p>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>الصنف</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>الكمية</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>سعر الوحدة</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{record.inventory_items?.name || 'غير محدد'}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{record.quantity}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(record.unit_price)}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(record.quantity * record.unit_price)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>الإجمالي قبل الضريبة:</span>
                                <span>{formatCurrency(record.quantity * record.unit_price)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>ضريبة القيمة المضافة (15%):</span>
                                <span>{formatCurrency(record.tax_amount || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '10px', fontWeight: 'bold' }}>
                                <span>الإجمالي المستحق:</span>
                                <span>{formatCurrency((record.quantity * record.unit_price) + (record.tax_amount || 0))}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px' }}>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <p style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>توقيع أمين المستودع</p>
                        </div>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <p style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>توقيع المورد / المندوب</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
}
