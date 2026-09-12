"use client";
import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import { usePosDashboardLogic } from './pos_dashboard_logic';
import { THEME } from '@/lib/theme';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import ShiftDetailsModal from '../ShiftDetailsModal';

export default function PosDashboardPage() {
    const logic = usePosDashboardLogic();
    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'shifts' | 'items'>('shifts');

    const formatCurrency = (amount: number) => {
        return (Number(amount) || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س';
    };

    const { totals, filteredShifts, liveRunningOutlets, itemsProfitability } = logic.profitabilityData;

    // أعمدة جدول ربحية الورديات والمنافذ
    const shiftProfitColumns = [
        {
            key: 'shift_number',
            header: 'رقم الوردية',
            render: (r: any) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 900, color: THEME.primary, fontSize: '13px' }}>
                        #{r.shift_number || (r.id ? r.id.substring(0, 8) : '-')}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {r.opened_at ? new Date(r.opened_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                </div>
            )
        },
        {
            key: 'warehouse',
            header: 'منفذ البيع / المستودع',
            render: (r: any) => (
                <div>
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>{r.warehouse?.name || 'مستودع غير محدد'}</span>
                    {r.warehouse?.type === 'vehicle' && (
                        <span style={{ marginRight: '6px', fontSize: '10.5px', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                            سيارة توزيع 🚙
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'delegate',
            header: 'المندوب / المسؤول',
            render: (r: any) => (
                <span style={{ fontWeight: 700, color: '#475569' }}>
                    {r.delegate?.name || 'مبيعات مباشرة'}
                </span>
            )
        },
        {
            key: 'status',
            header: 'حالة التشغيل',
            render: (r: any) => {
                const isOpen = r.status === 'open';
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 900,
                        background: isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                        color: isOpen ? '#059669' : '#475569',
                        border: `1px solid ${isOpen ? 'rgba(16, 185, 129, 0.35)' : 'rgba(100, 116, 139, 0.25)'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span>{isOpen ? '🟢' : '🔒'}</span>
                        <span>{isOpen ? 'شغال الآن (مباشر)' : 'مغلقة ومقفلة'}</span>
                    </span>
                );
            }
        },
        {
            key: 'computed_sales',
            header: 'إجمالي المبيعات',
            render: (r: any) => (
                <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '13.5px' }}>
                    {formatCurrency(r.computed_sales || 0)}
                </span>
            )
        },
        {
            key: 'computed_cogs',
            header: 'تكلفة البضاعة (COGS)',
            render: (r: any) => (
                <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '13px' }}>
                    {formatCurrency(r.computed_cogs || 0)}
                </span>
            )
        },
        {
            key: 'computed_expenses',
            header: 'المصروفات',
            render: (r: any) => (
                <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '12.5px' }}>
                    {formatCurrency(r.computed_expenses || 0)}
                </span>
            )
        },
        {
            key: 'net_profit',
            header: 'صافي الربح',
            render: (r: any) => {
                const p = Number(r.net_profit || 0);
                const isPos = p >= 0;
                return (
                    <span style={{
                        fontWeight: 900,
                        color: isPos ? '#15803d' : '#dc2626',
                        fontSize: '14px',
                        background: isPos ? '#dcfce7' : '#fee2e2',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        border: `1px solid ${isPos ? '#86efac' : '#fca5a5'}`
                    }}>
                        {isPos ? `+${formatCurrency(p)}` : formatCurrency(p)}
                    </span>
                );
            }
        },
        {
            key: 'profit_margin',
            header: 'هامش الربح',
            render: (r: any) => (
                <span style={{ fontWeight: 900, color: '#1C73AB', fontSize: '13px' }}>
                    {r.profit_margin || 0}%
                </span>
            )
        },
        {
            key: 'actions',
            header: 'الإجراءات',
            render: (r: any) => (
                <button
                    type="button"
                    onClick={() => setSelectedShiftId(r.id)}
                    style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(28, 115, 171, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>🔍</span>
                    <span>تفاصيل وتدقيق</span>
                </button>
            )
        }
    ];

    // أعمدة جدول ربحية الأصناف المباعة
    const itemProfitColumns = [
        { key: 'name', header: 'الصنف', render: (r: any) => <strong style={{ color: '#122946' }}>{r.name}</strong> },
        { key: 'soldQty', header: 'الكمية المباعة', render: (r: any) => <span style={{ fontWeight: 800, color: '#1C73AB' }}>{r.soldQty} {r.unit}</span> },
        { key: 'revenue', header: 'إجمالي الإيرادات', render: (r: any) => <span style={{ fontWeight: 900, color: '#16a34a' }}>{formatCurrency(r.revenue)}</span> },
        { key: 'cogs', header: 'إجمالي التكلفة (COGS)', render: (r: any) => <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatCurrency(r.cogs)}</span> },
        {
            key: 'grossProfit',
            header: 'مجمل الربح',
            render: (r: any) => {
                const isPos = r.grossProfit >= 0;
                return (
                    <span style={{ fontWeight: 900, color: isPos ? '#15803d' : '#dc2626' }}>
                        {formatCurrency(r.grossProfit)}
                    </span>
                );
            }
        },
        {
            key: 'margin',
            header: 'نسبة هامش الربح',
            render: (r: any) => (
                <span style={{
                    fontWeight: 900,
                    color: '#1C73AB',
                    background: 'rgba(28, 115, 171, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '8px'
                }}>
                    {r.margin}%
                </span>
            )
        }
    ];

    const customFilters = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#122946', fontSize: '12.5px' }}>
                    اختر منفذ البيع / السيارة:
                </label>
                <select 
                    className="glass-input-field" 
                    value={logic.selectedWarehouseId}
                    onChange={(e) => logic.setSelectedWarehouseId(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <option value="all">كافة المنافذ والسيارات</option>
                    {logic.warehouses.map((w: any) => (
                        <option key={w.id} value={w.id}>
                            {w.name} {w.type === 'vehicle' ? '(سيارة توزيع)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#122946', fontSize: '12.5px' }}>
                    حالة الوردية / المنفذ:
                </label>
                <select 
                    className="glass-input-field" 
                    value={logic.statusFilter}
                    onChange={(e) => logic.setStatusFilter(e.target.value as any)}
                    style={{ width: '100%' }}
                >
                    <option value="all">كافة الحالات (مفتوحة ومغلقة)</option>
                    <option value="open">🟢 المنافذ الشغالة الآن فقط (مباشر)</option>
                    <option value="closed">🔒 الورديات المغلقة والمقفلة</option>
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#122946', fontSize: '12.5px' }}>
                    من تاريخ:
                </label>
                <input 
                    type="date" 
                    className="glass-input-field" 
                    value={logic.dateRange.start} 
                    onChange={e => logic.setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#122946', fontSize: '12.5px' }}>
                    إلى تاريخ:
                </label>
                <input 
                    type="date" 
                    className="glass-input-field" 
                    value={logic.dateRange.end} 
                    onChange={e => logic.setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
            </div>
        </div>
    );

    return (
        <MasterPage 
            title="تقرير ربحية منافذ البيع والتشغيل" 
            subtitle="متابعة أرباح المنافذ الشغالة لحظياً، تكلفة البضاعة المباعة (COGS)، وصافي الأرباح وهوامش التشغيل" 
            icon="📈"
        >
            <RawasiSidebarManager 
                summary={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="summary-glass-card" style={{ border: '1.5px solid #86efac', background: '#f0fdf4' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534' }}>صافي أرباح المنافذ 🎯</span>
                            <div className="val" style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
                                {formatCurrency(totals.totalNetProfit)}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>
                                هامش الربحية: {totals.overallMargin}%
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b' }}>إجمالي المبيعات 🛒</span>
                                <div className="val" style={{ fontSize: '14px', fontWeight: 900, color: '#122946' }}>
                                    {formatCurrency(totals.totalRevenue)}
                                </div>
                            </div>
                            <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b' }}>التكلفة (COGS) 📦</span>
                                <div className="val" style={{ fontSize: '14px', fontWeight: 900, color: '#dc2626' }}>
                                    {formatCurrency(totals.totalCOGS)}
                                </div>
                            </div>
                        </div>
                        {totals.liveCount > 0 && (
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid #86efac',
                                borderRadius: '12px',
                                padding: '8px',
                                textAlign: 'center',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                color: '#15803d'
                            }}>
                                🟢 {totals.liveCount} منافذ تعمل الآن ومحققة: +{formatCurrency(totals.liveTotalNetProfit)} ربح
                            </div>
                        )}
                    </div>
                }
                actions={
                    <>
                        <button 
                            type="button" 
                            className="btn-main-glass"
                            onClick={() => window.location.href = '/pos'}
                        >
                            <span>🛍️</span>
                            <span>شاشة الكاشير (POS)</span>
                        </button>
                        <button 
                            type="button" 
                            className="btn-main-glass"
                            onClick={() => window.print()}
                        >
                            <span>🖨️</span>
                            <span>طباعة تقرير الربحية</span>
                        </button>
                    </>
                }
                customFilters={customFilters} 
                watchDeps={[totals.totalRevenue, totals.totalNetProfit, totals.totalCOGS]}
            />

            {logic.isLoading ? (
                <LoadingScreen message="جاري احتساب أرباح المنافذ والتشغيل..." fullScreen={false} />
            ) : (
                <>
                    {/* 📊 بطاقات المؤشرات المالية العليا (Top High-Level KPIs) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                        <div className="aqua-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#64748b' }}>إجمالي مبيعات المنافذ 🛒</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#122946' }}>{formatCurrency(totals.totalRevenue)}</div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>إجمالي الفواتير الصادرة</span>
                        </div>

                        <div className="aqua-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#dc2626' }}>تكلفة البضاعة المباعة (COGS) 📦</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626' }}>- {formatCurrency(totals.totalCOGS)}</div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>محسوبة من تكلفة الأصناف</span>
                        </div>

                        <div className="aqua-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#ea580c' }}>المصروفات التشغيلية 💸</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#ea580c' }}>- {formatCurrency(totals.totalExpenses)}</div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>محروقات وصيانة ونثريات</span>
                        </div>

                        <div className="aqua-card" style={{
                            padding: '18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(220, 252, 231, 0.9) 100%)',
                            border: '1.5px solid #86efac'
                        }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 900, color: '#166534' }}>صافي أرباح المنافذ المحققة 🎯</div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: totals.totalNetProfit >= 0 ? '#15803d' : '#dc2626' }}>
                                {totals.totalNetProfit >= 0 ? `+${formatCurrency(totals.totalNetProfit)}` : formatCurrency(totals.totalNetProfit)}
                            </div>
                            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#15803d' }}>
                                هامش الربحية: {totals.overallMargin}%
                            </span>
                        </div>
                    </div>

                    {/* 🟢 القسم الخاص: "المنفذ وهو شغال مطلع أرباح كام" (المنافذ النشطة قيد التشغيل حالياً) */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.9) 100%)',
                        border: '1.5px solid rgba(40, 145, 200, 0.35)',
                        borderRadius: '20px',
                        padding: '20px',
                        marginBottom: '30px',
                        boxShadow: '0 8px 25px rgba(28, 115, 171, 0.08)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    boxShadow: '0 0 10px #10b981',
                                    animation: 'pulse 1.5s infinite'
                                }}></span>
                                <h3 style={{ margin: 0, fontSize: '16px', color: '#1C73AB', fontWeight: 900 }}>
                                    المنافذ والسيارات قيد التشغيل حالياً (Live Running Outlets - متابعة لحظية)
                                </h3>
                            </div>
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '4px 12px', borderRadius: '20px' }}>
                                عدد المنافذ الشغالة الآن: {liveRunningOutlets.length}
                            </span>
                        </div>

                        {liveRunningOutlets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontWeight: 700 }}>
                                🔒 لا توجد منافذ أو سيارات تعمل حالياً. جميع الورديات السابقة مغلقة.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                {liveRunningOutlets.map((shift: any) => (
                                    <div 
                                        key={shift.id}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            border: '1.5px solid rgba(28, 115, 171, 0.2)',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#122946', fontWeight: 900 }}>
                                                    {shift.warehouse?.name || 'منفذ بيع'}
                                                </h4>
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                                    👤 {shift.delegate?.name || 'مبيعات مباشرة'}
                                                </span>
                                            </div>
                                            <span style={{
                                                background: '#dcfce7',
                                                color: '#15803d',
                                                fontSize: '11px',
                                                fontWeight: 900,
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                border: '1px solid #86efac'
                                            }}>
                                                🟢 شغال الآن منذ {Math.floor(shift.duration_minutes / 60)} س و {shift.duration_minutes % 60} د
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                                            <div>
                                                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>المبيعات الحالية:</span>
                                                <strong style={{ fontSize: '14px', color: '#122946' }}>{formatCurrency(shift.computed_sales)}</strong>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>التكلفة (COGS):</span>
                                                <strong style={{ fontSize: '14px', color: '#dc2626' }}>{formatCurrency(shift.computed_cogs)}</strong>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: '#dcfce7',
                                            border: '1px solid #86efac',
                                            borderRadius: '12px',
                                            padding: '10px 14px'
                                        }}>
                                            <div>
                                                <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700, display: 'block' }}>
                                                    صافي الأرباح التي أنتجها حتى الآن:
                                                </span>
                                                <strong style={{ fontSize: '18px', color: '#14532d', fontWeight: 900 }}>
                                                    {shift.net_profit >= 0 ? `+${formatCurrency(shift.net_profit)}` : formatCurrency(shift.net_profit)}
                                                </strong>
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 900,
                                                    color: '#15803d',
                                                    background: 'white',
                                                    padding: '4px 10px',
                                                    borderRadius: '10px',
                                                    border: '1px solid #86efac'
                                                }}>
                                                    هامش: {shift.profit_margin}%
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedShiftId(shift.id)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                background: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '10px',
                                                color: '#1C73AB',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: '0.2s'
                                            }}
                                        >
                                            🔍 عرض تفاصيل مبيعات وأصناف هذه الوردية
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* تبويبات التقارير التفصيلية: الورديات والمنافذ vs الأصناف */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('shifts')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '14px',
                                border: 'none',
                                background: activeTab === 'shifts' ? '#1C73AB' : 'rgba(255,255,255,0.7)',
                                color: activeTab === 'shifts' ? 'white' : '#475569',
                                fontWeight: 900,
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'shifts' ? '0 4px 12px rgba(28, 115, 171, 0.25)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            📋 سجل أرباح الورديات والمنافذ ({filteredShifts.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('items')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '14px',
                                border: 'none',
                                background: activeTab === 'items' ? '#1C73AB' : 'rgba(255,255,255,0.7)',
                                color: activeTab === 'items' ? 'white' : '#475569',
                                fontWeight: 900,
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'items' ? '0 4px 12px rgba(28, 115, 171, 0.25)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            📦 تحليل ربحية الأصناف المباعة ({itemsProfitability.length})
                        </button>
                    </div>

                    {activeTab === 'shifts' ? (
                        <div className="aqua-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0, color: THEME.primary, fontWeight: 900, fontSize: '16px' }}>
                                    جدول أرباح الورديات ومنافذ البيع بالتفصيل
                                </h3>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    صافي الربح = إجمالي المبيعات - تكلفة البضاعة (COGS) - المصروفات التشغيلية
                                </span>
                            </div>
                            <RawasiSmartTable 
                                columns={shiftProfitColumns} 
                                data={filteredShifts} 
                                enablePagination={true}
                                rowsPerPage={10}
                            />
                        </div>
                    ) : (
                        <div className="aqua-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0, color: THEME.primary, fontWeight: 900, fontSize: '16px' }}>
                                    جدول ربحية الأصناف المباعة (إيراد، تكلفة، مجمل ربح، وهامش)
                                </h3>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    مرتبة بحسب أعلى المنتجات تحقيقاً للإيرادات
                                </span>
                            </div>
                            <RawasiSmartTable 
                                columns={itemProfitColumns} 
                                data={itemsProfitability} 
                                enablePagination={true}
                                rowsPerPage={10}
                            />
                        </div>
                    )}

                    {/* Shift Details Audit Modal */}
                    <ShiftDetailsModal 
                        isOpen={!!selectedShiftId}
                        onClose={() => setSelectedShiftId(null)}
                        shiftId={selectedShiftId}
                    />
                </>
            )}
        </MasterPage>
    );
}
