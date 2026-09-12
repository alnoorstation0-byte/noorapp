
"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useProfitDashboardLogic } from './profit_logic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function ProfitDashboardPage() {
    const logic = useProfitDashboardLogic();

    const COLORS = ['#1C73AB', '#2891C8', '#38bdf8', '#7FD4E3', '#0284c7'];

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
            `}</style>
            {/* Header Filters */}
            <div className="profit-filter-header" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="profit-filter-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold', color: THEME.primary }}>من تاريخ:</label>
                    <input type="date" className="glass-input-field" value={logic.dateFrom} onChange={e => logic.setDateFrom(e.target.value)} style={{ padding: '8px 15px' }} />
                </div>
                <div className="profit-filter-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold', color: THEME.primary }}>إلى تاريخ:</label>
                    <input type="date" className="glass-input-field" value={logic.dateTo} onChange={e => logic.setDateTo(e.target.value)} style={{ padding: '8px 15px' }} />
                </div>
                {logic.isLoading && <span style={{ color: THEME.accent, fontWeight: 'bold' }}>⏳ جاري الحساب...</span>}
            </div>

            {/* Top KPIs */}
            <div className="profit-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <KpiCard title="إجمالي الإيرادات" value={formatCurrency(logic.totalRevenue)} icon="📈" />
                <KpiCard title="تكلفة البضاعة المباعة" value={formatCurrency(logic.totalCOGS)} icon="📦" color="#ef4444" />
                <KpiCard title="إجمالي الربح (أصناف)" value={formatCurrency(logic.grossProfit)} icon="💎" color="#16a34a" />
                <KpiCard title="هامش الربح %" value={`${logic.grossMargin.toFixed(1)}%`} icon="📊" color={logic.grossMargin > 0 ? '#16a34a' : '#f59e0b'} />
            </div>

            <div className="profit-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                
                {/* Items Profitability Chart */}
                <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(255,255,255,0.4)' }}>
                    <h3 style={{ color: THEME.primary, marginTop: 0, fontWeight: 900 }}>🔥 أعلى 7 أصناف ربحية</h3>
                    <div style={{ height: '300px', marginTop: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={logic.topItems} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: THEME.primary, fontWeight: 'bold', fontSize: 12 }} width={120} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="profit" fill={THEME.accent} radius={[0, 10, 10, 0]}>
                                    {logic.topItems.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Delegates Profitability */}
                <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(255,255,255,0.4)' }}>
                    <h3 style={{ color: THEME.primary, marginTop: 0, fontWeight: 900 }}>👤 أرباح أفضل المناديب</h3>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={logic.topDelegates} dataKey="profit" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({name, percent}) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                                    {logic.topDelegates.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fleet Operations Profitability Summary */}
                <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(255,255,255,0.4)', gridColumn: '1 / -1' }}>
                    <h3 style={{ color: THEME.primary, marginTop: 0, fontWeight: 900 }}>🚚 ملخص ربحية رحلات التوزيع (للفترة المحددة)</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                        <FleetCard title="عدد الرحلات" value={logic.trips.count} icon="🔢" />
                        <FleetCard title="إجمالي مبيعات الرحلات" value={formatCurrency(logic.trips.sales)} icon="💰" />
                        <FleetCard title="إجمالي المصروفات التشغيلية" value={formatCurrency(logic.trips.expenses)} icon="⛽" color="#ef4444" />
                        <FleetCard title="تكلفة المخزون المصروف" value={formatCurrency(logic.trips.invCost)} icon="📦" color="#ef4444" />
                        <FleetCard title="صافي ربح الرحلات" value={formatCurrency(logic.trips.profit)} icon="💎" color={logic.trips.profit > 0 ? '#16a34a' : '#ef4444'} />
                    </div>
                </div>

            </div>
        </MasterPage>
    );
}

function KpiCard({ title, value, icon, color = THEME.primary }: { title: string, value: string | number, icon: string, color?: string }) {
    return (
        <div style={{ 
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '20px', 
            padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', 
            border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            transition: 'transform 0.3s ease', cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ fontSize: '40px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>{title}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color }}>{value}</div>
            </div>
        </div>
    );
}

function FleetCard({ title, value, icon, color = THEME.primary }: { title: string, value: string | number, icon: string, color?: string }) {
    return (
        <div style={{ 
            flex: '1 1 200px', background: 'rgba(255,255,255,0.5)', borderRadius: '15px', 
            padding: '20px', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>{title}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color }}>{value}</div>
        </div>
    );
}
