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

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); 
  const dragStartPos = useRef({ x: 0, y: 0 });

  // لمنع مشاكل Hydration
  const [mounted, setMounted] = useState(false);

  // السايد بار الجديد للفلترة
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { actions, summary, customFilters } = useSidebar(); 
  const { role, can, loading } = usePermissions();
  const unreadCounts = useUnreadCounts();
  const { onlineUsers, onlineCount } = usePresence();

  // Load saved position ONLY in browser after mount
  useEffect(() => {
    const savedPos = localStorage.getItem('fabPosition');
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (parsed.x && parsed.y) {
          setPosition(parsed);
        }
      } catch(e) {}
    }
    setMounted(true);
    // Add small delay before showing UI to avoid layout jump
    setTimeout(() => setIsInitialized(true), 100); 
  }, []);

  // Save position on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('fabPosition', JSON.stringify(position));
    }
  }, [position, mounted]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (window.innerWidth <= 768) return; // Disable drag on mobile
    setIsDragging(false);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      setIsDragging(true);
      const newX = moveEvent.clientX - dragStartPos.current.x;
      const newY = moveEvent.clientY - dragStartPos.current.y;
      
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  let animationDelayCounter = 0;

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

  // Helper function to find currentPage title dynamically based on path
  const findCurrentPageTitle = () => {
    for (let group of menuGroups) {
      const match = group.items.find(i => i.path === pathname);
      if (match) return match.title;
    }
    return 'الرئيسية';
  };

  const currentPageTitle = findCurrentPageTitle();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* ستايلات الـ CSS للـ Layout الجديد */}
      <style dangerouslySetInnerHTML={{__html: `
        .fab-main {
          position: fixed;
          bottom: 40px; right: 40px;
          width: 75px; height: 75px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(25px) saturate(200%);
          -webkit-backdrop-filter: blur(25px) saturate(200%);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1), inset 0 0 20px rgba(255,255,255,0.5);
          cursor: pointer; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
          user-select: none; padding: 12px;
          ${isOpen ? 'transform: scale(0.85) rotate(-15deg); opacity: 0.8;' : 'transform: scale(1) rotate(0deg); opacity: 1;'}
        }
        .fab-main:hover { transform: scale(1.05) rotate(5deg); background: rgba(255, 255, 255, 0.6); }
        .fab-main:active { transform: scale(0.95); }
        .fab-logo { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }

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
            bottom: 20px !important; right: 20px !important; left: auto !important; top: auto !important;
            width: 65px; height: 65px;
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

      <div className="fab-main no-print" 
           style={window.innerWidth > 768 ? { left: position.x, top: position.y, bottom: 'auto', right: 'auto' } : undefined}
           onMouseDown={(e) => { if(window.innerWidth > 768) onMouseDown(e); }} 
           onTouchStart={(e) => { if(window.innerWidth <= 768) setIsOpen(!isOpen); }}
           onClick={() => { if(window.innerWidth > 768 && !isDragging) setIsOpen(!isOpen); }}>
        <img src="/ghayam_logo.png" alt="لوجو" className="fab-logo" />
      </div>

      <div className="overlay-backdrop no-print"></div>
      <nav className="overlay-screen no-print" onClick={(e) => {
         if (e.target === e.currentTarget) setIsOpen(false); 
      }}>
          <div className="command-center" onClick={(e) => e.stopPropagation()}>
            <div className="admin-header" style={{ background: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255, 255, 255, 0.9)', padding: '15px 30px', borderRadius: '20px', fontSize: '18px', textAlign: 'center', color: '#122946', marginBottom: '10px', fontWeight: 900, backdropFilter: 'blur(15px)', alignSelf: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '20px' }}>
               <span>بوابة الإدارة | {role === 'super_admin' ? 'مدير النظام' : 'صلاحيات مستخدم'}</span>
               <div style={{ display: 'flex', gap: '15px', borderRight: '2px solid rgba(0,0,0,0.1)', paddingRight: '15px', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#dcfce7', color: '#166534', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 800 }}>
                       <span style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%', boxShadow: '0 0 8px #16a34a' }}></span>
                       {onlineCount} متصل
                   </div>
                   <button onClick={handleLogout} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 15px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                     تسجيل الخروج
                   </button>
               </div>
            </div>

            {menuGroups.map((group, gIdx) => {
              const filteredItems = group.items.filter(item => canView(item.id));
              if (filteredItems.length === 0) return null;

              return (
                <div key={gIdx} className="group-section">
                  <span className="group-header">{group.group}</span>
                  <div className="items-grid">
                    {filteredItems.map((item, iIdx) => {
                      const delay = (animationDelayCounter++) * 0.05;
                      const isActive = pathname === item.path;
                      return (
                        <Link key={iIdx} href={item.path} onClick={() => setIsOpen(false)}>
                              <div className={`nav-card ${isActive ? 'active' : ''}`} style={{ animationDelay: isOpen ? `${delay}s` : '0s' }}>
                                <div className="icon-wrapper">{item.icon}</div>
                                <span className="nav-title" style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b', lineHeight: '1.4' }}>{item.title}</span>
                                {isActive && <div style={{ position: 'absolute', top: '15px', right: '15px', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}></div>}
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
                <span className="group-header" style={{ borderColor: 'rgba(22, 163, 74, 0.2)', color: '#166534' }}>المتصلين الآن ({onlineCount})</span>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' }}>
                  {onlineUsers.map((user, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.8)', padding: '10px 15px', borderRadius: '15px', border: '1px solid rgba(22, 163, 74, 0.2)', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px' }}>
                            {user.full_name?.charAt(0) || 'م'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{user.full_name}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{user.role === 'super_admin' ? 'مدير' : 'موظف'}</span>
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
          marginRight: currentMargin, 
          paddingRight: '15px', 
          paddingLeft: '15px', /* Added left padding for symmetry on mobile */
          minHeight: '100vh', 
          position: 'relative', 
          zIndex: 1,
          overflowX: 'hidden',
          transition: 'margin-right 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)' 
      }}>
        {children}
      </main>
    </div>
  );
}
