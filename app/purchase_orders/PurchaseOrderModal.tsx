"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { showGlobalToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import SearchableSelect from '@/components/SearchableSelect';

export default function PurchaseOrderModal({ isOpen, onClose, items, initialData, onSuccess }: any) {
  const [transactionNumber, setTransactionNumber] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [notes, setNotes] = useState('');
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive' | 'none'>('exclusive');
  
  const [lines, setLines] = useState<any[]>([{ item_id: '', quantity: 1, unit_price: 0, tax_amount: 0, include_tax: false }]);
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTransactionNumber(initialData.transaction_number);
        setTransactionDate(initialData.transaction_date);
        setPartnerId(initialData.partner_id || '');
        setNotes(initialData.notes || '');
        
        let initialTaxMode = 'none';
        
        if (initialData.items && initialData.items.length > 0) {
            const firstItem = initialData.items[0];
            if (firstItem.include_tax) {
                const exclusiveTax = (firstItem.unit_price * firstItem.quantity) * 0.15;
                if (Math.abs(firstItem.tax_amount - exclusiveTax) < 0.1) {
                    initialTaxMode = 'exclusive';
                } else {
                    initialTaxMode = 'inclusive';
                }
            }
            setTaxMode(initialTaxMode as any);
            
            setLines(initialData.items.map((it:any) => ({
                id: it.id,
                item_id: it.item_id,
                quantity: it.quantity,
                unit_price: it.unit_price,
                tax_amount: it.tax_amount,
                include_tax: it.include_tax
            })));
        } else {
            setTaxMode('exclusive');
            setLines([{ item_id: '', quantity: 1, unit_price: 0, tax_amount: 0, include_tax: false }]);
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const fetchPartners = async () => {
    const { data } = await supabase.from('partners').select('*').eq('partner_type', 'مورد').order('name');
    if (data) setPartners(data);
  };

  const resetForm = () => {
    setTransactionNumber(`PO-${Date.now().toString().slice(-6)}`);
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setPartnerId('');
    setNotes('');
    setTaxMode('exclusive');
    setLines([{ item_id: '', quantity: 1, unit_price: 0, tax_amount: 0, include_tax: true }]);
  };

  const recalculateTaxes = (currentLines: any[], mode: string) => {
    return currentLines.map(line => {
      const subtotal = line.quantity * line.unit_price;
      if (mode === 'exclusive') {
        line.tax_amount = subtotal * 0.15;
        line.include_tax = true;
      } else if (mode === 'inclusive') {
        line.tax_amount = subtotal - (subtotal / 1.15);
        line.include_tax = true;
      } else {
        line.tax_amount = 0;
        line.include_tax = false;
      }
      return line;
    });
  };

  const handleTaxModeChange = (mode: string) => {
    setTaxMode(mode as any);
    setLines(recalculateTaxes([...lines], mode));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    let newLines = [...lines];
    newLines[index][field] = value;
    
    if (field === 'item_id') {
      const selectedItem = items.find((i: any) => i.id === value);
      if (selectedItem) {
        newLines[index].unit_price = selectedItem.cost_price || selectedItem.default_price || 0;
      }
    }

    setLines(recalculateTaxes(newLines, taxMode));
  };

  const addLine = () => {
    setLines(recalculateTaxes([...lines, { item_id: '', quantity: 1, unit_price: 0, tax_amount: 0, include_tax: true }], taxMode));
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!partnerId) return showGlobalToast('يرجى اختيار المورد', 'error');
    if (lines.some(l => !l.item_id || l.quantity <= 0)) return showGlobalToast('يرجى إكمال بيانات الأصناف بشكل صحيح', 'error');

    setIsLoading(true);
    try {
      if (initialData) {
         // Delete old ones
         await supabase.from('inventory_transactions').delete().in('id', initialData.ids);
      }

      const payload = lines.map((l, index) => ({
        transaction_number: lines.length > 1 ? `${transactionNumber}-${index + 1}` : transactionNumber,
        transaction_date: transactionDate,
        type: 'in',
        item_id: l.item_id,
        partner_id: partnerId,
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_amount: l.tax_amount,
        include_tax: l.include_tax,
        notes: notes,
        warehouse_id: '11111111-1111-1111-1111-111111111111',
        status: 'pending'
      }));

      const { error } = await supabase.from('inventory_transactions').insert(payload);
      if (error) throw error;

      showGlobalToast('تم حفظ أمر الشراء بنجاح', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showGlobalToast('حدث خطأ أثناء الحفظ: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AquaModalWrapper 
        isOpen={isOpen} 
        onClose={onClose} 
        title={initialData ? 'تعديل أمر الشراء 📝' : 'أمر شراء جديد 🛒'}
        width="880px"
    >
      <style>{`
        .po-tax-banner {
          background: rgba(255,255,255,0.45);
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.7);
          margin-bottom: 15px;
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .po-header-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 15px;
        }

        .po-item-card {
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(40, 145, 200, 0.25);
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          transition: all 0.2s ease;
        }

        .po-item-desktop-grid {
          display: grid;
          grid-template-columns: 2.2fr 1fr 1.1fr 1fr 1.2fr 42px;
          gap: 10px;
          align-items: end;
        }

        .po-mobile-item-header {
          display: none;
        }

        .po-mobile-numbers-grid {
          display: contents;
        }

        .po-mobile-delete-btn {
          display: none;
        }

        .po-desktop-delete-btn {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .po-label {
          font-size: 12px;
          font-weight: 900;
          color: ${THEME.primary};
          margin-bottom: 5px;
          display: block;
        }

        .po-input-center {
          text-align: center;
          font-weight: 800;
          font-size: 13px;
        }

        .po-footer-actions {
          display: flex;
          gap: 12px;
          margin-top: 15px;
        }

        @media (max-width: 768px) {
          .po-tax-banner {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            padding: 10px 12px !important;
          }
          .po-tax-banner select {
            width: 100% !important;
            font-size: 12px !important;
          }

          .po-header-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            margin-bottom: 12px !important;
          }

          .po-item-card {
            padding: 10px !important;
            border-radius: 12px !important;
            background: rgba(255, 255, 255, 0.85) !important;
            box-shadow: 0 2px 10px rgba(28, 115, 171, 0.08) !important;
          }

          .po-item-desktop-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }

          .po-mobile-item-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding-bottom: 6px !important;
            border-bottom: 1px dashed rgba(40, 145, 200, 0.2) !important;
            width: 100% !important;
          }

          .po-mobile-item-badge {
            font-size: 12px !important;
            font-weight: 900 !important;
            color: #1C73AB !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }

          .po-mobile-delete-btn {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            background: rgba(239, 68, 68, 0.1) !important;
            color: #ef4444 !important;
            border: 1px solid rgba(239, 68, 68, 0.25) !important;
            padding: 4px 10px !important;
            border-radius: 8px !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            touch-action: manipulation !important;
            line-height: 1 !important;
          }

          .po-mobile-delete-btn:disabled {
            opacity: 0.4 !important;
            cursor: not-allowed !important;
          }

          .po-desktop-delete-btn {
            display: none !important;
          }

          .po-item-select-wrap {
            width: 100% !important;
          }

          .po-mobile-numbers-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .po-mobile-numbers-grid > div {
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .po-label {
            font-size: 11px !important;
            margin-bottom: 4px !important;
          }

          .po-input-center {
            font-size: 13px !important;
            padding: 6px 8px !important;
            height: 36px !important;
            box-sizing: border-box !important;
          }

          .po-footer-actions {
            flex-direction: row !important;
            gap: 8px !important;
          }
          .po-footer-actions button {
            min-height: 44px !important;
            font-size: 13px !important;
          }
        }
      `}</style>

      {/* 1. إعدادات الضريبة العامة */}
      <div className="po-tax-banner">
          <label style={{ fontWeight: 900, color: THEME.primary, fontSize: '13px' }}>💡 إعدادات الضريبة للأمر بالكامل:</label>
          <select className="glass-input-field" value={taxMode} onChange={e => handleTaxModeChange(e.target.value)} style={{ width: 'auto', fontWeight: 'bold' }}>
              <option value="exclusive">غير شامل الضريبة (يتم إضافة 15% للإجمالي)</option>
              <option value="inclusive">شامل الضريبة (يتم استقطاع 15% من الإجمالي)</option>
              <option value="none">بدون ضريبة (0%)</option>
          </select>
      </div>

      {/* 2. بيانات المورد ورقم وتاريخ الأمر */}
      <div className="po-header-grid">
        <div>
          <label className="po-label" style={{ fontSize: '13px' }}>👤 المورد (البارتنر) *</label>
          <SearchableSelect 
            options={partners.map(p => ({ label: p.name, value: p.id }))}
            value={partnerId}
            onChange={(val) => setPartnerId(val)}
            placeholder="🔍 ابحث أو اختر المورد..."
          />
        </div>
        <div>
          <label className="po-label" style={{ fontSize: '13px' }}>📝 رقم الأمر</label>
          <input type="text" className="glass-input-field" value={transactionNumber} readOnly style={{ background: 'rgba(0,0,0,0.05)', color: '#1e293b', opacity: 0.85, fontWeight: 800 }} />
        </div>
        <div>
          <label className="po-label" style={{ fontSize: '13px' }}>📅 التاريخ</label>
          <input type="date" className="glass-input-field" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} style={{ color: '#1e293b', fontWeight: 800 }} />
        </div>
      </div>

      {/* 3. الأصناف المشتراة */}
      <div style={{ background: 'rgba(255,255,255,0.4)', padding: '12px 14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid rgba(28, 115, 171, 0.1)', paddingBottom: '8px' }}>
            <h4 style={{ margin: 0, fontWeight: 900, color: THEME.primary, fontSize: '15px' }}>📦 الأصناف المشتراة</h4>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>({lines.length} صنف)</span>
          </div>
          
          {lines.map((line, index) => (
            <div key={index} className="po-item-card">
              {/* ترويسة الصنف الخاصة بالجوال مع زر الحذف */}
              <div className="po-mobile-item-header">
                <span className="po-mobile-item-badge">
                  <span>📦 صنف رقم ({index + 1})</span>
                </span>
                <button 
                  type="button"
                  onClick={() => removeLine(index)} 
                  disabled={lines.length === 1} 
                  className="po-mobile-delete-btn"
                  title="حذف هذا الصنف"
                >
                  <span>🗑️</span>
                  <span>حذف</span>
                </button>
              </div>

              <div className="po-item-desktop-grid">
                {/* اسم الصنف مع ميزة البحث الذكي والتنسيق الكامل */}
                <div className="po-item-select-wrap">
                  <label className="po-label">الصنف المطلوب *</label>
                  <SearchableSelect 
                    options={items.map((it: any) => ({
                      label: it.unit ? `${it.name} (${it.unit})` : it.name,
                      value: it.id
                    }))}
                    value={line.item_id}
                    onChange={(val) => handleLineChange(index, 'item_id', val)}
                    placeholder="🔍 ابحث بالاسم أو اختر الصنف..."
                  />
                </div>

                {/* الحسابات والأرقام: 2x2 على الجوال وأفقي على الديسكتوب */}
                <div className="po-mobile-numbers-grid">
                  <div>
                    <label className="po-label">الكمية</label>
                    <input 
                      type="number" 
                      min="1" 
                      step="any"
                      inputMode="decimal"
                      className="glass-input-field po-input-center" 
                      value={line.quantity} 
                      onChange={e => handleLineChange(index, 'quantity', Number(e.target.value))} 
                    />
                  </div>

                  <div>
                    <label className="po-label">سعر الوحدة</label>
                    <input 
                      type="number" 
                      step="any"
                      inputMode="decimal"
                      className="glass-input-field po-input-center" 
                      value={line.unit_price} 
                      onChange={e => handleLineChange(index, 'unit_price', Number(e.target.value))} 
                    />
                  </div>

                  <div>
                    <label className="po-label">الضريبة (15%)</label>
                    <input 
                      type="text" 
                      readOnly 
                      className="glass-input-field po-input-center" 
                      value={Number(line.tax_amount || 0).toFixed(2)} 
                      style={{ background: 'rgba(0,0,0,0.04)', color: '#475569' }} 
                    />
                  </div>

                  <div>
                    <label className="po-label">الإجمالي</label>
                    <input 
                      type="text" 
                      readOnly 
                      className="glass-input-field po-input-center" 
                      value={(Number(line.unit_price) * Number(line.quantity) + (taxMode === 'exclusive' ? Number(line.tax_amount || 0) : 0)).toFixed(2)} 
                      style={{ background: 'rgba(22, 163, 74, 0.08)', color: '#16a34a', fontWeight: 900 }} 
                    />
                  </div>
                </div>

                {/* زر الحذف المخصص لشاشات الديسكتوب */}
                <div className="po-desktop-delete-btn">
                  <button 
                    type="button"
                    onClick={() => removeLine(index)} 
                    disabled={lines.length === 1} 
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      cursor: lines.length === 1 ? 'not-allowed' : 'pointer',
                      opacity: lines.length === 1 ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                      marginBottom: '2px'
                    }}
                    title="حذف هذا الصنف"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          <button 
            type="button"
            onClick={addLine} 
            className="btn-main-glass blue" 
            style={{ width: 'auto', marginTop: '8px', minHeight: '38px', padding: '8px 16px', fontSize: '12px' }}
          >
              ➕ إضافة صنف آخر
          </button>
      </div>

      {/* 4. ملخص أمر الشراء */}
      <div style={{ marginTop: '15px', padding: '12px 16px', background: 'rgba(28, 115, 171, 0.06)', borderRadius: '15px', border: '1px solid rgba(28, 115, 171, 0.2)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: THEME.primary, fontWeight: 900, fontSize: '15px', borderBottom: '1px solid rgba(28, 115, 171, 0.15)', paddingBottom: '8px' }}>📊 ملخص أمر الشراء</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ fontWeight: 700, color: '#475569' }}>الإجمالي قبل الضريبة:</span>
              <span style={{ color: '#1e293b', fontWeight: 800 }}>{formatCurrency(lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price)), 0))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ fontWeight: 700, color: '#475569' }}>إجمالي الضريبة (15%):</span>
              <span style={{ color: '#1e293b', fontWeight: 800 }}>{formatCurrency(lines.reduce((s, l) => s + Number(l.tax_amount || 0), 0))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px dashed rgba(28, 115, 171, 0.2)', fontSize: '16px', color: THEME.primary }}>
              <span style={{ fontWeight: 900 }}>الإجمالي المستحق:</span>
              <span style={{ fontWeight: 900 }}>{formatCurrency(lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price) + (taxMode === 'exclusive' ? Number(l.tax_amount || 0) : 0)), 0))}</span>
          </div>
      </div>

      {/* 5. ملاحظات */}
      <div style={{ marginTop: '12px' }}>
          <label className="po-label" style={{ fontSize: '13px' }}>📝 ملاحظات إضافية</label>
          <textarea className="glass-input-field" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ color: '#1e293b' }} placeholder="أدخل أي ملاحظات تخص أمر الشراء أو شروط التوريد..."></textarea>
      </div>

      {/* 6. أزرار الإجراءات */}
      <div className="po-footer-actions">
        <button onClick={handleSave} disabled={isLoading} className="btn-glass-save" style={{ flex: 2 }}>
          {isLoading ? '⏳ جاري الحفظ...' : '💾 حفظ أمر الشراء'}
        </button>
        <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1, color: '#1e293b' }}>إلغاء</button>
      </div>

    </AquaModalWrapper>
  );
}
