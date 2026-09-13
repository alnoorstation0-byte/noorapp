"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { useSidebar } from '@/lib/SidebarContext'; 
import MasterPage from '@/components/MasterPage'; 
import ProfileEditorModal from './profileeditormodal';
import { useRouter } from 'next/navigation';
import PrintHeader from '@/components/PrintHeader';
import { showGlobalToast } from '@/lib/toast-context';

export default function TeamPage() {
    const router = useRouter();
    const { setSidebarContent } = useSidebar();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    // 🛡️ Security Check
    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_admin')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin' && profile?.role !== 'super_admin' && profile?.is_admin !== true) {
                showGlobalToast("⛔ غير مصرح لك بالدخول! هذه الصفحة مخصصة لمديري النظام فقط.", 'warning');
                router.push('/'); 
            }
        };

        checkAccess();
    }, [router]);

    // Data Fetching
    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            const apiRes = await fetch('/api/admin/users').then(r => r.json()).catch(() => null);
            if (apiRes?.success && Array.isArray(apiRes.profiles)) {
                setProfiles(apiRes.profiles);
                setIsLoading(false);
                return;
            }

            const { data: profData, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (profError) throw profError;

            const { data: partnersData } = await supabase
                .from('partners')
                .select('id, name');

            const pMap = new Map((partnersData || []).map((p: any) => [p.id, p.name]));
            const enriched = (profData || []).map((p: any) => ({
                ...p,
                partners: p.linked_partner_id ? { name: pMap.get(p.linked_partner_id) || null } : null
            }));
            
            setProfiles(enriched);

        } catch (err: any) {
            console.error("❌ Fetch Error:", err);
            showGlobalToast("تعذر الاتصال بقاعدة البيانات. تأكد من اتصال الإنترنت.", 'warning');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchProfiles(); 
    }, []);

    // Filtered data
    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            const matchesSearch = !searchTerm || 
                p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.partners?.name?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = roleFilter === 'all' || p.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [profiles, searchTerm, roleFilter]);

    const handleCopyInvite = () => {
        const signupLink = `${window.location.origin}/signup`;
        navigator.clipboard.writeText(signupLink);
        showGlobalToast("✅ تم نسخ رابط الدعوة الرقمية!\nأرسله الآن للموظف أو العميل للتسجيل.", 'success');
    };

    const handleBulkToggle = async (action: 'activate_all' | 'suspend_all') => {
        const isSuspending = action === 'suspend_all';
        if (!confirm(`هل أنت متأكد من ${isSuspending ? 'إيقاف' : 'تنشيط'} جميع المستخدمين (ما عدا الإدارة العليا)؟`)) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            showGlobalToast(result.message, 'success');
            fetchProfiles();
        } catch (error: any) {
            showGlobalToast(`❌ فشل التحديث: ${error.message}`, 'warning');
            setIsLoading(false);
        }
    };

    // Sidebar integration
    useEffect(() => {
        setSidebarContent({
            actions: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <button 
                        onClick={() => { setSelectedProfile(null); setIsModalOpen(true); }} 
                        className="btn-main-glass gold" 
                        style={{ background: '#C29B62', color: '#2C1A12', border: 'none', fontWeight: 900, padding: '14px', borderRadius: '12px' }}
                    >
                        ➕ إضافة مستخدم جديد
                    </button>
                    <button onClick={handleCopyInvite} className="btn-main-glass white">
                        🔗 نسخ رابط دعوة للتسجيل
                    </button>
                    <button onClick={() => window.print()} className="btn-main-glass white">
                        🖨️ طباعة سجل الفريق
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => handleBulkToggle('suspend_all')} 
                            style={{ flex: 1, padding: '10px 6px', background: 'rgba(168, 87, 60, 0.12)', color: '#A8573C', border: '1px solid rgba(168, 87, 60, 0.3)', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
                        >
                            🚫 إيقاف الكل
                        </button>
                        <button 
                            onClick={() => handleBulkToggle('activate_all')} 
                            style={{ flex: 1, padding: '10px 6px', background: 'rgba(78, 115, 79, 0.12)', color: '#4E734F', border: '1px solid rgba(78, 115, 79, 0.3)', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
                        >
                            ✅ تنشيط الكل
                        </button>
                    </div>
                    <button onClick={fetchProfiles} className="btn-main-glass white">
                        🔄 تحديث القائمة
                    </button>
                </div>
            ),
            summary: (
                <div className="summary-glass-card" style={{ borderColor: '#C29B62' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(44, 26, 18, 0.7)' }}>إجمالي أعضاء الفريق 👥</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#C29B62' }}>{profiles.length}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', fontWeight: 700 }}>
                        <span style={{ color: '#4E734F' }}>نشط: {profiles.filter(p => p.is_active !== false).length}</span>
                        <span style={{ color: '#A8573C' }}>موقوف: {profiles.filter(p => p.is_active === false).length}</span>
                    </div>
                </div>
            ),
            customFilters: (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                        type="text"
                        placeholder="ابحث بالاسم، الإيميل، أو الشريك..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(194, 155, 98, 0.3)', color: '#2C1A12', fontWeight: 700, outline: 'none' }}
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(194, 155, 98, 0.3)', color: '#2C1A12', fontWeight: 700, outline: 'none' }}
                    >
                        <option value="all">كل الرتب والأدوار</option>
                        <option value="admin">مدير نظام (Admin)</option>
                        <option value="manager">مدير قسم (Manager)</option>
                        <option value="accountant">محاسب (Accountant)</option>
                        <option value="storekeeper">أمين مستودع (Storekeeper)</option>
                        <option value="delegate">مندوب مبيعات (Delegate)</option>
                        <option value="client">مستخدم عادي (Client)</option>
                    </select>
                </div>
            )
        });
        return () => setSidebarContent({ actions: null, summary: null, customFilters: null });
    }, [profiles.length, searchTerm, roleFilter, setSidebarContent]);

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
            case 'super_admin':
                return { label: '👑 مدير نظام', bg: 'rgba(194, 155, 98, 0.2)', color: '#2C1A12', border: 'rgba(194, 155, 98, 0.45)' };
            case 'manager':
                return { label: '💼 مدير فرع', bg: 'rgba(168, 87, 60, 0.15)', color: '#A8573C', border: 'rgba(168, 87, 60, 0.35)' };
            case 'accountant':
                return { label: '💰 محاسب مالي', bg: 'rgba(78, 115, 79, 0.15)', color: '#4E734F', border: 'rgba(78, 115, 79, 0.35)' };
            case 'storekeeper':
                return { label: '📦 أمين مستودع', bg: 'rgba(194, 155, 98, 0.15)', color: '#8C6830', border: 'rgba(194, 155, 98, 0.3)' };
            case 'delegate':
                return { label: '🚚 مندوب مبيعات', bg: 'rgba(44, 26, 18, 0.08)', color: '#2C1A12', border: 'rgba(44, 26, 18, 0.2)' };
            default:
                return { label: '👤 مستخدم عادي', bg: 'rgba(44, 26, 18, 0.05)', color: 'rgba(44, 26, 18, 0.65)', border: 'rgba(44, 26, 18, 0.15)' };
        }
    };

    return (
        <MasterPage icon="👥" title="إدارة الفريق والشركاء" subtitle="توزيع الصلاحيات وضبط الرتب وفق هوية Desert Glassmorphism">
            
            <style>{`
                .desert-view-toggle {
                    display: flex;
                    align-items: center;
                    background: rgba(255, 253, 250, 0.7);
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    border-radius: 12px;
                    padding: 4px;
                    gap: 4px;
                }
                .desert-view-btn {
                    padding: 7px 16px;
                    border-radius: 9px;
                    border: none;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    background: transparent;
                    color: rgba(44, 26, 18, 0.65);
                    transition: 0.2s;
                }
                .desert-view-btn.active {
                    background: #C29B62;
                    color: #2C1A12;
                    box-shadow: 0 2px 8px rgba(194, 155, 98, 0.35);
                }
                .desert-table-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.88) 0%, rgba(255, 253, 250, 0.55) 100%);
                    backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    border-radius: 16px;
                    box-shadow: 0 4px 15px rgba(44, 26, 18, 0.06);
                    overflow: hidden;
                    width: 100%;
                }
                .desert-team-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    text-align: right;
                    direction: rtl;
                }
                .desert-team-table th {
                    background: rgba(44, 26, 18, 0.05);
                    color: #2C1A12;
                    padding: 14px 18px;
                    font-size: 13.5px;
                    font-weight: 900;
                    border-bottom: 2px solid rgba(194, 155, 98, 0.3);
                    white-space: nowrap;
                }
                .desert-team-table td {
                    padding: 13px 18px;
                    font-size: 13px;
                    color: #2C1A12;
                    border-bottom: 1px solid rgba(194, 155, 98, 0.15);
                    vertical-align: middle;
                }
                .desert-team-table tbody tr {
                    transition: all 0.2s ease;
                }
                .desert-team-table tbody tr:hover {
                    background: rgba(194, 155, 98, 0.09);
                    transform: translateY(-1px);
                }
                .desert-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 4px 12px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 800;
                }
                .users-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 20px;
                    padding: 5px 0;
                }
                .user-desert-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%);
                    backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    border-radius: 18px;
                    padding: 24px 20px;
                    text-align: center;
                    cursor: pointer;
                    box-shadow: 0 4px 8px rgba(44, 26, 18, 0.06);
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                    position: relative;
                    overflow: hidden;
                }
                .user-desert-card:hover {
                    transform: translateY(-5px);
                    border-color: #C29B62;
                    box-shadow: 0 12px 24px rgba(168, 87, 60, 0.15);
                }
                .card-avatar {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    border: 3px solid #C29B62;
                    box-shadow: 0 6px 16px rgba(44, 26, 18, 0.1);
                    margin-bottom: 12px;
                    object-fit: cover;
                    background: white;
                }
                .action-edit-btn {
                    padding: 6px 14px;
                    border-radius: 10px;
                    border: 1px solid rgba(194, 155, 98, 0.3);
                    background: rgba(255, 253, 250, 0.85);
                    color: #2C1A12;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .action-edit-btn:hover {
                    background: #C29B62;
                    color: #2C1A12;
                    border-color: #C29B62;
                }
                @media print {
                    .no-print { display: none !important; }
                    .desert-table-card { box-shadow: none; border: 1px solid #000; background: white; }
                    .desert-team-table th, .desert-team-table td { border: 1px solid #000; color: #000; }
                }
            `}</style>

            <PrintHeader title="إدارة الفريق والشركاء" subtitle="سجل الصلاحيات والرتب" />

            {/* Top Bar with View Mode & Counters */}
            <div className="no-print" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '18px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="desert-view-toggle">
                        <button 
                            className={`desert-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            📋 عرض كجدول
                        </button>
                        <button 
                            className={`desert-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                        >
                            🎴 عرض كبطاقات
                        </button>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(44, 26, 18, 0.65)' }}>
                        المعروض: {filteredProfiles.length} من {profiles.length} مستخدم
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => { setSelectedProfile(null); setIsModalOpen(true); }}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#C29B62',
                            color: '#2C1A12',
                            fontSize: '13px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(194, 155, 98, 0.35)'
                        }}
                    >
                        ➕ مستخدم جديد
                    </button>
                </div>
            </div>

            {/* Loading */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '90px', fontWeight: 900, color: '#2C1A12', fontSize: '16px' }}>
                    <span style={{ display: 'block', fontSize: '36px', marginBottom: '12px' }}>⏳</span>
                    جاري تحميل بيانات الفريق والصلاحيات...
                </div>
            ) : profiles.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '70px 20px',
                    background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.7) 0%, rgba(255, 253, 250, 0.4) 100%)',
                    borderRadius: '20px',
                    border: '2px dashed rgba(194, 155, 98, 0.4)'
                }}>
                    <div style={{ fontSize: '50px', marginBottom: '15px' }}>👥</div>
                    <h3 style={{ fontWeight: 900, color: '#2C1A12', fontSize: '22px', margin: '0 0 10px 0' }}>لا يوجد مستخدمون حالياً</h3>
                    <p style={{ color: 'rgba(44, 26, 18, 0.65)', fontWeight: 700, fontSize: '14px', marginBottom: '20px' }}>قم بإضافة أول عضو في الفريق أو مشاركة رابط التسجيل.</p>
                    <button 
                        onClick={handleCopyInvite} 
                        style={{ background: '#C29B62', color: '#2C1A12', border: 'none', padding: '12px 30px', borderRadius: '14px', fontSize: '14px', fontWeight: 900, cursor: 'pointer' }}
                    >
                        🔗 نسخ رابط التسجيل
                    </button>
                </div>
            ) : viewMode === 'table' ? (
                /* 📋 Desert Glass Table View */
                <div className="desert-table-card" style={{ overflowX: 'auto' }}>
                    <table className="desert-team-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                                <th>المستخدم / الموظف</th>
                                <th>البريد الإلكتروني</th>
                                <th>رقم الجوال</th>
                                <th>الرتبة الوظيفية</th>
                                <th>الشريك المرتبط</th>
                                <th>حالة الحساب</th>
                                <th style={{ textAlign: 'center', width: '130px' }} className="no-print">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProfiles.length > 0 ? filteredProfiles.map((user, idx) => {
                                const badge = getRoleBadge(user.role);
                                return (
                                    <tr key={user.id}>
                                        <td style={{ textAlign: 'center', fontWeight: 800, color: 'rgba(44, 26, 18, 0.5)' }}>{idx + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <img 
                                                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username || 'U')}&background=C29B62&color=2C1A12&bold=true`}
                                                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #C29B62', objectFit: 'cover' }}
                                                    alt="Avatar"
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 900, color: '#2C1A12', fontSize: '13.5px' }}>
                                                        {user.full_name || user.nickname || user.username || 'مستخدم بدون اسم'}
                                                    </div>
                                                    {user.username && user.username !== user.full_name && (
                                                        <span style={{ fontSize: '11px', color: 'rgba(44, 26, 18, 0.5)', fontWeight: 600 }}>@{user.username}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'rgba(44, 26, 18, 0.75)', direction: 'ltr', textAlign: 'right' }}>
                                            {user.email || '—'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'rgba(44, 26, 18, 0.75)', direction: 'ltr', textAlign: 'right' }}>
                                            {user.phone_number || user.phone || '—'}
                                        </td>
                                        <td>
                                            <span 
                                                className="desert-badge" 
                                                style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                                            >
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td>
                                            {user.partners?.name ? (
                                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#C29B62', background: 'rgba(194, 155, 98, 0.12)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(194, 155, 98, 0.25)' }}>
                                                    🔗 {user.partners.name}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'rgba(44, 26, 18, 0.4)', fontSize: '12px' }}>غير مرتبط</span>
                                            )}
                                        </td>
                                        <td>
                                            {user.is_active === false ? (
                                                <span className="desert-badge" style={{ background: 'rgba(168, 87, 60, 0.12)', color: '#A8573C', border: '1px solid rgba(168, 87, 60, 0.3)' }}>
                                                    🚫 موقوف
                                                </span>
                                            ) : (
                                                <span className="desert-badge" style={{ background: 'rgba(78, 115, 79, 0.12)', color: '#4E734F', border: '1px solid rgba(78, 115, 79, 0.3)' }}>
                                                    ✅ نشط
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }} className="no-print">
                                            <button 
                                                className="action-edit-btn"
                                                onClick={() => { setSelectedProfile(user); setIsModalOpen(true); }}
                                                title="تعديل البيانات والصلاحيات"
                                            >
                                                ✏️ تعديل
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 800 }}>
                                        لا توجد نتائج مطابقة لمعايير البحث 🔍
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* 🎴 Desert Glass Cards View */
                <div className="users-grid">
                    {filteredProfiles.length > 0 ? filteredProfiles.map((user) => {
                        const badge = getRoleBadge(user.role);
                        return (
                            <div 
                                key={user.id} 
                                className="user-desert-card" 
                                onClick={() => { setSelectedProfile(user); setIsModalOpen(true); }}
                            >
                                <img 
                                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username || 'U')}&background=C29B62&color=2C1A12&bold=true`} 
                                    className="card-avatar" 
                                    alt="User Avatar" 
                                />
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#2C1A12' }}>
                                    {user.full_name || user.nickname || 'مستخدم غير مسمى'}
                                </h3>
                                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'rgba(44, 26, 18, 0.65)', fontWeight: 700 }}>
                                    {user.email || user.username}
                                </p>
                                
                                <div style={{ marginTop: '12px' }}>
                                    <span 
                                        className="desert-badge" 
                                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                                    >
                                        {badge.label}
                                    </span>
                                </div>

                                <div 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 14, 
                                        right: 14, 
                                        width: 12, 
                                        height: 12, 
                                        borderRadius: '50%', 
                                        background: user.is_active === false ? '#A8573C' : '#4E734F', 
                                        boxShadow: `0 0 8px ${user.is_active === false ? '#A8573C' : '#4E734F'}`, 
                                        border: '2px solid white' 
                                    }} 
                                    title={user.is_active === false ? 'حساب موقوف' : 'حساب نشط'} 
                                />

                                {user.partners?.name && (
                                    <div style={{ marginTop: '14px', fontSize: '11px', fontWeight: 800, color: '#2C1A12', background: 'rgba(194, 155, 98, 0.15)', padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(194, 155, 98, 0.25)' }}>
                                        🔗 شريك: {user.partners.name}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 800 }}>
                            لا توجد نتائج مطابقة لمعايير البحث 🔍
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <ProfileEditorModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    record={selectedProfile}
                    onSave={() => { setIsModalOpen(false); fetchProfiles(); }}
                />
            )}
        </MasterPage>
    );
}
