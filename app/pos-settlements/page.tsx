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
            background: '#F4F1EE',
            minHeight: '100vh',
            padding: '30px 24px',
            direction: 'rtl',
            maxWidth: '100vw',
            overflowX: 'hidden',
            boxSizing: 'border-box'
        }}>
            <style>{`
                /* Aqua Glassmorphism Theme Styles */
                .aqua-glass-card {
                    background: rgba(255, 255, 255, 0.7) !important;
                    backdrop-filter: blur(40px) saturate(200%) !important;
                    -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
                    border: 1px solid rgba(255, 255, 255, 0.8) !important;
                    border-radius: 26px !important;
                    box-shadow: 0 10px 30px rgba(28, 115, 171, 0.08), inset 0 2px 2px rgba(255, 255, 255, 1) !important;
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
                }
                .aqua-glass-card:hover {
                    transform: translateY(-4px) !important;
                    box-shadow: 0 16px 36px rgba(28, 115, 171, 0.14), inset 0 2px 2px rgba(255, 255, 255, 1) !important;
                }
                .aqua-btn-primary {
                    background: linear-gradient(135deg, #1C73AB 0%, #2891C8 100%) !important;
                    color: #FFFFFF !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    border-radius: 50px !important;
                    font-weight: 900 !important;
                    cursor: pointer !important;
                    box-shadow: 0 6px 20px rgba(28, 115, 171, 0.25) !important;
                    transition: all 0.3s ease !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    text-decoration: none !important;
                }
                .aqua-btn-primary:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 10px 25px rgba(28, 115, 171, 0.35) !important;
                    filter: brightness(1.06) !important;
                }
                .aqua-table-row {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid rgba(28, 115, 171, 0.08) !important;
                }
                .aqua-table-row:hover {
                    background: rgba(28, 115, 171, 0.05) !important;
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
                    background: #1C73AB !important;
                    color: #FFFFFF !important;
                    box-shadow: 0 4px 15px rgba(28, 115, 171, 0.3) !important;
                }
                .aqua-filter-tab:not(.active) {
                    background: rgba(255, 255, 255, 0.6) !important;
                    color: #1C73AB !important;
                    border-color: rgba(28, 115, 171, 0.15) !important;
                }
                .aqua-filter-tab:not(.active):hover {
                    background: rgba(255, 255, 255, 0.9) !important;
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
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(240, 248, 255, 0.82) 100%)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderRadius: '30px',
                padding: '30px 35px',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 12px 35px rgba(28, 115, 171, 0.12), inset 0 2px 3px rgba(255, 255, 255, 1)',
                marginBottom: '30px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '22px',
                            background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            boxShadow: '0 10px 25px rgba(28, 115, 171, 0.35)',
                            color: '#fff'
                        }}>
                            🏪
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#122946', letterSpacing: '-0.5px' }}>
                                    تسوية عهد منافذ البيع وإغلاق الورديات
                                </h1>
                                <span style={{
                                    background: 'rgba(28, 115, 171, 0.12)',
                                    color: '#1C73AB',
                                    padding: '4px 12px',
                                    borderRadius: '50px',
                                    fontSize: '12px',
                                    fontWeight: 900
                                }}>
                                    Aqua Glassmorphism 💎
                                </span>
                            </div>
                            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#1C73AB', fontWeight: 700 }}>
                                المطابقة النقدية لدرج الصناديق، توريد الإيرادات للخزينة، تسوية فوارغ المياه، جرد مخزون المنافذ، وإصدار سندات المخالصة الرسمية.
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
                                border: '1px solid rgba(28, 115, 171, 0.25)',
                                background: 'rgba(255, 255, 255, 0.85)',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#122946',
                                outline: 'none'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '16px', top: '11px', fontSize: '16px', color: '#1C73AB' }}>🔍</span>
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
                                border: '1px solid rgba(28, 115, 171, 0.25)',
                                background: 'rgba(255, 255, 255, 0.85)',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#122946',
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
                                border: '1px solid rgba(28, 115, 171, 0.25)',
                                background: 'rgba(255, 255, 255, 0.85)',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#122946',
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
                                border: '1px solid rgba(28, 115, 171, 0.25)',
                                background: 'rgba(255, 255, 255, 0.85)',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#122946',
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
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#1C73AB' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C73AB' }}>ورديات ومنافذ البيع 🏪</span>
                        <span style={{ fontSize: '20px' }}>📦</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#122946', margin: '10px 0 6px 0' }}>
                        {totals.totalShifts}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        <span style={{ color: '#f59e0b' }}>{totals.pendingShifts} بانتظار التسوية</span> | <span style={{ color: '#16a34a' }}>{totals.settledShifts} مسواة</span>
                    </div>
                </div>

                {/* KPI 2: Total Sales */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#2891C8' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C73AB' }}>إجمالي المبيعات 📈</span>
                        <span style={{ fontSize: '20px' }}>💰</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#1C73AB', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalSales)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        كاش: <b style={{ color: '#122946' }}>{formatCurrency(totals.cashSales)}</b> | شبكة: <b>{formatCurrency(totals.cardSales)}</b>
                    </div>
                </div>

                {/* KPI 3: Drawer Cash Due */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#f59e0b' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>المطالبة النقدية للدرج 💵</span>
                        <span style={{ fontSize: '20px' }}>⚖️</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#b45309', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalNetCashDue)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        (بداية + مبيعات كاش + تحصيلات) - مصروفات
                    </div>
                </div>

                {/* KPI 4: Handed Over Cash */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#16a34a' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>المورد للخزينة ✅</span>
                        <span style={{ fontSize: '20px' }}>🏦</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#16a34a', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalHandedOverCash)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        سندات قبض مقيدة بالخزينة المركزية
                    </div>
                </div>

                {/* KPI 5: Remaining Cash Custody / Shortages */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#ef4444' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#ef4444' }}>فروقات الصندوق / العجز ⚠️</span>
                        <span style={{ fontSize: '20px' }}>⏳</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: totals.totalRemainingCash > 0 ? '#ef4444' : '#16a34a', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalRemainingCash)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        صافي المبالغ المعلقة بذمة الكاشير
                    </div>
                </div>

                {/* KPI 6: Bottles & Stock */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#7FD4E3' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C73AB' }}>فوارغ ومخزون المنفذ 🔄</span>
                        <span style={{ fontSize: '20px' }}>💧</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#122946', margin: '10px 0 6px 0' }}>
                        {totals.totalStock} <span style={{ fontSize: '16px', fontWeight: 700, color: '#64748b' }}>حبة</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        مرتجع فوارغ: <b style={{ color: '#16a34a' }}>{totals.bottlesReturned}</b> | مباع: <b>{totals.bottlesSold}</b>
                    </div>
                </div>
            </div>

            {/* Settlements Table Card */}
            <div className="aqua-glass-card" style={{ overflow: 'hidden', padding: 0 }}>
                {isLoading ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: '#1C73AB', fontWeight: 800, fontSize: '18px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '15px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
                        جاري تحميل ومطابقة عهد منافذ البيع والورديات...
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="settle-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px', color: '#122946' }}>
                            <thead style={{ background: 'rgba(28, 115, 171, 0.08)', borderBottom: '1.5px solid rgba(28, 115, 171, 0.15)' }}>
                                <tr>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900 }}>الوردية والمنفذ 🏪</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900 }}>التاريخ 📅</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900 }}>الكاشير / المسؤول 👤</th>
                                    <th style={{ padding: '18px 20px', color: '#122946', fontWeight: 900, textAlign: 'center' }}>المبيعات 💰</th>
                                    <th style={{ padding: '18px 20px', color: '#ef4444', fontWeight: 900, textAlign: 'center' }}>مصروفات الدرج (-)</th>
                                    <th style={{ padding: '18px 20px', color: '#b45309', fontWeight: 900, textAlign: 'center' }}>المطالبة النقدية 💵</th>
                                    <th style={{ padding: '18px 20px', color: '#16a34a', fontWeight: 900, textAlign: 'center' }}>المورد للخزينة ✅</th>
                                    <th style={{ padding: '18px 20px', color: '#122946', fontWeight: 900, textAlign: 'center' }}>فروقات الصندوق ⚠️</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900, textAlign: 'center' }}>فوارغ المياه 💧</th>
                                    <th style={{ padding: '18px 20px', color: '#122946', fontWeight: 900, textAlign: 'center' }}>حالة التسوية</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900, textAlign: 'center' }}>الإجراءات</th>
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

                                            {/* Bottles */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#122946' }}>
                                                    مرتجع: <b style={{ color: '#16a34a' }}>{item.bottlesReturned}</b>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    مباع: {item.bottlesSold} | متبقي: {item.expectedBottles}
                                                </div>
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
