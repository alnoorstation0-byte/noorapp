"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { QRCodeSVG } from 'qrcode.react';
import { generateZatcaQR } from '@/lib/zatca_qr';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

interface BatchInvoicesPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSelectedIds?: string[];
}

// الفترات الضريبية المعتمدة
const TAX_PERIODS = [
    { id: 'Q3-2023', label: 'الربع الثالث 2023 (الفترة الضريبية الحالية)', from: '2023-07-01', to: '2023-09-30' },
    { id: 'Q4-2023', label: 'الربع الرابع 2023 (Q4 2023)', from: '2023-10-01', to: '2023-12-31' },
    { id: 'Q1-2024', label: 'الربع الأول 2024 (Q1 2024)', from: '2024-01-01', to: '2024-03-31' },
    { id: 'Q2-2024', label: 'الربع الثاني 2024 (Q2 2024)', from: '2024-04-01', to: '2024-06-30' },
    { id: 'Q3-2024', label: 'الربع الثالث 2024 (Q3 2024)', from: '2024-07-01', to: '2024-09-30' },
    { id: 'custom', label: 'فترة مخصصة (تحديد يدوي من وإلى)', from: '', to: '' },
];

export default function BatchInvoicesPrintModal({
    isOpen,
    onClose,
    initialSelectedIds = []
}: BatchInvoicesPrintModalProps) {
    const [mounted, setMounted] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('Q3-2023');
    
    // 🛡️ تواريخ الفترة - أدنى تاريخ مسموح به هو 2023-07-01
    const [dateFrom, setDateFrom] = useState<string>('2023-07-01');
    const [dateTo, setDateTo] = useState<string>('2023-09-30');
    
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'mada' | 'cash' | 'credit'>('all');
    const [documentLayout, setDocumentLayout] = useState<'statement' | 'book'>('statement');
    
    const [isLoading, setIsLoading] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [periodSummary, setPeriodSummary] = useState({
        totalAmount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        cashTotal: 0,
        madaTotal: 0,
        creditTotal: 0
    });

    // حد المعاينة والطباعة لحماية أداء المتصفح من التجمد
    const [printBatchSize, setPrintBatchSize] = useState<number>(200);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 🗓️ عند تغيير الفترة الضريبية المختارة
    const handlePeriodChange = (periodId: string) => {
        setSelectedPeriod(periodId);
        const p = TAX_PERIODS.find(t => t.id === periodId);
        if (p && p.id !== 'custom') {
            setDateFrom(p.from);
            setDateTo(p.to);
        }
    };

    // 🔒 ضمان عدم اختيار أي تاريخ قبل 2023-07-01
    const handleDateFromChange = (newVal: string) => {
        if (newVal && newVal < '2023-07-01') {
            toast('⚠️ فواتير المبيعات تبدأ نظامياً من تاريخ 2023-07-01', { icon: 'ℹ️' });
            setDateFrom('2023-07-01');
        } else {
            setDateFrom(newVal);
            setSelectedPeriod('custom');
        }
    };

    const handleDateToChange = (newVal: string) => {
        setDateTo(newVal);
        setSelectedPeriod('custom');
    };

    // 🔄 جلب فواتير الفترة المختارة
    const fetchPeriodInvoices = useCallback(async () => {
        if (!isOpen) return;
        setIsLoading(true);
        try {
            const effectiveFrom = dateFrom >= '2023-07-01' ? dateFrom : '2023-07-01';
            let query = supabase
                .from('invoices')
                .select('id, invoice_number, date, total_amount, tax_amount, taxable_amount, payment_method, client_name, lines_data, status, created_at')
                .gte('date', effectiveFrom);
            
            if (dateTo) {
                query = query.lte('date', dateTo);
            }

            if (paymentMethodFilter === 'mada') {
                query = query.ilike('payment_method', '%مدى%');
            } else if (paymentMethodFilter === 'cash') {
                query = query.ilike('payment_method', '%كاش%');
            } else if (paymentMethodFilter === 'credit') {
                query = query.or('payment_method.ilike.%آجل%,payment_method.ilike.%تحويل%');
            }

            // إذا كان هناك فواتير محددة من الجدول مسبقاً
            if (initialSelectedIds && initialSelectedIds.length > 0) {
                query = query.in('id', initialSelectedIds);
            }

            // ترتيب زمني تصاعدي للفاحص
            query = query.order('date', { ascending: true }).order('invoice_number', { ascending: true });

            // أولاً: جلب الإحصائيات الكاملة
            const { data, error, count } = await query.limit(printBatchSize);
            if (error) throw error;

            setInvoices(data || []);
            setTotalCount(count || data?.length || 0);

            // حساب المجاميع
            let total = 0;
            let taxable = 0;
            let tax = 0;
            let cash = 0;
            let mada = 0;
            let credit = 0;

            (data || []).forEach(inv => {
                const tot = Number(inv.total_amount || 0);
                const tx = Number(inv.tax_amount || 0);
                const txb = Number(inv.taxable_amount || (tot - tx));
                total += tot;
                taxable += txb;
                tax += tx;

                const pm = String(inv.payment_method || '').toLowerCase();
                if (pm.includes('كاش') || pm.includes('نقد')) cash += tot;
                else if (pm.includes('مدى') || pm.includes('شبكة')) mada += tot;
                else credit += tot;
            });

            setPeriodSummary({
                totalAmount: total,
                taxableAmount: taxable,
                taxAmount: tax,
                cashTotal: cash,
                madaTotal: mada,
                creditTotal: credit
            });

        } catch (err: any) {
            console.error('خطأ في جلب فواتير الفترة:', err);
            toast.error('تعذر جلب فواتير الفترة: ' + (err.message || 'خطأ غير معروف'));
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, dateFrom, dateTo, paymentMethodFilter, initialSelectedIds, printBatchSize]);

    useEffect(() => {
        if (isOpen) {
            fetchPeriodInvoices();
        }
    }, [isOpen, fetchPeriodInvoices]);

    // 🖨️ أمر الطباعة الموحد
    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = `دفتر_فواتير_المبيعات_الضريبية_${selectedPeriod}_${dateFrom}_الى_${dateTo}`;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    };

    // 📊 تصدير Excel شامل للفترة
    const handleExportExcel = () => {
        if (!invoices || invoices.length === 0) {
            toast.error('لا توجد فواتير لتصديرها.');
            return;
        }

        const toastId = toast.loading('جاري تصدير ملف Excel الشامل للفترة... ⏳');
        try {
            const excelRows = invoices.map((inv, idx) => {
                let firstLine = '';
                let qty = 0;
                let unitPrice = 0;
                if (Array.isArray(inv.lines_data) && inv.lines_data.length > 0) {
                    firstLine = inv.lines_data[0].item_name || inv.lines_data[0].name || 'وقود';
                    qty = Number(inv.lines_data[0].quantity || inv.lines_data[0].qty || 0);
                    unitPrice = Number(inv.lines_data[0].price || inv.lines_data[0].unit_price || 0);
                }

                return {
                    'م': idx + 1,
                    'رقم الفاتورة': inv.invoice_number || '',
                    'تاريخ التوريد': inv.date || '',
                    'اسم العميل': inv.client_name || 'عميل نقدي',
                    'طريقة الدفع': inv.payment_method || 'نقاط بيع (مدى)',
                    'الصنف': firstLine || 'بنزين 91 ممتاز',
                    'الكمية (لتر)': qty > 0 ? qty : Number((Number(inv.total_amount || 0) / 2.18).toFixed(2)),
                    'سعر اللتر شامل الضريبة': unitPrice > 0 ? unitPrice : 2.18,
                    'المبلغ غير شامل الضريبة (ر.س)': Number((Number(inv.taxable_amount || (Number(inv.total_amount || 0) - Number(inv.tax_amount || 0)))).toFixed(2)),
                    'ضريبة القيمة المضافة 15% (ر.س)': Number((Number(inv.tax_amount || 0)).toFixed(2)),
                    'المبلغ شامل الضريبة (ر.س)': Number((Number(inv.total_amount || 0)).toFixed(2)),
                    'الحالة': inv.status || 'معتمد'
                };
            });

            const ws = XLSX.utils.json_to_sheet(excelRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'فواتير المبيعات الضريبية');
            XLSX.writeFile(wb, `دفتر_فواتير_المبيعات_الضريبية_${dateFrom}_إلى_${dateTo}.xlsx`);
            toast.success('✅ تم تصدير ملف Excel الموحد بنجاح!', { id: toastId });
        } catch (e: any) {
            console.error('Excel Export Error:', e);
            toast.error('حدث خطأ أثناء تصدير الإكسيل: ' + e.message, { id: toastId });
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="batch-print-modal-overlay">
            <style>{`
                .batch-print-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(44, 26, 18, 0.7);
                    backdrop-filter: blur(12px);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    direction: rtl;
                }
                .batch-print-modal-window {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(250, 246, 240, 0.95) 100%);
                    border: 1px solid rgba(194, 155, 98, 0.4);
                    border-radius: 20px;
                    box-shadow: 0 25px 60px rgba(44, 26, 18, 0.35);
                    width: 96vw;
                    max-width: 1400px;
                    height: 92vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    font-family: inherit;
                }
                .modal-header-ribbon {
                    padding: 16px 24px;
                    background: linear-gradient(135deg, #2C1A12 0%, #4A2B1D 100%);
                    color: #FFFFFF;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 2px solid #C29B62;
                }
                .header-title-box h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #FDFBF7;
                }
                .header-title-box p {
                    margin: 4px 0 0 0;
                    font-size: 12px;
                    color: rgba(253, 251, 247, 0.75);
                }
                .btn-close-modal {
                    background: rgba(255, 255, 255, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: #FFFFFF;
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-close-modal:hover {
                    background: rgba(239, 68, 68, 0.8);
                    border-color: #ef4444;
                    transform: scale(1.05);
                }

                /* 🧭 شريط الفلاتر والتحكم */
                .modal-control-bar {
                    padding: 14px 24px;
                    background: rgba(255, 253, 250, 0.85);
                    border-bottom: 1px solid rgba(194, 155, 98, 0.25);
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 16px;
                    justify-content: space-between;
                }
                .filters-cluster {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 12px;
                }
                .filter-field-box {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .filter-field-box label {
                    font-size: 11px;
                    font-weight: 800;
                    color: #2C1A12;
                }
                .filter-field-box select,
                .filter-field-box input {
                    height: 38px;
                    padding: 0 12px;
                    border-radius: 10px;
                    border: 1px solid rgba(194, 155, 98, 0.4);
                    background: #FFFFFF;
                    color: #2C1A12;
                    font-size: 12px;
                    font-weight: 700;
                    outline: none;
                    transition: border 0.2s;
                }
                .filter-field-box select:focus,
                .filter-field-box input:focus {
                    border-color: #A8573C;
                    box-shadow: 0 0 0 3px rgba(168, 87, 60, 0.15);
                }

                /* 📊 بطاقات الإحصائيات المباشرة للفترة */
                .period-stats-strip {
                    display: flex;
                    gap: 12px;
                    padding: 10px 24px;
                    background: rgba(194, 155, 98, 0.08);
                    border-bottom: 1px solid rgba(194, 155, 98, 0.2);
                    overflow-x: auto;
                }
                .stat-pill {
                    background: #FFFFFF;
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    border-radius: 12px;
                    padding: 8px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 140px;
                    box-shadow: 0 2px 6px rgba(44, 26, 18, 0.04);
                }
                .stat-pill .lbl {
                    font-size: 10px;
                    color: rgba(44, 26, 18, 0.6);
                    font-weight: 800;
                }
                .stat-pill .val {
                    font-size: 14px;
                    font-weight: 900;
                    color: #2C1A12;
                }
                .stat-pill .val.highlight {
                    color: #A8573C;
                }
                .stat-pill .val.green {
                    color: #4E734F;
                }

                /* 📄 مساحة المستند القابل للطباعة والمعاينة */
                .modal-document-scroll-canvas {
                    flex: 1;
                    overflow-y: auto;
                    background: #525659;
                    padding: 24px;
                    display: flex;
                    justify-content: center;
                }
                .print-paper-sheet {
                    background: #FFFFFF;
                    width: 100%;
                    max-width: 1050px;
                    min-height: 1000px;
                    padding: 35px 40px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
                    border-radius: 4px;
                    color: #111827;
                    font-size: 12px;
                }

                /* 🖨️ ترويسة التقرير الضريبي المعتمد */
                .zatca-sheet-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 2px solid #1e293b;
                    padding-bottom: 18px;
                    margin-bottom: 20px;
                }
                .comp-name-box h1 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 900;
                    color: #0f172a;
                }
                .comp-name-box p {
                    margin: 3px 0 0 0;
                    font-size: 12px;
                    color: #475569;
                    font-weight: 700;
                }
                .report-title-badge {
                    text-align: center;
                }
                .report-title-badge h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 900;
                    color: #1e293b;
                    background: #f1f5f9;
                    padding: 6px 18px;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                }
                .report-title-badge span {
                    display: block;
                    margin-top: 5px;
                    font-size: 11px;
                    font-weight: 800;
                    color: #64748b;
                }

                /* 🧾 جدول الفواتير الضريبي */
                .tax-invoices-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                    font-size: 11px;
                }
                .tax-invoices-table th {
                    background: #1e293b;
                    color: #FFFFFF;
                    padding: 8px 6px;
                    font-weight: 800;
                    text-align: center;
                    border: 1px solid #334155;
                }
                .tax-invoices-table td {
                    padding: 6px 8px;
                    border: 1px solid #e2e8f0;
                    text-align: center;
                    font-weight: 600;
                    color: #1e293b;
                }
                .tax-invoices-table tr:nth-child(even) {
                    background: #f8fafc;
                }
                .tax-invoices-table tr.total-row td {
                    background: #f1f5f9;
                    font-weight: 900;
                    font-size: 12px;
                    border-top: 2px solid #0f172a;
                }

                /* 🖨️ نمط دفتر الفواتير المصغرة ZATCA */
                .invoices-grid-cards {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                .single-invoice-card {
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 12px;
                    background: #FFFFFF;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    page-break-inside: avoid;
                }

                /* ⚙️ أزرار الإجراءات السفلية */
                .modal-actions-footer {
                    padding: 14px 24px;
                    background: #FFFFFF;
                    border-top: 1px solid rgba(194, 155, 98, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .btn-action-primary {
                    background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%);
                    color: #FFFFFF;
                    border: none;
                    height: 44px;
                    padding: 0 24px;
                    border-radius: 12px;
                    font-weight: 900;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(168, 87, 60, 0.25);
                    transition: transform 0.2s;
                }
                .btn-action-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 18px rgba(168, 87, 60, 0.35);
                }
                .btn-action-excel {
                    background: #107C41;
                    color: #FFFFFF;
                    border: none;
                    height: 44px;
                    padding: 0 20px;
                    border-radius: 12px;
                    font-weight: 900;
                    font-size: 13px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: transform 0.2s;
                }
                .btn-action-excel:hover {
                    background: #0B5C30;
                    transform: translateY(-2px);
                }

                /* 🖨️ إعدادات الطباعة عند الضغط على Print */
                @media print {
                    body {
                        visibility: hidden !important;
                        background: #FFFFFF !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .batch-print-modal-overlay {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: #FFFFFF !important;
                        backdrop-filter: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        z-index: 999999 !important;
                    }
                    .batch-print-modal-window {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        height: auto !important;
                        border-radius: 0 !important;
                        background: #FFFFFF !important;
                    }
                    .modal-header-ribbon,
                    .modal-control-bar,
                    .period-stats-strip,
                    .modal-actions-footer {
                        display: none !important;
                    }
                    .modal-document-scroll-canvas {
                        background: #FFFFFF !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .print-paper-sheet {
                        visibility: visible !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .page-break {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                }
            `}</style>

            <div className="batch-print-modal-window">
                
                {/* 1. الشريط العلوي الفاخر */}
                <div className="modal-header-ribbon">
                    <div className="header-title-box">
                        <h2>
                            <span>📑</span>
                            <span>دفتر الفواتير الضريبية المجمع (ملف موحد للفترة)</span>
                        </h2>
                        <p>تجميع وطباعة فواتير المبيعات الضريبية المعتمدة في ملف واحد متصل للفاحص الضريبي (ZATCA)</p>
                    </div>
                    <button type="button" className="btn-close-modal" onClick={onClose} title="إغلاق (Esc)">
                        ✕
                    </button>
                </div>

                {/* 2. شريط الفلاتر والتحكم الذكي */}
                <div className="modal-control-bar">
                    <div className="filters-cluster">
                        
                        {/* اختيار الفترة الضريبية */}
                        <div className="filter-field-box">
                            <label>الفترة الضريبية المعيارية:</label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => handlePeriodChange(e.target.value)}
                            >
                                {TAX_PERIODS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* من تاريخ */}
                        <div className="filter-field-box">
                            <label>من تاريخ (بداية الفترة):</label>
                            <input
                                type="date"
                                min="2023-07-01"
                                value={dateFrom}
                                onChange={(e) => handleDateFromChange(e.target.value)}
                            />
                        </div>

                        {/* إلى تاريخ */}
                        <div className="filter-field-box">
                            <label>إلى تاريخ (نهاية الفترة):</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => handleDateToChange(e.target.value)}
                            />
                        </div>

                        {/* طريقة الدفع */}
                        <div className="filter-field-box">
                            <label>طريقة السداد / الدفع:</label>
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                            >
                                <option value="all">الكل (جميع طرق السداد)</option>
                                <option value="mada">نقاط بيع (مدى / شبكة)</option>
                                <option value="cash">نقدي (كاش / صراف)</option>
                                <option value="credit">آجل / تحويل بنكي</option>
                            </select>
                        </div>

                        {/* نمط الإخراج */}
                        <div className="filter-field-box">
                            <label>تنسيق العرض والطباعة:</label>
                            <select
                                value={documentLayout}
                                onChange={(e) => setDocumentLayout(e.target.value as any)}
                            >
                                <option value="statement">📋 بيان المبيعات الضريبي الشامل (كشف الفاحص)</option>
                                <option value="book">🧾 دفتر الفواتير الضريبية (قسائم ZATCA مع QR)</option>
                            </select>
                        </div>

                        {/* حجم دفعة العرض */}
                        <div className="filter-field-box">
                            <label>عرض أول (دفعة):</label>
                            <select
                                value={printBatchSize}
                                onChange={(e) => setPrintBatchSize(Number(e.target.value))}
                            >
                                <option value={100}>100 فاتورة</option>
                                <option value={200}>200 فاتورة</option>
                                <option value={500}>500 فاتورة</option>
                                <option value={1000}>1,000 فاتورة</option>
                                <option value={5000}>5,000 فاتورة</option>
                            </select>
                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={fetchPeriodInvoices}
                        className="btn-action-primary"
                        style={{ height: '38px', padding: '0 16px', fontSize: '12px' }}
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳ جاري الجلب...' : '🔄 تحديث النتائج'}
                    </button>
                </div>

                {/* 3. شريط المؤشرات الحية للفترة */}
                <div className="period-stats-strip">
                    <div className="stat-pill">
                        <span className="lbl">إجمالي عدد الفواتير:</span>
                        <span className="val highlight">{invoices.length.toLocaleString()} فاتورة</span>
                    </div>
                    <div className="stat-pill">
                        <span className="lbl">المبيعات الخاضعة (بدون ضريبة):</span>
                        <span className="val">{formatCurrency(periodSummary.taxableAmount)}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="lbl">ضريبة القيمة المضافة 15%:</span>
                        <span className="val green">{formatCurrency(periodSummary.taxAmount)}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="lbl">الإجمالي شامل الضريبة:</span>
                        <span className="val highlight">{formatCurrency(periodSummary.totalAmount)}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="lbl">مبيعات الشبكة (مدى):</span>
                        <span className="val">{formatCurrency(periodSummary.madaTotal)}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="lbl">مبيعات الكاش (النقد):</span>
                        <span className="val">{formatCurrency(periodSummary.cashTotal)}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="lbl">الفواتير الآجلة / تحويل:</span>
                        <span className="val">{formatCurrency(periodSummary.creditTotal)}</span>
                    </div>
                </div>

                {/* 4. مساحة ورقة الطباعة والمعاينة */}
                <div className="modal-document-scroll-canvas">
                    <div className="print-paper-sheet">
                        
                        {/* ترويسة التقرير الضريبي الرسمي */}
                        <div className="zatca-sheet-header">
                            <div className="comp-name-box">
                                <h1>مؤسسة محطات النور للوقود</h1>
                                <p>سجل تجاري: 5855341295 | ترخيص المحروقات: 43/91</p>
                                <p style={{ color: '#0ea5e9' }}>الرقم الضريبي: 312487477800003</p>
                                <p>المملكة العربية السعودية - منطقة عسير - سبت العلاية</p>
                            </div>

                            <div className="report-title-badge">
                                <h2>
                                    {documentLayout === 'statement' 
                                        ? 'بيان فواتير المبيعات الضريبية المحلية' 
                                        : 'دفتر الفواتير الضريبية المبسطة المجمعة'}
                                </h2>
                                <span>عن الفترة الضريبية من: {dateFrom} إلى: {dateTo}</span>
                                <span style={{ color: '#16a34a', fontWeight: 900 }}>الحالة: معتمد ومطابق لإقرار ضريبة القيمة المضافة (15%)</span>
                            </div>

                            <div style={{ textAlign: 'left' }}>
                                <QRCodeSVG 
                                    value={generateZatcaQR('محطات النور للوقود', '312487477800003', `${dateFrom}T12:00:00Z`, periodSummary.totalAmount.toFixed(2), periodSummary.taxAmount.toFixed(2))}
                                    size={80}
                                    level="M"
                                />
                                <span style={{ display: 'block', fontSize: '9px', color: '#64748b', marginTop: '3px' }}>ختم هيئة الزكاة والضريبة</span>
                            </div>
                        </div>

                        {/* ملخص إقرار الفترة الضريبية */}
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 18px', marginBottom: '20px' }}>
                            <div style={{ fontWeight: 900, fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                                📑 ملخص التوريدات والإقرار الضريبي للفترة المحددة:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '11px' }}>
                                <div><b>إجمالي الفواتير:</b> {invoices.length} فاتورة</div>
                                <div><b>المبيعات الخاضعة للنسبة الأساسية:</b> {formatCurrency(periodSummary.taxableAmount)}</div>
                                <div><b>إجمالي ضريبة القيمة المضافة (15%):</b> {formatCurrency(periodSummary.taxAmount)}</div>
                                <div><b>الإجمالي النهائي شامل الضريبة:</b> {formatCurrency(periodSummary.totalAmount)}</div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b', fontWeight: 800 }}>
                                ⏳ جاري تجهيز وتنسيق مستند الفواتير الضريبية للفترة...
                            </div>
                        ) : invoices.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ef4444', fontWeight: 800 }}>
                                ⚠️ لا توجد فواتير مبيعات مسجلة في النطاق الزمني المحدد.
                            </div>
                        ) : documentLayout === 'statement' ? (
                            
                            /* 📋 النمط الأول: بيان المبيعات الضريبي الشامل (كشف الفاحص المعتمد) */
                            <table className="tax-invoices-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '35px' }}>م</th>
                                        <th>رقم الفاتورة</th>
                                        <th>تاريخ التوريد</th>
                                        <th>العميل</th>
                                        <th>طريقة الدفع</th>
                                        <th>الصنف</th>
                                        <th>الكمية (لتر)</th>
                                        <th>المبلغ غير شامل الضريبة</th>
                                        <th>ضريبة القيمة المضافة 15%</th>
                                        <th>المبلغ شامل الضريبة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv, idx) => {
                                        const total = Number(inv.total_amount || 0);
                                        const tax = Number(inv.tax_amount || 0);
                                        const taxable = Number(inv.taxable_amount || (total - tax));
                                        
                                        let itemTitle = 'بنزين 91 ممتاز';
                                        let liters = (total / 2.18).toFixed(2);
                                        if (Array.isArray(inv.lines_data) && inv.lines_data.length > 0) {
                                            itemTitle = inv.lines_data[0].item_name || inv.lines_data[0].name || itemTitle;
                                            if (inv.lines_data[0].quantity) liters = Number(inv.lines_data[0].quantity).toFixed(2);
                                        }

                                        return (
                                            <tr key={inv.id || idx}>
                                                <td>{idx + 1}</td>
                                                <td style={{ fontWeight: 800, color: '#0369a1' }}>#{inv.invoice_number}</td>
                                                <td>{inv.date}</td>
                                                <td>{inv.client_name || 'عميل نقدي'}</td>
                                                <td>{inv.payment_method || 'مدى'}</td>
                                                <td>{itemTitle}</td>
                                                <td>{liters}</td>
                                                <td style={{ textAlign: 'left' }}>{formatCurrency(taxable)}</td>
                                                <td style={{ textAlign: 'left', color: '#0284c7' }}>{formatCurrency(tax)}</td>
                                                <td style={{ textAlign: 'left', fontWeight: 900 }}>{formatCurrency(total)}</td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {/* سطر الإجماليات */}
                                    <tr className="total-row">
                                        <td colSpan={7} style={{ textAlign: 'right', paddingRight: '15px' }}>المجموع الإجمالي للفترة:</td>
                                        <td style={{ textAlign: 'left' }}>{formatCurrency(periodSummary.taxableAmount)}</td>
                                        <td style={{ textAlign: 'left', color: '#0284c7' }}>{formatCurrency(periodSummary.taxAmount)}</td>
                                        <td style={{ textAlign: 'left', color: '#047857' }}>{formatCurrency(periodSummary.totalAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>

                        ) : (

                            /* 🧾 النمط الثاني: دفتر الفواتير الضريبية المصغرة المتتالية */
                            <div className="invoices-grid-cards">
                                {invoices.map((inv, idx) => {
                                    const total = Number(inv.total_amount || 0);
                                    const tax = Number(inv.tax_amount || 0);
                                    const taxable = Number(inv.taxable_amount || (total - tax));
                                    const qrVal = generateZatcaQR('محطات النور للوقود', '312487477800003', `${inv.date || '2023-07-01'}T12:00:00Z`, total.toFixed(2), tax.toFixed(2));

                                    return (
                                        <div key={inv.id || idx} className="single-invoice-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '8px' }}>
                                                <div>
                                                    <span style={{ fontWeight: 900, color: '#0369a1', fontSize: '13px' }}>فاتورة #{inv.invoice_number}</span>
                                                    <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>التاريخ: {inv.date}</span>
                                                </div>
                                                <QRCodeSVG value={qrVal} size={50} level="L" />
                                            </div>

                                            <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '3px', color: '#334155' }}>
                                                <div><b>العميل:</b> {inv.client_name || 'عميل نقدي'}</div>
                                                <div><b>طريقة السداد:</b> {inv.payment_method || 'نقاط بيع (مدى)'}</div>
                                                <div><b>الصنف:</b> بنزين 91 ممتاز ({ (total / 2.18).toFixed(2) } لتر)</div>
                                            </div>

                                            <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '8px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                <span>الخاضع: {formatCurrency(taxable)}</span>
                                                <span style={{ color: '#0284c7' }}>الضريبة: {formatCurrency(tax)}</span>
                                                <span style={{ fontWeight: 900, color: '#0f172a' }}>الإجمالي: {formatCurrency(total)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        )}

                        {/* تذييل الاعتماد الرسمي للطباعة */}
                        <div style={{ marginTop: '40px', paddingTop: '15px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                            <div>
                                <span>تم الاستخراج آلياً من نظام إدارة موارد محطات النور للوقود ERP</span>
                                <span style={{ display: 'block', fontSize: '10px' }}>تاريخ الاستخراج والطباعة: {new Date().toLocaleDateString('ar-SA')}</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <span>ختم الإدارة المالية والاعتماد الضريبي</span>
                                <div style={{ width: '120px', height: '45px', border: '1px dashed #94a3b8', borderRadius: '6px', marginTop: '4px' }} />
                            </div>
                        </div>

                    </div>
                </div>

                {/* 5. شريط الإجراءات السفلي */}
                <div className="modal-actions-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#2C1A12' }}>
                            المستند مجهز لـ {invoices.length} فاتورة في ملف واحد.
                        </span>
                        {totalCount > printBatchSize && (
                            <span style={{ fontSize: '11px', color: '#A8573C', fontWeight: 700 }}>
                                (المستند يعرض أول {printBatchSize} فاتورة لحماية المتصفح، يمكنك زيادة الدفعة من القائمة بالأعلى).
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="btn-action-excel"
                            disabled={isLoading || invoices.length === 0}
                        >
                            <span>📊</span>
                            <span>تصدير Excel موحد للفترة</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="btn-action-primary"
                            disabled={isLoading || invoices.length === 0}
                        >
                            <span>🖨️</span>
                            <span>طباعة / حفظ كملف PDF موحد</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'rgba(44, 26, 18, 0.08)',
                                border: '1px solid rgba(194, 155, 98, 0.3)',
                                color: '#2C1A12',
                                height: '44px',
                                padding: '0 18px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                cursor: 'pointer'
                            }}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}
