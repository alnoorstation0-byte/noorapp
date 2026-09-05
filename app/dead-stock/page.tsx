"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useDeadStockLogic } from './dead_stock_logic';

export default function DeadStockPage() {
    const {
        filteredItems,
        globalSearch,
        setGlobalSearch,
        stagnantDays,
        setStagnantDays,
        totalDeadItems,
        totalFrozenCapital,
        isLoading,
        exportToExcel
    } = useDeadStockLogic();

    return (
        <div style={{ padding: '20px', minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.primary} 0%, #0a192f 100%)`, fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>
            {/* Header */}
            <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '30px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: `linear-gradient(45deg, ${THEME.accent}, #10b981)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>المخزون الراكد (Dead Stock)</span>
                            <span style={{ fontSize: '24px' }}>🐢</span>
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            مراقبة البضاعة التي لم يتم سحبها أو بيعها منذ فترة طويلة لتجنب تجميد رأس المال.
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={exportToExcel} disabled={filteredItems.length === 0} style={{ background: filteredItems.length === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(45deg, #10b981, #059669)', color: filteredItems.length === 0 ? '#64748b' : 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 900, cursor: filteredItems.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: filteredItems.length === 0 ? 'none' : '0 10px 20px rgba(16,185,129,0.3)', transition: '0.3s' }}>
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
                            placeholder="ابحث..." 
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                        />
                    </div>
                    <div style={{ flex: '0 0 200px' }}>
                        <div style={{ color: THEME.accentLight, fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>أيام الركود (أكثر من) 🐢</div>
                        <select 
                            value={stagnantDays}
                            onChange={(e) => setStagnantDays(Number(e.target.value))}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                        >
                            <option value={30} style={{ color: 'black' }}>30 يوماً (شهر)</option>
                            <option value={60} style={{ color: 'black' }}>60 يوماً (شهران)</option>
                            <option value={90} style={{ color: 'black' }}>90 يوماً (3 أشهر)</option>
                            <option value={180} style={{ color: 'black' }}>180 يوماً (6 أشهر)</option>
                            <option value={365} style={{ color: 'black' }}>365 يوماً (سنة)</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '20px' }}>جاري الحساب...</div>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(159, 18, 57, 0.2))', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#fda4af', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>إجمالي رأس المال المجمد 🥶💰</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{formatCurrency(totalFrozenCapital)}</div>
                            <div style={{ color: '#fb7185', fontSize: '12px', marginTop: '10px' }}>قيمة البضاعة التي لا تتحرك</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.2))', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#fcd34d', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>عدد الأصناف الراكدة 🏷️</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalDeadItems} <span style={{ fontSize: '16px', fontWeight: 700, color: '#fcd34d' }}>صنف</span></div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: 'white' }}>
                                <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    <tr>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>كود الصنف 🔑</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>اسم الصنف 🏷️</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الكمية الراكدة 📦</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>التكلفة 💲</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#fda4af', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>رأس المال المجمد 🥶</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>تاريخ آخر منصرف 📅</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#fde047', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>أيام الركود ⏳</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.length > 0 ? filteredItems.map((item, idx) => (
                                        <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', transition: '0.2s' }}>
                                            <td style={{ padding: '20px', fontWeight: 800, color: '#94a3b8' }}>{item.code || '-'}</td>
                                            <td style={{ padding: '20px', fontWeight: 900 }}>{item.name}</td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#38bdf8', fontSize: '16px' }}>{item.qty} {item.unit}</td>
                                            <td style={{ padding: '20px', fontWeight: 800, color: '#cbd5e1' }}>{formatCurrency(item.cost)}</td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#fda4af', fontSize: '16px' }}>{formatCurrency(item.frozenCapital)}</td>
                                            <td style={{ padding: '20px', fontWeight: 800, color: '#cbd5e1', direction: 'ltr', textAlign: 'right' }}>{item.lastMovementDate}</td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#fde047', fontSize: '18px' }}>
                                                {item.daysSinceLastMovement} <span style={{ fontSize: '12px', fontWeight: 400 }}>يوم</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
                                                <div style={{ color: '#10b981', fontWeight: 900, fontSize: '20px' }}>مخزونك نشيط جداً!</div>
                                                <div style={{ color: '#64748b', marginTop: '5px' }}>لا توجد أصناف راكدة تتجاوز {stagnantDays} يوماً.</div>
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
