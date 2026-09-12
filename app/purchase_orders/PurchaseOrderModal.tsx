"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { showGlobalToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/helpers';
import { THEME } from '@/lib/theme';
import AquaModalWrapper from '@/components/AquaModalWrapper';

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
        width="850px"
    >
        <div style={{ background: 'rgba(255,255,255,0.4)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <label style={{ fontWeight: 900, color: THEME.primary }}>💡 إعدادات الضريبة للأمر بالكامل:</label>
            <select className="glass-input-field" value={taxMode} onChange={e => handleTaxModeChange(e.target.value)} style={{ width: 'auto', fontWeight: 'bold' }}>
                <option value="exclusive">غير شامل الضريبة (يتم إضافة 15% للإجمالي)</option>
                <option value="inclusive">شامل الضريبة (يتم استقطاع 15% من الإجمالي)</option>
                <option value="none">بدون ضريبة (0%)</option>
            </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 900, color: THEME.primary }}>👤 المورد (البارتنر)</label>
            <select className="glass-input-field" value={partnerId} onChange={e => setPartnerId(e.target.value)} style={{ color: '#1e293b' }}>
              <option value="">اختر المورد...</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 900, color: THEME.primary }}>📝 رقم الأمر</label>
            <input type="text" className="glass-input-field" value={transactionNumber} readOnly style={{ background: 'rgba(0,0,0,0.05)', color: '#1e293b', opacity: 0.8 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 900, color: THEME.primary }}>📅 التاريخ</label>
            <input type="date" className="glass-input-field" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} style={{ color: '#1e293b' }} />
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.4)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)' }}>
            <h4 style={{ fontWeight: 900, color: THEME.primary, marginBottom: '15px', borderBottom: '2px solid rgba(28, 115, 171, 0.1)', paddingBottom: '10px' }}>📦 الأصناف المشتراة</h4>
            
            {lines.map((line, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'end', background: 'rgba(255,255,255,0.6)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'block' }}>الصنف</label>
                <select className="glass-input-field" value={line.item_id} onChange={e => handleLineChange(index, 'item_id', e.target.value)} style={{ color: '#1e293b' }}>
                    <option value="">اختر...</option>
                    {items.map((it:any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                </div>
                <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'block' }}>الكمية</label>
                <input type="number" min="1" className="glass-input-field" value={line.quantity} onChange={e => handleLineChange(index, 'quantity', Number(e.target.value))} style={{ color: '#1e293b' }} />
                </div>
                <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'block' }}>سعر الوحدة</label>
                <input type="number" className="glass-input-field" value={line.unit_price} onChange={e => handleLineChange(index, 'unit_price', Number(e.target.value))} style={{ color: '#1e293b' }} />
                </div>
                <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'block' }}>الضريبة</label>
                <input type="number" readOnly className="glass-input-field" value={Number(line.tax_amount).toFixed(2)} style={{ background: 'rgba(0,0,0,0.05)', color: '#1e293b' }} />
                </div>
                <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'block' }}>الإجمالي</label>
                <input type="number" readOnly className="glass-input-field" value={(Number(line.unit_price) * Number(line.quantity) + (taxMode === 'exclusive' ? Number(line.tax_amount) : 0)).toFixed(2)} style={{ background: 'rgba(0,0,0,0.05)', color: '#16a34a', fontWeight: 'bold' }} />
                </div>
                <button 
                   onClick={() => removeLine(index)} 
                   disabled={lines.length === 1} 
                   className="btn-main-glass red"
                   style={{ height: '42px', padding: '0 15px' }}
                >
                    🗑️
                </button>
            </div>
            ))}
            
            <button onClick={addLine} className="btn-main-glass blue" style={{ width: 'auto', marginTop: '10px' }}>
                ➕ إضافة صنف آخر
            </button>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(28, 115, 171, 0.05)', borderRadius: '15px', border: '1px solid rgba(28, 115, 171, 0.2)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: THEME.primary, fontWeight: 900, borderBottom: '1px solid rgba(28, 115, 171, 0.1)', paddingBottom: '10px' }}>📊 ملخص أمر الشراء</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>الإجمالي قبل الضريبة:</span>
                <span style={{ color: '#1e293b' }}>{formatCurrency(lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price)), 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>إجمالي الضريبة (15%):</span>
                <span style={{ color: '#1e293b' }}>{formatCurrency(lines.reduce((s, l) => s + Number(l.tax_amount || 0), 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '2px dashed rgba(28, 115, 171, 0.2)', fontSize: '18px', color: THEME.primary }}>
                <span style={{ fontWeight: 900 }}>الإجمالي المستحق:</span>
                <span style={{ fontWeight: 900 }}>{formatCurrency(lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price) + (taxMode === 'exclusive' ? Number(l.tax_amount || 0) : 0)), 0))}</span>
            </div>
        </div>

        <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 900, color: THEME.primary }}>📝 ملاحظات إضافية</label>
            <textarea className="glass-input-field" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ color: '#1e293b' }}></textarea>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
          <button onClick={handleSave} disabled={isLoading} className="btn-glass-save" style={{ flex: 2 }}>
            {isLoading ? '⏳ جاري الحفظ...' : '💾 حفظ أمر الشراء'}
          </button>
          <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1, color: '#1e293b' }}>إلغاء</button>
        </div>

    </AquaModalWrapper>
  );
}
