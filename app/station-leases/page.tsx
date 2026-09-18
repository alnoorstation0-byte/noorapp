"use client";
import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { useThemeMode } from '@/lib/ThemeContext';
import {
  useStationLeasesLogic,
  StationLease,
  LeaseInstallment,
  generateDefaultInstallments
} from './leases_logic';

export default function StationLeasesPage() {
  const logic = useStationLeasesLogic();
  const { isDaylight } = useThemeMode();

  // Desert Glassmorphism Theme tokens
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
      : 'linear-gradient(135deg, rgba(20, 25, 35, 0.8) 0%, rgba(12, 16, 24, 0.7) 100%)',
    cardBorder: isDaylight ? '1px solid rgba(245, 158, 11, 0.22)' : '1px solid rgba(0, 229, 255, 0.15)',
    inputBg: isDaylight ? '#FFFFFF' : 'rgba(15, 18, 24, 0.8)',
    inputBorder: isDaylight ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(255, 255, 255, 0.12)',
    shadow: isDaylight ? '0 4px 20px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)' : '0 4px 15px rgba(0, 0, 0, 0.4)'
  };

  const getFrequencyLabel = (freq: StationLease['paymentFrequency']) => {
    switch (freq) {
      case 'yearly': return 'دفعة سنوية واحدة';
      case 'semi_annual': return 'نصف سنوي (دفعتان)';
      case 'quarterly': return 'ربع سنوي (4 دفعات)';
      case 'monthly': return 'شهري (12 دفعة)';
      default: return freq;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .lease-glass-card {
          background: ${T.cardBg};
          backdrop-filter: blur(24px) saturate(160%);
          border: ${T.cardBorder};
          box-shadow: ${T.shadow};
          border-radius: 16px;
          transition: all 0.25s ease;
        }
        .lease-glass-card:hover {
          box-shadow: 0 10px 22px rgba(168, 87, 60, 0.12);
          transform: translateY(-2px);
        }
        .kpi-lease-metric {
          padding: 16px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(194, 155, 98, 0.2);
          background: ${isDaylight ? 'rgba(255, 253, 250, 0.9)' : 'rgba(255, 255, 255, 0.04)'};
        }
        .installment-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 14px;
          font-size: 11.5px;
          font-weight: 800;
        }
        @media (max-width: 768px) {
          .kpi-leases-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .leases-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .modal-grid-2col {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />

      {/* Sidebar Controls & Realtime Summary */}
      <RawasiSidebarManager
        summary={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="lease-glass-card" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: T.textMuted }}>إجمالي عقود المحطات 🏢</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: T.primary, marginTop: '4px' }}>
                {logic.stats.totalContracts} محطات
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="lease-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: T.success }}>إجمالي المسدد 💵</span>
                <div style={{ fontSize: '15px', fontWeight: 900, color: T.success, marginTop: '2px' }}>
                  {logic.stats.totalPaidAll.toLocaleString()} ر.س
                </div>
              </div>
              <div className="lease-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: T.terracotta }}>المتبقي سداده ⏳</span>
                <div style={{ fontSize: '15px', fontWeight: 900, color: T.terracotta, marginTop: '2px' }}>
                  {logic.stats.totalRemainingAll.toLocaleString()} ر.س
                </div>
              </div>
            </div>

            <div style={{
              padding: '10px',
              borderRadius: '10px',
              background: T.accentBg,
              border: `1px solid ${T.accentBorder}`,
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: T.accent }}>
                نسبة الإنجاز وسداد الالتزامات: {logic.stats.overallProgress}%
              </span>
            </div>
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
              <span>إضافة عقد إيجار محطة</span>
            </button>
          </div>
        }
        watchDeps={[logic.stats.totalContracts, logic.stats.totalPaidAll, logic.stats.totalRemainingAll]}
      />

      <div className="clean-page">
        <MasterPage
          icon="🏢"
          title="عقود إيجار المحطات ومتابعة السدادات"
          subtitle="تسجيل بيانات عقود إيجار محطات الوقود وجدولة الأقساط وتوثيق الدفعات والحوالات المالية بدقة"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 1. URGENT UPCOMING / OVERDUE PAYMENTS BANNER */}
            {logic.stats.urgentPaymentsList.length > 0 && (
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
                    🔔
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 900, color: T.terracotta, fontSize: '15px' }}>
                      تنبيه سداد: توجد {logic.stats.urgentPaymentsList.length} دفعات إيجار مستحقة السداد قريباً أو متأخرة!
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: T.primary, opacity: 0.85 }}>
                      يرجى تجهيز مبالغ الإيجار وتحويلها للملاك لتجنب تعليق العقود أو إيقاف الخدمات من منصة إيجار.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {logic.stats.urgentPaymentsList.slice(0, 3).map((item, idx) => {
                    const leaseObj = logic.leases.find((l) => l.id === item.leaseId);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (leaseObj) logic.handleOpenPaymentModal(leaseObj, item.installment);
                        }}
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
                        title="تسجيل سداد هذه الدفعة فوراً"
                      >
                        <span>💵</span>
                        <span>{item.leaseName} - {item.installment.title}</span>
                        <span style={{
                          background: item.installment.daysUntilDue < 0 ? T.terracotta : T.warning,
                          color: '#FFF',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontSize: '10px'
                        }}>
                          {item.installment.remainingAmount.toLocaleString()} ر.س ({item.installment.daysUntilDue < 0 ? 'متأخر' : `خلال ${item.installment.daysUntilDue} يوم`})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. KPI SUMMARY METRICS */}
            <div className="kpi-leases-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px'
            }}>
              {/* Metric 1 */}
              <div className="lease-glass-card kpi-lease-metric">
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
                  🏢
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.textMuted }}>إجمالي عقود المحطات</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: T.primary, marginTop: '2px' }}>
                    {logic.stats.totalContracts} <span style={{ fontSize: '12px', fontWeight: 600 }}>محطات مؤجرة</span>
                  </div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="lease-glass-card kpi-lease-metric">
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
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.accent }}>قيمة الإيجارات السنوية</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: T.accent, marginTop: '2px' }}>
                    {logic.stats.totalAnnualRents.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 600 }}>ر.س</span>
                  </div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="lease-glass-card kpi-lease-metric">
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
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.success }}>إجمالي المسدد حتى الآن</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: T.success, marginTop: '2px' }}>
                    {logic.stats.totalPaidAll.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 600 }}>ر.س</span>
                  </div>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="lease-glass-card kpi-lease-metric">
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
                  ⏳
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: T.terracotta }}>المتبقي الواجب سداده</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: T.terracotta, marginTop: '2px' }}>
                    {logic.stats.totalRemainingAll.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 600 }}>ر.س</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. TOOLBAR & FILTERS */}
            <div className="lease-glass-card leases-toolbar" style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '14px', color: T.textMuted }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="بحث باسم المحطة، المالك/المؤجر، أو رقم العقد في إيجار..."
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
              <div style={{ minWidth: '170px' }}>
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
                  <option value="all">⛽ جميع المحطات والفروع</option>
                  {logic.stations.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ minWidth: '160px' }}>
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
                  <option value="all">🔘 كافة العقود</option>
                  <option value="has_due">⏳ عقود بها مبالغ متبقية</option>
                  <option value="overdue">🚨 عقود بها دفعات متأخرة</option>
                  <option value="completed">✅ عقود مسددة بالكامل</option>
                </select>
              </div>

              {/* Add Button */}
              <button
                type="button"
                className="btn-main-glass gold desert-btn-primary"
                onClick={() => logic.handleOpenAddModal()}
                style={{
                  height: '42px',
                  padding: '0 18px',
                  fontWeight: 900,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>➕</span>
                <span>إضافة عقد إيجار محطة</span>
              </button>
            </div>

            {/* 4. LEASE CARDS LIST */}
            {logic.leases.length === 0 ? (
              <div className="lease-glass-card" style={{ padding: '50px 20px', textAlign: 'center', color: T.textMuted }}>
                <div style={{ fontSize: '38px', marginBottom: '10px' }}>🏢</div>
                <div style={{ fontWeight: 900, fontSize: '16px', color: T.primary }}>لا توجد عقود إيجار مسجلة مطابقة للبحث</div>
                <div style={{ fontSize: '12.5px', marginTop: '6px' }}>
                  اضغط على زر «إضافة عقد إيجار محطة» لتسجيل عقد جديد وتوليد جدول السدادات.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {logic.leases.map((lease) => (
                  <div key={lease.id} className="lease-glass-card" style={{ padding: '20px' }}>
                    
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      paddingBottom: '14px',
                      borderBottom: T.cardBorder
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: T.accentBg,
                          border: `1px solid ${T.accentBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '22px'
                        }}>
                          ⛽
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '16px', color: T.primary }}>
                              {lease.stationName}
                            </h3>
                            {lease.contractNumber && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: isDaylight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${T.accentBorder}`,
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: T.primary
                              }}>
                                إيجار: {lease.contractNumber}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '12px', color: T.textMuted }}>
                            <span>👤 المؤجر/المالك: <strong style={{ color: T.primary }}>{lease.lessorName}</strong></span>
                            {lease.lessorPhone && <span>📞 {lease.lessorPhone}</span>}
                            <span>🔄 {getFrequencyLabel(lease.paymentFrequency)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contract Period & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'left', fontSize: '11.5px', color: T.textMuted }}>
                          <div>فترة العقد: <strong style={{ color: T.primary }}>{lease.startDate}</strong> إلى <strong style={{ color: T.primary }}>{lease.endDate}</strong></div>
                          <div style={{
                            color: lease.contractStatus === 'expired' ? T.terracotta : (lease.contractStatus === 'expiring_soon' ? T.warning : T.success),
                            fontWeight: 800
                          }}>
                            {lease.contractStatus === 'expired'
                              ? `🔴 العقد منتهي منذ ${Math.abs(lease.daysUntilContractExpiry)} يوم`
                              : `🟢 ينتهي بعد ${lease.daysUntilContractExpiry} يوماً`}
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => logic.handleOpenPaymentModal(lease)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: T.successBg,
                              border: `1px solid ${T.successBorder}`,
                              color: T.success,
                              fontWeight: 900,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                            title="تسجيل سداد دفعة إيجار"
                          >
                            <span>💵</span>
                            <span>تسجيل سداد</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => logic.handleOpenStatementModal(lease)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: T.accentBg,
                              border: `1px solid ${T.accentBorder}`,
                              color: T.accent,
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                            title="كشف حساب وسجل السدادات السابقة"
                          >
                            <span>📜 كشف السدادات</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => logic.handleOpenEditModal(lease)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: isDaylight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                              border: `1px solid ${T.accentBorder}`,
                              color: T.primary,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                            title="تعديل بيانات العقد"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => logic.handleDeleteLease(lease.id, lease.stationName)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: T.terracottaBg,
                              border: `1px solid ${T.terracottaBorder}`,
                              color: T.terracotta,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                            title="حذف عقد الإيجار"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Financial Progress Bar */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                      padding: '12px 0'
                    }}>
                      <div>
                        <span style={{ fontSize: '11px', color: T.textMuted }}>قيمة الإيجار السنوي:</span>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: T.primary }}>
                          {Number(lease.annualRent || 0).toLocaleString()} ر.س
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: T.success }}>المسدد حتى الآن:</span>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: T.success }}>
                          {lease.totalPaid.toLocaleString()} ر.س ({lease.paymentProgress}%)
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: T.terracotta }}>المتبقي المستحق:</span>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: T.terracotta }}>
                          {lease.totalRemaining.toLocaleString()} ر.س
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: isDaylight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                      marginBottom: '14px'
                    }}>
                      <div style={{
                        width: `${lease.paymentProgress}%`,
                        height: '100%',
                        background: lease.paymentProgress === 100
                          ? T.success
                          : `linear-gradient(90deg, ${T.accent} 0%, ${T.success} 100%)`,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    {/* Installments Table */}
                    <div style={{ overflowX: 'auto', borderRadius: '10px', border: T.cardBorder }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        textAlign: 'right',
                        fontSize: '12.5px'
                      }}>
                        <thead>
                          <tr style={{
                            background: isDaylight ? 'rgba(194, 155, 98, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                            borderBottom: T.cardBorder
                          }}>
                            <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>الدفعة / القسط</th>
                            <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>تاريخ الاستحقاق</th>
                            <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>المبلغ المطلوب</th>
                            <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>المسدد</th>
                            <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>المتبقي</th>
                            <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>حالة الدفعة</th>
                            <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary, textAlign: 'center' }}>سداد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(lease.installments || []).map((inst) => {
                            let badgeBg = T.warningBg;
                            let badgeBorder = T.warningBorder;
                            let badgeColor = T.warning;
                            let badgeLabel = `⏳ مستحق (بعد ${inst.daysUntilDue} يوم)`;

                            if (inst.status === 'paid') {
                              badgeBg = T.successBg;
                              badgeBorder = T.successBorder;
                              badgeColor = T.success;
                              badgeLabel = '✅ مسدد بالكامل';
                            } else if (inst.status === 'overdue') {
                              badgeBg = T.terracottaBg;
                              badgeBorder = T.terracottaBorder;
                              badgeColor = T.terracotta;
                              badgeLabel = `🚨 متأخر (${Math.abs(inst.daysUntilDue)} يوم)`;
                            } else if (inst.status === 'partial') {
                              badgeBg = T.accentBg;
                              badgeBorder = T.accentBorder;
                              badgeColor = T.accent;
                              badgeLabel = `⏳ مسدد جزئياً (متبقي ${inst.remainingAmount.toLocaleString()})`;
                            }

                            return (
                              <tr
                                key={inst.id}
                                style={{
                                  borderBottom: isDaylight ? '1px solid rgba(194, 155, 98, 0.12)' : '1px solid rgba(255, 255, 255, 0.04)'
                                }}
                              >
                                <td style={{ padding: '10px 12px', fontWeight: 800, color: T.primary }}>
                                  {inst.title}
                                </td>
                                <td style={{ padding: '10px 12px', color: T.primary, fontFamily: 'monospace' }}>
                                  {inst.dueDate}
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 800, color: T.primary }}>
                                  {inst.dueAmount.toLocaleString()} ر.س
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 800, color: T.success }}>
                                  {inst.paidAmount.toLocaleString()} ر.س
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 900, color: inst.remainingAmount > 0 ? T.terracotta : T.textMuted }}>
                                  {inst.remainingAmount.toLocaleString()} ر.س
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span
                                    className="installment-badge"
                                    style={{ background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor }}
                                  >
                                    {badgeLabel}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {inst.status === 'paid' ? (
                                    <span style={{ fontSize: '11px', color: T.success, fontWeight: 800 }}>
                                      تم السداد ✔
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => logic.handleOpenPaymentModal(lease, inst)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: T.successBg,
                                        border: `1px solid ${T.successBorder}`,
                                        color: T.success,
                                        fontSize: '11.5px',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      💵 سداد
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        </MasterPage>
      </div>

      {/* 5. MODAL: ADD / EDIT LEASE CONTRACT */}
      <AquaModalWrapper
        isOpen={logic.isAddEditModalOpen}
        onClose={() => logic.setIsAddEditModalOpen(false)}
        title={logic.editingLease?.id?.startsWith('lease-') && !logic.leases.some(l => l.id === logic.editingLease?.id) ? "إضافة عقد إيجار محطة جديد" : "تعديل بيانات عقد الإيجار"}
        subtitle="تسجيل تفاصيل العقد، المالك، القيمة السنوية، وتوليد جدول الأقساط والدفعات"
        icon="🏢"
      >
        {logic.editingLease && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', padding: '4px' }}>
            
            <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Station Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  محطة الوقود / الفرع المستأجر *
                </label>
                <select
                  value={logic.editingLease.stationId}
                  onChange={(e) => {
                    const stId = e.target.value;
                    const stMatch = logic.stations.find(s => s.id === stId);
                    logic.setEditingLease({
                      ...logic.editingLease!,
                      stationId: stId,
                      stationName: stMatch?.name || logic.editingLease!.stationName
                    });
                  }}
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
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">⛽ محطة جديدة / بدون ربط مباشر</option>
                  {logic.stations.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Station Name Manual Override if needed */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  مسمى المحطة في السجلات *
                </label>
                <input
                  type="text"
                  value={logic.editingLease.stationName}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, stationName: e.target.value })}
                  placeholder="مثال: محطة النور - فرع طريق المطار..."
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

              {/* Lessor Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  اسم المؤجر / مالك العقار *
                </label>
                <input
                  type="text"
                  value={logic.editingLease.lessorName}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, lessorName: e.target.value })}
                  placeholder="المالك، الشركة العقارية، أو الوكيل..."
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

              {/* Lessor Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  رقم هاتف المالك / المؤجر
                </label>
                <input
                  type="text"
                  value={logic.editingLease.lessorPhone || ''}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, lessorPhone: e.target.value })}
                  placeholder="05xxxxxxxx"
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

              {/* Contract Number in Ejjar */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  رقم العقد في شبكة إيجار (أو رقم العقد الورقي)
                </label>
                <input
                  type="text"
                  value={logic.editingLease.contractNumber}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, contractNumber: e.target.value })}
                  placeholder="مثال: EJR-4491028301"
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

              {/* Annual Rent */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: T.accent, marginBottom: '6px' }}>
                  قيمة الإيجار السنوي الإجمالي (ريال سعودي) *
                </label>
                <input
                  type="number"
                  value={logic.editingLease.annualRent || ''}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, annualRent: Number(e.target.value) })}
                  placeholder="مثال: 180000"
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${T.accent}`,
                    background: T.inputBg,
                    color: T.primary,
                    fontSize: '14px',
                    fontWeight: 900,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  تاريخ بداية سريان العقد *
                </label>
                <input
                  type="date"
                  value={logic.editingLease.startDate}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, startDate: e.target.value })}
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

              {/* End Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.terracotta, marginBottom: '6px' }}>
                  تاريخ نهاية العقد والتجديد *
                </label>
                <input
                  type="date"
                  value={logic.editingLease.endDate}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, endDate: e.target.value })}
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

              {/* Payment Frequency */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: T.primary }}>
                    طريقة ودورية سداد الإيجار:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoInsts = generateDefaultInstallments(
                        logic.editingLease!.startDate,
                        logic.editingLease!.endDate,
                        logic.editingLease!.annualRent,
                        logic.editingLease!.paymentFrequency
                      );
                      logic.setEditingLease({ ...logic.editingLease!, installments: autoInsts });
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: T.accentBg,
                      border: `1px solid ${T.accentBorder}`,
                      color: T.accent,
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ إعادة توليد الأقساط تلقائياً
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['yearly', 'semi_annual', 'quarterly', 'monthly'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        const autoInsts = generateDefaultInstallments(
                          logic.editingLease!.startDate,
                          logic.editingLease!.endDate,
                          logic.editingLease!.annualRent,
                          freq
                        );
                        logic.setEditingLease({
                          ...logic.editingLease!,
                          paymentFrequency: freq,
                          installments: autoInsts
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: logic.editingLease?.paymentFrequency === freq ? `2px solid ${T.accent}` : T.inputBorder,
                        background: logic.editingLease?.paymentFrequency === freq ? T.accentBg : T.inputBg,
                        color: logic.editingLease?.paymentFrequency === freq ? T.accent : T.primary,
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {getFrequencyLabel(freq)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Installments List in Edit Modal */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: T.primary, marginBottom: '6px' }}>
                  جدول الأقساط المعتمدة ({logic.editingLease.installments?.length || 0} دفعات):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {(logic.editingLease.installments || []).map((inst, idx) => (
                    <div
                      key={inst.id || idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.5fr 1fr 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: isDaylight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
                        border: T.cardBorder
                      }}
                    >
                      <input
                        type="text"
                        value={inst.title}
                        onChange={(e) => {
                          const updated = [...logic.editingLease!.installments];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          logic.setEditingLease({ ...logic.editingLease!, installments: updated });
                        }}
                        style={{
                          height: '34px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: T.inputBorder,
                          background: T.inputBg,
                          color: T.primary,
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      />
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => {
                          const updated = [...logic.editingLease!.installments];
                          updated[idx] = { ...updated[idx], dueDate: e.target.value };
                          logic.setEditingLease({ ...logic.editingLease!, installments: updated });
                        }}
                        style={{
                          height: '34px',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: T.inputBorder,
                          background: T.inputBg,
                          color: T.primary,
                          fontSize: '11.5px'
                        }}
                      />
                      <input
                        type="number"
                        value={inst.dueAmount}
                        onChange={(e) => {
                          const updated = [...logic.editingLease!.installments];
                          updated[idx] = {
                            ...updated[idx],
                            dueAmount: Number(e.target.value),
                            remainingAmount: Number(e.target.value) - updated[idx].paidAmount
                          };
                          logic.setEditingLease({ ...logic.editingLease!, installments: updated });
                        }}
                        style={{
                          height: '34px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: T.inputBorder,
                          background: T.inputBg,
                          color: T.accent,
                          fontSize: '12px',
                          fontWeight: 900
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = logic.editingLease!.installments.filter((_, i) => i !== idx);
                          logic.setEditingLease({ ...logic.editingLease!, installments: filtered });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: T.terracotta,
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  ملاحظات وشروط خاصة بالعقد
                </label>
                <textarea
                  value={logic.editingLease.notes || ''}
                  onChange={(e) => logic.setEditingLease({ ...logic.editingLease!, notes: e.target.value })}
                  rows={2}
                  placeholder="شروط الصيانة، فواتير الكهرباء والمياه، التنازل، شروط الإخلاء..."
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

            {/* Modal Buttons */}
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
                onClick={() => logic.handleSaveLease(logic.editingLease!)}
                disabled={logic.isSaving}
                style={{
                  padding: '10px 24px',
                  fontWeight: 900,
                  fontSize: '13.5px',
                  cursor: logic.isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {logic.isSaving ? '⏳ جاري الحفظ...' : '💾 حفظ عقد الإيجار'}
              </button>
            </div>

          </div>
        )}
      </AquaModalWrapper>

      {/* 6. MODAL: RECORD PAYMENT */}
      <AquaModalWrapper
        isOpen={logic.isPaymentModalOpen}
        onClose={() => logic.setIsPaymentModalOpen(false)}
        title={`تسجيل سداد إيجار: ${logic.paymentTargetLease?.stationName || ''}`}
        subtitle={`المالك المستفيد: ${logic.paymentTargetLease?.lessorName || ''} | المتبقي الإجمالي: ${logic.paymentTargetLease?.installments.reduce((s, i) => s + i.remainingAmount, 0).toLocaleString()} ر.س`}
        icon="💵"
      >
        {logic.paymentTargetLease && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px' }}>
            
            {/* Installment Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                اختر الدفعة / القسط المراد سداده:
              </label>
              <select
                value={logic.paymentTargetInstallment?.id || ''}
                onChange={(e) => {
                  const inst = logic.paymentTargetLease?.installments.find(i => i.id === e.target.value);
                  if (inst) {
                    logic.setPaymentTargetInstallment(inst);
                    logic.setPaymentAmountInput(inst.remainingAmount || inst.dueAmount);
                  }
                }}
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
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {logic.paymentTargetLease.installments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.title} - المستحق: {inst.dueAmount.toLocaleString()} ر.س (المتبقي: {inst.remainingAmount.toLocaleString()} ر.س) - موعده: {inst.dueDate}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Amount Input */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: T.success, marginBottom: '6px' }}>
                المبلغ المسدد (ريال سعودي) *
              </label>
              <input
                type="number"
                value={logic.paymentAmountInput || ''}
                onChange={(e) => logic.setPaymentAmountInput(Number(e.target.value))}
                placeholder="أدخل المبلغ المسدد..."
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: `2px solid ${T.success}`,
                  background: T.inputBg,
                  color: T.primary,
                  fontSize: '16px',
                  fontWeight: 900,
                  outline: 'none'
                }}
              />
              {logic.paymentTargetInstallment && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => logic.setPaymentAmountInput(logic.paymentTargetInstallment!.remainingAmount)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: T.successBg,
                      border: `1px solid ${T.successBorder}`,
                      color: T.success,
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    سداد كامل المتبقي ({logic.paymentTargetInstallment.remainingAmount.toLocaleString()} ر.س)
                  </button>
                  <button
                    type="button"
                    onClick={() => logic.setPaymentAmountInput(Math.round(logic.paymentTargetInstallment!.remainingAmount / 2))}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: T.accentBg,
                      border: `1px solid ${T.accentBorder}`,
                      color: T.accent,
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    سداد النصف ({Math.round(logic.paymentTargetInstallment.remainingAmount / 2).toLocaleString()} ر.س)
                  </button>
                </div>
              )}
            </div>

            {/* Payment Date & Method */}
            <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  تاريخ التحويل / السداد *
                </label>
                <input
                  type="date"
                  value={logic.paymentDateInput}
                  onChange={(e) => logic.setPaymentDateInput(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  طريقة السداد *
                </label>
                <select
                  value={logic.paymentMethodInput}
                  onChange={(e) => logic.setPaymentMethodInput(e.target.value as any)}
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
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="bank_transfer">🏦 تحويل بنكي</option>
                  <option value="check">📑 شيك بنكي مصدق</option>
                  <option value="cash">💵 نقداً (كاش)</option>
                  <option value="other">📜 أخرى</option>
                </select>
              </div>

              {/* Reference / Check Number */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  رقم الحوالة / رقم الشيك / الإشعار
                </label>
                <input
                  type="text"
                  value={logic.paymentRefInput}
                  onChange={(e) => logic.setPaymentRefInput(e.target.value)}
                  placeholder="مثال: TRX-9821034 أو شيك 1092"
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

              {/* Bank Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                  البنك المحول منه / المسحوب عليه
                </label>
                <input
                  type="text"
                  value={logic.paymentBankInput}
                  onChange={(e) => logic.setPaymentBankInput(e.target.value)}
                  placeholder="مثال: مصرف الراجحي، الأهلي..."
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
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '6px' }}>
                بيان وملاحظات السداد
              </label>
              <textarea
                value={logic.paymentNotesInput}
                onChange={(e) => logic.setPaymentNotesInput(e.target.value)}
                rows={2}
                placeholder="سداد القسط بموجب إشعار تحويل لحساب المؤجر..."
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

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: T.cardBorder }}>
              <button
                type="button"
                onClick={() => logic.setIsPaymentModalOpen(false)}
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
                onClick={() => logic.handleExecutePayment()}
                disabled={logic.isSaving}
                style={{
                  padding: '10px 24px',
                  fontWeight: 900,
                  fontSize: '13.5px',
                  cursor: logic.isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {logic.isSaving ? '⏳ جاري الحفظ...' : '✅ تأكيد تسجيل السداد'}
              </button>
            </div>

          </div>
        )}
      </AquaModalWrapper>

      {/* 7. MODAL: PAYMENT STATEMENT / HISTORY */}
      <AquaModalWrapper
        isOpen={logic.isStatementModalOpen}
        onClose={() => logic.setIsStatementModalOpen(false)}
        title={`كشف وسجل سدادات: ${logic.statementTargetLease?.stationName || ''}`}
        subtitle={`المؤجر: ${logic.statementTargetLease?.lessorName || ''} | القيمة السنوية: ${logic.statementTargetLease?.annualRent.toLocaleString()} ر.س`}
        icon="📜"
      >
        {logic.statementTargetLease && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', padding: '4px' }}>
            
            {/* Header Totals */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              background: isDaylight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.05)',
              border: T.cardBorder,
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: T.textMuted }}>إجمالي العقد</span>
                <div style={{ fontSize: '16px', fontWeight: 900, color: T.primary }}>
                  {logic.statementTargetLease.annualRent.toLocaleString()} ر.س
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: T.success }}>إجمالي المسدد</span>
                <div style={{ fontSize: '16px', fontWeight: 900, color: T.success }}>
                  {(logic.statementTargetLease.installments || []).reduce((s, i) => s + (i.paidAmount || 0), 0).toLocaleString()} ر.س
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: T.terracotta }}>المتبقي</span>
                <div style={{ fontSize: '16px', fontWeight: 900, color: T.terracotta }}>
                  {(logic.statementTargetLease.installments || []).reduce((s, i) => s + (i.remainingAmount || 0), 0).toLocaleString()} ر.س
                </div>
              </div>
            </div>

            {/* List of Payments */}
            {(() => {
              const allPayments: {
                payment: any;
                installmentTitle: string;
                installmentId: string;
              }[] = [];

              (logic.statementTargetLease.installments || []).forEach((inst) => {
                (inst.payments || []).forEach((pay) => {
                  allPayments.push({
                    payment: pay,
                    installmentTitle: inst.title,
                    installmentId: inst.id
                  });
                });
              });

              if (allPayments.length === 0) {
                return (
                  <div style={{ padding: '30px', textAlign: 'center', color: T.textMuted }}>
                    لم يتم تسجيل أي عمليات سداد لهذا العقد حتى الآن.
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: T.cardBorder }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'right',
                    fontSize: '12.5px'
                  }}>
                    <thead>
                      <tr style={{
                        background: isDaylight ? 'rgba(194, 155, 98, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        borderBottom: T.cardBorder
                      }}>
                        <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>الدفعة</th>
                        <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>تاريخ الدفع</th>
                        <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>المبلغ المسدد</th>
                        <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>الطريقة</th>
                        <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>رقم المرجع / البنك</th>
                        <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary }}>البيان</th>
                        <th style={{ padding: '10px 12px', fontWeight: 900, color: T.primary, textAlign: 'center' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPayments.map((row, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: isDaylight ? '1px solid rgba(194, 155, 98, 0.12)' : '1px solid rgba(255, 255, 255, 0.04)'
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: T.primary }}>
                            {row.installmentTitle}
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                            {row.payment.paymentDate}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 900, color: T.success }}>
                            {Number(row.payment.amount || 0).toLocaleString()} ر.س
                          </td>
                          <td style={{ padding: '10px 12px', color: T.primary }}>
                            {row.payment.paymentMethod === 'bank_transfer' ? '🏦 تحويل بنكي' : (row.payment.paymentMethod === 'check' ? '📑 شيك' : '💵 نقداً')}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '11.5px' }}>
                            <div>{row.payment.referenceNumber || '—'}</div>
                            <div style={{ color: T.textMuted }}>{row.payment.bankName}</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '11.5px', color: T.textMuted }}>
                            {row.payment.notes || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => logic.handleDeletePaymentRecord(logic.statementTargetLease!.id, row.installmentId, row.payment.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: T.terracotta,
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                              title="إلغاء عملية السداد هذه"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Print / Copy Button & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  const text = `📋 كشف سدادات إيجار محطة ${logic.statementTargetLease?.stationName}:\n` +
                    `المالك: ${logic.statementTargetLease?.lessorName}\n` +
                    `قيمة الإيجار: ${logic.statementTargetLease?.annualRent.toLocaleString()} ر.س\n` +
                    `-------------------------\n` +
                    (logic.statementTargetLease?.installments || []).map((inst, i) =>
                      `${i+1}. ${inst.title} - المستحق: ${inst.dueAmount.toLocaleString()} ر.س | المسدد: ${inst.paidAmount.toLocaleString()} ر.س | المتبقي: ${inst.remainingAmount.toLocaleString()} ر.س`
                    ).join('\n');
                  navigator.clipboard?.writeText(text);
                  alert('✅ تم نسخ كشف الحساب للحافظة لمشاركته عبر واتساب!');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: T.accentBg,
                  border: `1px solid ${T.accentBorder}`,
                  color: T.accent,
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                📋 نسخ الكشف للواتساب
              </button>

              <button
                type="button"
                className="btn-main-glass gold desert-btn-primary"
                onClick={() => logic.setIsStatementModalOpen(false)}
                style={{ padding: '10px 22px', fontWeight: 900, fontSize: '13px' }}
              >
                إغلاق
              </button>
            </div>

          </div>
        )}
      </AquaModalWrapper>
    </>
  );
}
