"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { useReorderAlertsLogic } from './reorder_alerts_logic';

export default function ReorderAlertsPage() {
    const {
        sortedItems,
        globalSearch,
        setGlobalSearch,
        totalShortageItems,
        outOfStockItems,
        totalRequiredQty,
        isLoading,
        exportToExcel
    } = useReorderAlertsLogic();

    return (
        <div className="reorder-container" style={{ padding: '20px', minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.primary} 0%, #0a192f 100%)`, fontFamily: 'Tajawal, sans-serif', direction: 'rtl', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(225, 29, 72, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
                }
                @media (max-width: 768px) {
                    .reorder-container { padding: 10px 8px !important; }
                    .reorder-header { padding: 15px !important; border-radius: 16px !important; }
                    .reorder-header h1 { font-size: 20px !important; }
                    .reorder-btn { width: 100% !important; justify-content: center !important; min-height: 44px !important; }
                    .reorder-kpi-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .reorder-kpi-card { padding: 15px !important; border-radius: 16px !important; }
                    .reorder-kpi-card div:nth-child(2) { font-size: 24px !important; }
                    .reorder-table-card { border-radius: 16px !important; }
                    .reorder-table { min-width: 600px !important; }
                    .reorder-table th, .reorder-table td { padding: 8px 10px !important; font-size: 11px !important; }
                }

                .daylight-theme .reorder-container { background: #FDFBF7 !important; }
                .daylight-theme .reorder-header { 
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important; 
                    border: 1px solid rgba(194, 155, 98, 0.3) !important; 
                    box-shadow: 0 4px 20px rgba(44, 26, 18, 0.08) !important; 
                }
                .daylight-theme .reorder-header h1 { color: #2C1A12 !important; }
                .daylight-theme .reorder-header p { color: rgba(44, 26, 18, 0.7) !important; }
                .daylight-theme .reorder-header input { 
                    background: #FFFFFF !important; 
                    border-color: rgba(194, 155, 98, 0.35) !important; 
                    color: #2C1A12 !important; 
                }
                .daylight-theme .reorder-kpi-card { 
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important; 
                    border: 1px solid rgba(194, 155, 98, 0.3) !important; 
                    box-shadow: 0 4px 15px rgba(44, 26, 18, 0.08) !important; 
                }
                .daylight-theme .reorder-kpi-card div:nth-child(2) { color: #2C1A12 !important; }
                .daylight-theme .reorder-table-card { 
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important; 
                    border: 1px solid rgba(194, 155, 98, 0.3) !important; 
                    box-shadow: 0 8px 30px rgba(44, 26, 18, 0.08) !important; 
                }
                .daylight-theme .reorder-table { color: #2C1A12 !important; }
                .daylight-theme .reorder-table thead { background: rgba(194, 155, 98, 0.12) !important; }
                .daylight-theme .reorder-table th { color: #2C1A12 !important; border-bottom: 1px solid rgba(194, 155, 98, 0.25) !important; }
                .daylight-theme .reorder-table td { border-bottom: 1px solid rgba(194, 155, 98, 0.15) !important; color: #2C1A12 !important; }
                .daylight-theme .reorder-table tr:hover { background: rgba(194, 155, 98, 0.06) !important; }
            `}</style>
            {/* Header */}
            <div className="reorder-header" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '30px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: `linear-gradient(45deg, ${THEME.accent}, #fb7185)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>نواقص المخزون (Reorder Alerts)</span>
                            <span style={{ fontSize: '24px' }}>⚠️</span>
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            منبه بالأصناف التي قارب رصيدها على الانتهاء ويجب طلب شرائها فوراً.
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="reorder-btn" onClick={exportToExcel} disabled={sortedItems.length === 0} style={{ background: sortedItems.length === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(45deg, #10b981, #059669)', color: sortedItems.length === 0 ? '#64748b' : 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 900, cursor: sortedItems.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: sortedItems.length === 0 ? 'none' : '0 10px 20px rgba(16,185,129,0.3)', transition: '0.3s' }}>
                            <span>تصدير Excel</span>
                            <span style={{ fontSize: '18px' }}>📑</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <div style={{ color: THEME.accentLight, fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>بحث برمز أو اسم الصنف 🔍</div>
                        <input 
                            type="text" 
                            placeholder="ابحث عن النواقص..." 
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '20px' }}>جاري التحقق من الأرصدة...</div>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div className="reorder-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="reorder-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.2))', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#fcd34d', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>أصناف تحتاج للشراء 🛒</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalShortageItems} <span style={{ fontSize: '16px', fontWeight: 700, color: '#fcd34d' }}>صنف</span></div>
                        </div>
                        <div className="reorder-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.1), rgba(190, 18, 60, 0.2))', border: '1px solid rgba(225, 29, 72, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center', animation: outOfStockItems > 0 ? 'pulse 2s infinite' : 'none' }}>
                            <div style={{ color: '#fda4af', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>أصناف نفذت تماماً 🚨</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{outOfStockItems} <span style={{ fontSize: '16px', fontWeight: 700, color: '#fda4af' }}>صنف</span></div>
                        </div>
                        <div className="reorder-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(2, 132, 199, 0.2))', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#7dd3fc', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>إجمالي الكميات المطلوبة 📦</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalRequiredQty.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="reorder-table-card" style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="reorder-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: 'white' }}>
                                <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    <tr>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>كود الصنف 🔑</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>اسم الصنف 🏷️</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الرصيد الحالي 📦</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>حد الطلب 🛑</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الكمية المطلوبة (عجز) 📉</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الحالة ⚠️</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedItems.length > 0 ? sortedItems.map((item, idx) => {
                                        const isOutOfStock = item.status === 'نفذ من المخزون';
                                        return (
                                            <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOutOfStock ? 'rgba(225, 29, 72, 0.05)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'), transition: '0.2s' }}>
                                                <td style={{ padding: '20px', fontWeight: 800, color: '#94a3b8' }}>{item.code || '-'}</td>
                                                <td style={{ padding: '20px', fontWeight: 900 }}>{item.name}</td>
                                                <td style={{ padding: '20px', fontWeight: 900, color: isOutOfStock ? '#fb7185' : '#fcd34d', fontSize: '16px' }}>{item.currentQty} {item.unit}</td>
                                                <td style={{ padding: '20px', fontWeight: 800, color: '#cbd5e1' }}>{item.reorderLevel}</td>
                                                <td style={{ padding: '20px', fontWeight: 900, color: '#fb7185', fontSize: '18px' }}>{item.shortage}</td>
                                                <td style={{ padding: '20px', fontWeight: 900 }}>
                                                    <span style={{ 
                                                        color: isOutOfStock ? '#fb7185' : '#fcd34d', 
                                                        background: isOutOfStock ? 'rgba(251, 113, 133, 0.1)' : 'rgba(252, 211, 77, 0.1)', 
                                                        padding: '5px 12px', 
                                                        borderRadius: '8px' 
                                                    }}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '60px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
                                                <div style={{ color: '#10b981', fontWeight: 900, fontSize: '20px' }}>لا توجد نواقص في المخزون!</div>
                                                <div style={{ color: '#64748b', marginTop: '5px' }}>جميع أرصدة الأصناف تفوق حد الطلب الأدنى.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
