"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { THEME } from '@/lib/theme';
import { usePermissions } from '@/lib/PermissionsContext';
import LoadingScreen from '@/components/LoadingScreen';
import MasterPage from '@/components/MasterPage';
import { menuGroups } from '@/lib/menuData';

const MOTIVATIONAL_MESSAGES = [
    "يوم جديد لنجاحات مبهرة، توكل على الله وانطلق! 🚀",
    "النجاح يبدأ بخطوة، وأنت الآن في المسار الصحيح! 🌟",
    "الأرقام لا تكذب، اجعل أرقام اليوم أفضل من الأمس! 📊",
    "كل مجهود صغير يتراكم ليصنع إنجازاً عظيماً! 💪",
    "مياه غيام تكبر بجهودكم، شكراً لعملكم الرائع! 💧",
    "الدقة في العمل هي أساس الثقة، حافظ على تميزك! 💎",
    "اجعل هدفك اليوم هو التميز، لا مجرد الإنجاز! ✨",
    "لا حدود لما يمكنك تحقيقه اليوم، انطلق بثقة! 🎯",
];

const DEFAULT_FAVORITES = ['global_summary', 'dashboard', 'journal', 'accounts', 'projects', 'inventory', 'fleet', 'reports'];

export default function WelcomeHomePage() {
    const { role, can, loading: permsLoading, profile } = usePermissions();
    const [greeting, setGreeting] = useState('');
    const [quote, setQuote] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isFavModalOpen, setIsFavModalOpen] = useState(false);
    const [tempFavorites, setTempFavorites] = useState<string[]>([]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('صباح الخير ☀️');
        else if (hour < 18) setGreeting('طاب مساؤك 🌤️');
        else setGreeting('مساء الخير 🌙');
        setQuote(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('rawasi_fav_pages');
        setFavorites(saved ? JSON.parse(saved) : DEFAULT_FAVORITES);
    }, [profile?.id]);

    const saveFavorites = () => {
        setFavorites(tempFavorites);
        localStorage.setItem('rawasi_fav_pages', JSON.stringify(tempFavorites));
        setIsFavModalOpen(false);
    };

    const openFavModal = () => { setTempFavorites(favorites); setIsFavModalOpen(true); };
    const toggleFav = (id: string) =>
        setTempFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

    if (permsLoading) return <LoadingScreen message="جاري تحضير مساحة العمل..." fullScreen={false} />;

    const userName = profile?.full_name || 'زميلنا العزيز';
    const firstNameOnly = userName.split(' ')[0];
    const roleTitle = role === 'super_admin' ? 'المدير العام 👑' : role === 'admin' ? 'مدير النظام 🛡️' : 'مستخدم النظام';
    const allItems = menuGroups.flatMap(g => g.items);
    const allowedItems = allItems.filter(item => {
        if (role === 'super_admin' || role === 'admin') return true;
        if (['home','profile','messages','notifications'].includes(item.id)) return true;
        return can(item.id, 'view');
    });
    const favItems = favorites.map(id => allowedItems.find(i => i.id === id)).filter(Boolean);

    return (
        <MasterPage title="الصفحة الرئيسية" subtitle="بوابة الإدارة المركزية لمياه غيام" icon="🏠">
        <div className="nm-page">
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

            /* ══════════════════════════════════════════════════
               BASE – soft flat aqua (Neumorphism needs uniform bg)
               ══════════════════════════════════════════════════ */
            :global(body) {
                background: #c2dff2 !important;
                font-family: 'Tajawal', sans-serif !important;
                min-height: 100vh;
            }
            :global(.clean-page)          { background: transparent !important; }
            :global(.bg-glass-tint)       { display: none !important; }
            :global(.bg-image-base)       { display: none !important; }
            :global(.glass-container) {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }

            /* ── header pill: Neumorphic + Glass ── */
            :global(.master-header) {
                margin: 14px 20px 0 20px !important;
                border-radius: 80px !important;
                padding: 12px 28px !important;
                background: rgba(210,236,250,0.55) !important;
                backdrop-filter: blur(20px) saturate(1.3) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                border: 1.5px solid rgba(255,255,255,0.70) !important;
                box-shadow:
                    -6px -6px 14px rgba(255,255,255,0.80),
                    6px  6px  14px rgba(90,145,200,0.22),
                    inset 0 1px 0 rgba(255,255,255,0.60) !important;
            }

            /* ══════════════════════════════════════════════════
               PAGE WRAPPER
               ══════════════════════════════════════════════════ */
            .nm-page {
                direction: rtl;
                font-family: 'Tajawal', sans-serif;
                padding: 22px 26px 32px;
                min-height: calc(100vh - 80px);
                display: flex;
                flex-direction: column;
                gap: 28px;
            }

            /* ══════════════════════════════════════════════════
               HERO PANEL  (Glassmorphism + Neumorphic shadow)
               ══════════════════════════════════════════════════ */
            .hero-panel {
                text-align: center;
                padding: 48px 44px 38px;
                border-radius: 32px;

                /* Glassmorphism base */
                background: rgba(255,255,255,0.30);
                backdrop-filter: blur(28px) saturate(1.5);
                -webkit-backdrop-filter: blur(28px);
                border: 1.5px solid rgba(255,255,255,0.72);

                /* Neumorphic dual shadow */
                box-shadow:
                    -10px -10px 26px rgba(255,255,255,0.82),
                     10px  10px 26px rgba(90,145,200,0.26),
                    inset 0 1px 0 rgba(255,255,255,0.65);

                animation: slideUp .7s cubic-bezier(.16,1,.3,1) both;
            }

            @keyframes slideUp {
                from { opacity:0; transform:translateY(28px); }
                to   { opacity:1; transform:translateY(0); }
            }

            /* Role chip */
            .role-chip {
                display: inline-flex;
                align-items: center;
                padding: 8px 24px;
                border-radius: 50px;
                margin-bottom: 20px;

                background: rgba(255,255,255,0.42);
                backdrop-filter: blur(12px);
                border: 1.5px solid rgba(255,255,255,0.80);
                box-shadow:
                    -4px -4px 10px rgba(255,255,255,0.75),
                     4px  4px 10px rgba(90,145,200,0.20),
                    inset 0 1px 0 rgba(255,255,255,0.60);

                color: #1a4e7c;
                font-weight: 900;
                font-size: 14px;
            }

            .hero-title {
                font-size: 42px;
                font-weight: 900;
                color: #0e3a62;
                margin: 0 0 12px;
                /* soft text shadow (Soft Contrast) */
                text-shadow: 0 2px 8px rgba(255,255,255,0.70);
            }
            .hero-subtitle {
                color: #1e5a90;
                font-size: 17px;
                font-weight: 700;
                max-width: 540px;
                margin: 0 auto;
                line-height: 1.9;
                opacity: .85;
            }

            /* ══════════════════════════════════════════════════
               SECTION LABEL
               ══════════════════════════════════════════════════ */
            .section-label {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 6px;
            }
            .section-label h2 {
                font-size: 20px;
                font-weight: 900;
                color: #0e3a62;
                margin: 0;
                text-shadow: 0 1px 4px rgba(255,255,255,0.65);
            }

            /* ══════════════════════════════════════════════════
               BUBBLE GRID
               ══════════════════════════════════════════════════ */
            .bubble-grid {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 30px;
                padding: 8px 0;
            }

            /* ══════════════════════════════════════════════════
               BUBBLE CARD   ← THE STAR ★
               Neumorphism outer shadows (convex)
               + Glassmorphism inner fill
               + Soft Contrast colours
               ══════════════════════════════════════════════════ */
            .bubble-card {
                width: 148px;
                height: 148px;
                border-radius: 50%;
                text-decoration: none;
                cursor: pointer;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 9px;
                overflow: hidden;

                /* Glassmorphism fill */
                background: rgba(255,255,255,0.38);
                backdrop-filter: blur(18px) saturate(1.4);
                -webkit-backdrop-filter: blur(18px);

                /* Thin glass border */
                border: 1.5px solid rgba(255,255,255,0.68);

                /* Neumorphic convex shadow (light top-left / muted aqua bottom-right) */
                box-shadow:
                    -10px -10px 24px rgba(255,255,255,0.85),
                     10px  10px 24px rgba(85,140,195,0.28),
                    inset 0  1px 0 rgba(255,255,255,0.70),
                    inset 0 -1px 0 rgba(90,145,200,0.15);

                transition: transform .35s cubic-bezier(.34,1.56,.64,1),
                            box-shadow .35s ease;
                animation: popIn .5s cubic-bezier(.16,1,.3,1) both;
            }

            /* Top-left gloss highlight (Glassmorphism glint) */
            .bubble-card::before {
                content: '';
                position: absolute;
                top: 9%; left: 14%;
                width: 48%; height: 26%;
                background: radial-gradient(ellipse,
                    rgba(255,255,255,0.80) 0%,
                    transparent 70%);
                border-radius: 50%;
                transform: rotate(-28deg);
                pointer-events: none;
                z-index: 2;
            }

            /* Bottom-right subtle depth (Neumorphic concave hint) */
            .bubble-card::after {
                content: '';
                position: absolute;
                bottom: 8%; right: 10%;
                width: 38%; height: 20%;
                background: radial-gradient(ellipse,
                    rgba(85,140,195,0.18) 0%,
                    transparent 70%);
                border-radius: 50%;
                transform: rotate(-28deg);
                pointer-events: none;
                z-index: 2;
            }

            .bubble-card:hover {
                transform: translateY(-11px) scale(1.09);
                box-shadow:
                    -14px -14px 30px rgba(255,255,255,0.90),
                     14px  14px 30px rgba(85,140,195,0.35),
                    inset 0  1px 0 rgba(255,255,255,0.80),
                    inset 0 -1px 0 rgba(90,145,200,0.20);
            }

            /* Pressed / active state (Neumorphic inset) */
            .bubble-card:active {
                transform: scale(0.97);
                box-shadow:
                    inset  4px  4px 10px rgba(85,140,195,0.25),
                    inset -4px -4px 10px rgba(255,255,255,0.75);
            }

            @keyframes popIn {
                from { opacity:0; transform:scale(.6) translateY(16px); }
                to   { opacity:1; transform:scale(1)  translateY(0); }
            }

            .bubble-card:nth-child(1) { animation-delay:.04s }
            .bubble-card:nth-child(2) { animation-delay:.08s }
            .bubble-card:nth-child(3) { animation-delay:.12s }
            .bubble-card:nth-child(4) { animation-delay:.16s }
            .bubble-card:nth-child(5) { animation-delay:.20s }
            .bubble-card:nth-child(6) { animation-delay:.24s }
            .bubble-card:nth-child(7) { animation-delay:.28s }
            .bubble-card:nth-child(8) { animation-delay:.32s }

            .bubble-icon {
                font-size: 40px;
                position: relative;
                z-index: 3;
                filter: drop-shadow(0 3px 5px rgba(0,50,120,0.18));
                transition: transform .35s;
            }
            .bubble-card:hover .bubble-icon { transform: scale(1.14) rotate(4deg); }

            .bubble-title {
                font-size: 13.5px;
                font-weight: 900;
                color: #0d3560;
                text-align: center;
                line-height: 1.25;
                padding: 0 12px;
                position: relative;
                z-index: 3;
                /* Soft Contrast: white glow behind dark text */
                text-shadow: 0 1px 6px rgba(255,255,255,0.90);
            }

            /* ══════════════════════════════════════════════════
               ADD-FAV BUBBLE (dashed outline, lighter fill)
               ══════════════════════════════════════════════════ */
            .add-bubble {
                width: 148px; height: 148px;
                border-radius: 50%;
                cursor: pointer;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center; gap: 9px;

                background: rgba(255,255,255,0.18);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border: 2.5px dashed rgba(255,255,255,0.60);
                box-shadow:
                    -8px -8px 20px rgba(255,255,255,0.75),
                     8px  8px 20px rgba(85,140,195,0.20);

                transition: .35s cubic-bezier(.34,1.56,.64,1);
                animation: popIn .5s .36s cubic-bezier(.16,1,.3,1) both;
            }
            .add-bubble:hover {
                background: rgba(255,255,255,0.35);
                border-color: rgba(255,255,255,0.90);
                transform: translateY(-11px) scale(1.09);
                box-shadow:
                    -12px -12px 26px rgba(255,255,255,0.85),
                     12px  12px 26px rgba(85,140,195,0.28);
            }
            .add-bubble:active {
                transform: scale(.97);
                box-shadow:
                    inset  3px  3px 8px rgba(85,140,195,0.20),
                    inset -3px -3px 8px rgba(255,255,255,0.70);
            }
            .add-icon  { font-size:40px; color:rgba(14,58,98,.50); transition:.3s; }
            .add-label { font-size:13.5px; font-weight:900; color:#0e3a62; opacity:.75; text-align:center; }
            .add-bubble:hover .add-icon  { color:#0e3a62; transform:scale(1.18); }
            .add-bubble:hover .add-label { opacity:1; }

            /* ══════════════════════════════════════════════════
               FAV MODAL
               ══════════════════════════════════════════════════ */
            .fav-overlay {
                position:fixed; inset:0;
                background:rgba(0,0,0,0.42);
                backdrop-filter:blur(16px);
                z-index:99999;
                display:flex; align-items:center; justify-content:center;
                animation:fadeIn .25s ease;
            }
            .fav-modal {
                background:${THEME.primary};
                border-radius:28px; width:90%; max-width:800px; max-height:85vh;
                display:flex; flex-direction:column; overflow:hidden;
                box-shadow:0 40px 80px rgba(0,0,0,0.55);
                border:1px solid rgba(255,255,255,0.08);
                animation:scaleUp .3s cubic-bezier(.175,.885,.32,1.275);
            }
            .fav-modal-header { padding:24px 28px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; }
            .fav-modal-body   { padding:28px; overflow-y:auto; display:flex; flex-direction:column; gap:26px; }
            .fav-modal-footer { padding:18px 28px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:flex-end; gap:14px; }
            .fav-group-title  { font-weight:900; color:#38bdf8; margin-bottom:12px; font-size:16px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; }
            .fav-items-grid   { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:12px; }
            .fav-item {
                display:flex; align-items:center; gap:12px; padding:13px;
                border:1px solid rgba(255,255,255,0.08); border-radius:14px;
                cursor:pointer; background:rgba(255,255,255,0.02); transition:.2s;
            }
            .fav-item:hover   { background:rgba(255,255,255,0.05); border-color:rgba(56,189,248,0.30); }
            .fav-item.selected{ border-color:#38bdf8; background:rgba(56,189,248,0.10); }

            @keyframes fadeIn  { from{opacity:0}  to{opacity:1} }
            @keyframes scaleUp { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }

            /* footer */
            .nm-footer {
                text-align:center;
                color:rgba(14,58,98,0.50);
                font-weight:700; font-size:12.5px;
                padding-bottom:4px;
                text-shadow:0 1px 4px rgba(255,255,255,0.60);
            }

            @media(max-width:768px){
                .hero-panel { padding:28px 16px 24px; border-radius:24px; }
                .hero-title  { font-size:27px; }
                .bubble-grid { gap:18px; }
                .bubble-card,.add-bubble { width:116px; height:116px; }
                .bubble-icon,.add-icon   { font-size:30px; }
                .bubble-title,.add-label { font-size:12px; }
                :global(.master-header)  { margin:8px 10px 0 !important; border-radius:50px !important; }
            }
        `}</style>

            {/* ── Hero ── */}
            <div className="hero-panel">
                <div className="role-chip">{roleTitle}</div>
                <h1 className="hero-title">{greeting}، {firstNameOnly}</h1>
                <p className="hero-subtitle">✨ {quote}</p>
            </div>

            {/* ── Bubbles ── */}
            <div>
                <div className="section-label">
                    <span style={{fontSize:'22px'}}>⭐</span>
                    <h2>مساحة العمل السريعة</h2>
                </div>

                <div className="bubble-grid">
                    {favItems.map((item:any, idx) => (
                        <Link key={idx} href={item.path} className="bubble-card">
                            <div className="bubble-icon">{item.icon}</div>
                            <div className="bubble-title">{item.title}</div>
                        </Link>
                    ))}
                    <div className="add-bubble" onClick={openFavModal}>
                        <div className="add-icon">➕</div>
                        <div className="add-label">تخصيص المفضلة</div>
                    </div>
                </div>
            </div>

            {/* ── Modal ── */}
            {isFavModalOpen && (
                <div className="fav-overlay" onClick={() => setIsFavModalOpen(false)}>
                    <div className="fav-modal" onClick={e => e.stopPropagation()}>
                        <div className="fav-modal-header">
                            <h2 style={{margin:0,fontSize:'20px',fontWeight:900,color:'white'}}>تخصيص الصفحات المفضلة</h2>
                            <button onClick={() => setIsFavModalOpen(false)} style={{background:'transparent',border:'none',color:'#94a3b8',fontSize:'24px',cursor:'pointer'}}>✖</button>
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
                                                    <div key={iIdx} className={`fav-item${sel?' selected':''}`} onClick={() => toggleFav(item.id)}>
                                                        <div style={{fontSize:'22px'}}>{item.icon}</div>
                                                        <div style={{fontWeight:800,color:sel?'white':'#cbd5e1',flex:1}}>{item.title}</div>
                                                        <div style={{width:'20px',height:'20px',borderRadius:'6px',border:`2px solid ${sel?'#38bdf8':'rgba(255,255,255,0.2)'}`,background:sel?'#38bdf8':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                                            {sel&&<span style={{color:'white',fontSize:'13px'}}>✔</span>}
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
                            <button onClick={() => setIsFavModalOpen(false)} style={{padding:'10px 22px',borderRadius:'12px',border:'none',background:'rgba(255,255,255,0.05)',color:'#cbd5e1',fontWeight:900,cursor:'pointer'}}>إلغاء</button>
                            <button onClick={saveFavorites} style={{padding:'10px 22px',borderRadius:'12px',border:'none',background:'#38bdf8',color:THEME.primary,fontWeight:900,cursor:'pointer',boxShadow:'0 8px 20px rgba(56,189,248,0.25)'}}>حفظ التغييرات</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="nm-footer">
                تم تأمين الجلسة الخاصة بك 🔒 | مياه غيام © {new Date().getFullYear()}
            </div>
        </div>
        </MasterPage>
    );
}
