"use client";
import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { useThemeMode } from '@/lib/ThemeContext';
import {
  useLicensesLogic,
  LicenseItem,
  LicenseCalculated,
  SAUDI_LICENSE_TEMPLATES
} from './licenses_logic';

export default function LicensesPage() {
  const logic = useLicensesLogic();
  const { isDaylight } = useThemeMode();

  // Local state for adding doc inside the AddEdit modal
  const [newModalDocInput, setNewModalDocInput] = useState('');
  const [newChecklistDocInput, setNewChecklistDocInput] = useState('');

  // Pure Crystal Bright Theme tokens
  const T = {
    primary: isDaylight ? '#0F172A' : '#F8FAFC',
    textMuted: isDaylight ? '#475569' : '#94A3B8',
    accent: isDaylight ? '#D97706' : '#00E5FF',
    accentBg: isDaylight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 229, 255, 0.12)',
    accentBorder: isDaylight ? 'rgba(245, 158, 11, 0.35)' : 'rgba(0, 229, 255, 0.3)',
    terracotta: isDaylight ? '#EA580C' : '#E06D44',
    terracottaBg: isDaylight ? 'rgba(234, 88, 12, 0.1)' : 'rgba(224, 109, 68, 0.15)',
    terracottaBorder: isDaylight ? 'rgba(234, 88, 12, 0.3)' : 'rgba(224, 109, 68, 0.35)',
    success: isDaylight ? '#059669' : '#10B981',
    successBg: isDaylight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(16, 185, 129, 0.12)',
    successBorder: isDaylight ? 'rgba(5, 150, 105, 0.3)' : 'rgba(16, 185, 129, 0.3)',
    warning: isDaylight ? '#D97706' : '#F59E0B',
    warningBg: isDaylight ? 'rgba(217, 119, 6, 0.1)' : 'rgba(245, 158, 11, 0.18)',
    warningBorder: isDaylight ? 'rgba(217, 119, 6, 0.3)' : 'rgba(245, 158, 11, 0.35)',
    cardBg: isDaylight 
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.92) 100%)' 
      : 'linear-gradient(135deg, rgba(20, 25, 35, 0.75) 0%, rgba(12, 16, 24, 0.65) 100%)',
    cardBorder: isDaylight ? '1px solid rgba(245, 158, 11, 0.22)' : '1px solid rgba(0, 229, 255, 0.15)',
    inputBg: isDaylight ? '#FFFFFF' : 'rgba(15, 18, 24, 0.8)',
    inputBorder: isDaylight ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(255, 255, 255, 0.12)',
    shadow: isDaylight ? '0 4px 20px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)' : '0 4px 15px rgba(0, 0, 0, 0.4)'
  };

  // Category label and icon helper
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'municipal': return { label: 'بلدي / تراخيص المحطة', icon: '🏛️' };
      case 'civil_defense': return { label: 'دفاع مدني / سلامة', icon: '🚒' };
      case 'energy': return { label: 'وزارة الطاقة / تشغيل', icon: '⚡' };
      case 'calibration': return { label: 'تقييس / معايرة المضخات', icon: '📟' };
      case 'commercial': return { label: 'سجل تجاري / وزارة التجارة', icon: '📄' };
      case 'tax_zakat': return { label: 'زكاة وضريبة (ZATCA)', icon: '⚖️' };
      case 'insurance': return { label: 'تأمينات اجتماعية (GOSI)', icon: '🛡️' };
      case 'labor': return { label: 'قوى / توطين وسعودة', icon: '👥' };
      case 'environment': return { label: 'تصريح بيئي / رقابة بيئية', icon: '🌱' };
      case 'lease': return { label: 'عقد إيجار (إيجار)', icon: '🏢' };
      case 'transport': return { label: 'نقل وصهاريج وقود', icon: '🚛' };
      default: return { label: 'وثيقة رسمية', icon: '📜' };
    }
  };

  return (
    <>
      {/* Styles for Desert Glassmorphism & Responsive layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        .licenses-glass-card {
          background: ${T.cardBg};
          backdrop-filter: blur(24px) saturate(160%);
          border: ${T.cardBorder};
          box-shadow: ${T.shadow};
          border-radius: 16px;
          transition: all 0.25s ease;
        }
        .licenses-glass-card:hover {
          box-shadow: 0 10px 22px rgba(168, 87, 60, 0.12);
          transform: translateY(-2px);
        }
        .kpi-metric-card {
          padding: 16px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(194, 155, 98, 0.2);
          background: ${isDaylight ? 'rgba(255, 253, 250, 0.9)' : 'rgba(255, 255, 255, 0.04)'};
        }
        .license-row-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
        }
        @media (max-width: 768px) {
          .kpi-metrics-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .licenses-filters-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .templates-scroll-container {
            overflow-x: auto !important;
          }
          .modal-grid-2col {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />

      {/* Sidebar Controls & Quick Stats */}
      <RawasiSidebarManager
        summary={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="licenses-glass-card" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: T.textMuted }}>إجمالي التراخيص المسجلة 📜</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: T.primary, marginTop: '4px' }}>
                {logic.stats.total} ترخيص
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="licenses-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: T.success }}>سارية ومطابقة 🟢</span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: T.success, marginTop: '2px' }}>
                  {logic.stats.active}
                </div>
              </div>
              <div className="licenses-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: T.warning }}>قاربت على الانتهاء ⏳</span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: T.warning, marginTop: '2px' }}>
                  {logic.stats.expiringSoon}
                </div>
              </div>
            </div>

            {logic.stats.expired > 0 && (
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: T.terracottaBg,
                border: `1px solid ${T.terracottaBorder}`,
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: T.terracotta }}>
                  🚨 {logic.stats.expired} ترخيص منتهي الصلاحية!
                </span>
              </div>
            )}
          </div>
        }
        actions={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn-main-glass gold desert-btn-primary"
              onClick={() => logic.handleOpenAddModal()}
              style={{ width: '100%', minHeight: '44px', fontWeight: 900 }}
            >
              <span>➕</span>
              <span>إضافة ترخيص جديد</span>
            </button>
          </div>
        }
        watchDeps={[logic.stats.total, logic.stats.expiringSoon, logic.stats.expired]}
      />

      <div className="clean-page">
        <MasterPage
          icon="📜"
          title="إدارة التراخيص والوثائق الحكومية"
          subtitle="متابعة صلاحية رخص محطات الوقود والبلدية والدفاع المدني وتجهيز الأوراق المطلوبة للتجديد قبل الانتهاء"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 1. URGENT ALERT BANNER (If any licenses need urgent renewal) */}
            {logic.stats.urgentList.length > 0 && (
              <div style={{
                background: isDaylight
                  ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(255, 237, 213, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(69, 26, 26, 0.85) 0%, rgba(55, 30, 20, 0.75) 100%)',
                border: `1.5px solid ${T.terracotta}`,
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(168, 87, 60, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: T.terracottaBg,
                    border: `1px solid ${T.terracottaBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0
                  }}>
                    ⚠️
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 900, color: T.terracotta, fontSize: '15px' }}>
                      تنبيه عاجل: توجد {logic.stats.urgentList.length} تراخيص بحاجة لتجهيز الأوراق والتجديد الفوري!
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: T.primary, opacity: 0.85 }}>
                      تجنب الغرامات أو تعليق الخدمات للمحطة؛ يرجى فتح قائمة الأوراق المطلوبة واستكمال المستندات قبل موعد الانتهاء.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {logic.stats.urgentList.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => logic.handleOpenChecklistModal(item)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: isDaylight ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                        border: `1px solid ${T.terracottaBorder}`,
                        color: T.terracotta,
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="فتح قائمة تجهيز أوراق هذا الترخيص"
                    >
                      <span>📋</span>
                      <span>{item.name}</span>
                      <span style={{
                        background: item.daysRemaining < 0 ? T.terracotta : T.warning,
                        color: '#FFF',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '10px'
                      }}>
                        {item.daysRemaining < 0 ? 'منتهي' : `متبقي ${item.daysRemaining} يوم`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. KPI METRICS CARDS */}
            <div className="kpi-metrics-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px'
            }}>
              {/* Card 1: Total */}
              <div className="licenses-glass-card kpi-metric-card">
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: T.accentBg,
                  border: `1px solid ${T.accentBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  📜
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.textMuted }}>إجمالي التراخيص والوثائق</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: T.primary, marginTop: '2px' }}>
                    {logic.stats.total} <span style={{ fontSize: '12px', fontWeight: 600 }}>وثيقة</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Active */}
              <div className="licenses-glass-card kpi-metric-card">
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: T.successBg,
                  border: `1px solid ${T.successBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  ✅
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.success }}>سارية وصالحة</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: T.success, marginTop: '2px' }}>
                    {logic.stats.active} <span style={{ fontSize: '12px', fontWeight: 600 }}>ترخيص</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Expiring Soon */}
              <div className="licenses-glass-card kpi-metric-card">
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: T.warningBg,
                  border: `1px solid ${T.warningBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  ⏳
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.warning }}>قاربت على الانتهاء (تجهيز)</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: T.warning, marginTop: '2px' }}>
                    {logic.stats.expiringSoon} <span style={{ fontSize: '12px', fontWeight: 600 }}>ترخيص</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Expired */}
              <div className="licenses-glass-card kpi-metric-card">
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: T.terracottaBg,
                  border: `1px solid ${T.terracottaBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  ⛔
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.terracotta }}>منتهية الصلاحية</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: T.terracotta, marginTop: '2px' }}>
                    {logic.stats.expired} <span style={{ fontSize: '12px', fontWeight: 600 }}>ترخيص</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. QUICK OFFICIAL SAUDI TEMPLATES ROW */}
            <div className="licenses-glass-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⚡</span>
                  <span style={{ fontWeight: 900, fontSize: '13.5px', color: T.primary }}>
                    إضافة سريعة بنقرة واحدة من القوالب الرسمية المعتمدة لمحطات الوقود في المملكة:
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: T.textMuted }}>
                  تعبئة تلقائية للمتطلبات والأوراق وجهات الإصدار
                </span>
              </div>

              <div className="templates-scroll-container" style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '6px'
              }}>
                {SAUDI_LICENSE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => logic.handleOpenAddModal(tmpl)}
                    style={{
                      background: isDaylight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${T.accentBorder}`,
                      borderRadius: '10px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      color: T.primary,
                      fontSize: '12px',
                      fontWeight: 800,
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    title={`إضافة ${tmpl.name} مع المستندات المطلوبة`}
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.name}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: T.accentBg,
                      color: T.accent
                    }}>
                      +{tmpl.defaultDocs.length} أوراق
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. FILTERS & SEARCH TOOLBAR */}
            <div className="licenses-glass-card licenses-filters-bar" style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Search Box */}
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '14px', color: T.textMuted }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="بحث باسم الترخيص، رقم الرخصة، جهة الإصدار، أو المحطة..."
                  value={logic.searchQuery}
                  onChange={(e) => logic.setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 36px 8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Station Filter */}
              <div style={{ minWidth: '160px' }}>
                <select
                  value={logic.selectedStationFilter}
                  onChange={(e) => logic.setSelectedStationFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">⛽ جميع الفروع والمحطات</option>
                  {logic.stations.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ minWidth: '150px' }}>
                <select
                  value={logic.selectedStatusFilter}
                  onChange={(e) => logic.setSelectedStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">🔘 كافة الحالات</option>
                  <option value="active">🟢 سارية ومطابقة</option>
                  <option value="expiring_soon">🟡 قاربت على الانتهاء</option>
                  <option value="expired">🔴 منتهية الصلاحية</option>
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ minWidth: '160px' }}>
                <select
                  value={logic.selectedCategoryFilter}
                  onChange={(e) => logic.setSelectedCategoryFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">📁 جميع التصنيفات</option>
                  <option value="municipal">🏛️ بلدي ورخص أنشطة</option>
                  <option value="civil_defense">🚒 دفاع مدني وسلامة</option>
                  <option value="energy">⚡ وزارة الطاقة وتأهيل</option>
                  <option value="calibration">📟 تقييس ومعايرة مضخات</option>
                  <option value="commercial">📄 سجل تجاري</option>
                  <option value="tax_zakat">⚖️ زكاة وضريبة (ZATCA)</option>
                  <option value="insurance">🛡️ تأمينات اجتماعية</option>
                  <option value="labor">👥 قوى وسعودة</option>
                  <option value="environment">🌱 تصريح بيئي</option>
                  <option value="lease">🏢 عقود إيجار</option>
                  <option value="transport">🚛 صهاريج ونقل وقود</option>
                </select>
              </div>

              {/* Add New Button */}
              <button
                type="button"
                className="btn-main-glass gold desert-btn-primary"
                onClick={() => logic.handleOpenAddModal()}
                style={{
                  height: '42px',
                  padding: '0 16px',
                  fontWeight: 900,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>➕</span>
                <span>إضافة ترخيص جديد</span>
              </button>
            </div>

            {/* 5. LICENSES TABLE & CARDS */}
            <div className="licenses-glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'right',
                  fontSize: '13px'
                }}>
                  <thead>
                    <tr style={{
                      background: isDaylight ? 'rgba(194, 155, 98, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      borderBottom: T.cardBorder
                    }}>
                      <th style={{ padding: '14px 16px', fontWeight: 900, color: T.primary }}>الترخيص والجهة المصدرة</th>
                      <th style={{ padding: '14px 16px', fontWeight: 900, color: T.primary }}>المحطة / الفرع</th>
                      <th style={{ padding: '14px 16px', fontWeight: 900, color: T.primary }}>رقم الرخصة والتاريخ</th>
                      <th style={{ padding: '14px 16px', fontWeight: 900, color: T.primary }}>الصلاحية والمتبقي</th>
                      <th style={{ padding: '14px 16px', fontWeight: 900, color: T.primary }}>جاهزية الأوراق (Checklist)</th>
                      <th style={{ padding: '14px 16px', fontWeight: 900, color: T.primary, textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logic.licenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: T.textMuted }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                          <div style={{ fontWeight: 800, fontSize: '15px' }}>لا توجد تراخيص مطابقة لمعايير البحث</div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            يمكنك إضافة ترخيص جديد أو استخدام أحد القوالب الحكومية السريعة بالأعلى.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logic.licenses.map((lic) => {
                        const catMeta = getCategoryMeta(lic.category);

                        // Badge styling
                        let badgeBg = T.successBg;
                        let badgeBorder = T.successBorder;
                        let badgeColor = T.success;
                        let badgeText = `🟢 ساري (متبقي ${lic.daysRemaining} يوم)`;

                        if (lic.status === 'expired') {
                          badgeBg = T.terracottaBg;
                          badgeBorder = T.terracottaBorder;
                          badgeColor = T.terracotta;
                          badgeText = `🔴 منتهي منذ ${Math.abs(lic.daysRemaining)} يوم`;
                        } else if (lic.status === 'expiring_soon') {
                          badgeBg = T.warningBg;
                          badgeBorder = T.warningBorder;
                          badgeColor = T.warning;
                          badgeText = `🟡 يوشك على الانتهاء (${lic.daysRemaining} يوم)`;
                        }

                        return (
                          <tr
                            key={lic.id}
                            style={{
                              borderBottom: isDaylight ? '1px solid rgba(194, 155, 98, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                              transition: 'background 0.2s ease'
                            }}
                          >
                            {/* License & Authority */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '10px',
                                  background: T.accentBg,
                                  border: `1px solid ${T.accentBorder}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '18px',
                                  flexShrink: 0
                                }}>
                                  {catMeta.icon}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 900, color: T.primary, fontSize: '13.5px' }}>
                                    {lic.name}
                                  </span>
                                  <span style={{ fontSize: '11px', color: T.accent, fontWeight: 700 }}>
                                    {lic.authority || catMeta.label}
                                  </span>
                                  {lic.notes && (
                                    <span style={{ fontSize: '10.5px', color: T.textMuted, marginTop: '2px' }}>
                                      📝 {lic.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Station */}
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                background: isDaylight ? 'rgba(194, 155, 98, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${T.accentBorder}`,
                                fontSize: '11.5px',
                                fontWeight: 800,
                                color: T.primary
                              }}>
                                ⛽ {lic.stationName || 'المركز الرئيسي'}
                              </span>
                            </td>

                            {/* License Number & Dates */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: T.primary, fontSize: '12.5px' }}>
                                  {lic.licenseNumber || '—'}
                                </span>
                                <span style={{ fontSize: '11px', color: T.textMuted }}>
                                  ينتهي في: <strong style={{ color: T.primary }}>{lic.expiryDate}</strong>
                                </span>
                              </div>
                            </td>

                            {/* Status & Days Remaining */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                <span
                                  className="license-row-badge"
                                  style={{ background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor }}
                                >
                                  {badgeText}
                                </span>
                                <span style={{ fontSize: '10.5px', color: T.textMuted }}>
                                  حد الإنذار المبكر: قبل {lic.alertDaysBefore || 30} يوماً
                                </span>
                              </div>
                            </td>

                            {/* Documents Checklist Progress */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                  <span style={{ fontWeight: 800, color: T.primary }}>
                                    جاهز: {lic.docsProgress.ready} من {lic.docsProgress.total}
                                  </span>
                                  <span style={{
                                    fontWeight: 900,
                                    color: lic.docsProgress.percent === 100 ? T.success : T.accent
                                  }}>
                                    {lic.docsProgress.percent}%
                                  </span>
                                </div>
                                <div style={{
                                  width: '120px',
                                  height: '6px',
                                  borderRadius: '3px',
                                  background: isDaylight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${lic.docsProgress.percent}%`,
                                    height: '100%',
                                    background: lic.docsProgress.percent === 100 ? T.success : T.accent,
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => logic.handleOpenChecklistModal(lic)}
                                  style={{
                                    alignSelf: 'flex-start',
                                    background: 'transparent',
                                    border: 'none',
                                    color: T.accent,
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    padding: '0',
                                    textDecoration: 'underline'
                                  }}
                                >
                                  📋 فتح وتجهيز الأوراق
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                {/* Prepare Papers Button */}
                                <button
                                  type="button"
                                  onClick={() => logic.handleOpenChecklistModal(lic)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: T.accentBg,
                                    border: `1px solid ${T.accentBorder}`,
                                    color: T.accent,
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                  title="مراجعة وتجهيز الأوراق المطلوبة للتجديد"
                                >
                                  📋 تجهيز الأوراق
                                </button>

                                {/* Quick Renew Button */}
                                <button
                                  type="button"
                                  onClick={() => logic.handleOpenRenewModal(lic)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: T.successBg,
                                    border: `1px solid ${T.successBorder}`,
                                    color: T.success,
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                  title="تجديد الترخيص وتمديد الصلاحية"
                                >
                                  🔄 تجديد
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => logic.handleOpenEditModal(lic)}
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    background: isDaylight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${T.accentBorder}`,
                                    color: T.primary,
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                  title="تعديل بيانات الترخيص"
                                >
                                  ✏️
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => logic.handleDeleteLicense(lic.id, lic.name)}
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    background: T.terracottaBg,
                                    border: `1px solid ${T.terracottaBorder}`,
                                    color: T.terracotta,
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                  title="حذف الترخيص"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </MasterPage>
      </div>

      {/* 6. MODAL: ADD / EDIT LICENSE */}
      <AquaModalWrapper
        isOpen={logic.isAddEditModalOpen}
        onClose={() => logic.setIsAddEditModalOpen(false)}
        title={logic.editingLicense?.id?.startsWith('lic-') && !logic.licenses.some(l => l.id === logic.editingLicense?.id) ? "إضافة ترخيص أو وثيقة جديدة" : "تعديل بيانات الترخيص"}
        subtitle="تسجيل بيانات الترخيص الرسمي، جهة الإصدار، تواريخ الصلاحية، وقائمة الأوراق اللازمة للتجديد"
        icon="📜"
      >
        {logic.editingLicense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', padding: '4px' }}>
            
            {/* Quick Template Selector inside modal if adding new */}
            <div style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: T.accentBg,
              border: `1px solid ${T.accentBorder}`
            }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: T.accent, display: 'block', marginBottom: '6px' }}>
                💡 قوالب التراخيص الشائعة (تعبئة المتطلبات تلقائياً بنقرة واحدة):
              </span>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {SAUDI_LICENSE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      logic.setEditingLicense({
                        ...logic.editingLicense!,
                        name: tmpl.name,
                        category: tmpl.category,
                        authority: tmpl.authority,
                        alertDaysBefore: tmpl.defaultAlertDays,
                        documentsRequired: tmpl.defaultDocs.map((d, i) => ({ id: `doc-${i+1}`, name: d, isReady: false })),
                        notes: tmpl.description
                      });
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: isDaylight ? '#FFF' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${T.accentBorder}`,
                      fontSize: '11px',
                      fontWeight: 700,
                      color: T.primary,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tmpl.icon} {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* License Name */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  مسمى الترخيص أو الوثيقة *
                </label>
                <input
                  type="text"
                  value={logic.editingLicense.name}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, name: e.target.value })}
                  placeholder="مثال: رخصة البلدية للمحطة، ترخيص السلامة (سلامة)، تقييس معايرة المضخات..."
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  التصنيف الرسمي
                </label>
                <select
                  value={logic.editingLicense.category}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, category: e.target.value as any })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="municipal">🏛️ بلدي / رخص أنشطة تجارية</option>
                  <option value="civil_defense">🚒 دفاع مدني / منصة سلامة</option>
                  <option value="energy">⚡ وزارة الطاقة / تأهيل المحطات</option>
                  <option value="calibration">📟 تقييس / معايرة المضخات</option>
                  <option value="commercial">📄 سجل تجاري / وزارة التجارة</option>
                  <option value="tax_zakat">⚖️ زكاة وضريبة وجمرك (ZATCA)</option>
                  <option value="insurance">🛡️ تأمينات اجتماعية (GOSI)</option>
                  <option value="labor">👥 وزارة الموارد البشرية / قوى</option>
                  <option value="environment">🌱 التزام وتصريح بيئي</option>
                  <option value="lease">🏢 عقد إيجار المحطة (إيجار)</option>
                  <option value="transport">🚛 بطاقات تشغيل وصهاريج نقل الوقود</option>
                  <option value="other">📜 أخرى</option>
                </select>
              </div>

              {/* Authority */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  جهة الإصدار الرسمية
                </label>
                <input
                  type="text"
                  value={logic.editingLicense.authority}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, authority: e.target.value })}
                  placeholder="مثال: وزارة البلديات والإسكان، الدفاع المدني..."
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* License Number */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  رقم الترخيص / الوثيقة
                </label>
                <input
                  type="text"
                  value={logic.editingLicense.licenseNumber}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, licenseNumber: e.target.value })}
                  placeholder="رقم الرخصة أو الشهادة الرسمية"
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Station / Branch */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  المحطة أو الفرع التابع له
                </label>
                <select
                  value={logic.editingLicense.stationId || 'all'}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, stationId: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">⛽ جميع المحطات / المركز الرئيسي</option>
                  {logic.stations.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Issue Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  تاريخ الإصدار (اختياري)
                </label>
                <input
                  type="date"
                  value={logic.editingLicense.issueDate || ''}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, issueDate: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: T.terracotta, marginBottom: '6px' }}>
                  تاريخ انتهاء الصلاحية *
                </label>
                <input
                  type="date"
                  value={logic.editingLicense.expiryDate}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, expiryDate: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${T.terracotta}`,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '13px',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Alert Days Before */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  بدء التنبيه المبكر وتجهيز الأوراق قبل الانتهاء بـ:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[15, 30, 45, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => logic.setEditingLicense({ ...logic.editingLicense!, alertDaysBefore: days })}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: logic.editingLicense?.alertDaysBefore === days ? `2px solid ${T.accent}` : T.inputBorder,
                        background: logic.editingLicense?.alertDaysBefore === days ? T.accentBg : T.inputBg,
                        color: logic.editingLicense?.alertDaysBefore === days ? T.accent : T.primary,
                        fontWeight: 900,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {days} يوم
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Documents Checklist Builder */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: T.primary, marginBottom: '6px' }}>
                  📋 قائمة الأوراق والمستندات المطلوبة لتجديد هذا الترخيص ({logic.editingLicense.documentsRequired?.length || 0})
                </label>
                
                {/* List of existing docs in modal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {(logic.editingLicense.documentsRequired || []).map((doc, dIdx) => (
                    <div
                      key={doc.id || dIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: isDaylight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${T.accentBorder}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px' }}>📄</span>
                        <span style={{ fontSize: '12.5px', color: T.primary, fontWeight: 600 }}>{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = logic.editingLicense!.documentsRequired.filter((_, i) => i !== dIdx);
                          logic.setEditingLicense({ ...logic.editingLicense!, documentsRequired: filtered });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: T.terracotta,
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                        title="إزالة هذا المستند من المتطلبات"
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add custom doc input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newModalDocInput}
                    onChange={(e) => setNewModalDocInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newModalDocInput.trim()) {
                          logic.setEditingLicense({
                            ...logic.editingLicense!,
                            documentsRequired: [
                              ...(logic.editingLicense!.documentsRequired || []),
                              { id: `doc-${Date.now()}`, name: newModalDocInput.trim(), isReady: false }
                            ]
                          });
                          setNewModalDocInput('');
                        }
                      }
                    }}
                    placeholder="إضافة ورقة أو مستند مطلوب جديد (اضغط Enter للإضافة)..."
                    style={{
                      flex: 1,
                      height: '38px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: T.inputBorder,
                      background: T.inputBg,
                      color: T.primary,
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newModalDocInput.trim()) {
                        logic.setEditingLicense({
                          ...logic.editingLicense!,
                          documentsRequired: [
                            ...(logic.editingLicense!.documentsRequired || []),
                            { id: `doc-${Date.now()}`, name: newModalDocInput.trim(), isReady: false }
                          ]
                        });
                        setNewModalDocInput('');
                      }
                    }}
                    style={{
                      padding: '0 14px',
                      borderRadius: '8px',
                      background: T.accentBg,
                      border: `1px solid ${T.accentBorder}`,
                      color: T.accent,
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ➕ إضافة
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  ملاحظات وتوجيهات للمسؤول
                </label>
                <textarea
                  value={logic.editingLicense.notes || ''}
                  onChange={(e) => logic.setEditingLicense({ ...logic.editingLicense!, notes: e.target.value })}
                  rows={2}
                  placeholder="أي ملاحظات خاصة بالتجديد، أرقام تواصل مع معقب أو فني، مواعيد التفتيش..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: T.inputBorder,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: T.cardBorder }}>
              <button
                type="button"
                onClick={() => logic.setIsAddEditModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: T.inputBorder,
                  color: T.textMuted,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn-main-glass gold desert-btn-primary"
                onClick={() => logic.handleSaveLicense(logic.editingLicense!)}
                disabled={logic.isSaving}
                style={{
                  padding: '10px 24px',
                  fontWeight: 900,
                  fontSize: '13.5px',
                  cursor: logic.isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {logic.isSaving ? '⏳ جاري الحفظ...' : '💾 حفظ بيانات الترخيص'}
              </button>
            </div>

          </div>
        )}
      </AquaModalWrapper>

      {/* 7. MODAL: RENEWAL PAPERS CHECKLIST */}
      <AquaModalWrapper
        isOpen={logic.isChecklistModalOpen}
        onClose={() => logic.setIsChecklistModalOpen(false)}
        title={`قائمة تجهيز أوراق تجديد: ${logic.activeChecklistLicense?.name || ''}`}
        subtitle={`الجهة: ${logic.activeChecklistLicense?.authority || ''} | تاريخ الانتهاء: ${logic.activeChecklistLicense?.expiryDate || ''}`}
        icon="📋"
      >
        {logic.activeChecklistLicense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', padding: '4px' }}>
            
            {/* Progress Card */}
            {(() => {
              const total = logic.activeChecklistLicense.documentsRequired?.length || 0;
              const ready = logic.activeChecklistLicense.documentsRequired?.filter(d => d.isReady).length || 0;
              const percent = total > 0 ? Math.round((ready / total) * 100) : 100;

              return (
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  background: isDaylight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1.5px solid ${percent === 100 ? T.success : T.accentBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: T.textMuted }}>معدل اكتمال الأوراق المطلوبة للتجديد:</span>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: percent === 100 ? T.success : T.primary, marginTop: '2px' }}>
                      {ready} من أصل {total} مستندات جاهزة ({percent}%)
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `📋 أوراق تجديد ${logic.activeChecklistLicense?.name}:\n` +
                          (logic.activeChecklistLicense?.documentsRequired || [])
                            .map((d, i) => `${i+1}. [${d.isReady ? '✅ جاهز' : '⏳ ناقص'}] ${d.name}`)
                            .join('\n');
                        navigator.clipboard?.writeText(text);
                        alert('✅ تم نسخ قائمة الأوراق والمستندات للحافظة للمشاركة عبر واتساب!');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: T.accentBg,
                        border: `1px solid ${T.accentBorder}`,
                        color: T.accent,
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      📋 نسخ القائمة للواتساب
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => logic.handleOpenRenewModal(logic.activeChecklistLicense!)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: T.successBg,
                        border: `1px solid ${T.successBorder}`,
                        color: T.success,
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🔄 التجديد الفوري
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: T.primary }}>
                حدد الأوراق التي قمت بتجهيزها أو تسليمها للمعقب:
              </span>

              {(logic.activeChecklistLicense.documentsRequired || []).length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: T.textMuted, fontSize: '13px' }}>
                  لا توجد متطلبات مضافة لهذا الترخيص حالياً. يمكنك إضافة مستند جديد بالأسفل.
                </div>
              ) : (
                logic.activeChecklistLicense.documentsRequired.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => logic.handleToggleDocReady(doc.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: doc.isReady
                        ? (isDaylight ? 'rgba(78, 115, 79, 0.08)' : 'rgba(16, 185, 129, 0.1)')
                        : (isDaylight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.04)'),
                      border: doc.isReady ? `1.5px solid ${T.success}` : T.cardBorder,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={doc.isReady}
                        onChange={() => {}} // Handled by parent div
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: T.success,
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: doc.isReady ? 900 : 700,
                          color: doc.isReady ? T.success : T.primary,
                          textDecoration: doc.isReady ? 'line-through' : 'none'
                        }}>
                          {doc.name}
                        </span>
                        {doc.notes && (
                          <span style={{ fontSize: '11px', color: T.textMuted }}>
                            ملاحظة: {doc.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: doc.isReady ? T.successBg : T.warningBg,
                        color: doc.isReady ? T.success : T.warning,
                        fontWeight: 800
                      }}>
                        {doc.isReady ? 'جاهز ومكتمل ✅' : 'قيد التجهيز ⏳'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          logic.handleDeleteDocFromChecklist(doc.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: T.terracotta,
                          cursor: 'pointer',
                          fontSize: '13px',
                          padding: '4px'
                        }}
                        title="حذف هذا المستند"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Custom Requirement Field */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              borderRadius: '12px',
              background: isDaylight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              border: `1px dashed ${T.accentBorder}`
            }}>
              <input
                type="text"
                value={newChecklistDocInput}
                onChange={(e) => setNewChecklistDocInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newChecklistDocInput.trim()) {
                      logic.handleAddDocToChecklist(newChecklistDocInput.trim());
                      setNewChecklistDocInput('');
                    }
                  }
                }}
                placeholder="إضافة ورقة أو متطلب إضافي لهذا الترخيص..."
                style={{
                  flex: 1,
                  height: '40px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: T.inputBorder,
                  background: T.inputBg,
                  color: T.primary,
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newChecklistDocInput.trim()) {
                    logic.handleAddDocToChecklist(newChecklistDocInput.trim());
                    setNewChecklistDocInput('');
                  }
                }}
                style={{
                  padding: '0 16px',
                  borderRadius: '8px',
                  background: T.accentBg,
                  border: `1px solid ${T.accentBorder}`,
                  color: T.accent,
                  fontWeight: 900,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                ➕ إضافة
              </button>
            </div>

            {/* Close Modal Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-main-glass gold desert-btn-primary"
                onClick={() => logic.setIsChecklistModalOpen(false)}
                style={{ padding: '10px 24px', fontWeight: 900, fontSize: '13px' }}
              >
                إغلاق القائمة
              </button>
            </div>

          </div>
        )}
      </AquaModalWrapper>

      {/* 8. MODAL: QUICK RENEW / EXTEND EXPIRY */}
      <AquaModalWrapper
        isOpen={logic.isRenewModalOpen}
        onClose={() => logic.setIsRenewModalOpen(false)}
        title={`تجديد الترخيص: ${logic.renewLicenseTarget?.name || ''}`}
        subtitle="تمديد فترة الصلاحية وتحديث تاريخ الانتهاء الجديد بعد صدور الموافقة الرسمية"
        icon="🔄"
      >
        {logic.renewLicenseTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px' }}>
            
            <div style={{
              padding: '14px',
              borderRadius: '12px',
              background: T.successBg,
              border: `1px solid ${T.successBorder}`
            }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: T.success, display: 'block', marginBottom: '4px' }}>
                🎉 تهانينا على استكمال الإجراءات الرسمية!
              </span>
              <span style={{ fontSize: '12px', color: T.primary }}>
                حدد تاريخ الانتهاء الجديد الصادر في الوثيقة أو الرخصة الرسمية لتحديث النظام وإعادة ضبط التنبيهات.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: T.primary, marginBottom: '6px' }}>
                تاريخ الانتهاء الجديد للترخيص *
              </label>
              <input
                type="date"
                value={logic.newRenewExpiryDate}
                onChange={(e) => logic.setNewRenewExpiryDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: `2px solid ${T.success}`,
                  background: T.inputBg,
                  color: T.primary,
                  fontSize: '14px',
                  fontWeight: 800,
                  outline: 'none'
                }}
              />
            </div>

            {/* Quick Extension Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() + 1);
                  logic.setNewRenewExpiryDate(d.toISOString().split('T')[0]);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${T.accentBorder}`,
                  background: T.accentBg,
                  color: T.accent,
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                + سنة واحدة من اليوم
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() + 2);
                  logic.setNewRenewExpiryDate(d.toISOString().split('T')[0]);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${T.accentBorder}`,
                  background: T.accentBg,
                  color: T.accent,
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                + سنتان من اليوم
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() + 3);
                  logic.setNewRenewExpiryDate(d.toISOString().split('T')[0]);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${T.accentBorder}`,
                  background: T.accentBg,
                  color: T.accent,
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                + 3 سنوات
              </button>
            </div>

            {/* Execution Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', paddingTop: '10px', borderTop: T.cardBorder }}>
              <button
                type="button"
                onClick={() => logic.setIsRenewModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: T.inputBorder,
                  color: T.textMuted,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => logic.handleExecuteRenew(true)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: T.accentBg,
                  border: `1px solid ${T.accentBorder}`,
                  color: T.accent,
                  fontWeight: 900,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
                title="تجديد مع إعادة تعيين قائمة الأوراق المطلوبة لتجهيز الدورة القادمة"
              >
                🔄 تجديد وتصفير قائمة الأوراق للدورة القادمة
              </button>

              <button
                type="button"
                className="btn-main-glass gold desert-btn-primary"
                onClick={() => logic.handleExecuteRenew(false)}
                style={{
                  padding: '10px 22px',
                  fontWeight: 900,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                ✅ تأكيد التجديد الآن
              </button>
            </div>

          </div>
        )}
      </AquaModalWrapper>
    </>
  );
}
