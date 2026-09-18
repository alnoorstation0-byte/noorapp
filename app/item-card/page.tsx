"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useItemCardLogic } from './item_card_logic';
import { BarcodeCameraButton } from '@/components/BarcodeScannerWidget';
import LoadingScreen from '@/components/LoadingScreen';

export default function ItemCardPage() {
    const {
        itemsList,
        selectedItemId,
        setSelectedItemId,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        transactions,
        totalIn,
        totalOut,
        finalBalance,
        isLoading,
        exportToExcel
    } = useItemCardLogic();

    return (
        <div className="itemcard-container" style={{ padding: '20px', minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.primary} 0%, #0a192f 100%)`, fontFamily: 'Tajawal, sans-serif', direction: 'rtl', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
            <style>{`
                @media (max-width: 768px) {
                    .itemcard-container { padding: 10px 8px !important; }
                    .itemcard-header { padding: 15px !important; border-radius: 16px !important; margin-bottom: 15px !important; }
                    .itemcard-header h1 { font-size: 20px !important; }
                    .itemcard-btn { width: 100% !important; justify-content: center !important; min-height: 44px !important; }
                    .itemcard-filters { flex-direction: column !important; gap: 10px !important; margin-top: 15px !important; }
                    .itemcard-filters > div { width: 100% !important; flex: 1 1 100% !important; }
                    .itemcard-kpis { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .itemcard-table { min-width: 650px !important; }
                    .itemcard-table th, .itemcard-table td { padding: 8px 10px !important; font-size: 11px !important; }
                }

                .daylight-theme .itemcard-container {
                    background: #FDFBF7 !important;
                }
                .daylight-theme .itemcard-header {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .itemcard-header h1 {
                    color: #2C1A12 !important;
                }
                .daylight-theme .itemcard-header p {
                    color: rgba(44, 26, 18, 0.7) !important;
                }
                .daylight-theme .itemcard-filters {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .itemcard-filters select,
                .daylight-theme .itemcard-filters input {
                    background: #FFFFFF !important;
                    border-color: rgba(194, 155, 98, 0.35) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .itemcard-filters label,
                .daylight-theme .itemcard-filters div {
                    color: #2C1A12 !important;
                }
                .daylight-theme .itemcard-kpis > div {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .itemcard-kpis div:nth-child(2) {
                    color: #2C1A12 !important;
                }
                .daylight-theme .itemcard-table-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 8px 30px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .itemcard-table {
                    color: #2C1A12 !important;
                }
                .daylight-theme .itemcard-table thead {
                    background: rgba(194, 155, 98, 0.12) !important;
                }
                .daylight-theme .itemcard-table th {
                    color: #2C1A12 !important;
                    border-bottom: 1px solid rgba(194, 155, 98, 0.25) !important;
                }
                .daylight-theme .itemcard-table td {
                    border-bottom: 1px solid rgba(194, 155, 98, 0.15) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .itemcard-table td div {
                    color: #2C1A12 !important;
                }
                .daylight-theme .itemcard-table tr:hover {
                    background: rgba(194, 155, 98, 0.06) !important;
                }
            `}</style>
            {/* Header */}
            <div className="itemcard-header" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '30px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: `linear-gradient(45deg, ${THEME.accent}, #38bdf8)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>بطاقة / كارت الصنف</span>
                            <span style={{ fontSize: '24px' }}>🏷️</span>
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            تتبع مسار صنف معين (الوارد والمنصرف بالتفصيل والرصيد المتراكم).
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="itemcard-btn" onClick={exportToExcel} disabled={transactions.length === 0} style={{ background: transactions.length === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(45deg, #10b981, #059669)', color: transactions.length === 0 ? '#64748b' : 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 900, cursor: transactions.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: transactions.length === 0 ? 'none' : '0 10px 20px rgba(16,185,129,0.3)', transition: '0.3s' }}>
                            <span>تصدير Excel</span>
                            <span style={{ fontSize: '18px' }}>📑</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="itemcard-filters" style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '2 1 300px' }}>
                        <div style={{ color: THEME.accentLight, fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>اختيار الصنف 📦</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select 
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                style={{ flex: 1, padding: '14px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer', appearance: 'none', fontWeight: 800 }}
                            >
                                <option value="" style={{ color: 'black' }}>-- اختر صنفاً للبحث --</option>
                                {itemsList.map((item: any) => (
                                    <option key={item.id} value={item.id} style={{ color: 'black' }}>
                                        {item.code ? `[${item.code}] ` : ''} {item.name}
                                    </option>
                                ))}
                            </select>
                            <BarcodeCameraButton 
                                onScan={(scannedBarcode) => {
                                    const match = itemsList.find((i: any) => String(i.code) === scannedBarcode || String(i.id) === scannedBarcode);
                                    if (match) {
                                        setSelectedItemId(match.id);
                                    }
                                }}
                                title="مسح باركود الصنف بكاميرا الكاشير"
                                style={{ height: '48px', borderRadius: '14px', minWidth: '48px' }}
                            />
                        </div>
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

            {isLoading ? (
                <LoadingScreen message="جاري تحضير حركات الصنف..." fullScreen={false} />
            ) : !selectedItemId ? (
                <div style={{ padding: '80px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏷️</div>
                    <h2 style={{ color: 'white', margin: '0 0 10px 0' }}>الرجاء اختيار صنف</h2>
                    <p style={{ color: '#94a3b8', margin: 0 }}>اختر صنفاً من القائمة أعلاه لعرض بطاقة حركاته التفصيلية.</p>
                </div>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div className="itemcard-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.2))', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#6ee7b7', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>إجمالي الوارد 📥</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalIn}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.1), rgba(190, 18, 60, 0.2))', border: '1px solid rgba(225, 29, 72, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#fda4af', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>إجمالي المنصرف 📤</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalOut}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(2, 132, 199, 0.2))', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#7dd3fc', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>الرصيد الحالي الشامل 📦</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{finalBalance}</div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="itemcard-table-card" style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table className="itemcard-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: 'white' }}>
                                <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    <tr>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>التاريخ 📅</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>نوع الحركة 🔄</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الوارد 📥</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>المنصرف 📤</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#fcd34d', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الرصيد المتراكم 📦</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>البيان والمستودع 📝</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length > 0 ? transactions.map((tx, idx) => (
                                        <tr key={tx.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', transition: '0.2s' }}>
                                            <td style={{ padding: '20px', fontWeight: 800 }}>{tx.transaction_date}</td>
                                            <td style={{ padding: '20px', fontWeight: 900 }}>
                                                {tx.actualQty > 0 ? (
                                                    <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '5px 10px', borderRadius: '8px' }}>وارد</span>
                                                ) : (
                                                    <span style={{ color: '#fb7185', background: 'rgba(251, 113, 133, 0.1)', padding: '5px 10px', borderRadius: '8px' }}>منصرف</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#10b981', fontSize: '16px' }}>{tx.actualQty > 0 ? tx.actualQty : '-'}</td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#fb7185', fontSize: '16px' }}>{tx.actualQty < 0 ? Math.abs(tx.actualQty) : '-'}</td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#fcd34d', fontSize: '18px' }}>{tx.runningBalance}</td>
                                            <td style={{ padding: '20px', fontWeight: 700, color: '#94a3b8' }}>
                                                <div style={{ color: 'white', marginBottom: '4px' }}>{tx.notes || 'حركة مخزون'}</div>
                                                <div style={{ fontSize: '12px' }}>🏢 المستودع: {tx.warehouseName}</div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 900 }}>لا توجد حركات مسجلة لهذا الصنف في هذه الفترة</td>
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
