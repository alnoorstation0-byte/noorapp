"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useVehicleExpensesLogic } from './vehicle_expenses_logic';

export default function VehicleExpensesPage() {
    const {
        filteredData,
        globalSearch,
        setGlobalSearch,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        exportToExcel,
        totals,
        isLoading
    } = useVehicleExpensesLogic();

    return (
        <div className="veh-exp-container" style={{ padding: '20px', minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.primary} 0%, #0a192f 100%)`, fontFamily: 'Tajawal, sans-serif', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
            <style>{`
                @media (max-width: 768px) {
                    .veh-exp-container { padding: 10px 8px !important; }
                    .veh-exp-header { padding: 15px !important; border-radius: 16px !important; }
                    .veh-exp-header h1 { font-size: 20px !important; }
                    .veh-exp-btn { width: 100% !important; justify-content: center !important; min-height: 44px !important; }
                    .veh-exp-filters { flex-direction: column !important; gap: 10px !important; }
                    .veh-exp-filters > div { flex: 1 1 100% !important; width: 100% !important; }
                    .veh-exp-totals-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .veh-exp-total-card { padding: 15px !important; border-radius: 16px !important; }
                    .veh-exp-total-card div:last-child { font-size: 22px !important; }
                    .veh-exp-table-card { border-radius: 16px !important; }
                    .veh-exp-table { min-width: 650px !important; }
                    .veh-exp-table th, .veh-exp-table td { padding: 8px 10px !important; font-size: 11px !important; }
                }
            `}</style>
            {/* Header Section */}
            <div className="veh-exp-header" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '30px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: `linear-gradient(45deg, ${THEME.accent}, #fde047)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>مصروفات السيارات (صيانة وديزل)</span>
                            <span style={{ fontSize: '24px' }}>🚚</span>
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            تجميع وتحليل تكاليف الصيانة والمحروقات والمصاريف التشغيلية لكل سيارة.
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="veh-exp-btn" onClick={exportToExcel} style={{ background: 'linear-gradient(45deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(16,185,129,0.3)', transition: '0.3s' }}>
                            <span>تصدير Excel</span>
                            <span style={{ fontSize: '18px' }}>📊</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="veh-exp-filters" style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <div style={{ color: THEME.accentLight, fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>بحث شامل</div>
                        <input 
                            type="text" 
                            placeholder="ابحث برقم اللوحة، الموديل..." 
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                        />
                    </div>
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

            {/* Global Totals Dashboard */}
            <div className="veh-exp-totals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="veh-exp-total-card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '20px', borderRadius: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 900, marginBottom: '5px' }}>إجمالي الديزل/المحروقات</div>
                    <div style={{ color: 'white', fontSize: '28px', fontWeight: 900 }}>{formatCurrency(totals.totalDiesel)}</div>
                </div>
                <div className="veh-exp-total-card" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '20px', borderRadius: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 900, marginBottom: '5px' }}>إجمالي الصيانة</div>
                    <div style={{ color: 'white', fontSize: '28px', fontWeight: 900 }}>{formatCurrency(totals.totalMaintenance)}</div>
                </div>
                <div className="veh-exp-total-card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '20px', borderRadius: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 900, marginBottom: '5px' }}>إجمالي مصاريف الرحلات</div>
                    <div style={{ color: 'white', fontSize: '28px', fontWeight: 900 }}>{formatCurrency(totals.totalTripExpenses)}</div>
                </div>
                <div className="veh-exp-total-card" style={{ background: 'rgba(225, 29, 72, 0.1)', border: '1px solid rgba(225, 29, 72, 0.3)', padding: '20px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(225, 29, 72, 0.2)' }}>
                    <div style={{ color: '#fb7185', fontSize: '13px', fontWeight: 900, marginBottom: '5px' }}>إجمالي التكاليف الكلية</div>
                    <div style={{ color: 'white', fontSize: '28px', fontWeight: 900 }}>{formatCurrency(totals.totalOverallCost)}</div>
                </div>
            </div>

            {/* Data Table */}
            <div className="veh-exp-table-card" style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ padding: '50px', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '20px' }}>جاري التحميل...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="veh-exp-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: 'white' }}>
                            <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <tr>
                                    <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>السيارة (اللوحة)</th>
                                    <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>مصروفات الصيانة 🛠️</th>
                                    <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>محروقات/ديزل ⛽</th>
                                    <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>أخرى 🏷️</th>
                                    <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>مصاريف الرحلات 🚚</th>
                                    <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>التكلفة الكلية 💰</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? filteredData.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', transition: '0.2s' }}>
                                        <td style={{ padding: '20px', fontWeight: 900, fontSize: '16px' }}>{item.name}</td>
                                        <td style={{ padding: '20px', fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(item.maintenanceCost)}</td>
                                        <td style={{ padding: '20px', fontWeight: 800, color: '#10b981' }}>{formatCurrency(item.dieselCost)}</td>
                                        <td style={{ padding: '20px', fontWeight: 800, color: '#94a3b8' }}>{formatCurrency(item.otherCost)}</td>
                                        <td style={{ padding: '20px', fontWeight: 800, color: '#3b82f6' }}>
                                            <div>{formatCurrency(item.tripExpenses)}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{item.totalTrips} رحلات</div>
                                        </td>
                                        <td style={{ padding: '20px', fontWeight: 900, color: '#fb7185', fontSize: '18px' }}>{formatCurrency(item.totalCost)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 900 }}>لا توجد بيانات مطابقة للبحث</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
