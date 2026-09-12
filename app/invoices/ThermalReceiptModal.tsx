
"use client";
import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateZatcaQR } from '@/lib/zatca_qr';

export default function ThermalReceiptModal({ isOpen, onClose, record, onOpenA4 }: { isOpen: boolean, onClose: () => void, record: any, onOpenA4: () => void }) {
    const [qrData, setQrData] = useState('');

    useEffect(() => {
        if (record) {
            const dateStr = record.date || new Date().toISOString();
            const total = Number(record.total_amount || 0).toFixed(2);
            const vat = Number(record.total_amount * 0.15).toFixed(2); // Assuming 15% VAT included or separated, adjust based on your logic
            
            // Generate ZATCA Base64
            const qr = generateZatcaQR('مؤسسة أكوا لتقنية المياه', '312345678900003', dateStr, total, vat);
            setQrData(qr);
        }
    }, [record]);

    if (!isOpen || !record) return null;

    let lines = [];
    try {
        lines = typeof record.lines_data === 'string' ? JSON.parse(record.lines_data) : record.lines_data;
    } catch(e){}

    const handlePrint = React.useCallback(() => {
        window.print();
    }, []);

    // ⌨️ استجابة لوحة المفاتيح: Esc للإغلاق و Enter أو Ctrl+P للطباعة
    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === 'Enter' || ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P'))) {
                e.preventDefault();
                e.stopPropagation();
                handlePrint();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handlePrint]);

    return (
        <div className="thermal-modal-overlay">
            <style dangerouslySetInnerHTML={{__html: `
                .thermal-modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
                    display: flex; justify-content: center; align-items: center; z-index: 999999;
                    flex-direction: column; gap: 15px;
                }
                .thermal-actions {
                    display: flex; gap: 10px; background: rgba(255,255,255,0.8);
                    padding: 10px 20px; border-radius: 15px; backdrop-filter: blur(10px);
                }
                .thermal-actions button {
                    padding: 8px 15px; border: none; border-radius: 8px; cursor: pointer;
                    font-weight: bold; transition: 0.2s;
                }
                .btn-print-thermal { background: #1C73AB; color: white; }
                .btn-a4 { background: #f59e0b; color: white; }
                .btn-close { background: #ef4444; color: white; }
                
                .thermal-receipt-container {
                    width: 80mm; background: white; padding: 15px;
                    border-radius: 5px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    color: black; font-family: 'Courier New', Courier, monospace;
                    font-size: 12px; font-weight: bold; text-align: center;
                    direction: rtl; overflow: hidden;
                }
                
                .thermal-receipt-container table { width: 100%; margin: 10px 0; border-collapse: collapse; }
                .thermal-receipt-container th, .thermal-receipt-container td { 
                    border-bottom: 1px dashed #000; padding: 5px 0; text-align: right; 
                }
                .thermal-receipt-container th { text-align: center; }

                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body * { visibility: hidden; }
                    .thermal-receipt-container, .thermal-receipt-container * {
                        visibility: visible;
                    }
                    .thermal-receipt-container {
                        position: absolute; left: 0; top: 0; width: 80mm;
                        margin: 0; padding: 5px; box-shadow: none; border-radius: 0;
                    }
                    .thermal-modal-overlay { background: transparent; backdrop-filter: none; }
                    .thermal-actions { display: none; }
                }
            `}} />

            <div className="thermal-actions">
                <button className="btn-print-thermal" onClick={handlePrint}>🖨️ طباعة حرارية</button>
                <button className="btn-a4" onClick={() => { onClose(); onOpenA4(); }}>📄 فاتورة A4</button>
                <button className="btn-close" onClick={onClose}>❌ إغلاق</button>
            </div>

            <div className="thermal-receipt-container">
                <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '5px' }}>مؤسسة أكوا لتقنية المياه</div>
                <div>الرقم الضريبي: 312345678900003</div>
                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                
                <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                    <div>رقم الفاتورة: {record.invoice_number || record.id?.substring(0,6)}</div>
                    <div>التاريخ: {new Date(record.date || Date.now()).toLocaleString('ar-SA')}</div>
                    <div>المندوب: {record.delegate?.name || 'بدون مندوب'}</div>
                    {record.customer?.name && <div>العميل: {record.customer.name}</div>}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>الصنف</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>المجموع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line:any, idx:number) => (
                            <tr key={idx}>
                                <td>{line.item_name || line.name}</td>
                                <td style={{textAlign:'center'}}>{line.quantity}</td>
                                <td>{Number(line.unit_price || line.price).toFixed(2)}</td>
                                <td>{(Number(line.quantity) * Number(line.unit_price || line.price)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '10px' }}>
                    <span>الإجمالي (شامل الضريبة):</span>
                    <span>{Number(record.total_amount || 0).toFixed(2)} ر.س</span>
                </div>
                
                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                    {qrData && <QRCodeSVG value={qrData} size={130} />}
                </div>

                <div style={{ fontSize: '11px', marginTop: '10px' }}>
                    شكراً لتعاملكم معنا<br/>
                    تم الإصدار عبر نظام أكوا
                </div>
            </div>
        </div>
    );
}
