"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';
import LoadingScreen from '@/components/LoadingScreen';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseData, formatCurrency } from '@/lib/helpers';
import GlassContainer from '@/components/GlassContainer';
import { THEME } from '@/lib/theme';
import MasterPage from '@/components/MasterPage';

export default function MasterDashboard() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        finance: { liquidity: 0, receivables: 0, expenses: 0 },
        operations: { activeTrips: 0, totalTrips: 0, salesAmount: 0 },
        audit: { orphans: 0, unbalanced: 0 }
    });

    useEffect(() => {
        const loadMasterData = async () => {
            setLoading(true);
            try {
                // 🚀 سحب البيانات من كافة الموديولات (توزيع ومبيعات)
                const [lines, fleetOps, invoices, expenses, auditErrors, accounts] = await Promise.all([
                    fetchAllSupabaseData(supabase, 'journal_lines'),
                    fetchAllSupabaseData(supabase, 'fleet_operations'),
                    fetchAllSupabaseData(supabase, 'invoices'),
                    fetchAllSupabaseData(supabase, 'expenses'),
                    Promise.resolve([]),
                    fetchAllSupabaseData(supabase, 'accounts')
                ]);

                // --- 1. التحليل المالي (السيولة والمصروفات) ---
                const cashAccountIds = new Set(
                    (accounts || [])
                        .filter((a: any) => 
                            (a.code && (a.code.startsWith('121') || a.code.startsWith('122') || a.code.startsWith('129') || a.code.startsWith('11') || a.code.startsWith('125'))) ||
                            (a.name && (a.name.includes('خزين') || a.name.includes('نقد') || a.name.includes('بنك') || a.name.includes('عهدة')))
                        )
                        .map((a: any) => a.id)
                );
                const cash = lines?.filter(l => cashAccountIds.has(l.account_id)).reduce((a, c) => a + (Number(c.debit) - Number(c.credit)), 0) || 0;
                const totalExp = expenses?.reduce((a, c) => a + Number(c.amount || c.total_price || 0), 0) || 0;
                const pendingInvoices = invoices?.filter(i => i.status !== 'مدفوع' && i.status !== 'مرحل' && i.payment_status !== 'paid').reduce((a, c) => a + (Number(c.total_amount || 0) - Number(c.paid_amount || 0)), 0) || 0;
                const totalSales = invoices?.filter(i => ['مرحل', 'معتمد', 'مدفوع', 'مغلق', 'posted'].includes(i.status)).reduce((a, c) => a + Number(c.total_amount || 0), 0) || 0;

                // --- 2. إدارة رحلات التشغيل والتوزيع ---
                const activeTrips = fleetOps?.filter(f => f.status === 'نشط' || f.status === 'قيد التنفيذ').length || 0;
                const totalTrips = fleetOps?.length || 0;

                // --- 3. الرقابة والتدقيق (تم التصحيح لسحبها من قاعدة البيانات الموحدة) ---
                const orphans = auditErrors?.filter(e => e.error_type?.includes('orphan')).length || 0;
                const unbalanced = auditErrors?.filter(e => e.error_type?.includes('unbalanced')).length || 0;

                setSummary({
                    finance: { liquidity: cash, receivables: pendingInvoices, expenses: totalExp },
                    operations: { activeTrips, totalTrips, salesAmount: totalSales },
                    audit: { orphans, unbalanced }
                });
            } catch (error) {
                console.error("Error loading master data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadMasterData();
    }, []);

    if (loading) return <LoadingScreen message="جاري استدعاء الإحصائيات المركزية..." subMessage="نقوم بتجميع بيانات المبيعات والتشغيل بدقة لحظية" />;

    return (
        <MasterPage title="الملخص العام (Global Summary)" subtitle="نظرة شاملة لعمليات البيع والتوزيع والمحاسبة" icon="📊">
        
        <div style={{ padding: '10px', direction: 'rtl' }}>
            <style>{`
                @media (max-width: 768px) {
                    .gs-header-card { flex-direction: column !important; padding: 15px !important; gap: 15px !important; }
                    .gs-header-col { border-left: none !important; border-bottom: 1px solid rgba(28, 115, 171, 0.15) !important; padding: 0 0 10px 0 !important; }
                    .gs-header-col:last-child { border-bottom: none !important; }
                    .gs-header-col span:last-child { font-size: 22px !important; }
                    .gs-grid { grid-template-columns: 1fr !important; gap: 15px !important; }
                }
            `}</style>
            
            {/* 👑 الهيدر العلوي: شريط المعلومات السريع */}
            <div className="summary-glass-card gs-header-card fade-in-up" style={{ 
                marginBottom: '30px',
                display: 'flex',
                padding: '25px 35px',
                justifyContent: 'space-between',
                borderBottom: '4px solid #00E5FF'
            }}>
                <div className="gs-header-col" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, borderLeft: '1px solid rgba(0, 229, 255, 0.2)' }}>
                    <span style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 700 }}>صافي السيولة النقدية</span>
                    <span style={{ color: '#10b981', fontSize: '28px', fontWeight: 900, textShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
                        {formatCurrency(summary.finance.liquidity)}
                    </span>
                </div>
                <div className="gs-header-col" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, borderLeft: '1px solid rgba(0, 229, 255, 0.2)', paddingRight: '35px' }}>
                    <span style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 700 }}>رحلات التوزيع النشطة</span>
                    <span style={{ color: '#F8FAFC', fontSize: '28px', fontWeight: 900 }}>
                        {summary.operations.activeTrips} <span style={{ fontSize: '16px', fontWeight: 500, color: '#94A3B8' }}>رحلة</span>
                    </span>
                </div>
                <div className="gs-header-col" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingRight: '35px' }}>
                    <span style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 700 }}>تنبيهات محاسبية</span>
                    <span style={{ color: summary.audit.unbalanced + summary.audit.orphans > 0 ? '#ef4444' : '#10b981', fontSize: '28px', fontWeight: 900 }}>
                        {summary.audit.unbalanced + summary.audit.orphans} <span style={{ fontSize: '16px', fontWeight: 500, color: '#94a3b8' }}>تنبيه</span>
                    </span>
                </div>
            </div>

            {/* 🏎️ صف الـ KPIs الأساسي */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <KPICard title="إجمالي مبيعات الفواتير" value={summary.operations.salesAmount} icon="🧾" color={THEME.primary} />
                <KPICard title="إجمالي المصروفات" value={summary.finance.expenses} icon="📉" color={THEME.danger} />
                <KPICard title="مديونيات عملاء متوقعة" value={summary.finance.receivables} icon="📩" color={THEME.accent} />
                <KPICard title="إجمالي رحلات التوزيع" value={summary.operations.totalTrips} isCurrency={false} icon="🚚" color="#8b5cf6" />
            </div>

            {/* 🧩 مصفوفة البيانات الكبرى (The Grid) */}
            <div className="gs-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '25px' }}>
                
                {/* العمود الأيمن: تحليل العمليات */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <GlassContainer>
                        <h3 style={{ marginBottom: '20px' }}>🚚 حركة التوزيع التشغيلية (Trips)</h3>
                        <ProgressBar label="رحلات مكتملة" percentage={summary.operations.totalTrips > 0 ? ((summary.operations.totalTrips - summary.operations.activeTrips) / summary.operations.totalTrips) * 100 : 0} color={THEME.success} />
                        <ProgressBar label="رحلات قيد التنفيذ" percentage={summary.operations.totalTrips > 0 ? (summary.operations.activeTrips / summary.operations.totalTrips) * 100 : 0} color={THEME.accent} />
                    </GlassContainer>

                    <GlassContainer>
                        <h3 style={{ marginBottom: '20px' }}>📊 ذمم مدينة وحركة التحصيل</h3>
                        <p style={{ color: 'var(--text-muted)' }}>فواتير لم يتم تحصيلها وتؤثر على التدفق النقدي:</p>
                        <h2 style={{ color: THEME.accent, margin: '15px 0' }}>{formatCurrency(summary.finance.receivables)}</h2>
                    </GlassContainer>
                </div>

                {/* العمود الأيسر: الإجراءات والرقابة */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <GlassContainer style={{ background: 'linear-gradient(135deg, rgba(28, 115, 171, 0.08) 0%, rgba(18, 41, 70, 0.03) 100%)', border: '1px solid rgba(28, 115, 171, 0.2)' }}>
                        <h3 style={{ color: THEME.primary, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <span style={{ fontSize: '24px' }}>🛡️</span> 
                            رادار الرقابة المالية
                        </h3>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(28, 115, 171, 0.15)' }}>
                                <span style={{ fontWeight: 800, color: '#475569' }}>قيود يتيمة (بلا مرجع)</span>
                                <span style={{ color: summary.audit.orphans > 0 ? THEME.danger : THEME.success, fontWeight: 900, fontSize: '18px' }}>{summary.audit.orphans}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(28, 115, 171, 0.15)' }}>
                                <span style={{ fontWeight: 800, color: '#475569' }}>حركات غير متزنة</span>
                                <span style={{ color: summary.audit.unbalanced > 0 ? THEME.danger : THEME.success, fontWeight: 900, fontSize: '18px' }}>{summary.audit.unbalanced}</span>
                            </div>
                        </div>
                    </GlassContainer>

                    <GlassContainer>
                        <h3>⚡ وصول سريع</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '15px' }}>
                            <QuickAction icon="📝" label="قيد جديد" href="/journal" />
                            <QuickAction icon="🚚" label="رحلة توزيع" href="/fleet_operations" />
                            <QuickAction icon="🧾" label="فاتورة بيع" href="/invoices" />
                            <QuickAction icon="⚙️" label="الإعدادات" href="/settings" />
                        </div>
                    </GlassContainer>
                </div>
            </div>
        </div>
        </MasterPage>
    );
}

// مكونات مساعدة
function KPICard({ title, value, icon, color, isCurrency = true }: any) {
    return (
        <div className="kpi-card fade-in-up" style={{ 
            borderRight: `4px solid ${color}`,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            border: '1px solid rgba(255,255,255,0.8)',
            transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>{title}</span>
                <span style={{ fontSize: '24px', opacity: 0.8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{icon}</span>
            </div>
            <h2 style={{ color: color, marginTop: '15px', fontSize: '28px', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                {isCurrency ? formatCurrency(value) : value}
            </h2>
        </div>
    );
}

function ProgressBar({ label, percentage, color }: any) {
    const safePercent = Math.min(percentage, 100);
    return (
        <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                <span>{label}</span>
                <span style={{ fontWeight: 900 }}>{percentage.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(40, 145, 200, 0.15)', borderRadius: '10px' }}>
                <div style={{ width: `${safePercent}%`, height: '100%', background: color, borderRadius: '10px', transition: '1s' }}></div>
            </div>
        </div>
    );
}

function QuickAction({ icon, label, href }: any) {
    const router = useRouter();
    return (
        <div 
            onClick={() => href && router.push(href)}
            className="btn" 
            style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.5))', 
                border: '1px solid rgba(40, 145, 200, 0.2)', 
                color: THEME.primary, 
                padding: '20px 15px', 
                flexDirection: 'column',
                borderRadius: '16px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                gap: '8px'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 25px rgba(40,145,200,0.15)';
                e.currentTarget.style.borderColor = THEME.primary;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'rgba(40, 145, 200, 0.2)';
            }}
        >
            <span style={{ fontSize: '28px', filter: 'drop-shadow(0 2px 4px rgba(40,145,200,0.2))' }}>{icon}</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{label}</span>
        </div>
    );
}
