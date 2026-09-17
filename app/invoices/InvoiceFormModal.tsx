"use client";
import React, { useState, useEffect } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context'; 
import SmartCombo from '@/components/SmartCombo'; 
import BarcodeScannerWidget from '@/components/BarcodeScannerWidget';
import { z } from 'zod';

// --- [نافذة إضافة/تعديل فاتورة] ---
export default function InvoiceFormModal({ 
    isOpen, 
    onClose, 
    record, 
    setRecord, 
    onSave, 
    isSaving, 
    fleetOperations, 
    warehouses, 
    delegates, 
    warehouseItems 
}: any) {
    const { showToast } = useToast(); 
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 🚀 1. سحب البيانات بشكل ذكي ومؤكد (المستودعات، العميل، والأصناف)
    useEffect(() => {
        if (!isOpen || !record) return;

        let updates: any = {};
        let needsUpdate = false;

        // أ. الفاتورة الجديدة
        if (!record.invoice_number) {
            updates.invoice_number = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
            updates.date = record.date || new Date().toISOString().split('T')[0];
            updates.tax_acc_id = record.tax_acc_id || '990c949c-5f32-40d7-8d36-5fe45a6c892c'; 
            updates.materials_acc_id = record.materials_acc_id || '85e61a6a-8c85-4219-a733-3b2180dfe043';
            updates.guarantee_acc_id = record.guarantee_acc_id || '8bf39cb1-4028-4c9e-817d-27c239873030';
            needsUpdate = true;
        }

        // ج. سحب اسم العميل لو كان متخزن جوه object الـ partners
        if (record.id && !record.client_name && record.partners?.name) {
            updates.client_name = record.partners.name;
            needsUpdate = true;
        }

        // 💎 د. (التعديل الأهم): سحب الأصناف التفصيلية في حالة التعديل عشان الجدول ميكونش فاضي
        if (record.id && !record.lines && (record.lines_data || record.items)) {
            updates.lines = record.lines_data || record.items || [];
            needsUpdate = true;
        }

        // لو جمعنا أي داتا ناقصة، بنحدثها فوراً
        if (needsUpdate) {
            setRecord((prev: any) => ({ ...prev, ...updates }));
        }
    }, [record?.id, isOpen, record?.lines_data, record?.items]);

    // 🚀 2. الحسابات الفورية
    useEffect(() => {
        if (!record) return; 
        const qty = Number(record.quantity || 0);
        const price = Number(record.unit_price || 0);
        
        // 💡 بيجمع السعر المكتوب حالياً + الأصناف المضافة في الجدول
        const linesTotal = (record.lines || []).reduce((sum: number, line: any) => sum + (Number(line.quantity) * Number(line.unit_price)), 0);
        const lineTotal = (qty * price) + linesTotal;
        
        const materialsDiscount = Number(record.materials_discount || 0);
        const taxableAmount = lineTotal - materialsDiscount;
        const guaranteePercent = Number(record.guarantee_percent || 0);
        const guaranteeAmount = (taxableAmount * guaranteePercent) / 100;
        
        // 💡 حساب الضريبة (لو متعلم إنها مش خاضعة بيديها 0، وإلا بيحسب بناءً على نسبة ضريبة كل صنف)
        let taxAmount = 0;
        if (!record.skip_zatca) {
            const linesTax = (record.lines || []).reduce((sum: number, line: any) => {
                const lSub = (Number(line.quantity || 0) * Number(line.unit_price || 0));
                const lRate = (line.tax_rate !== undefined && line.tax_rate !== null) ? Number(line.tax_rate) : 15;
                return sum + (lSub * (lRate / 100));
            }, 0);
            const curRate = (record.tax_rate !== undefined && record.tax_rate !== null) ? Number(record.tax_rate) : 15;
            const curTax = (qty * price) * (curRate / 100);
            taxAmount = Math.round((linesTax + curTax) * 100) / 100;
        }

        const finalTotal = taxableAmount + taxAmount - guaranteeAmount;

        const days = Number(record.due_in_days || 0);
        const invoiceDate = record.date ? new Date(record.date) : new Date();
        const dueDateCalculated = new Date(invoiceDate);
        dueDateCalculated.setDate(dueDateCalculated.getDate() + days);

        if (
            record.line_total !== lineTotal ||
            record.taxable_amount !== taxableAmount ||
            record.guarantee_amount !== guaranteeAmount ||
            record.tax_amount !== taxAmount ||
            record.total_amount !== finalTotal ||
            record.due_date !== dueDateCalculated.toISOString()
        ) {
            setRecord((prev: any) => ({
                ...prev,
                line_total: lineTotal,
                taxable_amount: taxableAmount,
                guarantee_amount: guaranteeAmount,
                tax_amount: taxAmount,
                total_amount: finalTotal,
                due_date: dueDateCalculated.toISOString()
            }));
        }
    }, [record?.quantity, record?.unit_price, record?.tax_rate, record?.materials_discount, record?.guarantee_percent, record?.date, record?.due_in_days, record?.skip_zatca, record?.lines]); 

    // 🚀 دالة إضافة البيان للجدول
    const handleAddStatement = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!record.description) {
            showToast("يرجى إدخال اسم الصنف أو البيان أولاً ⚠️", "warning");
            return;
        }
        if (Number(record.quantity || 0) <= 0 || Number(record.unit_price || 0) <= 0) {
            showToast("يرجى التأكد من إدخال الكمية والسعر بشكل صحيح ⚠️", "warning");
            return;
        }

        const newStatement = {
            boq_id: record.boq_id || null,
            description: record.description,
            quantity: Number(record.quantity),
            unit: record.unit || 'عدد',
            unit_price: Number(record.unit_price),
            total_price: Number(record.quantity) * Number(record.unit_price),
            item_id: record.item_id || null,
            tax_rate: (record.tax_rate !== undefined && record.tax_rate !== null) ? Number(record.tax_rate) : 15
        };

        setRecord({
            ...record,
            lines: [...(record.lines || []), newStatement],
            // تصفير الخانات المكتوبة بعد ما نزلناهم في الجدول
            description: '',
            quantity: '',
            unit_price: '',
            boq_id: null,
            item_id: null,
            tax_rate: 15
        });
    };

    const handleBarcodeScan = async (barcode: string) => {
        let foundItem = warehouseItems?.find((i: any) => String(i.code) === barcode || String(i.id) === barcode);
        if (!foundItem) {
            const { data } = await supabase.from('inventory_items').select('*').eq('code', barcode).single();
            if (data) foundItem = data;
        }

        if (foundItem) {
            setRecord({
                ...record,
                description: foundItem.name,
                unit: foundItem.unit || 'حبة',
                unit_price: foundItem.price || foundItem.default_price || 0,
                item_id: foundItem.id,
                tax_rate: (foundItem.tax_rate !== undefined && foundItem.tax_rate !== null) ? Number(foundItem.tax_rate) : 15,
                quantity: 1
            });
            showToast(`تم العثور على: ${foundItem.name} (${foundItem.price || 0} ر.س)`, 'success');
        } else {
            showToast(`لم يتم العثور على صنف بالباركود: ${barcode}`, 'error');
        }
    };

    // 🚀 دالة حذف البيان من الجدول
    const handleRemoveLine = (indexToRemove: number) => {
        const filteredLines = (record.lines || []).filter((_: any, idx: number) => idx !== indexToRemove);
        setRecord({ ...record, lines: filteredLines });
    };

    // 🚀 3. دالة التحقق قبل الحفظ (باستخدام Zod)
    const invoiceSchema = z.object({
        date: z.string().min(1, "يرجى إدخال تاريخ الفاتورة"),
        partner_id: z.string().min(1, "يرجى اختيار العميل (البارتنر) أولاً"),
        total_amount: z.number().min(0.01, "إجمالي الفاتورة لا يمكن أن يكون 0، يرجى التأكد من السعر والكمية")
    });

    const handleValidateAndSave = () => {
        const validationResult = invoiceSchema.safeParse({
            date: record.date,
            partner_id: record.partner_id,
            total_amount: Number(record.total_amount) > 0 ? Number(record.total_amount) : Number(record.line_total)
        });

        if (!validationResult.success) {
            const errObj: any = validationResult.error;
            const firstError = errObj.issues?.[0]?.message || errObj.errors?.[0]?.message || "بيانات الفاتورة غير مكتملة";
            showToast(`${firstError} ⚠️`, "warning");
            return;
        }
        
        onSave(record);
    };

    if (!isOpen || !mounted) return null;

    // 📦 محتوى مفتاح الضريبة (ZATCA toggle)
    const zatcaToggle = (
        <div 
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: record?.skip_zatca ? 'rgba(239, 68, 68, 0.1)' : 'rgba(78, 115, 79, 0.12)', 
                padding: '7px 14px', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                transition: '0.2s', 
                border: `1px solid ${record?.skip_zatca ? 'rgba(239, 68, 68, 0.3)' : 'rgba(78, 115, 79, 0.3)'}` 
            }} 
            onClick={() => setRecord({ ...record, skip_zatca: !record.skip_zatca })}
            title="تبديل خضوع الفاتورة لضريبة القيمة المضافة ZATCA"
        >
            <div style={{ 
                width: '36px', 
                height: '20px', 
                background: record?.skip_zatca ? 'rgba(44, 26, 18, 0.2)' : '#4E734F', 
                borderRadius: '20px', 
                position: 'relative', 
                transition: '0.3s' 
            }}>
                <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    background: 'white', 
                    borderRadius: '50%', 
                    position: 'absolute', 
                    top: '2px', 
                    left: record?.skip_zatca ? '2px' : '18px', 
                    transition: '0.3s', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)' 
                }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 900, color: record?.skip_zatca ? '#dc2626' : '#4E734F' }}>
                {record?.skip_zatca ? '❌ غير خاضعة (0%)' : '✅ خاضعة للضريبة (15%)'}
            </span>
        </div>
    );

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={record.id ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}
            icon="📑"
            width="1060px"
            headerExtra={zatcaToggle}
        >
            {/* 🎨 Scoped Noor Command Center Glassmorphism Form Styles */}
            <style jsx>{`
                .invoice-modal-flow {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .desert-form-card {
                    background: rgba(20, 24, 34, 0.75);
                    backdrop-filter: blur(20px) saturate(160%);
                    border: 1px solid rgba(0, 229, 255, 0.2);
                    border-radius: 16px;
                    padding: 16px 18px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                .card-section-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 13px;
                    font-weight: 900;
                    color: #00E5FF;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px dashed rgba(0, 229, 255, 0.25);
                }

                .card-section-title span.badge {
                    font-size: 10.5px;
                    padding: 2px 8px;
                    border-radius: 6px;
                    background: rgba(0, 229, 255, 0.15);
                    color: #00E5FF;
                    font-weight: 800;
                }

                .form-grid-3 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    align-items: start;
                }

                .form-field-unit {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .form-field-label {
                    font-size: 12px;
                    font-weight: 800;
                    color: #94A3B8;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .field-input {
                    height: 42px;
                    width: 100%;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(11, 14, 20, 0.7);
                    padding: 0 12px;
                    font-size: 13px;
                    font-weight: 700;
                    color: #F8FAFC;
                    box-sizing: border-box;
                    outline: none;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .field-input:focus {
                    background: rgba(20, 24, 34, 0.95);
                    border-color: #00E5FF;
                    box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
                }

                .field-input[readonly] {
                    background: rgba(255, 255, 255, 0.04);
                    color: #64748b;
                    cursor: not-allowed;
                    border-color: rgba(255, 255, 255, 0.06);
                }

                .barcode-scan-container {
                    margin-bottom: 12px;
                    padding: 8px 12px;
                    background: rgba(20, 24, 34, 0.5);
                    border: 1px dashed rgba(0, 229, 255, 0.3);
                    border-radius: 12px;
                }

                .add-item-bar {
                    display: grid;
                    grid-template-columns: 2.2fr 1fr 1fr 1fr 1.1fr;
                    gap: 10px;
                    align-items: flex-end;
                }

                .btn-add-line {
                    height: 42px;
                    background: linear-gradient(135deg, #00E5FF, #0077B6);
                    color: #0B0E14;
                    border: none;
                    border-radius: 12px;
                    font-weight: 900;
                    font-size: 13px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 10px rgba(0, 229, 255, 0.25);
                    white-space: nowrap;
                }

                .btn-add-line:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0, 229, 255, 0.35);
                    filter: brightness(1.05);
                }

                .btn-add-line:active {
                    transform: scale(0.98);
                }

                .table-scroll-wrap {
                    overflow-x: auto;
                    border-radius: 14px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(15, 20, 30, 0.6);
                    margin-top: 14px;
                }

                .invoice-items-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: center;
                    font-size: 12.5px;
                }

                .invoice-items-table th {
                    background: rgba(11, 14, 20, 0.9);
                    color: #00E5FF;
                    padding: 10px 12px;
                    font-weight: 900;
                    font-size: 12px;
                    letter-spacing: 0.2px;
                    border-bottom: 1px solid rgba(0, 229, 255, 0.2);
                }

                .invoice-items-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    font-weight: 700;
                    color: #F8FAFC;
                }

                .invoice-items-table tr:hover td {
                    background: rgba(0, 229, 255, 0.05);
                }

                .table-del-btn {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    transition: 0.2s;
                }

                .table-del-btn:hover {
                    background: #dc2626;
                    color: white;
                }

                .financial-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-top: 12px;
                }

                .stat-box {
                    background: rgba(20, 24, 34, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    padding: 10px 14px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .stat-box.highlight {
                    background: linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(0, 119, 182, 0.3));
                    color: white;
                    border-color: #00E5FF;
                    box-shadow: 0 6px 18px rgba(0, 229, 255, 0.2);
                }

                .stat-box-title {
                    font-size: 11px;
                    font-weight: 800;
                    color: #94A3B8;
                }

                .stat-box.highlight .stat-box-title {
                    color: #00E5FF;
                }

                .stat-box-value {
                    font-size: 17px;
                    font-weight: 900;
                    color: #F8FAFC;
                }

                .stat-box.highlight .stat-box-value {
                    color: #00E5FF;
                    font-size: 20px;
                }

                .actions-row {
                    display: flex;
                    gap: 12px;
                    margin-top: 10px;
                }

                @media (max-width: 768px) {
                    .form-grid-3 {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
                    }
                    .add-item-bar {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
                    }
                    .financial-stats-grid {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 8px !important;
                    }
                    .actions-row {
                        flex-direction: column !important;
                    }
                    .btn-add-line {
                        width: 100% !important;
                    }
                }
            `}</style>

            <div className="invoice-modal-flow">
                
                {/* 📋 بطاقة 1: البيانات الأساسية وأطراف الفاتورة */}
                <div className="desert-form-card" style={{ zIndex: 100, position: 'relative' }}>
                    <div className="card-section-title">
                        <span>📋 البيانات الأساسية وأطراف الفاتورة</span>
                        <span className="badge">خطوة 1 من 4</span>
                    </div>

                    <div className="form-grid-3" style={{ marginBottom: '12px' }}>
                        {/* 1. العميل */}
                        <div className="form-field-unit" style={{ zIndex: 105, position: 'relative' }}>
                            <SmartCombo 
                                label="العميل (البارتنر)" 
                                icon="👤"
                                table="partners" 
                                searchCols="name,code,phone" 
                                displayCol="name"
                                initialDisplay={record.client_name || record.partners?.name || ''} 
                                onSelect={(p: any) => setRecord({
                                    ...record, 
                                    partner_id: p?.id || null, 
                                    client_name: p?.name || ''
                                })} 
                                allowAddNew={true} 
                                enableClear={true}
                                placeholder="ابحث بالاسم أو الهاتف أو الكود..."
                            />
                        </div>

                        {/* 2. طريقة السداد */}
                        <div className="form-field-unit">
                            <label className="form-field-label">💳 طريقة السداد</label>
                            <select 
                                className="field-input" 
                                value={record.payment_method || 'آجل'} 
                                onChange={e => setRecord({ ...record, payment_method: e.target.value })}
                            >
                                <option value="آجل">آجل (ذمم مدينة)</option>
                                <option value="نقدي">نقدي (كاش)</option>
                                <option value="تحويل بنكي">تحويل بنكي</option>
                                <option value="شبكة">شبكة / بطاقة مدى</option>
                            </select>
                        </div>

                        {/* 3. حالة الفاتورة */}
                        <div className="form-field-unit">
                            <label className="form-field-label">⚙️ حالة الفاتورة والاعتماد</label>
                            <select 
                                className="field-input" 
                                value={['posted', 'معتمد', 'مرحل', 'approved'].includes(String(record.status || '').trim().toLowerCase()) || record.is_posted === true ? 'معتمد' : 'معلق'} 
                                onChange={e => setRecord({ ...record, status: e.target.value })}
                            >
                                <option value="معلق">⏳ مسودة معلقة (قابلة للتعديل)</option>
                                <option value="معتمد">✅ معتمد ومرحل للحسابات</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-grid-3">
                        {/* 4. تاريخ الفاتورة */}
                        <div className="form-field-unit">
                            <label className="form-field-label">📅 تاريخ الفاتورة</label>
                            <input 
                                type="date" 
                                value={record.date?.split('T')[0] ?? ''} 
                                onChange={(e) => setRecord({ ...record, date: e.target.value })} 
                                className="field-input" 
                            />
                        </div>

                        {/* 5. فترة السداد والاستحقاق */}
                        <div className="form-field-unit">
                            <label className="form-field-label">⏱️ فترة السداد (بالأيام)</label>
                            <input 
                                type="number" 
                                min="0"
                                placeholder="مثلاً: 30" 
                                value={record.due_in_days ?? ''} 
                                onChange={(e) => setRecord({ ...record, due_in_days: e.target.value })} 
                                className="field-input" 
                            />
                            {record.due_date && (
                                <div style={{ fontSize: '11px', color: '#A8573C', fontWeight: 800, marginTop: '2px' }}>
                                    📅 الاستحقاق: {new Date(record.due_date).toLocaleDateString('ar-EG')}
                                </div>
                            )}
                        </div>

                        {/* 6. رقم الفاتورة التلقائي */}
                        <div className="form-field-unit">
                            <label className="form-field-label">🔢 رقم الفاتورة (تلقائي)</label>
                            <input 
                                type="text" 
                                value={record.invoice_number ?? ''} 
                                readOnly 
                                className="field-input" 
                            />
                        </div>
                    </div>
                </div>

                {/* 🚚 بطاقة 2: التنفيذ واللوجستيات والمخازن */}
                <div className="desert-form-card" style={{ zIndex: 90, position: 'relative' }}>
                    <div className="card-section-title">
                        <span>🚚 التنفيذ واللوجستيات والمخازن</span>
                        <span className="badge">ربط التوزيع</span>
                    </div>

                    <div className="form-grid-3">
                        {/* 1. المستودع */}
                        <div className="form-field-unit">
                            <label className="form-field-label">🏭 المستودع (مصدر البضاعة)</label>
                            <select 
                                className="field-input" 
                                value={record?.warehouse_id || ''} 
                                onChange={e => setRecord({ ...record, warehouse_id: e.target.value })}
                            >
                                <option value="">-- اختر المستودع المورد --</option>
                                {warehouses?.map((wh: any) => (
                                    <option key={wh.id} value={wh.id}>
                                        {wh.type === 'main' ? '🏢' : (wh.type === 'vehicle' ? '🚚' : (wh.type === 'pos' ? '🏪' : '🏭'))} {wh.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. رحلة التوزيع */}
                        <div className="form-field-unit">
                            <label className="form-field-label">🚛 رحلة التوزيع (أمر تشغيل أسطول)</label>
                            <select 
                                className="field-input" 
                                value={record?.fleet_operation_id || ''} 
                                onChange={e => {
                                    const opId = e.target.value;
                                    const selectedOp = fleetOperations?.find((op: any) => String(op.id) === String(opId));
                                    setRecord({
                                        ...record, 
                                        fleet_operation_id: opId,
                                        delegate_id: selectedOp?.driver_id || record.delegate_id
                                    });
                                }}
                            >
                                <option value="">-- اختياري: ربط برحلة توزيع --</option>
                                {fleetOperations?.map((op: any) => (
                                    <option key={op.id} value={op.id}>{op.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. المندوب */}
                        <div className="form-field-unit">
                            <label className="form-field-label">👤 المندوب (المسؤول عن التحصيل)</label>
                            <select 
                                className="field-input" 
                                value={record?.delegate_id || ''} 
                                onChange={e => setRecord({ ...record, delegate_id: e.target.value })}
                            >
                                <option value="">-- اختياري: اختر المندوب --</option>
                                {delegates?.map((del: any) => (
                                    <option key={del.id} value={del.id}>{del.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 📦 بطاقة 3: بنود الفاتورة وإضافة الأصناف */}
                <div className="desert-form-card" style={{ zIndex: 80, position: 'relative' }}>
                    <div className="card-section-title">
                        <span>📦 بنود الفاتورة وإضافة الأصناف</span>
                        <span className="badge">{record.lines?.length || 0} صنف مضاف</span>
                    </div>

                    {/* قارئ الباركود السريع */}
                    <div className="barcode-scan-container">
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#A8573C', marginBottom: '4px' }}>
                            📷 مسح الباركود السريع (استخدم قارئ الليزر أو كاميرا الجوال):
                        </div>
                        <BarcodeScannerWidget onScan={handleBarcodeScan} placeholder="امسح باركود الصنف أو اكتبه واضغط Enter..." />
                    </div>

                    {/* شريط إضافة صنف */}
                    <div className="add-item-bar">
                        <div className="form-field-unit" style={{ zIndex: 85, position: 'relative' }}>
                            <label className="form-field-label">🏷️ اسم الصنف / البيان</label>
                            <SmartCombo 
                                options={warehouseItems?.map((i: any) => ({
                                    ...i,
                                    displayName: i.quantity === 'غير محدد' ? i.name : `${i.name} (متوفر بالمخزن: ${i.quantity} ${i.unit || ''})`
                                })) || []}
                                displayCol="displayName"
                                initialDisplay={record.description || ''}
                                placeholder="اختر من المخزون أو اكتب اسماً..."
                                freeText={true}
                                onSelect={(val: any) => {
                                    if (typeof val === 'string') {
                                        setRecord({ ...record, description: val });
                                    } else if (val) {
                                        setRecord({
                                            ...record, 
                                            description: val.name,
                                            unit: val.unit || 'عدد',
                                            unit_price: val.price || 0,
                                            item_id: val.id,
                                            tax_rate: (val.tax_rate !== undefined && val.tax_rate !== null) ? Number(val.tax_rate) : 15
                                        });
                                    }
                                }}
                            />
                        </div>

                        <div className="form-field-unit">
                            <label className="form-field-label">الكمية</label>
                            <input 
                                type="number" 
                                min="1"
                                placeholder="1"
                                value={record.quantity ?? ''} 
                                onChange={(e) => setRecord({ ...record, quantity: e.target.value })} 
                                className="field-input" 
                            />
                        </div>

                        <div className="form-field-unit">
                            <label className="form-field-label">الوحدة</label>
                            <select 
                                value={record.unit ?? 'عدد'} 
                                onChange={(e) => setRecord({ ...record, unit: e.target.value })} 
                                className="field-input"
                            >
                                <option value="عدد">عدد / حبة</option>
                                <option value="كرتون">كرتون</option>
                                <option value="طن">طن</option>
                                <option value="كجم">كيلوجرام</option>
                                <option value="متر طولي">متر طولي</option>
                                <option value="متر مربع">متر مربع</option>
                                <option value="مقطوعية">مقطوعية</option>
                            </select>
                        </div>

                        <div className="form-field-unit">
                            <label className="form-field-label">سعر الوحدة</label>
                            <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                placeholder="0.00"
                                value={record.unit_price ?? ''} 
                                onChange={(e) => setRecord({ ...record, unit_price: e.target.value })} 
                                className="field-input" 
                            />
                        </div>

                        <button 
                            type="button" 
                            onClick={handleAddStatement} 
                            className="btn-add-line"
                            title="إضافة الصنف إلى جدول الفاتورة"
                        >
                            <span>➕</span>
                            <span>إدراج الصنف</span>
                        </button>
                    </div>

                    {/* جدول الأصناف */}
                    {record.lines && record.lines.length > 0 ? (
                        <div className="table-scroll-wrap cinematic-scroll">
                            <table className="invoice-items-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>#</th>
                                        <th style={{ textAlign: 'right' }}>الصنف / البيان</th>
                                        <th style={{ width: '80px' }}>الكمية</th>
                                        <th style={{ width: '90px' }}>الوحدة</th>
                                        <th style={{ width: '100px' }}>السعر</th>
                                        <th style={{ width: '120px' }}>الإجمالي</th>
                                        <th style={{ width: '50px' }}>حذف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {record.lines.map((line: any, idx: number) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 900, color: '#64748b' }}>{idx + 1}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 800 }}>{line.description}</td>
                                            <td>{line.quantity}</td>
                                            <td>{line.unit}</td>
                                            <td>{formatCurrency(line.unit_price)}</td>
                                            <td style={{ fontWeight: 900, color: '#2C1A12' }}>{formatCurrency(line.total_price)}</td>
                                            <td>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveLine(idx)} 
                                                    className="table-del-btn"
                                                    title="حذف هذا الصنف من الفاتورة"
                                                >
                                                    ✖
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ 
                            marginTop: '12px', 
                            padding: '14px', 
                            textAlign: 'center', 
                            background: 'rgba(255, 255, 255, 0.4)', 
                            borderRadius: '12px', 
                            color: '#64748b', 
                            fontSize: '12px', 
                            fontWeight: 700 
                        }}>
                            📦 لم يتم إدراج أصناف بعد — اختر صنفاً أو امسح الباركود واضغط "إدراج الصنف" للإضافة
                        </div>
                    )}
                </div>

                {/* 💳 بطاقة 4: التوجيه المحاسبي والملخص المالي */}
                <div className="desert-form-card" style={{ zIndex: 70, position: 'relative' }}>
                    <div className="card-section-title">
                        <span>💳 التوجيه المحاسبي والملخص المالي</span>
                        <span className="badge">الحسابات والضريبة</span>
                    </div>

                    {/* الحسابات الدائنة والمدينة */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ zIndex: 75, position: 'relative' }}>
                            <SmartCombo 
                                key={`debit-${record.debit_account_id || 'empty'}`}
                                label="حساب المدين (من حـ/ العميل أو الصندوق)" 
                                icon="💳"
                                table="accounts" 
                                searchCols="name,code" 
                                displayCol="name"
                                initialDisplay={record.debit_account_name || record.debit_account?.name || ''}
                                onSelect={(a: any) => setRecord({
                                    ...record, 
                                    debit_account_id: a?.id || null, 
                                    debit_account_name: a?.name || ''
                                })} 
                                placeholder="ابحث في دليل الحسابات..."
                            />
                        </div>

                        <div style={{ zIndex: 74, position: 'relative' }}>
                            <SmartCombo 
                                key={`credit-${record.credit_account_id || 'empty'}`}
                                label="حساب الدائن (إلى حـ/ المبيعات)" 
                                icon="🏦"
                                table="accounts" 
                                searchCols="name,code" 
                                displayCol="name"
                                initialDisplay={record.credit_account_name || record.credit_account?.name || ''}
                                onSelect={(a: any) => setRecord({
                                    ...record, 
                                    credit_account_id: a?.id || null, 
                                    credit_account_name: a?.name || ''
                                })} 
                                placeholder="ابحث في دليل الحسابات..."
                            />
                        </div>
                    </div>

                    {/* كروت المجاميع والضريبة */}
                    <div className="financial-stats-grid">
                        <div className="stat-box">
                            <span className="stat-box-title">إجمالي البنود</span>
                            <span className="stat-box-value">{formatCurrency(record.line_total ?? 0)}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-box-title">الخاضع للضريبة</span>
                            <span className="stat-box-value">{formatCurrency(record.taxable_amount ?? 0)}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-box-title">ضريبة القيمة المضافة</span>
                            <span className="stat-box-value" style={{ color: record.skip_zatca ? '#dc2626' : '#4E734F' }}>
                                {record.skip_zatca ? '0.00 ر.س (معفى)' : formatCurrency(record.tax_amount ?? 0)}
                            </span>
                        </div>
                        <div className="stat-box highlight">
                            <span className="stat-box-title">الصافي المطلوب سداده</span>
                            <span className="stat-box-value">{formatCurrency(record.total_amount ?? 0)}</span>
                        </div>
                    </div>
                </div>

                {/* أزرار الحفظ والإلغاء */}
                <div className="actions-row">
                    <button 
                        type="button" 
                        onClick={handleValidateAndSave} 
                        disabled={isSaving} 
                        className="btn-glass-save" 
                        style={{ flex: 2, height: '46px', fontSize: '15px' }}
                    >
                        {isSaving ? '⏳ جاري حفظ الفاتورة...' : '✅ حفظ الفاتورة (Ctrl+Enter)'}
                    </button>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="btn-glass-cancel" 
                        style={{ flex: 1, height: '46px', fontSize: '14px' }}
                    >
                        إلغاء (Esc)
                    </button>
                </div>

            </div>
        </AquaModalWrapper>
    );
}
