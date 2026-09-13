"use client";
import React from 'react';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { useDelegateSettlementsLogic } from './delegate_settlements_logic';
import SettlementActionModal from './SettlementActionModal';
import SettlementPrintModal from './SettlementPrintModal';

export default function DelegateSettlementsPage() {
    const {
        filteredSettlements,
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
        // Supporting data
        inventoryItems,
        accounts,
        warehouses,
        // Modals
        selectedTripForSettlement,
        setSelectedTripForSettlement,
        isSettlementModalOpen,
        setIsSettlementModalOpen,
        selectedTripForPrint,
        setSelectedTripForPrint,
        isPrintModalOpen,
        setIsPrintModalOpen,
        // Mutations
        executeSettlement,
        isSettling
    } = useDelegateSettlementsLogic();

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
                /* Desert Glassmorphism Theme Styles */
                .aqua-glass-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%) !important;
                    backdrop-filter: blur(24px) saturate(160%) !important;
                    -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                    border-radius: 24px !important;
                    box-shadow: 0 4px 15px rgba(44, 26, 18, 0.08) !important;
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) !important;
                }
                .aqua-glass-card:hover {
                    transform: translateY(-4px) !important;
                    box-shadow: 0 10px 20px rgba(168, 87, 60, 0.15) !important;
                }
                .aqua-btn-primary {
                    background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%) !important;
                    color: #FFFFFF !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    border-radius: 12px !important;
                    font-weight: 800 !important;
                    cursor: pointer !important;
                    box-shadow: 0 4px 12px rgba(194, 155, 98, 0.35) !important;
                    transition: all 0.3s ease !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    text-decoration: none !important;
                }
                .aqua-btn-primary:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 8px 18px rgba(168, 87, 60, 0.3) !important;
                    filter: brightness(1.05) !important;
                }
                .aqua-btn-outline {
                    background: rgba(255, 253, 250, 0.7) !important;
                    color: #2C1A12 !important;
                    border: 1.5px solid rgba(194, 155, 98, 0.35) !important;
                    border-radius: 12px !important;
                    font-weight: 800 !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                }
                .aqua-btn-outline:hover {
                    background: rgba(194, 155, 98, 0.12) !important;
                    border-color: #C29B62 !important;
                    transform: translateY(-2px) !important;
                }
                .aqua-table-row {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid rgba(194, 155, 98, 0.12) !important;
                }
                .aqua-table-row:hover {
                    background: rgba(194, 155, 98, 0.08) !important;
                }
                .aqua-filter-tab {
                    padding: 10px 20px !important;
                    border-radius: 50px !important;
                    font-weight: 800 !important;
                    font-size: 13px !important;
                    cursor: pointer !important;
                    border: 1px solid transparent !important;
                    transition: all 0.25s ease !important;
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                }
                .aqua-filter-tab.active {
                    background: #2C1A12 !important;
                    color: #FDFBF7 !important;
                    box-shadow: 0 4px 15px rgba(44, 26, 18, 0.2) !important;
                }
                .aqua-filter-tab:not(.active) {
                    background: rgba(255, 253, 250, 0.7) !important;
                    color: #2C1A12 !important;
                    border-color: rgba(194, 155, 98, 0.25) !important;
                }
                .aqua-filter-tab:not(.active):hover {
                    background: rgba(255, 253, 250, 0.95) !important;
                    border-color: #C29B62 !important;
                }

                /* Spacious Status Badges */
                .status-badge-pill {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                    padding: 7px 16px !important;
                    border-radius: 50px !important;
                    font-weight: 900 !important;
                    font-size: 12px !important;
                    line-height: 1.2 !important;
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
                }

                .settle-table-wrapper {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    width: 100% !important;
                    border-radius: 20px !important;
                }

                .settle-table {
                    width: 100% !important;
                    min-width: 1550px !important;
                    border-collapse: collapse !important;
                }

                .settle-table th {
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                    letter-spacing: -0.2px !important;
                }

                .settle-table td {
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                }

                @media (max-width: 768px) {
                    .settle-page-header { padding: 20px 15px !important; border-radius: 20px !important; }
                    .settle-kpi-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .settle-filters-row { flex-direction: column !important; gap: 12px !important; }
                    .settle-filters-row > div { width: 100% !important; }
                    .settle-filter-tabs { width: 100% !important; overflow-x: auto !important; padding-bottom: 4px !important; flex-wrap: nowrap !important; }
                    .aqua-btn-primary, .aqua-btn-outline { min-height: 44px !important; width: 100% !important; }
                    .settle-table { min-width: 1550px !important; }
                    .settle-table th, .settle-table td { padding: 14px 16px !important; font-size: 13px !important; white-space: nowrap !important; }
                }
            `}</style>

            {/* Top Hero Banner */}
            <div className="settle-page-header" style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(240, 248, 255, 0.8) 100%)',
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
                            background: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            boxShadow: '0 10px 25px rgba(168, 87, 60, 0.35)',
                            color: '#fff'
                        }}>
                            🚚
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#122946', letterSpacing: '-0.5px' }}>
                                    تسوية عهد المناديب وإرجاع المخزون
                                </h1>
                                <span style={{
                                    background: 'rgba(194, 155, 98, 0.15)',
                                    color: '#A8573C',
                                    padding: '4px 12px',
                                    borderRadius: '50px',
                                    fontSize: '12px',
                                    fontWeight: 900
                                }}>
                                    Desert Glassmorphism 🏜️
                                </span>
                            </div>
                            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'rgba(44, 26, 18, 0.7)', fontWeight: 700 }}>
                                المطابقة المالية اليومية، توريد النقدية للخزينة، إرجاع فائض البضاعة للمستودع الرئيسي، وتوليد القيود وسندات القبض آلياً.
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
                    gap: '15px',
                    marginTop: '25px',
                    flexWrap: 'wrap',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(28, 115, 171, 0.1)'
                }}>
                    {/* Search Input */}
                    <div style={{ flex: '1 1 260px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="بحث باسم المندوب، رقم الرحلة، رقم الجوال، أو لوحة السيارة..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 20px 12px 40px',
                                borderRadius: '50px',
                                border: '1px solid rgba(28, 115, 171, 0.25)',
                                background: 'rgba(255, 255, 255, 0.85)',
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#122946',
                                outline: 'none',
                                boxShadow: 'inset 2px 2px 6px rgba(28, 115, 171, 0.05)'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '16px', top: '12px', fontSize: '16px', color: '#1C73AB' }}>🔍</span>
                    </div>

                    {/* Date From */}
                    <div style={{ flex: '0 1 170px' }}>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
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
                        />
                    </div>

                    {/* Date To */}
                    <div style={{ flex: '0 1 170px' }}>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
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
                        />
                    </div>

                    {/* Status Tabs */}
                    <div className="settle-filter-tabs" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            الكل ({totals.totalTrips})
                        </button>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('pending')}
                        >
                            ⏳ بانتظار التسوية ({totals.pendingTrips})
                        </button>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'settled' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('settled')}
                        >
                            ✅ تمت التسوية ({totals.settledTrips})
                        </button>
                        <button
                            type="button"
                            className={`aqua-filter-tab ${statusFilter === 'shortage' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('shortage')}
                        >
                            ⚠️ عهد معلقة
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
                {/* KPI 1: Active Trips */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#1C73AB' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C73AB' }}>رحلات الأسطول 🚚</span>
                        <span style={{ fontSize: '20px' }}>📦</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#122946', margin: '10px 0 6px 0' }}>
                        {totals.totalTrips}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        <span style={{ color: '#f59e0b' }}>{totals.pendingTrips} نشطة</span> | <span style={{ color: '#16a34a' }}>{totals.settledTrips} مغلقة</span>
                    </div>
                </div>

                {/* KPI 2: Total Sales */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#C29B62' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#C29B62' }}>إجمالي المبيعات 📈</span>
                        <span style={{ fontSize: '20px' }}>💰</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#2C1A12', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalSales)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        كاش: <b style={{ color: '#2C1A12' }}>{formatCurrency(totals.cashSales)}</b> | آجل: <b>{formatCurrency(totals.creditSales)}</b>
                    </div>
                </div>

                {/* KPI 3: Net Cash Due */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#f59e0b' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>المطالبة النقدية للعهد 💵</span>
                        <span style={{ fontSize: '20px' }}>⚖️</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#b45309', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalNetCashDue)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        (مبيعات كاش + تحصيلات) - مصروفات
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
                        سندات قبض مقيدة بالخزينة
                    </div>
                </div>

                {/* KPI 5: Remaining Cash Custody */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#ef4444' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#ef4444' }}>العهد المعلقة / العجز ⚠️</span>
                        <span style={{ fontSize: '20px' }}>⏳</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: totals.totalRemainingCash > 0 ? '#ef4444' : '#16a34a', margin: '10px 0 6px 0' }}>
                        {formatCurrency(totals.totalRemainingCash)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        صافي المبالغ بذمة المناديب
                    </div>
                </div>

                {/* KPI 6: Remaining Stock in Vehicles */}
                <div className="aqua-glass-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#7FD4E3' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1C73AB' }}>بضائع بانتظار الإرجاع 🔄</span>
                        <span style={{ fontSize: '20px' }}>💧</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#122946', margin: '10px 0 6px 0' }}>
                        {totals.totalRemainingItems} <span style={{ fontSize: '16px', fontWeight: 700, color: '#64748b' }}>حبة</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        متبقية في سيارات التوزيع
                    </div>
                </div>
            </div>

            {/* Settlements Table Card */}
            <div className="aqua-glass-card" style={{ overflow: 'hidden', padding: 0 }}>
                {isLoading ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: '#1C73AB', fontWeight: 800, fontSize: '18px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '15px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
                        جاري تحميل ومطابقة عهد المناديب والأسطول...
                    </div>
                ) : (
                    <div className="settle-table-wrapper">
                        <table className="settle-table" style={{ width: '100%', minWidth: '1550px', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px', color: '#122946' }}>
                            <thead style={{ background: 'rgba(28, 115, 171, 0.08)', borderBottom: '1.5px solid rgba(28, 115, 171, 0.15)' }}>
                                <tr>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900, minWidth: '170px', whiteSpace: 'nowrap' }}>الرحلة والسيارة 🚚</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900, minWidth: '130px', whiteSpace: 'nowrap' }}>التاريخ 📅</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900, minWidth: '220px', whiteSpace: 'nowrap' }}>المندوب / السائق 👤</th>
                                    <th style={{ padding: '18px 20px', color: '#122946', fontWeight: 900, textAlign: 'center', minWidth: '190px', whiteSpace: 'nowrap' }}>المبيعات 📦</th>
                                    <th style={{ padding: '18px 20px', color: '#ef4444', fontWeight: 900, textAlign: 'center', minWidth: '140px', whiteSpace: 'nowrap' }}>المصروفات (-)</th>
                                    <th style={{ padding: '18px 20px', color: '#b45309', fontWeight: 900, textAlign: 'center', minWidth: '160px', whiteSpace: 'nowrap' }}>المطالبة النقدية 💰</th>
                                    <th style={{ padding: '18px 20px', color: '#16a34a', fontWeight: 900, textAlign: 'center', minWidth: '160px', whiteSpace: 'nowrap' }}>المورد للخزينة 💵</th>
                                    <th style={{ padding: '18px 20px', color: '#122946', fontWeight: 900, textAlign: 'center', minWidth: '160px', whiteSpace: 'nowrap' }}>متبقي العهدة ⚠️</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900, textAlign: 'center', minWidth: '180px', whiteSpace: 'nowrap' }}>بضاعة السيارة 🔄</th>
                                    <th style={{ padding: '18px 20px', color: '#122946', fontWeight: 900, textAlign: 'center', minWidth: '160px', whiteSpace: 'nowrap' }}>حالة التسوية</th>
                                    <th style={{ padding: '18px 20px', color: '#1C73AB', fontWeight: 900, textAlign: 'center', minWidth: '210px', whiteSpace: 'nowrap' }}>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSettlements.length > 0 ? filteredSettlements.map((item, idx) => {
                                    const isSettled = item.settlementStatus === 'settled';
                                    const isPartial = item.settlementStatus === 'partial';

                                    return (
                                        <tr key={item.id || idx} className="aqua-table-row">
                                            {/* Trip & Vehicle */}
                                            <td style={{ padding: '18px 20px', whiteSpace: 'nowrap' }}>
                                                <div style={{
                                                    background: 'rgba(28, 115, 171, 0.1)',
                                                    color: '#1C73AB',
                                                    padding: '5px 12px',
                                                    borderRadius: '10px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    fontWeight: 900,
                                                    fontSize: '13px',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    #{item.operationNumber}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    🚗 {item.vehiclePlate}
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td style={{ padding: '18px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {formatDate(item.date)}
                                            </td>

                                            {/* Delegate Name & Partner ID */}
                                            <td style={{ padding: '18px 20px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 900, color: '#122946', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                                    {item.driverName}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#1C73AB', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                                    {item.driverPhone && <span>📞 {item.driverPhone}</span>}
                                                    {item.driverId && (
                                                        <span title={item.driverId} style={{ background: 'rgba(28, 115, 171, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                                            ID: {item.driverId.slice(0, 6)}..
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Sales */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 900, color: '#1C73AB', fontSize: '15px' }}>
                                                    {formatCurrency(item.totalSales)}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', whiteSpace: 'nowrap' }}>
                                                    كاش: {formatCurrency(item.cashSales)} | آجل: {formatCurrency(item.creditSales)}
                                                </div>
                                            </td>

                                            {/* Expenses */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 800, color: '#ef4444', whiteSpace: 'nowrap' }}>
                                                {item.totalExpenses > 0 ? formatCurrency(item.totalExpenses) : '---'}
                                            </td>

                                            {/* Net Cash Due */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 900, color: '#b45309', fontSize: '15px', whiteSpace: 'nowrap' }}>
                                                {formatCurrency(item.netCashDue)}
                                            </td>

                                            {/* Handed Over Cash */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 900, color: '#16a34a', fontSize: '15px', whiteSpace: 'nowrap' }}>
                                                {formatCurrency(item.handedOverCash)}
                                            </td>

                                            {/* Remaining Cash */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <div style={{
                                                    fontWeight: 900,
                                                    fontSize: '15px',
                                                    color: item.remainingCashCustody <= 0 ? '#16a34a' : '#ef4444',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {item.remainingCashCustody <= 0 ? '0.00 ر.س' : formatCurrency(item.remainingCashCustody)}
                                                </div>
                                            </td>

                                            {/* Remaining Items */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {item.totalRemainingQty > 0 ? (
                                                    <span style={{
                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                        color: '#b45309',
                                                        padding: '6px 14px',
                                                        borderRadius: '20px',
                                                        fontWeight: 900,
                                                        fontSize: '12px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {item.totalRemainingQty} حبة بالسيارة
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#16a34a', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                        تم الإرجاع بالكامل ✔️
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {isSettled ? (
                                                    <span className="status-badge-pill" style={{
                                                        background: 'rgba(22, 163, 74, 0.15)',
                                                        color: '#16a34a',
                                                        border: '1px solid rgba(22, 163, 74, 0.3)'
                                                    }}>
                                                        تمت التسوية ✅
                                                    </span>
                                                ) : isPartial ? (
                                                    <span className="status-badge-pill" style={{
                                                        background: 'rgba(40, 145, 200, 0.15)',
                                                        color: '#1C73AB',
                                                        border: '1px solid rgba(40, 145, 200, 0.3)'
                                                    }}>
                                                        تسوية جزئية 🔄
                                                    </span>
                                                ) : (
                                                    <span className="status-badge-pill" style={{
                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                        color: '#b45309',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)'
                                                    }}>
                                                        بانتظار التسوية ⏳
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '18px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                                    {/* Settle button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTripForSettlement(item);
                                                            setIsSettlementModalOpen(true);
                                                        }}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            background: isSettled ? 'rgba(194, 155, 98, 0.15)' : 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
                                                            color: isSettled ? '#C29B62' : '#FFFFFF',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            boxShadow: isSettled ? 'none' : '0 4px 12px rgba(168, 87, 60, 0.25)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            whiteSpace: 'nowrap',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="تسوية العهدة النقدية وإرجاع البضاعة"
                                                    >
                                                        <span>{isSettled ? 'تعديل التسوية' : '🤝 تسوية العهدة'}</span>
                                                    </button>

                                                    {/* Print clearance button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTripForPrint(item);
                                                            setIsPrintModalOpen(true);
                                                        }}
                                                        style={{
                                                            padding: '8px 14px',
                                                            borderRadius: '12px',
                                                            border: '1.5px solid rgba(28, 115, 171, 0.25)',
                                                            background: 'rgba(255, 255, 255, 0.8)',
                                                            color: '#1C73AB',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            whiteSpace: 'nowrap',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="طباعة سند تسوية ومخالصة عهدة رسمية"
                                                    >
                                                        <span>🖨️ طباعة</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={11} style={{ padding: '80px 20px', textAlign: 'center', color: '#1C73AB' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💧</div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#122946' }}>
                                                لا توجد رحلات أو عهد مطابقة لخيارات البحث المحددة
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                                                جرب تغيير فترة التاريخ أو مسح شريط البحث لعرض كافة الرحلات.
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
            <SettlementActionModal
                isOpen={isSettlementModalOpen}
                onClose={() => {
                    setIsSettlementModalOpen(false);
                    setSelectedTripForSettlement(null);
                }}
                trip={selectedTripForSettlement}
                inventoryItems={inventoryItems}
                accounts={accounts}
                warehouses={warehouses}
                onExecuteSettlement={executeSettlement}
                isSubmitting={isSettling}
            />

            {/* Official Print Modal */}
            <SettlementPrintModal
                isOpen={isPrintModalOpen}
                onClose={() => {
                    setIsPrintModalOpen(false);
                    setSelectedTripForPrint(null);
                }}
                trip={selectedTripForPrint}
            />
        </div>
    );
}
