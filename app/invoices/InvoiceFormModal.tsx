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
export default function InvoiceFormModal({ isOpen, onClose, record, setRecord, onSave, isSaving, fleetOperations, warehouses, delegates, warehouseItems }: any) {
    const { showToast } = useToast(); 
    const [mounted, setMounted] = useState(false); // 🚀 للتأكد من الرندر في المتصفح

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
            updates.date = record.date || new Date().toISOString();
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
        
        // 💡 حساب الضريبة (لو متعلم إنها مش خاضعة بيديها 0، لو خاضعة بيحسب 15%)
        const taxAmount = record.skip_zatca ? 0 : (taxableAmount * 0.15); 
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
    }, [record?.quantity, record?.unit_price, record?.materials_discount, record?.guarantee_percent, record?.date, record?.due_in_days, record?.skip_zatca, record?.lines]); 

    // 🚀 دالة إضافة البيان للجدول
    const handleAddStatement = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!record.description) {
            showToast("يرجى إدخال البيان التفصيلي أولاً ⚠️", "warning");
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
            item_id: record.item_id || null
        };

        setRecord({
            ...record,
            lines: [...(record.lines || []), newStatement],
            // تصفير الخانات المكتوبة بعد ما نزلناهم في الجدول
            description: '',
            quantity: '',
            unit_price: '',
            boq_id: null,
            item_id: null
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
                quantity: 1
            });
            showToast(`تم العثور على: ${foundItem.name}`, 'success');
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
            // إظهار أول خطأ تم التقاطه بواسطة Zod
            const errObj: any = validationResult.error;
            const firstError = errObj.issues?.[0]?.message || errObj.errors?.[0]?.message || "بيانات الفاتورة غير مكتملة";
            showToast(`${firstError} ⚠️`, "warning");
            return;
        }
        
        onSave(record);
    };

    if (!isOpen || !mounted) return null;

    // 📦 محتوى المودال
    const zatcaToggle = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: record?.skip_zatca ? '#fee2e2' : '#dcfce3', padding: '8px 15px', borderRadius: '15px', cursor: 'pointer', transition: '0.3s', border: `1px solid ${record?.skip_zatca ? '#fca5a5' : '#86efac'}` }} 
             onClick={() => setRecord({ ...record, skip_zatca: !record.skip_zatca })}>
            <div style={{ width: '40px', height: '22px', background: record?.skip_zatca ? 'rgba(40, 145, 200, 0.2)' : THEME.success, borderRadius: '20px', position: 'relative', transition: '0.3s' }}>
                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: record?.skip_zatca ? '2px' : '20px', transition: '0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 900, color: record?.skip_zatca ? '#dc2626' : THEME.success }}>
                {record?.skip_zatca ? '❌ غير خاضعة (0%)' : '✅ خاضعة (15%)'}
            </span>
        </div>
    );

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={record.id ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}
            icon="📑"
            width="950px"
            headerExtra={zatcaToggle}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                    
                    {/* السطر الأول: البيانات الأساسية والعميل */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        <div style={{ zIndex: 100 }}>
                            <SmartCombo 
                                label="العميل (البارتنر)" 
                                icon="👤"
                                table="partners" 
                                searchCols="name,code" displayCol="name"
                                initialDisplay={record.client_name || record.partners?.name || ''} 
                                onSelect={(p: any) => setRecord({...record, partner_id: p?.id || null, client_name: p?.name || ''})} 
                                allowAddNew={true} 
                                enableClear={true}
                            />
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>طريقة السداد</label>
                            <select 
                                className="glass-input-field" 
                                value={record.payment_method || 'آجل'} 
                                onChange={e => setRecord({...record, payment_method: e.target.value})}
                            >
                                <option value="آجل">آجل</option>
                                <option value="نقدي">نقدي</option>
                                <option value="تحويل بنكي">تحويل بنكي</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>تاريخ الفاتورة</label>
                            <input type="date" value={record.date?.split('T')[0] ?? ''} onChange={(e) => setRecord({...record, date: e.target.value})} className="glass-input-field" />
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>📅 فترة السداد (بالأيام)</label>
                            <input 
                                type="number" 
                                placeholder="مثلاً: 30" 
                                value={record.due_in_days ?? ''} 
                                onChange={(e) => setRecord({...record, due_in_days: e.target.value})} 
                                className="glass-input-field"
                                style={{ border: `2px solid ${THEME.accent}70` }} 
                            />
                            {record.due_date && (
                                <div style={{ fontSize: '10px', marginTop: '4px', color: '#475569', fontWeight: 800 }}>
                                    الاستحقاق: <span style={{color: THEME.primary}}>{new Date(record.due_date).toLocaleDateString('ar-EG')}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>رقم الفاتورة (تلقائي)</label>
                            <input type="text" value={record.invoice_number ?? ''} readOnly className="glass-input-field" style={{ background: 'rgba(226, 232, 240, 0.6)', color: THEME.primary }} />
                        </div>
                    </div>

                    {/* السطر الثاني: بيانات التنفيذ (المستودع، رحلة التوزيع، المندوب) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px' }}>
                        
                        <div style={{ zIndex: 99 }}>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>🏭 المستودع (من أين تصرف البضاعة؟)</label>
                            <select 
                                className="glass-input-field" 
                                value={record?.warehouse_id || ''} 
                                onChange={e => setRecord({...record, warehouse_id: e.target.value})}
                            >
                                <option value="">-- اختر المستودع --</option>
                                  {warehouses?.map((wh: any) => (
                                      <option key={wh.id} value={wh.id}>
                                          {wh.type === 'main' ? '🏢' : (wh.type === 'vehicle' ? '🚚' : (wh.type === 'pos' ? '🏪' : '🏭'))} {wh.name}
                                      </option>
                                  ))}
                            </select>
                        </div>

                        <div style={{ zIndex: 98 }}>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>🚚 رحلة التوزيع (أمر تشغيل)</label>
                            <select 
                                className="glass-input-field" 
                                value={record?.fleet_operation_id || ''} 
                                onChange={e => {
                                    const opId = e.target.value;
                                    const selectedOp = fleetOperations?.find((op: any) => String(op.id) === String(opId));
                                    setRecord({
                                        ...record, 
                                        fleet_operation_id: opId,
                                        delegate_id: selectedOp?.driver_id || record.delegate_id // 🚀 سحب المندوب تلقائياً من الرحلة
                                    });
                                }}
                            >
                                <option value="">-- ربط برحلة توزيع --</option>
                                  {fleetOperations?.map((op: any) => (
                                      <option key={op.id} value={op.id}>{op.name}</option>
                                  ))}
                            </select>
                        </div>

                        <div style={{ zIndex: 97 }}>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>👤 المندوب (المسؤول عن الفاتورة)</label>
                            <select 
                                className="glass-input-field" 
                                value={record?.delegate_id || ''} 
                                onChange={e => setRecord({...record, delegate_id: e.target.value})}
                            >
                                <option value="">-- اختر المندوب --</option>
                                  {delegates?.map((del: any) => (
                                      <option key={del.id} value={del.id}>{del.name}</option>
                                  ))}
                            </select>
                        </div>

                    </div>
                </div>

                {/* 2. Statement Line Section */}
                <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', marginBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr', gap: '10px', alignItems: 'end', marginBottom: '10px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>البيان التفصيلي (الصنف)</label>
                            <BarcodeScannerWidget onScan={handleBarcodeScan} placeholder="امسح الباركود للكتابة..." />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr', gap: '10px', alignItems: 'end' }}>
                        <div>
                            <div style={{ zIndex: 10 }}>
                                <SmartCombo 
                                    options={warehouseItems?.map((i: any) => ({
                                        ...i,
                                        displayName: i.quantity === 'غير محدد' ? i.name : `${i.name} (متوفر: ${i.quantity} ${i.unit || ''})`
                                    })) || []}
                                    displayCol="displayName"
                                    initialDisplay={record.description || ''}
                                    placeholder="اختر أو اكتب اسم الصنف..."
                                    freeText={true}
                                    onSelect={(val: any) => {
                                        if (typeof val === 'string') {
                                            setRecord({...record, description: val});
                                        } else if (val) {
                                            setRecord({
                                                ...record, 
                                                description: val.name,
                                                unit: val.unit || 'عدد',
                                                unit_price: val.price || 0,
                                                item_id: val.id
                                            });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>العدد / الكمية</label>
                            <input type="number" value={record.quantity ?? ''} onChange={(e) => setRecord({...record, quantity: e.target.value})} className="glass-input-field" />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>الوحدة</label>
                            <select value={record.unit ?? 'عدد'} onChange={(e) => setRecord({...record, unit: e.target.value})} className="glass-input-field" style={{ appearance: 'auto' }}>
                                {record.unit && !['متر طولي', 'متر مربع', 'متر مكعب', 'مقطوعية', 'عدد'].includes(record.unit) && (
                                    <option value={record.unit}>{record.unit}</option>
                                )}
                                <option value="متر طولي">متر طولي</option>
                                <option value="متر مربع">متر مربع</option>
                                <option value="متر مكعب">متر مكعب</option>
                                <option value="مقطوعية">مقطوعية</option>
                                <option value="عدد">عدد</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>سعر الوحدة</label>
                            <input type="number" value={record.unit_price ?? ''} onChange={(e) => setRecord({...record, unit_price: e.target.value})} className="glass-input-field" />
                        </div>

                        <button type="button" onClick={handleAddStatement} style={{ background: THEME.accent, color: 'white', border: 'none', height: '38px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', transition: '0.3s', marginTop: 'auto' }}>
                            ➕ إدراج
                        </button>
                    </div>
                </div>

                    {/* 💎 أمان الدالة (record.lines || []) لضمان عدم حدوث Crash */}
                    {record.lines && record.lines.length > 0 && (
                        <div style={{ gridColumn: 'span 3', background: 'rgba(255,255,255,0.6)', padding: '10px', borderRadius: '16px', border: `1px solid ${THEME.border}` }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: THEME.primary, color: 'white', padding: '8px', borderRadius: '0 8px 8px 0', fontSize: '12px' }}>م</th>
                                        <th style={{ background: THEME.primary, color: 'white', padding: '8px', textAlign: 'right', fontSize: '12px' }}>البيان</th>
                                        <th style={{ background: THEME.primary, color: 'white', padding: '8px', fontSize: '12px' }}>الكمية</th>
                                        <th style={{ background: THEME.primary, color: 'white', padding: '8px', fontSize: '12px' }}>الوحدة</th>
                                        <th style={{ background: THEME.primary, color: 'white', padding: '8px', fontSize: '12px' }}>السعر</th>
                                        <th style={{ background: THEME.primary, color: 'white', padding: '8px', fontSize: '12px' }}>الإجمالي</th>
                                        <th style={{ background: THEME.primary, color: 'white', padding: '8px', borderRadius: '8px 0 0 0', fontSize: '12px' }}>إجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(record.lines || []).map((line: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <td style={{ padding: '8px', fontWeight: 900 }}>{idx + 1}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{line.description}</td>
                                            <td style={{ padding: '8px', fontWeight: 700 }}>{line.quantity}</td>
                                            <td style={{ padding: '8px', fontWeight: 700 }}>{line.unit}</td>
                                            <td style={{ padding: '8px', fontWeight: 700 }}>{formatCurrency(line.unit_price)}</td>
                                            <td style={{ padding: '8px', fontWeight: 900, color: THEME.primary }}>{formatCurrency(line.total_price)}</td>
                                            <td style={{ padding: '8px' }}>
                                                <button type="button" onClick={() => handleRemoveLine(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 900 }}>✖</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 3. Accounting & Summary Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <SmartCombo 
                            key={`debit-${record.debit_account_id || 'empty'}`}
                            label="حساب المدين (من حـ/)" 
                            icon="💳"
                            table="accounts" 
                            searchCols="name,code" displayCol="name"
                            initialDisplay={record.debit_account_name || record.debit_account?.name || ''}
                            onSelect={(a: any) => setRecord({...record, debit_account_id: a?.id || null, debit_account_name: a?.name || ''})} 
                        />
                        <SmartCombo 
                            key={`credit-${record.credit_account_id || 'empty'}`}
                            label="حساب الدائن (إلى حـ/)" 
                            icon="🏦"
                            table="accounts" 
                            searchCols="name,code" displayCol="name"
                            initialDisplay={record.credit_account_name || record.credit_account?.name || ''}
                            onSelect={(a: any) => setRecord({...record, credit_account_id: a?.id || null, credit_account_name: a?.name || ''})} 
                        />
                        
                        <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', padding: '10px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>الإجمالي قبل الخصم</div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: THEME.primary }}>{formatCurrency(record.line_total ?? 0)}</div>
                        </div>
                    </div>

                <div className="responsive-summary-grid" style={{ marginTop: '15px', padding: '15px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '24px', color: 'white', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 800 }}>خاضع للضريبة</div>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(record.taxable_amount ?? 0)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 800 }}>الضريبة (15%)</div>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{formatCurrency(record.tax_amount ?? 0)}</div>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, ${THEME.accent}40, transparent)`, padding: '10px', borderRadius: '16px', border: `1px solid ${THEME.accent}80`, boxShadow: `0 0 20px ${THEME.accent}20` }}>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: THEME.accentLight }}>الصافي النهائي</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{formatCurrency(record.total_amount ?? 0)}</div>
                    </div>
                </div>

                <div className="responsive-actions" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button onClick={handleValidateAndSave} disabled={isSaving} className="btn-glass-save" style={{ flex: 2, padding: '12px' }}>
                        {isSaving ? '⏳ جاري الحفظ...' : '✅ حفظ الفاتورة'}
                    </button>
                    <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1, padding: '12px' }}>
                        إلغاء
                    </button>
                </div>
        </AquaModalWrapper>
    );
}
