"use client";
import React, { useState, useEffect } from 'react';
import MasterPage from '@/components/MasterPage';
import { usePromotionsLogic } from './promotions_logic';
import RawasiSmartTable from '@/components/rawasismarttable';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { THEME } from '@/lib/theme';
import { FaPlus, FaEdit, FaTrash, FaGift } from 'react-icons/fa';

export default function PromotionsPage() {
    const logic = usePromotionsLogic();

    const columns = [
        { 
            header: 'العرض الترويجي', 
            accessor: 'name', 
            render: (row: any) => <div style={{ fontWeight: 900, color: THEME.primary }}>{row.name}</div> 
        },
        { 
            header: 'النوع', 
            accessor: 'type', 
            render: (row: any) => {
                const types: any = {
                    'BOGO': 'اشتر x واحصل على y',
                    'THRESHOLD': 'خصم عند بلوغ حد معين',
                    'CROSS_SELLING': 'شراء صنف مع صنف',
                    'TIERED': 'خصم متدرج',
                    'BUNDLE': 'باقة منتجات'
                };
                return types[row.type] || row.type;
            }
        },
        { 
            header: 'الحالة', 
            accessor: 'status', 
            render: (row: any) => (
                <span style={{ 
                    background: row.status === 'active' ? '#dcfce7' : '#f1f5f9', 
                    color: row.status === 'active' ? '#16a34a' : '#64748b', 
                    padding: '4px 8px', 
                    borderRadius: '8px', 
                    fontWeight: 'bold', 
                    fontSize: '12px' 
                }}>
                    {row.status === 'active' ? 'نشط' : (row.status === 'inactive' ? 'غير نشط' : row.status)}
                </span>
            )
        },
        { 
            header: 'تاريخ البداية', 
            accessor: 'start_date', 
            render: (row: any) => row.start_date ? new Date(row.start_date).toLocaleDateString('ar-SA') : '-' 
        },
        { 
            header: 'تاريخ النهاية', 
            accessor: 'end_date', 
            render: (row: any) => row.end_date ? new Date(row.end_date).toLocaleDateString('ar-SA') : '-' 
        },
        { 
            header: 'إجراءات', 
            key: 'actions', 
            render: (row: any) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={() => logic.handleEdit(row)} className="btn-icon" style={{ color: THEME.primary, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '15px' }}><FaEdit /></button>
                    <button onClick={() => logic.handleDelete(row.id)} className="btn-icon" style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '15px' }}><FaTrash /></button>
                </div>
            )
        }
    ];

    return (
        <MasterPage
            title="العروض الترويجية والخصومات"
            subtitle="إدارة الخصومات الذكية وعروض الترويج على المبيعات"
            icon="🎁"
            onSearch={logic.setSearchQuery}
            actions={
                <button 
                    className="btn-main-glass" 
                    onClick={() => { logic.setEditingItem(null); logic.setIsFormOpen(true); }}
                >
                    <FaPlus />
                    <span>عرض ترويجي جديد</span>
                </button>
            }
        >
            <div className="glass-container" style={{ padding: '20px' }}>
                <RawasiSmartTable
                    data={logic.promotions}
                    columns={columns}
                    isLoading={logic.isLoading}
                />
            </div>

            {logic.isFormOpen && (
                <PromotionFormModal 
                    isOpen={logic.isFormOpen} 
                    onClose={() => logic.setIsFormOpen(false)}
                    initialData={logic.editingItem}
                    onSave={logic.saveMutation.mutate}
                    isSaving={logic.saveMutation.isPending}
                    inventoryItems={logic.inventoryItems}
                />
            )}
        </MasterPage>
    );
}

function PromotionFormModal({ isOpen, onClose, initialData, onSave, isSaving, inventoryItems }: any) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'BOGO',
        status: 'active',
        start_date: '',
        end_date: '',
        priority: 1,
        conditions: {} as any,
        rewards: {} as any
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                type: initialData.type || 'BOGO',
                status: initialData.status || 'active',
                start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
                end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
                priority: initialData.priority || 1,
                conditions: initialData.conditions || {},
                rewards: initialData.rewards || {}
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: initialData?.id });
    };

    return (
        <AquaModalWrapper isOpen={isOpen} onClose={onClose} title={initialData ? "تعديل العرض الترويجي" : "عـرض تـرويـجـي جـديـد"} icon="🎁">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label>اسم العرض الترويجي</label>
                        <input required type="text" className="glass-input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>نوع العرض</label>
                        <select className="glass-input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value, conditions: {}, rewards: {}})}>
                            <option value="BOGO">اشتر x واحصل على y مجاناً (أو بخصم)</option>
                            <option value="THRESHOLD">خصم عند بلوغ حد معين من المشتريات</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>الوصف (اختياري)</label>
                    <textarea className="glass-input-field" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label>تاريخ البداية (اختياري)</label>
                        <input type="date" className="glass-input-field" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>تاريخ النهاية (اختياري)</label>
                        <input type="date" className="glass-input-field" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>الحالة</label>
                        <select className="glass-input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                        </select>
                    </div>
                </div>

                <div style={{ background: 'rgba(28, 115, 171, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(28, 115, 171, 0.15)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: THEME.primary }}>إعدادات العرض ({formData.type})</h4>
                    
                    {formData.type === 'BOGO' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label>صنف الشراء (Buy)</label>
                                <select required className="glass-input-field" value={formData.conditions.buy_item_id || ''} onChange={e => setFormData({...formData, conditions: {...formData.conditions, buy_item_id: e.target.value}})}>
                                    <option value="">-- اختر الصنف --</option>
                                    {inventoryItems.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>كمية الشراء المطلوبة</label>
                                <input required type="number" min="1" className="glass-input-field" value={formData.conditions.buy_qty || ''} onChange={e => setFormData({...formData, conditions: {...formData.conditions, buy_qty: Number(e.target.value)}})} />
                            </div>
                            <div className="form-group">
                                <label>الكمية المجانية (Get)</label>
                                <input required type="number" min="1" className="glass-input-field" value={formData.rewards.get_qty || ''} onChange={e => setFormData({...formData, rewards: {...formData.rewards, get_qty: Number(e.target.value)}})} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 3' }}>
                                <label>نسبة الخصم على الكمية المجانية (100 = مجاني بالكامل)</label>
                                <input required type="number" min="1" max="100" className="glass-input-field" value={formData.rewards.discount_percentage || 100} onChange={e => setFormData({...formData, rewards: {...formData.rewards, discount_percentage: Number(e.target.value)}})} />
                            </div>
                        </div>
                    )}

                    {formData.type === 'THRESHOLD' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label>الحد الأدنى لقيمة الفاتورة (الشرط)</label>
                                <input required type="number" min="0" step="any" className="glass-input-field" value={formData.conditions.min_cart_value || ''} onChange={e => setFormData({...formData, conditions: {...formData.conditions, min_cart_value: Number(e.target.value)}})} />
                            </div>
                            <div className="form-group">
                                <label>مبلغ الخصم الثابت</label>
                                <input type="number" min="0" step="any" className="glass-input-field" value={formData.rewards.discount_amount || ''} onChange={e => setFormData({...formData, rewards: {...formData.rewards, discount_amount: Number(e.target.value), discount_percentage: null}})} placeholder="أو استخدم نسبة الخصم" />
                            </div>
                            <div className="form-group">
                                <label>أو نسبة الخصم %</label>
                                <input type="number" min="0" max="100" className="glass-input-field" value={formData.rewards.discount_percentage || ''} onChange={e => setFormData({...formData, rewards: {...formData.rewards, discount_percentage: Number(e.target.value), discount_amount: null}})} placeholder="أو استخدم المبلغ الثابت" />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
                    <button type="submit" disabled={isSaving} className="btn-primary">
                        {isSaving ? 'جاري الحفظ...' : 'حفظ العرض الترويجي'}
                    </button>
                </div>
            </form>
        </AquaModalWrapper>
    );
}
