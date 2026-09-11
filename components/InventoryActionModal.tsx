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
  actionType: 'in' | 'out' | 'waste' | 'empty_return';
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
    partner_id: '',
    notes: '',
    waste_reason: 'كسر عبوة / جالون',
    warehouse_id: '',        // المستودع المصدر
    destination_warehouse_id: '', // المستودع الوجهة (للصرف فقط)
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
          waste_reason: 'كسر عبوة / جالون',
          warehouse_id: initialData.warehouse_id || '11111111-1111-1111-1111-111111111111',
          destination_warehouse_id: initialData.destination_warehouse_id || '',
          include_tax: initialData.include_tax || false
        });
      } else {
        const prefix = actionType === 'waste' ? 'WASTE' : (actionType === 'empty_return' ? 'RETURN' : actionType.toUpperCase());
        setFormData({
          transaction_number: `${prefix}-${Date.now().toString().slice(-6)}`,
          item_id: '',
          quantity: 1,
          unit_price: 0,
          action_date: new Date().toISOString().split('T')[0],
          project_id: '',
          fleet_operation_id: '',
          partner_id: '',
          notes: '',
          waste_reason: 'كسر عبوة / جالون',
          warehouse_id: '11111111-1111-1111-1111-111111111111',
          destination_warehouse_id: '',
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

      if (actionType === 'out' || actionType === 'waste') {
        if (selectedItem && formData.quantity > selectedItem.available_qty) {
            throw new Error(`الكمية المطلوبة (${formData.quantity}) تتجاوز الرصيد المتاح (${selectedItem.available_qty}).`);
        }
      }

      const cleanId = (id: string) => id && id.trim() !== '' ? id : null;
      
      const taxAmount = (actionType === 'in' && formData.include_tax) 
          ? (formData.quantity * formData.unit_price * 0.15) 
          : 0;

      const prefix = actionType === 'waste' ? 'WASTE' : (actionType === 'empty_return' ? 'RETURN' : actionType.toUpperCase());

      const fullNotes = actionType === 'waste'
        ? `[سبب التلف: ${formData.waste_reason}] ${formData.notes || ''}`.trim()
        : formData.notes;

      const payload = {
        transaction_number: formData.transaction_number || `${prefix}-${Date.now().toString().slice(-6)}`,
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
        destination_warehouse_id: actionType === 'out' ? cleanId(formData.destination_warehouse_id) : null,
        notes: fullNotes
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

  const modalTitle = actionType === 'in' 
    ? 'استلام بضاعة (In)' 
    : actionType === 'out' 
    ? 'صرف من المستودع (Out)' 
    : actionType === 'waste' 
    ? 'تسجيل توالف وهدر (Waste / Damage)' 
    : 'استرجاع فوارغ جالونات (Empty Return)';

  const modalIcon = actionType === 'in' 
    ? '➕' 
    : actionType === 'out' 
    ? '📤' 
    : actionType === 'waste' 
    ? '🗑️' 
    : '🔄';

  return (
    <AquaModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        icon={modalIcon}
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
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>
                🏢 {actionType === 'out' ? 'المستودع المصدر (من)' : 'المستودع / منفذ البيع'}
              </label>
              <select
                className="glass-input-field"
                value={formData.warehouse_id}
                onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })}
                style={{ width: '100%', padding: '10px' }}
              >
                <option value="">-- اختر المستودع --</option>
                {warehousesList.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>

            {/* حقل مستودع الوجهة - يظهر فقط عند الصرف */}
            {actionType === 'out' && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: '#ef4444', marginBottom: '8px', display: 'block' }}>
                  🚛 مستودع الوجهة (إلى) <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>- اختياري للنقل الداخلي</span>
                </label>
                <select
                  className="glass-input-field"
                  value={formData.destination_warehouse_id}
                  onChange={e => setFormData({ ...formData, destination_warehouse_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderColor: formData.destination_warehouse_id ? '#ef4444' : undefined }}
                >
                  <option value="">-- بدون نقل (صرف نهائي) --</option>
                  {warehousesList
                    .filter((wh: any) => wh.id !== formData.warehouse_id)
                    .map((wh: any) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                </select>
              </div>
            )}

            {/* حقل سبب التلف - يظهر فقط عند تسجيل التوالف */}
            {actionType === 'waste' && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: '#ef4444', marginBottom: '8px', display: 'block' }}>
                  ⚠️ سبب التلف / الهدر *
                </label>
                <select
                  className="glass-input-field"
                  value={formData.waste_reason}
                  onChange={e => setFormData({ ...formData, waste_reason: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1.5px solid #f87171' }}
                >
                  <option value="كسر عبوة / جالون">كسر عبوة مياه أو جالون فارغ</option>
                  <option value="تسريب كرتون مياه">تسريب كرتون مياه / تلف تغليف</option>
                  <option value="عيب تصنيع أو غطاء غير محكم">عيب تصنيع أو غطاء غير محكم</option>
                  <option value="تلف أثناء النقل والتوزيع">تلف أثناء نقل وتوزيع البضاعة</option>
                  <option value="انتهاء صلاحية / سوء تخزين">انتهاء صلاحية أو سوء تخزين</option>
                  <option value="تلف مواد تعبئة (أغطية/ستيكرات)">تلف مواد تعبئة (أغطية / كراتين / ستيكرات)</option>
                  <option value="أخرى">سبب آخر (يُذكر في الملاحظات)</option>
                </select>
              </div>
            )}

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
                   setFormData(prev => ({ ...prev, item_id: val, unit_price: (actionType === 'out' || actionType === 'waste') ? cost : prev.unit_price }));
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
                    💰 {actionType === 'out' ? 'التكلفة المعتمدة' : (actionType === 'waste' ? 'تكلفة الوحدة (تقديري)' : (actionType === 'empty_return' ? 'قيمة التأمين/الوحدة' : 'السعر الإفرادي'))}
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
                {actionType === 'in' 
                  ? '👤 العميل / المورد (اختياري)' 
                  : actionType === 'waste'
                  ? '👤 المسؤول عن التلف / السائق (اختياري)'
                  : actionType === 'empty_return'
                  ? '👤 العميل أو المندوب المسلم للفوارغ (اختياري)'
                  : '👤 العميل / المستلم / المقاول (اختياري)'}
              </label>
              <SearchableSelect
                options={partners.map((p: any) => ({
                  label: `${p.name} (${p.partner_type})`,
                  value: p.id
                }))}
                value={formData.partner_id}
                onChange={val => setFormData({...formData, partner_id: val})}
                placeholder="-- ابحث عن الطرف المرتبط --"
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

            {actionType === 'waste' && (
               <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '12px', border: '1px solid #fca5a5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#991b1b', fontSize: '13px', fontWeight: 800 }}>
                      <span>الكمية التالفة:</span>
                      <span style={{ fontWeight: 900 }}>{formData.quantity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#991b1b', fontSize: '13px', fontWeight: 800 }}>
                      <span>تكلفة الوحدة:</span>
                      <span>{(formData.unit_price || 0).toFixed(2)} ر.س</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f1d1d', fontSize: '15px', fontWeight: 900, borderTop: '1px solid #f87171', paddingTop: '8px', marginTop: '4px' }}>
                      <span>إجمالي خسارة الهدر / التالف:</span>
                      <span style={{ color: '#dc2626' }}>{subtotal.toFixed(2)} ر.س</span>
                  </div>
               </div>
            )}

            {actionType === 'empty_return' && (
               <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontSize: '13px', fontWeight: 800 }}>
                      <span>عدد الفوارغ المسترجعة:</span>
                      <span style={{ fontWeight: 900, fontSize: '16px' }}>{formData.quantity} عبوة/جالون</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>
                      💡 سيتم إضافة هذه الفوارغ لرصيد المستودع المختار بعد اعتماد الحركة.
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
            style={{ 
              flex: 2, 
              background: actionType === 'waste' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : (actionType === 'empty_return' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : undefined) 
            }}
          >
            {mutation.isPending 
              ? '⏳ جاري الحفظ...' 
              : (actionType === 'in' 
                  ? '✅ تأكيد الاستلام' 
                  : (actionType === 'out' 
                      ? '✅ تأكيد الصرف' 
                      : (actionType === 'waste' 
                          ? '🗑️ تأكيد تسجيل التالف / الهدر' 
                          : '🔄 تأكيد استلام الفوارغ')))}
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
