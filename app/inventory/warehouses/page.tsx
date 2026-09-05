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

  const columns = [
    { key: 'name', label: 'اسم المستودع', sortable: true },
    { key: 'type', label: 'النوع', sortable: true, render: (row: any) => {
        if (row.type === 'main') return <span style={{color: THEME.primary, fontWeight: 'bold'}}>رئيسي</span>;
        if (row.type === 'vehicle') return <span style={{color: '#3b82f6', fontWeight: 'bold'}}>سيارة توزيع</span>;
        return <span style={{color: '#8b5cf6', fontWeight: 'bold'}}>مستودع فرعي</span>;
    } },
    { key: 'is_active', label: 'الحالة', sortable: true, render: (row: any) => row.is_active ? 'نشط' : 'غير نشط' },
    { key: 'created_at', label: 'تاريخ الإنشاء', sortable: true, render: (row: any) => new Date(row.created_at).toLocaleDateString('ar-EG') },
  ];

  return (
    <>
      <MasterPage 
        title="إدارة المستودعات (Multi-Warehouse)" 
        subtitle="إدارة المستودعات الرئيسية، الفرعية، وسيارات التوزيع"
      >
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-main-glass blue" style={{ width: 'auto' }} onClick={logic.handleAddNew}>
                ➕ إضافة مستودع فرعي جديد
            </button>
        </div>

        <div className="clickable-rows cinematic-scroll">
            <RawasiSmartTable
                columns={columns}
                data={logic.warehouses}
                onRowClick={(row) => logic.handleEdit(row)}
            />
        </div>
      </MasterPage>

      {logic.isModalOpen && (
        <AquaModalWrapper
            isOpen={logic.isModalOpen}
            onClose={() => logic.setIsModalOpen(false)}
            title={logic.currentRecord.id ? 'تعديل المستودع' : 'إضافة مستودع جديد'}
            icon="🏭"
            width="400px"
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
                          <option value="main">رئيسي</option>
                          <option value="sub">مستودع فرعي</option>
                          <option value="vehicle">سيارة توزيع</option>
                      </select>
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

