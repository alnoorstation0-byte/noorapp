"use client";
import React, { useState, useEffect } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { THEME } from '@/lib/theme';
import SearchableSelect from './SearchableSelect';

interface InventoryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'in' | 'out';
  onSuccess: () => void;
  items: any[];
  initialData?: any;
}

export default function InventoryActionModal({ isOpen, onClose, actionType, onSuccess, items, initialData }: InventoryActionModalProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    transaction_number: '',
    item_id: '',
    quantity: 1,
    unit_price: 0,
    action_date: new Date().toISOString().split('T')[0],
    project_id: '',
    fleet_operation_id: '',
    partner_id: '', // supplier for IN, subcontractor/employee for OUT
    notes: '',
    warehouse_id: '',
    include_tax: false
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          transaction_number: initialData.transaction_number || '',
          item_id: initialData.item_id || '',
          quantity: initialData.quantity || 1,
          unit_price: initialData.unit_price || 0,
          action_date: initialData.transaction_date || new Date().toISOString().split('T')[0],
          project_id: '',
          fleet_operation_id: initialData.fleet_operation_id || '',
          partner_id: initialData.partner_id || '',
          notes: initialData.notes || '',
          warehouse_id: initialData.warehouse_id || '11111111-1111-1111-1111-111111111111',
          include_tax: initialData.include_tax || false
        });
      } else {
        setFormData({
          transaction_number: `${actionType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
          item_id: '',
          quantity: 1,
          unit_price: 0,
          action_date: new Date().toISOString().split('T')[0],
          project_id: '',
          fleet_operation_id: '',
          partner_id: '',
          notes: '',
          warehouse_id: '11111111-1111-1111-1111-111111111111', // Default main warehouse
          include_tax: false
        });
      }
    }
  }, [isOpen, actionType, initialData]);

  // Projects were removed as per user request

  // Fetch Partners (Suppliers / Subcontractors)
  const { data: partners = [] } = useQuery({
    queryKey: ['active_partners_quick', actionType],
    queryFn: async () => {
      const type = actionType === 'in' ? 'مورد' : 'مقاول';
      const { data } = await supabase.from('partners').select('id, name, partner_type');
      return data || [];
    }
  });

  const { data: warehousesList = [] } = useQuery({
    queryKey: ['warehouses_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: fleetOperations = [] } = useQuery({
    queryKey: ['fleet_operations_open_inv'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fleet_operations').select('id, operation_number, operation_date, description, vehicle:fleet_vehicles(plate_number, vehicle_model), driver:partners(name), description').eq('status', 'مفتوح');
      if (error) throw error;
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!formData.item_id || !formData.quantity) {
        throw new Error("يرجى تعبئة كافة الحقول الإلزامية (الصنف والكمية).");
      }

      const selectedItem = items.find(i => i.id === formData.item_id);

      if (actionType === 'out') {
        if (selectedItem && formData.quantity > selectedItem.available_qty) {
            throw new Error(`الكمية المطلوبة (${formData.quantity}) تتجاوز الرصيد المتاح (${selectedItem.available_qty}).`);
        }
      }

      const cleanId = (id: string) => id && id.trim() !== '' ? id : null;
      
      const taxAmount = (actionType === 'in' && formData.include_tax) 
          ? (formData.quantity * formData.unit_price * 0.15) 
          : 0;

      const payload = {
        transaction_number: formData.transaction_number || `${actionType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        transaction_date: formData.action_date,
        type: actionType,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        tax_amount: taxAmount,
        include_tax: formData.include_tax,
        item_id: formData.item_id,
        partner_id: cleanId(formData.partner_id),
        fleet_operation_id: cleanId(formData.fleet_operation_id),
        warehouse_id: cleanId(formData.warehouse_id),
        notes: formData.notes
      };

      let txError;
      if (initialData?.id) {
        const { error } = await supabase.from('inventory_transactions').update(payload).eq('id', initialData.id);
        txError = error;
      } else {
        const { error } = await supabase.from('inventory_transactions').insert([payload]);
        txError = error;
      }

      if (txError) throw new Error(txError.message);
    },
    onSuccess: () => {
      showToast("تم الحفظ بنجاح ⏳ بانتظار الاعتماد", "success");
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      showToast(`خطأ: ${error.message}`, "error");
    }
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !isOpen) return null;

  const subtotal = (formData.quantity || 0) * (formData.unit_price || 0);
  const taxAmount = (actionType === 'in' && formData.include_tax) ? subtotal * 0.15 : 0;
  const totalAmount = subtotal + taxAmount;

  return (
    <AquaModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        title={actionType === 'in' ? 'استلام بضاعة (In)' : 'صرف من المستودع (Out)'}
        icon={actionType === 'in' ? '➕' : '➖'}
        width="900px"
    >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', alignItems: 'start' }}>
          
          {/* Column 1: Basic & Core Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>🔢 رقم الحركة</label>
                <input 
                  type="text" 
                  className="glass-input-field" 
                  value={formData.transaction_number}
                  onChange={e => setFormData({...formData, transaction_number: e.target.value})}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>📅 تاريخ الحركة</label>
                <input 
                  type="date" 
                  className="glass-input-field" 
                  value={formData.action_date}
                  onChange={e => setFormData({...formData, action_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>🏢 المستودع / منفذ البيع</label>
              <select
                className="glass-input-field"
                value={formData.warehouse_id}
                onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })}
                style={{ width: '100%', padding: '10px' }}
              >
                {warehousesList.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>📦 الصنف *</label>
              <SearchableSelect
                options={(items || []).map(item => ({
                  label: `${item.name} (${item.available_qty} متاح)`,
                  value: item.id
                }))}
                value={formData.item_id}
                onChange={val => {
                   const selected = (items || []).find(i => i.id === val);
                   const cost = selected ? (selected.last_purchase_price || selected.default_price || 0) : 0;
                   setFormData(prev => ({ ...prev, item_id: val, unit_price: actionType === 'out' ? cost : prev.unit_price }));
                }}
                placeholder="-- ابحث عن الصنف --"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>⚖️ الكمية *</label>
                <input 
                  type="number" 
                  min="1"
                  className="glass-input-field" 
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>
                    💰 {actionType === 'out' ? 'التكلفة المعتمدة' : 'السعر الإفرادي'}
                </label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="glass-input-field" 
                  value={formData.unit_price}
                  onChange={e => setFormData({...formData, unit_price: Number(e.target.value)})}
                  disabled={actionType === 'out'}
                  style={actionType === 'out' ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                />
              </div>
            </div>

            {actionType === 'in' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.8)' }}>
                <input 
                  type="checkbox" 
                  id="include_tax" 
                  checked={formData.include_tax} 
                  onChange={e => setFormData({...formData, include_tax: e.target.checked})} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: THEME.goldAccent }}
                />
                <label htmlFor="include_tax" style={{ fontSize: '14px', fontWeight: 800, color: THEME.primary, cursor: 'pointer', margin: 0 }}>
                  إضافة ضريبة القيمة المضافة 15% على الفاتورة
                </label>
              </div>
            )}
          </div>

          {/* Column 2: Partners, Details & Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>
                {actionType === 'in' ? '👤 العميل / المورد (اختياري)' : '👤 العميل / المستلم / المقاول (اختياري)'}
              </label>
              <SearchableSelect
                options={partners.map((p: any) => ({
                  label: `${p.name} (${p.partner_type})`,
                  value: p.id
                }))}
                value={formData.partner_id}
                onChange={val => setFormData({...formData, partner_id: val})}
                placeholder="-- ابحث عن المستفيد --"
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>🚚 رحلة التوزيع (أمر تشغيل السيارات)</label>
              <select 
                  className="glass-input-field" 
                  value={formData.fleet_operation_id || ''} 
                  onChange={e => setFormData({...formData, fleet_operation_id: e.target.value})}
              >
                  <option value="">-- ربط برحلة توزيع (اختياري) --</option>
                  {fleetOperations?.map((op: any) => (
                      <option key={op.id} value={op.id}>
                          {op.operation_number} | {op.operation_date} | سيارة: {op.vehicle?.plate_number} | المندوب: {op.driver?.name}{op.description ? ' | ' + op.description : ''}
                      </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>📝 ملاحظات</label>
              <textarea 
                className="glass-input-field" 
                rows={2}
                placeholder="أي ملاحظات إضافية على الحركة..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                style={{ resize: 'vertical' }}
              ></textarea>
            </div>

            {/* ملخص المبالغ */}
            {actionType === 'in' && (
               <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 800 }}>
                      <span>الإجمالي الخاضع للضريبة:</span>
                      <span>{subtotal.toFixed(2)} ر.س</span>
                  </div>
                  {formData.include_tax && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontSize: '13px', fontWeight: 800 }}>
                          <span>قيمة الضريبة (15%):</span>
                          <span>{taxAmount.toFixed(2)} ر.س</span>
                      </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontSize: '15px', fontWeight: 900, borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                      <span>الإجمالي الكلي:</span>
                      <span>{totalAmount.toFixed(2)} ر.س</span>
                  </div>
               </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
          <button 
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-glass-save"
            style={{ flex: 2 }}
          >
            {mutation.isPending ? '⏳ جاري الحفظ...' : (actionType === 'in' ? '✅ تأكيد الاستلام' : '✅ تأكيد الصرف')}
          </button>
          <button 
            onClick={onClose}
            className="btn-glass-cancel"
            style={{ flex: 1 }}
          >
            إلغاء
          </button>
        </div>
    </AquaModalWrapper>
  );
}
