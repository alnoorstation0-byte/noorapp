"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import SecureAction from '@/components/SecureAction';
import { useWarehousesLogic } from './warehouses_logic';
import { THEME } from '@/lib/theme';
import { createPortal } from 'react-dom';
import RawasiSmartTable from '@/components/rawasismarttable';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';

export default function WarehousesPage() {
  const logic = useWarehousesLogic();
  const [selectedIds, setSelectedIds] = React.useState<any[]>([]);

  const columns = [
    { key: 'name', label: 'اسم محطة الوقود / الخزان', sortable: true },
    { key: 'type', label: 'النوع', sortable: true, render: (row: any) => {
        if (row.type === 'main') return <span style={{color: THEME.primary, fontWeight: 'bold'}}>خزان رئيسي ⛽</span>;
        if (row.type === 'vehicle') return <span style={{color: '#3b82f6', fontWeight: 'bold'}}>صهريج محروقات 🚛</span>;
        if (row.type === 'pos') return <span style={{color: '#eab308', fontWeight: 'bold'}}>محطة وقود ومضخات (POS) ⛽</span>;
        return <span style={{color: '#8b5cf6', fontWeight: 'bold'}}>خزان فرعي / أرضي</span>;
    } },
    { key: 'location', label: 'العنوان / الموقع', render: (row: any) => row.location || '---' },
    { key: 'phone', label: 'الهاتف', render: (row: any) => row.phone || '---' },
    { key: 'manager_name', label: 'مشغل المحطة / المسؤول', render: (row: any) => row.manager_name || '---' },
    { key: 'is_active', label: 'الحالة', sortable: true, render: (row: any) => row.is_active ? 'نشط' : 'غير نشط' },
  
    { key: 'actions', label: 'إجراءات', type: 'actions', render: (row: any) => (
        <div className="table-actions-container" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '6px', justifyContent: 'center', alignItems: 'center', minWidth: '125px' }}>
            <button 
                onClick={(e) => { e.stopPropagation(); logic.handleEdit(row); }} 
                className="table-action-btn edit-btn" 
                style={{
                    background: 'rgba(0, 229, 255, 0.15)',
                    color: '#00E5FF',
                    border: '1px solid rgba(0, 229, 255, 0.35)',
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
      <RawasiSidebarManager 
        summary={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="summary-glass-card" style={{ padding: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>إجمالي المحطات والخزانات ⛽</span>
              <div className="val" style={{ fontSize: '22px', fontWeight: 900, color: '#F8FAFC', marginTop: '4px' }}>
                {logic.warehouses?.length || 0} محطة / خزان
              </div>
            </div>
            <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '8px' }}>
              <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#10B981' }}>النشطة ✅</span>
                <div className="val" style={{ fontSize: '17px', fontWeight: 900, color: '#10B981' }}>
                  {logic.warehouses?.filter((w: any) => w.is_active).length || 0}
                </div>
              </div>
              <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#00E5FF' }}>محطات الوقود ⛽</span>
                <div className="val" style={{ fontSize: '17px', fontWeight: 900, color: '#00E5FF' }}>
                  {logic.warehouses?.filter((w: any) => w.type === 'pos' || w.type === 'main').length || 0}
                </div>
              </div>
            </div>
          </div>
        }
        actions={
          <button 
            type="button" 
            className="btn-main-glass gold desert-btn-primary"
            onClick={logic.handleAddNew}
            style={{ width: '100%', minHeight: '44px', fontWeight: 900 }}
          >
            <span>➕</span>
            <span>إضافة محطة وقود / خزان جديد</span>
          </button>
        }
        watchDeps={[logic.warehouses?.length]}
      />

      <div className="clean-page">
        <MasterPage 
          icon="⛽"
          title="إدارة محطات الوقود وخزانات المحروقات" 
          subtitle="إدارة محطات الوقود، الخزانات الرئيسية والأرضية، ومضخات التعبئة"
        >
          {/* 🌟 شريط التحكم والعمليات الرئيسي بتصميم الزجاج الصحراوي */}
          <div className="desert-glass" style={{
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px'
          }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: 'rgba(0, 229, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      border: '1px solid rgba(0, 229, 255, 0.3)'
                  }}>
                      ⛽
                  </div>
                  <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#F8FAFC' }}>
                          محطات الوقود وخزانات المحروقات
                      </h3>
                      <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                          {logic.warehouses.length} محطة وخزان مسجل في النظام
                      </span>
                  </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedIds.length > 0 && (
                      <button 
                          className="btn-main-glass red" 
                          onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} محطة / خزان؟`)) {
                                  selectedIds.forEach(id => {
                                      const row = logic.warehouses.find((w: any) => w.id === id);
                                      if (row && row.type !== 'main' && row.type !== 'vehicle') {
                                          logic.handleDelete(id);
                                      }
                                  });
                                  setSelectedIds([]);
                              }
                          }}
                      >
                          🗑️ حذف المحدد ({selectedIds.length})
                      </button>
                  )}
                  <button 
                      type="button"
                      className="btn-main-glass gold desert-btn-primary" 
                      onClick={logic.handleAddNew}
                      style={{
                          minHeight: '46px',
                          padding: '10px 24px',
                          fontSize: '14px',
                          fontWeight: 900,
                          boxShadow: '0 8px 20px rgba(0, 229, 255, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                      }}
                  >
                      <span style={{ fontSize: '18px' }}>➕</span>
                      <span>إضافة محطة وقود / خزان جديد</span>
                  </button>
              </div>
          </div>

          <div className="clickable-rows cinematic-scroll">
              <RawasiSmartTable columns={columns} data={logic.warehouses} selectable={true} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          </div>
        </MasterPage>
      </div>

      {logic.isModalOpen && (
        <AquaModalWrapper
            isOpen={logic.isModalOpen}
            onClose={() => logic.setIsModalOpen(false)}
            title={logic.currentRecord.id ? 'تعديل بيانات المحطة / الخزان' : 'إضافة محطة وقود / خزان جديد'}
            icon="⛽"
            width="500px"
        >
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم المحطة / الخزان</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.name || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, name: e.target.value})}
                      />
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نوع الخزان / المنشأة</label>
                      <select 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.type || 'pos'}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, type: e.target.value})}
                          disabled={logic.currentRecord.type === 'main' || logic.currentRecord.type === 'vehicle'}
                      >
                          <option value="main">خزان رئيسي (محطة رئيسية)</option>
                          <option value="pos">محطة وقود / مضخات (POS)</option>
                          <option value="sub">خزان فرعي / أرضي</option>
                          <option value="vehicle">صهريج نقل محروقات</option>
                      </select>
                  </div>

                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>العنوان / الموقع الجغرافي</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.location || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, location: e.target.value})}
                      />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>رقم الهاتف / الطوارئ</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.phone || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, phone: e.target.value})}
                      />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>مشغل المحطة / المسؤول</label>
                      <input 
                          type="text" 
                          className="glass-input-field" 
                          style={{ width: '100%' }}
                          value={logic.currentRecord.manager_name || ''}
                          onChange={e => logic.setCurrentRecord({...logic.currentRecord, manager_name: e.target.value})}
                      />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>وصف / سعة الخزان / ملاحظات</label>
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
                          {logic.isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
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

