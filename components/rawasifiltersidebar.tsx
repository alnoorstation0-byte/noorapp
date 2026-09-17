"use client";
import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/lib/SidebarContext';
import { useLanguage } from '@/lib/LanguageContext';

interface RawasiSidebarProps {
  onSearch?: (term: string) => void;
  onDateChange?: (start: string, end: string) => void;
  title?: string;
  extraFilters?: React.ReactNode;
  extraActions?: React.ReactNode;
  summarySlot?: React.ReactNode;
  accentColor?: string;
  textColor?: string;
  logoPath?: string;
  isOpenStatus?: boolean; 
  setIsOpenStatus?: (val: boolean) => void; 
  customFilters?: React.ReactNode;
}

export default function RawasiFilterSidebar({ 
  onSearch, 
  onDateChange, 
  title = "لوحة التحكم", 
  extraFilters,
  extraActions,
  summarySlot,
  accentColor = '#00E5FF',
  textColor = '#F8FAFC',
  logoPath = '/logo.png',
  isOpenStatus,
  setIsOpenStatus
}: RawasiSidebarProps) {
  const { language, isRtl } = useLanguage();
  
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '' });
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isOpen = isMobile ? isPinned : (isPinned || isHovered);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { summary: ctxSummary, actions: ctxActions, customFilters: ctxFilters } = useSidebar();
  const effectiveSummary = summarySlot || ctxSummary;
  const effectiveActions = extraActions || ctxActions;
  const effectiveFilters = extraFilters || ctxFilters;

  // 🚀 شاحناتاغ الـ Layout بحالة السايد بار عشان يزق المحتوى على الديسكتوب
  useEffect(() => {
    if (setIsOpenStatus) {
      setIsOpenStatus(isOpen);
    }
  }, [isOpen, setIsOpenStatus]);

  const handleSearch = (val: string) => {
    if (onSearch) onSearch(val);
    window.dispatchEvent(new CustomEvent('globalSearch', { detail: val }));
  };

  const handleDateChange = (start: string, end: string) => {
    if (onDateChange) onDateChange(start, end);
    window.dispatchEvent(new CustomEvent('globalDateFilter', { detail: { start, end } }));
  };

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'year') => {
    setActivePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start = '';
    const end = toDateStr(now);

    if (preset === 'today') {
      start = end;
    } else if (preset === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      start = toDateStr(weekAgo);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = toDateStr(firstDay);
    } else if (preset === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      start = toDateStr(firstDay);
    }

    setDates({ start, end });
    handleDateChange(start, end);
  };

  const handleClearDates = () => {
    setActivePreset(null);
    setDates({ start: '', end: '' });
    handleDateChange('', '');
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    handleSearch('');
  };

  if (!mounted) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .filter-sidebar-v3, .filter-sidebar-v3 * {
          box-sizing: border-box;
        }

        .filter-sidebar-v3 {
          position: fixed;
          top: 20px;
          right: ${isOpen ? '20px' : '-360px'};
          bottom: 20px;
          width: 320px;
          background: linear-gradient(135deg, rgba(20, 24, 34, 0.96) 0%, rgba(15, 20, 30, 0.94) 100%);
          backdrop-filter: blur(35px) saturate(200%);
          -webkit-backdrop-filter: blur(35px);
          border-radius: 24px;
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 229, 255, 0.1);
          z-index: 1000;
          transition: right 0.38s cubic-bezier(0.165, 0.84, 0.44, 1);
          border: 1.5px solid rgba(0, 229, 255, 0.25);
          overflow: hidden;
          color: ${textColor};
          display: flex;
          flex-direction: column;
          direction: ${isRtl ? 'rtl' : 'ltr'} !important;
          text-align: ${isRtl ? 'right' : 'left'} !important;
        }

        .mobile-sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(11, 14, 20, 0.7);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9998;
          animation: fadeInBackdrop 0.2s ease;
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .mobile-sheet-handle-container {
          width: 100%;
          padding: 8px 0 4px 0;
          display: flex;
          justify-content: center;
          cursor: pointer;
        }
        .mobile-sheet-drag-handle {
          width: 44px;
          height: 5px;
          border-radius: 99px;
          background: rgba(0, 229, 255, 0.35);
          transition: background 0.2s;
        }
        .mobile-sheet-handle-container:hover .mobile-sheet-drag-handle {
          background: ${accentColor};
        }

        /* 👑 Header Bar - Sleek, Uncluttered, No Overlapping */
        .sidebar-header-bar {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 12px 16px !important;
          border-bottom: 1.5px solid rgba(0, 229, 255, 0.2) !important;
          background: rgba(15, 20, 30, 0.85) !important;
          flex-shrink: 0 !important;
          gap: 10px !important;
          width: 100% !important;
        }
        .sidebar-header-info {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          min-width: 0 !important;
          flex: 1 !important;
        }
        .sidebar-header-logo {
          width: 36px !important;
          height: 36px !important;
          border-radius: 10px !important;
          object-fit: contain !important;
          border: 1px solid rgba(0, 229, 255, 0.3) !important;
          padding: 2px !important;
          background: rgba(0, 229, 255, 0.08) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          flex-shrink: 0 !important;
        }
        .sidebar-header-titles {
          display: flex !important;
          flex-direction: column !important;
          min-width: 0 !important;
          flex: 1 !important;
          max-width: calc(100% - 75px) !important;
          overflow: hidden !important;
        }
        .sidebar-main-title {
          font-size: 13.5px !important;
          font-weight: 800 !important;
          color: #F8FAFC !important;
          margin: 0 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          line-height: 1.25 !important;
          max-width: 100% !important;
        }
        .sidebar-sub-badge {
          font-size: 10px !important;
          font-weight: 700 !important;
          color: #00E5FF !important;
          margin-top: 1px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 100% !important;
        }
        
        .sidebar-header-actions {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          flex-shrink: 0 !important;
        }
        .sidebar-header-action-btn {
          width: 32px !important;
          min-width: 32px !important;
          max-width: 32px !important;
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          border-radius: 10px !important;
          border: 1px solid rgba(0, 229, 255, 0.25) !important;
          background: rgba(255, 255, 255, 0.06) !important;
          color: #00E5FF !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 13px !important;
          font-weight: 900 !important;
          padding: 0 !important;
          margin: 0 !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
        }
        .sidebar-header-action-btn:hover {
          background: rgba(0, 229, 255, 0.15) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 10px rgba(0, 229, 255, 0.3) !important;
          border-color: #00E5FF !important;
        }
        .sidebar-header-action-btn.pin.is-pinned {
          background: rgba(0, 229, 255, 0.25) !important;
          border-color: #00E5FF !important;
          color: #00E5FF !important;
        }
        .sidebar-header-action-btn.close {
          color: #f87171 !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
          background: rgba(239, 68, 68, 0.15) !important;
        }
        .sidebar-header-action-btn.close:hover {
          background: rgba(239, 68, 68, 0.3) !important;
          color: #fca5a5 !important;
          border-color: #f87171 !important;
        }

        /* 📜 Scrollable Content */
        .filter-content {
          width: 100%;
          padding: 16px 16px 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          direction: ${isRtl ? 'rtl' : 'ltr'} !important;
          text-align: ${isRtl ? 'right' : 'left'} !important;
        }
        .filter-content::-webkit-scrollbar { width: 5px; }
        .filter-content::-webkit-scrollbar-track { background: transparent; }
        .filter-content::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.35); border-radius: 10px; }
        .filter-content::-webkit-scrollbar-thumb:hover { background: ${accentColor}; }

        /* 📦 Sections */
        .sidebar-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
          width: 100%;
        }
        .sidebar-section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 900;
          color: #00E5FF;
          border-bottom: 1px solid rgba(0, 229, 255, 0.2);
          padding-bottom: 5px;
          margin-bottom: 2px;
        }
        .sidebar-section-icon { font-size: 14px; }
        .sidebar-section-title { font-size: 12px; font-weight: 900; }

        /* 📊 Summary Glass Cards & Values */
        .sidebar-summary-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sidebar-empty-summary-card {
          background: rgba(20, 24, 34, 0.8);
          border: 1.5px solid rgba(0, 229, 255, 0.2);
          border-radius: 14px;
          padding: 12px 14px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        /* Enforce theme rules on all summary cards */
        .summary-glass-card {
          background: linear-gradient(135deg, rgba(20, 24, 34, 0.92) 0%, rgba(15, 20, 30, 0.8) 100%) !important;
          border: 1.5px solid rgba(0, 229, 255, 0.2) !important;
          border-radius: 16px !important;
          padding: 12px 16px !important;
          margin-bottom: 8px !important;
          width: 100% !important;
          box-sizing: border-box !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
          text-align: ${isRtl ? 'right' : 'left'} !important;
          direction: ${isRtl ? 'rtl' : 'ltr'} !important;
        }
        .summary-glass-card .val, 
        .summary-glass-card [class*="val"] {
          font-size: 22px !important;
          font-weight: 900 !important;
          color: #00E5FF !important;
          margin-top: 4px !important;
          letter-spacing: -0.3px !important;
          display: block !important;
          text-align: right !important;
        }
        .summary-glass-card span, 
        .summary-glass-card label {
          font-size: 11.5px !important;
          font-weight: 800 !important;
          color: #94A3B8 !important;
          display: block !important;
        }

        /* ⚡ Action Buttons (Strictly Scoped so it doesn't affect header buttons) */
        .sidebar-actions-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .sidebar-actions-grid button,
        .sidebar-actions-grid .btn-main-glass {
          width: 100% !important;
          border-radius: 12px !important;
          padding: 11px 14px !important;
          font-size: 12.5px !important;
          font-weight: 800 !important;
          min-height: 42px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          cursor: pointer !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          background: linear-gradient(135deg, #00E5FF 0%, #0284C7 100%) !important;
          color: #0B0E14 !important;
          border: 1px solid rgba(0, 229, 255, 0.3) !important;
          box-shadow: 0 4px 14px rgba(0, 229, 255, 0.25) !important;
        }
        .sidebar-actions-grid button:hover,
        .sidebar-actions-grid .btn-main-glass:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 18px rgba(0, 229, 255, 0.4) !important;
          filter: brightness(1.1) !important;
        }

        /* 🔍 Search Box */
        .sidebar-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .sidebar-search-input {
          width: 100% !important;
          height: 40px !important;
          min-height: 40px !important;
          background: rgba(11, 14, 20, 0.8) !important;
          border: 1.5px solid rgba(0, 229, 255, 0.3) !important;
          border-radius: 12px !important;
          padding: 0 12px 0 34px !important;
          color: #F8FAFC !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          direction: rtl !important;
          text-align: right !important;
          outline: none !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
        }
        .sidebar-search-input:focus {
          border-color: #00E5FF !important;
          box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.2) !important;
          background: rgba(15, 20, 30, 0.95) !important;
        }
        .search-icon-box {
          position: absolute;
          left: 10px;
          pointer-events: none;
          font-size: 13px;
          color: #94a3b8;
        }
        .search-clear-btn {
          position: absolute;
          right: 8px;
          background: rgba(239, 68, 68, 0.15) !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
          color: #f87171 !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
          width: 22px !important;
          height: 22px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s !important;
        }
        .search-clear-btn:hover {
          background: rgba(239, 68, 68, 0.3) !important;
          color: #fca5a5 !important;
        }

        /* 📅 Date Filter - Stacked & Comfortable Layout */
        .sidebar-date-presets {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .date-preset-pill {
          background: rgba(255, 255, 255, 0.06) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 8px !important;
          padding: 3px 9px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          color: #94A3B8 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 26px !important;
          min-height: 26px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        }
        .date-preset-pill:hover {
          background: rgba(0, 229, 255, 0.15) !important;
          color: #00E5FF !important;
          border-color: #00E5FF !important;
          transform: translateY(-1px) !important;
        }
        .date-preset-pill.active {
          background: linear-gradient(135deg, #00E5FF 0%, #0284C7 100%) !important;
          color: #0B0E14 !important;
          font-weight: 900 !important;
          border-color: #00E5FF !important;
          box-shadow: 0 2px 8px rgba(0, 229, 255, 0.35) !important;
        }
        .date-clear-pill {
          margin-inline-start: auto;
          background: rgba(239, 68, 68, 0.15) !important;
          color: #f87171 !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
          border-radius: 6px !important;
          padding: 2px 7px !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        .date-clear-pill:hover {
          background: rgba(239, 68, 68, 0.3) !important;
          color: #fca5a5 !important;
        }

        .sidebar-date-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .sidebar-date-row {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .sidebar-date-tag {
          width: 36px;
          min-width: 36px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11.5px;
          font-weight: 800;
          color: #00E5FF;
          background: rgba(0, 229, 255, 0.1);
          border: 1px solid rgba(0, 229, 255, 0.25);
          border-radius: 10px;
          flex-shrink: 0;
        }
        .sidebar-date-input {
          flex: 1;
          min-width: 0;
          height: 38px !important;
          min-height: 38px !important;
          background: rgba(11, 14, 20, 0.8) !important;
          border: 1.5px solid rgba(0, 229, 255, 0.25) !important;
          border-radius: 10px !important;
          padding: 0 10px !important;
          color: #F8FAFC !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          direction: rtl !important;
          outline: none !important;
          transition: all 0.2s !important;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
        }
        .sidebar-date-input:focus {
          border-color: #00E5FF !important;
          background: rgba(15, 20, 30, 0.95) !important;
          box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.2) !important;
        }

        .sidebar-custom-filters-wrap {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed rgba(0, 229, 255, 0.25);
          width: 100%;
        }
        .sidebar-section-subhead {
          font-size: 11px;
          font-weight: 800;
          color: #94a3b8;
          margin-bottom: 6px;
        }

        .sidebar-footer-brand {
          text-align: center;
          color: #64748b;
          font-size: 10.5px;
          font-weight: 700;
          margin-top: auto;
          padding: 10px 0 6px 0;
        }

        /* 🔘 Toggle Tab on Desktop */
        @media (min-width: 769px) {
          .tab-text-mobile { display: none; }
          .filter-toggle-tab-v3 {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            height: 100vh;
            width: 24px;
            background: rgba(20, 24, 34, 0.85);
            backdrop-filter: blur(10px);
            color: #00E5FF;
            padding: 0 4px;
            cursor: pointer;
            z-index: 998;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.4);
            border-left: 1px solid rgba(0, 229, 255, 0.3);
            transition: all 0.3s ease;
            opacity: ${isOpen ? 0 : 1};
            pointer-events: ${isOpen ? 'none' : 'auto'};
          }
          .filter-toggle-tab-v3:hover {
            background: rgba(25, 30, 44, 0.98);
            width: 32px;
          }
        }

        /* 📱 Mobile Responsive (Bottom Sheet ≤ 768px) */
        @media (max-width: 768px) {
          .filter-sidebar-v3 {
            top: auto !important;
            bottom: ${isOpen ? '0px' : '-105vh'} !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 82vh !important;
            border-radius: 24px 24px 0 0 !important;
            border: 1.5px solid rgba(0, 229, 255, 0.3) !important;
            border-bottom: none !important;
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6) !important;
            z-index: 9999 !important;
            transition: bottom 0.38s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
          }

          .filter-content {
            width: 100% !important;
            max-width: 100% !important;
            padding: 12px 16px 35px 16px !important;
            max-height: calc(82vh - 65px) !important;
          }

          .filter-toggle-tab-v3 {
            position: fixed !important;
            top: auto !important;
            bottom: 0 !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            width: 220px !important;
            height: 38px !important;
            border-radius: 18px 18px 0 0 !important;
            background: linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(15, 20, 30, 0.95) 100%) !important;
            border: 1.5px solid rgba(0, 229, 255, 0.3) !important;
            border-bottom: none !important;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            z-index: 998 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            cursor: pointer !important;
            color: #00E5FF !important;
            font-weight: 900 !important;
            font-size: 12.5px !important;
            padding: 0 16px !important;
            opacity: ${isOpen ? 0 : 1} !important;
            pointer-events: ${isOpen ? 'none' : 'auto'} !important;
            transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
          }
          .tab-text-mobile {
            display: inline-block !important;
          }
        }

        /* ☀️ وضع الرؤية النهارية للوحة التحكم الجانبية (Daylight Sidebar) */
        .daylight-theme .filter-sidebar-v3 {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.94) 100%) !important;
          border-color: rgba(2, 132, 199, 0.25) !important;
          box-shadow: 0 15px 45px rgba(15, 23, 42, 0.12), 0 0 20px rgba(2, 132, 199, 0.08) !important;
          color: #0F172A !important;
        }
        .daylight-theme .sidebar-header-bar {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(241, 245, 249, 0.92) 100%) !important;
          border-bottom-color: rgba(2, 132, 199, 0.2) !important;
        }
        .daylight-theme .sidebar-main-title {
          color: #0F172A !important;
        }
        .daylight-theme .sidebar-sub-badge {
          background: rgba(2, 132, 199, 0.1) !important;
          color: #0284C7 !important;
          border-color: rgba(2, 132, 199, 0.25) !important;
        }
        .daylight-theme .sidebar-header-action-btn {
          background: rgba(241, 245, 249, 0.9) !important;
          border-color: rgba(203, 213, 225, 0.8) !important;
          color: #0F172A !important;
        }
        .daylight-theme .sidebar-header-action-btn:hover {
          background: #FFFFFF !important;
          border-color: #0284C7 !important;
        }
        .daylight-theme .sidebar-search-box {
          background: #FFFFFF !important;
          border-color: rgba(203, 213, 225, 0.9) !important;
        }
        .daylight-theme .sidebar-search-box:focus-within {
          border-color: #0284C7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.18) !important;
        }
        .daylight-theme .sidebar-search-input {
          color: #0F172A !important;
        }
        .daylight-theme .sidebar-section-card {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04) !important;
        }
        .daylight-theme .sidebar-section-title-tag {
          color: #0284C7 !important;
        }
        .daylight-theme .sidebar-date-input {
          background: #FFFFFF !important;
          border-color: rgba(203, 213, 225, 0.9) !important;
          color: #0F172A !important;
        }
        .daylight-theme .sidebar-date-input:focus {
          border-color: #0284C7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.18) !important;
        }
        .daylight-theme .sidebar-date-tag {
          background: rgba(2, 132, 199, 0.1) !important;
          border-color: rgba(2, 132, 199, 0.25) !important;
          color: #0284C7 !important;
        }
        .daylight-theme .date-preset-pill {
          background: rgba(241, 245, 249, 0.9) !important;
          border-color: rgba(203, 213, 225, 0.8) !important;
          color: #475569 !important;
        }
        .daylight-theme .date-preset-pill.active {
          background: #0284C7 !important;
          color: #FFFFFF !important;
          border-color: #0284C7 !important;
        }
        .daylight-theme .filter-toggle-tab-v3 {
          background: rgba(255, 255, 255, 0.95) !important;
          border-color: rgba(2, 132, 199, 0.3) !important;
          color: #0284C7 !important;
          box-shadow: -2px 0 12px rgba(15, 23, 42, 0.1) !important;
        }
      `}} />

      {isMobile && isOpen && (
        <div 
          onClick={() => setIsPinned(false)} 
          className="no-print mobile-sidebar-backdrop"
        />
      )}
      
      <aside 
        className="filter-sidebar-v3 no-print"
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        {/* Handle bar for bottom sheet on mobile */}
        {isMobile && (
          <div className="mobile-sheet-handle-container" onClick={() => setIsPinned(false)}>
            <div className="mobile-sheet-drag-handle" />
          </div>
        )}

        {/* Header bar */}
        <div className="sidebar-header-bar">
          <div className="sidebar-header-info">
            <img src={logoPath} alt="Logo" className="sidebar-header-logo" />
            <div className="sidebar-header-titles">
              <h2 className="sidebar-main-title">{title}</h2>
              <span className="sidebar-sub-badge">{language === 'en' ? 'Dashboard & Summary' : 'لوحة التحكم والملخص'}</span>
            </div>
          </div>

          <div className="sidebar-header-actions">
            {!isMobile && (
              <button 
                type="button"
                className={`sidebar-header-action-btn pin ${isPinned ? 'is-pinned' : ''}`} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsPinned(!isPinned); 
                }}
                title={isPinned ? (language === 'en' ? 'Unpin' : 'إلغاء التثبيت') : (language === 'en' ? 'Pin Sidebar' : 'تثبيت اللوحة دائماً')}
              >
                <span>{isPinned ? '📌' : '📍'}</span>
              </button>
            )}

            <button 
              type="button"
              className="sidebar-header-action-btn close" 
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsPinned(false); 
                setIsHovered(false);
              }}
              title={language === 'en' ? 'Close Sidebar' : 'إغلاق السايد بار'}
            >
              <span>✕</span>
            </button>
          </div>
        </div>

        <div className="filter-content cinematic-scroll">
          {/* 📊 Summary Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-icon">📊</span>
              <span className="sidebar-section-title">{language === 'en' ? 'Page Summary & Data' : 'ملخص وبيانات الصفحة'}</span>
            </div>
            <div className="sidebar-summary-container">
              {effectiveSummary ? (
                effectiveSummary
              ) : (
                <div className="sidebar-empty-summary-card">
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC' }}>{title}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    {language === 'en' ? 'Use search and date filters below to manage records' : 'استخدم أدوات البحث وتصفية التاريخ أدناه للتنقل وإدارة السجلات'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ⚡ Operations / Actions */}
          {effectiveActions && (
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="sidebar-section-icon">⚡</span>
                <span className="sidebar-section-title">{language === 'en' ? 'Quick Operations' : 'عمليات الصفحة السريعة'}</span>
              </div>
              <div className="sidebar-actions-grid">
                {effectiveActions}
              </div>
            </div>
          )}

          {/* 🔍 Search Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-icon">🔍</span>
              <span className="sidebar-section-title">{language === 'en' ? 'Quick Search' : 'البحث السريع'}</span>
            </div>
            
            <div className="sidebar-search-box">
              <span className="search-icon-box">🔍</span>
              <input 
                type="text" 
                className="sidebar-search-input" 
                placeholder={language === 'en' ? 'Search here for any record...' : 'ابحث هنا عن أي بيان...'} 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleSearch(e.target.value);
                }} 
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  title={language === 'en' ? 'Clear' : 'مسح البحث'}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 📅 Date Filter Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-icon">📅</span>
              <span className="sidebar-section-title">{language === 'en' ? 'Date Range' : 'الفترة الزمنية'}</span>
              {(dates.start || dates.end) && (
                <button
                  type="button"
                  className="date-clear-pill"
                  onClick={handleClearDates}
                  title={language === 'en' ? 'Clear Date Filter' : 'مسح تصفية التاريخ'}
                >
                  {language === 'en' ? 'Clear ✕' : 'مسح ✕'}
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="sidebar-date-presets">
              <button
                type="button"
                className={`date-preset-pill ${activePreset === 'today' ? 'active' : ''}`}
                onClick={() => applyPreset('today')}
              >
                {language === 'en' ? 'Today' : 'اليوم'}
              </button>
              <button
                type="button"
                className={`date-preset-pill ${activePreset === 'week' ? 'active' : ''}`}
                onClick={() => applyPreset('week')}
              >
                {language === 'en' ? 'Week' : 'أسبوع'}
              </button>
              <button
                type="button"
                className={`date-preset-pill ${activePreset === 'month' ? 'active' : ''}`}
                onClick={() => applyPreset('month')}
              >
                {language === 'en' ? 'This Month' : 'هذا الشهر'}
              </button>
              <button
                type="button"
                className={`date-preset-pill ${activePreset === 'year' ? 'active' : ''}`}
                onClick={() => applyPreset('year')}
              >
                {language === 'en' ? 'This Year' : 'هذا العام'}
              </button>
            </div>

            {/* Stacked Clean Date Inputs (Full Width) */}
            <div className="sidebar-date-stack">
              <div className="sidebar-date-row">
                <span className="sidebar-date-tag">{language === 'en' ? 'From' : 'من'}</span>
                <input 
                  type="date" 
                  className="sidebar-date-input" 
                  value={dates.start}
                  onChange={(e) => {
                    setActivePreset(null);
                    const d = { ...dates, start: e.target.value };
                    setDates(d);
                    handleDateChange(d.start, d.end);
                  }} 
                />
              </div>

              <div className="sidebar-date-row">
                <span className="sidebar-date-tag">{language === 'en' ? 'To' : 'إلى'}</span>
                <input 
                  type="date" 
                  className="sidebar-date-input" 
                  value={dates.end}
                  onChange={(e) => {
                    setActivePreset(null);
                    const d = { ...dates, end: e.target.value };
                    setDates(d);
                    handleDateChange(d.start, d.end);
                  }} 
                />
              </div>
            </div>

            {effectiveFilters && (
              <div className="sidebar-custom-filters-wrap">
                <div className="sidebar-section-subhead">فلاتر إضافية:</div>
                {effectiveFilters}
              </div>
            )}
          </div>

          <div className="sidebar-footer-brand">
            نظام محطات النور للوقود الموحد v2.0
          </div>
        </div>
      </aside>

      {/* Toggle Knob / Bar for Mobile & Desktop */}
      <div 
        className="filter-toggle-tab-v3 no-print" 
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onClick={() => isMobile && setIsPinned(true)}
      >
        <span style={{ fontSize: '15px' }}>⚡</span>
        <span className="tab-text-mobile">لوحة التحكم والملخص</span>
        <span style={{ fontSize: '14px' }}>📊</span>
      </div>
    </>
  );
}
