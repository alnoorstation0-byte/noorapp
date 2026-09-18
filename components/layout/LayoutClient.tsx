"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { 
  Menu, 
  X, 
  LogOut, 
  Home, 
  ShoppingBag, 
  FileText, 
  Package, 
  ArrowUpRight,
  Zap,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useThemeMode } from '@/lib/ThemeContext';

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

  // السايد بار للفلترة
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { actions, summary, customFilters } = useSidebar(); 
  const { role, can, loading } = usePermissions();
  const unreadCounts = useUnreadCounts();
  const { onlineUsers, onlineCount } = usePresence();
  const { t, language, dir, isRtl, toggleLanguage } = useLanguage();
  const { themeMode, toggleTheme, isDaylight } = useThemeMode();

  const [lowGraphics, setLowGraphics] = useState(false);

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

  // إغلاق القائمة بالضغط على Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. الافتراضي الأساسي هو المظهر الزجاجي الفاخر (Glassmorphism)
    const saved = localStorage.getItem('lowGraphicsMode');
    const isLow = saved === 'true'; // false افتراضياً
    setLowGraphics(isLow);
    if (isLow) {
      document.documentElement.classList.add('low-graphics-mode');
      document.body.classList.add('low-graphics-mode');
    } else {
      document.documentElement.classList.remove('low-graphics-mode');
      document.body.classList.remove('low-graphics-mode');
    }

    // 2. مزامنة التفضيل المحفوظ في بروفايل المستخدم (Supabase Auth / Profiles)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.user_metadata?.low_graphics_mode !== undefined) {
        const profilePref = Boolean(user.user_metadata.low_graphics_mode);
        // إذا لم يكن مخزناً محلياً بعد، نطبق تفضيل البروفايل
        if (saved === null) {
          localStorage.setItem('lowGraphicsMode', String(profilePref));
          setLowGraphics(profilePref);
          if (profilePref) {
            document.documentElement.classList.add('low-graphics-mode');
            document.body.classList.add('low-graphics-mode');
          } else {
            document.documentElement.classList.remove('low-graphics-mode');
            document.body.classList.remove('low-graphics-mode');
          }
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleModeChange = (e: any) => {
      setLowGraphics(Boolean(e.detail));
    };
    window.addEventListener('lowGraphicsModeChanged', handleModeChange);
    return () => window.removeEventListener('lowGraphicsModeChanged', handleModeChange);
  }, []);

  const toggleLowGraphics = async () => {
    const newVal = !lowGraphics;
    setLowGraphics(newVal);
    localStorage.setItem('lowGraphicsMode', String(newVal));
    
    if (newVal) {
      document.documentElement.classList.add('low-graphics-mode');
      document.body.classList.add('low-graphics-mode');
      toast.success(language === 'en' ? '⚡️ Performance mode enabled' : '⚡️ تم تفعيل وضع الأداء السريع (تخفيف الجرافيك للجوالات)');
    } else {
      document.documentElement.classList.remove('low-graphics-mode');
      document.body.classList.remove('low-graphics-mode');
      toast.success(language === 'en' ? '✨ Premium glassmorphism restored' : '✨ تم استعادة المظهر الزجاجي الفاخر');
    }

    window.dispatchEvent(new CustomEvent('lowGraphicsModeChanged', { detail: newVal }));

    // حفظ التفضيل مباشرة في بروفايل المستخدم في سوبابيز ليبقى معه أينما فتح
    try {
      await supabase.auth.updateUser({
        data: { low_graphics_mode: newVal }
      });
    } catch (err) {
      console.error('Failed to sync performance mode with profile:', err);
    }
  };

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

  if (pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }

  if (!mounted || !isInitialized || loading) {
    return <LoadingScreen message={language === 'en' ? "Initializing Al-Noor Gas Stations Command Center..." : "جاري تهيئة مركز قيادة محطات النور للوقود..."} />; 
  }

  // فلترة القوائم حسب الصلاحيات
  const canView = (menuId: string) => {
    if (role === 'super_admin' || role === 'admin') return true;
    
    switch(menuId) {
      case 'dashboard': return can('dashboard', 'view');
      case 'global_summary': return can('dashboard', 'view') || can('reports', 'view');
      case 'kpis': return can('dashboard', 'view') || can('reports', 'view');
      case 'profit_dashboard': return can('dashboard', 'view') || can('reports', 'view');
      case 'pos': return can('pos', 'view') || can('invoices', 'create') || can('invoices', 'view');
      case 'pos_dashboard': return can('pos', 'view') || can('reports', 'view') || can('invoices', 'view');
      case 'pos_settlements': return can('pos', 'view') || can('receipts', 'view');
      case 'invoices': return can('invoices', 'view');
      case 'sales_analysis': return can('invoices', 'view') || can('reports', 'view');
      case 'inventory': return can('inventory', 'view');
      case 'item_card': return can('inventory', 'view');
      case 'reorder_alerts': return can('inventory', 'view');
      case 'inventory_valuation': return can('inventory', 'view') || can('accounts', 'view');
      case 'purchase_orders': return can('inventory', 'view') || can('expenses', 'view');
      case 'warehouses': return can('inventory', 'view');
      case 'inventory_transactions': return can('inventory', 'view');
      case 'receipts': case 'receipt_vouchers': return can('receipts', 'view');
      case 'payments': case 'payment_vouchers': return can('payments', 'view');
      case 'expenses': return can('expenses', 'view');
      case 'journal': return can('journal', 'view') || can('accounts', 'view');
      case 'manual_journals': return can('journal', 'view') || can('accounts', 'view') || can('manual_journals', 'view');
      case 'accounts': return can('accounts', 'view');
      case 'ledger': case 'ledgers': return can('accounts', 'view') || can('journal', 'view');
      case 'trialbalance': case 'trial_balance': return can('accounts', 'view') || can('reports', 'view');
      case 'financial_center': return can('accounts', 'view') || can('reports', 'view');
      case 'financial_statements': return can('accounts', 'view') || can('reports', 'view');
      case 'financialplan': return can('accounts', 'view') || can('reports', 'view');
      case 'cashflows': return can('accounts', 'view') || can('reports', 'view');
      case 'vat_return': return can('accounts', 'view') || can('reports', 'view');
      case 'partners': return can('partners', 'view');
      case 'partner_balances': return can('partners', 'view') || can('reports', 'view');
      case 'statement': return can('partners', 'view') || can('accounts', 'view');
      case 'ar_aging': return can('partners', 'view') || can('reports', 'view');
      case 'reports': return can('reports', 'view');
      case 'audit': return can('settings', 'view') || can('reports', 'view');
      case 'payroll': return can('expenses', 'view') || can('settings', 'view');
      case 'settings': return can('settings', 'view');
      case 'permissions': return can('settings', 'view');
      case 'notifications': return true;
      case 'profile': return true;
      default: return true; 
    }
  };

  const currentMargin = isSidebarOpen ? '320px' : '0px';

  const groupKeyMap: Record<string, string> = {
    "الرئيسية والملخصات": "menu_group_home",
    "التشغيل والمبيعات": "menu_group_sales",
    "المحطات وخزانات الوقود": "menu_group_inventory",
    "المستودع وخزانات الوقود": "menu_group_inventory",
    "المستودع": "menu_group_inventory",
    "الحسابات والمالية": "menu_group_finance",
    "العملاء والشركاء": "menu_group_partners",
    "العملاء ومشغلو المحطات": "menu_group_partners",
    "النظام والتقارير": "menu_group_system",
  };

  // Helper function to find currentPage item dynamically based on path
  const currentMenuItem = (() => {
    for (let group of menuGroups) {
      const match = group.items.find(i => i.path === pathname);
      if (match) return match;
    }
    return null;
  })();

  const currentPageTitle = currentMenuItem 
    ? (t('menu_' + currentMenuItem.id) || currentMenuItem.title)
    : (t('menu_dashboard') || (language === 'en' ? 'Command Dashboard' : 'لوحة القيادة والتحكم'));

  // إجمالي الإشعارات غير المقروءة
  const totalUnread = (unreadCounts?.invoices || 0) + (unreadCounts?.orders || 0);

  // فلترة عناصر القائمة حسب الصلاحيات
  const authorizedMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => canView(item.id))
  })).filter(group => group.items.length > 0);

  let animationDelayCounter = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* ⚡ أنماط Dark Titanium Glassmorphism لمركز القيادة والقائمة العائمة */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --titanium-bg: #0B0E14;
          --titanium-surface: #141822;
          --electric-cyan: #00E5FF;
          --neon-emerald: #10B981;
          --neon-amber: #F59E0B;
          --titanium-border: rgba(0, 229, 255, 0.25);
        }

        /* =================== الزر العائم القابل للسحب (Draggable FAB) =================== */
        .fab-main {
          position: fixed;
          bottom: 30px; left: 30px; right: auto;
          width: 66px; height: 66px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1.5px solid rgba(0, 229, 255, 0.4);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 229, 255, 0.2);
          cursor: grab; z-index: 9990;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
          user-select: none; padding: 10px;
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
          transform: scale(1.12) !important;
          box-shadow: 0 15px 35px rgba(0, 229, 255, 0.35) !important;
          opacity: 0.95 !important;
        }
        .fab-main:hover { 
          transform: scale(1.08) rotate(6deg); 
          background: rgba(25, 30, 44, 0.98); 
          border-color: #00E5FF; 
          box-shadow: 0 12px 35px rgba(0, 229, 255, 0.35);
        }
        .fab-main:active { transform: scale(0.95); }
        .fab-logo { 
          width: 100%; height: 100%; 
          object-fit: contain; 
          pointer-events: none; 
          filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.4));
        }

        /* =================== مركز القيادة الزجاجي (Command Hub Overlay) =================== */
        .overlay-screen {
          position: fixed; inset: 0; z-index: 10005;
          pointer-events: ${isOpen ? 'auto' : 'none'};
          display: flex; align-items: flex-start; justify-content: center;
          padding: 40px 20px; box-sizing: border-box;
          overflow-y: auto; overflow-x: hidden;
        }

        .overlay-backdrop {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(11, 14, 20, 0.85);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          opacity: ${isOpen ? 1 : 0};
          pointer-events: ${isOpen ? 'auto' : 'none'};
          transition: opacity 0.4s ease;
        }

        .command-center {
          width: 95vw; max-width: 1280px;
          display: flex; flex-direction: column; gap: 20px;
          margin-top: ${isOpen ? '0' : '40px'};
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(20px)'};
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        /* ترويسة القائمة الفاخرة */
        .admin-header-glass {
          background: linear-gradient(135deg, rgba(20, 24, 34, 0.96) 0%, rgba(15, 20, 30, 0.92) 100%);
          border: 1px solid rgba(0, 229, 255, 0.25);
          border-radius: 22px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          gap: 12px;
          flex-wrap: wrap;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1 1 240px;
          user-select: none;
        }
        .brand-logo-wrap {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 14px;
          background: rgba(0, 229, 255, 0.1);
          border: 1.5px solid rgba(0, 229, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          box-shadow: 0 0 12px rgba(0, 229, 255, 0.15);
          flex-shrink: 0;
        }
        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .brand-text-block {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .brand-title {
          font-size: 16px;
          font-weight: 900;
          color: #F8FAFC;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .brand-subtitle {
          font-size: 11.5px;
          font-weight: 700;
          color: #00E5FF;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .header-actions-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .online-status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #10B981;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 11.5px;
          font-weight: 800;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .online-dot-pulse {
          width: 8px;
          height: 8px;
          background: #10B981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10B981;
          animation: pulseGreen 2s infinite ease-in-out;
          flex-shrink: 0;
        }
        @keyframes pulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.25); }
        }

        .btn-header-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
          border: 1px solid transparent;
        }
        .btn-header-action:hover {
          transform: translateY(-1px);
        }

        .btn-close-modal {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #94A3B8;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .btn-close-modal:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.4);
          transform: translateY(-1px);
        }

        .group-section {
          background: linear-gradient(135deg, rgba(20, 24, 34, 0.92) 0%, rgba(15, 20, 30, 0.85) 100%);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .group-header {
          font-size: 13.5px;
          font-weight: 900;
          color: #00E5FF;
          border-bottom: 2px solid rgba(0, 229, 255, 0.2);
          padding-bottom: 8px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .group-header-title {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .group-header-badge {
          flex-shrink: 0;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 800;
          color: #00E5FF;
          background: rgba(0, 229, 255, 0.15);
          padding: 2px 10px;
          border-radius: 12px;
          border: 1px solid rgba(0, 229, 255, 0.25);
        }

        .command-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
          gap: 14px;
          width: 100%;
        }

        .nav-card {
          width: 100%;
          min-width: 0;
          background: rgba(20, 24, 34, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border-radius: 18px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-decoration: none;
          color: #F8FAFC;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          position: relative;
          min-height: 72px;
          box-sizing: border-box;
          gap: 12px;
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'translateY(0)' : 'translateY(20px)'};
          animation: ${isOpen ? 'slideUpFade 0.45s forwards' : 'none'};
        }

        .nav-card:hover {
          background: rgba(28, 34, 48, 0.9);
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 25px rgba(0, 229, 255, 0.2) !important;
          border-color: #00E5FF;
        }

        .nav-card.active {
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(20, 24, 34, 0.95));
          border: 2px solid #00E5FF;
          box-shadow: 0 8px 24px rgba(0, 229, 255, 0.25);
        }

        .nav-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .icon-wrapper {
          width: 42px;
          height: 42px;
          min-width: 42px;
          background: rgba(0, 229, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 229, 255, 0.25);
          color: #00E5FF;
          flex-shrink: 0;
        }

        .nav-title-block {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
          justify-content: center;
        }
        .nav-title {
          font-weight: 800;
          font-size: 13.5px;
          color: #F8FAFC;
          line-height: 1.4;
          word-break: keep-all;
          overflow-wrap: normal;
          white-space: normal;
          text-align: start;
        }
        .nav-path {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          margin-top: 2px;
          font-family: monospace;
          direction: ltr;
          text-align: right;
        }
        .nav-card-active-dot {
          width: 8px;
          height: 8px;
          min-width: 8px;
          background: #00E5FF;
          border-radius: 50%;
          box-shadow: 0 0 10px #00E5FF;
          flex-shrink: 0;
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* بطاقات فريق العمل المتصل */
        .online-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(20, 24, 34, 0.85);
          padding: 8px 14px;
          border-radius: 14px;
          border: 1px solid rgba(16, 185, 129, 0.3);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          max-width: 250px;
          min-width: 0;
        }
        .online-user-avatar {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 50%;
          background: #10B981;
          color: #0B0E14;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 13px;
          flex-shrink: 0;
        }
        .online-user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .online-user-name {
          font-size: 12px;
          font-weight: 900;
          color: #F8FAFC;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
          line-height: 1.25;
        }
        .online-user-role {
          font-size: 10.5px;
          color: #00E5FF;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }

        /* =================== شريط التنقل السفلي الذكي للجوال (Bottom Dock) =================== */
        .desert-bottom-dock {
          display: none;
        }

        @media (max-width: 768px) {
          .fab-main {
            display: none !important;
          }
          .command-center { margin-top: 10px; gap: 14px; }
          .group-section { padding: 16px; border-radius: 20px; }
          .command-items-grid { grid-template-columns: 1fr !important; gap: 10px; }
          .nav-card { padding: 12px 14px; min-height: 60px; }

          .main-content {
            margin-right: 0 !important;
            margin-left: 0 !important;
            padding-bottom: 85px !important;
          }

          /* الشريط السفلي للجوال */
          .desert-bottom-dock {
            display: flex;
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            height: 60px;
            background: linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(15, 20, 30, 0.95) 100%);
            backdrop-filter: blur(24px) saturate(160%);
            -webkit-backdrop-filter: blur(24px) saturate(160%);
            border: 1px solid rgba(0, 229, 255, 0.25);
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
            z-index: 999;
            align-items: center;
            justify-content: space-around;
            padding: 0 4px;
            box-sizing: border-box;
          }
          .dock-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            text-decoration: none;
            color: #94A3B8;
            padding: 4px 2px;
            border-radius: 12px;
            transition: all 0.2s ease;
            position: relative;
            flex: 1;
            min-width: 0;
          }
          .dock-item span {
            font-size: 10px;
            font-weight: 800;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            text-align: center;
          }
          .dock-item.active {
            color: #00E5FF;
            background: rgba(0, 229, 255, 0.12);
          }
          .dock-item.active::after {
            content: '';
            position: absolute;
            bottom: 3px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #00E5FF;
            box-shadow: 0 0 6px #00E5FF;
          }
          .dock-item svg {
            width: 19px;
            height: 19px;
            flex-shrink: 0;
          }
        }

        @media (max-width: 640px) {
          .header-btn-label {
            display: none !important;
          }
          .btn-header-action {
            padding: 8px 10px !important;
          }
          .brand-subtitle {
            display: none !important;
          }
          .admin-header-glass {
            padding: 12px 14px !important;
          }
        }

        /* ☀️ وضع الرؤية النهارية الصحراوية لمركز القيادة والقوائم والشريط السفلي (Desert Glassmorphism) */
        .daylight-theme .overlay-screen {
          background: rgba(44, 26, 18, 0.25) !important;
        }
        .daylight-theme .overlay-backdrop {
          background: rgba(253, 251, 247, 0.75) !important;
          backdrop-filter: blur(24px) saturate(160%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
        }
        .daylight-theme .admin-header-glass {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(250, 246, 240, 0.94) 100%) !important;
          border: 1px solid rgba(194, 155, 98, 0.35) !important;
          box-shadow: 0 10px 30px rgba(44, 26, 18, 0.08) !important;
        }
        .daylight-theme .brand-title {
          color: #2C1A12 !important;
        }
        .daylight-theme .brand-subtitle {
          color: #A8573C !important;
        }
        .daylight-theme .brand-logo-wrap {
          background: rgba(194, 155, 98, 0.12) !important;
          border-color: rgba(194, 155, 98, 0.4) !important;
          box-shadow: 0 0 12px rgba(194, 155, 98, 0.15) !important;
        }
        .daylight-theme .btn-close-modal {
          background: rgba(245, 240, 232, 0.9) !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
          color: #2C1A12 !important;
        }
        .daylight-theme .btn-close-modal:hover {
          background: rgba(239, 68, 68, 0.15) !important;
          color: #dc2626 !important;
          border-color: rgba(239, 68, 68, 0.4) !important;
        }
        .daylight-theme .group-section {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.96) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
          border: 1px solid rgba(194, 155, 98, 0.3) !important;
          box-shadow: 0 10px 25px rgba(44, 26, 18, 0.05) !important;
        }
        .daylight-theme .group-header {
          color: #2C1A12 !important;
          border-bottom-color: rgba(194, 155, 98, 0.3) !important;
        }
        .daylight-theme .group-header-badge {
          color: #A8573C !important;
          background: rgba(194, 155, 98, 0.15) !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
        }
        .daylight-theme .nav-card {
          background: rgba(255, 253, 250, 0.92) !important;
          border-color: rgba(194, 155, 98, 0.25) !important;
          box-shadow: 0 3px 10px rgba(44, 26, 18, 0.04) !important;
          color: #2C1A12 !important;
        }
        .daylight-theme .nav-card:hover {
          background: #FFFFFF !important;
          border-color: #C29B62 !important;
          box-shadow: 0 8px 22px rgba(168, 87, 60, 0.15) !important;
        }
        .daylight-theme .nav-card.active {
          background: linear-gradient(135deg, rgba(194, 155, 98, 0.2), rgba(255, 253, 250, 0.98)) !important;
          border: 2px solid #C29B62 !important;
          box-shadow: 0 8px 24px rgba(194, 155, 98, 0.25) !important;
        }
        .daylight-theme .nav-title {
          color: #2C1A12 !important;
        }
        .daylight-theme .nav-path {
          color: rgba(44, 26, 18, 0.55) !important;
        }
        .daylight-theme .icon-wrapper {
          background: rgba(194, 155, 98, 0.12) !important;
          border-color: rgba(194, 155, 98, 0.35) !important;
          color: #A8573C !important;
        }
        .daylight-theme .nav-card-active-dot {
          background: #C29B62 !important;
          box-shadow: 0 0 10px #C29B62 !important;
        }
        .daylight-theme .online-user-card {
          background: rgba(255, 253, 250, 0.95) !important;
          border-color: rgba(78, 115, 79, 0.35) !important;
          box-shadow: 0 2px 8px rgba(44, 26, 18, 0.06) !important;
        }
        .daylight-theme .online-user-name {
          color: #2C1A12 !important;
        }
        .daylight-theme .online-user-role {
          color: #4E734F !important;
        }
        .daylight-theme .desert-bottom-dock {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(250, 246, 240, 0.95) 100%) !important;
          border: 1px solid rgba(194, 155, 98, 0.35) !important;
          box-shadow: 0 10px 25px rgba(44, 26, 18, 0.12) !important;
        }
        .daylight-theme .dock-item {
          color: rgba(44, 26, 18, 0.6) !important;
        }
        .daylight-theme .dock-item.active {
          color: #A8573C !important;
          background: rgba(194, 155, 98, 0.16) !important;
        }
        .daylight-theme .dock-item.active::after {
          background: #A8573C !important;
          box-shadow: 0 0 6px #A8573C !important;
        }
      `}} />

      {/* 1️⃣ السايد بار المتقدم للفلترة والعمليات */}
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

      {/* 2️⃣ الزر العائم الذكي القابل للسحب (Draggable FAB) */}
      <div 
        className={`fab-main no-print ${customPosition ? 'fab-has-custom-pos' : ''} ${isDragging ? 'fab-dragging' : ''}`} 
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
        title={language === 'en' ? "Quick Command Hub (Draggable)" : "مركز القيادة السريع (يمكنك سحب الزر وتحريكه في أي مكان)"}
      >
        <img src="/logo.png" alt="Noor Gas Station" className="fab-logo" />
      </div>

      {/* 3️⃣ مركز القيادة الشامل (Command Hub Modal) */}
      <div className="overlay-backdrop no-print"></div>
      <nav 
        className="overlay-screen no-print" 
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false); 
        }}
      >
        <div className="command-center" onClick={(e) => e.stopPropagation()}>
          
          {/* ترويسة مركز القيادة والقائمة */}
          <div className="admin-header-glass">
            <div className="brand-section">
              <div className="brand-logo-wrap">
                <img src="/logo.png" alt="Noor Gas Station" className="brand-logo-img" />
              </div>
              <div className="brand-text-block">
                <span className="brand-title">{language === 'en' ? 'Al-Noor Gas Stations' : 'محطات النور للوقود'}</span>
                <span className="brand-subtitle">
                  {language === 'en' ? `Unified Command Center | ${role === 'super_admin' ? 'Super Admin' : 'Staff'}` : `مركز القيادة والتحكم الموحد | ${role === 'super_admin' ? 'مدير النظام' : 'صلاحيات مستخدم'}`}
                </span>
              </div>
            </div>

            <div className="header-actions-group">
              <div className="online-status-chip">
                <span className="online-dot-pulse"></span>
                <span>{language === 'en' ? `${onlineCount} Online` : `${onlineCount} متصل الآن`}</span>
              </div>

              {/* زر تبديل اللغة */}
              <button 
                onClick={toggleLanguage}
                className="btn-header-action"
                style={{ 
                  color: isDaylight ? '#2C1A12' : '#F8FAFC', 
                  background: isDaylight ? 'rgba(194, 155, 98, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  borderColor: isDaylight ? 'rgba(194, 155, 98, 0.35)' : 'rgba(255, 255, 255, 0.15)'
                }}
                title={language === 'en' ? 'Switch to Arabic' : 'التحويل إلى الإنجليزية'}
              >
                <Languages size={15} />
                <span className="header-btn-label">
                  {language === 'en' ? 'العربية' : 'English'}
                </span>
              </button>

              {/* زر تبديل الوضع النهاري واليالي */}
              <button 
                onClick={toggleTheme}
                className="btn-header-action"
                style={{ 
                  color: isDaylight ? '#A8573C' : '#F59E0B', 
                  background: isDaylight ? 'rgba(168, 87, 60, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  borderColor: isDaylight ? 'rgba(168, 87, 60, 0.35)' : 'rgba(245, 158, 11, 0.35)'
                }}
                title={isDaylight ? (language === 'en' ? 'Switch to Night Vision' : 'التبديل إلى الرؤية الليلية') : (language === 'en' ? 'Switch to Daylight Vision' : 'التبديل إلى الرؤية النهارية')}
              >
                {isDaylight ? <Moon size={15} /> : <Sun size={15} />}
                <span className="header-btn-label">
                  {isDaylight ? (language === 'en' ? 'Night' : 'رؤية ليلية') : (language === 'en' ? 'Daylight' : 'رؤية نهارية')}
                </span>
              </button>

              {/* زر وضع الأداء السريع */}
              <button 
                onClick={toggleLowGraphics}
                className="btn-header-action"
                style={{ 
                  color: lowGraphics ? (isDaylight ? '#4E734F' : '#00E5FF') : (isDaylight ? '#2C1A12' : '#94A3B8'), 
                  background: lowGraphics ? (isDaylight ? 'rgba(78, 115, 79, 0.15)' : 'rgba(0, 229, 255, 0.15)') : (isDaylight ? 'rgba(44, 26, 18, 0.06)' : 'rgba(255, 255, 255, 0.06)'),
                  borderColor: lowGraphics ? (isDaylight ? 'rgba(78, 115, 79, 0.4)' : 'rgba(0, 229, 255, 0.4)') : (isDaylight ? 'rgba(44, 26, 18, 0.15)' : 'rgba(255, 255, 255, 0.1)')
                }}
                title={language === 'en' ? 'Performance Mode (Speed boost for mobile)' : 'وضع الأداء السريع (تسريع الاستجابة للجوالات)'}
              >
                <Zap size={15} />
                <span className="header-btn-label">
                  {language === 'en' ? 'Performance' : 'وضع الأداء'}
                </span>
              </button>

              {/* زر تسجيل الخروج */}
              <button 
                className="btn-header-action" 
                onClick={handleLogout} 
                style={{
                  background: 'rgba(220, 38, 38, 0.12)',
                  color: '#ef4444',
                  borderColor: 'rgba(220, 38, 38, 0.3)'
                }}
                title={language === 'en' ? 'Logout' : 'تسجيل الخروج'}
              >
                <LogOut size={15} />
                <span className="header-btn-label">{language === 'en' ? 'Logout' : 'تسجيل الخروج'}</span>
              </button>

              {/* زر إغلاق القائمة */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="btn-close-modal"
                title={language === 'en' ? 'Close Menu (Esc)' : 'إغلاق القائمة (Esc)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* شبكة البطاقات المقسمة حسب الأقسام مباشرة دون بحث */}
          {authorizedMenuGroups.map((group, gIdx) => {
            const groupTitle = groupKeyMap[group.group] ? t(groupKeyMap[group.group]) : group.group;

            return (
              <div key={gIdx} className="group-section">
                <div className="group-header">
                  <span className="group-header-title">{groupTitle}</span>
                  <span className="group-header-badge">
                    {group.items.length} {language === 'en' ? 'Screens' : 'شاشات'}
                  </span>
                </div>
                <div className="command-items-grid">
                  {group.items.map((item, iIdx) => {
                    const delay = (animationDelayCounter++) * 0.03;
                    const isActive = pathname === item.path;
                    const itemTitle = t('menu_' + item.id) || item.title;
                    return (
                      <Link key={iIdx} href={item.path} prefetch={false} onClick={() => setIsOpen(false)} style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
                        <div className={`nav-card ${isActive ? 'active' : ''}`} style={{ animationDelay: isOpen ? `${delay}s` : '0s', width: '100%' }}>
                          <div className="nav-card-left">
                            <div className="icon-wrapper">{item.icon}</div>
                            <div className="nav-title-block">
                              <span className="nav-title" title={itemTitle}>{itemTitle}</span>
                              <span className="nav-path">{item.path}</span>
                            </div>
                          </div>
                          {isActive ? (
                            <div className="nav-card-active-dot" title={language === 'en' ? 'Current Active Screen' : 'الشاشة النشطة حالياً'}></div>
                          ) : (
                            <ArrowUpRight size={16} color={isDaylight ? "rgba(168, 87, 60, 0.6)" : "rgba(0, 229, 255, 0.45)"} style={{ flexShrink: 0 }} />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* المتصلين حالياً بالنظام */}
          {onlineUsers.length > 0 && (
            <div className="group-section" style={{ marginTop: '10px' }}>
              <div className="group-header" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10B981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="online-dot-pulse"></span>
                  <span className="group-header-title">{language === 'en' ? `Team Online (${onlineCount})` : `فريق العمل المتصل الآن (${onlineCount})`}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                {onlineUsers.map((user, idx) => (
                  <div key={idx} className="online-user-card">
                    <div className="online-user-avatar">
                      {user.full_name?.charAt(0) || 'م'}
                    </div>
                    <div className="online-user-info">
                      <span className="online-user-name" title={user.full_name}>{user.full_name}</span>
                      <span className="online-user-role">
                        {language === 'en' ? (user.role === 'super_admin' ? 'Super Admin' : 'Staff') : (user.role === 'super_admin' ? 'مدير النظام' : 'موظف')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </nav>

      {/* 4️⃣ شريط التنقل السفلي الذكي للجوال (Mobile Bottom Dock) */}
      <div className="desert-bottom-dock no-print">
        <Link href="/Dashboard" prefetch={false} className={`dock-item ${pathname === '/Dashboard' ? 'active' : ''}`}>
          <Home />
          <span>{language === 'en' ? 'Home' : 'الرئيسية'}</span>
        </Link>
        <Link href="/pos" prefetch={false} className={`dock-item ${pathname === '/pos' ? 'active' : ''}`}>
          <ShoppingBag />
          <span>{language === 'en' ? 'POS' : 'الكاشير'}</span>
        </Link>
        <Link href="/invoices" prefetch={false} className={`dock-item ${pathname === '/invoices' ? 'active' : ''}`}>
          <FileText />
          <span>{language === 'en' ? 'Invoices' : 'الفواتير'}</span>
        </Link>
        <Link href="/inventory" prefetch={false} className={`dock-item ${pathname === '/inventory' ? 'active' : ''}`}>
          <Package />
          <span>{language === 'en' ? 'Tanks' : 'الخزانات'}</span>
        </Link>
        <button 
          onClick={() => setIsOpen(prev => !prev)} 
          className={`dock-item ${isOpen ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          title={language === 'en' ? 'Open Menu' : 'فتح القائمة'}
        >
          <Menu />
          <span>{language === 'en' ? 'Menu' : 'القائمة'}</span>
        </button>
      </div>

      {/* 5️⃣ المحتوى الرئيسي للصفحة */}
      <main className="main-content" style={{ 
          flex: 1, 
          boxSizing: 'border-box',
          marginRight: isRtl ? currentMargin : '0px', 
          marginLeft: !isRtl ? currentMargin : '0px',
          paddingRight: '15px', 
          paddingLeft: '15px',
          paddingTop: '15px',
          minHeight: '100vh', 
          position: 'relative', 
          zIndex: 1,
          overflowX: 'hidden',
          transition: isRtl ? 'margin-right 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)' : 'margin-left 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)' 
      }}>
        {children}
      </main>
    </div>
  );
}
