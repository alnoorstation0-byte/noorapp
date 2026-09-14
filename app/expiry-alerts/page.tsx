"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import LoadingScreen from '@/components/LoadingScreen';
import { useLanguage } from '@/lib/LanguageContext';
import { useExpiryAlertsLogic, ExpiryItem } from './expiry_alerts_logic';
import Link from 'next/link';

export default function ExpiryAlertsPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const logic = useExpiryAlertsLogic();

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val || 0);
  };

  const getStatusBadge = (item: ExpiryItem) => {
    if (item.status === 'expired') {
      return (
        <span style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#b91c1c',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 900,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⛔</span>
          <span>{isEn ? 'Expired' : 'منتهي الصلاحية'}</span>
        </span>
      );
    }
    if (item.status === 'critical') {
      return (
        <span style={{
          background: 'rgba(249, 115, 22, 0.15)',
          color: '#c2410c',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 900,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⏳</span>
          <span>{isEn ? `Critical (${item.days_left}d)` : `حرج (${item.days_left} يوم)`}</span>
        </span>
      );
    }
    if (item.status === 'warning') {
      return (
        <span style={{
          background: 'rgba(234, 179, 8, 0.15)',
          color: '#854d0e',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⚠️</span>
          <span>{isEn ? `Warning (${item.days_left}d)` : `تنبيه مبكر (${item.days_left} يوم)`}</span>
        </span>
      );
    }
    if (item.status === 'safe') {
      return (
        <span style={{
          background: 'rgba(78, 115, 79, 0.15)',
          color: '#4E734F',
          border: '1px solid rgba(78, 115, 79, 0.3)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>🟢</span>
          <span>{isEn ? `Safe (${item.days_left}d)` : `آمن (${item.days_left} يوم)`}</span>
        </span>
      );
    }
    return (
      <span style={{
        background: 'rgba(100, 116, 139, 0.1)',
        color: '#64748b',
        border: '1px solid rgba(100, 116, 139, 0.25)',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 700
      }}>
        {isEn ? 'Not Set' : 'غير محدد'}
      </span>
    );
  };

  return (
    <MasterPage
      title={isEn ? 'Inventory Expiry Tracking' : 'مراقبة الصلاحيات وإنذارات البضاعة'}
      subtitle={isEn ? 'Smart monitoring of expired and soon-to-expire goods' : 'نظام الرقابة المبكرة على البضائع المنتهية وتلك التي أوشكت على الانتهاء'}
      icon="⏳"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1. Header Alert Banner if expired items exist */}
        {logic.metrics.expiredCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>🚨</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#b91c1c' }}>
                  {isEn ? 'Urgent Alert: Expired Goods in Stock!' : 'إنذار عاجل: توجد بضائع منتهية الصلاحية بالمستودع!'}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#991b1b', fontWeight: 700 }}>
                  {isEn 
                    ? `Found ${logic.metrics.expiredCount} expired items with estimated loss of ${formatMoney(logic.metrics.expiredLoss)}. Please withdraw or write-off.`
                    : `يوجد ${logic.metrics.expiredCount} أصناف منتهية الصلاحية بقيمة تقديرية ${formatMoney(logic.metrics.expiredLoss)}. يرجى سحبها أو تسجيل محضر إتلاف.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logic.setStatusFilter('expired')}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
              }}
            >
              {isEn ? 'Filter Expired Only 🔍' : 'عرض المنتهي فوراً 🔍'}
            </button>
          </div>
        )}

        {/* 2. Top KPI Cards (Desert Glassmorphism) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}>
          {/* Expired Card */}
          <div 
            onClick={() => logic.setStatusFilter('expired')}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%)',
              backdropFilter: 'blur(24px) saturate(160%)',
              border: logic.statusFilter === 'expired' ? '2px solid #ef4444' : '1px solid rgba(194, 155, 98, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(44, 26, 18, 0.08)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#b91c1c' }}>
                {isEn ? '🔴 Expired Goods' : '🔴 منتهية الصلاحية'}
              </span>
              <span style={{ fontSize: '20px' }}>⛔</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#b91c1c', marginTop: '6px' }}>
              {logic.metrics.expiredCount} <span style={{ fontSize: '13px' }}>{isEn ? 'items' : 'صنف'}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 700, marginTop: '4px' }}>
              {isEn ? 'Loss: ' : 'الخسارة المقدرة: '}{formatMoney(logic.metrics.expiredLoss)}
            </div>
          </div>

          {/* Critical (Expiring Soon <= 30d) */}
          <div 
            onClick={() => logic.setStatusFilter('critical')}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%)',
              backdropFilter: 'blur(24px) saturate(160%)',
              border: logic.statusFilter === 'critical' ? '2px solid #f97316' : '1px solid rgba(194, 155, 98, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(44, 26, 18, 0.08)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#c2410c' }}>
                {isEn ? '🟠 Critical (<= 30 Days)' : '🟠 أوشكت على الانتهاء (حرج)'}
              </span>
              <span style={{ fontSize: '20px' }}>⏳</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#c2410c', marginTop: '6px' }}>
              {logic.metrics.criticalCount} <span style={{ fontSize: '13px' }}>{isEn ? 'items' : 'صنف'}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700, marginTop: '4px' }}>
              {isEn ? 'At risk value: ' : 'قيمة البضاعة المعرضة: '}{formatMoney(logic.metrics.criticalLoss)}
            </div>
          </div>

          {/* Warning (31 - 90d) */}
          <div 
            onClick={() => logic.setStatusFilter('warning')}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%)',
              backdropFilter: 'blur(24px) saturate(160%)',
              border: logic.statusFilter === 'warning' ? '2px solid #eab308' : '1px solid rgba(194, 155, 98, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(44, 26, 18, 0.08)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#854d0e' }}>
                {isEn ? '🟡 Warning (31-90 Days)' : '🟡 تنبيه مبكر (31 - 90 يوم)'}
              </span>
              <span style={{ fontSize: '20px' }}>⚠️</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#854d0e', marginTop: '6px' }}>
              {logic.metrics.warningCount} <span style={{ fontSize: '13px' }}>{isEn ? 'items' : 'صنف'}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 700, marginTop: '4px' }}>
              {isEn ? 'Priority for sales' : 'أولوية للبيع والتوزيع'}
            </div>
          </div>

          {/* Safe (> 90d) */}
          <div 
            onClick={() => logic.setStatusFilter('safe')}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%)',
              backdropFilter: 'blur(24px) saturate(160%)',
              border: logic.statusFilter === 'safe' ? '2px solid #4E734F' : '1px solid rgba(194, 155, 98, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(44, 26, 18, 0.08)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#4E734F' }}>
                {isEn ? '🟢 Safe (> 90 Days)' : '🟢 صلاحية آمنة (+90 يوم)'}
              </span>
              <span style={{ fontSize: '20px' }}>🛡️</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#4E734F', marginTop: '6px' }}>
              {logic.metrics.safeCount} <span style={{ fontSize: '13px' }}>{isEn ? 'items' : 'صنف'}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 700, marginTop: '4px' }}>
              {isEn ? 'Good condition' : 'حالة ممتازة'}
            </div>
          </div>
        </div>

        {/* 3. Toolbar & Filters */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.8) 0%, rgba(255, 253, 250, 0.45) 100%)',
          backdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(194, 155, 98, 0.3)',
          borderRadius: '16px',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <input
              type="text"
              placeholder={isEn ? 'Search item name, barcode, batch #...' : 'ابحث باسم الصنف، الباركود، أو رقم التشغيلة...'}
              value={logic.searchTerm}
              onChange={(e) => logic.setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(194, 155, 98, 0.35)',
                background: '#FDFBF7',
                color: '#2C1A12',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none'
              }}
            />
          </div>

          {/* Warehouse Selector */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={logic.selectedWarehouseId}
              onChange={(e) => logic.setSelectedWarehouseId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(194, 155, 98, 0.35)',
                background: '#FDFBF7',
                color: '#2C1A12',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none'
              }}
            >
              <option value="all">{isEn ? '🏢 All Warehouses' : '🏢 كافة المستودعات'}</option>
              {logic.warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: isEn ? 'All' : 'الكل' },
              { id: 'expired', label: isEn ? '🔴 Expired' : '🔴 منتهي' },
              { id: 'critical', label: isEn ? '🟠 Critical' : '🟠 حرج' },
              { id: 'warning', label: isEn ? '🟡 Warning' : '🟡 مبكر' },
              { id: 'safe', label: isEn ? '🟢 Safe' : '🟢 آمن' },
              { id: 'no_date', label: isEn ? '⚪ No Date' : '⚪ بدون تاريخ' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => logic.setStatusFilter(tab.id as any)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: logic.statusFilter === tab.id ? '#C29B62' : 'rgba(194, 155, 98, 0.12)',
                  color: logic.statusFilter === tab.id ? '#fff' : '#2C1A12',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={logic.exportToExcel}
            style={{
              padding: '9px 16px',
              borderRadius: '12px',
              border: 'none',
              background: '#4E734F',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(78, 115, 79, 0.25)'
            }}
          >
            <span>📊</span>
            <span>{isEn ? 'Export Excel' : 'تصدير إكسل'}</span>
          </button>
        </div>

        {/* 4. Table Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.8) 0%, rgba(255, 253, 250, 0.45) 100%)',
          backdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(194, 155, 98, 0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(44, 26, 18, 0.08)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
              <thead>
                <tr style={{
                  background: 'rgba(44, 26, 18, 0.04)',
                  borderBottom: '1.5px solid rgba(194, 155, 98, 0.25)',
                  color: '#2C1A12'
                }}>
                  <th style={{ padding: '12px 14px', fontWeight: 900 }}>{isEn ? 'Item Code & Name' : 'كود واسم الصنف'}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 900 }}>{isEn ? 'Batch #' : 'رقم التشغيلة'}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 900 }}>{isEn ? 'Stock' : 'الرصيد المتوفر'}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 900 }}>{isEn ? 'Expiry Date' : 'تاريخ الانتهاء'}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 900 }}>{isEn ? 'Days Left' : 'الأيام المتبقية'}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 900 }}>{isEn ? 'Status' : 'حالة الصلاحية'}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 900 }}>{isEn ? 'Potential Loss' : 'الخسارة المحتملة'}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 900, textAlign: 'center' }}>{isEn ? 'Actions' : 'إجراءات سريعة'}</th>
                </tr>
              </thead>
              <tbody>
                {logic.isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center' }}>
                      <LoadingScreen text={isEn ? 'Loading expiry data...' : 'جارٍ فحص صلاحيات البضاعة...'} />
                    </td>
                  </tr>
                ) : logic.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 800 }}>
                      {isEn ? 'No items found matching the selected filter 🎉' : 'لا توجد أصناف مطابقة للفلتر المحدد حالياً 🎉'}
                    </td>
                  </tr>
                ) : (
                  logic.items.map((item) => {
                    const isExp = item.status === 'expired';
                    const isCrit = item.status === 'critical';

                    return (
                      <tr 
                        key={item.id}
                        style={{
                          borderBottom: '1px solid rgba(194, 155, 98, 0.15)',
                          background: isExp ? 'rgba(239, 68, 68, 0.04)' : (isCrit ? 'rgba(249, 115, 22, 0.03)' : 'transparent'),
                          transition: 'background 0.2s'
                        }}
                      >
                        {/* Item Code & Name */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 900, color: '#2C1A12', fontSize: '13px' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 700 }}>
                            {item.code ? `كود: ${item.code}` : ''} {item.barcode ? `| باركود: ${item.barcode}` : ''}
                          </div>
                        </td>

                        {/* Batch # */}
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2C1A12' }}>
                          {item.batch_number ? (
                            <span style={{ background: 'rgba(194, 155, 98, 0.12)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                              {item.batch_number}
                            </span>
                          ) : '-'}
                        </td>

                        {/* Stock Available */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 900, color: item.available_qty > 0 ? '#4E734F' : '#b91c1c' }}>
                            {item.available_qty} {item.unit}
                          </span>
                        </td>

                        {/* Expiry Date */}
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: isExp ? '#b91c1c' : (isCrit ? '#c2410c' : '#2C1A12') }}>
                          {item.expiry_date || (
                            <span style={{ color: 'rgba(44, 26, 18, 0.4)' }}>{isEn ? 'Not specified' : 'غير محدد'}</span>
                          )}
                        </td>

                        {/* Days Left */}
                        <td style={{ padding: '12px 14px' }}>
                          {item.days_left !== null ? (
                            <span style={{
                              fontWeight: 900,
                              color: isExp ? '#b91c1c' : (isCrit ? '#c2410c' : (item.days_left <= 90 ? '#854d0e' : '#4E734F'))
                            }}>
                              {item.days_left <= 0 ? (isEn ? `Expired ${Math.abs(item.days_left)}d ago` : `منتهي منذ ${Math.abs(item.days_left)} يوم`) : `${item.days_left} يوم`}
                            </span>
                          ) : '-'}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '12px 14px' }}>
                          {getStatusBadge(item)}
                        </td>

                        {/* Potential Loss */}
                        <td style={{ padding: '12px 14px', fontWeight: 900, color: item.potential_loss > 0 ? '#b91c1c' : 'rgba(44, 26, 18, 0.6)' }}>
                          {item.potential_loss > 0 ? formatMoney(item.potential_loss) : '-'}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {/* Edit / Set Date */}
                            <button
                              type="button"
                              onClick={() => logic.openEditModal(item)}
                              title={isEn ? 'Edit Expiry Date' : 'تعديل تاريخ الصلاحية والتشغيلة'}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(194, 155, 98, 0.3)',
                                background: 'rgba(194, 155, 98, 0.12)',
                                color: '#2C1A12',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              ⏳ {isEn ? 'Edit' : 'تحديد'}
                            </button>

                            {/* Create Promotion (if critical or warning) */}
                            {(isCrit || item.status === 'warning') && (
                              <Link
                                href={`/promotions?item_id=${item.id}`}
                                title={isEn ? 'Create Promotion to sell fast' : 'إنشاء عرض ترويجي لتصريف البضاعة'}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                🎁 {isEn ? 'Promote' : 'عرض ترويجي'}
                              </Link>
                            )}

                            {/* Disposal / Write-off if expired */}
                            {isExp && (
                              <Link
                                href={`/inventory/transactions?action=disposal&item_id=${item.id}`}
                                title={isEn ? 'Inventory Write-off (Disposal)' : 'تسجيل إتلاف مخزني'}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#dc2626',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                🗑️ {isEn ? 'Disposal' : 'إتلاف'}
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logic.totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: '1px solid rgba(194, 155, 98, 0.2)'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 700 }}>
                {isEn ? `Showing ${logic.items.length} of ${logic.allFilteredCount} items` : `عرض ${logic.items.length} من إجمالي ${logic.allFilteredCount} صنف`}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  disabled={logic.currentPage <= 1}
                  onClick={() => logic.setCurrentPage(p => p - 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(194, 155, 98, 0.3)',
                    background: logic.currentPage <= 1 ? '#f1f5f9' : '#fff',
                    color: '#2C1A12',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: logic.currentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isEn ? 'Previous' : 'السابق'}
                </button>
                <span style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 800, color: '#C29B62' }}>
                  {logic.currentPage} / {logic.totalPages}
                </span>
                <button
                  type="button"
                  disabled={logic.currentPage >= logic.totalPages}
                  onClick={() => logic.setCurrentPage(p => p + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(194, 155, 98, 0.3)',
                    background: logic.currentPage >= logic.totalPages ? '#f1f5f9' : '#fff',
                    color: '#2C1A12',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: logic.currentPage >= logic.totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isEn ? 'Next' : 'التالي'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. Edit Expiry Modal */}
        {logic.isEditModalOpen && logic.selectedItemForEdit && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(44, 26, 18, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.96) 0%, rgba(255, 253, 250, 0.92) 100%)',
              border: '1.5px solid rgba(194, 155, 98, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px rgba(44, 26, 18, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>⏳</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#2C1A12' }}>
                      {isEn ? 'Update Expiry Date' : 'تحديد / تعديل تاريخ الصلاحية'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 700 }}>
                      {logic.selectedItemForEdit.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => logic.setIsEditModalOpen(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontWeight: 900
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Expiry Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#2C1A12', marginBottom: '6px' }}>
                    {isEn ? 'Expiry Date *' : 'تاريخ انتهاء الصلاحية *'}
                  </label>
                  <input
                    type="date"
                    value={logic.editExpiryDate}
                    onChange={(e) => logic.setEditExpiryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(194, 155, 98, 0.35)',
                      background: '#FDFBF7',
                      color: '#2C1A12',
                      fontSize: '13px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Batch / Lot Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#2C1A12', marginBottom: '6px' }}>
                    {isEn ? 'Batch / Lot Number (Optional)' : 'رقم التشغيلة / الدفعة (اختياري)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-2026-09"
                    value={logic.editBatchNumber}
                    onChange={(e) => logic.setEditBatchNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(194, 155, 98, 0.35)',
                      background: '#FDFBF7',
                      color: '#2C1A12',
                      fontSize: '12px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Alert Before Days */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#2C1A12', marginBottom: '6px' }}>
                    {isEn ? 'Alert Days in Advance' : 'تنبيه مسبق قبل كم يوم؟'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={logic.editAlertDays}
                    onChange={(e) => logic.setEditAlertDays(Number(e.target.value) || 30)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(194, 155, 98, 0.35)',
                      background: '#FDFBF7',
                      color: '#2C1A12',
                      fontSize: '13px',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '10.5px', color: 'rgba(44, 26, 18, 0.5)', marginTop: '4px', display: 'block' }}>
                    {isEn ? 'System will trigger an alert when days left reaches this threshold' : 'سيتم إرسال تنبيه في الإشعارات والكاشير عند وصول المتبقي لهذا العدد'}
                  </span>
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    disabled={logic.isSaving}
                    onClick={logic.handleSaveExpiry}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: logic.isSaving ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(168, 87, 60, 0.25)'
                    }}
                  >
                    {logic.isSaving ? (isEn ? 'Saving...' : 'جارٍ الحفظ...') : (isEn ? 'Save Expiry Date ✓' : 'حفظ تاريخ الصلاحية ✓')}
                  </button>
                  <button
                    type="button"
                    onClick={() => logic.setIsEditModalOpen(false)}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '12px',
                      border: '1px solid rgba(194, 155, 98, 0.3)',
                      background: 'transparent',
                      color: '#2C1A12',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {isEn ? 'Cancel' : 'إلغاء'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MasterPage>
  );
}
