"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useKpisLogic } from './kpis_logic';

export default function KpisPage() {
    const {
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        totalSales,
        totalCollections,
        totalOutstandingDebts,
        collectionRate,
        isLoading
    } = useKpisLogic();

    return (
        <div style={{ padding: '20px', minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.primary} 0%, #0a192f 100%)`, fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>
            {/* Header */}
            <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '30px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: `linear-gradient(45deg, ${THEME.accent}, #c084fc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>مؤشرات الأداء الرئيسية (KPIs)</span>
                            <span style={{ fontSize: '24px' }}>✨</span>
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            أرقام سريعة تلخص أداء المبيعات، التحصيلات، ونسبة السيولة.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ color: THEME.accentLight, fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>من تاريخ</div>
                        <input 
                            type="date" 
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ color: THEME.accentLight, fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>إلى تاريخ</div>
                        <input 
                            type="date" 
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '20px' }}>جاري الحساب...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
                    {/* Total Sales KPI */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(2, 132, 199, 0.25))', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '35px 25px', borderRadius: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.1 }}>💰</div>
                        <div style={{ color: '#7dd3fc', fontSize: '16px', fontWeight: 900, marginBottom: '15px', position: 'relative' }}>إجمالي المبيعات (الفواتير)</div>
                        <div style={{ color: 'white', fontSize: '42px', fontWeight: 900, position: 'relative' }}>{formatCurrency(totalSales)}</div>
                        <div style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700, marginTop: '10px', position: 'relative' }}>حجم المبيعات خلال الفترة المحددة</div>
                    </div>

                    {/* Total Collections KPI */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '35px 25px', borderRadius: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.1 }}>💵</div>
                        <div style={{ color: '#6ee7b7', fontSize: '16px', fontWeight: 900, marginBottom: '15px', position: 'relative' }}>إجمالي التحصيلات (السيولة)</div>
                        <div style={{ color: 'white', fontSize: '42px', fontWeight: 900, position: 'relative' }}>{formatCurrency(totalCollections)}</div>
                        <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 700, marginTop: '10px', position: 'relative' }}>المبالغ المقبوضة فعلياً</div>
                    </div>

                    {/* Outstanding Debts KPI */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(159, 18, 57, 0.25))', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '35px 25px', borderRadius: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.1 }}>⚠️</div>
                        <div style={{ color: '#fda4af', fontSize: '16px', fontWeight: 900, marginBottom: '15px', position: 'relative' }}>الديون المتبقية في السوق (رصيد العملاء)</div>
                        <div style={{ color: 'white', fontSize: '42px', fontWeight: 900, position: 'relative' }}>{formatCurrency(totalOutstandingDebts)}</div>
                        <div style={{ color: '#fb7185', fontSize: '13px', fontWeight: 700, marginTop: '10px', position: 'relative' }}>إجمالي المستحقات غير المحصلة</div>
                    </div>

                    {/* Collection Rate KPI */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.15), rgba(162, 28, 175, 0.25))', border: '1px solid rgba(217, 70, 239, 0.4)', padding: '35px 25px', borderRadius: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.1 }}>📈</div>
                        <div style={{ color: '#f0abfc', fontSize: '16px', fontWeight: 900, marginBottom: '15px', position: 'relative' }}>نسبة التحصيل إلى المبيعات</div>
                        <div style={{ color: 'white', fontSize: '42px', fontWeight: 900, position: 'relative' }}>{collectionRate}%</div>
                        
                        {/* Progress Bar for Visual Impact */}
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '20px', overflow: 'hidden' }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${collectionRate}%`, 
                                background: 'linear-gradient(90deg, #d946ef, #f0abfc)',
                                borderRadius: '10px'
                            }}></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
