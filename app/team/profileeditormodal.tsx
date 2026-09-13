"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import { useToast, showGlobalToast } from '@/lib/toast-context'; 
import SmartCombo from '@/components/SmartCombo'; 

interface ProfileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: any; 
    onSave: () => void;
}

const DEFAULT_PERMISSIONS = {
    dashboard: { view: false },
    global_summary: { view: false },
    pos: { view: false, create: false, edit: false, delete: false, post: false },
    pos_dashboard: { view: false },
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

const MODULE_NAMES: Record<string, string> = {
    dashboard: 'لوحة القيادة الرئيسية',
    global_summary: 'الملخص العام والمؤشرات',
    pos: 'نقاط البيع والكاشير (POS)',
    pos_dashboard: 'مؤشرات أداء الكاشير',
    fleet: 'إدارة أسطول السيارات',
    fleet_operations: 'رحلات التشغيل والعمليات',
    invoices: 'فواتير المبيعات والمردودات',
    purchase_orders: 'أوامر الشراء والتوريد',
    inventory: 'دليل الأصناف والمستودع',
    warehouses: 'المستودعات ومواقع التخزين',
    inventory_transactions: 'حركات والتحويلات المخزنية',
    receipts: 'سندات القبض المالية',
    payments: 'سندات الصرف والمدفوعات',
    expenses: 'المصروفات التشغيلية',
    journal: 'دفتر اليومية العامة',
    manual_journals: 'القيود اليومية اليدوية',
    accounts: 'شجرة ودليل الحسابات',
    ledger: 'دفتر الأستاذ العام',
    trialbalance: 'ميزان المراجعة المحاسبي',
    financial_center: 'المركز المالي والموازنات',
    financial_statements: 'القوائم والتقارير المالية',
    cashflows: 'قائمة التدفقات النقدية',
    partners: 'دليل العملاء والموردين',
    partner_balances: 'أرصدة وكشوفات الشركاء',
    delegate_debts: 'ذمم ومستحقات المناديب',
    delegate_settlements: 'تسويات وتصفية العهد',
    statement: 'كشوف الحسابات التفصيلية',
    reports: 'منظومة التقارير الشاملة',
    import: 'استيراد البيانات الخارجية',
    audit: 'سجل المراجعة والتدقيق',
    payroll: 'مسيرات الرواتب والأجور',
    settings: 'إعدادات المنصة والنظام',
    team: 'إدارة الفريق والمستخدمين',
    profile: 'الملف الشخصي للمستخدم'
};

const PERMISSION_GROUPS = [
    {
        id: 'dashboards',
        title: '📊 لوحات التحكم والقيادة ونقاط البيع',
        modules: ['dashboard', 'global_summary', 'pos', 'pos_dashboard']
    },
    {
        id: 'sales_ops',
        title: '💼 المبيعات والتشغيل والمشتريات',
        modules: ['invoices', 'purchase_orders', 'fleet_operations']
    },
    {
        id: 'inventory',
        title: '📦 المخزون والمستودعات والتحويلات',
        modules: ['inventory', 'warehouses', 'inventory_transactions']
    },
    {
        id: 'fleet',
        title: '🚚 الأسطول وإدارة السيارات',
        modules: ['fleet']
    },
    {
        id: 'finance',
        title: '💰 المالية والمحاسبة العامة والشجرة',
        modules: ['receipts', 'payments', 'expenses', 'journal', 'manual_journals', 'accounts', 'ledger', 'trialbalance', 'financial_center', 'financial_statements', 'cashflows']
    },
    {
        id: 'partners',
        title: '🤝 الشركاء (العملاء، الموردين، المناديب والعهد)',
        modules: ['partners', 'partner_balances', 'delegate_debts', 'delegate_settlements', 'statement']
    },
    {
        id: 'admin',
        title: '⚙️ الإدارة العامة والتقارير والنظام',
        modules: ['reports', 'audit', 'payroll', 'import', 'settings', 'team', 'profile']
    }
];

export default function ProfileEditorModal({ isOpen, onClose, record, onSave }: ProfileEditorModalProps) {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false); 
    const [activeTab, setActiveTab] = useState<'info' | 'permissions'>('info');

    const [form, setForm] = useState({
        full_name: '',
        role: 'client',
        email: '',
        phone: '',
        password: '',
        is_active: true,
        linked_partner_id: null as string | null,
        permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
    });

    useEffect(() => {
        setMounted(true); 
        if (record && isOpen) {
            const mergedPermissions = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)); 
            if (record.permissions) {
                Object.keys(DEFAULT_PERMISSIONS).forEach((moduleKey) => {
                    if (record.permissions[moduleKey]) {
                        mergedPermissions[moduleKey] = {
                            ...mergedPermissions[moduleKey],
                            ...record.permissions[moduleKey]
                        };
                    }
                });
            }

            setForm({
                full_name: record.full_name || record.username || '',
                role: record.role || 'client',
                email: record.email || '', 
                phone: record.phone_number || record.phone || '', 
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
                permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
            });
        }
    }, [record, isOpen]);

    if (!isOpen || !mounted) return null;

    const togglePerm = (module: string, action: string) => {
        setForm(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [module]: {
                    ...(prev.permissions as any)[module],
                    [action]: !(prev.permissions as any)[module]?.[action]
                }
            }
        }));
    };

    const toggleAllInModule = (module: string) => {
        const modulePerms = (form.permissions as any)[module] || {};
        const allActive = Object.values(modulePerms).every(v => v === true);
        const newState = !allActive;

        const updatedModule: any = {};
        Object.keys(modulePerms).forEach(key => updatedModule[key] = newState);

        setForm(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [module]: updatedModule }
        }));
    };

    // Quick bulk helpers
    const applyBulkPermissions = (mode: 'all' | 'none' | 'view_only') => {
        const nextPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
        Object.keys(nextPerms).forEach(module => {
            Object.keys(nextPerms[module]).forEach(action => {
                if (mode === 'all') nextPerms[module][action] = true;
                else if (mode === 'none') nextPerms[module][action] = false;
                else if (mode === 'view_only') nextPerms[module][action] = (action === 'view');
            });
        });
        setForm(prev => ({ ...prev, permissions: nextPerms }));
        showGlobalToast(
            mode === 'all' ? '✅ تم منح جميع الصلاحيات' :
            mode === 'none' ? '🚫 تم سلب جميع الصلاحيات' : '👀 تم تعيين وضع القراءة فقط',
            'success'
        );
    };

    const applyRolePreset = (role: string) => {
        const nextPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
        
        if (role === 'admin') {
            Object.keys(nextPerms).forEach(m => Object.keys(nextPerms[m]).forEach(a => nextPerms[m][a] = true));
        } else if (role === 'manager') {
            Object.keys(nextPerms).forEach(m => {
                Object.keys(nextPerms[m]).forEach(a => {
                    // Manager gets everything except deleting settings or system logs
                    if (m === 'settings' && a === 'delete') nextPerms[m][a] = false;
                    else nextPerms[m][a] = true;
                });
            });
        } else if (role === 'accountant') {
            const financeModules = ['receipts', 'payments', 'expenses', 'journal', 'manual_journals', 'accounts', 'ledger', 'trialbalance', 'financial_center', 'financial_statements', 'cashflows', 'invoices', 'purchase_orders', 'partner_balances', 'statement', 'reports'];
            financeModules.forEach(m => {
                if (nextPerms[m]) {
                    Object.keys(nextPerms[m]).forEach(a => nextPerms[m][a] = true);
                }
            });
            ['dashboard', 'global_summary', 'inventory', 'warehouses', 'partners'].forEach(m => {
                if (nextPerms[m]) nextPerms[m].view = true;
            });
        } else if (role === 'storekeeper') {
            ['inventory', 'warehouses', 'inventory_transactions'].forEach(m => {
                if (nextPerms[m]) Object.keys(nextPerms[m]).forEach(a => nextPerms[m][a] = true);
            });
            ['dashboard', 'purchase_orders'].forEach(m => {
                if (nextPerms[m]) nextPerms[m].view = true;
            });
        } else if (role === 'delegate') {
            ['pos', 'invoices', 'receipts'].forEach(m => {
                if (nextPerms[m]) {
                    nextPerms[m].view = true;
                    nextPerms[m].create = true;
                }
            });
            ['dashboard', 'statement', 'delegate_debts', 'delegate_settlements'].forEach(m => {
                if (nextPerms[m]) nextPerms[m].view = true;
            });
        } else {
            // client/user
            if (nextPerms.profile) {
                nextPerms.profile.view = true;
                nextPerms.profile.edit = true;
            }
        }

        setForm(prev => ({ ...prev, role, permissions: nextPerms }));
        showGlobalToast(`🎯 تم تطبيق القالب النموذجي لرتبة: ${role}`, 'success');
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

            showGlobalToast("تم حفظ بيانات وصلاحيات المستخدم بنجاح! 🎉", 'success');
            onSave();
            
        } catch (error: any) {
            console.error("API Error:", error);
            showGlobalToast(`عذراً، تعذر الحفظ! السبب: ${error.message}`, 'warning');
        } finally {
            setIsSaving(false);
        }
    };

    const isNewUser = !record?.id;

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            {/* Desert Glass Backdrop */}
            <div 
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(44, 26, 18, 0.65)',
                    backdropFilter: 'blur(16px) saturate(140%)'
                }} 
                onClick={onClose} 
            />

            <style>{`
                @keyframes scaleUpDesert {
                    from { transform: scale(0.96); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .desert-modal-window {
                    position: relative;
                    width: 980px;
                    max-width: 95vw;
                    max-height: 92vh;
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(253, 251, 247, 0.94) 100%);
                    backdrop-filter: blur(28px) saturate(160%);
                    border: 1px solid rgba(194, 155, 98, 0.38);
                    border-radius: 24px;
                    box-shadow: 0 25px 60px rgba(44, 26, 18, 0.28), 0 4px 12px rgba(194, 155, 98, 0.12);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: scaleUpDesert 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    direction: rtl;
                }
                .desert-tab-btn {
                    padding: 10px 22px;
                    border-radius: 12px;
                    border: 1px solid rgba(194, 155, 98, 0.25);
                    background: rgba(255, 253, 250, 0.6);
                    color: rgba(44, 26, 18, 0.7);
                    font-size: 14px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .desert-tab-btn.active {
                    background: #C29B62;
                    color: #2C1A12;
                    border-color: #C29B62;
                    box-shadow: 0 4px 12px rgba(194, 155, 98, 0.35);
                }
                .perm-chip {
                    padding: 6px 14px;
                    border-radius: 10px;
                    border: 1px solid rgba(194, 155, 98, 0.25);
                    background: rgba(255, 255, 255, 0.8);
                    color: rgba(44, 26, 18, 0.65);
                    font-size: 12.5px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .perm-chip:hover {
                    border-color: #A8573C;
                    color: #A8573C;
                    transform: translateY(-1px);
                }
                .perm-chip.active {
                    background: linear-gradient(135deg, #C29B62 0%, #B2884E 100%);
                    color: #2C1A12;
                    border-color: #C29B62;
                    font-weight: 900;
                    box-shadow: 0 3px 8px rgba(194, 155, 98, 0.35);
                }
                .quick-btn {
                    padding: 6px 14px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    background: rgba(255, 255, 255, 0.7);
                    color: #2C1A12;
                    transition: 0.2s;
                }
                .quick-btn:hover {
                    background: #C29B62;
                    color: #2C1A12;
                }
                .desert-input {
                    width: 100%;
                    padding: 12px 14px;
                    border-radius: 12px;
                    border: 1px solid rgba(194, 155, 98, 0.32);
                    background: rgba(255, 255, 255, 0.88);
                    color: #2C1A12;
                    font-weight: 700;
                    outline: none;
                    transition: 0.2s;
                }
                .desert-input:focus {
                    border-color: #C29B62;
                    box-shadow: 0 0 0 3px rgba(194, 155, 98, 0.2);
                }
            `}</style>

            <div className="desert-modal-window">
                
                {/* Header */}
                <div style={{
                    padding: '20px 30px',
                    borderBottom: '1px solid rgba(194, 155, 98, 0.25)',
                    background: 'linear-gradient(135deg, rgba(194, 155, 98, 0.12) 0%, rgba(255, 253, 250, 0.5) 100%)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            background: '#C29B62',
                            color: '#2C1A12',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            boxShadow: '0 4px 10px rgba(194, 155, 98, 0.3)'
                        }}>
                            {isNewUser ? '👥' : '✏️'}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#2C1A12' }}>
                                {isNewUser ? 'إضافة مستخدم جديد للنظام' : `تعديل المستخدم: ${form.full_name || record?.email || ''}`}
                            </h2>
                            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'rgba(44, 26, 18, 0.65)', fontWeight: 700 }}>
                                تخصيص الرتبة والصلاحيات الفردية وفق هوية Desert Glassmorphism
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'rgba(168, 87, 60, 0.12)',
                            border: '1px solid rgba(168, 87, 60, 0.25)',
                            color: '#A8573C',
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            transition: '0.2s'
                        }}
                        title="إغلاق"
                    >
                        ✕
                    </button>
                </div>

                {/* Tab Switcher */}
                <div style={{
                    padding: '12px 30px',
                    borderBottom: '1px solid rgba(194, 155, 98, 0.18)',
                    display: 'flex',
                    gap: '12px',
                    background: 'rgba(255, 253, 250, 0.5)'
                }}>
                    <button 
                        className={`desert-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        👤 البيانات الأساسية والحساب
                    </button>
                    <button 
                        className={`desert-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('permissions')}
                    >
                        🔒 مصفوفة الصلاحيات (Permissions)
                    </button>
                </div>

                {/* Content Body */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px 30px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    
                    {activeTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#2C1A12', marginBottom: '8px' }}>الاسم الكامل *</label>
                                    <input 
                                        type="text" 
                                        value={form.full_name} 
                                        onChange={e => setForm({...form, full_name: e.target.value})} 
                                        className="desert-input" 
                                        placeholder="اسم الموظف أو المستخدم..." 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#2C1A12', marginBottom: '8px' }}>البريد الإلكتروني *</label>
                                    <input 
                                        type="email" 
                                        value={form.email} 
                                        onChange={e => setForm({...form, email: e.target.value})} 
                                        disabled={!isNewUser} 
                                        className="desert-input"
                                        style={{ background: isNewUser ? 'rgba(255,255,255,0.88)' : 'rgba(220, 215, 205, 0.35)', cursor: isNewUser ? 'text' : 'not-allowed' }}
                                        placeholder="user@example.com" 
                                    />
                                    {!isNewUser && <span style={{ fontSize: '11px', color: 'rgba(44, 26, 18, 0.55)', marginTop: '4px', display: 'block' }}>البريد مسجل كمعرف أساسي ولا يمكن تغييره</span>}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#2C1A12', marginBottom: '8px' }}>رقم الجوال</label>
                                    <input 
                                        type="text" 
                                        value={form.phone} 
                                        onChange={e => setForm({...form, phone: e.target.value})} 
                                        className="desert-input" 
                                        placeholder="05xxxxxxxx" 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#2C1A12', marginBottom: '8px' }}>
                                        {isNewUser ? 'كلمة المرور *' : 'كلمة المرور (اتركها فارغة للإبقاء على الحالية)'}
                                    </label>
                                    <input 
                                        type="password" 
                                        value={form.password} 
                                        onChange={e => setForm({...form, password: e.target.value})} 
                                        className="desert-input" 
                                        placeholder="••••••••" 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#2C1A12', marginBottom: '8px' }}>الدور الوظيفي الأساسي</label>
                                    <select 
                                        value={form.role} 
                                        onChange={e => applyRolePreset(e.target.value)} 
                                        className="desert-input"
                                    >
                                        <option value="admin">👑 مدير نظام أعلى (Super Admin)</option>
                                        <option value="manager">💼 مدير تنفيذي / فرع (Manager)</option>
                                        <option value="accountant">💰 محاسب مالي (Accountant)</option>
                                        <option value="storekeeper">📦 أمين مستودع (Storekeeper)</option>
                                        <option value="delegate">🚚 مندوب مبيعات / سائق (Delegate)</option>
                                        <option value="client">👤 مستخدم عادي / عميل (Client)</option>
                                    </select>
                                    <span style={{ fontSize: '11px', color: '#A8573C', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                                        * تغيير الدور يضبط مصفوفة الصلاحيات تلقائياً
                                    </span>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#2C1A12', marginBottom: '8px' }}>حالة الحساب</label>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', height: '48px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                checked={form.is_active} 
                                                onChange={() => setForm({...form, is_active: true})} 
                                            />
                                            <span style={{ fontWeight: 800, color: '#4E734F' }}>✅ نشط وفعال</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                checked={!form.is_active} 
                                                onChange={() => setForm({...form, is_active: false})} 
                                            />
                                            <span style={{ fontWeight: 800, color: '#A8573C' }}>🚫 معطل وموقوف</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Partner link */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(194, 155, 98, 0.08) 0%, rgba(255, 253, 250, 0.4) 100%)',
                                padding: '18px',
                                borderRadius: '16px',
                                border: '1px solid rgba(194, 155, 98, 0.3)'
                            }}>
                                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 900, color: '#2C1A12', marginBottom: '8px' }}>
                                    🔗 ربط حساب المستخدم بسجل شريك (عميل / مورد / مندوب)
                                </label>
                                <SmartCombo 
                                    table="partners"
                                    initialDisplay={form.linked_partner_id ? 'شريك مرتبط مسبقاً' : ''}
                                    onSelect={(val: any) => setForm({...form, linked_partner_id: val?.id || null})}
                                    placeholder="ابحث عن اسم الشريك في دليل العملاء والموردين والمناديب..."
                                />
                                <span style={{ fontSize: '12px', color: 'rgba(44, 26, 18, 0.65)', marginTop: '6px', display: 'block', fontWeight: 700 }}>
                                    💡 ربط الحساب يتيح تقييد الرؤية ومزامنة فواتير ومقبوضات وعهد هذا الشريك آلياً.
                                </span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'permissions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                            {/* Quick tools */}
                            <div style={{
                                background: 'rgba(194, 155, 98, 0.1)',
                                border: '1px solid rgba(194, 155, 98, 0.3)',
                                borderRadius: '14px',
                                padding: '12px 18px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#2C1A12' }}>
                                    ⚡ إجراءات سريعة على الصلاحيات:
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => applyBulkPermissions('all')} className="quick-btn" style={{ background: '#4E734F', color: 'white', borderColor: '#4E734F' }}>
                                        ✅ منح الكل
                                    </button>
                                    <button type="button" onClick={() => applyBulkPermissions('view_only')} className="quick-btn">
                                        👀 عرض فقط للكل
                                    </button>
                                    <button type="button" onClick={() => applyBulkPermissions('none')} className="quick-btn" style={{ background: 'rgba(168, 87, 60, 0.15)', color: '#A8573C', borderColor: 'rgba(168, 87, 60, 0.3)' }}>
                                        🚫 سلب الكل
                                    </button>
                                    <button type="button" onClick={() => applyRolePreset(form.role)} className="quick-btn" style={{ background: '#C29B62', color: '#2C1A12', borderColor: '#C29B62' }}>
                                        🎯 قالب الرتبة ({form.role})
                                    </button>
                                </div>
                            </div>

                            {/* Categorized groups */}
                            {PERMISSION_GROUPS.map((group) => (
                                <div 
                                    key={group.id}
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.75) 0%, rgba(255, 253, 250, 0.45) 100%)',
                                        border: '1px solid rgba(194, 155, 98, 0.28)',
                                        borderRadius: '18px',
                                        padding: '16px 20px',
                                        boxShadow: '0 4px 12px rgba(44, 26, 18, 0.04)'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '15px',
                                        fontWeight: 900,
                                        color: '#2C1A12',
                                        borderBottom: '1px dashed rgba(194, 155, 98, 0.3)',
                                        paddingBottom: '8px',
                                        marginBottom: '14px'
                                    }}>
                                        {group.title}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                        {group.modules.map((moduleKey) => {
                                            const modulePerms = (form.permissions as any)[moduleKey] || {};
                                            const hasActive = Object.values(modulePerms).some(v => v === true);

                                            return (
                                                <div 
                                                    key={moduleKey}
                                                    style={{
                                                        background: hasActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 253, 250, 0.55)',
                                                        border: `1px solid ${hasActive ? 'rgba(194, 155, 98, 0.4)' : 'rgba(194, 155, 98, 0.18)'}`,
                                                        borderRadius: '14px',
                                                        padding: '12px 14px',
                                                        boxShadow: hasActive ? '0 4px 10px rgba(194, 155, 98, 0.1)' : 'none',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#2C1A12' }}>
                                                            {MODULE_NAMES[moduleKey] || moduleKey}
                                                        </span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => toggleAllInModule(moduleKey)} 
                                                            style={{
                                                                padding: '3px 8px',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                background: 'rgba(194, 155, 98, 0.15)',
                                                                color: '#2C1A12',
                                                                fontSize: '11px',
                                                                fontWeight: 800,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            تبديل الكل
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {Object.keys(modulePerms).map((action) => (
                                                            <button 
                                                                type="button"
                                                                key={action} 
                                                                onClick={() => togglePerm(moduleKey, action)} 
                                                                className={`perm-chip ${modulePerms[action] ? 'active' : ''}`}
                                                            >
                                                                {action === 'view' ? '👀 عرض' : 
                                                                 action === 'create' ? '➕ إضافة' : 
                                                                 action === 'edit' ? '✏️ تعديل' : 
                                                                 action === 'delete' ? '🗑️ حذف' : 
                                                                 action === 'post' ? '✅ اعتماد' : action}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '18px 30px',
                    borderTop: '1px solid rgba(194, 155, 98, 0.25)',
                    display: 'flex',
                    gap: '14px',
                    background: 'rgba(255, 253, 250, 0.9)',
                    flexShrink: 0
                }}>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        style={{
                            flex: 2,
                            padding: '14px 20px',
                            borderRadius: '14px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #C29B62 0%, #B2884E 100%)',
                            color: '#2C1A12',
                            fontWeight: 900,
                            fontSize: '15.5px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(194, 155, 98, 0.35)',
                            transition: 'all 0.2s ease',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? '⏳ جاري الحفظ والاعتماد...' : '💾 حفظ وتطبيق الصلاحيات'}
                    </button>
                    <button 
                        onClick={onClose} 
                        style={{
                            flex: 1,
                            padding: '14px 20px',
                            borderRadius: '14px',
                            border: '1px solid rgba(194, 155, 98, 0.3)',
                            background: 'rgba(255, 255, 255, 0.8)',
                            color: 'rgba(44, 26, 18, 0.75)',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: '15px'
                        }}
                    >
                        إلغاء
                    </button>
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}