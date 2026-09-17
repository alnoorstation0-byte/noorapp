"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { THEME } from '@/lib/theme';
import { usePermissions } from '@/lib/PermissionsContext';
import LoadingScreen from '@/components/LoadingScreen';
import MasterPage from '@/components/MasterPage';
import { menuGroups } from '@/lib/menuData';
import { supabase } from '@/lib/supabase';

const NOOR_MOTIVATIONAL_MESSAGES = [
    "أهلاً بك في محطات النور للوقود، مركز القيادة المتكامل لإدارة الوقود والمضخات والمبيعات! ⛽⚡",
    "الدقة في قراءات العدادات وإغلاق الورديات هي ركيزة النجاح وضمان الأرباح! 📊✨",
    "سلامة الخزانات وانسيابية المضخات تصنع الفارق في تجربة كل عميل! 🛡️🚗",
    "كل لتر محسوب وكل وردية مدققة ترسم مسار الاحترافية والنمو المستدام! 💎🚀",
    "نظام مراقبة الوقود الحي ومطابقة المخزون بالمبيعات في خدمتك على مدار الساعة! 🌟⛽",
    "محطات النور: كفاءة تشغيلية فائقة، سرعة في الخدمة، وتوافق تام مع ZATCA! 🧾⚡",
];

const DEFAULT_FAVORITES = ['global_summary', 'dashboard', 'invoices', 'inventory', 'receipt_vouchers', 'partners', 'reports', 'payroll'];

export default function WelcomeHomePage() {
    const { role, can, loading: permsLoading, profile } = usePermissions();
    const [greeting, setGreeting] = useState('');
    const [quote, setQuote] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isFavModalOpen, setIsFavModalOpen] = useState(false);
    const [tempFavorites, setTempFavorites] = useState<string[]>([]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('صباح الخير والبركة ☀️');
        else if (hour < 18) setGreeting('طاب مساؤك بكل خير 🌤️');
        else setGreeting('مساء الخير والمسرات 🌙');
        setQuote(NOOR_MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * NOOR_MOTIVATIONAL_MESSAGES.length)]);
    }, []);

    useEffect(() => {
        const fetchUserFavs = async () => {
            if (profile?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('quick_links')
                    .eq('id', profile.id)
                    .single();
                
                if (!error && data?.quick_links && Array.isArray(data.quick_links) && data.quick_links.length > 0) {
                    setFavorites(data.quick_links);
                } else {
                    setFavorites(DEFAULT_FAVORITES);
                }
            } else {
                setFavorites(DEFAULT_FAVORITES);
            }
        };
        fetchUserFavs();
    }, [profile?.id]);

    const saveFavorites = async () => {
        setFavorites(tempFavorites);
        setIsFavModalOpen(false);
        if (profile?.id) {
            const { error } = await supabase
                .from('profiles')
                .update({ quick_links: tempFavorites })
                .eq('id', profile.id);
            
            if (error) {
                console.error("Error saving quick links:", error);
                alert("لم يتم حفظ المفضلة في قاعدة البيانات: " + error.message);
            }
        }
    };

    const openFavModal = () => { setTempFavorites(favorites); setIsFavModalOpen(true); };
    const toggleFav = (id: string) =>
        setTempFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

    if (permsLoading) return <LoadingScreen message="جاري تجهيز مساحة عمل محطات النور..." fullScreen={false} />;

    const userName = profile?.full_name || 'زميلنا العزيز';
    const firstNameOnly = userName.split(' ')[0];
    const roleTitle = role === 'super_admin' ? 'المدير العام 👑' : role === 'admin' ? 'مدير النظام 🛡️' : 'فريق محطات النور للوقود ⛽';
    const allItems = menuGroups.flatMap(g => g.items);
    const allowedItems = allItems.filter(item => {
        if (role === 'super_admin' || role === 'admin') return true;
        if (['home','profile','messages','notifications'].includes(item.id)) return true;
        return can(item.id, 'view');
    });
    const favItems = favorites.map(id => allowedItems.find(i => i.id === id)).filter(Boolean);

    return (
        <MasterPage title="الصفحة الرئيسية" subtitle="بوابة الإدارة المركزية لمحطات النور للوقود" icon="⛽">
        <div className="command-page">
        <style>{`
            /* ══════════════════════════════════════════════════
               ⚡ NOOR COMMAND CENTER DARK GLASSMORPHISM
               ══════════════════════════════════════════════════ */
            :global(body) {
                background: #0B0E14 !important;
                color: #F8FAFC !important;
                min-height: 100vh;
            }

            .command-page {
                direction: rtl;
                padding: 16px 20px 36px;
                min-height: calc(100vh - 80px);
                display: flex;
                flex-direction: column;
                gap: 26px;
                box-sizing: border-box;
            }

            /* ── Hero Command Center Panel ── */
            .command-hero {
                text-align: center;
                padding: 40px 32px 34px;
                border-radius: 24px;
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(13, 16, 24, 0.85) 100%);
                backdrop-filter: blur(24px) saturate(160%);
                -webkit-backdrop-filter: blur(24px) saturate(160%);
                border: 1px solid rgba(0, 229, 255, 0.25);
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.05);
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .command-hero:hover {
                box-shadow: 0 12px 36px 0 rgba(0, 229, 255, 0.15), inset 0 0 20px rgba(0, 229, 255, 0.08);
                border-color: rgba(0, 229, 255, 0.4);
            }

            .role-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 22px;
                border-radius: 50px;
                margin-bottom: 16px;
                background: rgba(0, 229, 255, 0.1);
                border: 1px solid rgba(0, 229, 255, 0.35);
                color: #00E5FF;
                font-weight: 800;
                font-size: 13.5px;
                box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
            }

            .hero-title {
                font-size: 34px;
                font-weight: 900;
                color: #F8FAFC;
                margin: 0 0 12px;
                letter-spacing: -0.5px;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            }

            .hero-subtitle {
                color: #94A3B8;
                font-size: 16px;
                font-weight: 600;
                max-width: 680px;
                margin: 0 auto;
                line-height: 1.8;
            }

            /* ── Section Label ── */
            .section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .section-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .section-title h2 {
                font-size: 19px;
                font-weight: 900;
                color: #F8FAFC;
                margin: 0;
            }

            .section-subtitle {
                font-size: 13px;
                color: #94A3B8;
                font-weight: 600;
            }

            /* ── Cards Grid ── */
            .command-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
                gap: 18px;
            }

            /* ── Dark Titanium Glass Card ── */
            .command-card-item {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.9) 0%, rgba(13, 16, 24, 0.75) 100%);
                backdrop-filter: blur(24px) saturate(160%);
                -webkit-backdrop-filter: blur(24px) saturate(160%);
                border: 1px solid rgba(0, 229, 255, 0.2);
                border-radius: 20px;
                padding: 22px 16px;
                text-decoration: none;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                position: relative;
                overflow: hidden;
            }

            .command-card-item:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 28px rgba(0, 229, 255, 0.25);
                border-color: #00E5FF;
                background: linear-gradient(135deg, rgba(26, 32, 46, 0.95) 0%, rgba(18, 22, 32, 0.85) 100%);
            }

            .card-icon-box {
                width: 58px;
                height: 58px;
                border-radius: 16px;
                background: rgba(0, 229, 255, 0.1);
                border: 1px solid rgba(0, 229, 255, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: transform 0.3s ease;
            }

            .command-card-item:hover .card-icon-box {
                transform: scale(1.1) rotate(4deg);
                background: rgba(0, 229, 255, 0.2);
                border-color: #00E5FF;
                box-shadow: 0 0 15px rgba(0, 229, 255, 0.4);
            }

            .card-title {
                font-size: 14.5px;
                font-weight: 800;
                color: #F8FAFC;
                text-align: center;
                line-height: 1.3;
            }

            .card-desc {
                font-size: 11.5px;
                color: #94A3B8;
                font-weight: 600;
                text-align: center;
            }

            /* Add Card Button */
            .add-card-btn {
                background: rgba(20, 24, 34, 0.5);
                backdrop-filter: blur(24px) saturate(160%);
                border: 1.5px dashed rgba(0, 229, 255, 0.35);
                border-radius: 20px;
                padding: 22px 16px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            }

            .add-card-btn:hover {
                background: rgba(20, 24, 34, 0.85);
                border-color: #00E5FF;
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 229, 255, 0.2);
            }

            .add-icon-box {
                width: 58px;
                height: 58px;
                border-radius: 16px;
                background: rgba(0, 229, 255, 0.08);
                border: 1px dashed rgba(0, 229, 255, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 26px;
                color: #00E5FF;
                transition: transform 0.3s ease;
            }

            .add-card-btn:hover .add-icon-box {
                transform: scale(1.15) rotate(90deg);
                color: #10B981;
                border-color: #10B981;
                background: rgba(16, 185, 129, 0.15);
            }

            /* ── Quick Stats Section ── */
            .stats-banner {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 16px;
            }

            .stat-box {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.9) 0%, rgba(15, 18, 26, 0.8) 100%);
                backdrop-filter: blur(24px) saturate(160%);
                border: 1px solid rgba(0, 229, 255, 0.2);
                border-radius: 18px;
                padding: 18px 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                transition: all 0.25s ease;
            }

            .stat-box:hover {
                border-color: rgba(0, 229, 255, 0.45);
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 229, 255, 0.15);
            }

            .stat-icon {
                width: 48px;
                height: 48px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                background: rgba(0, 229, 255, 0.1);
                border: 1px solid rgba(0, 229, 255, 0.25);
            }

            /* ── Custom Modal ── */
            .fav-overlay {
                position: fixed; inset: 0;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(24px) saturate(160%);
                z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
                animation: fadeIn .25s ease;
            }

            .fav-modal {
                background: #141822;
                border-radius: 24px;
                width: 95vw; max-width: 820px; max-height: 85vh;
                display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.15);
                border: 1px solid rgba(0, 229, 255, 0.3);
            }

            .fav-modal-header {
                padding: 20px 28px;
                border-bottom: 1px solid rgba(0, 229, 255, 0.2);
                display: flex; justify-content: space-between; align-items: center;
                background: rgba(11, 14, 20, 0.7);
            }

            .fav-modal-body {
                padding: 24px 28px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 22px;
            }

            .fav-group-title {
                font-weight: 900;
                color: #00E5FF;
                margin-bottom: 12px;
                font-size: 15px;
                border-bottom: 1px solid rgba(0, 229, 255, 0.2);
                padding-bottom: 8px;
            }

            .fav-items-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 12px;
            }

            .fav-item {
                display: flex; align-items: center; gap: 12px; padding: 12px 14px;
                border: 1px solid rgba(0, 229, 255, 0.18);
                border-radius: 14px;
                cursor: pointer;
                background: rgba(20, 24, 34, 0.6);
                transition: all 0.2s ease;
            }

            .fav-item:hover {
                background: rgba(0, 229, 255, 0.12);
                border-color: #00E5FF;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 229, 255, 0.2);
            }

            .fav-item.selected {
                border-color: #00E5FF;
                background: rgba(0, 229, 255, 0.15);
                box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
            }

            .fav-modal-footer {
                padding: 16px 28px;
                border-top: 1px solid rgba(0, 229, 255, 0.2);
                display: flex; justify-content: flex-end; gap: 12px;
                background: rgba(11, 14, 20, 0.85);
            }

            .command-footer {
                text-align: center;
                color: #64748B;
                font-weight: 700;
                font-size: 13px;
                padding-top: 10px;
            }

            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            @media (max-width: 768px) {
                .command-hero { padding: 24px 18px 20px; border-radius: 20px; }
                .hero-title { font-size: 24px; }
                .command-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                .command-card-item, .add-card-btn { padding: 16px 10px; border-radius: 16px; }
                .card-icon-box, .add-icon-box { width: 48px; height: 48px; font-size: 24px; }
                .card-title { font-size: 13px; }
                .stats-banner { grid-template-columns: 1fr; }
            }
        `}</style>

            {/* ── لوحة الترحيب ومركز القيادة (Command Hero) ── */}
            <div className="command-hero">
                <div className="role-badge">{roleTitle}</div>
                <h1 className="hero-title">{greeting}، {firstNameOnly}</h1>
                <p className="hero-subtitle">{quote}</p>
            </div>

            {/* ── إحصائيات سريعة للوقود والمحطات ── */}
            <div className="stats-banner">
                <div className="stat-box">
                    <div className="stat-icon" style={{ color: '#00E5FF', background: 'rgba(0, 229, 255, 0.12)' }}>⛽</div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>مخزون الوقود والمضخات</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#00E5FF' }}>مراقبة حية 24/7</div>
                    </div>
                </div>
                <div className="stat-box">
                    <div className="stat-icon" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.12)' }}>📊</div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>الورديات ومبيعات المحطة</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#10B981' }}>تقارير Z فورية</div>
                    </div>
                </div>
                <div className="stat-box">
                    <div className="stat-icon" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.12)' }}>🧾</div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>نظام الفواتير المعتمد</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#F59E0B' }}>متطابق مع ZATCA</div>
                    </div>
                </div>
            </div>

            {/* ── شبكة الوصول السريع للمفضلة (Command Favorites) ── */}
            <div>
                <div className="section-header">
                    <div className="section-title">
                        <span style={{ fontSize: '20px' }}>⭐</span>
                        <h2>المفضلة ومساحة العمل السريعة</h2>
                    </div>
                    <span className="section-subtitle">الوصول السريع للشاشات الأكثر استخداماً</span>
                </div>

                <div className="command-grid">
                    {favItems.map((item: any, idx) => (
                        <Link key={idx} href={item.path} className="command-card-item">
                            <div className="card-icon-box">{item.icon}</div>
                            <div className="card-title">{item.title}</div>
                            <div className="card-desc">انقر للفتح</div>
                        </Link>
                    ))}
                    
                    <div className="add-card-btn" onClick={openFavModal} title="تخصيص القائمة المفضلة">
                        <div className="add-icon-box">➕</div>
                        <div className="card-title" style={{ color: '#00E5FF' }}>تخصيص المفضلة</div>
                        <div className="card-desc">إضافة / حذف روابط</div>
                    </div>
                </div>
            </div>

            {/* ── نافذة تخصيص الروابط المفضلة (Modal) ── */}
            {isFavModalOpen && (
                <div className="fav-overlay" onClick={() => setIsFavModalOpen(false)}>
                    <div className="fav-modal" onClick={e => e.stopPropagation()}>
                        <div className="fav-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>✨</span>
                                <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#F8FAFC' }}>تخصيص شاشات مساحة العمل</h2>
                            </div>
                            <button 
                                onClick={() => setIsFavModalOpen(false)} 
                                style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '22px', cursor: 'pointer', fontWeight: 900 }}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="fav-modal-body">
                            {menuGroups.map((group, gIdx) => {
                                const items = group.items.filter(item => allowedItems.some(ai => ai.id === item.id));
                                if (!items.length) return null;
                                return (
                                    <div key={gIdx}>
                                        <div className="fav-group-title">{group.group}</div>
                                        <div className="fav-items-grid">
                                            {items.map((item, iIdx) => {
                                                const sel = tempFavorites.includes(item.id);
                                                return (
                                                    <div key={iIdx} className={`fav-item ${sel ? 'selected' : ''}`} onClick={() => toggleFav(item.id)}>
                                                        <div style={{ fontSize: '22px' }}>{item.icon}</div>
                                                        <div style={{ fontWeight: 800, color: sel ? '#00E5FF' : '#94A3B8', flex: 1, fontSize: '13.5px' }}>
                                                            {item.title}
                                                        </div>
                                                        <div style={{
                                                            width: '22px', 
                                                            height: '22px', 
                                                            borderRadius: '8px', 
                                                            border: `2px solid ${sel ? '#00E5FF' : 'rgba(0, 229, 255, 0.3)'}`, 
                                                            background: sel ? '#00E5FF' : 'transparent', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center',
                                                            color: '#0B0E14',
                                                            fontSize: '12px',
                                                            fontWeight: 900
                                                        }}>
                                                            {sel && '✓'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="fav-modal-footer">
                            <button 
                                onClick={() => setIsFavModalOpen(false)} 
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#94A3B8',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                إلغاء
                            </button>
                            <button 
                                onClick={saveFavorites} 
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #00E5FF 0%, #0077B6 100%)',
                                    border: 'none',
                                    color: '#0B0E14',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(0, 229, 255, 0.35)'
                                }}
                            >
                                حفظ التغييرات 💾
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── فوتر النظام المركزي ── */}
            <div className="command-footer">
                جلسة آمنة ومحمية 🔒 | محطات النور للوقود (مركز القيادة والتحكم) © {new Date().getFullYear()}
            </div>
        </div>
        </MasterPage>
    );
}
