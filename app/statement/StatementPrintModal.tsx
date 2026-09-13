"use client";
import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { THEME } from '@/lib/theme';

interface StatementPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    partnerName: string;
    dateFrom: string;
    dateTo: string;
    openingBalance: number;
    currentBalance: number;
    totalDebit: number;
    totalCredit: number;
    attendanceCount?: number;
    totalLaborAmount?: number;
    totalViolations?: number;
    totalPayments?: number;
    statementLines: any[];
}

export default function StatementPrintModal({
    isOpen, onClose, partnerName, dateFrom, dateTo,
    openingBalance, currentBalance, totalDebit, totalCredit, 
    attendanceCount = 0, totalLaborAmount = 0, totalViolations = 0, totalPayments = 0,
    statementLines = []
}: StatementPrintModalProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

    // 🛡️ تفعيل المودال بشكل آمن لمنع أخطاء الـ SSR في Next.js
    useEffect(() => {
        setMounted(true);
    }, []);

    // 🛡️ منع تمرير الصفحة الخلفية عند فتح المودال
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handlePrint = () => {
        window.print();
    };

    const safeLines = Array.isArray(statementLines) ? [...statementLines] : [];
    const printLines = safeLines.reverse();

    // 🚀 تصميم المودال بالكامل
    const modalContent = (
        <div className="print-modal-overlay">
            <div className="print-modal-content">
                
                <div className="no-print controls-bar">
                    <button type="button" onClick={handlePrint} className="btn-print">🖨️ طباعة المستند</button>
                    <button type="button" onClick={() => setPrintFormat(f => f === 'a4' ? 'thermal' : 'a4')} className="btn-print" style={{ background: '#f59e0b', color: 'white' }}>
                        تغيير للطباعة {printFormat === 'a4' ? 'الحرارية 🧾' : 'A4 📄'}
                    </button>
                    <button type="button" onClick={onClose} className="btn-close">إغلاق ✕</button>
                </div>

                {printFormat === 'a4' ? (
                <div className="a4-paper" ref={printRef} id="printable-area">
                    
                    <div className="print-header">
                        <div className="company-info">
                            <h1 style={{ color: '#122946' }}>صيدلية تاج المودة البيطرية</h1>
                            <p>إدارة الحسابات العامة - تقرير أداء مالي</p>
                        </div>
                        <div className="report-title">
                            <h2>كشف حساب تفصيلي</h2>
                            <span className="date-issued">تاريخ الإصدار: {new Date().toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>

                    <div className="header-divider"></div>

                    <div className="partner-info-box">
                        <div className="info-row">
                            <strong> الموظف / الجهة:</strong>
                            <span style={{ fontSize: '18px', color: '#122946', fontWeight: 900 }}>{partnerName || '---'}</span>
                        </div>
                        <div className="info-row">
                            <strong>الفترة المحددة:</strong>
                            <span>
                                {dateFrom ? `من ${formatDate(dateFrom)} ` : 'من بداية التعامل '}
                                {dateTo ? `إلى ${formatDate(dateTo)}` : 'حتى تاريخه'}
                            </span>
                        </div>
                    </div>

                    {/* 🚀 1. ملخص الحركات (التشغيلي) */}
                    <div className="summary-print-grid operational-grid">
                        <div className="summary-box">
                            <small>أيام الحضور (الكمية)</small>
                            <b style={{ color: '#122946' }}>{attendanceCount} يوم</b>
                        </div>
                        <div className="summary-box">
                            <small>إجمالي يوميات العمالة</small>
                            <b style={{ color: '#122946' }}>{formatCurrency(totalLaborAmount)}</b>
                        </div>
                        <div className="summary-box">
                            <small>إجمالي الغرامات (عليه)</small>
                            <b style={{ color: THEME.danger }}>{formatCurrency(totalViolations)}</b>
                        </div>
                        <div className="summary-box">
                            <small>الدفعات المنصرفة</small>
                            <b style={{ color: THEME.primary }}>{formatCurrency(totalPayments)}</b>
                        </div>
                    </div>

                    {/* 🚀 2. ملخص الأرصدة (المالي الشامل) */}
                    <div className="summary-print-grid financial-grid">
                        <div className="summary-box">
                            <small>رصيد افتتاحي</small>
                            <b style={{ color: openingBalance >= 0 ? THEME.success : THEME.danger }}>
                                {formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? '(له)' : '(عليه)'}
                            </b>
                        </div>
                        <div className="summary-box">
                            <small>إجمالي الدائن (له)</small>
                            <b style={{ color: THEME.success }}>{formatCurrency(totalCredit)}</b>
                        </div>
                        <div className="summary-box">
                            <small>إجمالي المدين (عليه)</small>
                            <b style={{ color: THEME.danger }}>{formatCurrency(totalDebit)}</b>
                        </div>
                        <div className="summary-box final-balance">
                            <small>الرصيد الصافي (النهائي)</small>
                            <b style={{ color: currentBalance >= 0 ? THEME.success : THEME.danger }}>
                                {formatCurrency(Math.abs(currentBalance))} {currentBalance >= 0 ? '(له)' : '(عليه)'}
                            </b>
                        </div>
                    </div>

                    <table className="print-table">
                        <thead>
                            <tr>
                                <th style={{ width: '12%' }}>التاريخ</th>
                                <th style={{ width: '15%' }}>نوع الحركة</th>
                                <th style={{ width: '35%' }}>البيان / الوصف</th>
                                <th style={{ width: '12%' }}>مدين (عليه)</th>
                                <th style={{ width: '12%' }}>دائن (له)</th>
                                <th style={{ width: '14%' }}>الرصيد التراكمي</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="opening-row">
                                <td>{dateFrom ? formatDate(dateFrom) : '---'}</td>
                                <td>رصيد سابق</td>
                                <td><strong>رصيد افتتاحي للمبالغ السابقة</strong></td>
                                <td>{openingBalance < 0 ? formatCurrency(Math.abs(openingBalance)) : '-'}</td>
                                <td>{openingBalance > 0 ? formatCurrency(openingBalance) : '-'}</td>
                                <td dir="ltr" className="balance-cell" style={{ color: openingBalance >= 0 ? THEME.success : THEME.danger }}>
                                    {formatCurrency(Math.abs(openingBalance))}
                                    <span className="balance-dir">{openingBalance >= 0 ? '(له)' : '(عليه)'}</span>
                                </td>
                            </tr>

                            {printLines.map((line: any, idx: number) => (
                                <tr key={line.id || idx}>
                                    <td>{formatDate(line.date)}</td>
                                    <td>{line.v_type}</td>
                                    <td className="desc-cell">{line.description}</td>
                                    <td style={{ color: line.debit > 0 ? THEME.danger : '#000' }}>
                                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                    </td>
                                    <td style={{ color: line.credit > 0 ? THEME.success : '#000' }}>
                                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                    </td>
                                    <td dir="ltr" className="balance-cell" style={{ color: line.balance >= 0 ? THEME.success : THEME.danger }}>
                                        {formatCurrency(Math.abs(line.balance))}
                                        <span className="balance-dir">{line.balance >= 0 ? '(له)' : '(عليه)'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* 🚀 التواقيع تم إجبارها لتكون في نهاية الصفحة تماماً */}
                    <div className="print-signatures">
                        <div className="sig-box"><p>المحاسب</p><div className="sig-line"></div></div>
                        <div className="sig-box"><p>المراجعة</p><div className="sig-line"></div></div>
                        <div className="sig-box"><p>المدير المالي</p><div className="sig-line"></div></div>
                        <div className="sig-box"><p>توقيع المورد / الشريك</p><div className="sig-line"></div></div>
                    </div>
                </div>
                ) : (
                <div className="thermal-preview-box">
                    <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '5px' }}>صيدلية تاج المودة البيطرية</div>
                    <div>كشف حساب | Account Statement</div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                    
                    <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                        <div>الجهة: {partnerName || '---'}</div>
                        <div>الفترة: {dateFrom ? formatDate(dateFrom) : 'البداية'} - {dateTo ? formatDate(dateTo) : 'تاريخه'}</div>
                        <div>تاريخ الإصدار: {new Date().toLocaleDateString('ar-SA')}</div>
                    </div>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                        <div>رصيد افتتاحي: {formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? '(له)' : '(عليه)'}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>البيان</th>
                                <th>له/عليه</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printLines.map((line: any, idx: number) => {
                                const isCredit = line.credit > 0;
                                const amt = isCredit ? line.credit : line.debit;
                                return (
                                    <tr key={idx}>
                                        <td>{formatDate(line.date)}</td>
                                        <td style={{ textAlign: 'right' }}>{line.description}</td>
                                        <td>{amt.toFixed(2)} {isCredit ? 'له' : 'عليه'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '10px', fontWeight: 'bold' }}>
                        <span>الرصيد النهائي:</span>
                        <span>{formatCurrency(Math.abs(currentBalance))} {currentBalance >= 0 ? '(له)' : '(عليه)'}</span>
                    </div>

                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                    <div style={{ fontSize: '11px', marginTop: '10px', textAlign: 'center' }}>
                        تم الإصدار عبر نظام تاج المودة
                    </div>
                </div>
                )}
            </div>

            <style>{`
                .print-modal-overlay { position: fixed; inset: 0; background: rgba(44, 34, 27, 0.85); backdrop-filter: blur(8px); z-index: 9999999; display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; padding: 40px 20px; direction: rtl; }
                .print-modal-content { width: 100%; max-width: 900px; animation: fadeIn 0.3s ease-out; }
                
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                .controls-bar { display: flex; justify-content: space-between; margin-bottom: 20px; background: white; border: 1px solid rgba(40, 145, 200, 0.3); padding: 15px 25px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); position: sticky; top: 10px; z-index: 10; }
                .btn-print { background: linear-gradient(135deg, #2891C8 0%, #a48141 100%); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(40, 145, 200, 0.3); }
                .btn-print:hover { transform: translateY(-2px); filter: brightness(1.1); }
                .btn-close { background: #fdfaf6; color: #4a3b32; border: 1px solid #2891C8; padding: 12px 24px; border-radius: 12px; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.2s; }
                .btn-close:hover { background: #eaddcf; }

                /* 🚀 Thermal Styles */
                .thermal-preview-box {
                    width: 80mm; background: white; padding: 10px; margin: 0 auto; color: black;
                    font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: bold;
                    text-align: center; direction: rtl; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    min-height: auto;
                }
                .thermal-preview-box table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .thermal-preview-box th, .thermal-preview-box td { border-bottom: 1px dashed #000; padding: 4px 0; font-size: 12px; }

                /* 🚀 جعل الورقة تتمدد كـ Flex Column لدفع التواقيع للأسفل */
                .a4-paper { 
                    background: white; padding: 40px 50px; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); 
                    min-height: 297mm; color: #122946; margin-bottom: 40px; 
                    display: flex; flex-direction: column; 
                }
                
                .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                .company-info h1 { margin: 0 0 5px 0; font-size: 22px; font-weight: 900; color: #122946; }
                .company-info p { margin: 0; color: #8a7a6b; font-size: 14px; font-weight: 700; }
                .report-title h2 { margin: 0 0 5px 0; font-size: 26px; color: ${THEME.goldAccent}; font-weight: 900; border-bottom: 3px solid ${THEME.goldAccent}; padding-bottom: 5px; }
                .date-issued { display: block; font-size: 12px; color: #8a7a6b; font-weight: 700; }

                .header-divider { height: 4px; background: linear-gradient(90deg, #122946, ${THEME.goldAccent}, #122946); margin-bottom: 25px; border-radius: 4px; }

                .partner-info-box { background: #fdfaf6; border: 1px solid #eaddcf; padding: 20px; border-radius: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; }
                .info-row { display: flex; flex-direction: column; gap: 5px; }
                .info-row strong { color: #8a7a6b; font-size: 13px; }
                .info-row span { font-weight: 800; font-size: 15px; color: #122946; }

                /* 🚀 تعديلات الـ Grid لتقسيم الملخصات */
                .summary-print-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 15px; }
                .financial-grid { margin-bottom: 30px; }
                .summary-box { background: white; border: 2px solid #eaddcf; padding: 15px; border-radius: 12px; text-align: center; }
                
                /* تمييز الملخص التشغيلي بلون خفيف */
                .operational-grid .summary-box { background: rgba(40, 145, 200, 0.05); border-color: rgba(40, 145, 200, 0.2); }
                
                .summary-box.final-balance { border-color: ${THEME.goldAccent}; background: #fdfaf6; }
                .summary-box small { display: block; color: #8a7a6b; font-weight: 900; font-size: 11px; margin-bottom: 5px; }
                .summary-box b { font-size: 16px; font-weight: 900; }

                .print-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 12px; }
                .print-table th { background: #fdfaf6; color: #122946; font-weight: 900; padding: 14px 10px; border: none; border-bottom: 2px solid ${THEME.goldAccent}; text-align: center; }
                .print-table td { padding: 12px 10px; border: none; text-align: center; font-weight: 700; color: #122946; }
                
                .print-table tbody tr:nth-child(even) td { background-color: rgba(40, 145, 200, 0.06); }
                .print-table .opening-row td { background-color: transparent; font-weight: 900; color: #122946; border-bottom: 1px dashed rgba(0,0,0,0.1); }
                
                .print-table .desc-cell { text-align: right; font-weight: 800; }
                .balance-cell { font-weight: 900 !important; }
                .balance-dir { display: inline-block; margin-right: 4px; font-size: 11px; color: #8a7a6b; }

                /* 🚀 دفع التواقيع لنهاية الحاوية (أسفل الصفحة) */
                .print-signatures { 
                    display: flex; justify-content: space-between; 
                    margin-top: auto; 
                    padding-top: 50px; 
                    page-break-inside: avoid; 
                }
                .sig-box { text-align: center; width: 22%; }
                .sig-box p { font-size: 14px; font-weight: 900; color: #8a7a6b; margin-bottom: 60px; }
                .sig-line { border-bottom: 1px dashed #2891C8; width: 100%; }
            `}</style>
            
            {printFormat === 'a4' && (
                <style>{`
                    @media print {
                        html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
                        .print-modal-overlay { 
                            position: absolute !important; left: 0 !important; top: 0 !important; right: 0 !important; 
                            background: white !important; padding: 0 !important; margin: 0 !important; 
                        }
                        #printable-area, #printable-area * { visibility: visible !important; }
                        #printable-area { 
                            position: relative !important; width: 100% !important; margin: 0 !important; 
                            padding: 0 !important; box-shadow: none !important; display: flex !important;
                            flex-direction: column !important; min-height: 100vh !important;
                        }
                        .no-print { display: none !important; }
                        .print-table th { border: none !important; border-bottom: 2px solid #000 !important; border-top: 1px solid #000 !important; }
                        .print-table td { border: none !important; }
                        .print-table tbody tr:nth-child(even) td { background-color: #f7f3ed !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        tr { page-break-inside: avoid; }
                        @page { size: A4 portrait; margin: 10mm; }
                    }
                `}</style>
            )}

            {printFormat === 'thermal' && (
                <style>{`
                    @media print {
                        @page { size: 80mm auto; margin: 0 !important; }
                        html, body, .print-modal-overlay { width: 80mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
                        .thermal-preview-box {
                            position: absolute !important; top: 0 !important; left: 0 !important; 
                            width: 80mm !important; margin: 0 !important; padding: 5px !important; 
                            border: none !important; box-shadow: none !important;
                        }
                        .no-print { display: none !important; }
                    }
                `}</style>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
