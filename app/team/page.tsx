"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { useSidebar } from '@/lib/SidebarContext'; 
import MasterPage from '@/components/MasterPage'; 
import ProfileEditorModal from './profileeditormodal';
import { useRouter } from 'next/navigation';
import PrintHeader from '@/components/PrintHeader';

export default function TeamPage() {
    // ==========================================
    // 1. States & Context
    // ==========================================
    const router = useRouter(); // 👈 تفعيل الراوتر
    const { setSidebarContent } = useSidebar();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // ==========================================
    // 🛡️ 1.5 Security Guard (حارس الأمان)
    // ==========================================
    useEffect(() => {
        const checkAccess = async () => {
            // 1. التأكد من تسجيل الدخول
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login'); // طرد لصفحة الدخول
                return;
            }

            // 2. التأكد من الصلاحيات الإدارية
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_admin')
                .eq('id', user.id)
                .single();

            // لو مش أدمن، اطرده للصفحة الرئيسية
            if (profile?.role !== 'admin' && profile?.is_admin !== true) {
                showGlobalToast("⛔ غير مصرح لك بالدخول! هذه الصفحة مخصصة لمديري النظام فقط.", 'warning');
                router.push('/'); 
            }
        };

        checkAccess();
    }, [router]);

    // ==========================================
    // 2. Data Fetching (With Crash Protection)
    // ==========================================
    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            // 1. محاولة الجلب والمزامنة التلقائية مع Auth عبر API الإدارة
            const apiRes = await fetch('/api/admin/users').then(r => r.json()).catch(() => null);
            if (apiRes?.success && Array.isArray(apiRes.profiles)) {
                setProfiles(apiRes.profiles);
                setIsLoading(false);
                return;
            }

            // 2. المحاولة الاحتياطية: جلب البيانات مباشرة مع اسم الشريك
            const { data, error } = await supabase
                .from('profiles')
                .select('*, partners:partners!linked_partner_id(name)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setProfiles(data || []);

        } catch (err: any) {
            console.warn("⚠️ فشل جلب العلاقات، جاري المحاولة بدون الشركاء...", err);
            
            // المحاولة الثالثة (Fallback): جلب الملفات فقط
            try {
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (fallbackError) throw fallbackError;
                setProfiles(fallbackData || []);
                console.log("✅ تم جلب البيانات الأساسية بنجاح كبديل.");
            } catch (fatalErr: any) {
                console.error("❌ Fatal Fetch Error:", fatalErr);
                showGlobalToast("تعذر الاتصال بقاعدة البيانات. تأكد من اتصال الإنترنت.", 'warning');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchProfiles(); 
    }, []);

    // ==========================================
    // 3. Search & Filters
    // ==========================================
    const filteredProfiles = useMemo(() => {
        if (!searchTerm) return profiles;
        const lowerTerm = searchTerm.toLowerCase();
        return profiles.filter(p => 
            p.full_name?.toLowerCase().includes(lowerTerm) || 
            p.email?.toLowerCase().includes(lowerTerm) ||
            p.username?.toLowerCase().includes(lowerTerm) ||
            p.nickname?.toLowerCase().includes(lowerTerm) ||
            p.partners?.name?.toLowerCase().includes(lowerTerm) 
        );
    }, [profiles, searchTerm]);

    // ==========================================
    // 4. Handlers
    // ==========================================
    const handleCopyInvite = () => {
        const signupLink = `${window.location.origin}/signup`;
        navigator.clipboard.writeText(signupLink);
        showGlobalToast("✅ تم نسخ رابط الدعوة الرقمية!\nأرسله الآن للموظف أو العميل للتسجيل.", 'warning');
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
            showGlobalToast(result.message, 'warning');
            fetchProfiles();
        } catch (error: any) {
            showGlobalToast(`❌ فشل التحديث: ${error.message}`, 'warning');
            setIsLoading(false);
        }
    };

    // ==========================================
    // 5. Sidebar Integration
    // ==========================================
    useEffect(() => {
        setSidebarContent({
            actions: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <button onClick={() => { setSelectedProfile(null); setIsModalOpen(true); }} className="btn-main-glass gold" style={{ background: THEME.brand.gold, color: THEME.brand.coffee, border: 'none', fontWeight: 900, padding: '15px' }}>
                        ➕ إضافة مستخدم جديد
                    </button>
                    <button onClick={handleCopyInvite} className="btn-main-glass white">
                        🔗 نسخ رابط دعوة للتسجيل
                    </button>
                    <button onClick={() => window.print()} className="btn-main-glass white">
                        🖨️ طباعة الصلاحيات
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleBulkToggle('suspend_all')} style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>
                            🚫 إيقاف الكل
                        </button>
                        <button onClick={() => handleBulkToggle('activate_all')} style={{ flex: 1, padding: '10px', background: '#dcfce7', color: '#22c55e', border: '1px solid #bbf7d0', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>
                            ✅ تنشيط الكل
                        </button>
                    </div>
                    <button onClick={fetchProfiles} className="btn-main-glass white">
                        🔄 تحديث القائمة
                    </button>
                </div>
            ),
            summary: (
                <div className="summary-glass-card" style={{ borderColor: THEME.brand.gold }}>
                    <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الفريق 👥</span>
                    <div style={{fontSize:'28px', fontWeight:900, color: THEME.brand.gold}}>{profiles.length}</div>
                </div>
            ),
            customFilters: (
                <div style={{ marginTop: '10px' }}>
                    <input 
                        type="text"
                        placeholder="ابحث بالاسم، الإيميل، أو الشريك..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, outline: 'none', transition: '0.3s' }}
                        onFocus={(e) => e.target.style.borderColor = THEME.brand.gold}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                    />
                </div>
            )
        });
        return () => setSidebarContent({ actions: null, summary: null, customFilters: null });
    }, [profiles.length, searchTerm, setSidebarContent]);

    // ==========================================
    // 6. UI Render
    // ==========================================
    return (
        <MasterPage icon="👥" title="إدارة الفريق والشركاء" subtitle="تحديد الرتب وتوزيع صلاحيات الوصول للمنصة بأمان">
            
            {/* 🎨 Clean CSS Styles */}
            <style>{`
                .users-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 25px;
                    padding: 15px 0;
                }
                .user-card {
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.9);
                    border-radius: 30px;
                    padding: 35px 25px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                    position: relative;
                    overflow: hidden;
                }
                .user-card:hover {
                    transform: translateY(-8px);
                    background: #ffffff;
                    border-color: ${THEME.brand.gold};
                    box-shadow: 0 25px 50px rgba(0,0,0,0.06);
                }
                .user-card::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
                    background: linear-gradient(90deg, transparent, ${THEME.brand.gold}, transparent);
                    opacity: 0; transition: 0.4s;
                }
                .user-card:hover::before { opacity: 1; }
                
                .avatar {
                    width: 85px; height: 85px; border-radius: 50%;
                    border: 4px solid white; box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                    margin-bottom: 18px; object-fit: cover; background: white;
                }
                .role-tag {
                    font-size: 11px; font-weight: 900; padding: 6px 16px;
                    border-radius: 12px; display: inline-block; margin-top: 15px;
                    letter-spacing: 0.3px;
                }
                .empty-state {
                    text-align: center; padding: 80px 20px;
                    background: rgba(255,255,255,0.4); border-radius: 40px;
                    border: 2px dashed ${THEME.brand.gold}40;
                    backdrop-filter: blur(10px);
                }
                
                @media print {
                    .users-grid { display: none !important; }
                    .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; text-align: center; direction: rtl; }
                    .print-table th, .print-table td { border: 1px solid #475569; padding: 10px; color: #000; }
                    .print-table th { background-color: #f1f5f9 !important; font-weight: bold; }
                    @page { size: A4 portrait; margin: 1cm; }
                }
            `}</style>

            <PrintHeader title="إدارة الفريق والشركاء" subtitle="سجل الصلاحيات والرتب" />

            {/* 🔄 Loading State */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: THEME.brand.coffee, fontSize: '18px' }}>
                    <span style={{ display: 'block', fontSize: '30px', marginBottom: '15px' }}>⏳</span>
                    جاري تحميل هويات الكوادر...
                </div>
            
            /* 📭 Empty State */
            ) : profiles.length === 0 ? (
                <div className="empty-state">
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>✨</div>
                    <h2 style={{ fontWeight: 900, color: THEME.brand.coffee, fontSize: '26px' }}>ابدأ ببناء فريقك الرقمي</h2>
                    <p style={{ color: '#64748b', fontWeight: 600, fontSize: '15px', marginBottom: '30px' }}>لم يسجل أي مستخدم في النظام حتى الآن. شارك رابط الدعوة للبدء.</p>
                    <button onClick={handleCopyInvite} style={{ background: THEME.brand.gold, color: THEME.brand.coffee, border: 'none', padding: '18px 40px', borderRadius: '20px', fontSize: '16px', fontWeight: 900, cursor: 'pointer', boxShadow: `0 15px 30px ${THEME.brand.gold}30`, transition: '0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        🔗 انسخ رابط الدعوة وانطلق
                    </button>
                </div>
            
            /* 👥 Data State (Cards) */
            ) : (
                <div className="users-grid">
                    {filteredProfiles.length > 0 ? filteredProfiles.map((user) => (
                        <div key={user.id} className="user-card" onClick={() => { setSelectedProfile(user); setIsModalOpen(true); }}>
                            <img 
                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name || user.username || 'U'}&background=random&color=fff&bold=true`} 
                                className="avatar" 
                                alt="User Avatar" 
                            />
                            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: THEME.brand.coffee }}>{user.full_name || user.nickname || 'مستخدم غير مسمى'}</h3>
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#475569', fontWeight: 700 }}>{user.email || user.username}</p>
                            
                            <div className="role-tag" style={{ 
                                background: user.role === 'admin' ? '#fef3c7' : user.role === 'staff' ? '#dcfce7' : user.role === 'contractor' ? '#e0f2fe' : 'rgba(255, 255, 255, 0.4)',
                                color: user.role === 'admin' ? '#d97706' : user.role === 'staff' ? '#16a34a' : user.role === 'contractor' ? '#0369a1' : '#475569'
                            }}>
                                {user.role === 'admin' ? '👑 مدير نظام' : user.role === 'staff' ? '💼 موظف' : user.role === 'contractor' ? '👷 مورد' : '👤 عميل'}
                            </div>

                            {/* مؤشر حالة الحساب */}
                            <div style={{ position: 'absolute', top: 15, right: 15, width: 12, height: 12, borderRadius: '50%', background: user.is_active === false ? '#ef4444' : '#22c55e', boxShadow: `0 0 10px ${user.is_active === false ? '#ef4444' : '#22c55e'}`, border: '2px solid white' }} title={user.is_active === false ? 'حساب موقوف' : 'حساب نشط'} />

                            {user.partners?.name && (
                                <div style={{ marginTop: '18px', fontSize: '11px', fontWeight: 900, color: THEME.brand.gold, background: `${THEME.brand.gold}15`, padding: '8px 12px', borderRadius: '10px' }}>
                                    🔗 شريك: {user.partners.name}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: '#475569', fontWeight: 800 }}>
                            لا توجد نتائج مطابقة لبحثك 🔍
                        </div>
                    )}
                </div>
            )}

            {/* 🖨️ جدول الطباعة الاحترافي المخفي في العرض العادي */}
            {!isLoading && filteredProfiles.length > 0 && (
                <div className="print-only">
                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>م</th>
                                <th>الاسم الكامل</th>
                                <th>البريد الإلكتروني / اسم المستخدم</th>
                                <th>الرتبة الصلاحية</th>
                                <th>اسم الشريك المرتبط</th>
                                <th>حالة الحساب</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProfiles.map((user, index) => (
                                <tr 
                                    key={user.id} 
                                    onClick={() => { setSelectedProfile(user); setIsModalOpen(true); }} 
                                    style={{ cursor: 'pointer' }} 
                                    title="انقر لتعديل بيانات وصلاحيات هذا المستخدم"
                                >
                                    <td>{index + 1}</td>
                                    <td>{user.full_name || user.nickname || 'مستخدم غير مسمى'}</td>
                                    <td>{user.email || user.username}</td>
                                    <td>
                                        {user.role === 'admin' ? '👑 مدير نظام' : 
                                         user.role === 'staff' ? '💼 موظف' : 
                                         user.role === 'contractor' ? '👷 مورد' : '👤 عميل'}
                                    </td>
                                    <td>{user.partners?.name || '---'}</td>
                                    <td>{user.is_active === false ? '❌ موقوف' : '✅ نشط'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 🛡️ Editor Modal */}
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
