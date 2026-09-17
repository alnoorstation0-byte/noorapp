"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
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
        <MasterPage 
            title="تحليل المبيعات الشامل" 
            subtitle="تحليل ومراقبة أفضل العملاء، المناديب، والأصناف مبيعاً خلال الفترة المحددة" 
            icon="📊"
        >
            <style>{`
                @media (max-width: 768px) {
                    .sales-header-card { padding: 15px !important; border-radius: 16px !important; }
                    .sales-btn-group { width: 100% !important; flex-direction: column !important; }
                    .sales-btn-group button { width: 100% !important; justify-content: center !important; min-height: 44px !important; }
                    .sales-kpi-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .sales-kpi-card { padding: 16px !important; border-radius: 16px !important; }
                    .sales-chart-card { padding: 15px 10px !important; border-radius: 16px !important; }
                    .sales-chart-wrapper { height: 260px !important; }
                    .sales-items-grid { grid-template-columns: 1fr !important; gap: 15px !important; }
                }
            `}</style>
            <PrintHeader title="تحليل المبيعات الشامل" subtitle={`عن الفترة من ${dateFrom} إلى ${dateTo}`} />
            
            {/* Header Actions & Filters Card */}
            <div className="no-print sales-header-card" style={{ 
                background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', 
                backdropFilter: 'blur(24px)', 
                borderRadius: '24px', 
                padding: '24px', 
                marginBottom: '25px', 
                border: '1px solid rgba(0, 229, 255, 0.2)', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ color: '#F8FAFC', margin: '0 0 6px 0', fontSize: '20px', fontWeight: 900 }}>
                            فلاتر الفترة والخيارات المتقدمة
                        </h2>
                        <p style={{ color: '#94A3B8', margin: 0, fontSize: '13.5px', fontWeight: 600 }}>
                            حدد النطاق الزمني لعرض ترتيب الإيرادات والكميات المباعة.
                        </p>
                    </div>
                    
                    <div className="sales-btn-group" style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.05)', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}>
                            <span>طباعة 🖨️</span>
                        </button>
                        <button onClick={exportToExcel} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#0B0E14', border: 'none', padding: '10px 22px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', transition: '0.2s' }}>
                            <span>تصدير Excel</span>
                            <span style={{ fontSize: '16px' }}>📑</span>
                        </button>
                    </div>
                </div>

                {/* Date Inputs */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>من تاريخ:</div>
                        <input 
                            type="date" 
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="glass-input-field"
                            style={{ width: '100%', padding: '10px 16px', borderRadius: '12px', color: '#F8FAFC', outline: 'none' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>إلى تاريخ:</div>
                        <input 
                            type="date" 
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="glass-input-field"
                            style={{ width: '100%', padding: '10px 16px', borderRadius: '12px', color: '#F8FAFC', outline: 'none' }}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: '#00E5FF', fontWeight: 900, fontSize: '18px' }}>جاري جلب وتحليل البيانات...</div>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div className="sales-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '25px' }}>
                        <div className="sales-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(20, 24, 34, 0.95) 100%)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '22px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                            <div style={{ color: '#00E5FF', fontSize: '13.5px', fontWeight: 900, marginBottom: '6px' }}>إجمالي المبيعات 💰</div>
                            <div style={{ color: '#F8FAFC', fontSize: '32px', fontWeight: 900 }}>{formatCurrency(totalRevenue)}</div>
                        </div>
                        <div className="sales-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 24, 34, 0.95) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '22px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                            <div style={{ color: '#10B981', fontSize: '13.5px', fontWeight: 900, marginBottom: '6px' }}>عدد الفواتير 🧾</div>
                            <div style={{ color: '#F8FAFC', fontSize: '32px', fontWeight: 900 }}>{totalInvoices} <span style={{ fontSize: '15px', fontWeight: 700, color: '#10B981' }}>فاتورة</span></div>
                        </div>
                        <div className="sales-kpi-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(20, 24, 34, 0.95) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '22px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                            <div style={{ color: '#F59E0B', fontSize: '13.5px', fontWeight: 900, marginBottom: '6px' }}>متوسط قيمة الفاتورة 📈</div>
                            <div style={{ color: '#F8FAFC', fontSize: '32px', fontWeight: 900 }}>{formatCurrency(averageInvoiceValue)}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                        {/* Top Clients Chart */}
                        <div className="sales-chart-card" style={{ background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '25px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                            <h3 style={{ color: '#00E5FF', fontSize: '17px', fontWeight: 900, margin: '0 0 18px 0', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '10px' }}>
                                🌟 أفضل 10 عملاء (حسب الإيرادات)
                            </h3>
                            <div className="sales-chart-wrapper" style={{ height: '350px', width: '100%' }} dir="ltr">
                                <ResponsiveContainer>
                                    <BarChart data={topClients} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                        <XAxis type="number" tick={{fill: '#94A3B8'}} tickFormatter={(val) => `SAR ${val.toLocaleString()}`} />
                                        <YAxis type="category" dataKey="name" width={150} tick={{fill: '#F8FAFC', fontSize: 12, fontWeight: 'bold'}} />
                                        <Tooltip 
                                            cursor={{fill: 'rgba(0, 229, 255, 0.05)'}} 
                                            contentStyle={{ background: 'rgba(11, 14, 20, 0.95)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '12px', color: '#F8FAFC', textAlign: 'right', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                            formatter={(val: any) => formatCurrency(Number(val) || 0)} 
                                        />
                                        <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                                            {topClients.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#00E5FF' : 'rgba(0, 229, 255, 0.55)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Delegates Chart */}
                        <div className="sales-chart-card" style={{ background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '25px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                            <h3 style={{ color: '#10B981', fontSize: '17px', fontWeight: 900, margin: '0 0 18px 0', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '10px' }}>
                                🚚 أفضل 10 مناديب (حسب الإيرادات)
                            </h3>
                            <div className="sales-chart-wrapper" style={{ height: '350px', width: '100%' }} dir="ltr">
                                <ResponsiveContainer>
                                    <BarChart data={topDelegates} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                        <XAxis dataKey="name" tick={{fill: '#F8FAFC', fontSize: 12, fontWeight: 'bold'}} />
                                        <YAxis type="number" tick={{fill: '#94A3B8'}} tickFormatter={(val) => `SAR ${val.toLocaleString()}`} width={100} />
                                        <Tooltip 
                                            cursor={{fill: 'rgba(16, 185, 129, 0.05)'}} 
                                            contentStyle={{ background: 'rgba(11, 14, 20, 0.95)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', color: '#F8FAFC', textAlign: 'right', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                            formatter={(val: any) => formatCurrency(Number(val) || 0)} 
                                        />
                                        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                                            {topDelegates.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : 'rgba(16, 185, 129, 0.55)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Items Table & Chart */}
                        <div className="sales-chart-card" style={{ background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '25px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                            <h3 style={{ color: '#F59E0B', fontSize: '17px', fontWeight: 900, margin: '0 0 18px 0', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', paddingBottom: '10px' }}>
                                📦 أفضل 10 أصناف (حسب الكمية المباعة)
                            </h3>
                            <div className="sales-items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                                <div className="sales-chart-wrapper" style={{ height: '350px', width: '100%' }} dir="ltr">
                                    <ResponsiveContainer>
                                        <BarChart data={topItems} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                            <XAxis dataKey="name" tick={{fill: '#F8FAFC', fontSize: 12, fontWeight: 'bold'}} />
                                            <YAxis type="number" tick={{fill: '#94A3B8'}} width={50} />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(245, 158, 11, 0.05)'}} 
                                                contentStyle={{ background: 'rgba(11, 14, 20, 0.95)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', color: '#F8FAFC', textAlign: 'right', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                                formatter={(val: any) => [`${val} وحدة`, 'الكمية']} 
                                            />
                                            <Bar dataKey="qty" radius={[8, 8, 0, 0]}>
                                                {topItems.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#F59E0B' : 'rgba(245, 158, 11, 0.55)'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ overflowX: 'auto', background: 'rgba(11, 14, 20, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: '#F8FAFC' }}>
                                        <thead style={{ background: 'rgba(20, 24, 34, 0.9)' }}>
                                            <tr>
                                                <th style={{ padding: '14px', color: '#00E5FF', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 900 }}>الصنف</th>
                                                <th style={{ padding: '14px', color: '#F59E0B', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 900 }}>الكمية</th>
                                                <th style={{ padding: '14px', color: '#10B981', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 900 }}>الإيراد 💰</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                    <td style={{ padding: '14px', fontWeight: 800 }}>{item.name}</td>
                                                    <td style={{ padding: '14px', fontWeight: 900, color: '#F59E0B' }}>{item.qty} وحدة</td>
                                                    <td style={{ padding: '14px', fontWeight: 900, color: '#00E5FF' }}>{formatCurrency(item.revenue)}</td>
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
        </MasterPage>
    );
}
