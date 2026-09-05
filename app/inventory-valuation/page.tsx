"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useInventoryValuationLogic } from './inventory_valuation_logic';

export default function InventoryValuationPage() {
    const {
        filteredItems,
        globalSearch,
        setGlobalSearch,
        totalInventoryValue,
        totalItemsCount,
        totalPhysicalUnits,
        isLoading,
        exportToExcel
    } = useInventoryValuationLogic();

    return (
        <div style={{ padding: '20px', minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.primary} 0%, #0a192f 100%)`, fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>
            {/* Header */}
            <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '30px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: `linear-gradient(45deg, ${THEME.accent}, #fde047)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>تقييم المخزون (Inventory Valuation)</span>
                            <span style={{ fontSize: '24px' }}>💵</span>
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            يعرض قيمة البضاعة الحالية كرقم مالي (الكمية × متوسط التكلفة).
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
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '20px' }}>جاري الحساب والتقييم...</div>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(2, 132, 199, 0.2))', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#7dd3fc', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>إجمالي قيمة المخزون 💵</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{formatCurrency(totalInventoryValue)}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.2))', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#6ee7b7', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>إجمالي الوحدات المادية 📦</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalPhysicalUnits.toLocaleString()}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.2))', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#fcd34d', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>عدد الأصناف 🏷️</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalItemsCount}</div>
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
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الكمية الحالية 📦</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: THEME.accentLight, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>متوسط التكلفة 💲</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#fde047', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>إجمالي القيمة 💵</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.length > 0 ? filteredItems.map((item, idx) => (
                                        <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', transition: '0.2s' }}>
                                            <td style={{ padding: '20px', fontWeight: 800, color: '#94a3b8' }}>{item.code || '-'}</td>
                                            <td style={{ padding: '20px', fontWeight: 900 }}>{item.name}</td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#38bdf8', fontSize: '16px' }}>{item.qty} {item.unit}</td>
                                            <td style={{ padding: '20px', fontWeight: 800, color: '#cbd5e1' }}>{formatCurrency(item.cost)}</td>
                                            <td style={{ padding: '20px', fontWeight: 900, color: '#fde047', fontSize: '18px' }}>{formatCurrency(item.totalValue)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 900 }}>لا توجد أصناف مطابقة للبحث</td>
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
