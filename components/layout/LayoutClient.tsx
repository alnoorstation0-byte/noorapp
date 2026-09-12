"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { menuGroups } from '@/lib/menuData';
import { supabase } from '@/lib/supabase';
import RawasiFilterSidebar from '@/components/rawasifiltersidebar';
import { useSidebar } from '@/lib/SidebarContext'; 
import { usePermissions } from '@/lib/PermissionsContext'; 
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { usePresence } from '@/hooks/usePresence';
import LoadingScreen from '@/components/LoadingScreen';
import { useLanguage } from '@/lib/LanguageContext';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [customPosition, setCustomPosition] = useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); 
  const currentPosRef = useRef<{ x: number, y: number } | null>(null);
  const lastTouchTime = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0, startX: 0, startY: 0, hasMoved: false });

  // لمنع مشاكل Hydration
  const [mounted, setMounted] = useState(false);

  // السايد بار الجديد للفلترة
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { actions, summary, customFilters } = useSidebar(); 
  const { role, can, loading } = usePermissions();
  const unreadCounts = useUnreadCounts();
  const { onlineUsers, onlineCount } = usePresence();
  const { t, language, dir, isRtl } = useLanguage();

  // تحديث ref الموقع عند تغييره لتفادي مشاكل الـ closure
  useEffect(() => {
    currentPosRef.current = customPosition;
  }, [customPosition]);

  // تحميل الموقع المخصص مع التحقق من ملاءمته لأبعاد الشاشة الحالية
  useEffect(() => {
    const savedPos = localStorage.getItem('fabPosition_v2');
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          const fabSize = typeof window !== 'undefined' && window.innerWidth <= 768 ? 65 : 75;
          const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1000) - fabSize - 10;
          const maxY = (typeof window !== 'undefined' ? window.innerHeight : 1000) - fabSize - 10;
          const clamped = {
            x: Math.max(10, Math.min(parsed.x, maxX)),
            y: Math.max(10, Math.min(parsed.y, maxY))
          };
          setCustomPosition(clamped);
          currentPosRef.current = clamped;
        }
      } catch(e) {}
    }
    setMounted(true);
    setTimeout(() => setIsInitialized(true), 100); 
  }, []);

  // ضبط الموقع عند تغيير حجم الشاشة أو تدوير الجوال
  useEffect(() => {
    const handleResize = () => {
      setCustomPosition(prev => {
        if (!prev) return null;
        const fabSize = window.innerWidth <= 768 ? 65 : 75;
        const maxX = window.innerWidth - fabSize - 10;
        const maxY = window.innerHeight - fabSize - 10;
        const clamped = {
          x: Math.max(10, Math.min(prev.x, maxX)),
          y: Math.max(10, Math.min(prev.y, maxY))
        };
        currentPosRef.current = clamped;
        return clamped;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 📱 معالج سحب القائمة العائمة باللمس على الجوال (Touch Drag)
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartPos.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      startX: touch.clientX,
      startY: touch.clientY,
      hasMoved: false
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - dragStartPos.current.startX);
    const dy = Math.abs(touch.clientY - dragStartPos.current.startY);

    if (dx > 6 || dy > 6) {
      if (!dragStartPos.current.hasMoved) {
        dragStartPos.current.hasMoved = true;
        setIsDragging(true);
      }
    }

    if (dragStartPos.current.hasMoved) {
      const fabSize = window.innerWidth <= 768 ? 62 : 75;
      const maxX = window.innerWidth - fabSize - 8;
      const maxY = window.innerHeight - fabSize - 8;

      const newX = touch.clientX - dragStartPos.current.x;
      const newY = touch.clientY - dragStartPos.current.y;

      const pos = {
        x: Math.max(8, Math.min(newX, maxX)),
        y: Math.max(8, Math.min(newY, maxY))
      };
      currentPosRef.current = pos;
      setCustomPosition(pos);
    }
  };

  const onTouchEnd = () => {
    lastTouchTime.current = Date.now();
    if (dragStartPos.current.hasMoved) {
      if (currentPosRef.current) {
        localStorage.setItem('fabPosition_v2', JSON.stringify(currentPosRef.current));
      }
      setTimeout(() => setIsDragging(false), 50);
    } else {
      setIsDragging(false);
      setIsOpen(prev => !prev);
    }
  };

  // 🖱️ معالج سحب القائمة العائمة بالماوس على الكمبيوتر (Mouse Drag)
  const onMouseDown = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTime.current < 500) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.abs(moveEvent.clientX - dragStartPos.current.startX);
      const dy = Math.abs(moveEvent.clientY - dragStartPos.current.startY);

      if (dx > 5 || dy > 5) {
        if (!dragStartPos.current.hasMoved) {
          dragStartPos.current.hasMoved = true;
          setIsDragging(true);
        }
      }

      if (dragStartPos.current.hasMoved) {
        const fabSize = window.innerWidth <= 768 ? 62 : 75;
        const maxX = window.innerWidth - fabSize - 8;
        const maxY = window.innerHeight - fabSize - 8;

        const newX = moveEvent.clientX - dragStartPos.current.x;
        const newY = moveEvent.clientY - dragStartPos.current.y;

        const pos = {
          x: Math.max(8, Math.min(newX, maxX)),
          y: Math.max(8, Math.min(newY, maxY))
        };
        currentPosRef.current = pos;
        setCustomPosition(pos);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (dragStartPos.current.hasMoved) {
        if (currentPosRef.current) {
          localStorage.setItem('fabPosition_v2', JSON.stringify(currentPosRef.current));
        }
        setTimeout(() => setIsDragging(false), 50);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleClick = () => {
    if (Date.now() - lastTouchTime.current < 500) return;
    if (isDragging || dragStartPos.current.hasMoved) return;
    setIsOpen(prev => !prev);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  let animationDelayCounter = 0;

  if (pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }

  if (!mounted || !isInitialized || loading) {
    return <LoadingScreen message="جاري تهيئة النظام..." />; 
  }

  // فلترة القوائم حسب الصلاحيات
  const canView = (menuId: string) => {
    if (role === 'super_admin') return true;
    
    // الصلاحيات المعقدة بناء على ID القائمة
    switch(menuId) {
      case 'dashboard': return can('dashboard', 'view');
      case 'pos': return can('invoices', 'create');
      case 'pos_dashboard': return can('reports', 'view') || can('invoices', 'view');
      case 'invoices': return can('invoices', 'view');
      case 'inventory': return can('inventory', 'view');
      case 'purchase_orders': return can('purchase_orders', 'view');
      case 'receipt_vouchers': return can('receipt_vouchers', 'view');
      case 'payment_vouchers': return can('payment_vouchers', 'view');
      case 'fleet': return can('fleet', 'view');
      case 'team': return can('team', 'view');
      case 'reports': return can('reports', 'view');
      case 'settings': return can('settings', 'view');
      case 'manual_journals': return can('manual_journals', 'view');
      case 'ledgers': return can('ledgers', 'view');
      case 'trial_balance': return can('trial_balance', 'view');
      case 'financial_statements': return can('financial_statements', 'view');
      case 'expenses': return can('expenses', 'view');
      case 'partners': return can('partners', 'view');
      default: return false; 
    }
  };

  const currentMargin = isSidebarOpen ? '320px' : '0px';

  const groupKeyMap: Record<string, string> = {
    "الرئيسية والملخصات": "menu_group_home",
    "التشغيل والمبيعات": "menu_group_sales",
    "المستودع": "menu_group_inventory",
    "الحسابات والمالية": "menu_group_finance",
    "العملاء والمندوبين": "menu_group_partners",
    "النظام والتقارير": "menu_group_system",
  };

  // Helper function to find currentPage title dynamically based on path
  const findCurrentPageTitle = () => {
    for (let group of menuGroups) {
      const match = group.items.find(i => i.path === pathname);
      if (match) return t('menu_' + match.id) || match.title;
    }
    return t('menu_dashboard') || 'الرئيسية';
  };

  const currentPageTitle = findCurrentPageTitle();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* ستايلات الـ CSS للـ Layout الجديد */}
      <style dangerouslySetInnerHTML={{__html: `
        .fab-main {
          position: fixed;
          bottom: 35px; left: 35px; right: auto;
          width: 75px; height: 75px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(25px) saturate(200%);
          -webkit-backdrop-filter: blur(25px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1), inset 0 0 20px rgba(255,255,255,0.5);
          cursor: grab; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
          user-select: none; padding: 12px;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
          ${isOpen ? 'transform: scale(0.85) rotate(-15deg); opacity: 0.8;' : 'transform: scale(1) rotate(0deg); opacity: 1;'}
        }
        .fab-main.fab-has-custom-pos {
          bottom: auto !important;
          right: auto !important;
        }
        .fab-main.fab-dragging {
          cursor: grabbing !important;
          transition: none !important;
          transform: scale(1.1) !important;
          box-shadow: 0 15px 35px rgba(28, 115, 171, 0.4) !important;
          opacity: 0.9 !important;
        }
        .fab-main:hover { transform: scale(1.05) rotate(5deg); background: rgba(255, 255, 255, 0.6); }
        .fab-main:active { transform: scale(0.95); }
        .fab-logo { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); pointer-events: none; }

        .overlay-screen {
          position: fixed; inset: 0; z-index: 9998;
          pointer-events: ${isOpen ? 'auto' : 'none'};
          display: flex; align-items: flex-start; justify-content: center;
          padding: 40px 20px; box-sizing: border-box;
          overflow-y: auto; overflow-x: hidden;
        }

        .overlay-backdrop {
          position: fixed; inset: 0; z-index: 9997;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(30px) saturate(150%);
          -webkit-backdrop-filter: blur(30px) saturate(150%);
          opacity: ${isOpen ? 1 : 0};
          pointer-events: ${isOpen ? 'auto' : 'none'};
          transition: opacity 0.4s ease;
        }

        .command-center {
          width: 95vw; max-width: 1400px;
          display: flex; flex-direction: column; gap: 20px;
          margin-top: ${isOpen ? '0' : '50px'};
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)'};
          transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        .group-section {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 30px; padding: 25px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.05), inset 0 0 20px rgba(255,255,255,0.4);
          display: flex; flex-direction: column; gap: 15px;
        }

        .group-header {
          font-size: 14px; font-weight: 900; color: #334155;
          border-bottom: 2px solid rgba(255,255,255,0.5);
          padding-bottom: 10px; margin-bottom: 10px;
          display: inline-block; align-self: flex-start;
          text-transform: uppercase; letter-spacing: 1px;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
        }

        .nav-card {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 20px; padding: 15px 20px;
          display: flex; align-items: center; gap: 15px;
          text-decoration: none; color: #0f172a;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          position: relative; overflow: hidden;
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'translateY(0)' : 'translateY(20px)'};
          animation: ${isOpen ? 'slideUpFade 0.5s forwards' : 'none'};
        }

        .nav-card:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-5px) scale(1.02) !important;
          box-shadow: 0 15px 30px rgba(0,0,0,0.08);
          border-color: rgba(255,255,255,1);
        }

        .nav-card.active {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
          border: 2px solid #2891C8;
          box-shadow: 0 10px 25px rgba(40, 145, 200, 0.15);
        }

        .icon-wrapper {
          width: 50px; height: 50px;
          background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4));
          border-radius: 15px; display: flex; align-items: center; justify-content: center;
          font-size: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          border: 1px solid rgba(255,255,255,0.9);
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .fab-main {
            width: 62px; height: 62px;
            padding: 10px;
          }
          .fab-main:not(.fab-has-custom-pos) {
            bottom: 20px !important;
            left: 20px !important;
            right: auto !important;
            top: auto !important;
          }
          .fab-main.fab-has-custom-pos {
            bottom: auto !important;
            right: auto !important;
          }
          .command-center { margin-top: 10px; gap: 15px; }
          .group-section { padding: 15px; border-radius: 20px; }
          .items-grid { grid-template-columns: 1fr; gap: 10px; }
          .nav-card { padding: 12px 15px; }
          .admin-header {
            flex-direction: column;
            gap: 10px !important;
            padding: 15px !important;
          }
          .admin-header > div {
            border-right: none !important;
            padding-right: 0 !important;
            border-top: 1px solid rgba(0,0,0,0.1);
            padding-top: 10px;
            width: 100%;
            justify-content: center;
          }
          .main-content {
            margin-right: 0 !important;
          }
        }
      `}} />

      <RawasiFilterSidebar 
        title={currentPageTitle}
        extraActions={actions}
        summarySlot={summary}
        customFilters={customFilters}
        isOpenStatus={isSidebarOpen}
        setIsOpenStatus={setIsSidebarOpen}
        onSearch={(term) => window.dispatchEvent(new CustomEvent('globalSearch', { detail: term }))}
        onDateChange={(start, end) => window.dispatchEvent(new CustomEvent('globalDateFilter', { detail: { start, end } }))}
      />

      <div className={`fab-main no-print ${customPosition ? 'fab-has-custom-pos' : ''} ${isDragging ? 'fab-dragging' : ''}`} 
           style={customPosition ? { 
             left: `${customPosition.x}px`, 
             top: `${customPosition.y}px`, 
             bottom: 'auto', 
             right: 'auto',
             touchAction: 'none'
           } : { 
             touchAction: 'none' 
           }}
           onMouseDown={onMouseDown} 
           onTouchStart={onTouchStart}
           onTouchMove={onTouchMove}
           onTouchEnd={onTouchEnd}
           onClick={handleClick}
           title="القائمة العائمة (يمكنك سحبها وتحريكها في أي مكان)">
        <img src="/ghayam_logo.png" alt="لوجو" className="fab-logo" draggable="false" />
      </div>

      <div className="overlay-backdrop no-print"></div>
      <nav className="overlay-screen no-print" onClick={(e) => {
         if (e.target === e.currentTarget) setIsOpen(false); 
      }}>
          <div className="command-center" onClick={(e) => e.stopPropagation()}>
            <div className="admin-header" style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255, 255, 255, 0.9)', padding: '15px 30px', borderRadius: '20px', fontSize: '18px', textAlign: 'center', color: '#122946', marginBottom: '10px', fontWeight: 900, backdropFilter: 'blur(15px)', alignSelf: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '20px' }}>
               <span>{language === 'en' ? `Admin Portal | ${role === 'super_admin' ? 'Super Admin' : 'User Access'}` : `بوابة الإدارة | ${role === 'super_admin' ? 'مدير النظام' : 'صلاحيات مستخدم'}`}</span>
               <div style={{ display: 'flex', gap: '15px', borderRight: isRtl ? '2px solid rgba(0,0,0,0.1)' : 'none', borderLeft: !isRtl ? '2px solid rgba(0,0,0,0.1)' : 'none', paddingRight: isRtl ? '15px' : '0', paddingLeft: !isRtl ? '15px' : '0', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#dcfce7', color: '#166534', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 800 }}>
                       <span style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%', boxShadow: '0 0 8px #16a34a' }}></span>
                       {language === 'en' ? `${onlineCount} Online` : `${onlineCount} متصل`}
                   </div>
                   <button onClick={handleLogout} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 15px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                     {language === 'en' ? 'Logout' : 'تسجيل الخروج'}
                   </button>
               </div>
            </div>

            {menuGroups.map((group, gIdx) => {
              const filteredItems = group.items.filter(item => canView(item.id));
              if (filteredItems.length === 0) return null;

              const groupTitle = groupKeyMap[group.group] ? t(groupKeyMap[group.group]) : group.group;

              return (
                <div key={gIdx} className="group-section">
                  <span className="group-header">{groupTitle}</span>
                  <div className="items-grid">
                    {filteredItems.map((item, iIdx) => {
                      const delay = (animationDelayCounter++) * 0.05;
                      const isActive = pathname === item.path;
                      const itemTitle = t('menu_' + item.id) || item.title;
                      return (
                        <Link key={iIdx} href={item.path} onClick={() => setIsOpen(false)}>
                              <div className={`nav-card ${isActive ? 'active' : ''}`} style={{ animationDelay: isOpen ? `${delay}s` : '0s' }}>
                                <div className="icon-wrapper">{item.icon}</div>
                                <span className="nav-title" style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b', lineHeight: '1.4' }}>{itemTitle}</span>
                                {isActive && <div style={{ position: 'absolute', top: '15px', right: isRtl ? '15px' : 'auto', left: !isRtl ? '15px' : 'auto', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}></div>}
                            </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* المتصلين حاليا */}
            {onlineUsers.length > 0 && (
              <div className="group-section" style={{ marginTop: '20px' }}>
                <span className="group-header" style={{ borderColor: 'rgba(22, 163, 74, 0.2)', color: '#166534' }}>
                  {language === 'en' ? `Online Now (${onlineCount})` : `المتصلين الآن (${onlineCount})`}
                </span>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' }}>
                  {onlineUsers.map((user, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.8)', padding: '10px 15px', borderRadius: '15px', border: '1px solid rgba(22, 163, 74, 0.2)', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px' }}>
                            {user.full_name?.charAt(0) || 'م'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{user.full_name}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {language === 'en' ? (user.role === 'super_admin' ? 'Super Admin' : 'Employee') : (user.role === 'super_admin' ? 'مدير' : 'موظف')}
                            </span>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
      </nav>

      <main className="main-content" style={{ 
          flex: 1, 
          boxSizing: 'border-box',
          marginRight: isRtl ? currentMargin : '0px', 
          marginLeft: !isRtl ? currentMargin : '0px',
          paddingRight: '15px', 
          paddingLeft: '15px', /* Added left padding for symmetry on mobile */
          minHeight: '100vh', 
          position: 'relative', 
          zIndex: 1,
          overflowX: 'hidden',
          transition: isRtl ? 'margin-right 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)' : 'margin-left 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)' 
      }}>
        {children}
      </main>
    </div>
  );
}
