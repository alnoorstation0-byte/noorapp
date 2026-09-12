"use client";
import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { THEME } from '@/lib/theme';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import TranslatableInput from '@/components/TranslatableInput';

const partnerTypes = ['مورد', 'عميل', 'موظف', 'أخرى', 'مندوب 🚚'];

function usePartnersLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { can } = usePermissions();

    const [globalSearch, setGlobalSearch] = useState('');
    const [filterType, setFilterType] = useState('الكل');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<any>(null);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        partner_type: 'عميل',
        phone: '',
        vat_number: '',
        address: '',
        job_role: '',
        identity_number: ''
    });

    const { data: partners = [], isLoading, isError } = useQuery({
        queryKey: ['partners'],
        queryFn: async () => {
            const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data as any[];
        }
    });

    const displayedPartners = useMemo(() => {
        let res = partners;
        if (filterType !== 'الكل') {
            res = res.filter(p => p.partner_type === filterType);
        }
        if (globalSearch) {
            const lower = globalSearch.toLowerCase();
            res = res.filter(p => p.name?.toLowerCase().includes(lower) || p.phone?.includes(lower) || p.code?.toLowerCase().includes(lower));
        }
        return res;
    }, [partners, filterType, globalSearch]);

    const addPartnerMutation = useMutation({
        mutationFn: async (newP: any) => {
            const partnerCode = newP.code?.trim() || `P-${Date.now().toString().slice(-6)}`;
            const payload = {
                code: partnerCode,
                name: newP.name.trim(),
                partner_type: newP.partner_type || 'عميل',
                phone: newP.phone?.trim() || null,
                vat_number: newP.vat_number?.trim() || null,
                address: newP.address?.trim() || null,
                job_role: newP.job_role?.trim() || null,
                identity_number: newP.identity_number?.trim() || null
            };
            const { data, error } = await supabase.from('partners').insert([payload]).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            showToast('تمت إضافة الشريك بنجاح 🟢', 'success');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
        onError: (err: any) => showToast(err.message, 'error')
    });

    const updatePartnerMutation = useMutation({
        mutationFn: async (updatedP: any) => {
            const { id, ...rest } = updatedP;
            const payload: any = {
                name: rest.name?.trim(),
                partner_type: rest.partner_type,
                phone: rest.phone?.trim() || null,
                vat_number: rest.vat_number?.trim() || null,
                address: rest.address?.trim() || null,
                job_role: rest.job_role?.trim() || null,
                identity_number: rest.identity_number?.trim() || null
            };
            if (rest.code?.trim()) {
                payload.code = rest.code.trim();
            }
            const { data, error } = await supabase.from('partners').update(payload).eq('id', id).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            showToast('تم التحديث بنجاح 🔄', 'success');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
        onError: (err: any) => showToast(err.message, 'error')
    });

    const deletePartnerMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast('تم الحذف بنجاح 🗑️', 'success');
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
        onError: (err: any) => showToast(err.message, 'error')
    });

    return {
        isLoading, isError,
        globalSearch, setGlobalSearch,
        filterType, setFilterType,
        isModalOpen, setIsModalOpen,
        editingPartner, setEditingPartner,
        formData, setFormData,
        displayedPartners,
        addPartnerMutation, updatePartnerMutation, deletePartnerMutation,
        can, showToast
    };
}

export default function PartnersPage() {
    const logic = usePartnersLogic();

    const columns = useMemo(() => [
        { 
          header: 'الكود', 
          accessor: 'code', 
          render: (row: any) => (
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#475569', background: 'rgba(28, 115, 171, 0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
              {row.code || '---'}
            </span>
          ) 
        },
        { header: 'اسم الشريك', accessor: 'name', render: (row: any) => <b style={{ color: THEME.primary }}>{row.name}</b> },
        { 
          header: 'النوع', 
          accessor: 'partner_type',
          render: (row: any) => {
            let bg = '#e2e8f0', c = '#475569';
            if (row.partner_type === 'مورد') { bg = '#fee2e2'; c = '#dc2626'; }
            if (row.partner_type === 'عميل') { bg = '#dcfce7'; c = '#16a34a'; }
            if (row.partner_type === 'موظف') { bg = '#e0e7ff'; c = '#4f46e5'; }
            if (row.partner_type === 'مندوب 🚚') { bg = '#fef9c3'; c = '#ca8a04'; }
            return <span style={{ background: bg, color: c, padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>{row.partner_type}</span>;
          }
        },
        { header: 'رقم الهاتف', accessor: 'phone', render: (row: any) => row.phone || '-' },
        { header: 'الرقم الضريبي', accessor: 'vat_number', render: (row: any) => row.vat_number || '-' },
        {
          header: 'إجراءات',
          accessor: 'actions',
          render: (row: any) => (
            <div style={{ display: 'flex', gap: '8px' }}>
              <SecureAction module="partners" action="edit">
                  <button className="btn-icon edit" title="تعديل" onClick={() => {
                      logic.setEditingPartner(row);
                      logic.setFormData({
                          code: row.code || '',
                          name: row.name || '',
                          partner_type: row.partner_type || 'عميل',
                          phone: row.phone || '',
                          vat_number: row.vat_number || '',
                          address: row.address || '',
                          job_role: row.job_role || '',
                          identity_number: row.identity_number || ''
                      });
                      logic.setIsModalOpen(true);
                  }}>✏️</button>
              </SecureAction>
              <SecureAction module="partners" action="delete">
                  <button className="btn-icon delete" title="حذف" onClick={() => {
                      if (confirm('تأكيد الحذف؟')) logic.deletePartnerMutation.mutate(row.id);
                  }}>🗑️</button>
              </SecureAction>
            </div>
          )
        }
    ], [logic]);

    const sidebarActions = (
      <SecureAction module="partners" action="create">
        <button className="btn-main-glass" onClick={() => {
            logic.setEditingPartner(null);
            logic.setFormData({ code: '', name: '', partner_type: 'عميل', phone: '', vat_number: '', address: '', job_role: '', identity_number: '' });
            logic.setIsModalOpen(true);
        }}>➕ شريك جديد</button>
      </SecureAction>
    );

    return (
        <div className="clean-page">
            <MasterPage icon="🤝" title="دليل الشركاء" subtitle="إدارة الموردين، العملاء، المناديب، والموظفين">
                <RawasiSidebarManager 
                    summary={
                        <div className="summary-glass-card">
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>إجمالي الشركاء</span>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: THEME.primary }}>{logic.displayedPartners.length}</div>
                        </div>
                    }
                    actions={sidebarActions}
                    customFilters={
                        <div>
                            <label className="filter-label">تصفية حسب النوع</label>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                {['الكل', 'مورد', 'عميل', 'موظف', 'مندوب 🚚'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => logic.setFilterType(t)}
                                        className={`filter-btn ${logic.filterType === t ? 'active' : ''}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    }
                    onSearch={logic.setGlobalSearch}
                    watchDeps={[logic.filterType, logic.globalSearch]}
                />

                <style>{`
                    .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); background: rgba(40, 145, 200, 0.1); color: ${THEME.primary}; backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    .btn-main-glass:hover { background: rgba(40, 145, 200, 0.2); transform: translateY(-3px); }
                    .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; text-align: center; }
                    .filter-label { color: white; fontSize: 11px; font-weight: 900; display: block; margin-bottom: 8px; }
                    .filter-btn { padding: 8px 12px; border-radius: 10px; background: rgba(255,255,255,0.1); color: white; border: none; font-weight: 900; cursor: pointer; font-size: 11px; transition: 0.3s; flex-grow: 1; text-align: center; }
                    .filter-btn.active { background: ${THEME.goldAccent}; color: #1e293b; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
                    
                    .btn-icon { background: none; border: none; font-size: 16px; cursor: pointer; transition: 0.2s; padding: 5px; border-radius: 8px; }
                    .btn-icon.edit:hover { background: #e0f2fe; }
                    .btn-icon.delete:hover { background: #fee2e2; }

                    /* Modal Styles */
                    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
                    .modal-content { background: white; border-radius: 24px; width: 100%; max-width: 520px; padding: 30px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: zoomIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1); }
                    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    .form-group { margin-bottom: 15px; }
                    .form-label { display: block; font-size: 12px; font-weight: 800; color: #475569; margin-bottom: 5px; }
                    .form-input, .form-select { width: 100%; padding: 12px 15px; border-radius: 12px; border: 1px solid #cbd5e1; font-family: inherit; font-size: 14px; font-weight: 700; color: #1e293b; transition: 0.3s; background: #f8fafc; outline: none; }
                    .form-input:focus, .form-select:focus { border-color: ${THEME.primary}; background: white; box-shadow: 0 0 0 4px rgba(40,145,200,0.1); }
                    .modal-actions { display: flex; gap: 10px; margin-top: 25px; }
                    .btn-save { flex: 2; padding: 12px; border-radius: 12px; background: ${THEME.primary}; color: white; border: none; font-weight: 900; cursor: pointer; transition: 0.2s; }
                    .btn-save:hover { filter: brightness(1.1); transform: translateY(-2px); }
                    .btn-cancel { flex: 1; padding: 12px; border-radius: 12px; background: #f1f5f9; color: #64748b; border: none; font-weight: 900; cursor: pointer; transition: 0.2s; }
                    .btn-cancel:hover { background: #e2e8f0; }
                `}</style>

                {logic.isLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', fontWeight: 900 }}>جاري تحميل الشركاء...</div>
                ) : (
                    <RawasiSmartTable 
                        data={logic.displayedPartners} 
                        columns={columns} 
                    />
                )}
            </MasterPage>

            {logic.isModalOpen && (
                <div className="modal-overlay" onClick={() => logic.setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px 0', color: THEME.primary, fontSize: '20px', fontWeight: 900 }}>
                            {logic.editingPartner ? 'تعديل بيانات الشريك' : 'إضافة شريك جديد'}
                        </h2>
                        
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">كود الشريك (اختياري)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={logic.formData.code} 
                                    onChange={e => logic.setFormData({...logic.formData, code: e.target.value})} 
                                    placeholder="يُولّد تلقائياً إن تُرك فارغاً"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">النوع</label>
                                <select 
                                    className="form-select" 
                                    value={logic.formData.partner_type} 
                                    onChange={e => logic.setFormData({...logic.formData, partner_type: e.target.value})}
                                >
                                    {partnerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <TranslatableInput
                            label="اسم الشريك"
                            required
                            value={logic.formData.name}
                            onChange={val => logic.setFormData(prev => ({ ...prev, name: val }))}
                            placeholder="اسم الشريك بالكامل..."
                            inputClassName="form-input"
                        />

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">رقم الهاتف</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={logic.formData.phone} 
                                    onChange={e => logic.setFormData({...logic.formData, phone: e.target.value})} 
                                    placeholder="05xxxxxxxx"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">الرقم الضريبي</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={logic.formData.vat_number} 
                                    onChange={e => logic.setFormData({...logic.formData, vat_number: e.target.value})} 
                                    placeholder="300xxxxxxxxxxxx"
                                />
                            </div>
                        </div>

                        <TranslatableInput
                            label="العنوان"
                            value={logic.formData.address}
                            onChange={val => logic.setFormData(prev => ({ ...prev, address: val }))}
                            placeholder="المدينة، الحي، الشارع..."
                            inputClassName="form-input"
                        />

                        <div className="modal-actions">
                            <button className="btn-save" onClick={() => {
                                if (!logic.formData.name?.trim()) return logic.showToast('اسم الشريك مطلوب!', 'error');
                                if (logic.editingPartner) {
                                    logic.updatePartnerMutation.mutate({ id: logic.editingPartner.id, ...logic.formData });
                                } else {
                                    logic.addPartnerMutation.mutate(logic.formData);
                                }
                            }}>
                                {logic.editingPartner ? 'حفظ التعديلات' : 'إضافة الشريك'}
                            </button>
                            <button className="btn-cancel" onClick={() => logic.setIsModalOpen(false)}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

