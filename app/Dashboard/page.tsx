"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MasterPage from '@/components/MasterPage';
import LoadingScreen from '@/components/LoadingScreen';
import { THEME } from '@/lib/theme';
import { useDashboardLogic } from './dashboard_logic';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const logic = useDashboardLogic();
  const router = useRouter();

  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');
  const [isManageTanksModalOpen, setIsManageTanksModalOpen] = useState(false);
  const [selectedStationForEdit, setSelectedStationForEdit] = useState<string>('');
  const [editingTanks, setEditingTanks] = useState<any[]>([]);
  
  // Quick level calibration modal state
  const [calibratingTank, setCalibratingTank] = useState<any | null>(null);
  const [newLevelInput, setNewLevelInput] = useState<number | ''>('');

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const stats = logic.stats;

  const handleOpenManageTanks = (stationId?: string) => {
    const stations = stats?.allStations || [];
    const targetStationId = stationId || (selectedStationFilter !== 'all' ? selectedStationFilter : (stations[0]?.id || ''));
    setSelectedStationForEdit(targetStationId);
    const targetStation = stations.find((s: any) => s.id === targetStationId);
    if (targetStation && Array.isArray(targetStation.tanks)) {
      setEditingTanks(JSON.parse(JSON.stringify(targetStation.tanks)));
    } else {
      setEditingTanks([]);
    }
    setIsManageTanksModalOpen(true);
  };

  const handleStationChangeInModal = (stationId: string) => {
    setSelectedStationForEdit(stationId);
    const targetStation = (stats?.allStations || []).find((s: any) => s.id === stationId);
    if (targetStation && Array.isArray(targetStation.tanks)) {
      setEditingTanks(JSON.parse(JSON.stringify(targetStation.tanks)));
    } else {
      setEditingTanks([]);
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

  const handleSaveTanks = async () => {
    if (!selectedStationForEdit) return;
    try {
      await logic.saveStationTanks({
        warehouseId: selectedStationForEdit,
        tanks: editingTanks
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

  const displayedTanks = (stats?.fuelTanks || []).filter((tank: any) => {
    if (selectedStationFilter === 'all') return true;
    return tank.warehouseId === selectedStationFilter;
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
          {/* 🛢️ 2. الأولوية القصوى: مراقبة وإدارة خزانات الوقود (Fuel Storage Tanks) */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00E5FF' }}>🛢️</span>
                  مخزون خزانات الوقود الاستراتيجي (Fuel Storage Tanks)
                </h3>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
                  مراقبة السعة المتاحة والمنسوب اللحظي لجميع المحطات مع إمكانية المعايرة والإضافة السريعة
                </div>
              </div>

              {/* أدوات التحكم والفلاتر والإضافة */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* فلتر المحطات إذا كان هناك أكثر من محطة أو لعرض محدد */}
                {(stats.allStations || []).length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(20, 24, 34, 0.85)', padding: '4px 8px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>المحطة:</span>
                    <select
                      value={selectedStationFilter}
                      onChange={(e) => setSelectedStationFilter(e.target.value)}
                      style={{
                        background: 'transparent',
                        color: '#00E5FF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value="all" style={{ background: '#0F141C', color: '#FFF' }}>
                        كل المحطات ({stats.fuelTanks?.length || 0} خزان)
                      </option>
                      {(stats.allStations || []).map((st: any) => (
                        <option key={st.id} value={st.id} style={{ background: '#0F141C', color: '#FFF' }}>
                          {st.name} ({st.tanks?.length || 0} خزان)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* زر إضافة / ضبط الخزانات */}
                <button
                  type="button"
                  onClick={() => handleOpenManageTanks()}
                  style={{
                    background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(194, 155, 98, 0.5)',
                    borderRadius: '10px',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(168, 87, 60, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>➕ إضافة / ضبط الخزانات</span>
                </button>

                {/* زر التحديث اللحظي */}
                <button
                  type="button"
                  onClick={() => logic.refetch()}
                  title="تحديث قراءات الخزانات"
                  style={{
                    background: 'rgba(0, 229, 255, 0.1)',
                    color: '#00E5FF',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '7px 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🔄
                </button>
              </div>
            </div>

            {/* 📊 شريط المؤشرات الحيوية المجمعة للخزانات (Tanks KPI Summary Bar) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '18px'
            }}>
              {/* إجمالي الخزانات */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>إجمالي الخزانات</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#00E5FF', fontFamily: 'monospace', marginTop: '2px' }}>
                    {stats.tanksSummary?.totalTanksCount || stats.fuelTanks?.length || 0}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginRight: '4px' }}>خزان</span>
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>🛢️</span>
              </div>

              {/* السعة التخزينية الكلية */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>السعة التخزينية الكلية</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#38BDF8', fontFamily: 'monospace', marginTop: '2px' }}>
                    {Number(stats.tanksSummary?.totalStorageCapacity || 0).toLocaleString()}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginRight: '4px' }}>لتر</span>
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>📦</span>
              </div>

              {/* الوقود الفعلي المتوفر */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>الوقود الفعلي المتوفر</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981', fontFamily: 'monospace', marginTop: '2px' }}>
                    {Number(stats.tanksSummary?.totalCurrentLiters || 0).toLocaleString()}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginRight: '4px' }}>لتر</span>
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>⛽</span>
              </div>

              {/* نسبة الامتلاء الكلية */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 27, 38, 0.85) 0%, rgba(14, 18, 25, 0.8) 100%)',
                border: '1px solid rgba(194, 155, 98, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', fontWeight: 800 }}>
                    <span>نسبة الامتلاء العامة</span>
                    <span style={{ color: '#C29B62', fontWeight: 900 }}>{stats.tanksSummary?.overallFillPercentage || 0}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' }}>
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

            {/* شبكة بطاقات الخزانات */}
            {(!displayedTanks || displayedTanks.length === 0) ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.7) 0%, rgba(13, 16, 24, 0.6) 100%)',
                border: '1.5px dashed rgba(0, 229, 255, 0.35)',
                borderRadius: '18px',
                color: '#94A3B8'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🛢️</div>
                <div style={{ fontWeight: 900, fontSize: '16px', color: '#F8FAFC' }}>
                  {selectedStationFilter === 'all' ? 'لا توجد خزانات وقود مسجلة بعد' : 'لا توجد خزانات مسجلة لهذه المحطة بعد'}
                </div>
                <div style={{ fontSize: '13px', marginTop: '6px', marginBottom: '16px' }}>
                  يمكنك إضافة وتحديد سعات الخزانات وأنواع الوقود (بنزين 91، بنزين 95، ديزل) بسهولة الآن
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenManageTanks()}
                  style={{
                    background: 'linear-gradient(135deg, #00E5FF 0%, #0099CC 100%)',
                    color: '#07090D',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0, 229, 255, 0.35)'
                  }}
                >
                  ➕ إضافة أول خزان وقود الآن
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {displayedTanks.map((tank: any) => {
                  const isWarn = tank.status === 'warning';
                  const tankColor = tank.color || '#00E5FF';

                  return (
                    <div 
                      key={tank.id} 
                      style={{
                        background: 'linear-gradient(180deg, rgba(22, 27, 38, 0.9) 0%, rgba(14, 18, 25, 0.85) 100%)',
                        border: `1.5px solid ${isWarn ? '#E06D44' : 'rgba(0, 229, 255, 0.3)'}`,
                        borderRadius: '18px',
                        padding: '20px',
                        boxShadow: isWarn 
                          ? '0 8px 30px rgba(224, 109, 68, 0.25), inset 0 0 15px rgba(224, 109, 68, 0.08)' 
                          : '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 0 15px rgba(0, 229, 255, 0.05)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {/* لمعة النيون العلوية */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '15%',
                        right: '15%',
                        height: '2px',
                        background: `linear-gradient(90deg, transparent, ${tankColor}, transparent)`,
                        boxShadow: `0 0 10px ${tankColor}`
                      }}></div>

                      {/* رأس بطاقة الخزان */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>⛽</span>
                            <span style={{ fontWeight: 900, fontSize: '16px', color: '#F8FAFC' }}>
                              {tank.name}
                            </span>
                          </div>
                          {tank.warehouseName && (
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🏢 {tank.warehouseName}</span>
                            </div>
                          )}
                          <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                            السعر المعتمد: <strong style={{ color: tankColor }}>{tank.unitPrice} ر.س / لتر</strong>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: isWarn ? '#E06D44' : '#10B981',
                          background: isWarn ? 'rgba(224, 109, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          border: `1px solid ${isWarn ? 'rgba(224, 109, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                          padding: '4px 10px',
                          borderRadius: '20px'
                        }}>
                          {tank.statusText}
                        </span>
                      </div>

                      {/* جسم الخزان الاسطواني والتصميم السيبراني */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '15px 0' }}>
                        
                        {/* أسطوانة الوقود الرأسية المضيئة */}
                        <div style={{
                          width: '56px',
                          height: '110px',
                          borderRadius: '28px',
                          background: 'rgba(11, 14, 20, 0.95)',
                          border: `2px solid ${isWarn ? 'rgba(224, 109, 68, 0.5)' : 'rgba(0, 229, 255, 0.35)'}`,
                          boxShadow: `inset 0 0 12px rgba(0,0,0,0.8), 0 0 15px ${isWarn ? 'rgba(224, 109, 68, 0.2)' : 'rgba(0, 229, 255, 0.15)'}`,
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          flexShrink: 0
                        }}>
                          {/* خطوط القياس التدريجية */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px 4px', pointerEvents: 'none', zIndex: 2 }}>
                            <span style={{ width: '8px', height: '1px', background: 'rgba(255,255,255,0.25)' }}></span>
                            <span style={{ width: '12px', height: '1px', background: 'rgba(255,255,255,0.35)' }}></span>
                            <span style={{ width: '8px', height: '1px', background: 'rgba(255,255,255,0.25)' }}></span>
                          </div>

                          {/* سائل الوقود الممتلئ مع تأثير التموج والنيون */}
                          <div style={{
                            width: '100%',
                            height: `${tank.percentage}%`,
                            background: `linear-gradient(180deg, ${tankColor} 0%, rgba(15, 23, 42, 0.8) 100%)`,
                            boxShadow: `0 0 15px ${tankColor}`,
                            borderRadius: '0 0 26px 26px',
                            transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative'
                          }}>
                            {/* سطح السائل المتوهج */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: '#FFFFFF',
                              boxShadow: `0 0 8px ${tankColor}`,
                              borderRadius: '50%'
                            }}></div>
                          </div>
                        </div>

                        {/* الأرقام والبيانات الإحصائية للخزان */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ 
                              fontSize: '30px', 
                              fontWeight: 900, 
                              color: '#F8FAFC',
                              fontFamily: 'monospace',
                              textShadow: `0 0 15px ${tankColor}40`
                            }}>
                              {Number(tank.currentLiters || 0).toLocaleString()}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>لتر</span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 700 }}>
                            من إجمالي سعة: {Number(tank.capacity || 0).toLocaleString()} لتر
                          </div>

                          {/* مؤشر النسبة المئوية */}
                          <div style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '5px' }}>
                              <span style={{ color: '#94A3B8' }}>نسبة الامتلاء:</span>
                              <span style={{ color: tankColor }}>{tank.percentage}%</span>
                            </div>
                            <div style={{ width: '100%', height: '7px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${tank.percentage}%`,
                                height: '100%',
                                background: tankColor,
                                boxShadow: `0 0 10px ${tankColor}`,
                                borderRadius: '10px',
                                transition: 'width 0.8s ease'
                              }}></div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* أزرار الإجراء السريع أسفل البطاقة */}
                      <div style={{ 
                        marginTop: '15px', 
                        paddingTop: '12px', 
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          القيمة: <strong style={{ color: '#F8FAFC' }}>{logic.formatCurrency(Number(tank.currentLiters || 0) * Number(tank.unitPrice || 0))}</strong>
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenCalibrateModal(tank)}
                            style={{
                              background: 'rgba(0, 229, 255, 0.12)',
                              border: '1px solid rgba(0, 229, 255, 0.4)',
                              color: '#00E5FF',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <span>⚡ قياس المنسوب</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push('/inventory')}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${tankColor}60`,
                              color: tankColor,
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            تفريغ صهريج 🚚
                          </button>
                        </div>
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
      {/* 🛢️ نافذة إدارة وإضافة الخزانات (Manage & Add Tanks Modal) */}
      {/* ========================================================================= */}
      {isManageTanksModalOpen && (
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
            border: '1.5px solid rgba(194, 155, 98, 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(194, 155, 98, 0.15)',
            overflow: 'hidden'
          }}>
            {/* رأس النافذة */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🛢️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>
                    إدارة وإضافة خزانات الوقود للمحطة
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
                    حدد المحطة وأضف أو عدّل الخزانات وسعاتها ونوع الوقود والمنسوب الحالي
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManageTanksModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  color: '#94A3B8',
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px' }}>
                  🏢 المحطة / الفرع المراد ضبط خزاناته:
                </label>
                <select
                  value={selectedStationForEdit}
                  onChange={(e) => handleStationChangeInModal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(11, 14, 20, 0.9)',
                    border: '1px solid rgba(0, 229, 255, 0.35)',
                    color: '#F8FAFC',
                    fontSize: '13px',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                >
                  {(stats.allStations || []).map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.tanks?.length || 0} خزان حالي)
                    </option>
                  ))}
                </select>
              </div>

              {/* جدول/قائمة الخزانات */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#00E5FF' }}>
                    قائمة الخزانات التابعة لهذه المحطة ({editingTanks.length}):
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTankRow}
                    style={{
                      background: 'rgba(0, 229, 255, 0.12)',
                      border: '1px solid rgba(0, 229, 255, 0.4)',
                      color: '#00E5FF',
                      borderRadius: '8px',
                      padding: '5px 12px',
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
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '14px',
                    color: '#94A3B8',
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
                          background: 'rgba(11, 14, 20, 0.75)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
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
                          <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
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
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#F8FAFC',
                              fontSize: '12px',
                              fontWeight: 800
                            }}
                          />
                        </div>

                        {/* نوع الوقود */}
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
                            نوع الوقود
                          </label>
                          <select
                            value={t.fuel_type || 'بنزين 91'}
                            onChange={(e) => handleUpdateTankRow(idx, 'fuel_type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#F8FAFC',
                              fontSize: '12px',
                              fontWeight: 800
                            }}
                          >
                            <option value="بنزين 91" style={{ background: '#0F141C' }}>بنزين 91</option>
                            <option value="بنزين 95" style={{ background: '#0F141C' }}>بنزين 95</option>
                            <option value="ديزل" style={{ background: '#0F141C' }}>ديزل</option>
                            <option value="كيروسين" style={{ background: '#0F141C' }}>كيروسين</option>
                            <option value="زيوت" style={{ background: '#0F141C' }}>زيوت ومواد</option>
                          </select>
                        </div>

                        {/* السعة القصوى */}
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', fontWeight: 800, marginBottom: '3px' }}>
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
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#F8FAFC',
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
                              background: 'rgba(16, 185, 129, 0.08)',
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
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#EF4444',
                              borderRadius: '8px',
                              width: '32px',
                              height: '32px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
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
            </div>

            {/* أسفل النافذة والأزرار */}
            <div style={{
              padding: '16px 22px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                إجمالي سعة الخزانات: <strong style={{ color: '#00E5FF' }}>
                  {editingTanks.reduce((sum, t) => sum + (Number(t.capacity_liters) || 0), 0).toLocaleString()} لتر
                </strong>
              </span>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsManageTanksModalOpen(false)}
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
                  onClick={handleSaveTanks}
                  disabled={logic.isSavingTanks}
                  style={{
                    background: 'linear-gradient(135deg, #00E5FF 0%, #0099CC 100%)',
                    border: 'none',
                    color: '#07090D',
                    borderRadius: '10px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: logic.isSavingTanks ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(0, 229, 255, 0.35)'
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

