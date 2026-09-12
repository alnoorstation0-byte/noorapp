"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useSalesAnalysisLogic } from './sales_analysis_logic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import PrintHeader from '@/components/PrintHeader';

export default function SalesAnalysisPage() {
    const {
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        topClients,
        topDelegates,
        topItems,
        totalRevenue,
        totalInvoices,
        averageInvoiceValue,
        isLoading,
        exportToExcel
    } = useSalesAnalysisLogic();

    return (
        <div style={{ padding: '20px', minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.primary} 0%, #0a192f 100%)`, fontFamily: 'Tajawal, sans-serif' }}>
            <PrintHeader title="تحليل المبيعات الشامل" subtitle={`عن الفترة من ${dateFrom} إلى ${dateTo}`} />
            
            {/* Header */}
            <div className="no-print" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '30px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: `linear-gradient(45deg, ${THEME.accent}, #38bdf8)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>تحليل المبيعات الشامل</span>
                            <span style={{ fontSize: '24px' }}>📊</span>
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px', fontWeight: 500 }}>
                            أفضل العملاء، المناديب، والأصناف مبيعاً خلال الفترة.
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 25px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.3s' }}>
                            <span>طباعة 🖨️</span>
                        </button>
                        <button onClick={exportToExcel} style={{ background: 'linear-gradient(45deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(16,185,129,0.3)', transition: '0.3s' }}>
                            <span>تصدير Excel</span>
                            <span style={{ fontSize: '18px' }}>📑</span>
                        </button>
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
                <div style={{ padding: '50px', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '20px' }}>جاري جلب البيانات...</div>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(2, 132, 199, 0.2))', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#7dd3fc', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>إجمالي المبيعات 💰</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{formatCurrency(totalRevenue)}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.2))', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#6ee7b7', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>عدد الفواتير 🧾</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{totalInvoices} <span style={{ fontSize: '16px', fontWeight: 700, color: '#a7f3d0' }}>فاتورة</span></div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.2))', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '25px', borderRadius: '24px', textAlign: 'center' }}>
                            <div style={{ color: '#fcd34d', fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>متوسط قيمة الفاتورة 📈</div>
                            <div style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>{formatCurrency(averageInvoiceValue)}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                        {/* Top Clients Chart */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '25px' }}>
                            <h2 style={{ color: THEME.accentLight, fontSize: '20px', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                🌟 أفضل 10 عملاء (حسب الإيرادات)
                            </h2>
                            <div style={{ height: '350px', width: '100%' }} dir="ltr">
                                <ResponsiveContainer>
                                    <BarChart data={topClients} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" tick={{fill: '#94a3b8'}} tickFormatter={(val) => `SAR ${val.toLocaleString()}`} />
                                        <YAxis type="category" dataKey="name" width={150} tick={{fill: 'white', fontSize: 12}} />
                                        <Tooltip 
                                            cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                            contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #38bdf8', borderRadius: '12px', color: 'white', textAlign: 'right' }} 
                                            formatter={(val: any) => formatCurrency(Number(val) || 0)} 
                                        />
                                        <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                                            {topClients.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#38bdf8' : 'rgba(56, 189, 248, 0.6)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Delegates Chart */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '25px' }}>
                            <h2 style={{ color: '#10b981', fontSize: '20px', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                🚚 أفضل 10 مناديب (حسب الإيرادات)
                            </h2>
                            <div style={{ height: '350px', width: '100%' }} dir="ltr">
                                <ResponsiveContainer>
                                    <BarChart data={topDelegates} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                        <XAxis dataKey="name" tick={{fill: 'white', fontSize: 12}} />
                                        <YAxis type="number" tick={{fill: '#94a3b8'}} tickFormatter={(val) => `SAR ${val.toLocaleString()}`} width={100} />
                                        <Tooltip 
                                            cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                            contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #10b981', borderRadius: '12px', color: 'white', textAlign: 'right' }} 
                                            formatter={(val: any) => formatCurrency(Number(val) || 0)} 
                                        />
                                        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                                            {topDelegates.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : 'rgba(16, 185, 129, 0.6)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Items Table & Chart */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '25px' }}>
                            <h2 style={{ color: '#f59e0b', fontSize: '20px', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                📦 أفضل 10 أصناف (حسب الكمية المباعة)
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                                <div style={{ height: '350px', width: '100%' }} dir="ltr">
                                    <ResponsiveContainer>
                                        <BarChart data={topItems} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                            <XAxis dataKey="name" tick={{fill: 'white', fontSize: 12}} />
                                            <YAxis type="number" tick={{fill: '#94a3b8'}} width={50} />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                                contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #f59e0b', borderRadius: '12px', color: 'white', textAlign: 'right' }} 
                                                formatter={(val: any) => [`${val} وحدة`, 'الكمية']} 
                                            />
                                            <Bar dataKey="qty" radius={[8, 8, 0, 0]}>
                                                {topItems.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : 'rgba(245, 158, 11, 0.6)'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: 'white' }}>
                                        <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                                            <tr>
                                                <th style={{ padding: '15px', color: '#fcd34d', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الصنف</th>
                                                <th style={{ padding: '15px', color: '#fcd34d', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الكمية</th>
                                                <th style={{ padding: '15px', color: '#fcd34d', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>الإيراد 💰</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                    <td style={{ padding: '15px', fontWeight: 800 }}>{item.name}</td>
                                                    <td style={{ padding: '15px', fontWeight: 900, color: '#fcd34d' }}>{item.qty} وحدة</td>
                                                    <td style={{ padding: '15px', fontWeight: 900, color: '#38bdf8' }}>{formatCurrency(item.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
