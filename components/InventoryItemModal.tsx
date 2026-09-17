"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import SearchableSelect from './SearchableSelect';
import TranslatableInput from './TranslatableInput';
import { THEME } from '@/lib/theme';
import { BarcodeCameraButton } from './BarcodeScannerWidget';

async function printBarcodeLabel(barcode: string, itemName: string, price?: number) {
  if (!barcode?.trim()) return;
  const win = window.open('', '_blank', 'width=420,height=320');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>ملصق</title>
<style>@page{size:58mm 40mm;margin:1.5mm}*{box-sizing:border-box;margin:0;padding:0}body{width:58mm;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;background:white;padding:2mm;min-height:35mm}.name{font-size:9pt;font-weight:bold;text-align:center;margin-bottom:1.5mm;max-width:54mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.price{font-size:8pt;color:#2C1A12;font-weight:bold;margin-top:1.5mm}svg{max-width:54mm}</style>
</head><body>
<div class="name">${itemName || 'صنف'}</div>
<svg id="bc"></svg>
${price ? `<div class="price">السعر: ${price} ر.س</div>` : ''}
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script>window.onload=function(){try{JsBarcode('#bc','${barcode}',{format:'CODE128',width:2,height:55,displayValue:true,fontSize:13,margin:4});}catch(e){JsBarcode('#bc','${barcode}',{format:'auto',width:2,height:55,displayValue:true,fontSize:13,margin:4});}setTimeout(function(){window.print();window.close();},500);};<\/script>
</body></html>`);
  win.document.close();
}

export default function InventoryItemModal({ isOpen, onClose, currentRecord, setCurrentRecord, handleSave, isSaving }: any) {
  const [mounted, setMounted] = useState(false);

  // حالة محلية مستقلة لمنع إعادة رسم الصفحة بالكامل عند كتابة كل حرف
  const [formData, setFormData] = useState<any>({
    code: '',
    name: '',
    unit: 'حبة',
    cost_price: '',
    suggested_price: '',
    reorder_level: 5,
    current_quantity: '',
    is_returnable_bottle: false,
    tax_rate: 15,
    notes: '',
    expiry_date: '',
    batch_number: '',
    alert_before_days: 30
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: currentRecord?.id || undefined,
        code: currentRecord?.code || '',
        name: currentRecord?.name || '',
        unit: currentRecord?.unit || 'حبة',
        cost_price: (currentRecord?.cost_price !== undefined && currentRecord?.cost_price !== null) ? currentRecord.cost_price : '',
        suggested_price: (currentRecord?.suggested_price !== undefined && currentRecord?.suggested_price !== null) ? currentRecord.suggested_price : ((currentRecord?.default_price !== undefined && currentRecord?.default_price !== null) ? currentRecord.default_price : ''),
        reorder_level: (currentRecord?.reorder_level !== undefined && currentRecord?.reorder_level !== null) ? currentRecord.reorder_level : 5,
        current_quantity: (currentRecord?.current_quantity !== undefined && currentRecord?.current_quantity !== null) ? currentRecord.current_quantity : '',
        is_returnable_bottle: Boolean(currentRecord?.is_returnable_bottle),
        tax_rate: (currentRecord?.tax_rate !== undefined && currentRecord?.tax_rate !== null) ? Number(currentRecord.tax_rate) : 15,
        notes: currentRecord?.notes || '',
        expiry_date: currentRecord?.expiry_date || '',
        batch_number: currentRecord?.batch_number || '',
        alert_before_days: currentRecord?.alert_before_days || 30
      });
    }
  }, [isOpen, currentRecord]);

  const handleBarcodeDetected = useCallback((code: string) => {
    setFormData((prev: any) => ({ ...prev, code }));
    if (setCurrentRecord) setCurrentRecord((prev: any) => ({ ...prev, code }));
  }, [setCurrentRecord]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (setCurrentRecord) {
      setCurrentRecord((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const onSubmit = () => {
    if (handleSave) {
      handleSave(formData);
    }
  };

  if (!mounted || !isOpen) return null;
  const hasBarcode = !!(formData.code?.trim());

  return (
    <>
      <AquaModalWrapper 
        isOpen={isOpen} 
        onClose={onClose}
        title={formData.id ? 'تعديل بيانات الصنف 📝' : 'إضافة صنف جديد للدليل 📦'}
        icon={formData.id ? '✏️' : '📦'} 
        width="720px"
      >
        <style>{`
          .item-modal-section {
            background: rgba(255, 253, 250, 0.7);
            border: 1px solid rgba(194, 155, 98, 0.25);
            border-radius: 16px;
            padding: 14px 16px;
            margin-bottom: 12px;
          }

          .item-modal-sec-title {
            font-size: 13px;
            font-weight: 900;
            color: #2C1A12;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            border-bottom: 1px dashed rgba(194, 155, 98, 0.25);
            padding-bottom: 6px;
          }

          .item-modal-grid-2 {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 12px;
          }

          .item-modal-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
          }

          .item-modal-label {
            font-size: 12px;
            font-weight: 900;
            color: #2C1A12;
            margin-bottom: 5px;
            display: block;
          }

          .item-modal-input {
            width: 100%;
            height: 40px;
            padding: 8px 12px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            box-sizing: border-box;
          }

          .item-bottle-toggle {
            background: rgba(241, 245, 249, 0.7);
            border: 1px solid rgba(203, 213, 225, 0.8);
            border-radius: 14px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .item-bottle-toggle.active {
            background: linear-gradient(135deg, rgba(194, 155, 98, 0.15) 0%, rgba(168, 87, 60, 0.15) 100%);
            border-color: #C29B62;
            box-shadow: 0 4px 12px rgba(194, 155, 98, 0.15);
          }

          .item-footer-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
          }

          @media (max-width: 768px) {
            .item-modal-section {
              padding: 10px 12px !important;
              margin-bottom: 10px !important;
              border-radius: 12px !important;
            }

            .item-modal-grid-2 {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }

            .item-modal-grid-3 {
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
            }

            .item-modal-grid-3 > div:last-child {
              grid-column: span 2 !important;
            }

            .item-modal-label {
              font-size: 11px !important;
              margin-bottom: 3px !important;
            }

            .item-modal-input {
              height: 38px !important;
              font-size: 13px !important;
              padding: 6px 10px !important;
            }

            .item-footer-actions {
              flex-direction: row !important;
              gap: 8px !important;
            }

            .item-footer-actions button {
              min-height: 44px !important;
              font-size: 13px !important;
              padding: 8px 10px !important;
            }
          }
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* 1. التعريف الأساسي للصنف */}
          <div className="item-modal-section">
            <div className="item-modal-sec-title">
              <span>📦</span>
              <span>البيانات الأساسية للصنف</span>
            </div>

            <TranslatableInput
              label="اسم الصنف / المنتج"
              required
              placeholder="مثال: منتجات ومكملات وفيتامينات للخيول والشاحنات..."
              value={formData.name || ''} 
              onChange={val => updateField('name', val)} 
              inputClassName="item-modal-input"
              autoFocus
            />

            <div className="item-modal-grid-2">
              <div>
                <label className="item-modal-label">
                  🏷️ كود الصنف / الباركود
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="glass-input-field item-modal-input"
                    placeholder="ادخل أو امسح الباركود..."
                    value={formData.code || ''}
                    onChange={e => updateField('code', e.target.value)}
                    style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.5px' }}
                  />
                  <BarcodeCameraButton 
                    onScan={handleBarcodeDetected}
                    size="sm"
                    title="مسح الباركود بكاميرا الكاشير الذكية"
                    style={{ width: '38px', height: '38px', borderRadius: '10px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => printBarcodeLabel(formData.code, formData.name, formData.suggested_price)}
                    disabled={!hasBarcode} 
                    title={hasBarcode ? 'طباعة ملصق الباركود' : 'ادخل كود أولاً للطباعة'}
                    style={{ 
                      width: '38px', height: '38px', flexShrink: 0, 
                      background: hasBarcode ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'rgba(148,163,184,0.25)', 
                      border: 'none', borderRadius: '10px', 
                      cursor: hasBarcode ? 'pointer' : 'not-allowed', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '17px', opacity: hasBarcode ? 1 : 0.45, 
                      transition: 'transform 0.15s' 
                    }}
                  >
                    🖨️
                  </button>
                </div>
                {hasBarcode && (
                  <div style={{ marginTop: '5px', padding: '3px 8px', background: 'rgba(194,155,98,0.12)', borderRadius: '6px', fontSize: '11px', color: '#A8573C', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>✅</span><span style={{ fontWeight: 800 }}>{formData.code}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="item-modal-label">
                  📏 وحدة القياس *
                </label>
                <SearchableSelect 
                  options={['كرتون', 'ربطة', 'حبة', 'جالون', 'شوال', 'صندوق', 'كجم', 'لتر']}
                  value={formData.unit || 'حبة'} 
                  onChange={(val: string) => updateField('unit', val)} 
                  placeholder="اختر أو اكتب وحدة القياس..." 
                />
              </div>
            </div>
          </div>

          {/* 2. الأسعار ومستويات المخزون */}
          <div className="item-modal-section">
            <div className="item-modal-sec-title">
              <span>💰</span>
              <span>التسعير ومستويات الأمان بالمخزون</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div>
                <label className="item-modal-label">🏷️ سعر التكلفة (بدون ضريبة)</label>
                <input 
                  type="number" 
                  step="any"
                  inputMode="decimal"
                  className="glass-input-field item-modal-input" 
                  placeholder="0.00"
                  value={formData.cost_price === '' ? '' : formData.cost_price} 
                  onChange={e => updateField('cost_price', e.target.value === '' ? '' : Number(e.target.value))} 
                />
              </div>

              <div>
                <label className="item-modal-label">💵 سعر البيع المقترح (ر.س)</label>
                <input 
                  type="number" 
                  step="any"
                  inputMode="decimal"
                  className="glass-input-field item-modal-input" 
                  placeholder="0.00"
                  value={formData.suggested_price === '' ? '' : formData.suggested_price} 
                  onChange={e => updateField('suggested_price', e.target.value === '' ? '' : Number(e.target.value))} 
                />
              </div>

              <div>
                <label className="item-modal-label">⚠️ حد إعادة الطلب (نواقص)</label>
                <input 
                  type="number" 
                  step="any"
                  inputMode="decimal"
                  className="glass-input-field item-modal-input" 
                  placeholder="5"
                  value={formData.reorder_level === '' ? '' : formData.reorder_level} 
                  onChange={e => updateField('reorder_level', e.target.value === '' ? '' : Number(e.target.value))} 
                />
              </div>

              <div>
                <label className="item-modal-label">📦 الرصيد الافتتاحي (اختياري)</label>
                <input 
                  type="number" 
                  step="any"
                  inputMode="decimal"
                  className="glass-input-field item-modal-input" 
                  placeholder="0"
                  value={formData.current_quantity === '' ? '' : formData.current_quantity} 
                  onChange={e => updateField('current_quantity', e.target.value === '' ? '' : Number(e.target.value))} 
                />
              </div>
            </div>
          </div>

          {/* 3. تتبع تاريخ الصلاحية ورقم التشغيلة */}
          <div className="item-modal-section" style={{ border: '1px solid rgba(194, 155, 98, 0.4)', background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.9) 0%, rgba(246, 241, 232, 0.7) 100%)' }}>
            <div className="item-modal-sec-title" style={{ color: '#A8573C' }}>
              <span>⏳</span>
              <span>مراقبة الصلاحية والتشغيلة (تنبيهات تلقائية)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label className="item-modal-label">📅 تاريخ انتهاء الصلاحية</label>
                <input 
                  type="date" 
                  className="glass-input-field item-modal-input" 
                  value={formData.expiry_date || ''} 
                  onChange={e => updateField('expiry_date', e.target.value)} 
                />
              </div>

              <div>
                <label className="item-modal-label">🏷️ رقم التشغيلة / الدفعة (Batch #)</label>
                <input 
                  type="text" 
                  className="glass-input-field item-modal-input" 
                  placeholder="مثال: BATCH-2026-A"
                  value={formData.batch_number || ''} 
                  onChange={e => updateField('batch_number', e.target.value)} 
                />
              </div>

              <div>
                <label className="item-modal-label">🔔 التنبيه قبل الانتهاء بـ (أيام)</label>
                <input 
                  type="number" 
                  min="1"
                  className="glass-input-field item-modal-input" 
                  placeholder="30"
                  value={formData.alert_before_days ?? 30} 
                  onChange={e => updateField('alert_before_days', e.target.value === '' ? 30 : Number(e.target.value))} 
                />
              </div>
            </div>
          </div>

          {/* 4. خيارات متقدمة (عهدة الفوارغ والملاحظات) */}
          <div className="item-modal-section">
            <div className="item-modal-sec-title">
              <span>⚙️</span>
              <span>خيارات إضافية ومواصفات</span>
            </div>

            {/* خيار الإعفاء الضريبي (ضريبة القيمة المضافة 0%) */}
            <div 
              onClick={() => updateField('tax_rate', Number(formData.tax_rate) === 0 ? 15 : 0)}
              className="item-bottle-toggle"
              style={{ 
                marginBottom: '12px',
                background: Number(formData.tax_rate) === 0 
                  ? 'linear-gradient(135deg, rgba(78, 115, 79, 0.15) 0%, rgba(194, 155, 98, 0.12) 100%)' 
                  : 'rgba(241, 245, 249, 0.7)',
                borderColor: Number(formData.tax_rate) === 0 ? '#4E734F' : 'rgba(203, 213, 225, 0.8)',
                boxShadow: Number(formData.tax_rate) === 0 ? '0 4px 12px rgba(78, 115, 79, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: Number(formData.tax_rate) === 0 ? 'linear-gradient(135deg, #4E734F 0%, #365337 100%)' : '#e2e8f0',
                  color: Number(formData.tax_rate) === 0 ? 'white' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  boxShadow: Number(formData.tax_rate) === 0 ? '0 2px 8px rgba(78, 115, 79, 0.35)' : 'none'
                }}>
                  {Number(formData.tax_rate) === 0 ? '🌿' : '🏷️'}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: Number(formData.tax_rate) === 0 ? '#2C1A12' : '#1e293b' }}>
                    منتج معفي من ضريبة القيمة المضافة (0% ضريبة)
                  </div>
                  <div style={{ fontSize: '11px', color: Number(formData.tax_rate) === 0 ? '#4E734F' : '#64748b', fontWeight: 700, marginTop: '2px' }}>
                    {Number(formData.tax_rate) === 0 
                      ? '🟢 معفي من الضريبة - لن يتم احتساب 15% ضريبة مضافة في المبيعات والفواتير' 
                      : '⚪ خاضع للضريبة القياسية (15% ضريبة القيمة المضافة)'}
                  </div>
                </div>
              </div>
              <div style={{
                width: '24px', height: '24px', borderRadius: '7px',
                border: Number(formData.tax_rate) === 0 ? '2px solid #4E734F' : '2px solid #94a3b8',
                background: Number(formData.tax_rate) === 0 ? '#4E734F' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 900, fontSize: '14px',
                transition: '0.2s', flexShrink: 0
              }}>
                {Number(formData.tax_rate) === 0 ? '✓' : ''}
              </div>
            </div>

            {/* عهدة العبوات والمستلزمات */}
            <div 
              onClick={() => updateField('is_returnable_bottle', !formData.is_returnable_bottle)}
              className={`item-bottle-toggle ${formData.is_returnable_bottle ? 'active' : ''}`}
              style={{ marginBottom: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: formData.is_returnable_bottle ? 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)' : '#e2e8f0',
                  color: formData.is_returnable_bottle ? 'white' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  boxShadow: formData.is_returnable_bottle ? '0 2px 8px rgba(194, 155, 98, 0.35)' : 'none'
                }}>
                  🔄
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: formData.is_returnable_bottle ? '#2C1A12' : '#1e293b' }}>
                    صنف خاضع لعهدة العبوات والمستلزمات (جالون / عبوة مسترجعة)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                    يتم احتساب الكميات المباعة تلقائياً كعهدة فوارغ لدى العميل أو المندوب
                  </div>
                </div>
              </div>
              <div style={{
                width: '24px', height: '24px', borderRadius: '7px',
                border: formData.is_returnable_bottle ? '2px solid #C29B62' : '2px solid #94a3b8',
                background: formData.is_returnable_bottle ? '#C29B62' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 900, fontSize: '14px',
                transition: '0.2s', flexShrink: 0
              }}>
                {formData.is_returnable_bottle ? '✓' : ''}
              </div>
            </div>

            <TranslatableInput
              label="ملاحظات فنية ومواصفات"
              isTextArea
              rows={2}
              placeholder="أي مواصفات فنية أو تفاصيل خاصة بالخامة..."
              value={formData.notes || ''} 
              onChange={val => updateField('notes', val)} 
            />
          </div>

        </div>

        {/* 4. أزرار الحفظ والإلغاء */}
        <div className="item-footer-actions">
          <button 
            type="button"
            onClick={onSubmit} 
            disabled={isSaving} 
            className="btn-glass-save" 
            style={{ flex: 2 }}
          >
            {isSaving ? '⏳ جاري الحفظ...' : (formData.id ? '💾 حفظ التعديلات' : '➕ إضافة الصنف')}
          </button>
          {hasBarcode && (
            <button 
              type="button"
              onClick={() => printBarcodeLabel(formData.code, formData.name, formData.suggested_price)}
              className="btn-main-glass white" 
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}
            >
              🖨️ طباعة ملصق
            </button>
          )}
          <button 
            type="button"
            onClick={onClose} 
            className="btn-glass-cancel" 
            style={{ flex: 1, margin: 0 }}
          >
            إلغاء
          </button>
        </div>
      </AquaModalWrapper>
    </>
  );
}