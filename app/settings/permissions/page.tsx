"use client";
import React, { useState, useEffect } from 'react';
import MasterPage from '@/components/MasterPage';
import { THEME } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AquaModalWrapper from '@/components/AquaModalWrapper';


interface RoleDefinition {
    id: string;
    name: string;
    title: string;
    icon: string;
    desc: string;
    badgeBg: string;
    badgeColor: string;
    badgeBorder: string;
    modules: Record<string, string[]>;
}

const ROLES_DATA: RoleDefinition[] = [
    {
        id: 'admin',
        name: 'مدير نظام أعلى',
        title: 'Super Admin',
        icon: '👑',
        desc: 'تحكم كامل بنسبة 100% في كافة أقسام النظام والبيانات والإعدادات الحساسة.',
        badgeBg: 'rgba(0, 229, 255, 0.15)',
        badgeColor: '#00E5FF',
        badgeBorder: 'rgba(0, 229, 255, 0.4)',
        modules: {
            'لوحات التحكم والقيادة': ['عرض لوحة القيادة', 'الملخص العام', 'مؤشرات الأداء', 'مؤشرات نقاط البيع'],
            'المبيعات ونقاط البيع': ['فواتير المبيعات', 'نقاط البيع والكاشير', 'أوامر الشراء', 'العروض والخصومات'],
            'المخزون والمستودعات': ['دليل الأصناف', 'المستودعات', 'حركات المخزون', 'التسويات المخزنية'],
            'الأسطول والعمليات': ['إدارة السيارات', 'رحلات التشغيل', 'مصاريف المركبات'],
            'المالية والمحاسبة': ['سندات القبض', 'سندات الصرف', 'دفتر اليومية', 'القيود اليدوية', 'شجرة الحسابات', 'ميزان المراجعة', 'القوائم المالية'],
            'الشركاء والمناديب': ['دليل العملاء والموردين', 'أرصدة الشركاء', 'ذمم المناديب', 'تسويات العهد'],
            'الإدارة والرقابة': ['سجل التدقيق والمراجعة', 'إدارة المستخدمين والفريق', 'إعدادات المنصة', 'مسيرات الرواتب']
        }
    },
    {
        id: 'manager',
        name: 'مدير تنفيذي / فرع',
        title: 'Manager',
        icon: '💼',
        desc: 'إشراف شامل على المبيعات، المستودعات، رحلات الأسطول، والاعتمادات التشغيلية.',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#F59E0B',
        badgeBorder: 'rgba(245, 158, 11, 0.4)',
        modules: {
            'لوحات التحكم والقيادة': ['عرض لوحة القيادة', 'الملخص العام', 'مؤشرات الأداء'],
            'المبيعات ونقاط البيع': ['فواتير المبيعات', 'أوامر الشراء', 'العروض والخصومات'],
            'المخزون والمستودعات': ['دليل الأصناف', 'المستودعات', 'حركات المخزون'],
            'الأسطول والعمليات': ['إدارة السيارات', 'رحلات التشغيل', 'اعتماد العمليات'],
            'المالية والمحاسبة': ['سندات القبض', 'سندات الصرف', 'المصروفات التشغيلية', 'عرض التقارير المالية'],
            'الشركاء والمناديب': ['دليل العملاء والموردين', 'كشوف الحسابات', 'متابعة المناديب'],
            'الإدارة والرقابة': ['عرض التقارير الشاملة', 'سجل التدقيق']
        }
    },
    {
        id: 'accountant',
        name: 'محاسب مالي',
        title: 'Accountant',
        icon: '💰',
        desc: 'إدارة القيود اليومية، السندات، الحسابات الختامية، وكشوف العملاء والضريبة.',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#10B981',
        badgeBorder: 'rgba(16, 185, 129, 0.4)',
        modules: {
            'لوحات التحكم والقيادة': ['الملخص المالي', 'لوحة القيادة المالية'],
            'المبيعات والمشتريات': ['فواتير المبيعات والمردودات', 'أوامر الشراء', 'الاعتماد المالي'],
            'المخزون والمستودعات': ['عرض تقييم المخزون والأصناف'],
            'المالية والمحاسبة': ['سندات القبض', 'سندات الصرف', 'دفتر اليومية', 'القيود اليدوية', 'شجرة الحسابات', 'ميزان المراجعة', 'القوائم المالية', 'الإقرار الضريبي'],
            'الشركاء ومشغلو المحطات': ['أرصدة الشركاء', 'كشوف الحسابات', 'تسويات ورديات ومحطات الوقود'],
            'الإدارة والرقابة': ['التقارير المالية والمحاسبية', 'مسيرات الرواتب']
        }
    },
    {
        id: 'storekeeper',
        name: 'مسؤول الخزانات والمستودع',
        title: 'Tank & Depot Manager',
        icon: '⛽',
        desc: 'إدارة جرد الخزانات، استلام وتفريغ شحنات الوقود، والتحويل بين المحطات ومتابعة الفواقد.',
        badgeBg: 'rgba(0, 229, 255, 0.12)',
        badgeColor: '#00E5FF',
        badgeBorder: 'rgba(0, 229, 255, 0.3)',
        modules: {
            'المخزون والخزانات': ['دليل المحروقات والمنتجات', 'أرصدة الخزانات والمستودعات', 'حركات تحويل وتفريغ الوقود', 'تنبيهات نواقص الوقود'],
            'المشتريات والتوريد': ['عرض أوامر الشراء للاستلام', 'سندات تفريغ واستلام الوقود'],
            'لوحات التحكم': ['مؤشرات حركة ومخزون الوقود']
        }
    },
    {
        id: 'delegate',
        name: 'مشغل محطة وقود',
        title: 'Station Operator',
        icon: '⛽',
        desc: 'تشغيل مضخات الوقود وإصدار الفواتير الفورية، تسجيل قراءات العدادات، ومتابعة نقدية الوردية.',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeColor: '#3B82F6',
        badgeBorder: 'rgba(59, 130, 246, 0.3)',
        modules: {
            'كاشير ومبيعات المحطة': ['نظام كاشير المحطة (POS)', 'إصدار فواتير الوقود السريعة', 'طباعة إيصالات المضخات'],
            'التحصيل والورديات': ['إصدار سندات القبض', 'مطابقة قراءات العدادات وتسليم النقدية'],
            'العملاء والشركاء': ['عرض عملاء العقود والآجل المعتمدين بالمحطة', 'البيع لبطاقات الأسطول'],
            'صهاريج النقل': ['متابعة تفريغ الصهريج في خزانات المحطة']
        }
    },
    {
        id: 'client',
        name: 'مستخدم عادي / عميل',
        title: 'Client / Portal User',
        icon: '👤',
        desc: 'الاطلاع على الملف الشخصي، والفواتير وكشوف الحساب الخاصة به فقط.',
        badgeBg: 'rgba(255, 255, 255, 0.08)',
        badgeColor: '#94A3B8',
        badgeBorder: 'rgba(255, 255, 255, 0.15)',
        modules: {
            'الملف الشخصي': ['تعديل بيانات الحساب الشخصي', 'تغيير كلمة المرور'],
            'الفواتير والكشوف': ['عرض الفواتير المنسوبة له فقط', 'عرض كشف الحساب الخاص به']
        }
    }
];

export default function PermissionsPage() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<RoleDefinition>(ROLES_DATA[0]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoadingMembers(true);
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role, is_active, permissions')
                    .order('full_name');
                if (data) setTeamMembers(data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoadingMembers(false);
            }
        };
        loadUsers();
    }, []);

    const roleUsers = teamMembers.filter(u => u.role === selectedRole.id);

    return (
        <MasterPage 
            icon="🔒" 
            title="مصفوفة الأدوار والصلاحيات" 
            subtitle="المرجع القياسي لصلاحيات المنصة وتعيين الامتيازات حسب الهيكل الوظيفي"
        >
            <style dangerouslySetInnerHTML={{ __html: `
                .role-card-selector {
                    background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%);
                    backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(0, 229, 255, 0.2);
                    border-radius: 16px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                }
                .role-card-selector:hover {
                    transform: translateY(-4px);
                    border-color: #00E5FF;
                    box-shadow: 0 8px 20px rgba(0, 229, 255, 0.2);
                }
                .role-card-selector.active {
                    background: linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(20, 24, 34, 0.95) 100%);
                    border: 2px solid #00E5FF;
                    box-shadow: 0 8px 25px rgba(0, 229, 255, 0.3);
                }
                .matrix-container {
                    background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%);
                    backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(0, 229, 255, 0.2);
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
                }
                .perm-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 10px;
                    font-size: 12.5px;
                    font-weight: 800;
                    background: rgba(11, 14, 20, 0.8);
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    color: #F8FAFC;
                }
                .user-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 12px;
                    background: rgba(11, 14, 20, 0.8);
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    cursor: pointer;
                    transition: 0.2s;
                    color: #F8FAFC;
                }
                .user-pill:hover {
                    border-color: #00E5FF;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 229, 255, 0.25);
                }
                .daylight-theme .role-card-selector {
                    background: #FFFFFF !important;
                    border: 1px solid #E2E8F0 !important;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04) !important;
                }
                .daylight-theme .role-card-selector:hover {
                    border-color: #C29B62 !important;
                    box-shadow: 0 8px 20px rgba(194, 155, 98, 0.15) !important;
                }
                .daylight-theme .role-card-selector.active {
                    background: rgba(194, 155, 98, 0.08) !important;
                    border: 2px solid #C29B62 !important;
                }
                .daylight-theme .role-card-selector div {
                    color: #0F172A !important;
                }
                .daylight-theme .matrix-container {
                    background: #FFFFFF !important;
                    border: 1px solid #E2E8F0 !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
                }
                .daylight-theme .matrix-container h2, 
                .daylight-theme .matrix-container h3, 
                .daylight-theme .matrix-container h4,
                .daylight-theme .matrix-container span,
                .daylight-theme .matrix-container p {
                    color: #0F172A !important;
                }
                .daylight-theme .perm-badge {
                    background: #F1F5F9 !important;
                    border-color: #CBD5E1 !important;
                    color: #1E293B !important;
                }
                .daylight-theme .user-pill {
                    background: #F8FAFC !important;
                    border-color: #CBD5E1 !important;
                    color: #0F172A !important;
                }
            `}} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                
                {/* Header actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#F8FAFC' }}>
                            اختر الرتبة لاستعراض صلاحياتها النموذجية
                        </h2>
                        <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 700 }}>
                            يمكن تخصيص صلاحيات استثنائية لأي مستخدم فردي عبر الضغط على اسمه
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => router.push('/settings')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid rgba(0, 229, 255, 0.3)',
                                background: 'rgba(20, 24, 34, 0.8)',
                                color: '#00E5FF',
                                fontWeight: 800,
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            ⚙️ الإعدادات العامة
                        </button>
                    </div>
                </div>

                {/* Roles Cards Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '14px'
                }}>
                    {ROLES_DATA.map((role) => {
                        const isSelected = selectedRole.id === role.id;
                        const count = teamMembers.filter(m => m.role === role.id).length;
                        return (
                            <div 
                                key={role.id} 
                                className={`role-card-selector ${isSelected ? 'active' : ''}`}
                                onClick={() => setSelectedRole(role)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '26px' }}>{role.icon}</span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        padding: '3px 8px',
                                        borderRadius: '8px',
                                        background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        color: isSelected ? '#00E5FF' : '#94A3B8'
                                    }}>
                                        {count} مستخدم
                                    </span>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: '14.5px', color: '#F8FAFC' }}>{role.name}</div>
                                <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700 }}>{role.title}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Selected Role Detail & Matrix */}
                <div className="matrix-container">
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                        paddingBottom: '16px',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        gap: '14px'
                    }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '16px',
                                background: selectedRole.badgeBg,
                                border: `1px solid ${selectedRole.badgeBorder}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '26px'
                            }}>
                                {selectedRole.icon}
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#F8FAFC' }}>
                                        {selectedRole.name}
                                    </h3>
                                    <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 800 }}>({selectedRole.title})</span>
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8', fontWeight: 700 }}>
                                    {selectedRole.desc}
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                setSelectedUser({ role: selectedRole.id });
                                setIsEditorOpen(true);
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
                                color: '#0B0E14',
                                fontWeight: 900,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            ➕ إضافة مستخدم برتبة ({selectedRole.name})
                        </button>
                    </div>

                    {/* Users currently in this role */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#F8FAFC', marginBottom: '10px' }}>
                            👥 المستخدمون الحاليون بهذه الرتبة ({roleUsers.length}):
                        </div>
                        {roleUsers.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {roleUsers.map((user) => (
                                    <div 
                                        key={user.id} 
                                        className="user-pill"
                                        onClick={() => { setSelectedUser(user); setIsEditorOpen(true); }}
                                        title="اضغط لتعديل صلاحيات هذا المستخدم"
                                    >
                                        <span style={{ fontWeight: 900, color: '#F8FAFC', fontSize: '13px' }}>
                                            {user.full_name || user.email}
                                        </span>
                                        <span style={{ fontSize: '11px', color: user.is_active !== false ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                                            {user.is_active !== false ? '✅ نشط' : '🚫 موقوف'}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#00E5FF' }}>✏️</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: 700, background: 'rgba(11, 14, 20, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                لا يوجد موظفون مسجلون بهذه الرتبة حتى الآن.
                            </div>
                        )}
                    </div>

                    {/* Matrix breakdown */}
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#F8FAFC', marginBottom: '14px' }}>
                            📑 جدول حزم الصلاحيات القياسية الممنوحة للرتبة:
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {Object.entries(selectedRole.modules).map(([category, perms]) => (
                                <div 
                                    key={category}
                                    style={{
                                        background: 'rgba(11, 14, 20, 0.6)',
                                        border: '1px solid rgba(0, 229, 255, 0.15)',
                                        borderRadius: '14px',
                                        padding: '14px 18px'
                                    }}
                                >
                                    <div style={{ fontWeight: 900, fontSize: '13.5px', color: '#00E5FF', marginBottom: '10px' }}>
                                        {category}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {perms.map((p, idx) => (
                                            <span key={idx} className="perm-badge">
                                                <span style={{ color: '#10B981', fontWeight: 900 }}>✔</span>
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

            {/* Modal */}
            {isEditorOpen && (
                <ProfileEditorModal 
                    isOpen={isEditorOpen} 
                    onClose={() => setIsEditorOpen(false)} 
                    record={selectedUser}
                    onSave={() => {
                        setIsEditorOpen(false);
                        supabase.from('profiles').select('id, full_name, email, role, is_active, permissions').then(({ data }) => {
                            if (data) setTeamMembers(data);
                        });
                    }}
                />
            )}
        </MasterPage>
    );
}

interface ProfileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: any;
    onSave: () => void;
}

function ProfileEditorModal({ isOpen, onClose, record, onSave }: ProfileEditorModalProps) {
    const [fullName, setFullName] = useState(record?.full_name || '');
    const [email, setEmail] = useState(record?.email || '');
    const [role, setRole] = useState(record?.role || 'client');
    const [isActive, setIsActive] = useState(record?.is_active !== false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            if (record?.id) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: fullName,
                        role: role,
                        is_active: isActive,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('profiles')
                    .insert([{
                        full_name: fullName,
                        email: email,
                        role: role,
                        is_active: isActive,
                        created_at: new Date().toISOString()
                    }]);
                if (error) throw error;
            }
            onSave();
        } catch (err: any) {
            console.error('Error saving profile:', err);
            setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ البيانات');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={record?.id ? `تعديل ملف المستخدم: ${record.full_name || record.email}` : 'إضافة مستخدم جديد'}
            icon="👤"
        >
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {errorMsg && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        fontSize: '13px',
                        fontWeight: 700
                    }}>
                        {errorMsg}
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>
                        الاسم الكامل
                    </label>
                    <input 
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: أحمد محمد"
                        required
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'rgba(11, 14, 20, 0.7)',
                            border: '1px solid rgba(0, 229, 255, 0.25)',
                            color: '#F8FAFC',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>
                        البريد الإلكتروني
                    </label>
                    <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@alnoor.sa"
                        disabled={!!record?.id}
                        required
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: record?.id ? 'rgba(255, 255, 255, 0.05)' : 'rgba(11, 14, 20, 0.7)',
                            border: '1px solid rgba(0, 229, 255, 0.25)',
                            color: record?.id ? '#64748B' : '#F8FAFC',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            cursor: record?.id ? 'not-allowed' : 'text'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>
                        الرتبة الوظيفية
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'rgba(11, 14, 20, 0.85)',
                            border: '1px solid rgba(0, 229, 255, 0.25)',
                            color: '#F8FAFC',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            cursor: 'pointer'
                        }}
                    >
                        {ROLES_DATA.map(r => (
                            <option key={r.id} value={r.id} style={{ background: '#0B0E14', color: '#F8FAFC' }}>
                                {r.icon} {r.name} ({r.title})
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <input 
                        type="checkbox"
                        id="is_active_toggle"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#00E5FF', cursor: 'pointer' }}
                    />
                    <label htmlFor="is_active_toggle" style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC', cursor: 'pointer' }}>
                        الحساب نشط ويحق له تسجيل الدخول
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#94A3B8',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '10px 22px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
                            color: '#0B0E14',
                            fontSize: '13.5px',
                            fontWeight: 900,
                            cursor: loading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)'
                        }}
                    >
                        {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                </div>
            </form>
        </AquaModalWrapper>
    );
}
