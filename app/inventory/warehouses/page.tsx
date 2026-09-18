"use client";
import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import { useWarehousesLogic } from './warehouses_logic';
import RawasiSmartTable from '@/components/rawasismarttable';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { useThemeMode } from '@/lib/ThemeContext';

export default function WarehousesPage() {
  const logic = useWarehousesLogic();
  const { isDaylight } = useThemeMode();
  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'tanks' | 'pumps'>('info');

  // ألوان ديناميكية حسب الوضع (نهاري كريستالي ناصع / ليلي)
  const T = {
    text: isDaylight ? '#0F172A' : '#F8FAFC',
    textMuted: isDaylight ? '#475569' : '#94A3B8',
    accent: isDaylight ? '#D97706' : '#00E5FF',
    accentBg: isDaylight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 229, 255, 0.12)',
    accentBorder: isDaylight ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 229, 255, 0.3)',
    accentHoverBg: isDaylight ? 'rgba(245, 158, 11, 0.18)' : 'rgba(0, 229, 255, 0.18)',
    accentBorderStrong: isDaylight ? 'rgba(245, 158, 11, 0.45)' : 'rgba(0, 229, 255, 0.4)',
    success: isDaylight ? '#059669' : '#10B981',
    successBg: isDaylight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(16, 185, 129, 0.12)',
    successBorder: isDaylight ? 'rgba(5, 150, 105, 0.3)' : 'rgba(16, 185, 129, 0.3)',
    warn: isDaylight ? '#EA580C' : '#F59E0B',
    warnBg: isDaylight ? 'rgba(234, 88, 12, 0.1)' : 'rgba(245, 158, 11, 0.18)',
    warnBorder: isDaylight ? 'rgba(234, 88, 12, 0.35)' : 'rgba(245, 158, 11, 0.4)',
    chipBg: isDaylight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.05)',
    chipBorder: isDaylight ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.12)',
    cardBg: isDaylight ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.92) 100%)' : 'rgba(255, 255, 255, 0.03)',
    cardBorder: isDaylight ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255, 255, 255, 0.08)',
    divider: isDaylight ? 'rgba(226, 232, 240, 0.9)' : 'rgba(255, 255, 255, 0.1)',
    shadow: isDaylight ? '0 4px 20px rgba(15, 23, 42, 0.05)' : '0 8px 20px rgba(0, 229, 255, 0.25)',
    tabInactiveBg: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
    tabInactiveBorder: isDaylight ? 'rgba(226, 232, 240, 0.9)' : 'rgba(255, 255, 255, 0.1)',
    badgeDark: isDaylight ? '#0F172A' : '#0B0E14',
  };

  // ألوان أنواع الوقود
  const fuelColor = (fuelType: string) => {
    if (fuelType?.includes('95')) return isDaylight ? '#A8573C' : '#f87171';
    if (fuelType?.includes('ديزل')) return isDaylight ? '#B8860B' : '#fbbf24';
    return T.accent;
  };

  const columns = [
    { 
      key: 'name', 
      label: 'اسم محطة الوقود', 
      sortable: true,
      render: (row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontWeight: 900, color: T.text, fontSize: '13.5px' }}>{row.name}</span>
          <span style={{ fontSize: '11px', color: T.textMuted }}>{row.location || 'الفرع الرئيسي'}</span>
        </div>
      )
    },
    { 
      key: 'type', 
      label: 'النوع', 
      sortable: true, 
      render: (row: any) => {
        if (row.type === 'main') return <span style={{ color: T.accent, fontWeight: 'bold' }}>محطة رئيسية ⛽</span>;
        if (row.type === 'vehicle') return <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>صهريج محروقات 🚛</span>;
        if (row.type === 'pos') return <span style={{ color: '#eab308', fontWeight: 'bold' }}>محطة ومضخات ⛽</span>;
        return <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>خزان فرعي / أرضي</span>;
      } 
    },
    {
      key: 'tanks',
      label: 'خزانات الوقود (السعة والنوع)',
      render: (row: any) => {
        const tanks = row.tanks || [];
        if (tanks.length === 0) {
          return <span style={{ color: T.textMuted, fontSize: '11.5px' }}>لا توجد خزانات مسجلة</span>;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ 
                fontWeight: 900, 
                fontSize: '11.5px', 
                color: T.success, 
                background: T.successBg, 
                padding: '2px 8px', 
                borderRadius: '8px', 
                border: `1px solid ${T.successBorder}` 
              }}>
                {tanks.length} {tanks.length === 1 ? 'خزان' : 'خزانات'} ({Number(row.totalTanksCapacity || 0).toLocaleString()} لتر)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {tanks.map((t: any, idx: number) => (
                <span 
                  key={idx} 
                  style={{ 
                    fontSize: '10.5px', 
                    background: T.chipBg, 
                    border: `1px solid ${T.chipBorder}`, 
                    padding: '2px 6px', 
                    borderRadius: '6px',
                    color: T.text
                  }}
                  title={`السعة: ${Number(t.capacity_liters || 0).toLocaleString()} لتر`}
                >
                  {t.tank_number}: <strong style={{ color: fuelColor(t.fuel_type) }}>{t.fuel_type}</strong> ({Number(t.capacity_liters || 0).toLocaleString()} لتر)
                </span>
              ))}
            </div>
          </div>
        );
      }
    },
    {
      key: 'pumps',
      label: 'مضخات الوقود وتوزيع البنزين',
      render: (row: any) => {
        const pumps = row.pumps || [];
        if (pumps.length === 0) {
          return <span style={{ color: T.textMuted, fontSize: '11.5px' }}>لا توجد مضخات مضافة</span>;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ 
                fontWeight: 900, 
                fontSize: '11.5px', 
                color: T.accent, 
                background: T.accentBg, 
                padding: '2px 8px', 
                borderRadius: '8px', 
                border: `1px solid ${T.accentBorder}` 
              }}>
                {pumps.length} {pumps.length === 1 ? 'مضخة' : 'مضخات'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {pumps.map((p: any) => (
                <span 
                  key={p.id} 
                  style={{ 
                    fontSize: '10.5px', 
                    background: T.chipBg, 
                    border: `1px solid ${T.chipBorder}`, 
                    padding: '2px 6px', 
                    borderRadius: '6px',
                    color: T.text
                  }}
                  title={`قراءة العداد: ${Number(p.current_meter || 0).toLocaleString()} لتر`}
                >
                  مضخة {p.pump_number}: <strong style={{ color: fuelColor(p.fuel_type) }}>{p.fuel_type}</strong>
                </span>
              ))}
            </div>
          </div>
        );
      }
    },
    { key: 'manager_name', label: 'مشغل المحطة / المسؤول', render: (row: any) => row.manager_name || row.phone || '---' },
    { 
      key: 'is_active', 
      label: 'الحالة', 
      sortable: true, 
      render: (row: any) => (
        <span style={{
          padding: '3px 8px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 800,
          background: row.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: row.is_active ? '#10B981' : '#f87171',
          border: `1px solid ${row.is_active ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
        }}>
          {row.is_active ? 'نشطة ✅' : 'غير نشطة'}
        </span>
      )
    },
    { 
      key: 'actions', 
      label: 'إجراءات', 
      type: 'actions', 
      render: (row: any) => (
        <div className="table-actions-container" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '6px', justifyContent: 'center', alignItems: 'center', minWidth: '135px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); logic.handleEdit(row); setActiveModalTab('info'); }} 
            className="table-action-btn edit-btn" 
            style={{
              background: T.accentBg,
              color: T.accent,
              border: `1px solid ${T.accentBorder}`,
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            ✏️ تهيئة المحطة
          </button>
          {row.type !== 'main' && (
            <button 
              onClick={(e) => { e.stopPropagation(); logic.handleDelete(row.id); }} 
              className="table-action-btn delete-btn" 
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              🗑️
            </button>
          )}
        </div>
      )
    }
  ];

  // إحصائيات سريعة للخزانات والمضخات عبر كافة المحطات
  const totalTanksInSystem = logic.warehouses.reduce((acc, w) => acc + (w.tanksCount || 0), 0);
  const totalPumpsInSystem = logic.warehouses.reduce((acc, w) => acc + (w.pumpsCount || 0), 0);

  return (
    <>
      {/* CSS لتجاوب الجوال وتجاوزات الثيم النهاري */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .wh-tank-row { grid-template-columns: 1fr 1fr !important; }
          .wh-pump-row { grid-template-columns: 1fr 1fr !important; }
          .wh-info-grid { grid-template-columns: 1fr !important; }
        }
        .daylight-theme .summary-glass-card {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.9) 0%, rgba(250, 246, 240, 0.75) 100%) !important;
          border: 1px solid rgba(194, 155, 98, 0.25) !important;
          box-shadow: 0 2px 8px rgba(44, 26, 18, 0.06) !important;
        }
      `}} />
      <RawasiSidebarManager 
        summary={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="summary-glass-card" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: T.textMuted }}>إجمالي محطات الوقود ⛽</span>
              <div className="val" style={{ fontSize: '22px', fontWeight: 900, color: T.text, marginTop: '4px' }}>
                {logic.warehouses?.length || 0} محطة
              </div>
            </div>
            <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '8px' }}>
              <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: T.success }}>إجمالي الخزانات 🛢️</span>
                <div className="val" style={{ fontSize: '18px', fontWeight: 900, color: T.success }}>
                  {totalTanksInSystem} خزان
                </div>
              </div>
              <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: T.accent }}>إجمالي المضخات 📟</span>
                <div className="val" style={{ fontSize: '18px', fontWeight: 900, color: T.accent }}>
                  {totalPumpsInSystem} مضخة
                </div>
              </div>
            </div>
          </div>
        }
        actions={
          <button 
            type="button" 
            className="btn-main-glass gold desert-btn-primary"
            onClick={() => { logic.handleAddNew(); setActiveModalTab('info'); }}
            style={{ width: '100%', minHeight: '44px', fontWeight: 900 }}
          >
            <span>➕</span>
            <span>إضافة محطة وقود جديدة</span>
          </button>
        }
        watchDeps={[logic.warehouses?.length, totalTanksInSystem, totalPumpsInSystem]}
      />

      <div className="clean-page">
        <MasterPage 
          icon="⛽"
          title="إدارة محطات الوقود والخزانات والمضخات" 
          subtitle="تحديد عدد الخزانات والمضخات لكل محطة وتخصيص نوع الوقود وسعة اللترات لكل منها"
        >
          {/* 🌟 شريط التحكم والعمليات الرئيسي بتصميم الزجاج الصحراوي */}
          <div className="desert-glass" style={{
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: T.accentBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                border: `1px solid ${T.accentBorder}`
              }}>
                ⛽
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: T.text }}>
                  شبكة محطات الوقود وتجهيزات الضخ
                </h3>
                <span style={{ fontSize: '12px', color: T.textMuted, fontWeight: 700 }}>
                  {logic.warehouses.length} محطة مسجلة | {totalTanksInSystem} خزان وقود | {totalPumpsInSystem} مضخة تعبئة نشطة
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedIds.length > 0 && (
                <button 
                  className="btn-main-glass red" 
                  onClick={() => {
                    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} محطة؟`)) {
                      selectedIds.forEach(id => {
                        const row = logic.warehouses.find((w: any) => w.id === id);
                        if (row && row.type !== 'main') logic.handleDelete(id);
                      });
                      setSelectedIds([]);
                    }
                  }}
                >
                  🗑️ حذف المحدد ({selectedIds.length})
                </button>
              )}
              <button 
                type="button"
                className="btn-main-glass gold desert-btn-primary" 
                onClick={() => { logic.handleAddNew(); setActiveModalTab('info'); }}
                style={{
                  minHeight: '46px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 900,
                  boxShadow: T.shadow,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>➕</span>
                <span>إضافة محطة وقود جديدة</span>
              </button>
            </div>
          </div>

          <div className="clickable-rows cinematic-scroll">
            <RawasiSmartTable 
              columns={columns} 
              data={logic.warehouses} 
              selectable={true} 
              selectedIds={selectedIds} 
              onSelectionChange={setSelectedIds} 
            />
          </div>
        </MasterPage>
      </div>

      {/* 🚀 نافذة تهيئة المحطة وخزاناتها ومضخاتها المتطورة */}
      {logic.isModalOpen && (
        <AquaModalWrapper
          isOpen={logic.isModalOpen}
          onClose={() => logic.setIsModalOpen(false)}
          title={logic.currentRecord.id ? `تهيئة محطة: ${logic.currentRecord.name || ''}` : 'إضافة محطة وقود جديدة'}
          icon="⛽"
          width="880px"
        >
          {/* تبويبات التنقل داخل النافذة */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: `1px solid ${T.divider}`,
            paddingBottom: '12px',
            marginBottom: '18px',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={() => setActiveModalTab('info')}
              style={{
                background: activeModalTab === 'info' ? T.accentHoverBg : T.tabInactiveBg,
                color: activeModalTab === 'info' ? T.accent : T.textMuted,
                border: `1px solid ${activeModalTab === 'info' ? T.accentBorderStrong : T.tabInactiveBorder}`,
                padding: '8px 16px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              🏢 بيانات المحطة الأساسية
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('tanks')}
              style={{
                background: activeModalTab === 'tanks' ? T.successBg : T.tabInactiveBg,
                color: activeModalTab === 'tanks' ? T.success : T.textMuted,
                border: `1px solid ${activeModalTab === 'tanks' ? T.successBorder : T.tabInactiveBorder}`,
                padding: '8px 16px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🛢️ خزانات الوقود</span>
              <span style={{ background: T.success, color: isDaylight ? '#FDFBF7' : '#0B0E14', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 900 }}>
                {logic.currentRecord.tanks?.length || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('pumps')}
              style={{
                background: activeModalTab === 'pumps' ? T.warnBg : T.tabInactiveBg,
                color: activeModalTab === 'pumps' ? T.warn : T.textMuted,
                border: `1px solid ${activeModalTab === 'pumps' ? T.warnBorder : T.tabInactiveBorder}`,
                padding: '8px 16px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📟 مضخات الوقود</span>
              <span style={{ background: T.warn, color: isDaylight ? '#FDFBF7' : '#0B0E14', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 900 }}>
                {logic.currentRecord.pumps?.length || 0}
              </span>
            </button>
          </div>

          {/* التبويب الأول: بيانات المحطة الأساسية */}
          {activeModalTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="wh-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم المحطة</label>
                  <input 
                    type="text" 
                    className="glass-input-field" 
                    style={{ width: '100%' }}
                    placeholder="مثال: محطة النور - فرع الصحافة"
                    value={logic.currentRecord.name || ''}
                    onChange={e => logic.setCurrentRecord({ ...logic.currentRecord, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نوع المحطة / المنشأة</label>
                  <select 
                    className="glass-input-field" 
                    style={{ width: '100%' }}
                    value={logic.currentRecord.type || 'pos'}
                    onChange={e => logic.setCurrentRecord({ ...logic.currentRecord, type: e.target.value })}
                    disabled={logic.currentRecord.type === 'main'}
                  >
                    <option value="main">محطة رئيسية مركزية ⛽</option>
                    <option value="pos">محطة وقود ومضخات (POS) ⛽</option>
                    <option value="sub">خزان فرعي / أرضي 🛢️</option>
                    <option value="vehicle">صهريج نقل محروقات 🚛</option>
                  </select>
                </div>
              </div>

              <div className="wh-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>الموقع / العنوان</label>
                  <input 
                    type="text" 
                    className="glass-input-field" 
                    style={{ width: '100%' }}
                    placeholder="المدينة، الحي، الشارع"
                    value={logic.currentRecord.location || ''}
                    onChange={e => logic.setCurrentRecord({ ...logic.currentRecord, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>رقم الهاتف / الطوارئ</label>
                  <input 
                    type="text" 
                    className="glass-input-field" 
                    style={{ width: '100%' }}
                    placeholder="05XXXXXXXX"
                    value={logic.currentRecord.phone || ''}
                    onChange={e => logic.setCurrentRecord({ ...logic.currentRecord, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="wh-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>مشغل المحطة / المسؤول</label>
                  <input 
                    type="text" 
                    className="glass-input-field" 
                    style={{ width: '100%' }}
                    placeholder="اسم مدير المحطة"
                    value={logic.currentRecord.manager_name || ''}
                    onChange={e => logic.setCurrentRecord({ ...logic.currentRecord, manager_name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={logic.currentRecord.is_active}
                      onChange={e => logic.setCurrentRecord({ ...logic.currentRecord, is_active: e.target.checked })}
                    />
                    <span style={{ fontWeight: 'bold', color: T.accent }}>المحطة نشطة وتستقبل عمليات البيع</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ملاحظات عامة عن المحطة</label>
                <textarea 
                  className="glass-input-field" 
                  style={{ width: '100%' }}
                  rows={2}
                  placeholder="أي معلومات إضافية أو تعليمات خاصة بالمحطة"
                  value={logic.currentRecord.notes || ''}
                  onChange={e => logic.setCurrentRecord({ ...logic.currentRecord, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* التبويب الثاني: خزانات الوقود التابعة للمحطة */}
          {activeModalTab === 'tanks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, color: T.success, fontSize: '15px', fontWeight: 900 }}>
                    🛢️ الخزانات الأرضية التابعة للمحطة
                  </h4>
                  <span style={{ fontSize: '11.5px', color: T.textMuted }}>
                    حدد نوع الوقود وسعة كل خزان لاستيعاب الشحنات والتوريدات
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logic.handleAddTank}
                  style={{
                    background: T.successBg,
                    color: T.success,
                    border: `1px solid ${T.successBorder}`,
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  ➕ إضافة خزان جديد
                </button>
              </div>

              {(!logic.currentRecord.tanks || logic.currentRecord.tanks.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: T.textMuted }}>
                  لا توجد خزانات مضافة لهذه المحطة بعد. انقر على &quot;إضافة خزان جديد&quot; للبدء.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {logic.currentRecord.tanks.map((tank: any, idx: number) => (
                    <div 
                      key={idx}
                      className="wh-tank-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 140px 44px',
                        gap: '10px',
                        alignItems: 'center',
                        background: T.cardBg,
                        border: `1px solid ${T.cardBorder}`,
                        padding: '10px 14px',
                        borderRadius: '16px'
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>رقم / كود الخزان</label>
                        <input
                          type="text"
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={tank.tank_number || ''}
                          onChange={e => logic.handleUpdateTank(idx, 'tank_number', e.target.value)}
                          placeholder={`خزان ${idx + 1}`}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>نوع الوقود المخصص للخزان</label>
                        <select
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={tank.fuel_type || 'بنزين 91'}
                          onChange={e => logic.handleUpdateTank(idx, 'fuel_type', e.target.value)}
                        >
                          <option value="بنزين 91">🟢 بنزين 91 (أوكتان 91)</option>
                          <option value="بنزين 95">🔴 بنزين 95 (سوبر)</option>
                          <option value="ديزل">🟡 ديزل (شاحنات ونقل)</option>
                          <option value="كيروسين">⚪ كيروسين</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>السعة الإجمالية (لتر)</label>
                        <input
                          type="number"
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={tank.capacity_liters || 0}
                          onChange={e => logic.handleUpdateTank(idx, 'capacity_liters', e.target.value)}
                          placeholder="45000"
                        />
                      </div>

                      <div style={{ paddingTop: '16px' }}>
                        <button
                          type="button"
                          onClick={() => logic.handleRemoveTank(idx)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            width: '44px',
                            height: '44px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="حذف الخزان"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* التبويب الثالث: مضخات الوقود التابعة للمحطة */}
          {activeModalTab === 'pumps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, color: T.accent, fontSize: '15px', fontWeight: 900 }}>
                    📟 مضخات الوقود التابعة للمحطة
                  </h4>
                  <span style={{ fontSize: '11.5px', color: T.textMuted }}>
                    تحديد رقم المضخة، ونوع البنزين الذي تضخه، وقراءة العداد الحالي
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logic.handleAddPump}
                  style={{
                    background: T.accentBg,
                    color: T.accent,
                    border: `1px solid ${T.accentBorder}`,
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  ➕ إضافة مضخة جديدة
                </button>
              </div>

              {(!logic.currentRecord.pumps || logic.currentRecord.pumps.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: T.textMuted }}>
                  لا توجد مضخات مضافة لهذه المحطة بعد. انقر على &quot;إضافة مضخة جديدة&quot; لتهيئة المضخات.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {logic.currentRecord.pumps.map((pump: any, idx: number) => (
                    <div 
                      key={idx}
                      className="wh-pump-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 1.2fr 1.2fr 100px 110px 44px',
                        gap: '10px',
                        alignItems: 'center',
                        background: T.cardBg,
                        border: `1px solid ${T.cardBorder}`,
                        padding: '10px 14px',
                        borderRadius: '16px'
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>رقم المضخة</label>
                        <input
                          type="text"
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 8px', fontSize: '12px', textAlign: 'center' }}
                          value={pump.pump_number || ''}
                          onChange={e => logic.handleUpdatePump(idx, 'pump_number', e.target.value)}
                          placeholder="01"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>اسم / وصف المضخة</label>
                        <input
                          type="text"
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={pump.pump_name || ''}
                          onChange={e => logic.handleUpdatePump(idx, 'pump_name', e.target.value)}
                          placeholder="مضخة 1"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>نوع الوقود المشغل للمضخة</label>
                        <select
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          value={pump.fuel_type || 'بنزين 91'}
                          onChange={e => logic.handleUpdatePump(idx, 'fuel_type', e.target.value)}
                        >
                          <option value="بنزين 91">🟢 بنزين 91</option>
                          <option value="بنزين 95">🔴 بنزين 95</option>
                          <option value="ديزل">🟡 ديزل</option>
                          <option value="كيروسين">⚪ كيروسين</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>سعر اللتر (ر.س)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
                          value={pump.unit_price || 0}
                          onChange={e => logic.handleUpdatePump(idx, 'unit_price', e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '3px' }}>العداد الحالي</label>
                        <input
                          type="number"
                          className="glass-input-field"
                          style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
                          value={pump.current_meter || 0}
                          onChange={e => logic.handleUpdatePump(idx, 'current_meter', e.target.value)}
                        />
                      </div>

                      <div style={{ paddingTop: '16px' }}>
                        <button
                          type="button"
                          onClick={() => logic.handleRemovePump(idx)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            width: '44px',
                            height: '44px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="حذف المضخة"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* أزرار الحفظ والإلغاء */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px', borderTop: `1px solid ${T.divider}`, paddingTop: '16px' }}>
            <button 
              onClick={logic.handleSave} 
              disabled={logic.isSaving} 
              className="btn-main-glass gold desert-btn-primary" 
              style={{ flex: 2, margin: 0, minHeight: '44px', fontWeight: 900 }}
            >
              {logic.isSaving ? '⏳ جاري الحفظ...' : '💾 حفظ بيانات المحطة والخزانات والمضخات'}
            </button>
            <button 
              onClick={() => logic.setIsModalOpen(false)} 
              className="btn-main-glass white" 
              style={{ flex: 1, margin: 0, minHeight: '44px' }}
            >
              إلغاء
            </button>
          </div>
        </AquaModalWrapper>
      )}
    </>
  );
}


