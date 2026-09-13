"use client";
import React from 'react';
import { useFleetLogic } from './fleet_logic';
import MasterPage from '@/components/MasterPage';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import SecureAction from '@/components/SecureAction';

export default function FleetPage() {
  const logic = useFleetLogic();

  const columns = [
    { key: 'plate_number', label: 'رقم اللوحة', sortable: true, render: (row: any) => <span style={{ fontWeight: 900, color: '#3b82f6' }}>{row.plate_number}</span> },
    { key: 'vehicle_model', label: 'نوع / موديل السيارة', sortable: true },
    { key: 'driver', label: 'المندوب المرتبط', sortable: true, render: (row: any) => row.driver?.name || 'غير محدد' },
    { key: 'status', label: 'الحالة', sortable: true, render: (row: any) => (
        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, background: row.status === 'متاح' ? '#dcfce3' : '#fee2e2', color: row.status === 'متاح' ? '#16a34a' : '#dc2626' }}>
            {row.status}
        </span>
    ) },
    { key: 'actions', label: 'إجراءات', type: 'actions', render: (row: any) => (
        <div className="table-actions-container" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '6px', justifyContent: 'center', alignItems: 'center', minWidth: '125px' }}>
            <SecureAction module="fleet" action="edit">
                <button onClick={() => logic.handleEdit(row)} className="table-action-btn edit-btn" style={{ padding: '5px 9px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>✏️ تعديل</button>
            </SecureAction>
            <SecureAction module="fleet" action="delete">
                <button onClick={() => logic.handleDelete(row.id)} className="table-action-btn delete-btn" style={{ padding: '5px 9px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>🗑️ حذف</button>
            </SecureAction>
        </div>
    ) }
  ];

  return (
    <>
    <MasterPage 
      title="إدارة الأسطول (السيارات)" 
      subtitle="إضافة وتعديل بيانات سيارات التوزيع وربطها بالمناديب"
    >
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <SecureAction module="fleet" action="create">
          <button 
            onClick={logic.handleAddNew} 
            className="btn-main-glass" 
            style={{ background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)', color: 'white', padding: '12px 24px', borderRadius: '14px', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(194, 155, 98, 0.35)' }}
          >
            ➕ إضافة سيارة جديدة
          </button>
        </SecureAction>
      </div>

      {logic.isLoading ? (
         <LoadingScreen message="جاري تحميل بيانات الأسطول..." fullScreen={false} />
      ) : (
        <RawasiSmartTable 
          columns={columns}
          data={logic.vehicles}
          pageSize={15}
          onSearch={logic.setSearchQuery}
          watchDeps={[logic.vehicles]}
        />
      )}
    </MasterPage>

    {/* Modal rendered outside MasterPage to prevent z-index/stacking context issues */}
    {logic.isModalOpen && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(44, 26, 18, 0.45)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="apple-card" style={{ padding: '30px', width: '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', margin: 'auto', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(255, 253, 250, 0.85) 100%)', backdropFilter: 'blur(24px)', border: '1px solid rgba(194, 155, 98, 0.35)', boxShadow: '0 20px 40px rgba(44, 26, 18, 0.15)' }}>
            <h2 style={{ margin: '0 0 25px 0', color: '#2C1A12', fontWeight: 900, borderBottom: '2px solid rgba(194, 155, 98, 0.25)', paddingBottom: '10px', textAlign: 'center' }}>
                {logic.currentRecord.id ? 'تعديل سيارة 🚗' : 'إضافة سيارة جديدة 🚗'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#1e293b' }}>رقم اللوحة</label>
                    <input 
                        type="text" 
                        className="form-input glass-input-field"
                        value={logic.currentRecord.plate_number}
                        onChange={(e) => logic.setCurrentRecord({...logic.currentRecord, plate_number: e.target.value})}
                        placeholder="مثال: أ ب ج 1234"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#1e293b' }}>نوع / موديل السيارة</label>
                    <input 
                        type="text" 
                        className="form-input glass-input-field"
                        value={logic.currentRecord.vehicle_model}
                        onChange={(e) => logic.setCurrentRecord({...logic.currentRecord, vehicle_model: e.target.value})}
                        placeholder="مثال: إيسوزو دينا 2023"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#1e293b' }}>المندوب / السائق الأساسي</label>
                    <select 
                        className="form-input glass-input-field"
                        value={logic.currentRecord.driver_id}
                        onChange={(e) => logic.setCurrentRecord({...logic.currentRecord, driver_id: e.target.value})}
                    >
                        <option value="">-- بدون مندوب (غير محدد) --</option>
                        {logic.drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.partner_type})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#1e293b' }}>الحالة</label>
                    <select 
                        className="form-input glass-input-field"
                        value={logic.currentRecord.status}
                        onChange={(e) => logic.setCurrentRecord({...logic.currentRecord, status: e.target.value})}
                    >
                        <option value="متاح">متاح</option>
                        <option value="في الصيانة">في الصيانة</option>
                        <option value="غير متاح">غير متاح</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
                <button 
                    onClick={logic.handleSave}
                    disabled={logic.isSaving}
                    className="btn-main-glass"
                    style={{ flex: 1, background: '#16a34a', color: 'white', fontWeight: 900, padding: '12px' }}
                >
                    {logic.isSaving ? '⏳ جاري الحفظ...' : '✅ حفظ السيارة'}
                </button>
                <button 
                    onClick={() => logic.setIsModalOpen(false)}
                    disabled={logic.isSaving}
                    className="btn-main-glass"
                    style={{ flex: 1, margin: 0, background: '#ef4444', color: 'white', fontWeight: 900, padding: '12px' }}
                >
                    إلغاء
                </button>
            </div>
          </div>
      </div>
    )}
    </>
  );
}
