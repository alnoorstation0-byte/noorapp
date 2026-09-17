"use client";
import React, { useState, useEffect } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { THEME } from '@/lib/theme';
import SearchableSelect from './SearchableSelect';
import { BarcodeCameraButton } from './BarcodeScannerWidget';
import { executeApproveTransaction, syncAllWarehouseBalances } from '@/lib/inventory_engine';


const generateBatchNumber = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BATCH-${ymd}-${rand}`;
};

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
    delegate_id: '',
    partner_id: '',
    notes: '',
    waste_reason: 'كسر عبوة / جالون',
    warehouse_id: '',        // المستودع المصدر
    destination_warehouse_id: '', // المستودع الوجهة (للصرف فقط)
    include_tax: false,
    batch_number: '',
    expiry_date: '',
    production_date: ''
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
          delegate_id: initialData.delegate_id || initialData.partner_id || '',
          partner_id: initialData.partner_id || '',
          notes: initialData.notes || '',
          waste_reason: 'كسر عبوة / جالون',
          warehouse_id: initialData.warehouse_id || '11111111-1111-1111-1111-111111111111',
          destination_warehouse_id: initialData.destination_warehouse_id || '',
          include_tax: initialData.include_tax || false,
          batch_number: initialData.batch_number || (actionType === 'in' ? generateBatchNumber() : ''),
          expiry_date: initialData.expiry_date || '',
          production_date: initialData.production_date || ''
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
          delegate_id: '',
          partner_id: '',
          notes: '',
          waste_reason: 'كسر عبوة / جالون',
          warehouse_id: '11111111-1111-1111-1111-111111111111',
          destination_warehouse_id: '',
          include_tax: false,
          batch_number: actionType === 'in' ? generateBatchNumber() : '',
          expiry_date: '',
          production_date: ''
        });
      }
    }
  }, [isOpen, actionType, initialData]);

  // Projects were removed as per user request

  // Fetch Partners (Suppliers / Subcontractors / Delegates)
  const { data: partners = [] } = useQuery({
    queryKey: ['active_partners_quick', actionType],
    queryFn: async () => {
      const { data } = await supabase.from('partners').select('id, name, partner_type').order('name');
      return data || [];
    }
  });

  const { data: warehousesList = [] } = useQuery({
    queryKey: ['warehouses_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name, type, vehicle_id').eq('is_active', true);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: fleetOperations = [] } = useQuery({
    queryKey: ['fleet_operations', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fleet_operations')
        .select(`
          id,
          operation_number,
          operation_date,
          status,
          vehicle_id,
          driver_id,
          warehouse_id,
          description,
          vehicle:fleet_vehicles(plate_number, vehicle_model),
          driver:partners!driver_id(id, name, phone, partner_type)
        `)
        .neq('status', 'مغلق')
        .neq('status', 'closed')
        .order('operation_date', { ascending: false });
      
      if (error) {
        console.error("Error fetching fleet operations:", error);
        const { data: fallbackData } = await supabase
          .from('fleet_operations')
          .select('*, vehicle:fleet_vehicles(plate_number), driver:partners(name)')
          .neq('status', 'مغلق')
          .neq('status', 'closed')
          .order('created_at', { ascending: false });
        return fallbackData || [];
      }
      return data || [];
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

      const cleanId = (id: string | null | undefined) => (id && typeof id === 'string' && id.trim() !== '') ? id : null;
      
      const taxAmount = (actionType === 'in' && formData.include_tax) 
          ? (formData.quantity * formData.unit_price * 0.15) 
          : 0;

      const prefix = actionType === 'waste' ? 'WASTE' : (actionType === 'empty_return' ? 'RETURN' : actionType.toUpperCase());

      const fullNotes = actionType === 'waste'
        ? `[سبب التلف: ${formData.waste_reason}] ${formData.notes || ''}`.trim()
        : formData.notes;

      const payload: any = {
        transaction_number: formData.transaction_number || `${prefix}-${Date.now().toString().slice(-6)}`,
        transaction_date: formData.action_date,
        type: actionType,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        tax_amount: taxAmount,
        include_tax: formData.include_tax,
        item_id: formData.item_id,
        partner_id: cleanId(formData.partner_id || formData.delegate_id),
        delegate_id: cleanId(formData.delegate_id || formData.partner_id),
        fleet_operation_id: cleanId(formData.fleet_operation_id),
        warehouse_id: cleanId(formData.warehouse_id),
        destination_warehouse_id: actionType === 'out' ? cleanId(formData.destination_warehouse_id) : null,
        batch_number: (actionType === 'in' || formData.batch_number) ? (formData.batch_number || null) : null,
        expiry_date: (actionType === 'in' || formData.expiry_date) ? (formData.expiry_date || null) : null,
        production_date: (actionType === 'in' || formData.production_date) ? (formData.production_date || null) : null,
        notes: fullNotes
      };

      let txError;
      let newId = initialData?.id;
      if (initialData?.id) {
        let { error } = await supabase.from('inventory_transactions').update(payload).eq('id', initialData.id);
        if (error && error.code === '42703') {
          // Fallback if columns not yet migrated in Supabase
          delete payload.batch_number;
          delete payload.expiry_date;
          delete payload.production_date;
          const retry = await supabase.from('inventory_transactions').update(payload).eq('id', initialData.id);
          txError = retry.error;
        } else {
          txError = error;
        }
      } else {
        payload.status = 'approved';
        let { data: inserted, error } = await supabase.from('inventory_transactions').insert([payload]).select('id').single();
        if (error && error.code === '42703') {
          // Fallback if columns not yet migrated in Supabase
          delete payload.batch_number;
          delete payload.expiry_date;
          delete payload.production_date;
          const retry = await supabase.from('inventory_transactions').insert([payload]).select('id').single();
          txError = retry.error;
          if (retry.data) newId = retry.data.id;
        } else {
          txError = error;
          if (inserted) newId = inserted.id;
        }
      }

      if (txError) throw new Error(txError.message);

      // ⏳ تحديث بيانات الصنف والتشغيلة وتاريخ الانتهاء في دليل الأصناف والكاش الفوري
      if (actionType === 'in' && formData.item_id && (formData.expiry_date || formData.batch_number || formData.production_date)) {
        try {
          await supabase.from('inventory_items').update({
            expiry_date: formData.expiry_date || null,
            production_date: formData.production_date || null,
            batch_number: formData.batch_number || null,
          }).eq('id', formData.item_id);
        } catch (itemUpdateErr) {
          console.warn('Could not update inventory_items with expiry/batch:', itemUpdateErr);
        }

        saveLocalExpiryMetadata(formData.item_id, {
          expiry_date: formData.expiry_date || undefined,
          batch_number: formData.batch_number || undefined,
          alert_before_days: 30
        });
      }

      // 🚀 اعتماد فوري وتحديث لأرصدة المستودع والسيارة فوراً
      if (newId) {
        try {
          await executeApproveTransaction(newId);
        } catch (apprErr) {
          console.warn("Auto approve note:", apprErr);
          await syncAllWarehouseBalances();
        }
      }
    },
    onSuccess: () => {
      showToast("تم الحفظ واعتماد الصرف وتحديث رصيد السيارة والمستودع بنجاح ✅", "success");
      queryClient.invalidateQueries({ queryKey: ['inventory_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['pos_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['fleet_operations'] });
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
    ? 'استلام وتوريد وقود / مواد (In)' 
    : actionType === 'out' 
    ? 'صرف من المستودع / الخزان (Out)' 
    : actionType === 'waste' 
    ? 'تسجيل توالف وهدر / تبخر (Waste / Loss)' 
    : 'استرجاع براميل / عبوات (Returnables)';

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
                ⛽ {actionType === 'out' ? 'المستودع / الخزان المصدر (من)' : 'محطة الوقود / الخزان'}
              </label>
                <select
                  className="glass-input-field"
                  value={formData.warehouse_id}
                  onChange={e => {
                    const whId = e.target.value;
                    const wh = warehousesList?.find((w: any) => w.id === whId);
                    let matchedOp: any = null;
                    if (actionType !== 'out' && wh && (wh.type === 'vehicle' || wh.vehicle_id)) {
                      matchedOp = fleetOperations?.find((op: any) => 
                        (wh.vehicle_id && op.vehicle_id === wh.vehicle_id) ||
                        op.vehicle_id === wh.id ||
                        op.warehouse_id === wh.id
                      );
                    }
                    setFormData(prev => ({ 
                      ...prev, 
                      warehouse_id: whId,
                      fleet_operation_id: matchedOp ? matchedOp.id : prev.fleet_operation_id,
                      delegate_id: matchedOp?.driver_id || prev.delegate_id,
                      partner_id: matchedOp?.driver_id || prev.partner_id
                    }));
                  }}
                  style={{ width: '100%', padding: '10px' }}
                >
                <option value="">-- اختر محطة الوقود / الخزان --</option>
                {warehousesList.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>

            {/* حقل مستودع الوجهة - يظهر فقط عند الصرف */}
            {actionType === 'out' && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: '#0284c7', marginBottom: '8px', display: 'block' }}>
                  ⛽ خزان / وجهة التوريد (المحطة / صهريج الوقود) <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>- يُحدد تلقائياً مع رحلة التزويد</span>
                </label>
                <select
                  className="glass-input-field"
                  value={formData.destination_warehouse_id}
                  onChange={e => {
                    const destWhId = e.target.value;
                    const destWh = warehousesList?.find((w: any) => w.id === destWhId);
                    
                    // 🚀 ربط ذكي تلقائي: إذا تم اختيار صهريج أو محطة، يتم فوراً ربط أمر تشغيل الرحلة النشط
                    let matchedOp: any = null;
                    if (destWh && (destWh.type === 'vehicle' || destWh.vehicle_id)) {
                      matchedOp = fleetOperations?.find((op: any) => 
                        (destWh.vehicle_id && op.vehicle_id === destWh.vehicle_id) ||
                        op.vehicle_id === destWh.id ||
                        op.warehouse_id === destWh.id
                      );
                    }
                    
                    setFormData(prev => ({
                      ...prev,
                      destination_warehouse_id: destWhId,
                      fleet_operation_id: matchedOp ? matchedOp.id : prev.fleet_operation_id,
                      delegate_id: matchedOp?.driver_id || prev.delegate_id,
                      partner_id: matchedOp?.driver_id || prev.partner_id
                    }));
                  }}
                  style={{ width: '100%', padding: '10px', borderColor: formData.destination_warehouse_id ? '#0284c7' : undefined }}
                >
                  <option value="">-- بدون نقل لخزان آخر (صرف وقود نهائي) --</option>
                  {warehousesList
                    .filter((wh: any) => wh.id !== formData.warehouse_id)
                    .map((wh: any) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.type === 'vehicle' ? '🚛 ' : '⛽ '} {wh.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* حقل سبب التلف - يظهر فقط عند تسجيل التوالف */}
            {actionType === 'waste' && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: '#ef4444', marginBottom: '8px', display: 'block' }}>
                  ⚠️ سبب التبخر / العجز / الهدر *
                </label>
                <select
                  className="glass-input-field"
                  value={formData.waste_reason}
                  onChange={e => setFormData({ ...formData, waste_reason: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1.5px solid #f87171' }}
                >
                  <option value="تبخر طبيعي في الخزان">تبخر طبيعي في خزانات الوقود</option>
                  <option value="تسرب أو تلف في الصمامات والمضخات">تسرب أو تلف في الصمامات والمضخات</option>
                  <option value="عيب تفريغ أو خلط وقود">عيب تفريغ أو خلط وقود</option>
                  <option value="هدر أثناء النقل بالصهريج">هدر أثناء نقل وتفريغ شحنة الوقود</option>
                  <option value="تلف عبوات زيوت أو منتجات المحطة">تلف عبوات زيوت أو منتجات المحطة</option>
                  <option value="أخرى">سبب آخر (يُذكر في الملاحظات)</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>📦 الصنف *</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
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
                <BarcodeCameraButton
                  onScan={(barcode) => {
                    const selected = (items || []).find(i => String(i.code) === barcode || String(i.id) === barcode);
                    if (selected) {
                      const cost = selected.last_purchase_price || selected.default_price || 0;
                      setFormData(prev => ({
                        ...prev,
                        item_id: selected.id,
                        unit_price: (actionType === 'out' || actionType === 'waste') ? cost : prev.unit_price
                      }));
                      showToast(`تم اختيار الصنف: ${selected.name}`, 'success');
                    } else {
                      showToast(`لم يتم العثور على صنف بالباركود: ${barcode}`, 'error');
                    }
                  }}
                  title="مسح باركود الصنف بالكاميرا"
                  style={{ height: '42px', minWidth: '44px', borderRadius: '12px' }}
                />
              </div>
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

            {/* ⏳ بيانات الصلاحية والتشغيلة للمخزون المستلم */}
            {actionType === 'in' && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed rgba(0, 229, 255, 0.25)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#00E5FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏳</span>
                    <span>بيانات الصلاحية والتشغيلة (استلام وتوريد)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, batch_number: generateBatchNumber() }))}
                    style={{
                      background: 'rgba(0, 229, 255, 0.15)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#00E5FF',
                      cursor: 'pointer'
                    }}
                    title="توليد رقم تشغيلة جديد تلقائياً"
                  >
                    🔄 توليد دفعة جديدة
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 900, color: '#F8FAFC', marginBottom: '6px', display: 'block' }}>
                    🏷️ رقم الدفعة / التشغيلة (Batch #) * <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>(تلقائي وقابل للتعديل)</span>
                  </label>
                  <input 
                    type="text" 
                    className="glass-input-field" 
                    placeholder="BATCH-YYYYMMDD-XXXX"
                    value={formData.batch_number}
                    onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                    style={{ fontWeight: 800, letterSpacing: '0.5px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 900, color: '#F59E0B', marginBottom: '6px', display: 'block' }}>
                      📅 تاريخ انتهاء الصلاحية *
                    </label>
                    <input 
                      type="date" 
                      className="glass-input-field" 
                      value={formData.expiry_date}
                      onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                      style={{ borderColor: formData.expiry_date ? '#10B981' : 'rgba(245, 158, 11, 0.4)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 900, color: THEME.primary, marginBottom: '6px', display: 'block' }}>
                      🏭 تاريخ الإنتاج <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>(اختياري يدوي)</span>
                    </label>
                    <input 
                      type="date" 
                      className="glass-input-field" 
                      value={formData.production_date}
                      onChange={e => setFormData({ ...formData, production_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Partners, Details & Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 🚚 أمر تشغيل الرحلة */}
            <div style={{
              background: actionType === 'out' ? 'rgba(2, 132, 199, 0.05)' : undefined,
              padding: actionType === 'out' ? '12px' : 0,
              borderRadius: actionType === 'out' ? '16px' : 0,
              border: actionType === 'out' ? '1px dashed rgba(2, 132, 199, 0.3)' : undefined
            }}>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🚚</span>
                  <span>أمر تشغيل صهريج النقل والتوزيع</span>
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>
                  {actionType === 'out' ? '⚡ يربط مشغل الصهريج والمركبة تلقائياً' : 'اختياري'}
                </span>
              </label>
              <select 
                  className="glass-input-field" 
                  style={{ 
                    borderColor: formData.fleet_operation_id ? '#0284c7' : undefined,
                    fontWeight: formData.fleet_operation_id ? 800 : 'normal'
                  }}
                  value={formData.fleet_operation_id || ''} 
                  onChange={e => {
                    const opId = e.target.value;
                    const op = fleetOperations?.find((o: any) => String(o.id) === String(opId));
                    if (op) {
                      const targetWh = warehousesList?.find((w: any) => 
                        op.vehicle_id && w.vehicle_id === op.vehicle_id
                      ) || warehousesList?.find((w: any) => 
                        op.vehicle_id && w.id === op.vehicle_id
                      );
                      setFormData(prev => ({
                        ...prev,
                        fleet_operation_id: opId,
                        delegate_id: op.driver_id || prev.delegate_id,
                        partner_id: op.driver_id || prev.partner_id,
                        destination_warehouse_id: (actionType === 'out' && targetWh) ? targetWh.id : prev.destination_warehouse_id
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        fleet_operation_id: '',
                        delegate_id: '',
                        partner_id: ''
                      }));
                    }
                  }}
              >
                  <option value="">-- ربط برحلة تزويد صهريج وقود --</option>
                  {fleetOperations?.map((op: any) => {
                      const driverName = op.driver?.name || 'بدون مشغل / سائق';
                      const carPlate = op.vehicle?.plate_number || 'بدون صهريج';
                      const desc = op.description ? ` (${op.description})` : '';
                      return (
                        <option key={op.id} value={op.id}>
                          {`🚛 ${op.operation_number} | مشغل الصهريج: ${driverName} | الصهريج: ${carPlate}${desc} - [${op.operation_date || ''}]`}
                        </option>
                      );
                  })}
              </select>

              {formData.fleet_operation_id && (() => {
                const selectedOp = fleetOperations?.find((o: any) => String(o.id) === String(formData.fleet_operation_id));
                return selectedOp ? (
                  <div style={{ 
                    marginTop: '8px', padding: '8px 12px', borderRadius: '10px', 
                    background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.25)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' 
                  }}>
                    <span style={{ fontWeight: 800, color: '#0369a1' }}>
                      ✅ تم ربط رحلة الوقود: {selectedOp.operation_number}
                    </span>
                    <span style={{ color: '#0284c7', fontWeight: 800 }}>
                      👤 مشغل الصهريج: {selectedOp.driver?.name || 'محدد'} | 🚛 {selectedOp.vehicle?.plate_number || ''}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* الطرف المرتبط / مشغل المحطة */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>
                {actionType === 'in' 
                  ? '👤 المورد / جهة توريد الوقود (اختياري)' 
                  : actionType === 'waste'
                  ? '👤 المسؤول عن الفاقد / المشغل (اختياري)'
                  : actionType === 'empty_return'
                  ? '👤 العميل أو مشغل المحطة (اختياري)'
                  : '👤 مشغل المحطة المستلم / الطرف المرتبط'}
              </label>
              <SearchableSelect
                options={partners.map((p: any) => ({
                  label: `${p.name} (${p.partner_type || 'طرف'})`,
                  value: p.id
                }))}
                value={formData.partner_id || formData.delegate_id}
                onChange={val => setFormData(prev => ({ ...prev, partner_id: val, delegate_id: val }))}
                placeholder="-- ابحث عن مشغل المحطة أو الطرف المرتبط --"
              />
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
                      <span>عدد البراميل / العبوات المسترجعة:</span>
                      <span style={{ fontWeight: 900, fontSize: '16px' }}>{formData.quantity} برميل/عبوة</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>
                      💡 سيتم إضافة هذه البراميل/العبوات لرصيد المستودع أو المحطة المختار بعد اعتماد الحركة.
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
                          : '🔄 تأكيد استلام البراميل / العبوات')))}
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
