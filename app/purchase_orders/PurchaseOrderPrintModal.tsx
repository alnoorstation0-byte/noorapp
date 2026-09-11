"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';

export default function PurchaseOrderPrintModal({ isOpen, onClose, record }: any) {
    const [mounted, setMounted] = useState(false);
    const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

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

    const linesToPrint = record.items || [];
    const subtotal = linesToPrint.reduce((sum: number, item: any) => sum + ((item.quantity||0) * (item.unit_price||0)), 0);
    const taxTotal = linesToPrint.reduce((sum: number, item: any) => sum + (item.tax_amount || 0), 0);

    return createPortal(
        <div className="print-modal-overlay">
            <style>{`
                .print-modal-overlay { 
                    position: fixed !important; inset: 0 !important; 
                    background: rgba(18, 41, 70, 0.90) !important; 
                    backdrop-filter: blur(10px) !important; 
                    z-index: 999999999 !important; 
                    display: flex !important; flex-direction: column !important; 
                    align-items: center !important; justify-content: flex-start !important; 
                    padding: 30px 20px !important; overflow-y: auto !important; 
                    font-family: 'Arial', sans-serif; 
                }

                .print-actions-bar {
                    display: flex !important; gap: 15px !important; margin-bottom: 25px !important;
                    background: white !important; padding: 15px 30px !important; border-radius: 50px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important; position: sticky !important; 
                    top: 20px !important; z-index: 1000000000 !important; 
                }
                .action-btn { padding: 12px 25px; border-radius: 10px; border: none; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.2s; }
                .action-btn.print { background: linear-gradient(135deg, #2891C8, #7FD4E3); color: #122946; }
                .action-btn.close { background: #fee2e2; color: #dc2626; }

                /* 🚀 Thermal Styles */
                .thermal-preview-box {
                    width: 80mm; background: white; padding: 10px; margin: 0 auto; color: black;
                    font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: bold;
                    text-align: center; direction: rtl; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .thermal-preview-box table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .thermal-preview-box th, .thermal-preview-box td { border-bottom: 1px dashed #000; padding: 4px 0; font-size: 12px; }

                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                    body > *:not(.print-modal-overlay) { display: none !important; }
                    .no-print, .print-actions-bar { display: none !important; }
                    .print-modal-overlay { 
                        position: absolute !important; left: 0 !important; top: 0 !important; 
                        background: white !important; padding: 0 !important; margin: 0 !important; 
                        display: block !important; 
                    }
                }
            `}</style>

            {printFormat === 'a4' && (
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 0 !important; }
                        html, body, .print-modal-overlay { width: 210mm !important; height: 297mm !important; }
                        .a4-preview-box {
                            position: absolute !important; top: 0 !important; left: 0 !important; 
                            width: 210mm !important; height: 297mm !important; 
                            padding: 15mm !important; margin: 0 !important; border: none !important; box-shadow: none !important;
                            page-break-inside: avoid !important;
                        }
                    }
                `}</style>
            )}

            {printFormat === 'thermal' && (
                <style>{`
                    @media print {
                        @page { size: 80mm auto; margin: 0 !important; }
                        html, body, .print-modal-overlay { width: 80mm !important; }
                        .thermal-preview-box {
                            position: absolute !important; top: 0 !important; left: 0 !important; 
                            width: 80mm !important; margin: 0 !important; padding: 5px !important; 
                            border: none !important; box-shadow: none !important;
                        }
                    }
                `}</style>
            )}

            <div className="print-actions-bar no-print">
                <button onClick={printInvoice} className="action-btn print">🖨️ طباعة</button>
                <button onClick={() => setPrintFormat(f => f === 'a4' ? 'thermal' : 'a4')} className="action-btn print" style={{ background: '#f59e0b', color: 'white' }}>
                    تغيير للطباعة {printFormat === 'a4' ? 'الحرارية 🧾' : 'A4 📄'}
                </button>
                <button onClick={onClose} className="action-btn close">❌ إغلاق</button>
            </div>

            {printFormat === 'a4' ? (
                <div className="a4-preview-box" style={{ background: 'white', padding: '40px', borderRadius: '15px', color: 'black', direction: 'rtl', minHeight: '297mm' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>أمر شراء (Purchase Order)</h1>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>رقم الأمر: {record.transaction_number}</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>التاريخ: {record.transaction_date}</p>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>شركة مياه غيام</h2>
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
                            {linesToPrint.map((item: any, idx: number) => (
                            <tr key={idx}>
                                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{item.inventory_items?.name || 'غير محدد'}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(item.unit_price)}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(item.quantity * item.unit_price)}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>الإجمالي قبل الضريبة:</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>الضريبة (15%):</span>
                                <span>{formatCurrency(taxTotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '10px', fontWeight: 'bold' }}>
                                <span>الإجمالي المستحق:</span>
                                <span>{formatCurrency(record.total_amount)}</span>
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
            ) : (
                <div className="thermal-preview-box">
                    <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '5px' }}>شركة مياه غيام</div>
                    <div>أمر شراء | Purchase Order</div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                    
                    <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                        <div>المرجع: {record.transaction_number}</div>
                        <div>التاريخ: {record.transaction_date}</div>
                        <div>المورد: {record.partners?.name || '---'}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>الصنف</th>
                                <th>الكمية</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {linesToPrint.map((line: any, idx: number) => {
                                const lineTotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
                                return (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'right' }}>{line.inventory_items?.name || '---'}</td>
                                        <td style={{ textAlign: 'center' }}>{line.quantity}</td>
                                        <td>{lineTotal.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '5px' }}>
                        <span>الإجمالي (بدون ضريبة):</span>
                        <span>{subtotal.toFixed(2)} ر.س</span>
                    </div>
                    {taxTotal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '5px' }}>
                            <span>الضريبة:</span>
                            <span>{taxTotal.toFixed(2)} ر.س</span>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '10px', fontWeight: 'bold' }}>
                        <span>الإجمالي المستحق:</span>
                        <span>{Number(record.total_amount || 0).toFixed(2)} ر.س</span>
                    </div>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ fontSize: '11px', marginTop: '10px', textAlign: 'center' }}>
                        المعتمد: أمين المستودع<br/>
                        تم الإصدار عبر نظام غيام
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
