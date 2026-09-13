"use client";
import React, { useState, useEffect } from 'react';
import MasterPage from '@/components/MasterPage';
import { THEME } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProfileEditorModal from '@/app/team/profileeditormodal';

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
        badgeBg: 'rgba(194, 155, 98, 0.25)',
        badgeColor: '#2C1A12',
        badgeBorder: 'rgba(194, 155, 98, 0.5)',
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
        badgeBg: 'rgba(168, 87, 60, 0.15)',
        badgeColor: '#A8573C',
        badgeBorder: 'rgba(168, 87, 60, 0.35)',
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
        badgeBg: 'rgba(78, 115, 79, 0.15)',
        badgeColor: '#4E734F',
        badgeBorder: 'rgba(78, 115, 79, 0.35)',
        modules: {
            'لوحات التحكم والقيادة': ['الملخص المالي', 'لوحة القيادة المالية'],
            'المبيعات والمشتريات': ['فواتير المبيعات والمردودات', 'أوامر الشراء', 'الاعتماد المالي'],
            'المخزون والمستودعات': ['عرض تقييم المخزون والأصناف'],
            'المالية والمحاسبة': ['سندات القبض', 'سندات الصرف', 'دفتر اليومية', 'القيود اليدوية', 'شجرة الحسابات', 'ميزان المراجعة', 'القوائم المالية', 'الإقرار الضريبي'],
            'الشركاء والمناديب': ['أرصدة الشركاء', 'كشوف الحسابات', 'تسويات عهد المناديب'],
            'الإدارة والرقابة': ['التقارير المالية والمحاسبية', 'مسيرات الرواتب']
        }
    },
    {
        id: 'storekeeper',
        name: 'أمين مستودع',
        title: 'Storekeeper',
        icon: '📦',
        desc: 'إدارة حركات الجرد، استلام البضائع، التحويل بين الفروع، ومتابعة النواقص.',
        badgeBg: 'rgba(194, 155, 98, 0.15)',
        badgeColor: '#8C6830',
        badgeBorder: 'rgba(194, 155, 98, 0.3)',
        modules: {
            'المخزون والمستودعات': ['دليل الأصناف والباركود', 'أرصدة المستودعات', 'حركات التحويل المخزني', 'تنبيهات نواقص المخزون'],
            'المبيعات والمشتريات': ['عرض أوامر الشراء للاستلام', 'سندات الاستلام المخزني'],
            'لوحات التحكم': ['مؤشرات حركة المخزون']
        }
    },
    {
        id: 'delegate',
        name: 'مندوب مبيعات / موزع',
        title: 'Delegate / Sales Rep',
        icon: '🚚',
        desc: 'إصدار الفواتير الفورية عبر الكاشير المحمول، تحصيل السندات، ومتابعة عهدته.',
        badgeBg: 'rgba(44, 26, 18, 0.08)',
        badgeColor: '#2C1A12',
        badgeBorder: 'rgba(44, 26, 18, 0.2)',
        modules: {
            'نقاط البيع والكاشير': ['نظام الكاشير السريع (POS)', 'إصدار الفواتير الفورية', 'طباعة الإيصالات'],
            'التحصيل والعهد': ['إصدار سندات القبض', 'متابعة الذمم والعهدة الشخصية'],
            'العملاء': ['عرض قائمة العملاء المخصصين له', 'تسجيل زيارة عميل'],
            'الأسطول': ['عرض بيانات سيارة التوزيع']
        }
    },
    {
        id: 'client',
        name: 'مستخدم عادي / عميل',
        title: 'Client / Portal User',
        icon: '👤',
        desc: 'الاطلاع على الملف الشخصي، والفواتير وكشوف الحساب الخاصة به فقط.',
        badgeBg: 'rgba(44, 26, 18, 0.05)',
        badgeColor: 'rgba(44, 26, 18, 0.65)',
        badgeBorder: 'rgba(44, 26, 18, 0.15)',
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
                    .order('created_at', { ascending: false });
                if (data) setTeamMembers(data);
            } catch (err) {
                console.error("Error loading team members:", err);
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
            <style>{`
                .role-card-selector {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%);
                    backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(194, 155, 98, 0.28);
                    border-radius: 16px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 6px rgba(44, 26, 18, 0.05);
                }
                .role-card-selector:hover {
                    transform: translateY(-4px);
                    border-color: #C29B62;
                    box-shadow: 0 8px 18px rgba(168, 87, 60, 0.12);
                }
                .role-card-selector.active {
                    background: linear-gradient(135deg, rgba(194, 155, 98, 0.18) 0%, rgba(255, 253, 250, 0.85) 100%);
                    border: 2px solid #C29B62;
                    box-shadow: 0 8px 20px rgba(194, 155, 98, 0.25);
                }
                .matrix-container {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.9) 0%, rgba(255, 253, 250, 0.6) 100%);
                    backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow: 0 6px 20px rgba(44, 26, 18, 0.06);
                }
                .perm-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 10px;
                    font-size: 12.5px;
                    font-weight: 800;
                    background: rgba(255, 255, 255, 0.85);
                    border: 1px solid rgba(194, 155, 98, 0.25);
                    color: #2C1A12;
                }
                .user-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    cursor: pointer;
                    transition: 0.2s;
                }
                .user-pill:hover {
                    border-color: #A8573C;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(168, 87, 60, 0.15);
                }
            `}</style>

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
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#2C1A12' }}>
                            اختر الرتبة لاستعراض صلاحياتها النموذجية
                        </h2>
                        <span style={{ fontSize: '13px', color: 'rgba(44, 26, 18, 0.65)', fontWeight: 700 }}>
                            يمكن تخصيص صلاحيات استثنائية لأي مستخدم فردي عبر الضغط على اسمه
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => router.push('/team')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid rgba(194, 155, 98, 0.35)',
                                background: 'rgba(255, 253, 250, 0.8)',
                                color: '#2C1A12',
                                fontWeight: 800,
                                fontSize: '13.5px',
                                cursor: 'pointer'
                            }}
                        >
                            👥 إدارة أعضاء الفريق
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
                                        background: isSelected ? '#C29B62' : 'rgba(44, 26, 18, 0.08)',
                                        color: isSelected ? '#2C1A12' : 'rgba(44, 26, 18, 0.7)'
                                    }}>
                                        {count} مستخدم
                                    </span>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: '14.5px', color: '#2C1A12' }}>{role.name}</div>
                                <div style={{ fontSize: '11.5px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 700 }}>{role.title}</div>
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
                        borderBottom: '1px solid rgba(194, 155, 98, 0.25)',
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
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#2C1A12' }}>
                                        {selectedRole.name}
                                    </h3>
                                    <span style={{ fontSize: '13px', color: 'rgba(44, 26, 18, 0.55)', fontWeight: 800 }}>({selectedRole.title})</span>
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(44, 26, 18, 0.7)', fontWeight: 700 }}>
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
                                background: '#C29B62',
                                color: '#2C1A12',
                                fontWeight: 900,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 10px rgba(194, 155, 98, 0.3)'
                            }}
                        >
                            ➕ إضافة مستخدم برتبة ({selectedRole.name})
                        </button>
                    </div>

                    {/* Users currently in this role */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#2C1A12', marginBottom: '10px' }}>
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
                                        <span style={{ fontWeight: 900, color: '#2C1A12', fontSize: '13px' }}>
                                            {user.full_name || user.email}
                                        </span>
                                        <span style={{ fontSize: '11px', color: user.is_active !== false ? '#4E734F' : '#A8573C', fontWeight: 800 }}>
                                            {user.is_active !== false ? '✅ نشط' : '🚫 موقوف'}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#C29B62' }}>✏️</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: '12.5px', color: 'rgba(44, 26, 18, 0.55)', fontWeight: 700, background: 'rgba(255,255,255,0.6)', padding: '10px 14px', borderRadius: '10px' }}>
                                لا يوجد موظفون مسجلون بهذه الرتبة حتى الآن.
                            </div>
                        )}
                    </div>

                    {/* Matrix breakdown */}
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#2C1A12', marginBottom: '14px' }}>
                            📑 جدول حزم الصلاحيات القياسية الممنوحة للرتبة:
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {Object.entries(selectedRole.modules).map(([category, perms]) => (
                                <div 
                                    key={category}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        border: '1px solid rgba(194, 155, 98, 0.2)',
                                        borderRadius: '14px',
                                        padding: '14px 18px'
                                    }}
                                >
                                    <div style={{ fontWeight: 900, fontSize: '13.5px', color: '#A8573C', marginBottom: '10px' }}>
                                        {category}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {perms.map((p, idx) => (
                                            <span key={idx} className="perm-badge">
                                                <span style={{ color: '#4E734F', fontWeight: 900 }}>✔</span>
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
