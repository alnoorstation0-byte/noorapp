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
                    <span style={{ fontWeight: 900, color: '#00E5FF', fontSize: '13px' }}>
                        #{r.shift_number || (r.id ? r.id.substring(0, 8) : '-')}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {r.opened_at ? new Date(r.opened_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                </div>
            )
        },
        {
            key: 'warehouse',
            header: 'محطة الوقود / الخزان',
            render: (r: any) => (
                <div>
                    <span style={{ fontWeight: 800, color: '#F8FAFC' }}>{r.warehouse?.name || 'محطة غير محددة'}</span>
                    {r.warehouse?.type === 'vehicle' && (
                        <span style={{ marginRight: '6px', fontSize: '10.5px', background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                            صهريج محروقات 🚛
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'delegate',
            header: 'مشغل المحطة / المسؤول',
            render: (r: any) => (
                <span style={{ fontWeight: 700, color: '#94A3B8' }}>
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
                        background: isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: isOpen ? '#10B981' : '#94A3B8',
                        border: `1px solid ${isOpen ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
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
                <span style={{ fontWeight: 900, color: '#F8FAFC', fontSize: '13.5px' }}>
                    {formatCurrency(r.computed_sales || 0)}
                </span>
            )
        },
        {
            key: 'computed_cogs',
            header: 'تكلفة الوقود (COGS)',
            render: (r: any) => (
                <span style={{ fontWeight: 800, color: '#EF4444', fontSize: '13px' }}>
                    {formatCurrency(r.computed_cogs || 0)}
                </span>
            )
        },
        {
            key: 'computed_expenses',
            header: 'المصروفات',
            render: (r: any) => (
                <span style={{ fontWeight: 700, color: '#F59E0B', fontSize: '12.5px' }}>
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
                        color: isPos ? '#10B981' : '#EF4444',
                        fontSize: '14px',
                        background: isPos ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        border: `1px solid ${isPos ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                    }}>
                        {isPos ? `+${formatCurrency(p)}` : formatCurrency(p)}
                    </span>
                );
            }
        },
        {
            key: 'profit_margin',
            header: 'هامش الربح',
            render: (r: any) => {
                const isPos = (r.profit_margin || 0) >= 0;
                return (
                    <span style={{
                        fontWeight: 900,
                        color: isPos ? '#00E5FF' : '#EF4444',
                        fontSize: '13px',
                        background: isPos ? 'rgba(0, 229, 255, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        border: `1px solid ${isPos ? 'rgba(0, 229, 255, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                        {r.profit_margin || 0}%
                    </span>
                );
            }
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
                        background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
                        color: '#0B0E14',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 900,
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0, 229, 255, 0.3)',
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
        { key: 'name', header: 'الصنف', render: (r: any) => <strong style={{ color: '#F8FAFC' }}>{r.name}</strong> },
        { key: 'soldQty', header: 'الكمية المباعة', render: (r: any) => <span style={{ fontWeight: 800, color: '#00E5FF' }}>{r.soldQty} {r.unit}</span> },
        { key: 'revenue', header: 'إجمالي الإيرادات', render: (r: any) => <span style={{ fontWeight: 900, color: '#10B981' }}>{formatCurrency(r.revenue)}</span> },
        { key: 'cogs', header: 'إجمالي التكلفة (COGS)', render: (r: any) => <span style={{ fontWeight: 700, color: '#EF4444' }}>{formatCurrency(r.cogs)}</span> },
        {
            key: 'grossProfit',
            header: 'مجمل الربح',
            render: (r: any) => {
                const isPos = r.grossProfit >= 0;
                return (
                    <span style={{ fontWeight: 900, color: isPos ? '#10B981' : '#EF4444' }}>
                        {isPos ? `+${formatCurrency(r.grossProfit)}` : formatCurrency(r.grossProfit)}
                    </span>
                );
            }
        },
        {
            key: 'margin',
            header: 'نسبة هامش الربح',
            render: (r: any) => {
                const isPos = (r.margin || 0) >= 0;
                return (
                    <span style={{
                        fontWeight: 900,
                        color: isPos ? '#00E5FF' : '#EF4444',
                        background: isPos ? 'rgba(0, 229, 255, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        border: `1px solid ${isPos ? 'rgba(0, 229, 255, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                        {r.margin}%
                    </span>
                );
            }
        }
    ];

    const customFilters = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#94A3B8', fontSize: '12.5px' }}>
                    اختر محطة الوقود / الخزان:
                </label>
                <select 
                    className="glass-input-field" 
                    value={logic.selectedWarehouseId}
                    onChange={(e) => logic.setSelectedWarehouseId(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <option value="all">كافة المحطات والخزانات</option>
                    {logic.warehouses.map((w: any) => (
                        <option key={w.id} value={w.id}>
                            {w.name} {w.type === 'vehicle' ? '(صهريج محروقات)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#94A3B8', fontSize: '12.5px' }}>
                    حالة وردية المحطة:
                </label>
                <select 
                    className="glass-input-field" 
                    value={logic.statusFilter}
                    onChange={(e) => logic.setStatusFilter(e.target.value as any)}
                    style={{ width: '100%' }}
                >
                    <option value="all">كافة الحالات (مفتوحة ومغلقة)</option>
                    <option value="open">🟢 المحطات الشغالة الآن فقط (مباشر)</option>
                    <option value="closed">🔒 الورديات المغلقة والمقفلة</option>
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#94A3B8', fontSize: '12.5px' }}>
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
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#94A3B8', fontSize: '12.5px' }}>
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
            title="تقرير ربحية وتشغيل محطات الوقود" 
            subtitle="متابعة أرباح المحطات الشغالة لحظياً، تكلفة الوقود والمبيعات (COGS)، وصافي الأرباح وهوامش التشغيل" 
            icon="📈"
        >
            <RawasiSidebarManager 
                summary={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="summary-glass-card" style={{ border: '1.5px solid rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 24, 34, 0.95) 100%)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#10B981' }}>صافي أرباح المحطات 🎯</span>
                            <div className="val" style={{ fontSize: '20px', fontWeight: 900, color: '#10B981' }}>
                                {formatCurrency(totals.totalNetProfit)}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#00E5FF' }}>
                                هامش الربحية: {totals.overallMargin}%
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center', background: 'rgba(20, 24, 34, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8' }}>إجمالي المبيعات 🛒</span>
                                <div className="val" style={{ fontSize: '14px', fontWeight: 900, color: '#F8FAFC' }}>
                                    {formatCurrency(totals.totalRevenue)}
                                </div>
                            </div>
                            <div className="summary-glass-card" style={{ padding: '10px', textAlign: 'center', background: 'rgba(20, 24, 34, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8' }}>التكلفة (COGS) ⛽</span>
                                <div className="val" style={{ fontSize: '14px', fontWeight: 900, color: '#EF4444' }}>
                                    {formatCurrency(totals.totalCOGS)}
                                </div>
                            </div>
                        </div>
                        {totals.liveCount > 0 && (
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                borderRadius: '12px',
                                padding: '8px',
                                textAlign: 'center',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                color: '#10B981'
                            }}>
                                🟢 {totals.liveCount} محطات تعمل الآن ومحققة: +{formatCurrency(totals.liveTotalNetProfit)} ربح
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
                <LoadingScreen message="جاري احتساب أرباح وتشغيل محطات الوقود..." fullScreen={false} />
            ) : (
                <>
                    {/* 📊 بطاقات المؤشرات المالية العليا (Top High-Level KPIs) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                        <div className="aqua-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#94A3B8' }}>إجمالي مبيعات المحطات ⛽</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#F8FAFC' }}>{formatCurrency(totals.totalRevenue)}</div>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>إجمالي الفواتير الصادرة</span>
                        </div>

                        <div className="aqua-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#EF4444' }}>تكلفة الوقود والمبيعات (COGS) 🛢️</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#EF4444' }}>- {formatCurrency(totals.totalCOGS)}</div>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>محسوبة من تكلفة المحروقات</span>
                        </div>

                        <div className="aqua-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#F59E0B' }}>المصروفات التشغيلية 💸</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#F59E0B' }}>- {formatCurrency(totals.totalExpenses)}</div>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>صيانة وتشغيل ونثريات</span>
                        </div>

                        {(() => {
                            const isLoss = totals.totalNetProfit < 0;
                            return (
                                <div className="aqua-card" style={{
                                    padding: '18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    background: isLoss 
                                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(20, 24, 34, 0.95) 100%)' 
                                        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 24, 34, 0.95) 100%)',
                                    border: `1.5px solid ${isLoss ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                                }}>
                                    <div style={{ fontSize: '12.5px', fontWeight: 900, color: isLoss ? '#EF4444' : '#10B981' }}>
                                        {isLoss ? 'صافي خسائر المحطات 🚨' : 'صافي أرباح المحطات المحققة 🎯'}
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 900, color: isLoss ? '#EF4444' : '#10B981' }}>
                                        {isLoss ? formatCurrency(totals.totalNetProfit) : `+${formatCurrency(totals.totalNetProfit)}`}
                                    </div>
                                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: isLoss ? '#EF4444' : '#10B981' }}>
                                        هامش الربحية: {totals.overallMargin}%
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* 🟢 القسم الخاص: "المحطات النشطة قيد التشغيل حالياً" */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)',
                        border: '1px solid rgba(0, 229, 255, 0.25)',
                        borderRadius: '20px',
                        padding: '20px',
                        marginBottom: '30px',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: '#10B981',
                                    boxShadow: '0 0 10px #10B981',
                                    animation: 'pulse 1.5s infinite'
                                }}></span>
                                <h3 style={{ margin: 0, fontSize: '16px', color: '#00E5FF', fontWeight: 900 }}>
                                    محطات الوقود قيد التشغيل حالياً (Live Running Stations - متابعة لحظية ⛽)
                                </h3>
                            </div>
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#00E5FF', background: 'rgba(0, 229, 255, 0.15)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '4px 12px', borderRadius: '20px' }}>
                                عدد المحطات الشغالة الآن: {liveRunningOutlets.length}
                            </span>
                        </div>

                        {liveRunningOutlets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8', fontWeight: 700 }}>
                                🔒 لا توجد محطات أو خزانات تعمل حالياً. جميع الورديات السابقة مغلقة.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                {liveRunningOutlets.map((shift: any) => (
                                    <div 
                                        key={shift.id}
                                        style={{
                                            background: 'rgba(11, 14, 20, 0.7)',
                                            border: '1px solid rgba(0, 229, 255, 0.25)',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#F8FAFC', fontWeight: 900 }}>
                                                    {shift.warehouse?.name || 'محطة وقود'}
                                                </h4>
                                                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                                                    👤 {shift.delegate?.name || 'مبيعات مباشرة'}
                                                </span>
                                            </div>
                                            <span style={{
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                color: '#10B981',
                                                fontSize: '11px',
                                                fontWeight: 900,
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(16, 185, 129, 0.3)'
                                            }}>
                                                🟢 شغال الآن منذ {Math.floor(shift.duration_minutes / 60)} س و {shift.duration_minutes % 60} د
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'rgba(20, 24, 34, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '12px' }}>
                                            <div>
                                                <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>المبيعات الحالية:</span>
                                                <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>{formatCurrency(shift.computed_sales)}</strong>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>التكلفة (COGS):</span>
                                                <strong style={{ fontSize: '14px', color: '#EF4444' }}>{formatCurrency(shift.computed_cogs)}</strong>
                                            </div>
                                        </div>

                                        {(() => {
                                            const isShiftLoss = (shift.net_profit || 0) < 0;
                                            return (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    background: isShiftLoss ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    border: `1px solid ${isShiftLoss ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                                    borderRadius: '12px',
                                                    padding: '10px 14px'
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: '11px', color: isShiftLoss ? '#EF4444' : '#10B981', fontWeight: 700, display: 'block' }}>
                                                            {isShiftLoss ? 'صافي خسائر التشغيل حتى الآن ⚠️:' : 'صافي الأرباح التي أنتجها حتى الآن:'}
                                                        </span>
                                                        <strong style={{ fontSize: '18px', color: isShiftLoss ? '#EF4444' : '#10B981', fontWeight: 900 }}>
                                                            {shift.net_profit >= 0 ? `+${formatCurrency(shift.net_profit)}` : formatCurrency(shift.net_profit)}
                                                        </strong>
                                                    </div>
                                                    <div style={{ textAlign: 'left' }}>
                                                        <span style={{
                                                            fontSize: '12px',
                                                            fontWeight: 900,
                                                            color: isShiftLoss ? '#EF4444' : '#10B981',
                                                            background: 'rgba(11, 14, 20, 0.8)',
                                                            padding: '4px 10px',
                                                            borderRadius: '10px',
                                                            border: `1px solid ${isShiftLoss ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                                                        }}>
                                                            هامش: {shift.profit_margin}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <button
                                            type="button"
                                            onClick={() => setSelectedShiftId(shift.id)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                background: 'rgba(0, 229, 255, 0.12)',
                                                border: '1px solid rgba(0, 229, 255, 0.25)',
                                                borderRadius: '10px',
                                                color: '#00E5FF',
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
                                background: activeTab === 'shifts' ? 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)' : 'rgba(20, 24, 34, 0.8)',
                                color: activeTab === 'shifts' ? '#0B0E14' : '#94A3B8',
                                fontWeight: 900,
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'shifts' ? '0 4px 15px rgba(0, 229, 255, 0.35)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            📋 سجل أرباح الورديات ومحطات الوقود ({filteredShifts.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('items')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '14px',
                                border: 'none',
                                background: activeTab === 'items' ? 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)' : 'rgba(20, 24, 34, 0.8)',
                                color: activeTab === 'items' ? '#0B0E14' : '#94A3B8',
                                fontWeight: 900,
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                boxShadow: activeTab === 'items' ? '0 4px 15px rgba(0, 229, 255, 0.35)' : 'none',
                                transition: '0.2s'
                            }}
                        >
                            ⛽ تحليل ربحية أنواع الوقود والمنتجات ({itemsProfitability.length})
                        </button>
                    </div>

                    {activeTab === 'shifts' ? (
                        <div className="aqua-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0, color: '#F8FAFC', fontWeight: 900, fontSize: '16px' }}>
                                    جدول أرباح الورديات ومحطات الوقود بالتفصيل
                                </h3>
                                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                    صافي الربح = إجمالي المبيعات - تكلفة الوقود (COGS) - المصروفات التشغيلية
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
                                <h3 style={{ margin: 0, color: '#F8FAFC', fontWeight: 900, fontSize: '16px' }}>
                                    جدول ربحية مبيعات الوقود والمنتجات (إيراد، تكلفة، مجمل ربح، وهامش)
                                </h3>
                                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                    مرتبة بحسب أعلى أنواع المحروقات والمنتجات تحقيقاً للإيرادات
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
