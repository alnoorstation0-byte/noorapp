"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import { useToast , showGlobalToast} from '@/lib/toast-context'; 
import SmartCombo from '@/components/SmartCombo'; 

interface ProfileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: any; 
    onSave: () => void;
}

export default function ProfileEditorModal({ isOpen, onClose, record, onSave }: ProfileEditorModalProps) {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false); 

    const defaultPermissions = {
        dashboard: { view: false },
        global_summary: { view: false },
        fleet: { view: false, create: false, edit: false, delete: false },
        fleet_operations: { view: false, create: false, edit: false, delete: false, post: false },
        invoices: { view: false, create: false, edit: false, delete: false, post: false },
        purchase_orders: { view: false, create: false, edit: false, delete: false, post: false },
        inventory: { view: false, create: false, edit: false, delete: false },
        warehouses: { view: false, create: false, edit: false, delete: false },
        inventory_transactions: { view: false, create: false, edit: false, delete: false, post: false },
        receipts: { view: false, create: false, edit: false, delete: false, post: false },
        payments: { view: false, create: false, edit: false, delete: false, post: false },
        expenses: { view: false, create: false, edit: false, delete: false, post: false },
        journal: { view: false, delete: false },
        manual_journals: { view: false, create: false, edit: false, delete: false, post: false },
        accounts: { view: false, create: false, edit: false, delete: false },
        ledger: { view: false },
        trialbalance: { view: false },
        financial_center: { view: false },
        financial_statements: { view: false },
        cashflows: { view: false },
        partners: { view: false, create: false, edit: false, delete: false },
        partner_balances: { view: false },
        delegate_debts: { view: false },
        delegate_settlements: { view: false },
        statement: { view: false },
        reports: { view: false },
        import: { view: false, create: false },
        audit: { view: false },
        payroll: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, edit: false },
        team: { view: false, create: false, edit: false, delete: false },
        profile: { view: false, edit: false }
    };

    const [form, setForm] = useState({
        full_name: '',
        role: 'client',
        email: '',
        phone: '',
        password: '',
        is_active: true,
        linked_partner_id: null,
        permissions: defaultPermissions
    });

    useEffect(() => {
        setMounted(true); 
        if (record && isOpen) {
            const mergedPermissions = JSON.parse(JSON.stringify(defaultPermissions)); 
            
            if (record.permissions) {
                Object.keys(defaultPermissions).forEach((moduleKey) => {
                    if (record.permissions[moduleKey]) {
                        mergedPermissions[moduleKey] = {
                            ...mergedPermissions[moduleKey],
                            ...record.permissions[moduleKey]
                        };
                    }
                });
            }

            setForm({
                full_name: record.full_name || '',
                role: record.role || 'client',
                email: record.email || '', 
                phone: record.phone_number || '', 
                password: '', 
                is_active: record.is_active !== false, 
                linked_partner_id: record.linked_partner_id || null, 
                permissions: mergedPermissions
            });
        } else if (!record && isOpen) {
            setForm({
                full_name: '',
                role: 'client',
                email: '',
                phone: '',
                password: '',
                is_active: true,
                linked_partner_id: null,
                permissions: JSON.parse(JSON.stringify(defaultPermissions))
            });
        }
    }, [record, isOpen]);

    if (!isOpen || !mounted) return null;

    const togglePerm = (module: string, action: string) => {
        setForm(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [module]: { ...(prev.permissions as any)[module], [action]: !(prev.permissions as any)[module][action] }
            }
        }));
    };

    const toggleAllInModule = (module: string) => {
        const modulePerms = (form.permissions as any)[module];
        const allActive = Object.values(modulePerms).every(v => v === true);
        const newState = !allActive;

        const updatedModule: any = {};
        Object.keys(modulePerms).forEach(key => updatedModule[key] = newState);

        setForm(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [module]: updatedModule }
        }));
    };

    const handleSave = async () => {
        if (!form.email || !form.full_name) {
            showToast("الرجاء إدخال الاسم والبريد الإلكتروني", 'error');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                userId: record?.id, 
                email: form.email,
                password: form.password,
                phone: form.phone,
                full_name: form.full_name,
                role: form.role,
                is_active: form.is_active,
                linked_partner_id: form.linked_partner_id,
                permissions: form.permissions
            };

            const res = await fetch('/api/admin/users', {
                method: record?.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Unknown error');
            }

            showGlobalToast("تم حفظ بيانات المستخدم بنجاح!", 'success');
            onSave();
            
        } catch (error: any) {
            console.error("API Error:", error);
            showGlobalToast(`عذراً، تعذر الحفظ! السبب: ${error.message}`, 'warning');
        } finally {
            setIsSaving(false);
        }
    };

    const moduleNames: any = {
        dashboard: 'لوحة القيادة',
        global_summary: 'الملخص العام',
        fleet: 'إدارة السيارات',
        fleet_operations: 'رحلات التشغيل',
        invoices: 'الفواتير والمبيعات',
        purchase_orders: 'أوامر الشراء',
        inventory: 'دليل الأصناف',
        warehouses: 'المستودعات',
        inventory_transactions: 'حركات المخزون',
        receipts: 'سندات القبض',
        payments: 'سندات الصرف',
        expenses: 'المصروفات',
        journal: 'دفتر اليومية',
        manual_journals: 'القيود اليدوية',
        accounts: 'شجرة الحسابات',
        ledger: 'دفتر الأستاذ',
        trialbalance: 'ميزان المراجعة',
        financial_center: 'المركز المالي',
        financial_statements: 'القوائم المالية',
        cashflows: 'التدفقات النقدية',
        partners: 'دليل العملاء',
        partner_balances: 'أرصدة العملاء',
        delegate_debts: 'ذمم المناديب',
        delegate_settlements: 'تسويات العهد',
        statement: 'كشف حساب',
        reports: 'التقارير الشاملة',
        import: 'استيراد البيانات',
        audit: 'المراجعة والتدقيق',
        payroll: 'الرواتب والأجور',
        settings: 'إعدادات النظام',
        team: 'إدارة الفريق',
        profile: 'الملف الشخصي'
    };

    const isNewUser = !record?.id;

    const modalContent = (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)' }} onClick={onClose} />

            <style>{`
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .perm-btn {
                    padding: 8px 15px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .perm-btn.active {
                    background: ${THEME.primary}; color: white; border-color: ${THEME.primary}; box-shadow: 0 4px 10px ${THEME.primary}40;
                }
                .btn-all {
                    padding: 4px 10px; border-radius: 6px; border: none; background: #e2e8f0; color: #475569; font-size: 11px; font-weight: bold; cursor: pointer;
                }
                .btn-all:hover { background: #cbd5e1; }
            `}</style>

            <div style={{ position: 'relative', width: '900px', maxWidth: '95vw', height: '90vh', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(40px)', borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                
                <div style={{ padding: '25px 40px', borderBottom: '1px solid rgba(40, 145, 200, 0.1)', background: 'linear-gradient(to right, rgba(28, 115, 171, 0.05), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: THEME.primary }}>
                            {isNewUser ? '👥 إضافة مستخدم جديد' : '✏️ تعديل بيانات المستخدم'}
                        </h2>
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#64748b' }}>إدارة البيانات والصلاحيات الخاصة بالنظام</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>❌</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: '30px' }} className="cinematic-scroll">
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px' }}>الاسم الكامل *</label>
                            <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', outline: 'none' }} placeholder="اسم الموظف..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px' }}>البريد الإلكتروني *</label>
                            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!isNewUser} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #cbd5e1', background: isNewUser ? 'white' : '#f1f5f9', outline: 'none', cursor: isNewUser ? 'text' : 'not-allowed' }} placeholder="example@rawasi.com" />
                            {!isNewUser && <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>لا يمكن تغيير البريد بعد الإنشاء</span>}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px' }}>رقم الجوال</label>
                            <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', outline: 'none' }} placeholder="05xxxxxxxx" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px' }}>
                                {isNewUser ? 'كلمة المرور *' : 'كلمة المرور (اتركها فارغة للإبقاء على الحالية)'}
                            </label>
                            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', outline: 'none' }} placeholder="******" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px' }}>الدور الوظيفي</label>
                            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', outline: 'none' }}>
                                <option value="admin">مدير نظام (Admin)</option>
                                <option value="manager">مدير قسم (Manager)</option>
                                <option value="accountant">محاسب (Accountant)</option>
                                <option value="storekeeper">أمين مستودع (Storekeeper)</option>
                                <option value="delegate">مندوب مبيعات (Delegate)</option>
                                <option value="client">مستخدم عادي (User)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px' }}>الحالة</label>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="radio" checked={form.is_active} onChange={() => setForm({...form, is_active: true})} />
                                    <span style={{ fontWeight: 900, color: '#16a34a' }}>نشط</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="radio" checked={!form.is_active} onChange={() => setForm({...form, is_active: false})} />
                                    <span style={{ fontWeight: 900, color: '#ef4444' }}>موقوف</span>
                                </label>
                            </div>
                        </div>

                        {form.role === 'delegate' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px' }}>
                                    ربط المندوب بـ (Partner / Customer)
                                </label>
                                <SmartCombo 
                                    table="partners"
                                    value={form.linked_partner_id}
                                    onChange={(val) => setForm({...form, linked_partner_id: val})}
                                    placeholder="ابحث عن اسم المندوب في دليل العملاء..."
                                />
                                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                    * مهم جداً: لكي تظهر مبيعات المندوب في (ذمم المناديب) ويمكنه إصدار فواتير، يجب ربط حسابه هنا بالاسم الموجود في دليل العملاء.
                                </span>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 900, color: THEME.primary, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
                            🔒 صلاحيات الوصول والنظام (Permissions)
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {Object.keys(defaultPermissions).map((module) => (
                                <div key={module} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <span style={{ fontWeight: 900, fontSize: '15px', color: '#1e293b' }}>{moduleNames[module] || module}</span>
                                        <button className="btn-all" onClick={() => toggleAllInModule(module)}>الكل</button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {Object.keys((form.permissions as any)[module]).map((action) => (
                                            <button key={action} onClick={() => togglePerm(module, action)} className={`perm-btn ${(form.permissions as any)[module][action] ? 'active' : ''}`}>
                                                {action === 'view' ? '👀 عرض' : 
                                                 action === 'create' ? '➕ إضافة' : 
                                                 action === 'edit' ? '✏️ تعديل' : 
                                                 action === 'delete' ? '🗑️ حذف' : 
                                                 action === 'post' ? '✅ اعتماد' : 
                                                 action === 'financial' ? '💰 مالي' : 
                                                 action === 'operational' ? '⚙️ تشغيلي' : action}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div style={{ padding: '25px 40px', borderTop: '1px solid rgba(255, 255, 255, 0.4)', display: 'flex', gap: '15px', background: 'white', flexShrink: 0 }}>
                    <button 
                        onClick={handleSave} disabled={isSaving}
                        style={{ flex: 2, padding: '18px', borderRadius: '18px', border: 'none', background: THEME.primary, color: 'white', fontWeight: 900, fontSize: '16px', cursor: 'pointer', boxShadow: `0 15px 30px ${THEME.primary}40`, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        {isSaving ? '⏳ جاري الحفظ...' : '💾 اعتماد وحفظ التعديلات'}
                    </button>
                    <button 
                        onClick={onClose} 
                        style={{ flex: 1, padding: '18px', borderRadius: '18px', border: '2px solid rgba(40, 145, 200, 0.15)', background: 'white', color: '#64748b', fontWeight: 900, cursor: 'pointer', fontSize: '16px', transition: '0.3s' }}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}