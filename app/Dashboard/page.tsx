"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MasterPage from '@/components/MasterPage';
import LoadingScreen from '@/components/LoadingScreen';
import { THEME } from '@/lib/theme';
import { useThemeMode } from '@/lib/ThemeContext';
import { useDashboardLogic } from './dashboard_logic';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const logic = useDashboardLogic();
  const router = useRouter();
  const { isDaylight } = useThemeMode();

  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');
  const [isManageTanksModalOpen, setIsManageTanksModalOpen] = useState(false);
  const [selectedStationForEdit, setSelectedStationForEdit] = useState<string>('');
  const [editingTanks, setEditingTanks] = useState<any[]>([]);
  const [editingPumps, setEditingPumps] = useState<any[]>([]);
  const [modalActiveTab, setModalActiveTab] = useState<'tanks' | 'pumps'>('tanks');
  
  // Quick level calibration modal state
  const [calibratingTank, setCalibratingTank] = useState<any | null>(null);
  const [newLevelInput, setNewLevelInput] = useState<number | ''>('');

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const stats = logic.stats;

  const handleOpenManageTanks = (stationId?: string, defaultTab: 'tanks' | 'pumps' = 'tanks') => {
    const stations = stats?.allStations || [];
    const targetStationId = stationId || (selectedStationFilter !== 'all' ? selectedStationFilter : (stations[0]?.id || ''));
    setSelectedStationForEdit(targetStationId);
    setModalActiveTab(defaultTab);
    const targetStation = stations.find((s: any) => s.id === targetStationId);
    if (targetStation) {
      setEditingTanks(Array.isArray(targetStation.tanks) ? JSON.parse(JSON.stringify(targetStation.tanks)) : []);
      setEditingPumps(Array.isArray(targetStation.pumps) ? JSON.parse(JSON.stringify(targetStation.pumps)) : []);
    } else {
      setEditingTanks([]);
      setEditingPumps([]);
    }
    setIsManageTanksModalOpen(true);
  };

  const handleStationChangeInModal = (stationId: string) => {
    setSelectedStationForEdit(stationId);
    const targetStation = (stats?.allStations || []).find((s: any) => s.id === stationId);
    if (targetStation) {
      setEditingTanks(Array.isArray(targetStation.tanks) ? JSON.parse(JSON.stringify(targetStation.tanks)) : []);
      setEditingPumps(Array.isArray(targetStation.pumps) ? JSON.parse(JSON.stringify(targetStation.pumps)) : []);
    } else {
      setEditingTanks([]);
      setEditingPumps([]);
    }
  };

  const handleAddTankRow = () => {
    const nextNum = editingTanks.length + 1;
    setEditingTanks(prev => [
      ...prev,
      {
        tank_number: `خزان ${nextNum}`,
        fuel_type: 'بنزين 91',
        capacity_liters: 45000,
        current_level: 0
      }
    ]);
  };

  const handleUpdateTankRow = (index: number, field: string, val: any) => {
    setEditingTanks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveTankRow = (index: number) => {
    setEditingTanks(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddPumpRow = () => {
    const nextNum = String(editingPumps.length + 1).padStart(2, '0');
    setEditingPumps(prev => [
      ...prev,
      {
        id: `pump_${Date.now()}`,
        pump_number: nextNum,
        pump_name: `مضخة ${nextNum}`,
        fuel_type: 'بنزين 91',
        unit_price: 2.18,
        current_meter: 0,
        is_active: true
      }
    ]);
  };

  const handleUpdatePumpRow = (index: number, field: string, val: any) => {
    setEditingPumps(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemovePumpRow = (index: number) => {
    setEditingPumps(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveTanks = async () => {
    if (!selectedStationForEdit) return;
    try {
      await logic.saveStationTanks({
        warehouseId: selectedStationForEdit,
        tanks: editingTanks,
        pumps: editingPumps
      });
      setIsManageTanksModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCalibrateModal = (tank: any) => {
    setCalibratingTank(tank);
    setNewLevelInput(tank.currentLiters || 0);
  };

  const handleSaveCalibratedLevel = async () => {
    if (!calibratingTank) return;
    try {
      await logic.updateTankLevel({
        warehouseId: calibratingTank.warehouseId,
        tankIndex: calibratingTank.tankIndex,
        newLevel: Number(newLevelInput) || 0
      });
      setCalibratingTank(null);
    } catch (e) {
      console.error(e);
    }
  };

  const displayedStations = (stats?.allStations || []).filter((st: any) => {
    if (selectedStationFilter === 'all') return true;
    return st.id === selectedStationFilter;
  });

  return (
    <MasterPage 
      title="مركز القيادة والتحكم | محطات النور للوقود" 
      subtitle="المراقبة اللحظية لمخزون الخزانات، قراءات العدادات، والتدفق المالي المباشر"
    >
      {logic.isLoading || !stats ? (
        <LoadingScreen 
          message="جاري الاتصال بمركز القيادة..." 
          subMessage="نقوم الآن بمزامنة قراءات الخزانات والمضخات ومؤشرات المبيعات..." 
          fullScreen={false} 
        />
      ) : (
        <div className="dashboard-content-root" style={{ display: 'flex', flexDirection: 'column', gap: '28px', animation: 'fadeUp 0.6s ease-out', paddingBottom: '60px' }}>
          
          {/* ========================================================================= */}
          {/* ⚡ 1. شريط التحكم والعمليات السريعة (Command Action Bar) */}
          {/* ========================================================================= */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.9) 0%, rgba(13, 16, 24, 0.8) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '16px',
            padding: '14px 20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#00E5FF',
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.3)'
              }}>
                ⚡
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 900, fontSize: '15px', color: '#F8FAFC' }}>
                    حالة {stats.primaryStationName || 'محطة الوقود'}: متصلة وجاهزة
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '2px 8px',
                    borderRadius: '20px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }}></span>
                    مزامنة حية
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  {stats.activePumps || 0} مضخات وقود نشطة | {stats.fuelTanks?.length || 0} خزانات رئيسية تحت المراقبة
                </div>
              </div>
            </div>

            {/* الأزرار الإجرائية السريعة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.push('/pos')}
                style={{
                  background: 'linear-gradient(135deg, #00E5FF 0%, #0099CC 100%)',
                  color: '#07090D',
                  border: '1px solid rgba(0, 229, 255, 0.8)',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 15px rgba(0, 229, 255, 0.45)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>⛽ شاشة الكاشير (POS)</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/pos-settlements')}
                style={{
                  background: 'linear-gradient(135deg, rgba(224, 109, 68, 0.2) 0%, rgba(224, 109, 68, 0.08) 100%)',
                  color: '#E06D44',
                  border: '1px solid rgba(224, 109, 68, 0.5)',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 12px rgba(224, 109, 68, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>⏱️ إغلاق الوردية والعدادات</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/inventory')}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#F8FAFC',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🛢️ تفريغ صهريج وقود</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* ⛽ 2. أسطول محطات النور للوقود | المراقبة الشاملة للمحطات والمضخات والخزانات */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: isDaylight ? '#0F172A' : '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#C29B62' }}>⛽</span>
                  أسطول محطات الوقود والمضخات والخزانات (Stations & Fuel Fleet Hub)
                </h3>
                <div style={{ fontSize: '12.5px', color: isDaylight ? '#475569' : '#94A3B8', marginTop: '3px' }}>
                  المراقبة اللحظية لجميع المحطات، المشرفين والمسؤولين، سعات الخزانات ونسب امتلائها، وقراءات عدادات المضخات
                </div>
              </div>

              {/* أزرار الإجراءات والتحديث */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleOpenManageTanks(undefined, 'tanks')}
                  style={{
                    background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(194, 155, 98, 0.5)',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(168, 87, 60, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>⚙️ ضبط الخزانات والمضخات</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/inventory/warehouses')}
                  style={{
                    background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                    color: isDaylight ? '#0F172A' : '#F8FAFC',
                    border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🏢 إدارة المحطات</span>
                </button>

                <button
                  type="button"
                  onClick={() => logic.refetch()}
                  title="تحديث البيانات لحظياً"
                  style={{
                    background: isDaylight ? '#F1F5F9' : 'rgba(0, 229, 255, 0.1)',
                    color: isDaylight ? '#0F172A' : '#00E5FF',
                    border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(0, 229, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🔄
                </button>
              </div>
            </div>

            {/* شريط فلتر المحطات المباشر */}
            {(stats.allStations || []).length > 0 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '10px',
                marginBottom: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedStationFilter('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: selectedStationFilter === 'all'
                      ? '1px solid #C29B62'
                      : (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)'),
                    background: selectedStationFilter === 'all'
                      ? '#C29B62'
                      : (isDaylight ? '#FFFFFF' : 'rgba(20, 24, 34, 0.7)'),
                    color: selectedStationFilter === 'all' ? '#FFFFFF' : (isDaylight ? '#0F172A' : '#F8FAFC'),
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedStationFilter === 'all' ? '0 4px 12px rgba(194, 155, 98, 0.3)' : 'none'
                  }}
                >
                  🏢 كافة المحطات ({(stats.allStations || []).length} محطة)
                </button>

                {(stats.allStations || []).map((st: any) => {
                  const isSelected = selectedStationFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStationFilter(st.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: isSelected
                          ? '1px solid #C29B62'
                          : (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)'),
                        background: isSelected
                          ? '#C29B62'
                          : (isDaylight ? '#FFFFFF' : 'rgba(20, 24, 34, 0.7)'),
                        color: isSelected ? '#FFFFFF' : (isDaylight ? '#0F172A' : '#F8FAFC'),
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isSelected ? '0 4px 12px rgba(194, 155, 98, 0.3)' : 'none'
                      }}
                    >
                      <span>⛽ {st.name}</span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(0,0,0,0.2)' : (isDaylight ? '#F1F5F9' : 'rgba(255,255,255,0.1)'),
                        color: isSelected ? '#FFFFFF' : (isDaylight ? '#64748B' : '#94A3B8')
                      }}>
                        {st.fillPercentage || 0}% ممتلئة
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* شريط الإحصائيات العامة للمحطات */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: isDaylight ? '#FFFFFF' : 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isDaylight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800 }}>إجمالي المحطات</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: isDaylight ? '#0F172A' : '#00E5FF', marginTop: '2px' }}>
                    {(stats.allStations || []).length}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isDaylight ? '#64748B' : '#94A3B8', marginRight: '4px' }}>محطة</span>
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>🏢</span>
              </div>

              <div style={{
                background: isDaylight ? '#FFFFFF' : 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isDaylight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800 }}>مضخات الوقود</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>
                    {(stats.allPumps || []).length}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isDaylight ? '#64748B' : '#94A3B8', marginRight: '4px' }}>
                      ({(stats.allPumps || []).filter((p: any) => p.isActive).length} نشطة)
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>⛽</span>
              </div>

              <div style={{
                background: isDaylight ? '#FFFFFF' : 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isDaylight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800 }}>خزانات الوقود</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#38BDF8', marginTop: '2px' }}>
                    {(stats.fuelTanks || []).length}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isDaylight ? '#64748B' : '#94A3B8', marginRight: '4px' }}>خزان</span>
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>🛢️</span>
              </div>

              <div style={{
                background: isDaylight ? '#FFFFFF' : 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(194, 155, 98, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isDaylight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800 }}>
                    <span>امتلاء الشبكة العام</span>
                    <span style={{ color: '#C29B62', fontWeight: 900 }}>{stats.tanksSummary?.overallFillPercentage || 0}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: isDaylight ? '#E2E8F0' : 'rgba(0,0,0,0.4)', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' }}>
                    <div style={{
                      width: `${stats.tanksSummary?.overallFillPercentage || 0}%`,
                      height: '100%',
                      background: (stats.tanksSummary?.overallFillPercentage || 0) < 20 ? '#EF4444' : (stats.tanksSummary?.overallFillPercentage || 0) < 50 ? '#F59E0B' : '#10B981',
                      borderRadius: '10px',
                      transition: 'width 0.8s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* عرض بطاقات المحطات الشاملة */}
            {displayedStations.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: isDaylight ? '#FFFFFF' : 'linear-gradient(135deg, rgba(20, 24, 34, 0.7) 0%, rgba(13, 16, 24, 0.6) 100%)',
                border: isDaylight ? '1px dashed #CBD5E1' : '1.5px dashed rgba(0, 229, 255, 0.35)',
                borderRadius: '18px',
                color: isDaylight ? '#64748B' : '#94A3B8'
              }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>⛽</div>
                <div style={{ fontWeight: 900, fontSize: '16px', color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                  لا توجد محطات مسجلة في النظام بعد
                </div>
                <div style={{ fontSize: '13px', marginTop: '6px', marginBottom: '16px' }}>
                  قم بإضافة أول محطة وقود وتعيين مشرفها ومضخاتها وخزاناتها الآن
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/inventory/warehouses')}
                  style={{
                    background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(194, 155, 98, 0.35)'
                  }}
                >
                  ➕ إضافة محطة وقود جديدة
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
                {displayedStations.map((station: any) => {
                  return (
                    <div
                      key={station.id}
                      style={{
                        background: isDaylight 
                          ? '#FFFFFF' 
                          : 'linear-gradient(135deg, rgba(20, 24, 34, 0.92) 0%, rgba(13, 16, 24, 0.88) 100%)',
                        border: isDaylight 
                          ? '1px solid rgba(194, 155, 98, 0.35)' 
                          : '1px solid rgba(0, 229, 255, 0.25)',
                        borderRadius: '20px',
                        padding: '22px 24px',
                        boxShadow: isDaylight 
                          ? '0 6px 20px rgba(44, 26, 18, 0.07)' 
                          : '0 10px 35px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.03)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {/* ترويسة بطاقة المحطة: الهوية + المسؤول + نسبة الامتلاء + الأزرار */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                        paddingBottom: '16px',
                        borderBottom: isDaylight ? '1px solid #F1F5F9' : '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {/* يمين: اسم المحطة وحالتها */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            background: isDaylight ? 'rgba(194, 155, 98, 0.12)' : 'rgba(0, 229, 255, 0.12)',
                            border: isDaylight ? '1px solid rgba(194, 155, 98, 0.35)' : '1px solid rgba(0, 229, 255, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                          }}>
                            ⛽
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 style={{ 
                                margin: 0, 
                                fontSize: '18px', 
                                fontWeight: 900, 
                                color: isDaylight ? '#0F172A' : '#F8FAFC' 
                              }}>
                                {station.name}
                              </h4>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: station.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: station.isActive ? '#10B981' : '#EF4444',
                                border: station.isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)'
                              }}>
                                {station.isActive ? '🟢 نشطة ومتصلة' : '⏸️ متوقفة'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: isDaylight ? '#64748B' : '#94A3B8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>📍 {station.location || 'الفرع الرئيسي'}</span>
                              <span>•</span>
                              <span>النوع: {station.type === 'pos' ? 'محطة وقود وبيع تجزئة' : 'مستودع تخزين'}</span>
                            </div>
                          </div>
                        </div>

                        {/* وسط: المشرف المسؤول عن المحطة */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: isDaylight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)',
                          border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '8px 14px',
                          borderRadius: '12px'
                        }}>
                          <div style={{ fontSize: '20px' }}>👤</div>
                          <div>
                            <div style={{ fontSize: '11px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 700 }}>
                              المشرف المسؤول عن المحطة:
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                              {station.managerName}
                            </div>
                          </div>
                          {station.phone && station.phone !== 'غير مسجل' && (
                            <a
                              href={`tel:${station.phone}`}
                              title="اتصال هاتفي بالمسؤول"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                background: isDaylight ? '#E2E8F0' : 'rgba(0, 229, 255, 0.15)',
                                color: isDaylight ? '#0F172A' : '#00E5FF',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              📞 {station.phone}
                            </a>
                          )}
                        </div>

                        {/* يسار: مؤشر الامتلاء العام والأزرار السريعة */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'left', minWidth: '140px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                              <span style={{ color: isDaylight ? '#64748B' : '#94A3B8' }}>نسبة الامتلاء:</span>
                              <span style={{ color: '#C29B62', fontWeight: 900 }}>{station.fillPercentage}%</span>
                            </div>
                            <div style={{ width: '140px', height: '7px', background: isDaylight ? '#E2E8F0' : 'rgba(0,0,0,0.4)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${station.fillPercentage}%`,
                                height: '100%',
                                background: station.fillPercentage < 20 ? '#EF4444' : station.fillPercentage < 50 ? '#F59E0B' : '#10B981',
                                borderRadius: '10px',
                                transition: 'width 0.8s ease'
                              }}></div>
                            </div>
                            <div style={{ fontSize: '10.5px', color: isDaylight ? '#94A3B8' : '#64748B', marginTop: '3px' }}>
                              {Number(station.totalCurrentLiters).toLocaleString()} / {Number(station.totalCapacity).toLocaleString()} لتر
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenManageTanks(station.id, 'tanks')}
                              title="تعديل وضبط خزانات ومضخات هذه المحطة"
                              style={{
                                background: isDaylight ? '#F8FAFC' : 'rgba(194, 155, 98, 0.15)',
                                color: isDaylight ? '#0F172A' : '#C29B62',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(194, 155, 98, 0.4)',
                                borderRadius: '10px',
                                padding: '7px 12px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              ⚙️ ضبط المحطة
                            </button>

                            <button
                              type="button"
                              onClick={() => router.push(`/pos?warehouse_id=${station.id}`)}
                              title="فتح شاشة الكاشير والمبيعات لهذه المحطة"
                              style={{
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '7px 14px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              🛒 كاشير المحطة
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ============================================================= */}
                      {/* 🛢️ القسم الأول للمحطة: خزانات الوقود ومستويات الامتلاء الحالية */}
                      {/* ============================================================= */}
                      <div style={{ marginTop: '18px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '14px' 
                        }}>
                          <h5 style={{ 
                            margin: 0, 
                            fontSize: '14.5px', 
                            fontWeight: 900, 
                            color: isDaylight ? '#0F172A' : '#F8FAFC',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>🛢️</span>
                            <span>خزانات الوقود ومستويات الامتلاء</span>
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              color: isDaylight ? '#64748B' : '#94A3B8',
                              background: isDaylight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              {station.tanks.length} خزان
                            </span>
                          </h5>

                          <button
                            type="button"
                            onClick={() => handleOpenManageTanks(station.id, 'tanks')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#C29B62',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ➕ إضافة خزان جديد
                          </button>
                        </div>

                        {station.tanks.length === 0 ? (
                          <div style={{
                            padding: '22px',
                            textAlign: 'center',
                            borderRadius: '14px',
                            background: isDaylight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
                            border: isDaylight ? '1px dashed #CBD5E1' : '1px dashed rgba(255,255,255,0.1)',
                            color: isDaylight ? '#64748B' : '#94A3B8',
                            fontSize: '13px'
                          }}>
                            لا توجد خزانات مسجلة لهذه المحطة بعد. 
                            <button
                              type="button"
                              onClick={() => handleOpenManageTanks(station.id, 'tanks')}
                              style={{
                                marginRight: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#C29B62',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              إضافة خزانات الآن
                            </button>
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                            gap: '14px' 
                          }}>
                            {station.tanks.map((tank: any) => {
                              const isWarn = tank.status === 'warning' || tank.status === 'critical';
                              const tankColor = tank.color || '#00E5FF';

                              return (
                                <div
                                  key={tank.id}
                                  style={{
                                    background: isDaylight ? '#F8FAFC' : 'rgba(11, 14, 20, 0.75)',
                                    border: `1.5px solid ${isWarn ? '#E06D44' : isDaylight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)'}`,
                                    borderRadius: '16px',
                                    padding: '16px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: isDaylight ? '0 2px 6px rgba(0,0,0,0.03)' : '0 4px 15px rgba(0,0,0,0.3)',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {/* رأس كارت الخزان */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '15px' }}>🛢️</span>
                                        <span style={{ fontWeight: 900, fontSize: '14.5px', color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                                          {tank.name}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '11.5px', color: isDaylight ? '#64748B' : '#94A3B8', marginTop: '2px' }}>
                                        السعر المعتمد: <strong style={{ color: tankColor }}>{tank.unitPrice} ر.س / لتر</strong>
                                      </div>
                                    </div>

                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      color: isWarn ? '#E06D44' : '#10B981',
                                      background: isWarn ? 'rgba(224, 109, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                      border: `1px solid ${isWarn ? 'rgba(224, 109, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                      padding: '3px 8px',
                                      borderRadius: '14px'
                                    }}>
                                      {tank.statusText}
                                    </span>
                                  </div>

                                  {/* أسطوانة الوقود الهيدروليكية ومؤشرات الأرقام */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '10px 0' }}>
                                    {/* الأسطوانة الزجاجية */}
                                    <div style={{
                                      width: '46px',
                                      height: '96px',
                                      borderRadius: '24px',
                                      background: isDaylight ? '#E2E8F0' : 'rgba(11, 14, 20, 0.95)',
                                      border: `2px solid ${isWarn ? 'rgba(224, 109, 68, 0.5)' : isDaylight ? 'rgba(194, 155, 98, 0.4)' : 'rgba(0, 229, 255, 0.35)'}`,
                                      position: 'relative',
                                      overflow: 'hidden',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'flex-end',
                                      flexShrink: 0
                                    }}>
                                      {/* تدريجات الأسطوانة */}
                                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8px 4px', pointerEvents: 'none', zIndex: 2 }}>
                                        <span style={{ width: '8px', height: '1px', background: isDaylight ? '#94A3B8' : 'rgba(255,255,255,0.3)' }}></span>
                                        <span style={{ width: '12px', height: '1px', background: isDaylight ? '#94A3B8' : 'rgba(255,255,255,0.4)' }}></span>
                                        <span style={{ width: '8px', height: '1px', background: isDaylight ? '#94A3B8' : 'rgba(255,255,255,0.3)' }}></span>
                                      </div>

                                      {/* السائل اللحظي */}
                                      <div style={{
                                        width: '100%',
                                        height: `${tank.percentage}%`,
                                        background: `linear-gradient(180deg, ${tankColor} 0%, rgba(15, 23, 42, 0.85) 100%)`,
                                        borderRadius: '0 0 22px 22px',
                                        transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative'
                                      }}>
                                        <div style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          height: '3px',
                                          background: '#FFFFFF',
                                          boxShadow: `0 0 6px ${tankColor}`,
                                          borderRadius: '50%'
                                        }}></div>
                                      </div>
                                    </div>

                                    {/* أرقام الخزان ونسبته */}
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ 
                                          fontSize: '24px', 
                                          fontWeight: 900, 
                                          color: isDaylight ? '#0F172A' : '#F8FAFC',
                                          fontFamily: 'monospace'
                                        }}>
                                          {Number(tank.currentLiters || 0).toLocaleString()}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: isDaylight ? '#64748B' : '#94A3B8' }}>لتر</span>
                                      </div>

                                      <div style={{ fontSize: '11px', color: isDaylight ? '#64748B' : '#64748B', marginTop: '1px' }}>
                                        من إجمالي: {Number(tank.capacity || 0).toLocaleString()} لتر
                                      </div>

                                      <div style={{ marginTop: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                                          <span style={{ color: isDaylight ? '#64748B' : '#94A3B8' }}>الامتلاء:</span>
                                          <span style={{ color: tankColor, fontWeight: 900 }}>{tank.percentage}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: isDaylight ? '#E2E8F0' : 'rgba(0,0,0,0.4)', borderRadius: '10px', overflow: 'hidden' }}>
                                          <div style={{
                                            width: `${tank.percentage}%`,
                                            height: '100%',
                                            background: tankColor,
                                            borderRadius: '10px',
                                            transition: 'width 0.8s ease'
                                          }}></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* أسفل كارت الخزان: القيمة والقياس السريع */}
                                  <div style={{
                                    marginTop: '12px',
                                    paddingTop: '10px',
                                    borderTop: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '11px'
                                  }}>
                                    <span style={{ color: isDaylight ? '#64748B' : '#94A3B8' }}>
                                      القيمة: <strong style={{ color: isDaylight ? '#0F172A' : '#F8FAFC' }}>{logic.formatCurrency(tank.totalValue || 0)}</strong>
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenCalibrateModal(tank)}
                                      style={{
                                        background: isDaylight ? '#FFFFFF' : 'rgba(0, 229, 255, 0.12)',
                                        border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(0, 229, 255, 0.4)',
                                        color: isDaylight ? '#0F172A' : '#00E5FF',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ⚡ قياس المنسوب
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* ============================================================= */}
                      {/* ⛽ القسم الثاني للمحطة: مضخات الوقود وقراءات العدادات الحالية */}
                      {/* ============================================================= */}
                      <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: isDaylight ? '1px dashed #E2E8F0' : '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '14px' 
                        }}>
                          <h5 style={{ 
                            margin: 0, 
                            fontSize: '14.5px', 
                            fontWeight: 900, 
                            color: isDaylight ? '#0F172A' : '#F8FAFC',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>⛽</span>
                            <span>مضخات الوقود وقراءات العدادات الحالية</span>
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              color: isDaylight ? '#64748B' : '#94A3B8',
                              background: isDaylight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              {station.pumps.length} مضخة ({station.activePumpsCount} نشطة)
                            </span>
                          </h5>

                          <button
                            type="button"
                            onClick={() => handleOpenManageTanks(station.id, 'pumps')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#10B981',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ➕ إضافة مضخة جديدة
                          </button>
                        </div>

                        {station.pumps.length === 0 ? (
                          <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            borderRadius: '14px',
                            background: isDaylight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
                            border: isDaylight ? '1px dashed #CBD5E1' : '1px dashed rgba(255,255,255,0.1)',
                            color: isDaylight ? '#64748B' : '#94A3B8',
                            fontSize: '13px'
                          }}>
                            لا توجد مضخات مسجلة لهذه المحطة بعد. 
                            <button
                              type="button"
                              onClick={() => handleOpenManageTanks(station.id, 'pumps')}
                              style={{
                                marginRight: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#10B981',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              إضافة مضخات الآن
                            </button>
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                            gap: '12px' 
                          }}>
                            {station.pumps.map((pump: any) => {
                              const pumpColor = pump.color || '#10B981';

                              return (
                                <div
                                  key={pump.id}
                                  style={{
                                    background: isDaylight ? '#F8FAFC' : 'rgba(11, 14, 20, 0.75)',
                                    border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '14px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                  }}
                                >
                                  {/* رأس بطاقة المضخة */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '8px',
                                        background: `${pumpColor}20`,
                                        color: pumpColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 900
                                      }}>
                                        {pump.pumpNumber}
                                      </span>
                                      <span style={{ fontWeight: 800, fontSize: '13.5px', color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                                        {pump.pumpName}
                                      </span>
                                    </div>

                                    <span style={{
                                      fontSize: '10.5px',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      background: pump.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      color: pump.isActive ? '#10B981' : '#EF4444'
                                    }}>
                                      {pump.isActive ? '🟢 نشطة' : '🛠️ صيانة'}
                                    </span>
                                  </div>

                                  {/* نوع الوقود والسعر */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                                    <span style={{ color: isDaylight ? '#64748B' : '#94A3B8' }}>
                                      النوع: <strong style={{ color: pumpColor }}>{pump.fuelType}</strong>
                                    </span>
                                    <span style={{ color: isDaylight ? '#64748B' : '#94A3B8' }}>
                                      السعر: <strong style={{ color: isDaylight ? '#0F172A' : '#F8FAFC' }}>{pump.unitPrice} ر.س</strong>
                                    </span>
                                  </div>

                                  {/* عداد المضخة الرقمي */}
                                  <div style={{
                                    background: isDaylight ? '#FFFFFF' : '#07090D',
                                    border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(0, 229, 255, 0.3)',
                                    borderRadius: '10px',
                                    padding: '8px 10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ fontSize: '10.5px', color: isDaylight ? '#64748B' : '#64748B', fontWeight: 700 }}>
                                      قراءة العداد:
                                    </span>
                                    <span style={{
                                      fontFamily: 'monospace',
                                      fontSize: '15px',
                                      fontWeight: 900,
                                      color: isDaylight ? '#0F172A' : '#00E5FF'
                                    }}>
                                      {Number(pump.currentMeter || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      <span style={{ fontSize: '10px', marginRight: '4px', color: isDaylight ? '#64748B' : '#94A3B8' }}>لتر</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 📊 3. المؤشرات التشغيلية والمالية المباشرة (Operational & Cash Register KPIs) */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#00E5FF' }}>⚡</span>
                المؤشرات الحيوية والمالية لليوم (Live Station KPIs)
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8' }}>العملة: ريال سعودي (SAR)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              
              {/* كارت 1: مبيعات اليوم الإجمالية */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.9) 0%, rgba(14, 18, 25, 0.85) 100%)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRight: '4px solid #00E5FF',
                borderRadius: '16px',
                padding: '18px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>إجمالي مبيعات اليوم</span>
                  <span style={{ fontSize: '20px' }}>💰</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#00E5FF', margin: '10px 0 4px 0', textShadow: '0 0 15px rgba(0, 229, 255, 0.4)' }}>
                  {logic.formatCurrency(stats.totalRevenues || 0)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 700 }}>
                  ↑ تم التدقيق والمطابقة مع الصندوق
                </div>
              </div>

              {/* كارت 2: إجمالي اللترات المباعة */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.9) 0%, rgba(14, 18, 25, 0.85) 100%)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRight: '4px solid #38BDF8',
                borderRadius: '16px',
                padding: '18px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>إجمالي اللترات المباعة</span>
                  <span style={{ fontSize: '20px' }}>⛽</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#38BDF8', margin: '10px 0 4px 0', fontFamily: 'monospace' }}>
                  {Number(stats.totalLitersSold || 0).toLocaleString()} <span style={{ fontSize: '14px', color: '#94A3B8' }}>لتر</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700 }}>
                  مجموع حركة عدادات المضخات
                </div>
              </div>

              {/* كارت 3: السيولة النقدية والدرج */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.9) 0%, rgba(14, 18, 25, 0.85) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRight: '4px solid #10B981',
                borderRadius: '16px',
                padding: '18px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>الرصيد النقدي والبنكي</span>
                  <span style={{ fontSize: '20px' }}>🏦</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', margin: '10px 0 4px 0', textShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}>
                  {logic.formatCurrency(stats.cashAndBankBalance || 0)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700 }}>
                  الصناديق المركزية والحسابات البنكية
                </div>
              </div>

              {/* كارت 4: الوردية النشطة ومطابقة العدادات */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.9) 0%, rgba(14, 18, 25, 0.85) 100%)',
                border: `1px solid ${stats.activeShift ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRight: `4px solid ${stats.activeShift ? '#10B981' : '#64748B'}`,
                borderRadius: '16px',
                padding: '18px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>حالة الوردية الحالية</span>
                  <span style={{ fontSize: '20px' }}>⏱️</span>
                </div>
                {stats.activeShift ? (
                  <>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981', margin: '10px 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>وردية مفتوحة</span>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 700 }}>
                      الوردية قيد التشغيل واستقبال المبيعات
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#94A3B8', margin: '10px 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>الوردية مغلقة</span>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748B' }}></span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>
                      لا توجد وردية كاشير نشطة حالياً
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* ⛽ 4. مراقبة مضخات الوقود والعدادات اللحظية (Live Fuel Pumps Grid) */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00E5FF' }}>📟</span>
                  مراقبة مضخات الوقود وعدادات اللترات (Live Pumps Telemetry)
                </h3>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
                  قراءات العدادات الرقمية اللحظية للمضخات ومطابقتها مع الإغلاقات
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/pos-settlements')}
                style={{
                  background: 'rgba(0, 229, 255, 0.08)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  color: '#00E5FF',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                تسجيل قراءات وردية 📝
              </button>
            </div>

            {(!stats.fuelPumps || stats.fuelPumps.length === 0) ? (
              <div style={{
                textAlign: 'center',
                padding: '30px',
                background: 'rgba(20, 24, 34, 0.6)',
                borderRadius: '14px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                color: '#94A3B8'
              }}>
                لا توجد مضخات وقود مسجلة لهذه المحطة بعد.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {stats.fuelPumps.map((pump: any) => {
                  const isGasoline91 = pump.fuel_type?.includes('91');
                  const isDiesel = pump.fuel_type?.includes('ديزل');
                  const badgeColor = isGasoline91 ? '#00E5FF' : isDiesel ? '#E06D44' : '#38BDF8';

                  return (
                    <div 
                      key={pump.id}
                      style={{
                        background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.85) 0%, rgba(13, 16, 24, 0.75) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '16px',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: `${badgeColor}15`,
                          border: `1px solid ${badgeColor}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          color: badgeColor,
                          fontWeight: 900
                        }}>
                          {pump.pump_number || '01'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#F8FAFC' }}>
                            {pump.pump_name}
                          </div>
                          <div style={{ fontSize: '11px', color: badgeColor, fontWeight: 700 }}>
                            {pump.fuel_type}
                          </div>
                        </div>
                      </div>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#10B981', fontWeight: 800 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }}></span>
                        نشطة
                      </span>
                    </div>

                    {/* العداد الرقمي المتوهج */}
                    <div style={{
                      background: '#07090D',
                      border: '1px solid rgba(0, 229, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>العداد الحالي:</span>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '16px', 
                        fontWeight: 900, 
                        color: '#00E5FF',
                        letterSpacing: '1px',
                        textShadow: '0 0 8px rgba(0, 229, 255, 0.5)'
                      }}>
                        {Number(pump.current_meter || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} L
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94A3B8' }}>
                      <span>سعر البيع:</span>
                      <strong style={{ color: '#F8FAFC' }}>{pump.unit_price} ر.س / لتر</strong>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 📈 5. التحليلات البيانية والمخططات التفاعلية (Recharts Command Center) */}
          {/* ========================================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
            
            {/* منحنى المبيعات وتدفق اللترات عبر ساعات اليوم */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.85) 0%, rgba(13, 16, 24, 0.75) 100%)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: '18px',
              padding: '22px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#00E5FF' }}>📈</span>
                    تدفق مبيعات الوقود خلال اليوم (Sales & Liters Velocity)
                  </h4>
                  <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                    تتبع حركة التزود بالوقود والذروة اللحظية (ريال vs لتر)
                  </div>
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', padding: '3px 10px', borderRadius: '12px' }}>
                  24 ساعة
                </span>
              </div>

              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer>
                  <AreaChart data={stats.salesTimelineData || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cyanSalesGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="orangeLitersGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E06D44" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#E06D44" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#0B0E14', 
                        border: '1px solid rgba(0, 229, 255, 0.4)', 
                        borderRadius: '12px',
                        boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
                        color: '#F8FAFC' 
                      }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 700 }} />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      name="المبيعات (ر.س)" 
                      stroke="#00E5FF" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#cyanSalesGlow)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="liters" 
                      name="اللترات المضخوخة" 
                      stroke="#E06D44" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#orangeLitersGlow)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* توزيع مبيعات الوقود حسب الصنف (Donut Chart) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.85) 0%, rgba(13, 16, 24, 0.75) 100%)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: '18px',
              padding: '22px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#00E5FF' }}>🎯</span>
                    حصة المبيعات حسب نوع الوقود (Fuel Mix)
                  </h4>
                  <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                    نسبة استهلاك بنزين 91 و 95 والديزل
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={stats.fuelDistributionData || []}
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(stats.fuelDistributionData || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#00E5FF'} stroke="rgba(11, 14, 20, 0.8)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => `${val}% من إجمالي المبيعات`}
                      contentStyle={{ 
                        background: '#0B0E14', 
                        border: '1px solid rgba(0, 229, 255, 0.4)', 
                        borderRadius: '12px',
                        boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
                        color: '#F8FAFC' 
                      }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      formatter={(value, entry: any) => <span style={{ color: '#F8FAFC', fontWeight: 800, fontSize: '12px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ⚠️ 6. مهام التدقيق والإجراءات المعلقة (Pending Operations) */}
          {/* ========================================================================= */}
          {(stats.pendingActions || []).length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#E06D44' }}>⚠️</span>
                  مستندات وعمليات قيد الانتظار تحتاج اعتماد أو مراجعة
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {(stats.pendingActions || []).map((action: any, idx: number) => {
                  const labels: Record<string, string> = {
                    expenses: 'مصروفات تشغيلية',
                    invoices: 'فواتير وقود',
                    payments: 'سندات صرف',
                    receipts: 'سندات تحصيل'
                  };
                  return (
                    <div 
                      key={idx} 
                      onClick={() => router.push(`/${action.type}`)} 
                      style={{
                        background: 'linear-gradient(135deg, rgba(224, 109, 68, 0.12) 0%, rgba(20, 24, 34, 0.9) 100%)',
                        border: '1px solid rgba(224, 109, 68, 0.35)',
                        borderRadius: '14px',
                        padding: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div style={{ fontSize: '20px', marginBottom: '6px' }}>📝</div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: '#E06D44', fontFamily: 'monospace' }}>
                        {action.count}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#F8FAFC', marginTop: '2px' }}>
                        {labels[action.type] || action.type} بانتظار الترحيل
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛢️ نافذة إدارة وتكوين المحطة (الخزانات والمضخات) */}
      {/* ========================================================================= */}
      {isManageTanksModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: isDaylight ? 'rgba(44, 26, 18, 0.55)' : 'rgba(7, 10, 15, 0.88)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: isDaylight 
              ? 'linear-gradient(135deg, #FFFFFF 0%, #FAF8F5 100%)' 
              : 'linear-gradient(135deg, rgba(22, 27, 38, 0.98) 0%, rgba(13, 16, 24, 0.96) 100%)',
            border: isDaylight ? '1.5px solid rgba(194, 155, 98, 0.45)' : '1.5px solid rgba(194, 155, 98, 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isDaylight 
              ? '0 20px 50px rgba(44, 26, 18, 0.2), 0 0 30px rgba(194, 155, 98, 0.25)' 
              : '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(194, 155, 98, 0.15)',
            overflow: 'hidden'
          }}>
            {/* رأس النافذة */}
            <div style={{
              padding: '18px 22px',
              borderBottom: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDaylight ? 'rgba(194, 155, 98, 0.06)' : 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⛽</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: isDaylight ? '#2C1A12' : '#F8FAFC' }}>
                    تكوين المحطة: الخزانات ومضخات الوقود
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: isDaylight ? '#64748B' : '#94A3B8' }}>
                    إدارة خزانات الوقود ومستوياتها، ومضخات الوقOD والعدادات الرقمية التابعة للمحطة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManageTanksModalOpen(false)}
                style={{
                  background: isDaylight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  color: isDaylight ? '#64748B' : '#94A3B8',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* جسم النافذة */}
            <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* اختيار المحطة المستهدفة */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: isDaylight ? '#2C1A12' : '#F8FAFC', marginBottom: '6px' }}>
                  🏢 المحطة / الفرع المستهدف:
                </label>
                <select
                  value={selectedStationForEdit}
                  onChange={(e) => handleStationChangeInModal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isDaylight ? '#FFFFFF' : 'rgba(11, 14, 20, 0.9)',
                    border: isDaylight ? '1.5px solid rgba(194, 155, 98, 0.4)' : '1px solid rgba(0, 229, 255, 0.35)',
                    color: isDaylight ? '#2C1A12' : '#F8FAFC',
                    fontSize: '13px',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                >
                  {(stats.allStations || []).map((st: any) => (
                    <option key={st.id} value={st.id} style={{ background: isDaylight ? '#FFF' : '#0F141C' }}>
                      {st.name} ({st.tanks?.length || 0} خزان | {st.pumps?.length || 0} مضخة) - المسؤول: {st.managerName}
                    </option>
                  ))}
                </select>
              </div>

              {/* التبويبات بين الخزانات والمضخات */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: isDaylight ? '1.5px solid #E2E8F0' : '1.5px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setModalActiveTab('tanks')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: modalActiveTab === 'tanks' 
                      ? '1.5px solid #C29B62' 
                      : (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)'),
                    background: modalActiveTab === 'tanks'
                      ? (isDaylight ? 'rgba(194, 155, 98, 0.15)' : 'rgba(194, 155, 98, 0.2)')
                      : 'transparent',
                    color: modalActiveTab === 'tanks'
                      ? (isDaylight ? '#2C1A12' : '#F8FAFC')
                      : (isDaylight ? '#64748B' : '#94A3B8'),
                    fontWeight: modalActiveTab === 'tanks' ? 900 : 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>🛢️ خزانات الوقود</span>
                  <span style={{
                    background: modalActiveTab === 'tanks' ? '#C29B62' : (isDaylight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'),
                    color: modalActiveTab === 'tanks' ? '#FFFFFF' : (isDaylight ? '#64748B' : '#94A3B8'),
                    borderRadius: '12px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 900
                  }}>
                    {editingTanks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalActiveTab('pumps')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: modalActiveTab === 'pumps' 
                      ? '1.5px solid #00E5FF' 
                      : (isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)'),
                    background: modalActiveTab === 'pumps'
                      ? (isDaylight ? 'rgba(0, 153, 204, 0.12)' : 'rgba(0, 229, 255, 0.18)')
                      : 'transparent',
                    color: modalActiveTab === 'pumps'
                      ? (isDaylight ? '#007799' : '#00E5FF')
                      : (isDaylight ? '#64748B' : '#94A3B8'),
                    fontWeight: modalActiveTab === 'pumps' ? 900 : 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>⛽ مضخات الوقود</span>
                  <span style={{
                    background: modalActiveTab === 'pumps' ? (isDaylight ? '#007799' : '#00E5FF') : (isDaylight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'),
                    color: modalActiveTab === 'pumps' ? (isDaylight ? '#FFF' : '#07090D') : (isDaylight ? '#64748B' : '#94A3B8'),
                    borderRadius: '12px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 900
                  }}>
                    {editingPumps.length}
                  </span>
                </button>
              </div>

              {/* محتوى تبويب الخزانات */}
              {modalActiveTab === 'tanks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: isDaylight ? '#2C1A12' : '#C29B62' }}>
                      قائمة الخزانات المسجلة ({editingTanks.length}):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddTankRow}
                      style={{
                        background: isDaylight ? 'rgba(194, 155, 98, 0.15)' : 'rgba(194, 155, 98, 0.2)',
                        border: '1px solid rgba(194, 155, 98, 0.45)',
                        color: isDaylight ? '#8A5726' : '#C29B62',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>➕ إضافة خزان جديد</span>
                    </button>
                  </div>

                  {editingTanks.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: isDaylight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                      border: isDaylight ? '1px dashed #CBD5E1' : '1px dashed rgba(255, 255, 255, 0.15)',
                      borderRadius: '14px',
                      color: isDaylight ? '#64748B' : '#94A3B8',
                      fontSize: '13px'
                    }}>
                      لا توجد أي خزانات مسجلة لهذه المحطة حالياً. انقر على «إضافة خزان جديد» بالأعلى للبدء.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {editingTanks.map((t, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: isDaylight ? '#F8FAFC' : 'rgba(11, 14, 20, 0.75)',
                            border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1.2fr auto',
                            gap: '10px',
                            alignItems: 'center'
                          }}
                        >
                          {/* اسم الخزان */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              اسم/رقم الخزان
                            </label>
                            <input
                              type="text"
                              value={t.tank_number || ''}
                              onChange={(e) => handleUpdateTankRow(idx, 'tank_number', e.target.value)}
                              placeholder="مثال: خزان 1"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: isDaylight ? '#2C1A12' : '#F8FAFC',
                                fontSize: '12px',
                                fontWeight: 800
                              }}
                            />
                          </div>

                          {/* نوع الوقود */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              نوع الوقود
                            </label>
                            <select
                              value={t.fuel_type || 'بنزين 91'}
                              onChange={(e) => handleUpdateTankRow(idx, 'fuel_type', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: isDaylight ? '#2C1A12' : '#F8FAFC',
                                fontSize: '12px',
                                fontWeight: 800
                              }}
                            >
                              <option value="بنزين 91">بنزين 91</option>
                              <option value="بنزين 95">بنزين 95</option>
                              <option value="ديزل">ديزل</option>
                              <option value="كيروسين">كيروسين</option>
                              <option value="زيوت">زيوت ومواد</option>
                            </select>
                          </div>

                          {/* السعة القصوى */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              السعة القصوى (لتر)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={t.capacity_liters ?? ''}
                              onChange={(e) => handleUpdateTankRow(idx, 'capacity_liters', Number(e.target.value) || 0)}
                              placeholder="45000"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: isDaylight ? '#2C1A12' : '#F8FAFC',
                                fontSize: '12px',
                                fontWeight: 800,
                                fontFamily: 'monospace'
                              }}
                            />
                          </div>

                          {/* المنسوب الحالي */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#10B981', fontWeight: 800, marginBottom: '3px' }}>
                              المنسوب الحالي (لتر)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={t.current_level ?? ''}
                              onChange={(e) => handleUpdateTankRow(idx, 'current_level', Number(e.target.value) || 0)}
                              placeholder="0"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isDaylight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#10B981',
                                fontSize: '12px',
                                fontWeight: 900,
                                fontFamily: 'monospace'
                              }}
                            />
                          </div>

                          {/* زر الحذف */}
                          <div style={{ paddingTop: '15px' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveTankRow(idx)}
                              title="حذف هذا الخزان"
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#EF4444',
                                borderRadius: '8px',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                fontSize: '14px'
                              }}
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

              {/* محتوى تبويب المضخات */}
              {modalActiveTab === 'pumps' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: isDaylight ? '#007799' : '#00E5FF' }}>
                      قائمة المضخات المسجلة ({editingPumps.length}):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddPumpRow}
                      style={{
                        background: isDaylight ? 'rgba(0, 153, 204, 0.12)' : 'rgba(0, 229, 255, 0.15)',
                        border: isDaylight ? '1px solid rgba(0, 153, 204, 0.35)' : '1px solid rgba(0, 229, 255, 0.4)',
                        color: isDaylight ? '#007799' : '#00E5FF',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>➕ إضافة مضخة جديدة</span>
                    </button>
                  </div>

                  {editingPumps.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: isDaylight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                      border: isDaylight ? '1px dashed #CBD5E1' : '1px dashed rgba(255, 255, 255, 0.15)',
                      borderRadius: '14px',
                      color: isDaylight ? '#64748B' : '#94A3B8',
                      fontSize: '13px'
                    }}>
                      لا توجد أي مضخات مسجلة لهذه المحطة حالياً. انقر على «إضافة مضخة جديدة» بالأعلى للبدء.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {editingPumps.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: isDaylight ? '#F8FAFC' : 'rgba(11, 14, 20, 0.75)',
                            border: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'grid',
                            gridTemplateColumns: '0.8fr 1.2fr 1fr 1fr 1.2fr 0.8fr auto',
                            gap: '8px',
                            alignItems: 'center'
                          }}
                        >
                          {/* رقم المضخة */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              الرقم
                            </label>
                            <input
                              type="text"
                              value={p.pump_number || ''}
                              onChange={(e) => handleUpdatePumpRow(idx, 'pump_number', e.target.value)}
                              placeholder="01"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: isDaylight ? '#2C1A12' : '#F8FAFC',
                                fontSize: '12px',
                                fontWeight: 800,
                                textAlign: 'center'
                              }}
                            />
                          </div>

                          {/* اسم المضخة */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              اسم المضخة
                            </label>
                            <input
                              type="text"
                              value={p.pump_name || ''}
                              onChange={(e) => handleUpdatePumpRow(idx, 'pump_name', e.target.value)}
                              placeholder="مضخة 1"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: isDaylight ? '#2C1A12' : '#F8FAFC',
                                fontSize: '12px',
                                fontWeight: 800
                              }}
                            />
                          </div>

                          {/* نوع الوقود */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              الوقود
                            </label>
                            <select
                              value={p.fuel_type || 'بنزين 91'}
                              onChange={(e) => handleUpdatePumpRow(idx, 'fuel_type', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: isDaylight ? '#2C1A12' : '#F8FAFC',
                                fontSize: '11px',
                                fontWeight: 800
                              }}
                            >
                              <option value="بنزين 91">بنزين 91</option>
                              <option value="بنزين 95">بنزين 95</option>
                              <option value="ديزل">ديزل</option>
                              <option value="كيروسين">كيروسين</option>
                            </select>
                          </div>

                          {/* سعر اللتر */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              السعر (ر.س)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={p.unit_price ?? ''}
                              onChange={(e) => handleUpdatePumpRow(idx, 'unit_price', Number(e.target.value) || 0)}
                              placeholder="2.18"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: isDaylight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                                border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                                color: isDaylight ? '#2C1A12' : '#F8FAFC',
                                fontSize: '12px',
                                fontWeight: 800,
                                fontFamily: 'monospace'
                              }}
                            />
                          </div>

                          {/* العداد الحالي */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#00E5FF', fontWeight: 800, marginBottom: '3px' }}>
                              العداد الرقمي (لتر)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={p.current_meter ?? ''}
                              onChange={(e) => handleUpdatePumpRow(idx, 'current_meter', Number(e.target.value) || 0)}
                              placeholder="0"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: isDaylight ? '#EFF6FF' : 'rgba(0, 229, 255, 0.08)',
                                border: '1px solid rgba(0, 229, 255, 0.3)',
                                color: isDaylight ? '#0284C7' : '#00E5FF',
                                fontSize: '12px',
                                fontWeight: 900,
                                fontFamily: 'monospace'
                              }}
                            />
                          </div>

                          {/* حالة التشغيل */}
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: isDaylight ? '#64748B' : '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                              الحالة
                            </label>
                            <button
                              type="button"
                              onClick={() => handleUpdatePumpRow(idx, 'is_active', !p.is_active)}
                              style={{
                                width: '100%',
                                padding: '6px 4px',
                                borderRadius: '8px',
                                border: p.is_active ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                                background: p.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: p.is_active ? '#10B981' : '#EF4444',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {p.is_active ? 'نشطة' : 'صيانة'}
                            </button>
                          </div>

                          {/* زر الحذف */}
                          <div style={{ paddingTop: '15px' }}>
                            <button
                              type="button"
                              onClick={() => handleRemovePumpRow(idx)}
                              title="حذف هذه المضخة"
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#EF4444',
                                borderRadius: '8px',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px'
                              }}
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
            </div>

            {/* أسفل النافذة والأزرار */}
            <div style={{
              padding: '16px 22px',
              borderTop: isDaylight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: isDaylight ? '#FAF8F5' : 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: isDaylight ? '#64748B' : '#94A3B8' }}>
                <span>
                  سعة الخزانات: <strong style={{ color: isDaylight ? '#2C1A12' : '#C29B62' }}>
                    {editingTanks.reduce((sum, t) => sum + (Number(t.capacity_liters) || 0), 0).toLocaleString()} لتر
                  </strong>
                </span>
                <span>•</span>
                <span>
                  المضخات: <strong style={{ color: isDaylight ? '#007799' : '#00E5FF' }}>
                    {editingPumps.length} مضخة ({editingPumps.filter(p => p.is_active).length} نشطة)
                  </strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsManageTanksModalOpen(false)}
                  style={{
                    background: isDaylight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                    border: isDaylight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                    color: isDaylight ? '#64748B' : '#94A3B8',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSaveTanks}
                  disabled={logic.isSavingTanks}
                  style={{
                    background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '8px 22px',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: logic.isSavingTanks ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(194, 155, 98, 0.35)'
                  }}
                >
                  {logic.isSavingTanks ? 'جاري الحفظ...' : '💾 حفظ وتحديث الداشبورد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚡ نافذة قياس وتعديل منسوب الخزان السريع (Quick Level Calibration Modal) */}
      {/* ========================================================================= */}
      {calibratingTank && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(7, 10, 15, 0.88)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.98) 0%, rgba(13, 16, 24, 0.96) 100%)',
            border: '1.5px solid rgba(0, 229, 255, 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 229, 255, 0.2)',
            overflow: 'hidden'
          }}>
            {/* رأس النافذة */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📏</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#F8FAFC' }}>
                    تعديل منسوب الخزان / قياس المسطرة
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {calibratingTank.name} - {calibratingTank.warehouseName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCalibratingTank(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  color: '#94A3B8',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* جسم النافذة */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(0, 229, 255, 0.06)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>السعة القصوى للخزان:</span>
                  <strong style={{ fontSize: '15px', color: '#00E5FF', fontFamily: 'monospace' }}>
                    {Number(calibratingTank.capacity || 0).toLocaleString()} لتر
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>المنسوب الحالي المسجل:</span>
                  <strong style={{ fontSize: '15px', color: '#10B981', fontFamily: 'monospace' }}>
                    {Number(calibratingTank.currentLiters || 0).toLocaleString()} لتر
                  </strong>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px' }}>
                  ⛽ اكتب منسوب الوقود الجديد (لتر):
                </label>
                <input
                  type="number"
                  min="0"
                  max={calibratingTank.capacity || 999999}
                  value={newLevelInput}
                  onChange={(e) => setNewLevelInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="أدخل عدد اللترات الفعلي"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(11, 14, 20, 0.9)',
                    border: '2px solid #00E5FF',
                    color: '#F8FAFC',
                    fontSize: '18px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* أزرار النسب السريعة */}
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 800, marginBottom: '6px' }}>
                  أو اختر نسبة سريعة من سعة الخزان:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {[
                    { label: '0%', ratio: 0 },
                    { label: '25%', ratio: 0.25 },
                    { label: '50%', ratio: 0.50 },
                    { label: '75%', ratio: 0.75 },
                    { label: '100%', ratio: 1.0 }
                  ].map((p) => {
                    const liters = Math.round((calibratingTank.capacity || 0) * p.ratio);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setNewLevelInput(liters)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#F8FAFC',
                          borderRadius: '8px',
                          padding: '6px 2px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* أزرار التأكيد */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <button
                type="button"
                onClick={() => setCalibratingTank(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#94A3B8',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveCalibratedLevel}
                disabled={logic.isUpdatingLevel}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: logic.isUpdatingLevel ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                }}
              >
                {logic.isUpdatingLevel ? 'جاري التحديث...' : 'تحديث المنسوب ⛽'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MasterPage>
  );
}

