"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import { formatCurrency, tafqeet } from '@/lib/helpers'; 
import { QRCodeSVG } from 'qrcode.react'; 
import { supabase } from '@/lib/supabase';

export default function PaymentPrintModal({ isOpen, onClose, record }: any) {
    const [mounted, setMounted] = useState(false); 
    const [creatorInfo, setCreatorInfo] = useState<{username: string, fullName: string} | null>(null); 
    const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const fetchCreatorInfo = async () => {
            if (!isOpen) return;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const targetUserId = record?.created_by || session?.user?.id;
                let fetchedFullName = '';

                if (targetUserId) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
                    if (profile) fetchedFullName = profile.full_name || profile.name || profile.nickname || '';
                }

                if (!fetchedFullName && session?.user) {
                    fetchedFullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
                }

                setCreatorInfo({ 
                    username: '',
                    fullName: fetchedFullName || 'المحاسب المعتمد' 
                });
            } catch (err) { console.error("Error", err); }
        };
        fetchCreatorInfo();
    }, [isOpen, record?.created_by]);

    if (!isOpen || !mounted || !record) return null;

    const handlePrint = () => {
        document.title = record?.voucher_number ? `سند_صرف_${record.voucher_number}` : 'سند_صرف';
        window.print();
    };

    const finalFullName = creatorInfo?.fullName || 'المحاسب المعتمد';
    const creationDateObj = record?.created_at ? new Date(record.created_at) : (record?.date ? new Date(record.date) : new Date());
    const creationTime = creationDateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const creationDate = creationDateObj.toLocaleDateString('ar-EG');
    
    const signatureData = `تم الاعتماد إلكترونياً\nتاريخ الإصدار: ${creationDate}\nوقت الإصدار: ${creationTime}\nبواسطة: ${finalFullName}`;
    const amountInWords = tafqeet(Number(record.amount || 0));

    const modalContent = (
        <div className="print-modal-overlay">
            <style>{`
                body { overflow: hidden !important; }
                .print-modal-overlay { position: fixed !important; inset: 0 !important; background: rgba(18, 41, 70, 0.90) !important; backdrop-filter: blur(12px) !important; z-index: 999999999 !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: flex-start !important; padding: 30px 20px !important; overflow-y: auto !important; font-family: 'Arial', sans-serif; }
                .print-actions-bar { display: flex !important; gap: 15px !important; margin-bottom: 25px !important; background: white !important; padding: 15px 30px !important; border-radius: 50px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important; position: sticky !important; top: 20px !important; z-index: 1000000000 !important; }
                .action-btn { padding: 12px 25px; border-radius: 10px; border: none; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.2s; }
                .action-btn.print { background: linear-gradient(135deg, #2891C8, #7FD4E3); color: #122946; }
                .action-btn.close { background: #fee2e2; color: #dc2626; }
                .action-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
                .a4-preview-box { width: 210mm !important; min-height: 297mm !important; background: white !important; color: #000; padding: 15mm !important; margin: 0 auto 40px auto !important; box-shadow: 0 20px 50px rgba(0,0,0,0.4); direction: rtl; border-radius: 24px !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important; }
                .inv-header { display: grid; grid-template-columns: 180px 1fr 180px; align-items: center; border-bottom: 3px solid #2891C8; padding-bottom: 20px; margin-bottom: 25px; width: 100%; gap: 15px; }
                .header-center { text-align: center; }
                .header-logo { display: flex; justify-content: flex-end; } 
                .header-logo img { max-height: 90px; width: auto; max-width: 100%; object-fit: contain; } 
                .inv-title-box { text-align: center; margin-bottom: 25px; }
                .inv-title { font-size: 22px; font-weight: 900; border: 2.5px solid #2891C8; padding: 8px 35px; display: inline-block; background: linear-gradient(135deg, rgba(40,145,200,0.06), rgba(127,212,227,0.06)); color: #122946; text-transform: uppercase; letter-spacing: 1px; border-radius: 12px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-box { border: 1.5px solid rgba(40, 145, 200, 0.25); border-radius: 16px !important; padding: 18px 15px 12px 15px; display: flex; flex-direction: column; justify-content: center; position: relative; background: #fff; min-height: 90px; }
                .box-label { position: absolute; top: -10px; right: 20px; background: white; padding: 0 10px; font-size: 12px; font-weight: 900; color: #2891C8; border-radius: 20px; }
                .inner-table { width: 100%; border-collapse: collapse; }
                .inner-table td { padding: 4px 0; font-size: 14px; vertical-align: middle; font-weight: 900; color: #1e293b;}
                .label-cell { text-align: left; font-weight: 900; color: #64748b; width: 100px; padding-left: 10px !important; }
                .value-highlight { color: #122946; font-size: 20px !important; font-weight: 900; }
                .amount-box { background: linear-gradient(135deg, rgba(40,145,200,0.06), rgba(127,212,227,0.08)); padding: 20px; border-radius: 16px; border: 1.5px solid rgba(40,145,200,0.3); margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
                .inv-footer-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; flex-grow: 1; gap: 40px; }
                .inv-amount-words { flex: 1; display: flex; flex-direction: column; }
                .inv-amount-words .words-box { background: rgba(245,249,252,0.8); border: 1px dashed rgba(40, 145, 200, 0.3); padding: 15px; border-radius: 16px; font-weight: 900; font-size: 15px; color: #122946; line-height: 1.6; }
                .signature-area { margin-top: 30px; text-align: center; align-self: flex-start; }
                .signature-title { font-weight: 900; font-size: 13px; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid rgba(40, 145, 200, 0.2); padding-bottom: 8px; }
                .inv-footer-contact { margin-top: auto !important; border-top: 2px solid rgba(40, 145, 200, 0.25); padding-top: 15px; text-align: center; font-size: 13px; color: #64748b; font-weight: 700; }
                /* 🚀 Thermal Styles */
                .thermal-preview-box {
                    width: 80mm;
                    background: white;
                    padding: 10px;
                    margin: 0 auto;
                    color: black;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 13px;
                    font-weight: bold;
                    text-align: center;
                    direction: rtl;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .thermal-preview-box table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .thermal-preview-box th, .thermal-preview-box td { border-bottom: 1px dashed #000; padding: 4px 0; font-size: 12px; }
                
                @media print {
                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important; 
                        overflow: visible !important;
                    }
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
                <button onClick={() => window.print()} className="action-btn print">🖨️ طباعة</button>
                <button onClick={() => setPrintFormat(f => f === 'a4' ? 'thermal' : 'a4')} className="action-btn print" style={{ background: '#f59e0b', color: 'white' }}>
                    تغيير للطباعة {printFormat === 'a4' ? 'الحرارية 🧾' : 'A4 📄'}
                </button>
                <button onClick={onClose} className="action-btn close">❌ إغلاق</button>
            </div>

            {printFormat === 'a4' ? (
                <div className="a4-preview-box">
                    <div className="inv-header">
                        <div style={{width: '180px'}}></div>
                        <div className="header-center">
                        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#122946', margin: '0 0 4px 0' }}>محطات النور للوقود</h1>
                        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#2891C8', margin: '0 0 8px 0' }}>Al-Noor Gas Stations Gas Station</h2>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>الرقم الضريبي: 312487477800003</div>
                    </div>
                    <div className="header-logo"><img src="/logo.png" alt="شعار محطات النور للوقود" /></div>
                </div>

                <div className="inv-title-box">
                    <div className="inv-title">💳 سند صرف | PAYMENT VOUCHER</div>
                </div>

                <div className="info-grid">
                    <div className="info-box">
                        <span className="box-label">يُصرف إلى | PAY TO</span>
                        <table className="inner-table">
                            <tbody>
                                <tr><td className="value-highlight">{record.payee_name || '---'}</td></tr>
                                <tr><td style={{ color: '#64748b', fontSize: '12px' }}>بموجب المرجعية: {record.description || '---'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="info-box">
                        <span className="box-label">بيانات السند | VOUCHER INFO</span>
                        <table className="inner-table">
                            <tbody>
                                <tr><td style={{textAlign: 'left'}}>{record.voucher_number || record.id?.slice(0,8)}</td><td className="label-cell">:رقم السند</td></tr>
                                <tr><td style={{textAlign: 'left'}}>{creationDate}</td><td className="label-cell">:التاريخ</td></tr>
                                <tr><td style={{textAlign: 'left'}}>{record.payment_method || '---'}</td><td className="label-cell">:طريقة الدفع</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="amount-box">
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#122946' }}>💰 مبلغ وقدره:</div>
                    <div style={{ fontSize: '30px', fontWeight: 900, color: '#2891C8' }}>{formatCurrency(record.amount)}</div>
                </div>

                <div className="inv-footer-flex">
                    <div className="inv-amount-words">
                        <div style={{ fontSize: '13px', fontWeight: 900, marginBottom: '6px', color: '#64748b' }}>فقط لا غير:</div>
                        <div className="words-box">{amountInWords}</div>
                        
                        <div className="signature-area">
                            <div className="signature-title">معتمد إلكترونياً / E-Signature</div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <QRCodeSVG value={signatureData} size={75} level="M" />
                                <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '8px', color: '#122946' }}>{finalFullName}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="inv-footer-contact">
                    المملكة العربية السعودية &nbsp;|&nbsp; info@alnoor-gas.com &nbsp;|&nbsp; محطات النور للوقود © {new Date().getFullYear()}
                </div>
            </div>
            ) : (
                <div className="thermal-preview-box">
                    <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '5px' }}>محطات النور للوقود</div>
                    <div>سند صرف | Payment Voucher</div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                    
                    <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                        <div>رقم السند: {record.voucher_number || record.id?.slice(0,8)}</div>
                        <div>التاريخ: {new Date(record.created_at || Date.now()).toLocaleString('ar-SA')}</div>
                        <div>يُصرف إلى: {record.payee_name || '---'}</div>
                    </div>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                        <div>البيان: {record.description || '---'}</div>
                        <div>طريقة الدفع: {record.payment_method || '---'}</div>
                    </div>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '10px', fontWeight: 'bold' }}>
                        <span>مبلغ وقدره:</span>
                        <span>{Number(record.amount || 0).toFixed(2)} ر.س</span>
                    </div>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ fontSize: '11px', marginTop: '10px', textAlign: 'center' }}>
                        المعتمد: {creatorInfo?.fullName || '---'}<br/>
                        تم الإصدار عبر نظام محطات النور
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
