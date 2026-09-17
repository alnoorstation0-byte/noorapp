
"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useProfitDashboardLogic } from './profit_logic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function ProfitDashboardPage() {
    const logic = useProfitDashboardLogic();

    const COLORS = ['#00E5FF', '#10B981', '#38BDF8', '#F59E0B', '#0284C7', '#A855F7', '#EC4899'];

    return (
        <MasterPage icon="💰" title="لوحة الربحية الشاملة" subtitle="تحليل الأرباح للمناديب، الأصناف، والرحلات">
            <style>{`
                @media (max-width: 768px) {
                    .profit-filter-header { flex-direction: column !important; align-items: stretch !important; padding: 15px !important; }
                    .profit-filter-item { width: 100% !important; justify-content: space-between !important; }
                    .profit-filter-item input { flex: 1 !important; }
                    .profit-kpi-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .profit-charts-grid { grid-template-columns: 1fr !important; gap: 15px !important; }
                    .profit-chart-box { padding: 15px !important; border-radius: 16px !important; }
                    .profit-fleet-box { padding: 15px !important; border-radius: 16px !important; }
                }

                /* Daylight Desert Glassmorphism */
                .daylight-theme .profit-filter-header {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 8px 30px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .profit-filter-header label {
                    color: rgba(44, 26, 18, 0.75) !important;
                }
                .daylight-theme .profit-filter-header input {
                    background: #FFFFFF !important;
                    border: 1px solid rgba(194, 155, 98, 0.35) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .profit-kpi-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 8px 30px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .profit-kpi-card div > div:first-child {
                    color: rgba(44, 26, 18, 0.7) !important;
                }
                .daylight-theme .profit-chart-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 8px 30px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .profit-chart-card h3 {
                    color: #A8573C !important;
                }
                .daylight-theme .profit-fleet-card {
                    background: rgba(255, 255, 255, 0.85) !important;
                    border: 1px solid rgba(194, 155, 98, 0.25) !important;
                }
                .daylight-theme .profit-fleet-card span:last-child {
                    color: rgba(44, 26, 18, 0.7) !important;
                }
            `}</style>
            {/* Header Filters */}
            <div className="profit-filter-header" style={{ background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                <div className="profit-filter-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold', color: '#94A3B8' }}>من تاريخ:</label>
                    <input type="date" className="glass-input-field" value={logic.dateFrom} onChange={e => logic.setDateFrom(e.target.value)} style={{ padding: '8px 15px' }} />
                </div>
                <div className="profit-filter-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold', color: '#94A3B8' }}>إلى تاريخ:</label>
                    <input type="date" className="glass-input-field" value={logic.dateTo} onChange={e => logic.setDateTo(e.target.value)} style={{ padding: '8px 15px' }} />
                </div>
                {logic.isLoading && <span style={{ color: '#00E5FF', fontWeight: 'bold' }}>⏳ جاري الحساب...</span>}
            </div>

            {/* Top KPIs */}
            <div className="profit-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <KpiCard title="إجمالي الإيرادات" value={formatCurrency(logic.totalRevenue)} icon="📈" color="#00E5FF" />
                <KpiCard title="تكلفة الوقود والمبيعات (COGS)" value={formatCurrency(logic.totalCOGS)} icon="⛽" color="#EF4444" />
                <KpiCard title="إجمالي الربح (أصناف)" value={formatCurrency(logic.grossProfit)} icon="💎" color="#10B981" />
                <KpiCard title="هامش الربح %" value={`${logic.grossMargin.toFixed(1)}%`} icon="📊" color={logic.grossMargin > 0 ? '#10B981' : '#F59E0B'} />
            </div>

            <div className="profit-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                
                {/* Items Profitability Chart */}
                <div className="profit-chart-card" style={{ background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                    <h3 style={{ color: '#00E5FF', marginTop: 0, fontWeight: 900 }}>🔥 أعلى 7 أصناف ربحية</h3>
                    <div style={{ height: '300px', marginTop: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={logic.topItems} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#F8FAFC', fontWeight: 'bold', fontSize: 12 }} width={120} />
                                <Tooltip cursor={{ fill: 'rgba(0, 229, 255, 0.05)' }} contentStyle={{ background: 'rgba(11, 14, 20, 0.95)', borderRadius: '15px', border: '1px solid rgba(0, 229, 255, 0.3)', color: '#F8FAFC', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                                <Bar dataKey="profit" fill="#00E5FF" radius={[0, 10, 10, 0]}>
                                    {logic.topItems.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Delegates Profitability */}
                <div className="profit-chart-card" style={{ background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                    <h3 style={{ color: '#00E5FF', marginTop: 0, fontWeight: 900 }}>👤 أرباح مشغلي المحطات</h3>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={logic.topDelegates} dataKey="profit" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({name, percent}) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                                    {logic.topDelegates.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'rgba(11, 14, 20, 0.95)', borderRadius: '15px', border: '1px solid rgba(0, 229, 255, 0.3)', color: '#F8FAFC', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fuel Station Shifts Profitability Summary */}
                <div className="profit-chart-card profit-fleet-box" style={{ background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(0, 229, 255, 0.2)', gridColumn: '1 / -1', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
                    <h3 style={{ color: '#00E5FF', marginTop: 0, fontWeight: 900 }}>⛽ ملخص أرباح وتشغيل ورديات المحطة (للفترة المحددة)</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                        <FleetCard title="عدد الورديات" value={logic.trips.count} icon="🔢" color="#00E5FF" />
                        <FleetCard title="إجمالي مبيعات الورديات" value={formatCurrency(logic.trips.sales)} icon="💰" color="#10B981" />
                        <FleetCard title="المصروفات التشغيلية للورديات" value={formatCurrency(logic.trips.expenses)} icon="💸" color="#EF4444" />
                        <FleetCard title="إجمالي اللترات المباعة" value={`${Number(logic.trips.invCost).toLocaleString()} لتر`} icon="⛽" color="#38BDF8" />
                        <FleetCard title="صافي أرباح تشغيل المحطة" value={formatCurrency(logic.trips.profit)} icon="💎" color={logic.trips.profit > 0 ? '#10B981' : '#EF4444'} />
                    </div>
                </div>

            </div>
        </MasterPage>
    );
}

function KpiCard({ title, value, icon, color = '#F8FAFC' }: { title: string, value: string | number, icon: string, color?: string }) {
    return (
        <div className="profit-kpi-card" style={{ 
            background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', backdropFilter: 'blur(24px)', borderRadius: '20px', 
            padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', 
            border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            transition: 'transform 0.3s ease', cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ fontSize: '40px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94A3B8', marginBottom: '5px' }}>{title}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color }}>{value}</div>
            </div>
        </div>
    );
}

function FleetCard({ title, value, icon, color = '#F8FAFC' }: { title: string, value: string | number, icon: string, color?: string }) {
    return (
        <div className="profit-fleet-card" style={{ 
            flex: '1 1 200px', background: 'rgba(11, 14, 20, 0.7)', borderRadius: '16px', 
            padding: '20px', border: '1px solid rgba(0, 229, 255, 0.2)',
            display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#94A3B8' }}>{title}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color }}>{value}</div>
        </div>
    );
}
