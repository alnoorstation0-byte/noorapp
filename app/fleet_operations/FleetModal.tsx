'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import SmartCombo from '@/components/SmartCombo'; 
import { formatCurrency } from '@/lib/helpers';
import AquaModalWrapper from '@/components/AquaModalWrapper';

export default function FleetModal({ isOpen, onClose, initialData = null, vehicles, drivers, onSave, isSaving }: any) {
    const { showToast } = useToast();
    
    const [formData, setFormData] = useState<any>({
        id: null,
        vehicle_id: '',
        driver_id: '',
        operation_date: new Date().toISOString().split('T')[0],
        status: 'مفتوح',
        notes: ''
    });

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (initialData) {
            setFormData({ ...initialData });
        }
    }, [initialData]);

    if (!mounted || !isOpen) return null;

    return (
        <AquaModalWrapper isOpen={isOpen} onClose={onClose} title={formData.id ? "تعديل أمر الشغل" : "أمر شغل جديد"}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <SmartCombo 
                        label="السيارة"
                        table="vehicles"
                        searchCols="plate_number"
                        displayCol="plate_number"
                        initialDisplay={initialData?.vehicle?.plate_number || ''}
                        onSelect={(v: any) => setFormData({ ...formData, vehicle_id: v?.id || null })}
                    />
                    <SmartCombo 
                        label="المندوب"
                        table="users"
                        searchCols="full_name"
                        displayCol="full_name"
                        initialDisplay={initialData?.driver?.name || ''}
                        onSelect={(u: any) => setFormData({ ...formData, driver_id: u?.id || null })}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: '#475569' }}>التاريخ</label>
                        <input 
                            type="date"
                            value={formData.operation_date}
                            onChange={e => setFormData({ ...formData, operation_date: e.target.value })}
                            className="glass-input-field"
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: '#475569' }}>الحالة</label>
                        <select 
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input-field"
                        >
                            <option value="مفتوح">مفتوح</option>
                            <option value="مغلق">مغلق</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 900, color: '#475569' }}>ملاحظات</label>
                    <textarea 
                        value={formData.notes || ''}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="glass-input-field"
                        rows={3}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                        onClick={() => onSave(formData)} 
                        disabled={isSaving}
                        className="btn-main-glass"
                        style={{ flex: 2, background: '#10b981', color: 'white' }}
                    >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ أمر الشغل'}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="btn-main-glass"
                        style={{ flex: 1, background: '#ef4444', color: 'white' }}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </AquaModalWrapper>
    );
}
