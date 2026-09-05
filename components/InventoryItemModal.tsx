import React from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import SearchableSelect from './SearchableSelect';
import { THEME } from '@/lib/theme';

export default function InventoryItemModal({ isOpen, onClose, currentRecord, setCurrentRecord, handleSave, isSaving }: any) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted || !isOpen) return null;

  return (
    <AquaModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        title={currentRecord.id ? 'تعديل بيانات صنف خامة' : 'إضافة صنف خامة جديد للدليل'}
        icon={currentRecord.id ? '✏️' : '📦'}
        width="650px"
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>كود الصنف</label>
              <input type="text" className="glass-input-field" placeholder="مثال: WTR-330" value={currentRecord.code || ''} onChange={e => setCurrentRecord({...currentRecord, code: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>اسم الخامة / الصنف المورد</label>
              <input type="text" className="glass-input-field" placeholder="مثال: مياه شرب 330 مل" value={currentRecord.name || ''} onChange={e => setCurrentRecord({...currentRecord, name: e.target.value})} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>وحدة القياس الافتراضية</label>
              <SearchableSelect 
                options={['كرتون', 'ربطة', 'حبة', 'شوال', 'صندوق', 'كجم', 'لتر', 'جالون']} 
                value={currentRecord.unit || ''} 
                onChange={val => setCurrentRecord({...currentRecord, unit: val})}
                placeholder="اختر وحدة القياس..."
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>حد إعادة الطلب</label>
              <input type="number" className="glass-input-field" placeholder="5" value={currentRecord.reorder_level || ''} onChange={e => setCurrentRecord({...currentRecord, reorder_level: Number(e.target.value)})} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
             <div>
              <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>الرصيد الافتتاحي (اختياري)</label>
              <input type="number" className="glass-input-field" placeholder="0" value={currentRecord.current_quantity || ''} onChange={e => setCurrentRecord({...currentRecord, current_quantity: Number(e.target.value)})} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '8px', display: 'block' }}>ملاحظات فنية ومواصفات</label>
            <textarea className="glass-input-field" rows={2} placeholder="أي مواصفات فنية خاصة بالخامة..." value={currentRecord.notes || ''} onChange={e => setCurrentRecord({...currentRecord, notes: e.target.value})} style={{ resize: 'vertical' }}></textarea>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
          <button onClick={handleSave} disabled={isSaving} className="btn-glass-save" style={{ flex: 2 }}>{isSaving ? '⏳ جاري الحفظ...' : '💾 حفظ الصنف'}</button>
          <button onClick={onClose} className="btn-glass-cancel" style={{ flex: 1 }}>إلغاء</button>
        </div>
    </AquaModalWrapper>
  );
}
