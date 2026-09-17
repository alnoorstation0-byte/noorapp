"use client";
import React from 'react';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { usePosSettlementsLogic } from './pos_settlements_logic';
import PosSettlementActionModal from './PosSettlementActionModal';
import PosSettlementPrintModal from './PosSettlementPrintModal';

export default function PosSettlementsPage() {
    const {
        filteredSettlements,
        warehouses,
        selectedWarehouseId,
        setSelectedWarehouseId,
        globalSearch,
        setGlobalSearch,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        statusFilter,
        setStatusFilter,
        totals,
        isLoading,
        exportToExcel,
        // Modals
        selectedShiftForSettlement,
        setSelectedShiftForSettlement,
        isSettlementModalOpen,
        setIsSettlementModalOpen,
        selectedShiftForPrint,
        setSelectedShiftForPrint,
        isPrintModalOpen,
        setIsPrintModalOpen,
        // Supporting data & Mutations
        accounts,
        inventoryItems,
        executeSettlement,
        isSettling
    } = usePosSettlementsLogic();

    return (
        <div style={{
            background: '#0B0E14',
            color: '#F8FAFC',
            minHeight: '100vh',
            padding: '30px 24px',
            direction: 'rtl',
            maxWidth: '100vw',
            overflowX: 'hidden',
            boxSizing: 'border-box'
        }}>
            <style>{`
                /* Noor Command Center Theme Styles */
                .aqua-glass-card {
                    background: linear-gradient(135deg, rgba(20, 24, 34, 0.88) 0%, rgba(13, 16, 24, 0.78) 100%) !important;
                    backdrop-filter: blur(24px) saturate(160%) !important;
                    -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
                    border: 1px solid rgba(0, 229, 255, 0.2) !important;
                    border-radius: 20px !important;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5) !important;
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
                    color: #F8FAFC !important;
                }
                .aqua-glass-card:hover {
                    transform: translateY(-3px) !important;
                    border-color: rgba(0, 229, 255, 0.45) !important;
                    box-shadow: 0 12px 35px rgba(0, 229, 255, 0.2) !important;
                }
                .aqua-btn-primary {
                    background: linear-gradient(135deg, #00E5FF 0%, #0099CC 100%) !important;
                    color: #07090D !important;
                    border: 1px solid rgba(0, 229, 255, 0.7) !important;
                    border-radius: 12px !important;
                    font-weight: 900 !important;
                    cursor: pointer !important;
                    box-shadow: 0 0 15px rgba(0, 229, 255, 0.4) !important;
                    transition: all 0.3s ease !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    text-decoration: none !important;
                }
                .aqua-btn-primary:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 0 25px rgba(0, 229, 255, 0.65) !important;
                    filter: brightness(1.1) !important;
                }
                .aqua-table-row {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                }
                .aqua-table-row:hover {
                    background: rgba(0, 229, 255, 0.06) !important;
                }
                .aqua-filter-tab {
                    padding: 9px 18px !important;
                    border-radius: 50px !important;
                    font-weight: 800 !important;
                    font-size: 13px !important;
                    cursor: pointer !important;
                    border: 1px solid transparent !important;
                    transition: all 0.25s ease !important;
                    white-space: nowrap !important;
                }
                .aqua-filter-tab.active {
                    background: linear-gradient(135deg, #00E5FF 0%, #0099CC 100%) !important;
                    color: #07090D !important;
                    box-shadow: 0 0 15px rgba(0, 229, 255, 0.4) !important;
                }
                .aqua-filter-tab:not(.active) {
                    background: rgba(20, 24, 34, 0.7) !important;
                    color: #94A3B8 !important;
                    border-color: rgba(0, 229, 255, 0.15) !important;
                }
                .aqua-filter-tab:not(.active):hover {
                    background: rgba(26, 32, 46, 0.9) !important;
                    border-color: #00E5FF !important;
                    color: #F8FAFC !important;
                }

                @media (max-width: 768px) {
                    .settle-page-header { padding: 20px 15px !important; border-radius: 20px !important; }
                    .settle-kpi-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .settle-filters-row { flex-direction: column !important; gap: 12px !important; }
                    .settle-filters-row > div { width: 100% !important; }
                    .settle-filter-tabs { width: 100% !important; overflow-x: auto !important; padding-bottom: 4px !important; }
                    .aqua-btn-primary { min-height: 44px !important; width: 100% !important; }
                    .settle-table th, .settle-table td { padding: 10px 8px !important; font-size: 11px !important; }
                }
            `}</style>

            {/* Top Hero Banner */}
            <div className="settle-page-header" style={{
                background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.92) 0%, rgba(13, 16, 24, 0.85) 100%)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                borderRadius: '24px',
                padding: '30px 35px',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(0, 229, 255, 0.05)',
                marginBottom: '30px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #00E5FF 0%, #0077B6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '30px',
                            boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
                            color: '#07090D'
                        }}>
                            ⛽
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.5px' }}>
                                    تسويات الورديات ومطابقة عدادات الوقود
                                </h1>
                                <span style={{
                                    background: 'rgba(0, 229, 255, 0.12)',
                                    color: '#00E5FF',
                                    border: '1px solid rgba(0, 229, 255, 0.3)',
                                    padding: '4px 12px',
                                    borderRadius: '50px',
                                    fontSize: '12px',
                                    fontWeight: 900
                                }}>
                                    مركز القيادة ⚡
                                </span>
                            </div>
                            <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#94A3B8', fontWeight: 700 }}>
                                المطابقة النقدية لدرج الصناديق، توريد إيرادات مبيعات الوقود، مطابقة عدادات المضخات اللحظية، وتحديث مخزون الخزانات.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            onClick={exportToExcel}
                            disabled={filteredSettlements.length === 0}
                            className="aqua-btn-primary"
                            style={{ padding: '12px 26px', fontSize: '14px' }}
                        >
                            <span>تصدير إكسيل</span>
                            <span style={{ fontSize: '16px' }}>📑</span>
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="settle-filters-row" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    marginTop: '25px',
                    flexWrap: 'wrap',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(28, 115, 171, 0.1)'
                }}>
                    {/* Search Input */}
                    <div style={{ flex: '1 1 240px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="بحث باسم المنفذ، الكاشير، رقم الوردية..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '11px 20px 11px 40px',
                                borderRadius: '50px',
                                border: '1px solid rgba(0, 229, 255, 0.25)',
                                background: 'rgba(18, 22, 30, 0.85)',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#F8FAFC',
                                outline: 'none'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '16px', top: '11px', fontSize: '16px', color: '#00E5FF' }}>🔍</span>
                    </div>

                    {/* Outlet / Warehouse Selector */}
                    <div style={{ flex: '0 1 200px' }}>
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '11px 16px',
                                borderRadius: '50px',
                                border: '1px solid rgba(0, 229, 255, 0.25)',
                                background: 'rgba(18, 22, 30, 0.85)',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#F8FAFC',
                                outline: 'none'
                            }}
                        >
                            <option value="all">🏢 كافة منافذ البيع</option>
                            {warehouses.filter(w => w.type !== 'vehicle').map(wh => (
                                <option key={wh.id} value={wh.id}>
                                    {wh.name} {wh.type === 'pos' ? '(نقطة بيع)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div style={{ flex: '0 1 150px' }}>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '50px',
                                border: '1px solid rgba(0, 229, 255, 0.25)',
                                background: 'rgba(18, 22, 30, 0.85)',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#F8FAFC',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Date To */}
                    <div style={{ flex: '0 1 150px' }}>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '50px',
                                border: '1px solid rgba(0, 229, 255, 0.25)',
                                background: 'rgba(18, 22, 30, 0.85)',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#F8FAFC',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Status Tabs */}
                    <div className="settle-filter-tabs" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            الكل ({totals.totalShifts})
                        </button>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('pending')}
                        >
                            ⏳ بانتظار التسوية ({totals.pendingShifts})
                        </button>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'settled' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('settled')}
                        >
                            ✅ تمت التسوية ({totals.settledShifts})
                        </button>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'shortage' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('shortage')}
                        >
                            ⚠️ عجز / معلق
                        </button>
                    </div>
                </div>
            </div>

            {/* Global KPI Metrics Grid */}
            <div className="settle-kpi-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                {/* KPI 1: Shifts */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#00E5FF' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#00E5FF' }}>ورديات ومنافذ البيع 🏪</span>
                        <span style={{ fontSize: '20px' }}>📦</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#F8FAFC', margin: '10px 0 6px 0', fontFamily: 'monospace' }}>
                        {totals.totalShifts}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        <span style={{ color: '#E06D44' }}>{totals.pendingShifts} بانتظار التسوية</span> | <span style={{ color: '#10B981' }}>{totals.settledShifts} مسواة</span>
                    </div>
                </div>

                {/* KPI 2: Total Sales */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#00E5FF' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#00E5FF' }}>إجمالي المبيعات 📈</span>
                        <span style={{ fontSize: '20px' }}>💰</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#00E5FF', margin: '10px 0 6px 0', textShadow: '0 0 12px rgba(0, 229, 255, 0.4)' }}>
                        {formatCurrency(totals.totalSales)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        كاش: <b style={{ color: '#F8FAFC' }}>{formatCurrency(totals.cashSales)}</b> | شبكة: <b>{formatCurrency(totals.cardSales)}</b>
                    </div>
                </div>

                {/* KPI 3: Drawer Cash Due */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#E06D44' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#E06D44' }}>المطالبة النقدية للدرج 💵</span>
                        <span style={{ fontSize: '20px' }}>⚖️</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#E06D44', margin: '10px 0 6px 0', textShadow: '0 0 12px rgba(224, 109, 68, 0.35)' }}>
                        {formatCurrency(totals.totalNetCashDue)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        (بداية + مبيعات كاش + تحصيلات) - مصروفات
                    </div>
                </div>

                {/* KPI 4: Handed Over Cash */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#10B981' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>المورد للخزينة ✅</span>
                        <span style={{ fontSize: '20px' }}>🏦</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#10B981', margin: '10px 0 6px 0', textShadow: '0 0 12px rgba(16, 185, 129, 0.4)' }}>
                        {formatCurrency(totals.totalHandedOverCash)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        سندات قبض مقيدة بالخزينة المركزية
                    </div>
                </div>

                {/* KPI 5: Remaining Cash Custody / Shortages */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#EF4444' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#EF4444' }}>فروقات الصندوق / العجز ⚠️</span>
                        <span style={{ fontSize: '20px' }}>⏳</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: totals.totalRemainingCash > 0 ? '#EF4444' : '#10B981', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalRemainingCash)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        صافي المبالغ المعلقة بذمة الكاشير
                    </div>
                </div>

                {/* KPI 6: Fuel Pumps & Meter Reconciliation */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#00E5FF' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#00E5FF' }}>كميات ومطابقة الوقود ⛽</span>
                        <span style={{ fontSize: '20px' }}>⛽</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#F8FAFC', margin: '10px 0 6px 0', fontFamily: 'monospace' }}>
                        {Number(totals.totalLitersSold || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span style={{ fontSize: '16px', fontWeight: 700, color: '#94A3B8' }}>لتر</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        قيمة العدادات: <b style={{ color: '#00E5FF' }}>{formatCurrency(totals.meterTotalAmount || 0)}</b> | فارق: <b style={{ color: (totals.meterSalesVariance || 0) > 5 ? '#EF4444' : '#10B981' }}>{formatCurrency(totals.meterSalesVariance || 0)}</b>
                    </div>
                </div>
            </div>

            {/* Settlements Table Card */}
            <div className="aqua-glass-card" style={{ overflow: 'hidden', padding: 0 }}>
                {isLoading ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: '#00E5FF', fontWeight: 800, fontSize: '18px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '15px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
                        جاري تحميل ومطابقة عهد منافذ البيع والورديات...
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="settle-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px', color: '#F8FAFC' }}>
                            <thead style={{ background: 'rgba(0, 229, 255, 0.08)', borderBottom: '1.5px solid rgba(0, 229, 255, 0.2)' }}>
                                <tr>
                                    <th style={{ padding: '18px 20px', color: '#00E5FF', fontWeight: 900 }}>الوردية والمنفذ 🏪</th>
                                    <th style={{ padding: '18px 20px', color: '#00E5FF', fontWeight: 900 }}>التاريخ 📅</th>
                                    <th style={{ padding: '18px 20px', color: '#00E5FF', fontWeight: 900 }}>الكاشير / المسؤول 👤</th>
                                    <th style={{ padding: '18px 20px', color: '#F8FAFC', fontWeight: 900, textAlign: 'center' }}>المبيعات 💰</th>
                                    <th style={{ padding: '18px 20px', color: '#EF4444', fontWeight: 900, textAlign: 'center' }}>مصروفات الدرج (-)</th>
                                    <th style={{ padding: '18px 20px', color: '#E06D44', fontWeight: 900, textAlign: 'center' }}>المطالبة النقدية 💵</th>
                                    <th style={{ padding: '18px 20px', color: '#10B981', fontWeight: 900, textAlign: 'center' }}>المورد للخزينة ✅</th>
                                    <th style={{ padding: '18px 20px', color: '#F8FAFC', fontWeight: 900, textAlign: 'center' }}>فروقات الصندوق ⚠️</th>
                                    <th style={{ padding: '18px 20px', color: '#00E5FF', fontWeight: 900, textAlign: 'center' }}>عدادات الوقود (المضخات) ⛽</th>
                                    <th style={{ padding: '18px 20px', color: '#F8FAFC', fontWeight: 900, textAlign: 'center' }}>حالة التسوية</th>
                                    <th style={{ padding: '18px 20px', color: '#00E5FF', fontWeight: 900, textAlign: 'center' }}>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSettlements.length > 0 ? filteredSettlements.map((item, idx) => {
                                    const isSettled = item.settlementStatus === 'settled';
                                    const isPartial = item.settlementStatus === 'partial';
                                    const isOpenShift = item.settlementStatus === 'open';

                                    return (
                                        <tr key={item.id || idx} className="aqua-table-row">
                                            {/* Shift & Outlet */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{
                                                    background: 'rgba(28, 115, 171, 0.1)',
                                                    color: '#1C73AB',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    display: 'inline-block',
                                                    fontWeight: 900,
                                                    fontSize: '13px'
                                                }}>
                                                    {item.shiftNumber}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#122946', marginTop: '5px', fontWeight: 900 }}>
                                                    🏢 {item.warehouseName}
                                                </div>
                                                {item.warehouseLocation && (
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                        📍 {item.warehouseLocation}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Date */}
                                            <td style={{ padding: '18px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                <div>{formatDate(item.openedAt)}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    {item.closedAt ? `إغلاق: ${new Date(item.closedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}` : 'مفتوحة 🟢'}
                                                </div>
                                            </td>

                                            {/* Cashier */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ fontWeight: 900, color: '#122946', fontSize: '14px' }}>
                                                    {item.cashierName}
                                                </div>
                                                {item.cashierPhone && (
                                                    <div style={{ fontSize: '11px', color: '#1C73AB', marginTop: '3px' }}>
                                                        📞 {item.cashierPhone}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Sales */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                                <div style={{ fontWeight: 900, color: '#1C73AB', fontSize: '15px' }}>
                                                    {formatCurrency(item.totalSales)}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                                                    كاش: {formatCurrency(item.cashSales)} | شبكة: {formatCurrency(item.cardSales)}
                                                </div>
                                            </td>

                                            {/* Expenses */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 800, color: '#ef4444' }}>
                                                {item.totalExpenses > 0 ? formatCurrency(item.totalExpenses) : '---'}
                                            </td>

                                            {/* Net Cash Due */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 900, color: '#b45309', fontSize: '15px' }}>
                                                {formatCurrency(item.netCashDue)}
                                            </td>

                                            {/* Handed Over Cash */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 900, color: '#16a34a', fontSize: '15px' }}>
                                                {formatCurrency(item.handedOverCash)}
                                            </td>

                                            {/* Variance */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                                <div style={{
                                                    fontWeight: 900,
                                                    fontSize: '14px',
                                                    color: item.remainingCashCustody <= 0 ? '#16a34a' : '#ef4444'
                                                }}>
                                                    {item.remainingCashCustody <= 0 ? (
                                                        item.shortageOverage > 0 ? `+${formatCurrency(item.shortageOverage)} زيادة` : '0.00 ر.س متطابق'
                                                    ) : (
                                                        `-${formatCurrency(item.remainingCashCustody)} عجز/معلق`
                                                    )}
                                                </div>
                                            </td>

                                            {/* Fuel Pump Meters & Variance */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#122946' }}>
                                                    ⛽ {Number(item.totalLitersSold || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} لتر
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    قيمة: {formatCurrency(item.meterTotalAmount || 0)}
                                                </div>
                                                {Number(item.meterTotalAmount || 0) > 0 && (
                                                    <div style={{ 
                                                        marginTop: '4px',
                                                        fontSize: '10px', 
                                                        fontWeight: 900,
                                                        padding: '2px 6px',
                                                        borderRadius: '6px',
                                                        display: 'inline-block',
                                                        background: Math.abs(item.meterSalesVariance || 0) <= 5 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: Math.abs(item.meterSalesVariance || 0) <= 5 ? '#16a34a' : '#ef4444'
                                                    }}>
                                                        {Math.abs(item.meterSalesVariance || 0) <= 5 
                                                            ? '✅ مطابق' 
                                                            : (item.meterSalesVariance || 0) > 0 
                                                                ? `⚠️ فرق +${Number(item.meterSalesVariance).toFixed(1)} ر.س` 
                                                                : `ℹ️ فرق -${Math.abs(Number(item.meterSalesVariance)).toFixed(1)} ر.س`}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                                {isSettled ? (
                                                    <span style={{
                                                        background: 'rgba(22, 163, 74, 0.15)',
                                                        color: '#16a34a',
                                                        padding: '6px 14px',
                                                        borderRadius: '50px',
                                                        fontWeight: 900,
                                                        fontSize: '12px',
                                                        border: '1px solid rgba(22, 163, 74, 0.3)'
                                                    }}>
                                                        تمت التسوية ✅
                                                    </span>
                                                ) : isPartial ? (
                                                    <span style={{
                                                        background: 'rgba(40, 145, 200, 0.15)',
                                                        color: '#1C73AB',
                                                        padding: '6px 14px',
                                                        borderRadius: '50px',
                                                        fontWeight: 900,
                                                        fontSize: '12px',
                                                        border: '1px solid rgba(40, 145, 200, 0.3)'
                                                    }}>
                                                        تسوية جزئية 🔄
                                                    </span>
                                                ) : isOpenShift ? (
                                                    <span style={{
                                                        background: 'rgba(59, 130, 246, 0.15)',
                                                        color: '#2563eb',
                                                        padding: '6px 14px',
                                                        borderRadius: '50px',
                                                        fontWeight: 900,
                                                        fontSize: '12px',
                                                        border: '1px solid rgba(59, 130, 246, 0.3)'
                                                    }}>
                                                        وردية نشطة 🟢
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                        color: '#b45309',
                                                        padding: '6px 14px',
                                                        borderRadius: '50px',
                                                        fontWeight: 900,
                                                        fontSize: '12px',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)'
                                                    }}>
                                                        بانتظار التسوية ⏳
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    {/* Settle button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedShiftForSettlement(item);
                                                            setIsSettlementModalOpen(true);
                                                        }}
                                                        style={{
                                                            padding: '7px 14px',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            background: isSettled ? 'rgba(28, 115, 171, 0.12)' : 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                                                            color: isSettled ? '#1C73AB' : '#FFFFFF',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            boxShadow: isSettled ? 'none' : '0 4px 12px rgba(28, 115, 171, 0.25)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="تسوية العهدة النقدية وتوريد الخزينة"
                                                    >
                                                        <span>{isSettled ? 'تعديل التسوية' : '🤝 تسوية العهدة'}</span>
                                                    </button>

                                                    {/* Print clearance button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedShiftForPrint(item);
                                                            setIsPrintModalOpen(true);
                                                        }}
                                                        style={{
                                                            padding: '7px 12px',
                                                            borderRadius: '12px',
                                                            border: '1px solid rgba(28, 115, 171, 0.25)',
                                                            background: 'rgba(255, 255, 255, 0.8)',
                                                            color: '#1C73AB',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                        title="طباعة سند تسوية ومخالصة عهدة منفذ بيع"
                                                    >
                                                        <span>🖨️</span>
                                                        <span>سند</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={11} style={{ padding: '80px 20px', textAlign: 'center', color: '#1C73AB' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏪</div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#122946' }}>
                                                لا توجد ورديات أو منافذ بيع مطابقة لخيارات البحث المحددة
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                                                جرب تغيير فترة التاريخ أو المنفذ المختار لعرض كافة الورديات.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Settlement Action Modal */}
            <PosSettlementActionModal
                isOpen={isSettlementModalOpen}
                onClose={() => {
                    setIsSettlementModalOpen(false);
                    setSelectedShiftForSettlement(null);
                }}
                shift={selectedShiftForSettlement}
                accounts={accounts}
                inventoryItems={inventoryItems}
                onExecuteSettlement={executeSettlement}
                isSubmitting={isSettling}
            />

            {/* Official Print Modal */}
            <PosSettlementPrintModal
                isOpen={isPrintModalOpen}
                onClose={() => {
                    setIsPrintModalOpen(false);
                    setSelectedShiftForPrint(null);
                }}
                shift={selectedShiftForPrint}
            />
        </div>
    );
}
