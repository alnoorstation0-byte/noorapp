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

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const stats = logic.stats;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', animation: 'fadeUp 0.6s ease-out', paddingBottom: '60px' }}>
          
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
                    حالة محطة النور الرئيسية: متصلة وجاهزة
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
                  4 مضخات وقود نشطة | 3 خزانات رئيسية تحت المراقبة الهيدروستاتيكية
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
          {/* 🛢️ 2. الأولوية القصوى: مراقبة منسوب خزانات الوقود (Fuel Storage Tanks) */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00E5FF' }}>🛢️</span>
                  مخزون خزانات الوقود الاستراتيجي (Fuel Storage Tanks)
                </h3>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
                  مراقبة السعة المتاحة ونسبة الامتلاء اللحظية والتنبيه المبكر لإعادة الطلب
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#00E5FF',
                background: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                padding: '4px 12px',
                borderRadius: '16px'
              }}>
                أجهزة القياس: متصلة 🟢
              </span>
            </div>

            {/* شبكة بطاقات الخزانات الثلاثية */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {(stats.fuelTanks || []).map((tank: any) => {
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
                            {tank.shortName}
                          </span>
                        </div>
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
                            fontSize: '32px', 
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
                              borderRadius: '10px'
                            }}></div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* زر الإجراء السريع أسفل البطاقة */}
                    <div style={{ 
                      marginTop: '15px', 
                      paddingTop: '12px', 
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                        القيمة الإجمالية: <strong style={{ color: '#F8FAFC' }}>{logic.formatCurrency(Number(tank.currentLiters || 0) * Number(tank.unitPrice || 0))}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => router.push('/inventory')}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${tankColor}60`,
                          color: tankColor,
                          borderRadius: '8px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        سجل التعبئة 🚚
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
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
                border: '1px solid rgba(224, 109, 68, 0.3)',
                borderRight: '4px solid #E06D44',
                borderRadius: '16px',
                padding: '18px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>حالة الوردية الحالية</span>
                  <span style={{ fontSize: '20px' }}>⏱️</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#E06D44', margin: '10px 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>وردية مفتوحة</span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 700 }}>
                  تطابق كامل بين العداد ومبيعات الكاشير
                </div>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {(stats.fuelPumps || []).map((pump: any) => {
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
    </MasterPage>
  );
}

