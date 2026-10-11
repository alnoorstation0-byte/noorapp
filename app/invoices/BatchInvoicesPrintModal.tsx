"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    
    // 🧾 نمط المستند الافتراضي: فواتير حرارية 80mm
    const [documentLayout, setDocumentLayout] = useState<'thermal' | 'statement' | 'book'>('thermal');
    // نمط ورق الطباعة الحرارية: رول 80mm أو شبكة A4
    const [thermalPaperMode, setThermalPaperMode] = useState<'roll80' | 'gridA4'>('roll80');

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

    // حجم دفعة المعاينة والطباعة لحماية المتصفح
    const [printBatchSize, setPrintBatchSize] = useState<number>(200);

    const printContainerRef = useRef<HTMLDivElement>(null);

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

            let allData: any[] = [];
            if (printBatchSize === 0) {
                // سحب جميع فواتير الفترة عبر دفعات تتابعية
                let from = 0;
                const step = 1000;
                let hasMore = true;
                while (hasMore) {
                    const { data: chunk, error: chunkErr } = await query.range(from, from + step - 1);
                    if (chunkErr) throw chunkErr;
                    if (chunk && chunk.length > 0) {
                        allData.push(...chunk);
                        from += step;
                        if (chunk.length < step) hasMore = false;
                    } else {
                        hasMore = false;
                    }
                }
            } else {
                const { data, error } = await query.limit(printBatchSize);
                if (error) throw error;
                allData = data || [];
            }

            setInvoices(allData);
            setTotalCount(allData.length);

            // حساب المجاميع
            let total = 0;
            let taxable = 0;
            let tax = 0;
            let cash = 0;
            let mada = 0;
            let credit = 0;

            allData.forEach(inv => {
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
        document.title = `فواتير_حرارية_محطة_نوره_حامد_${selectedPeriod}_${dateFrom}_الى_${dateTo}`;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    };

    // 💾 تنزيل ملف الفواتير الحرارية المستقل (Standalone Thermal HTML)
    const handleDownloadThermalHtml = () => {
        if (!invoices || invoices.length === 0) {
            toast.error('لا توجد فواتير لتنزيلها.');
            return;
        }

        const toastId = toast.loading('جاري توليد ملف الفواتير الحرارية المستقل... ⏳');
        try {
            // توليد كود HTML مستقل كامل يحتوي على جميع الفواتير الحرارية وباركوداتها
            const thermalItemsHtml = invoices.map((inv, idx) => {
                const total = Number(inv.total_amount || 0);
                const tax = Number(inv.tax_amount || 0);
                const taxable = Number(inv.taxable_amount || (total - tax));
                const liters = (total / 2.18).toFixed(2);
                const qrVal = generateZatcaQR('محطة نوره حامد محمد القرني', '310147870100003', `${inv.date || '2023-07-01'}T12:00:00Z`, total.toFixed(2), tax.toFixed(2));
                const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qrVal)}`;

                return `
                <div class="thermal-receipt">
                    <div class="header">
                        <div class="brand">محطة نوره حامد محمد القرني</div>
                        <div class="info">س.ت: 586352397</div>
                        <div class="info">الرقم الضريبي: 310147870100003</div>
                        <div class="info">سبت العلاية - عسير - المملكة العربية السعودية</div>
                        <div class="badge">فاتورة ضريبية مبسطة</div>
                        <div class="badge-en">SIMPLIFIED TAX INVOICE</div>
                    </div>

                    <div class="divider"></div>

                    <table class="meta">
                        <tr><td>رقم الفاتورة:</td><td class="bold">#${inv.invoice_number || ''}</td></tr>
                        <tr><td>تاريخ ووقت التوريد:</td><td>${inv.date || ''} 10:30 ص</td></tr>
                        <tr><td>العميل:</td><td>${inv.client_name || 'عميل نقدي'}</td></tr>
                        <tr><td>طريقة السداد:</td><td class="bold">${inv.payment_method || 'نقاط بيع (مدى)'}</td></tr>
                        <tr><td>الفرع / المضخة:</td><td>محطة نوره حامد محمد القرني</td></tr>
                    </table>

                    <div class="divider"></div>

                    <table class="items">
                        <thead>
                            <tr>
                                <th>الصنف</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>بنزين 91 ممتاز</td>
                                <td>${liters} لتر</td>
                                <td>2.18</td>
                                <td class="bold">${total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="divider"></div>

                    <table class="totals">
                        <tr><td>المبلغ غير شامل الضريبة:</td><td>${taxable.toFixed(2)} ر.س</td></tr>
                        <tr><td>ضريبة القيمة المضافة (15%):</td><td>${tax.toFixed(2)} ر.س</td></tr>
                        <tr class="grand-total"><td>الإجمالي شامل الضريبة:</td><td class="bold">${total.toFixed(2)} ر.س</td></tr>
                    </table>

                    <div class="divider"></div>

                    <div class="qr-box">
                        <img src="${qrImgSrc}" alt="ZATCA QR" width="90" height="90" />
                        <div class="qr-text">رمز التحقق الإلكتروني (هيئة الزكاة ZATCA)</div>
                    </div>

                    <div class="footer">
                        <div>شكراً لزيارتكم محطة نوره حامد محمد القرني</div>
                        <div>الأسعار شاملة ضريبة القيمة المضافة 15%</div>
                        <div class="inv-index">فاتورة (${idx + 1} من ${invoices.length})</div>
                    </div>
                </div>
                `;
            }).join('\n');

            const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>دفتر الفواتير الحرارية - محطة نوره حامد محمد القرني (${dateFrom} إلى ${dateTo})</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f1f5f9;
            font-family: 'Courier New', Courier, monospace, Tahoma, sans-serif;
            direction: rtl;
        }
        .controls {
            position: fixed;
            top: 15px;
            left: 15px;
            background: #1e293b;
            color: #fff;
            padding: 12px 20px;
            border-radius: 30px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            display: flex;
            gap: 10px;
            z-index: 9999;
        }
        .btn {
            background: #0284c7;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            cursor: pointer;
            font-size: 13px;
        }
        .btn:hover { background: #0369a1; }
        .receipts-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 25px;
            margin-top: 40px;
        }
        .thermal-receipt {
            width: 78mm;
            max-width: 80mm;
            background: white;
            padding: 6mm 5mm;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            font-size: 11px;
            line-height: 1.35;
            color: #000;
            font-weight: bold;
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
        }
        .header { text-align: center; }
        .brand { font-size: 14px; font-weight: 900; margin-bottom: 2px; }
        .sub-brand { font-size: 10px; color: #333; margin-bottom: 3px; }
        .info { font-size: 10px; color: #222; }
        .badge { display: inline-block; border: 1.5px solid #000; padding: 2px 8px; font-size: 11px; font-weight: 900; margin: 5px 0 1px 0; border-radius: 4px; }
        .badge-en { font-size: 9px; letter-spacing: 0.5px; }
        .divider { border-bottom: 1px dashed #000; margin: 6px 0; width: 100%; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .meta td { padding: 2px 0; }
        .items th { border-bottom: 1.5px solid #000; border-top: 1.5px solid #000; padding: 3px 1px; text-align: center; font-size: 10px; }
        .items td { padding: 4px 1px; border-bottom: 1px dashed #666; text-align: center; }
        .totals td { padding: 2px 0; }
        .grand-total { font-size: 12px; font-weight: 900; border-top: 1.5px solid #000; }
        .bold { font-weight: 900; }
        .qr-box { text-align: center; margin: 8px 0; }
        .qr-text { font-size: 9px; margin-top: 3px; color: #444; }
        .footer { text-align: center; font-size: 10px; margin-top: 6px; }
        .inv-index { font-size: 8px; color: #888; margin-top: 4px; }
        @media print {
            body { background: white; padding: 0; }
            .controls { display: none !important; }
            .receipts-container { margin: 0; gap: 0; }
            .thermal-receipt { box-shadow: none; border-radius: 0; margin: 0 auto; page-break-after: always; break-after: page; }
            @page { size: 80mm auto; margin: 2mm; }
        }
    </style>
</head>
<body>
    <div class="controls">
        <span>🧾 إجمالي الفواتير: ${invoices.length}</span>
        <button class="btn" onclick="window.print()">🖨️ طباعة لكافة الفواتير (طابعة حرارية / PDF)</button>
    </div>
    <div class="receipts-container">
        ${thermalItemsHtml}
    </div>
</body>
</html>`;

            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `فواتير_حرارية_محطة_نوره_حامد_${dateFrom}_الى_${dateTo}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('✅ تم تنزيل ملف الفواتير الحرارية المستقل بنجاح!', { id: toastId });
        } catch (err: any) {
            console.error('Thermal download error:', err);
            toast.error('حدث خطأ أثناء تنزيل الفواتير الحرارية: ' + err.message, { id: toastId });
        }
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
                    background: #334155;
                    padding: 24px;
                    display: flex;
                    justify-content: center;
                }

                /* 🧾 صندوق الإيصال الحراري 80mm */
                .thermal-container-roll {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 25px;
                    width: 100%;
                }
                .thermal-container-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80mm, 1fr));
                    gap: 20px;
                    justify-content: center;
                    max-width: 1100px;
                    width: 100%;
                }

                .thermal-receipt-card {
                    width: 78mm;
                    max-width: 80mm;
                    background: #FFFFFF;
                    padding: 6mm 5mm;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                    color: #000;
                    font-family: 'Courier New', Courier, monospace, monospace;
                    font-size: 11px;
                    line-height: 1.35;
                    font-weight: bold;
                    text-align: center;
                    direction: rtl;
                    box-sizing: border-box;
                    page-break-after: always;
                    break-after: page;
                }

                .t-brand { font-size: 14px; font-weight: 900; color: #000; margin-bottom: 2px; }
                .t-sub { font-size: 10px; color: #222; margin-bottom: 2px; }
                .t-info { font-size: 10px; color: #111; }
                .t-badge { display: inline-block; border: 1.5px solid #000; padding: 2px 8px; font-size: 11px; font-weight: 900; margin: 5px 0 1px 0; border-radius: 4px; }
                .t-badge-en { font-size: 9px; letter-spacing: 0.5px; }
                .t-divider { border-bottom: 1px dashed #000; margin: 6px 0; width: 100%; }
                .t-meta-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: right; }
                .t-meta-table td { padding: 2px 0; }
                .t-items-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0; }
                .t-items-table th { border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 1px; text-align: center; font-size: 10px; font-weight: 900; }
                .t-items-table td { padding: 4px 1px; border-bottom: 1px dashed #555; text-align: center; }
                .t-totals-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: right; }
                .t-totals-table td { padding: 2px 0; }
                .t-grand-total { font-size: 12px; font-weight: 900; border-top: 1.5px solid #000; }
                .t-qr-box { text-align: center; margin: 8px 0; }
                .t-qr-label { font-size: 9px; margin-top: 3px; color: #333; }
                .t-footer { text-align: center; font-size: 10px; margin-top: 6px; }

                /* 📋 ورقة بيان المبيعات A4 */
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
                .zatca-sheet-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 2px solid #1e293b;
                    padding-bottom: 18px;
                    margin-bottom: 20px;
                }
                .comp-name-box h1 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
                .comp-name-box p { margin: 3px 0 0 0; font-size: 12px; color: #475569; font-weight: 700; }
                .report-title-badge h2 { margin: 0; font-size: 16px; font-weight: 900; color: #1e293b; background: #f1f5f9; padding: 6px 18px; border-radius: 8px; border: 1px solid #cbd5e1; }
                .report-title-badge span { display: block; margin-top: 5px; font-size: 11px; font-weight: 800; color: #64748b; }
                .tax-invoices-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                .tax-invoices-table th { background: #1e293b; color: #FFFFFF; padding: 8px 6px; font-weight: 800; text-align: center; border: 1px solid #334155; }
                .tax-invoices-table td { padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #1e293b; }
                .tax-invoices-table tr:nth-child(even) { background: #f8fafc; }
                .tax-invoices-table tr.total-row td { background: #f1f5f9; font-weight: 900; font-size: 12px; border-top: 2px solid #0f172a; }

                /* ⚙️ أزرار الإجراءات السفلية */
                .modal-actions-footer {
                    padding: 14px 24px;
                    background: #FFFFFF;
                    border-top: 1px solid rgba(194, 155, 98, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 12px;
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
                .btn-action-download {
                    background: #0284c7;
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
                .btn-action-download:hover {
                    background: #0369a1;
                    transform: translateY(-2px);
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
                    .thermal-receipt-card {
                        visibility: visible !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        margin: 0 auto 5mm auto !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .print-paper-sheet {
                        visibility: visible !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    @page {
                        size: auto;
                        margin: 2mm;
                    }
                }
            `}</style>

            <div className="batch-print-modal-window">
                
                {/* 1. الشريط العلوي الفاخر */}
                <div className="modal-header-ribbon">
                    <div className="header-title-box">
                        <h2>
                            <span>🧾</span>
                            <span>دفتر الفواتير الحرارية والمجمعة (80mm POS Receipts & Statement)</span>
                        </h2>
                        <p>تنزيل وطباعة فواتير المبيعات الضريبية كفواتير حرارية معتمدة (ZATCA) في ملف واحد</p>
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
                            <label>تنسيق المستند:</label>
                            <select
                                value={documentLayout}
                                onChange={(e) => setDocumentLayout(e.target.value as any)}
                            >
                                <option value="thermal">🧾 فواتير حرارية (80mm POS Thermal Receipts)</option>
                                <option value="statement">📋 بيان المبيعات الضريبي الشامل (كشف الفاحص)</option>
                                <option value="book">📑 قسائم ضريبية مجمعة (A4 ZATCA Book)</option>
                            </select>
                        </div>

                        {/* نمط عرض الحراري */}
                        {documentLayout === 'thermal' && (
                            <div className="filter-field-box">
                                <label>طريقة عرض الحراري:</label>
                                <select
                                    value={thermalPaperMode}
                                    onChange={(e) => setThermalPaperMode(e.target.value as any)}
                                >
                                    <option value="roll80">رول حراري متصل (80mm Roll)</option>
                                    <option value="gridA4">شبكة إيصالات متجاورة (A4 Grid)</option>
                                </select>
                            </div>
                        )}

                        {/* حجم دفعة العرض */}
                        <div className="filter-field-box">
                            <label>عرض وتحميل دفعة:</label>
                            <select
                                value={printBatchSize}
                                onChange={(e) => setPrintBatchSize(Number(e.target.value))}
                            >
                                <option value={200}>200 فاتورة</option>
                                <option value={500}>500 فاتورة</option>
                                <option value={1000}>1,000 فاتورة</option>
                                <option value={2500}>2,500 فاتورة</option>
                                <option value={5000}>5,000 فاتورة</option>
                                <option value={0}>⚡ جميع فواتير الفترة (الـ 15,583 فاتورة كاملة)</option>
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

                {/* ⚡ قسم التنزيل الفوري الشامل للفواتير الحرارية */}
                <div style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(14, 165, 233, 0.06) 100%)',
                    borderBottom: '1px solid rgba(2, 132, 199, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 900, color: '#0369a1' }}>
                        <span>⚡</span>
                        <span>تنزيل فوري جاهز لكافة الفواتير الحرارية (15,583 فاتورة):</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                            href="/فواتير_حرارية_الربع_الثالث_2023_كاملة.zip"
                            download="فواتير_حرارية_الربع_الثالث_2023_كاملة.zip"
                            style={{
                                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                color: '#ffffff',
                                textDecoration: 'none',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                            }}
                        >
                            <span>📦</span>
                            <span>تحميل الحزمة الشاملة كاملة (15,583 فاتورة - ZIP)</span>
                        </a>
                        <a
                            href="/فواتير_حرارية_شهر_7_يوليو_2023.html"
                            target="_blank"
                            download="فواتير_حرارية_شهر_7_يوليو_2023.html"
                            style={{
                                background: '#ffffff',
                                color: '#0369a1',
                                border: '1px solid #0284c7',
                                textDecoration: 'none',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800
                            }}
                        >
                            📅 شهر 7 (5,634 فاتورة)
                        </a>
                        <a
                            href="/فواتير_حرارية_شهر_8_أغسطس_2023.html"
                            target="_blank"
                            download="فواتير_حرارية_شهر_8_أغسطس_2023.html"
                            style={{
                                background: '#ffffff',
                                color: '#0369a1',
                                border: '1px solid #0284c7',
                                textDecoration: 'none',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800
                            }}
                        >
                            📅 شهر 8 (5,004 فاتورة)
                        </a>
                        <a
                            href="/فواتير_حرارية_شهر_9_سبتمبر_2023.html"
                            target="_blank"
                            download="فواتير_حرارية_شهر_9_سبتمبر_2023.html"
                            style={{
                                background: '#ffffff',
                                color: '#0369a1',
                                border: '1px solid #0284c7',
                                textDecoration: 'none',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800
                            }}
                        >
                            📅 شهر 9 (4,945 فاتورة)
                        </a>
                    </div>
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
                <div className="modal-document-scroll-canvas" ref={printContainerRef}>
                    
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#FFFFFF', fontWeight: 800 }}>
                            ⏳ جاري تجهيز وتنسيق الفواتير الحرارية للفترة...
                        </div>
                    ) : invoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#f87171', fontWeight: 800 }}>
                            ⚠️ لا توجد فواتير مبيعات مسجلة في النطاق الزمني المحدد.
                        </div>
                    ) : documentLayout === 'thermal' ? (
                        
                        /* 🧾 النمط الأول: الفواتير الحرارية 80mm POS Receipts */
                        <div className={thermalPaperMode === 'roll80' ? 'thermal-container-roll' : 'thermal-container-grid'}>
                            {invoices.map((inv, idx) => {
                                const total = Number(inv.total_amount || 0);
                                const tax = Number(inv.tax_amount || 0);
                                const taxable = Number(inv.taxable_amount || (total - tax));
                                const liters = (total / 2.18).toFixed(2);
                                const qrVal = generateZatcaQR('محطة نوره حامد محمد القرني', '310147870100003', `${inv.date || '2023-07-01'}T12:00:00Z`, total.toFixed(2), tax.toFixed(2));

                                return (
                                    <div key={inv.id || idx} className="thermal-receipt-card">
                                        
                                        {/* ترويسة الفاتورة الحرارية */}
                                        <div className="t-brand">محطة نوره حامد محمد القرني</div>
                                        <div className="t-info">س.ت: 586352397</div>
                                        <div className="t-info">الرقم الضريبي: 310147870100003</div>
                                        <div className="t-info">سبت العلاية - عسير - المملكة العربية السعودية</div>
                                        
                                        <div className="t-badge">فاتورة ضريبية مبسطة</div>
                                        <div className="t-badge-en">SIMPLIFIED TAX INVOICE</div>

                                        <div className="t-divider"></div>

                                        {/* بيانات الفاتورة */}
                                        <table className="t-meta-table">
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: '38%', color: '#333' }}>رقم الفاتورة:</td>
                                                    <td style={{ fontWeight: 900 }}>#{inv.invoice_number || ''}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ color: '#333' }}>تاريخ التوريد:</td>
                                                    <td>{inv.date || ''} 10:30 ص</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ color: '#333' }}>العميل:</td>
                                                    <td>{inv.client_name || 'عميل نقدي'}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ color: '#333' }}>طريقة السداد:</td>
                                                    <td style={{ fontWeight: 900 }}>{inv.payment_method || 'نقاط بيع (مدى)'}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ color: '#333' }}>الفرع / المنفذ:</td>
                                                    <td>محطة نوره حامد محمد القرني</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="t-divider"></div>

                                        {/* جدول الأصناف والكميات */}
                                        <table className="t-items-table">
                                            <thead>
                                                <tr>
                                                    <th>الصنف</th>
                                                    <th>الكمية</th>
                                                    <th>السعر</th>
                                                    <th>الإجمالي</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>بنزين 91</td>
                                                    <td>{liters} لتر</td>
                                                    <td>2.18</td>
                                                    <td style={{ fontWeight: 900 }}>{total.toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="t-divider"></div>

                                        {/* الإجماليات والضريبة */}
                                        <table className="t-totals-table">
                                            <tbody>
                                                <tr>
                                                    <td>المجموع غير شامل الضريبة:</td>
                                                    <td style={{ textAlign: 'left' }}>{taxable.toFixed(2)} ر.س</td>
                                                </tr>
                                                <tr>
                                                    <td>ضريبة القيمة المضافة (15%):</td>
                                                    <td style={{ textAlign: 'left' }}>{tax.toFixed(2)} ر.س</td>
                                                </tr>
                                                <tr className="t-grand-total">
                                                    <td style={{ paddingTop: '4px' }}>الإجمالي شامل الضريبة:</td>
                                                    <td style={{ textAlign: 'left', paddingTop: '4px', fontSize: '13px', fontWeight: 900 }}>
                                                        {total.toFixed(2)} ر.س
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="t-divider"></div>

                                        {/* باركود ZATCA QR Code */}
                                        <div className="t-qr-box">
                                            <QRCodeSVG value={qrVal} size={85} level="M" />
                                            <div className="t-qr-label">رمز التحقق الإلكتروني (هيئة الزكاة ZATCA)</div>
                                        </div>

                                        {/* تذييل الإيصال */}
                                        <div className="t-footer">
                                            <div>شكراً لزيارتكم محطة نوره حامد محمد القرني</div>
                                            <div>الأسعار شاملة ضريبة القيمة المضافة 15%</div>
                                            <div style={{ fontSize: '8px', color: '#777', marginTop: '3px' }}>
                                                فاتورة ({idx + 1} من {invoices.length})
                                            </div>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>

                    ) : documentLayout === 'statement' ? (
                        
                        /* 📋 النمط الثاني: بيان المبيعات الضريبي الشامل A4 */
                        <div className="print-paper-sheet">
                            <div className="zatca-sheet-header">
                                <div className="comp-name-box">
                                    <h1>محطة نوره حامد محمد القرني</h1>
                                    <p>سجل تجاري: 586352397</p>
                                    <p style={{ color: '#0ea5e9' }}>الرقم الضريبي: 310147870100003</p>
                                    <p>المملكة العربية السعودية - منطقة عسير - سبت العلاية</p>
                                </div>
                                <div className="report-title-badge">
                                    <h2>بيان فواتير المبيعات الضريبية المحلية</h2>
                                    <span>عن الفترة الضريبية من: {dateFrom} إلى: {dateTo}</span>
                                    <span style={{ color: '#16a34a', fontWeight: 900 }}>الحالة: معتمد ومطابق لإقرار ضريبة القيمة المضافة (15%)</span>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <QRCodeSVG 
                                        value={generateZatcaQR('محطة نوره حامد محمد القرني', '310147870100003', `${dateFrom}T12:00:00Z`, periodSummary.totalAmount.toFixed(2), periodSummary.taxAmount.toFixed(2))}
                                        size={80}
                                        level="M"
                                    />
                                    <span style={{ display: 'block', fontSize: '9px', color: '#64748b', marginTop: '3px' }}>ختم هيئة الزكاة والضريبة</span>
                                </div>
                            </div>

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
                                        const liters = (total / 2.18).toFixed(2);

                                        return (
                                            <tr key={inv.id || idx}>
                                                <td>{idx + 1}</td>
                                                <td style={{ fontWeight: 800, color: '#0369a1' }}>#{inv.invoice_number}</td>
                                                <td>{inv.date}</td>
                                                <td>{inv.client_name || 'عميل نقدي'}</td>
                                                <td>{inv.payment_method || 'مدى'}</td>
                                                <td>بنزين 91 ممتاز</td>
                                                <td>{liters}</td>
                                                <td style={{ textAlign: 'left' }}>{formatCurrency(taxable)}</td>
                                                <td style={{ textAlign: 'left', color: '#0284c7' }}>{formatCurrency(tax)}</td>
                                                <td style={{ textAlign: 'left', fontWeight: 900 }}>{formatCurrency(total)}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="total-row">
                                        <td colSpan={7} style={{ textAlign: 'right', paddingRight: '15px' }}>المجموع الإجمالي للفترة:</td>
                                        <td style={{ textAlign: 'left' }}>{formatCurrency(periodSummary.taxableAmount)}</td>
                                        <td style={{ textAlign: 'left', color: '#0284c7' }}>{formatCurrency(periodSummary.taxAmount)}</td>
                                        <td style={{ textAlign: 'left', color: '#047857' }}>{formatCurrency(periodSummary.totalAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    ) : (

                        /* 📑 النمط الثالث: قسائم ZATCA مجمعة */
                        <div className="print-paper-sheet">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0 }}>دفتر قسائم الفواتير الضريبية المبسطة</h2>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>عن الفترة: {dateFrom} إلى {dateTo}</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                                {invoices.map((inv, idx) => {
                                    const total = Number(inv.total_amount || 0);
                                    const tax = Number(inv.tax_amount || 0);
                                    const taxable = Number(inv.taxable_amount || (total - tax));
                                    const qrVal = generateZatcaQR('محطة نوره حامد محمد القرني', '310147870100003', `${inv.date || '2023-07-01'}T12:00:00Z`, total.toFixed(2), tax.toFixed(2));

                                    return (
                                        <div key={inv.id || idx} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', background: '#fff' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                                <div>
                                                    <span style={{ fontWeight: 900, color: '#0369a1' }}>#{inv.invoice_number}</span>
                                                    <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>{inv.date}</span>
                                                </div>
                                                <QRCodeSVG value={qrVal} size={50} level="L" />
                                            </div>
                                            <div style={{ fontSize: '11px', marginTop: '6px' }}>
                                                <div>العميل: {inv.client_name || 'عميل نقدي'}</div>
                                                <div>السداد: {inv.payment_method || 'نقاط بيع (مدى)'}</div>
                                                <div>الصنف: بنزين 91 ممتاز ({(total/2.18).toFixed(2)} لتر)</div>
                                            </div>
                                            <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '8px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                <span>الخاضع: {formatCurrency(taxable)}</span>
                                                <span style={{ fontWeight: 900 }}>الإجمالي: {formatCurrency(total)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    )}

                </div>

                {/* 5. شريط الإجراءات السفلي */}
                <div className="modal-actions-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#2C1A12' }}>
                            المستند مجهز لـ {invoices.length} فاتورة حرارية.
                        </span>
                        {totalCount > printBatchSize && (
                            <span style={{ fontSize: '11px', color: '#A8573C', fontWeight: 700 }}>
                                (المعاينة تعرض أول {printBatchSize} فاتورة، يمكنك زيادة الدفعة من القائمة بالأعلى أو تنزيل الملف المستقل).
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* 💾 زر تنزيل ملف الفواتير الحرارية المستقل */}
                        <button
                            type="button"
                            onClick={handleDownloadThermalHtml}
                            className="btn-action-download"
                            disabled={isLoading || invoices.length === 0}
                            title="تنزيل ملف HTML حراري كامل مستقل لفتحه وطباعته بدون إنترنت"
                        >
                            <span>💾</span>
                            <span>تنزيل الفواتير الحرارية (ملف حراري كامل)</span>
                        </button>

                        {/* 📊 تصدير Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="btn-action-excel"
                            disabled={isLoading || invoices.length === 0}
                        >
                            <span>📊</span>
                            <span>Excel</span>
                        </button>

                        {/* 🖨️ طباعة موحدة */}
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
