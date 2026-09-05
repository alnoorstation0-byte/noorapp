"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MasterPage from '@/components/MasterPage';
import LoadingScreen from '@/components/LoadingScreen';
import { THEME } from '@/lib/theme';
import { useDashboardLogic } from './dashboard_logic';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const AQUA_COLORS = ['#2891C8', '#7FD4E3', '#1C355E', '#10b981', '#f59e0b', '#8b5cf6', '#d946ef'];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const logic = useDashboardLogic();
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const moduleLabels: Record<string, string> = {
    expenses: 'المصروفات العامة',
    invoices: 'فواتير المبيعات',
    payments: 'سندات الصرف',
    receipts: 'سندات القبض'
  };

  return (
    <MasterPage title="لوحة القيادة المركزية" subtitle="مراقبة العمليات والمؤشرات المالية - ريال سعودي">
      
      {logic.isLoading ? (
        <LoadingScreen message="جاري تحميل لوحة القيادة..." subMessage="نقوم الآن بتجميع البيانات وتحديث المؤشرات..." fullScreen={false} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', animation: 'fadeUp 0.6s ease-out', paddingBottom: '50px' }}>
          
          {/* ========== 1. القسم العلوي: المؤشرات المالية الأساسية ========== */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
              <h3 className="section-title">📊 الموقف المالي للمؤسسة</h3>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', background: 'rgba(255, 255, 255, 0.4)', padding: '6px 15px', borderRadius: '20px' }}>تحديث فوري 🟢</span>
            </div>
            <div className="premium-grid-3">
              <div className="premium-card" style={{ borderBottom: '4px solid #10b981' }}>
                <div className="card-header-flex">
                  <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #10b98120, #05966920)', color: '#10b981' }}>💰</div>
                  <span className="trend-badge positive">إجمالي الإيرادات</span>
                </div>
                <div className="card-value">{logic.formatCurrency(logic.stats.totalRevenues)}</div>
                <div className="card-subtitle">إجمالي المبالغ من الفواتير المعتمدة</div>
              </div>

              <div className="premium-card" style={{ borderBottom: '4px solid #ef4444' }}>
                <div className="card-header-flex">
                  <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #ef444420, #dc262620)', color: '#ef4444' }}>📉</div>
                  <span className="trend-badge negative">إجمالي المصروفات</span>
                </div>
                <div className="card-value">{logic.formatCurrency(logic.stats.totalExpenses)}</div>
                <div className="card-subtitle">المصروفات التشغيلية المعتمدة</div>
              </div>

              <div className="premium-card" style={{ borderBottom: `4px solid ${THEME.primary}` }}>
                <div className="card-header-flex">
                  <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #2891C820, #1C73AB20)', color: THEME.primary }}>🏦</div>
                  <span className="trend-badge neutral">الرصيد النقدي والبنكي</span>
                </div>
                <div className="card-value">{logic.formatCurrency(logic.stats.cashAndBankBalance)}</div>
                <div className="card-subtitle">رصيد الصناديق والبنوك الحالي</div>
              </div>
            </div>
          </div>

          {/* ========== 2. حركة المستودعات والأسطول ========== */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
              <h3 className="section-title">📦 الحركة التشغيلية والمخزون</h3>
            </div>
            <div className="premium-grid-4">
              <div className="premium-card center-content" onClick={() => router.push('/inventory')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper lg" style={{ background: '#f8fafc', color: THEME.primary }}>🏭</div>
                <div className="card-value sm">{logic.stats.totalWarehouses}</div>
                <div className="card-title">مستودع نشط</div>
              </div>

              <div className="premium-card center-content" onClick={() => router.push('/inventory')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper lg" style={{ background: '#f8fafc', color: '#f59e0b' }}>📦</div>
                <div className="card-value sm">{logic.stats.totalInventoryValue > 0 ? logic.formatCurrency(logic.stats.totalInventoryValue) : '0'}</div>
                <div className="card-title">قيمة المخزون الإجمالية</div>
              </div>

              <div className="premium-card center-content" onClick={() => router.push('/fleet')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper lg" style={{ background: '#f8fafc', color: '#8b5cf6' }}>🚚</div>
                <div className="card-value sm">{logic.stats.totalVehicles}</div>
                <div className="card-title">مركبة مسجلة</div>
              </div>

              <div className="premium-card center-content" onClick={() => router.push('/fleet_operations')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper lg" style={{ background: '#f8fafc', color: '#10b981' }}>🔄</div>
                <div className="card-value sm">{logic.stats.totalFleetTrips}</div>
                <div className="card-title">أمر شغل (رحلة)</div>
              </div>
            </div>
          </div>

          {/* ========== 3. المخططات البيانية ========== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
            
            {/* أداء الإيرادات والمصروفات */}
            <div className="glass-chart-container">
              <h4 className="chart-title">📈 تحليل التدفقات (الإيرادات vs المصروفات)</h4>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <BarChart data={logic.chartData.revenueVsExpenses} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: '#475569' }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.2)' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="الإيرادات" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="المصروفات" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* توزيع المصروفات */}
            <div className="glass-chart-container">
              <h4 className="chart-title">🎯 توزيع المصروفات التشغيلية</h4>
              <div style={{ width: '100%', height: '300px' }}>
                {logic.chartData.expensesBreakdown.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={logic.chartData.expensesBreakdown}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {logic.chartData.expensesBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={AQUA_COLORS[index % AQUA_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => logic.formatCurrency(value)} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 'bold' }}>
                    لا توجد بيانات مصروفات كافية
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========== 4. مهام معلقة تحتاج مراجعة ========== */}
          {logic.stats.pendingActions.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                <h3 className="section-title">⚠️ مستندات قيد الانتظار (تحتاج مراجعة/ترحيل)</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {logic.stats.pendingActions.map((action: any, idx: number) => (
                  <div key={idx} className="warning-card" onClick={() => router.push(`/${action.type}`)} style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>📝</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309' }}>{action.count}</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                      {moduleLabels[action.type] || action.type} غير مرحلة
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </MasterPage>
  );
}
