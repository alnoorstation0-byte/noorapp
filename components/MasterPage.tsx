"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import NotificationsModal from './NotificationsModal';
import Link from 'next/link';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useRouter, usePathname } from 'next/navigation';

export default function MasterPage({ title, subtitle, children, headerContent, icon }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unread_messages, unread_notifications } = useUnreadCounts();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (pathname && pathname !== '/' && !pathname.includes('login')) {
      localStorage.setItem('last_visited_route', pathname);
    }
  }, [pathname]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(data || { full_name: session.user.email });
      }
    };
    getUser();
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY + 8, left: rect.left });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const close = () => setIsMenuOpen(false);
    if (isMenuOpen) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="clean-page">
      <style>{`

        /* 🚀 🛠️ الحل الجذري: منع السكرول العرضي وإلغاء أي مساحات وهمية على اليمين */
        html, body { 
            overflow-x: hidden !important; 
            width: 100vw !important;
            max-width: 100% !important;
            margin: 0 !important; 
            padding: 0 !important; 
        }

        .clean-page { 
            padding: 25px 0px 25px 15px !important; 
            margin: 0 !important; /* تصفير المارجن تماماً لعدم التداخل مع السايد بار */
            direction: rtl; 
            min-height: 100vh; 
            width: 100vw !important; 
            max-width: 100%;
            overflow-x: hidden !important; /* إجبار المحتوى على البقاء داخل الشاشة */
        }

        .master-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 30px; 
                      
            position: relative; z-index: 1000;
            animation: elegantFloat 4s ease-in-out infinite;
        }
        @keyframes elegantFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

        .imperial-trigger { 
            display: flex; align-items: center; gap: 15px; 
            padding: 10px 18px; border-radius: 22px; 
            background: rgba(255, 255, 255, 0.5);
            cursor: pointer; transition: 0.3s; 
            border: 1px solid rgba(255, 255, 255, 0.7); 
            box-shadow: 0 4px 15px rgba(28, 115, 171, 0.05);
            backdrop-filter: blur(10px);
        }
        .imperial-trigger:hover { 
            background: rgba(255, 255, 255, 0.8); 
            transform: translateY(-2px); 
            border-color: rgba(28, 115, 171, 0.3); 
            box-shadow: 0 8px 25px rgba(28, 115, 171, 0.15); 
        }

        .u-info-text { display: flex; flex-direction: column; text-align: right; margin-right: 5px; }
        .u-name { font-size: 19px; font-weight: 800; color: #122946; letter-spacing: -0.3px; line-height: 1.2; }
        .u-role { font-size: 13px; font-weight: 700; color: #1C73AB; margin-top: 4px; }

        .avatar-frame { position: relative; width: 85px; height: 85px; }
        .avatar-frame img { width: 100%; height: 100%; border-radius: 50%; border: 2px solid rgba(28, 115, 171, 0.5); object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .active-dot { position: absolute; bottom: 4px; right: 4px; width: 16px; height: 16px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }

        .supreme-dropdown {
            position: fixed; width: 220px; background: rgba(255, 255, 255, 0.95); border-radius: 20px;
            padding: 8px; box-shadow: 0 20px 50px rgba(28, 115, 171, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.8); z-index: 999999;
            transform-origin: top left;
            animation: supremeShow 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            backdrop-filter: blur(15px);
        }
        @keyframes supremeShow { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .drop-item { display: flex; align-items: center; gap: 10px; padding: 10px 15px; border-radius: 12px; font-size: 13px; font-weight: 800; color: #122946; cursor: pointer; transition: 0.2s; direction: rtl; }
        .drop-item:hover { background: rgba(28, 115, 171, 0.1); color: #1C73AB; }
        .drop-item.logout { color: #ef4444; border-top: 1px solid rgba(28, 115, 171, 0.1); margin-top: 5px; border-radius: 0 0 12px 12px; }
        .drop-item.logout:hover { background: rgba(239, 68, 68, 0.1); }

        .title-area h1 { font-weight: 900; fontSize: 28px; color: #122946; margin: 0; letterSpacing: -0.5px; }
        .title-area p { color: #475569; fontSize: 14px; fontWeight: 600; marginTop: 4px; }

        .nav-btn-glass {
            width: 50px; height: 50px; border-radius: 14px;
            background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: 0.3s;
            box-shadow: 0 4px 10px rgba(28, 115, 171, 0.1);
            color: #122946; font-size: 24px;
        }
        .nav-btn-glass:hover {
            background: rgba(255, 255, 255, 1); transform: translateY(-2px);
            border-color: #1C73AB; color: #1C73AB;
        }
        .nav-group { display: flex; gap: 8px; margin-right: 20px; border-right: 1px solid rgba(28, 115, 171, 0.1); padding-right: 20px; }
        
        @media (max-width: 768px) {
            .nav-group { display: none; }
        }

        .glass-container {
            background: transparent;
            border-radius: 0px 0px 0px 32px !important; 
            padding: 20px 15px 20px 20px;           
            border: none !important;
            box-shadow: none !important;
        }

        /* 📱 🚀 التعديل السحري للموبايل (Fullscreen Edge-to-Edge) */
        @media (max-width: 768px) {
          .header-divider { display: none; }
          .clean-page { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .master-header { 
              padding: 12px 15px !important; 
              margin-bottom: 0 !important; 
              border-radius: 0 0 20px 20px !important;
              flex-wrap: wrap !important;
          }
          .header-icon { width: 40px !important; height: 40px !important; min-width: 40px !important; border-radius: 10px !important; }
          .header-icon span { font-size: 20px !important; }
          .title-area { gap: 8px !important; flex-shrink: 1 !important; min-width: 0 !important; flex-basis: 100% !important; }
          .title-area h1 { font-size: 18px !important; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .title-area p { display: none !important; }
          
          .header-side { gap: 8px !important; flex-shrink: 0 !important; flex-wrap: wrap !important; width: 100% !important; justify-content: space-between !important; }
          .header-actions { border: none !important; padding: 0 !important; flex-direction: row !important; gap: 8px !important; flex-wrap: wrap !important; }
          .nav-btn, .msg-btn { width: 40px !important; height: 40px !important; font-size: 20px !important; border-radius: 10px !important; }
          .nav-group { display: none !important; }
          
          .glass-container { padding: 15px 10px !important; border-radius: 0 !important; border: none !important; box-shadow: none !important; min-height: calc(100vh - 65px); }
          .u-info-text { display: none; }
          .imperial-trigger { padding: 0; background: transparent; border: none; box-shadow: none; }
          .imperial-trigger:hover { transform: none; box-shadow: none; border: none; }
          .avatar-frame { width: 55px; height: 55px; } 
        }
      `}</style>

      <header className="master-header no-print" style={{
            padding: '20px 25px', 
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(30px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 8px 32px rgba(28, 115, 171, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
            flexWrap: 'nowrap'
      }}>
        {/* Right side: Large Icon and Title */}
        <div className="title-area" style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
          <div className="header-icon" style={{ 
            width: '70px', height: '70px', borderRadius: '22px', minWidth: '70px',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(28, 115, 171, 0.1)',
            border: '1px solid rgba(255, 255, 255, 1)'
          }}>
            <span style={{ fontSize: '32px', filter: 'drop-shadow(0 2px 4px rgba(28,115,171,0.2))' }}>{icon || '✨'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#122946', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
              <p style={{ margin: 0, fontSize: '15px', color: '#475569', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle || 'نظام غيام لإدارة الموارد'}</p>
          </div>
        </div>

        {/* Left side: Header Content, Notifications, Navigation */}
        <div className="header-side" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
          {headerContent}
          
          <div className="header-actions" style={{ display: 'flex', flexDirection: 'row', gap: '15px', alignItems: 'center', borderRight: '2px solid rgba(28, 115, 171, 0.1)', paddingRight: '20px' }}>
             
             {/* Nav Arrows */}
             <div className="nav-group" style={{ display: 'flex', gap: '5px', margin: 0, border: 'none', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '12px', padding: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                <button onClick={() => router.forward()} className="nav-btn-glass" title="تقدم للأمام" style={{ width: '40px', height: '40px', borderRadius: '10px', fontSize: '20px', background: 'rgba(255,255,255,0.7)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1C73AB', transition: '0.2s', boxShadow: '0 2px 5px rgba(28,115,171,0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <button onClick={() => router.back()} className="nav-btn-glass" title="رجوع للخلف" style={{ width: '40px', height: '40px', borderRadius: '10px', fontSize: '20px', background: 'rgba(255,255,255,0.7)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1C73AB', transition: '0.2s', boxShadow: '0 2px 5px rgba(28,115,171,0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
             </div>

             {/* Notifications & Messages */}
             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <button className="msg-btn" onClick={() => setIsNotificationsOpen(true)} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.9)', color: '#1C73AB', cursor: 'pointer', position: 'relative', fontSize: '22px', transition: '0.3s', width: '45px', height: '45px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(28, 115, 171, 0.1)' }}>
                     🔔
                     {unread_notifications > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', fontSize: '12px', minWidth: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(239, 68, 68, 0.5)', fontWeight: 900, border: '2px solid rgba(255,255,255,0.8)' }}>{unread_notifications}</span>}
                 </button>
                 <Link className="msg-btn" href="/messages" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.9)', color: '#1C73AB', cursor: 'pointer', position: 'relative', textDecoration: 'none', fontSize: '22px', transition: '0.3s', width: '45px', height: '45px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(28, 115, 171, 0.1)' }}>
                     ✉️
                     {unread_messages > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#3b82f6', color: 'white', fontSize: '12px', minWidth: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(59, 130, 246, 0.5)', fontWeight: 900, border: '2px solid rgba(255,255,255,0.8)' }}>{unread_messages}</span>}
                 </Link>
             </div>
          </div>
          
          {/* Avatar Card Restored */}
          <div className="imperial-trigger" ref={triggerRef} onClick={toggleMenu} style={{ flexShrink: 0 }}>
            <div className="u-info-text">
              <span className="u-name">{userProfile?.full_name || 'جاري التحميل...'}</span>
              <span className="u-role">
                {userProfile?.role === 'super_admin' ? 'مدير عام 👑' : 'مسؤول نظام 🛡️'}
              </span>
            </div>
            <div className="avatar-frame">
              <img src={userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.full_name || 'U'}&background=A1D6E2&color=122946&bold=true`} alt="Avatar" />
              <div className="active-dot"></div>
            </div>
          </div>

        </div>
      </header>

      {mounted && isMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="supreme-dropdown" style={{ top: coords.top, left: coords.left }} onClick={(e) => e.stopPropagation()}>

            <div className="drop-item" onClick={() => router.push('/profile')}><span>👤</span> بروفيلي</div>
            <div className="drop-item" onClick={() => router.push('/settings')}><span>⚙️</span> الإعدادات</div>
            <div className="drop-item logout" onClick={handleLogout}><span>🚪</span> خروج</div>
        </div>,
        document.body
      )}

      <main className="glass-container">
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        {children}
      </main>
    </div>
  );
}
