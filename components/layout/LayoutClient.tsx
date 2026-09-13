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
  Search, 
  Menu, 
  X, 
  Bell, 
  User, 
  LogOut, 
  Filter, 
  Home, 
  ShoppingBag, 
  FileText, 
  Package, 
  Layers, 
  Sparkles, 
  Compass, 
  ChevronRight, 
  ChevronLeft,
  Command,
  ArrowUpRight
} from 'lucide-react';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hubSearch, setHubSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customPosition, setCustomPosition] = useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); 
  const currentPosRef = useRef<{ x: number, y: number } | null>(null);
  const lastTouchTime = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0, startX: 0, startY: 0, hasMoved: false });
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // اختصار لوحة المفاتيح لفتح وإغلاق مركز القيادة (Ctrl + K أو Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // التركيز التلقائي على خانة البحث عند فتح مركز القيادة
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    } else {
      setHubSearch('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

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
    return <LoadingScreen message="جاري تهيئة نظام صيدلية تاج المودة..." />; 
  }

  // فلترة القوائم حسب الصلاحيات
  const canView = (menuId: string) => {
    if (role === 'super_admin') return true;
    
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
    : (t('menu_dashboard') || 'الرئيسية');

  // إجمالي الإشعارات غير المقروءة
  const totalUnread = (unreadCounts?.invoices || 0) + (unreadCounts?.orders || 0);

  // فلترة عناصر القائمة في مركز القيادة حسب البحث والتصنيف
  const filteredMenuGroups = menuGroups.map(group => {
    if (selectedCategory !== 'all' && group.group !== selectedCategory) {
      return { ...group, items: [] };
    }
    const matchingItems = group.items.filter(item => {
      if (!canView(item.id)) return false;
      if (!hubSearch.trim()) return true;
      const term = hubSearch.toLowerCase().trim();
      const title = (t('menu_' + item.id) || item.title).toLowerCase();
      const path = item.path.toLowerCase();
      return title.includes(term) || path.includes(term);
    });
    return { ...group, items: matchingItems };
  }).filter(group => group.items.length > 0);

  let animationDelayCounter = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* 🏜️ أنماط Desert Glassmorphism المتقدمة للـ Layout الفاخر */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --desert-brown: #2C1A12;
          --desert-gold: #C29B62;
          --desert-clay: #A8573C;
          --desert-pearl: #FDFBF7;
          --desert-oasis: #4E734F;
        }

        /* =================== الشريط العلوي الفاخر (Top Glass Bar) =================== */
        .desert-top-bar {
          position: sticky;
          top: 0;
          z-index: 1000;
          height: 66px;
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.88) 0%, rgba(255, 253, 250, 0.68) 100%);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border-bottom: 1px solid rgba(194, 155, 98, 0.28);
          box-shadow: 0 4px 20px rgba(44, 26, 18, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          gap: 15px;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          user-select: none;
        }
        .brand-logo-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95), rgba(194, 155, 98, 0.2));
          border: 1px solid rgba(194, 155, 98, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3px;
          box-shadow: 0 4px 10px rgba(44, 26, 18, 0.08);
          transition: transform 0.2s ease;
        }
        .brand-logo-wrap:hover {
          transform: scale(1.05);
        }
        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .brand-text-block {
          display: flex;
          flex-direction: column;
        }
        .brand-title {
          font-size: 15px;
          font-weight: 900;
          color: #2C1A12;
          line-height: 1.2;
          letter-spacing: -0.2px;
        }
        .brand-subtitle {
          font-size: 10.5px;
          font-weight: 700;
          color: #C29B62;
          letter-spacing: 0.3px;
        }

        .current-page-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(194, 155, 98, 0.12);
          border: 1px solid rgba(194, 155, 98, 0.3);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          color: #2C1A12;
        }

        /* زر البحث الذكي / اختصار مركز القيادة */
        .top-search-trigger {
          flex: 1;
          max-width: 420px;
          height: 42px;
          background: rgba(255, 253, 250, 0.75);
          border: 1px solid rgba(194, 155, 98, 0.35);
          border-radius: 24px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(44, 26, 18, 0.6);
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.25s ease;
          box-shadow: inset 0 1px 3px rgba(44, 26, 18, 0.03);
        }
        .top-search-trigger:hover {
          background: #FFFFFF;
          border-color: #C29B62;
          box-shadow: 0 4px 14px rgba(194, 155, 98, 0.2);
          color: #2C1A12;
        }
        .search-shortcut-tag {
          font-size: 11px;
          font-family: monospace;
          background: rgba(44, 26, 18, 0.08);
          color: #2C1A12;
          padding: 2px 7px;
          border-radius: 6px;
          border: 1px solid rgba(44, 26, 18, 0.12);
        }

        .top-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .top-icon-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.9), rgba(255, 253, 250, 0.6));
          border: 1px solid rgba(194, 155, 98, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2C1A12;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(44, 26, 18, 0.04);
        }
        .top-icon-btn:hover {
          background: #FFFFFF;
          border-color: #C29B62;
          color: #A8573C;
          transform: translateY(-2px);
          box-shadow: 0 5px 12px rgba(168, 87, 60, 0.15);
        }
        .top-icon-btn.active {
          background: #C29B62;
          color: #FFFFFF;
          border-color: #C29B62;
          box-shadow: 0 4px 12px rgba(194, 155, 98, 0.35);
        }

        .top-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #A8573C;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 900;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 2px 6px rgba(168, 87, 60, 0.4);
          border: 1.5px solid #FFFFFF;
        }

        .online-status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(78, 115, 79, 0.12);
          border: 1px solid rgba(78, 115, 79, 0.35);
          color: #4E734F;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
        }
        .online-dot-pulse {
          width: 8px;
          height: 8px;
          background: #4E734F;
          border-radius: 50%;
          box-shadow: 0 0 10px #4E734F;
          animation: pulseGreen 2s infinite ease-in-out;
        }
        @keyframes pulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.25); }
        }

        .btn-hub-launcher {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%);
          color: #FFFFFF;
          border: none;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(168, 87, 60, 0.25);
          transition: all 0.25s ease;
        }
        .btn-hub-launcher:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(168, 87, 60, 0.35);
        }

        .btn-logout-header {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(220, 38, 38, 0.08);
          color: #dc2626;
          border: 1px solid rgba(220, 38, 38, 0.2);
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-logout-header:hover {
          background: #fee2e2;
        }

        /* =================== الزر العائم القابل للسحب (Draggable FAB) =================== */
        .fab-main {
          position: fixed;
          bottom: 30px; left: 30px; right: auto;
          width: 66px; height: 66px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.94) 0%, rgba(255, 253, 250, 0.7) 100%);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1.5px solid rgba(194, 155, 98, 0.5);
          box-shadow: 0 10px 30px rgba(44, 26, 18, 0.15), inset 0 0 12px rgba(255, 253, 250, 0.8);
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
          box-shadow: 0 15px 35px rgba(168, 87, 60, 0.35) !important;
          opacity: 0.95 !important;
        }
        .fab-main:hover { 
          transform: scale(1.08) rotate(6deg); 
          background: rgba(255, 253, 250, 0.98); 
          border-color: #C29B62; 
          box-shadow: 0 12px 35px rgba(194, 155, 98, 0.35);
        }
        .fab-main:active { transform: scale(0.95); }
        .fab-logo { 
          width: 100%; height: 100%; 
          object-fit: contain; 
          pointer-events: none; 
          filter: drop-shadow(0 2px 4px rgba(44,26,18,0.25));
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
          background: rgba(44, 26, 18, 0.55);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          opacity: ${isOpen ? 1 : 0};
          pointer-events: ${isOpen ? 'auto' : 'none'};
          transition: opacity 0.4s ease;
        }

        .command-center {
          width: 95vw; max-width: 1280px;
          display: flex; flex-direction: column; gap: 22px;
          margin-top: ${isOpen ? '0' : '40px'};
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(20px)'};
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        /* شريط رأس مركز القيادة مع محرك البحث */
        .hub-search-box {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(255, 253, 250, 0.85) 100%);
          border: 1px solid rgba(194, 155, 98, 0.45);
          border-radius: 24px;
          padding: 16px 24px;
          box-shadow: 0 15px 40px rgba(44, 26, 18, 0.12), inset 0 0 20px rgba(255, 255, 255, 0.7);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .hub-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
          border: 1.5px solid rgba(194, 155, 98, 0.35);
          border-radius: 16px;
          padding: 8px 18px;
          transition: all 0.2s ease;
        }
        .hub-search-input-wrap:focus-within {
          border-color: #C29B62;
          box-shadow: 0 0 0 4px rgba(194, 155, 98, 0.15);
        }
        .hub-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          font-weight: 700;
          color: #2C1A12;
          background: transparent;
        }
        .hub-search-input::placeholder {
          color: rgba(44, 26, 18, 0.45);
        }

        .hub-category-chips {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .hub-category-chips::-webkit-scrollbar { display: none; }
        .category-chip {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid rgba(194, 155, 98, 0.25);
          background: rgba(255, 253, 250, 0.8);
          color: rgba(44, 26, 18, 0.75);
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .category-chip:hover {
          background: #FFFFFF;
          color: #2C1A12;
          border-color: #C29B62;
        }
        .category-chip.active {
          background: #C29B62;
          color: #FFFFFF;
          border-color: #C29B62;
          box-shadow: 0 4px 12px rgba(194, 155, 98, 0.3);
        }

        .group-section {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.88) 0%, rgba(255, 253, 250, 0.6) 100%);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(194, 155, 98, 0.32);
          border-radius: 24px; padding: 22px;
          box-shadow: 0 12px 30px rgba(44, 26, 18, 0.05), inset 0 0 15px rgba(255, 253, 250, 0.6);
          display: flex; flex-direction: column; gap: 15px;
        }

        .group-header {
          font-size: 14px; font-weight: 900; color: #2C1A12;
          border-bottom: 2px solid rgba(194, 155, 98, 0.3);
          padding-bottom: 8px; margin-bottom: 8px;
          display: flex; align-items: center; justify-content: space-between;
          text-transform: uppercase; letter-spacing: 0.5px;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }

        .nav-card {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%);
          border: 1px solid rgba(194, 155, 98, 0.3);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border-radius: 18px; padding: 14px 18px;
          display: flex; align-items: center; justify-content: space-between;
          text-decoration: none; color: #2C1A12;
          transition: all 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 10px rgba(44, 26, 18, 0.04);
          position: relative; overflow: hidden;
          opacity: ${isOpen ? 1 : 0};
          transform: ${isOpen ? 'translateY(0)' : 'translateY(20px)'};
          animation: ${isOpen ? 'slideUpFade 0.45s forwards' : 'none'};
        }

        .nav-card:hover {
          background: #FFFFFF;
          transform: translateY(-4px) !important;
          box-shadow: 0 10px 22px rgba(168, 87, 60, 0.16) !important;
          border-color: #C29B62;
        }

        .nav-card.active {
          background: linear-gradient(135deg, #FFFFFF, rgba(253, 251, 247, 0.95));
          border: 2px solid #C29B62;
          box-shadow: 0 8px 24px rgba(194, 155, 98, 0.25);
        }

        .nav-card-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .icon-wrapper {
          width: 46px; height: 46px;
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95), rgba(194, 155, 98, 0.2));
          border-radius: 14px; display: flex; align-items: center; justify-content: center;
          font-size: 22px; box-shadow: 0 4px 10px rgba(44, 26, 18, 0.05);
          border: 1px solid rgba(194, 155, 98, 0.35);
          flex-shrink: 0;
        }

        .nav-title-block {
          display: flex;
          flex-direction: column;
        }
        .nav-title {
          font-weight: 800;
          font-size: 14.5px;
          color: #2C1A12;
          line-height: 1.3;
        }
        .nav-card-active-dot {
          width: 8px;
          height: 8px;
          background: #4E734F;
          border-radius: 50%;
          box-shadow: 0 0 10px #4E734F;
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* =================== شريط التنقل السفلي الذكي للجوال (Bottom Dock) =================== */
        .desert-bottom-dock {
          display: none;
        }

        @media (max-width: 768px) {
          .desert-top-bar {
            padding: 0 12px;
            height: 60px;
          }
          .brand-subtitle, .current-page-badge, .search-shortcut-tag, .online-status-chip {
            display: none !important;
          }
          .top-search-trigger {
            max-width: none;
            height: 38px;
            padding: 0 12px;
            font-size: 12px;
          }
          .fab-main {
            display: none !important; /* نستبدل الزر العائم بالشريط السفلي الذكي على الجوال لتجربة فائقة السلاسة */
          }
          .command-center { margin-top: 10px; gap: 14px; }
          .group-section { padding: 16px; border-radius: 20px; }
          .items-grid { grid-template-columns: 1fr; gap: 10px; }
          .nav-card { padding: 12px 15px; }

          .main-content {
            margin-right: 0 !important;
            margin-left: 0 !important;
            padding-bottom: 85px !important; /* مساحة للشريط السفلي للجوال */
          }

          /* الشريط السفلي للجوال */
          .desert-bottom-dock {
            display: flex;
            position: fixed;
            bottom: 10px;
            left: 12px;
            right: 12px;
            height: 62px;
            background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(255, 253, 250, 0.8) 100%);
            backdrop-filter: blur(24px) saturate(160%);
            -webkit-backdrop-filter: blur(24px) saturate(160%);
            border: 1px solid rgba(194, 155, 98, 0.4);
            border-radius: 22px;
            box-shadow: 0 10px 25px rgba(44, 26, 18, 0.15);
            z-index: 999;
            align-items: center;
            justify-content: space-around;
            padding: 0 5px;
            box-sizing: border-box;
          }
          .dock-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            text-decoration: none;
            color: rgba(44, 26, 18, 0.65);
            font-size: 10.5px;
            font-weight: 800;
            padding: 6px 10px;
            border-radius: 14px;
            transition: all 0.2s ease;
            position: relative;
            flex: 1;
          }
          .dock-item.active {
            color: #A8573C;
            background: rgba(194, 155, 98, 0.15);
          }
          .dock-item.active::after {
            content: '';
            position: absolute;
            bottom: 4px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #A8573C;
          }
          .dock-item svg {
            width: 20px;
            height: 20px;
          }
        }
      `}} />

      {/* 1️⃣ الشريط العلوي الزجاجي الفاخر (Top Navigation Bar) */}
      <header className="desert-top-bar no-print">
        {/* الشعار واسم الصيدلية وزر الصفحة الحالية */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/Dashboard" className="brand-section">
            <div className="brand-logo-wrap">
              <img src="/taj_logo.png" alt="شعار صيدلية تاج المودة" className="brand-logo-img" />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">تاج المودة</span>
              <span className="brand-subtitle">صيدلية بيطرية</span>
            </div>
          </Link>

          {/* اسم الشاشة الحالية */}
          <div className="current-page-badge">
            <span style={{ fontSize: '15px' }}>{currentMenuItem?.icon || '🩺'}</span>
            <span>{currentPageTitle}</span>
          </div>
        </div>

        {/* خانة البحث السريع واختصار مركز القيادة */}
        <div className="top-search-trigger" onClick={() => setIsOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} color="#C29B62" />
            <span>البحث والتنقل السريع بين الشاشات...</span>
          </div>
          <span className="search-shortcut-tag">Ctrl + K</span>
        </div>

        {/* الأزرار العلوية وحالة الاتصال */}
        <div className="top-actions-group">
          {/* حالة المتواجدين الآن */}
          <div className="online-status-chip">
            <span className="online-dot-pulse"></span>
            <span>{language === 'en' ? `${onlineCount} Online` : `${onlineCount} متصل`}</span>
          </div>

          {/* زر الفلترة الجانبي */}
          <button 
            className={`top-icon-btn ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(prev => !prev)}
            title="شريط الفلترة والأوامر المتقدمة"
          >
            <Filter size={18} />
          </button>

          {/* زر الإشعارات */}
          <Link href="/notifications" className="top-icon-btn" title="مركز الإشعارات">
            <Bell size={18} />
            {totalUnread > 0 && <span className="top-badge">{totalUnread}</span>}
          </Link>

          {/* زر مركز القيادة الكامل */}
          <button className="btn-hub-launcher" onClick={() => setIsOpen(true)}>
            <Compass size={18} />
            <span>المركز الشامل</span>
          </button>

          {/* زر تسجيل الخروج السريع */}
          <button className="btn-logout-header" onClick={handleLogout} title="تسجيل الخروج">
            <LogOut size={15} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* 2️⃣ السايد بار المتقدم للفلترة والعمليات */}
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

      {/* 3️⃣ الزر العائم الذكي القابل للسحب (Draggable FAB) */}
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
        title="القائمة العائمة (يمكنك سحبها وتحريكها في أي مكان)"
      >
        <img src="/taj_logo.png" alt="شعار صيدلية تاج المودة" className="fab-logo" draggable="false" />
      </div>

      {/* 4️⃣ مركز القيادة الشامل (Command Hub Modal) */}
      <div className="overlay-backdrop no-print"></div>
      <nav 
        className="overlay-screen no-print" 
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false); 
        }}
      >
        <div className="command-center" onClick={(e) => e.stopPropagation()}>
          
          {/* محرك البحث والتصنيفات في رأس مركز القيادة */}
          <div className="hub-search-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(194, 155, 98, 0.25)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #C29B62, #A8573C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#2C1A12' }}>مركز قيادة صيدلية تاج المودة</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 700 }}>
                    {language === 'en' ? `Role: ${role === 'super_admin' ? 'Super Admin' : 'Staff'}` : `المستخدم: ${role === 'super_admin' ? 'مدير النظام المعتمد' : 'موظف مصرح'}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(44,26,18,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2C1A12' }}
                  title="إغلاق (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* حقل البحث الفوري */}
            <div className="hub-search-input-wrap">
              <Search size={20} color="#C29B62" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="ابحث عن أي شاشة أو وظيفة (مثال: فواتير، كاشير، أستاذ، مستودع، قيود)..." 
                value={hubSearch}
                onChange={(e) => setHubSearch(e.target.value)}
                className="hub-search-input"
              />
              {hubSearch && (
                <button 
                  onClick={() => setHubSearch('')} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* تصنيفات سريعة */}
            <div className="hub-category-chips">
              <button 
                className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                🌟 كل الشاشات
              </button>
              {menuGroups.map((g, idx) => (
                <button 
                  key={idx}
                  className={`category-chip ${selectedCategory === g.group ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(g.group)}
                >
                  {groupKeyMap[g.group] ? t(groupKeyMap[g.group]) : g.group}
                </button>
              ))}
            </div>
          </div>

          {/* شبكة البطاقات المقسمة حسب الأقسام */}
          {filteredMenuGroups.length === 0 ? (
            <div className="group-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'rgba(44, 26, 18, 0.7)' }}>
                لا توجد شاشات مطابقة للبحث "{hubSearch}"
              </p>
              <button 
                onClick={() => { setHubSearch(''); setSelectedCategory('all'); }}
                style={{ marginTop: '10px', background: '#C29B62', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                إظهار جميع الشاشات
              </button>
            </div>
          ) : (
            filteredMenuGroups.map((group, gIdx) => {
              const groupTitle = groupKeyMap[group.group] ? t(groupKeyMap[group.group]) : group.group;

              return (
                <div key={gIdx} className="group-section">
                  <div className="group-header">
                    <span>{groupTitle}</span>
                    <span style={{ fontSize: '11px', color: '#C29B62', background: 'rgba(194, 155, 98, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                      {group.items.length} {language === 'en' ? 'Screens' : 'شاشات'}
                    </span>
                  </div>
                  <div className="items-grid">
                    {group.items.map((item, iIdx) => {
                      const delay = (animationDelayCounter++) * 0.03;
                      const isActive = pathname === item.path;
                      const itemTitle = t('menu_' + item.id) || item.title;
                      return (
                        <Link key={iIdx} href={item.path} onClick={() => setIsOpen(false)}>
                          <div className={`nav-card ${isActive ? 'active' : ''}`} style={{ animationDelay: isOpen ? `${delay}s` : '0s' }}>
                            <div className="nav-card-left">
                              <div className="icon-wrapper">{item.icon}</div>
                              <div className="nav-title-block">
                                <span className="nav-title">{itemTitle}</span>
                                <span style={{ fontSize: '11px', color: 'rgba(44, 26, 18, 0.5)', fontWeight: 600 }}>{item.path}</span>
                              </div>
                            </div>
                            {isActive ? (
                              <div className="nav-card-active-dot" title="الشاشة المفتوحة حالياً"></div>
                            ) : (
                              <ArrowUpRight size={16} color="rgba(44, 26, 18, 0.35)" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* المتصلين حالياً بالنظام */}
          {onlineUsers.length > 0 && (
            <div className="group-section" style={{ marginTop: '10px' }}>
              <div className="group-header" style={{ borderColor: 'rgba(78, 115, 79, 0.3)', color: '#4E734F' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="online-dot-pulse"></span>
                  <span>{language === 'en' ? `Team Online (${onlineCount})` : `فريق العمل المتصل الآن (${onlineCount})`}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                {onlineUsers.map((user, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.85)', padding: '8px 14px', borderRadius: '14px', border: '1px solid rgba(78, 115, 79, 0.25)', boxShadow: '0 2px 8px rgba(44,26,18,0.03)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4E734F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px' }}>
                      {user.full_name?.charAt(0) || 'م'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#2C1A12' }}>{user.full_name}</span>
                      <span style={{ fontSize: '10.5px', color: '#C29B62', fontWeight: 700 }}>
                        {language === 'en' ? (user.role === 'super_admin' ? 'Admin' : 'Staff') : (user.role === 'super_admin' ? 'مدير' : 'موظف')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </nav>

      {/* 5️⃣ شريط التنقل السفلي الذكي للجوال (Mobile Bottom Dock) */}
      <div className="desert-bottom-dock no-print">
        <Link href="/Dashboard" className={`dock-item ${pathname === '/Dashboard' ? 'active' : ''}`}>
          <Home />
          <span>الرئيسية</span>
        </Link>
        <Link href="/pos" className={`dock-item ${pathname === '/pos' ? 'active' : ''}`}>
          <ShoppingBag />
          <span>الكاشير</span>
        </Link>
        <Link href="/invoices" className={`dock-item ${pathname === '/invoices' ? 'active' : ''}`}>
          <FileText />
          <span>الفواتير</span>
        </Link>
        <Link href="/inventory" className={`dock-item ${pathname === '/inventory' ? 'active' : ''}`}>
          <Package />
          <span>الأصناف</span>
        </Link>
        <button 
          onClick={() => setIsOpen(prev => !prev)} 
          className={`dock-item ${isOpen ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Menu />
          <span>القائمة</span>
        </button>
      </div>

      {/* 6️⃣ المحتوى الرئيسي للصفحة */}
      <main className="main-content" style={{ 
          flex: 1, 
          boxSizing: 'border-box',
          marginRight: isRtl ? currentMargin : '0px', 
          marginLeft: !isRtl ? currentMargin : '0px',
          paddingRight: '15px', 
          paddingLeft: '15px',
          paddingTop: '15px',
          minHeight: 'calc(100vh - 66px)', 
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
