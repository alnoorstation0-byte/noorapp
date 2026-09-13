"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import SecureAction from '@/components/SecureAction';
import { useWarehousesLogic } from './warehouses_logic';
import { THEME } from '@/lib/theme';
import { createPortal } from 'react-dom';
import RawasiSmartTable from '@/components/rawasismarttable';
import AquaModalWrapper from '@/components/AquaModalWrapper';

export default function WarehousesPage() {
  const logic = useWarehousesLogic();
  const [selectedIds, setSelectedIds] = React.useState<any[]>([]);

  const columns = [
    { key: 'name', label: 'اسم المستودع / المنفذ', sortable: true },
    { key: 'type', label: 'النوع', sortable: true, render: (row: any) => {
        if (row.type === 'main') return <span style={{color: THEME.primary, fontWeight: 'bold'}}>رئيسي</span>;
        if (row.type === 'vehicle') return <span style={{color: '#3b82f6', fontWeight: 'bold'}}>سيارة / متنقل</span>;
        if (row.type === 'pos') return <span style={{color: '#eab308', fontWeight: 'bold'}}>منفذ بيع (POS)</span>;
        return <span style={{color: '#8b5cf6', fontWeight: 'bold'}}>مستودع فرعي</span>;
    } },
    { key: 'location', label: 'العنوان', render: (row: any) => row.location || '---' },
    { key: 'phone', label: 'الهاتف', render: (row: any) => row.phone || '---' },
    { key: 'manager_name', label: 'المسؤول', render: (row: any) => row.manager_name || '---' },
    { key: 'is_active', label: 'الحالة', sortable: true, render: (row: any) => row.is_active ? 'نشط' : 'غير نشط' },
  
    { key: 'actions', label: 'إجراءات', type: 'actions', render: (row: any) => (
        <div className="table-actions-container" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '6px', justifyContent: 'center', alignItems: 'center', minWidth: '125px' }}>
            <button 
                onClick={(e) => { e.stopPropagation(); logic.handleEdit(row); }} 
                className="table-action-btn edit-btn" 
                style={{
                    background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 9px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                }}
            >
                ✏️ تعديل
            </button>
            {row.type !== 'main' && row.type !== 'vehicle' && (
                <button 
                    onClick={(e) => { e.stopPropagation(); logic.handleDelete(row.id); }} 
                    className="table-action-btn delete-btn" 
                    style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '5px 9px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}
                >
                    🗑️ حذف
                </button>
            )}
        </div>
    )},
  ];

  return (
    <>
      <MasterPage 
        title="إدارة المستودعات (Multi-Warehouse)" 
        subtitle="إدارة المستودعات الرئيسية، الفرعية، وسيارات التوزيع"
      >
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {selectedIds.length > 0 && (
                <button className="btn-main-glass red" style={{ width: 'auto' }} onClick={() => {
                    if (window.confirm('هل أنت متأكد من حذف المستودعات المحددة؟')) {
                        selectedIds.forEach(id => {
                            const row = logic.warehouses.find((w: any) => w.id === id);
                            if (row && row.type !== 'main' && row.type !== 'vehicle') {
                                logic.handleDelete(id);
                            }
                        });
                        setSelectedIds([]);
                    }
                }}>
                    🗑️ حذف المحدد
                </button>
            )}
            <button className="btn-main-glass blue" style={{ width: 'auto' }} onClick={logic.handleAddNew}>
                ➕ إضافة مستودع / منفذ جديد
            </button>
        </div>

        <div className="clickable-rows cinematic-scroll">
            <RawasiSmartTable columns={columns} data={logic.warehouses} selectable={true} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
        </div>
      </MasterPage>

      {logic.isModalOpen && (
        <AquaModalWrapper
            isOpen={logic.isModalOpen}
            onClose={() => logic.setIsModalOpen(false)}
            title={logic.currentRecord.id ? 'تعديل المستودع' : 'إضافة مستودع جديد'}
            icon="🏭"
            width="500px"
        >
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم المستودع</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.name || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, name: e.target.value})}
                      />
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نوع المستودع</label>
                      <select 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.type || 'sub'}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, type: e.target.value})}
                          disabled={logic.currentRecord.type === 'main' || logic.currentRecord.type === 'vehicle'}
                      >
                          <option value="main">مستودع رئيسي</option>
                          <option value="sub">مستودع فرعي</option>
                          <option value="pos">منفذ بيع (POS)</option>
                          <option value="vehicle">سيارة / متنقل</option>
                      </select>
                  </div>

                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>العنوان / الموقع</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.location || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, location: e.target.value})}
                      />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>رقم الهاتف</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.phone || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, phone: e.target.value})}
                      />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المسؤول</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.manager_name || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, manager_name: e.target.value})}
                      />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>وصف / ملاحظات</label>
                      <textarea 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          rows={2}
                          value={logic.currentRecord.description || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, description: e.target.value})}
                      />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input 
                              type="checkbox" 
                              checked={logic.currentRecord.is_active}
                              onChange={e => logic.setCurrentRecord({...logic.currentRecord, is_active: e.target.checked})}
                          />
                          <span style={{ fontWeight: 'bold', color: THEME.primary }}>نشط</span>
                      </label>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={logic.handleSave} disabled={logic.isSaving} className="btn-main-glass gold" style={{ flex: 2, margin: 0 }}>
                          {logic.isSaving ? 'جاري الحفظ...' : 'حفظ المستودع'}
                      </button>
                      <button onClick={() => logic.setIsModalOpen(false)} className="btn-main-glass white" style={{ flex: 1, margin: 0 }}>
                          إلغاء
                      </button>
                  </div>
        </AquaModalWrapper>
      )}
    </>
  );
}

