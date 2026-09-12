"use client";
import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/lib/SidebarContext';

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
  accentColor = '#1C73AB',
  textColor = '#122946',
  logoPath = '/ghayam_logo.png',
  isOpenStatus,
  setIsOpenStatus
}: RawasiSidebarProps) {
  
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '' });
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

  // 🚀 إبلاغ الـ Layout بحالة السايد بار عشان يزق المحتوى على الديسكتوب
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

  if (!mounted) return null;

  return (
    <>
      <style>{`
        .filter-sidebar-v3, .filter-sidebar-v3 * {
          box-sizing: border-box;
        }

        .filter-sidebar-v3 {
          position: fixed;
          top: 20px;
          right: ${isOpen ? '20px' : '-340px'};
          bottom: 20px;
          width: 310px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px);
          border-radius: 24px;
          box-shadow: 0 15px 45px rgba(28, 115, 171, 0.12), -10px 15px 40px rgba(0,0,0,0.08);
          z-index: 1000;
          transition: right 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          overflow: hidden;
          color: ${textColor};
          display: flex;
          flex-direction: column;
          direction: rtl !important;
          text-align: right !important;
        }

        .mobile-sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(18, 41, 70, 0.45);
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
          background: rgba(28, 115, 171, 0.25);
          transition: background 0.2s;
        }
        .mobile-sheet-handle-container:hover .mobile-sheet-drag-handle {
          background: #1C73AB;
        }

        /* 👑 Header Bar */
        .sidebar-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1.5px solid rgba(28, 115, 171, 0.12);
          background: rgba(255, 255, 255, 0.6);
          flex-shrink: 0;
          gap: 10px;
        }
        .sidebar-header-info {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }
        .sidebar-header-logo {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          object-fit: contain;
          border: 1px solid rgba(28, 115, 171, 0.2);
          padding: 2px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          flex-shrink: 0;
        }
        .sidebar-header-titles {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .sidebar-main-title {
          font-size: 15px;
          font-weight: 900;
          color: #122946;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-sub-badge {
          font-size: 10.5px;
          font-weight: 700;
          color: #1C73AB;
        }
        .sidebar-close-or-pin-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(28, 115, 171, 0.08);
          border: 1px solid rgba(28, 115, 171, 0.18);
          color: #1C73AB;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .sidebar-close-or-pin-btn:hover {
          background: rgba(28, 115, 171, 0.18);
          transform: scale(1.05);
        }

        /* 📜 Scrollable Content */
        .filter-content {
          width: 100%;
          padding: 16px 18px 24px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          direction: rtl !important;
          text-align: right !important;
        }
        .filter-content::-webkit-scrollbar { width: 5px; }
        .filter-content::-webkit-scrollbar-track { background: transparent; }
        .filter-content::-webkit-scrollbar-thumb { background: rgba(28, 115, 171, 0.25); border-radius: 10px; }
        .filter-content::-webkit-scrollbar-thumb:hover { background: #1C73AB; }

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
          color: #1C73AB;
          border-bottom: 1px solid rgba(28, 115, 171, 0.12);
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
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.9) 100%);
          border: 1.5px solid rgba(28, 115, 171, 0.18);
          border-radius: 14px;
          padding: 12px 14px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(28, 115, 171, 0.04);
        }

        /* Enforce theme rules on all summary cards */
        .summary-glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.9) 100%) !important;
          border: 1.5px solid rgba(28, 115, 171, 0.18) !important;
          border-radius: 16px !important;
          padding: 12px 16px !important;
          margin-bottom: 8px !important;
          width: 100% !important;
          box-sizing: border-box !important;
          box-shadow: 0 4px 16px rgba(28, 115, 171, 0.06) !important;
          text-align: right !important;
          direction: rtl !important;
        }
        .summary-glass-card .val, 
        .summary-glass-card [class*="val"] {
          font-size: 22px !important;
          font-weight: 900 !important;
          color: #1C73AB !important;
          margin-top: 4px !important;
          letter-spacing: -0.3px !important;
          display: block !important;
          text-align: right !important;
        }
        .summary-glass-card span, 
        .summary-glass-card label {
          font-size: 11.5px !important;
          font-weight: 800 !important;
          color: #64748b !important;
          display: block !important;
        }

        /* ⚡ Action Buttons */
        .sidebar-actions-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .filter-sidebar-v3 .btn-main-glass,
        .filter-sidebar-v3 button[class*="btn"] {
          width: 100% !important;
          background: linear-gradient(135deg, #1C73AB 0%, #2891C8 100%) !important;
          color: white !important;
          border: none !important;
          border-radius: 12px !important;
          padding: 10px 14px !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          box-shadow: 0 4px 14px rgba(28, 115, 171, 0.25) !important;
          min-height: 42px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .filter-sidebar-v3 .btn-main-glass:hover,
        .filter-sidebar-v3 button[class*="btn"]:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 18px rgba(28, 115, 171, 0.35) !important;
        }

        /* 🔍 Inputs & Dates */
        .filter-input,
        .filter-sidebar-v3 input[type="text"],
        .filter-sidebar-v3 input[type="search"],
        .filter-sidebar-v3 input[type="date"],
        .filter-sidebar-v3 select {
          width: 100% !important;
          background: rgba(255, 255, 255, 0.96) !important;
          border: 1.5px solid rgba(28, 115, 171, 0.22) !important;
          border-radius: 12px !important;
          padding: 10px 14px !important;
          color: #122946 !important;
          font-weight: 700 !important;
          font-size: 13.5px !important;
          direction: rtl !important;
          text-align: right !important;
          outline: none !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 6px rgba(28, 115, 171, 0.04) !important;
        }
        .filter-input:focus,
        .filter-sidebar-v3 input:focus,
        .filter-sidebar-v3 select:focus {
          border-color: #1C73AB !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(28, 115, 171, 0.15) !important;
        }
        .filter-input::placeholder {
          color: #94a3b8 !important;
          font-weight: 600 !important;
        }

        .sidebar-date-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 8px;
          width: 100%;
        }
        .sidebar-date-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sidebar-date-label {
          font-size: 11px;
          font-weight: 800;
          color: #1C73AB;
        }
        .sidebar-custom-filters-wrap {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed rgba(28, 115, 171, 0.15);
          width: 100%;
        }
        .sidebar-section-subhead {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          margin-bottom: 6px;
        }

        .sidebar-footer-brand {
          text-align: center;
          color: #94a3b8;
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
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(10px);
            color: #1C73AB;
            padding: 0 4px;
            cursor: pointer;
            z-index: 998;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: -2px 0 10px rgba(0,0,0,0.1);
            border-left: 1px solid rgba(255,255,255,0.8);
            transition: all 0.3s ease;
            opacity: ${isOpen ? 0 : 1};
            pointer-events: ${isOpen ? 'none' : 'auto'};
          }
          .filter-toggle-tab-v3:hover {
            background: rgba(255, 255, 255, 0.95);
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
            max-height: 85vh !important;
            border-radius: 24px 24px 0 0 !important;
            border: 1.5px solid rgba(255, 255, 255, 0.95) !important;
            border-bottom: none !important;
            box-shadow: 0 -10px 40px rgba(18, 41, 70, 0.25) !important;
            z-index: 9999 !important;
            transition: bottom 0.38s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
          }

          .filter-content {
            width: 100% !important;
            max-width: 100% !important;
            padding: 12px 16px 35px 16px !important;
            max-height: calc(85vh - 65px) !important;
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
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.95) 100%) !important;
            border: 1.5px solid rgba(28, 115, 171, 0.3) !important;
            border-bottom: none !important;
            box-shadow: 0 -4px 20px rgba(28, 115, 171, 0.18) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            z-index: 998 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            cursor: pointer !important;
            color: #1C73AB !important;
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

      `}</style>

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
              <span className="sidebar-sub-badge">لوحة الفلاتر والملخص</span>
            </div>
          </div>

          <button 
            type="button"
            className="sidebar-close-or-pin-btn" 
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsPinned(!isPinned); 
            }}
            title={isMobile ? 'إغلاق' : (isPinned ? 'إلغاء التثبيت' : 'تثبيت اللوحة')}
          >
            <span>{isMobile ? '✕' : (isPinned ? '📌' : '📍')}</span>
          </button>
        </div>

        <div className="filter-content cinematic-scroll">
          {/* 📊 Summary Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-icon">📊</span>
              <span className="sidebar-section-title">ملخص وبيانات الصفحة</span>
            </div>
            <div className="sidebar-summary-container">
              {effectiveSummary ? (
                effectiveSummary
              ) : (
                <div className="sidebar-empty-summary-card">
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#122946' }}>{title}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    استخدم أدوات البحث وتصفية التاريخ أدناه للتنقل وإدارة السجلات
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
                <span className="sidebar-section-title">عمليات الصفحة السريعة</span>
              </div>
              <div className="sidebar-actions-grid">
                {effectiveActions}
              </div>
            </div>
          )}

          {/* 🔍 Search & Filters */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-icon">🔍</span>
              <span className="sidebar-section-title">البحث وتصفية التاريخ</span>
            </div>
            
            <div className="sidebar-search-box">
              <input 
                type="text" 
                className="filter-input search" 
                placeholder="ابحث هنا عن أي بيان..." 
                onChange={(e) => handleSearch(e.target.value)} 
              />
            </div>

            <div className="sidebar-date-grid">
              <div className="sidebar-date-col">
                <label className="sidebar-date-label">من تاريخ 📅</label>
                <input 
                  type="date" 
                  className="filter-input date" 
                  onChange={(e) => {
                    const d = { ...dates, start: e.target.value };
                    setDates(d);
                    handleDateChange(d.start, d.end);
                  }} 
                />
              </div>

              <div className="sidebar-date-col">
                <label className="sidebar-date-label">إلى تاريخ 📅</label>
                <input 
                  type="date" 
                  className="filter-input date" 
                  onChange={(e) => {
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
            نظام الغيام المائي الموحد v2.0
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
