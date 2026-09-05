"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useTripProfitabilityLogic } from './trip_profitability_logic';

export default function TripProfitabilityPage() {
  const logic = useTripProfitabilityLogic();

  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <button 
        className="btn-main-glass blue" 
        onClick={logic.handleRefresh}
        disabled={logic.isLoading}
      >
        {logic.isLoading ? '⏳ جاري الحساب...' : '🔄 تحديث التقرير'}
      </button>
      <button 
        className="btn-main-glass white" 
        onClick={() => window.print()}
      >
        🖨️ طباعة تقرير الربحية
      </button>
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage icon="🚚" 
        title="ربحية الرحلات (Trip Profitability)" 
        subtitle="تحليل مالي شامل لإيرادات وتكاليف وصافي ربح كل رحلة توزيع"
      >
        <RawasiSidebarManager 
          actions={sidebarActions}
          summary={
            <div className="summary-glass-card">
              <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>الفترة الزمنية 📅</span>
              <div style={{fontSize:'11px', color: THEME.primary, fontWeight:900, marginTop:'5px'}}>
                من: {logic.dateRange.start} <br/> إلى: {logic.dateRange.end}
              </div>
            </div>
          }
        />

        {/* شريط الفلاتر */}
        <div className="filter-bar">
          <div className="filter-group">
            <label>من تاريخ:</label>
            <input 
              type="date" 
              value={logic.dateRange.start} 
              onChange={(e) => logic.handleDateChange('start', e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <label>إلى تاريخ:</label>
            <input 
              type="date" 
              value={logic.dateRange.end} 
              onChange={(e) => logic.handleDateChange('end', e.target.value)} 
            />
          </div>
        </div>

        {logic.isLoading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            جاري احتساب وتحليل ربحية الرحلات...
          </div>
        ) : (
          <>
            {/* ملخص الربحية */}
            <div className="profit-summary-grid">
              
              <div className="profit-card sales-card">
                <div className="profit-icon">💵</div>
                <h3>إجمالي المبيعات</h3>
                <div className="profit-amount">{formatCurrency(logic.summary.totalSales)}</div>
                <div className="profit-base">
                  إجمالي المبيعات المحققة من {logic.summary.tripsCount} رحلة
                </div>
              </div>

              <div className="profit-card costs-card">
                <div className="profit-icon">📉</div>
                <h3>إجمالي التكاليف والمصروفات</h3>
                <div className="profit-amount">{formatCurrency(logic.summary.totalExpenses + logic.summary.totalInventoryCost)}</div>
                <div className="profit-base">
                  تكلفة بضاعة: <span>{formatCurrency(logic.summary.totalInventoryCost)}</span> | مصاريف: <span>{formatCurrency(logic.summary.totalExpenses)}</span>
                </div>
              </div>

              <div className={`profit-card net-card ${logic.summary.totalNetProfit >= 0 ? 'profitable' : 'loss'}`}>
                <div className="profit-icon">💰</div>
                <h3>صافي الربح الشامل</h3>
                <div className="profit-amount">{formatCurrency(Math.abs(logic.summary.totalNetProfit))}</div>
                <div className="profit-base status-badge">
                  {logic.summary.totalNetProfit >= 0 ? 'أرباح تشغيلية (Profits)' : 'خسائر تشغيلية (Losses)'}
                </div>
              </div>

            </div>

            {/* جدول التفاصيل */}
            <h2 className="section-title">
              <span>📊</span> تفاصيل ربحية كل رحلة
            </h2>
            <div className="table-glass-container">
              <table className="aqua-table">
                <thead>
                  <tr>
                    <th>رقم وتاريخ الرحلة</th>
                    <th>السيارة والمندوب</th>
                    <th>حالة الرحلة</th>
                    <th style={{ textAlign: 'left' }}>المبيعات (إيراد)</th>
                    <th style={{ textAlign: 'left' }}>تكلفة البضاعة</th>
                    <th style={{ textAlign: 'left' }}>المصاريف</th>
                    <th style={{ textAlign: 'left' }}>صافي الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {logic.trips.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#ef4444', fontWeight: 900 }}>
                        لا توجد رحلات مسجلة في هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    logic.trips.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div style={{ fontWeight: 900, color: '#1e293b' }}>{t.operation_number}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>{t.operation_date}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800 }}>{t.vehicle_name}</div>
                          <div style={{ fontSize: '12px', color: '#475569' }}>{t.driver_name}</div>
                        </td>
                        <td>
                          <span className={`badge ${t.status === 'مغلق' ? 'badge-closed' : 'badge-open'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: 900, color: '#10b981' }}>
                          {formatCurrency(t.total_sales)}
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: 800, color: '#ef4444' }}>
                          {formatCurrency(t.inventory_cost)}
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: 800, color: '#f59e0b' }}>
                          {formatCurrency(t.total_expenses)}
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: 900, color: t.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatCurrency(t.net_profit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <style>{`
          .filter-bar {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 20px;
            padding: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            align-items: flex-end;
            box-shadow: 0 8px 32px rgba(0,0,0,0.05);
            margin-bottom: 25px;
          }
          .filter-group { display: flex; flex-direction: column; gap: 5px; }
          .filter-group label { font-size: 12px; font-weight: 900; color: #1e293b; }
          .filter-group input { 
            width: 100%; 
            padding: 10px 12px; 
            border-radius: 12px; 
            background: rgba(255, 255, 255, 0.65); 
            border: 1px solid rgba(255, 255, 255, 0.8); 
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
            outline: none; 
            font-weight: 700; 
            color: #1e293b; 
            transition: all 0.2s; 
          }
          .filter-group input:focus {
            background: #ffffff; 
            border-color: ${THEME.accent}; 
            box-shadow: 0 0 0 4px rgba(202, 138, 4, 0.15); 
          }
          
          .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
          .loading-state { text-align: center; padding: 100px; font-weight: 900; color: #64748b; }
          .loading-state .spinner { font-size: 40px; margin-bottom: 15px; }

          .section-title { color: #122946; font-weight: 900; margin-top: 40px; margin-bottom: 25px; border-bottom: 2px solid rgba(40,145,200,0.15); padding-bottom: 12px; display: flex; align-items: center; font-size: 20px; }
          .section-title span { font-size: 26px; margin-left: 12px; }

          .profit-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .profit-card {
            background: rgba(255,255,255,0.7);
            backdrop-filter: blur(15px);
            padding: 30px;
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.5);
            box-shadow: 0 10px 40px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
            text-align: center;
          }
          
          .profit-card h3 {
            font-size: 16px;
            color: #475569;
            font-weight: 900;
            margin: 0 0 15px 0;
          }

          .profit-amount {
            font-size: 32px;
            font-weight: 900;
            margin-bottom: 15px;
          }

          .profit-base {
            font-size: 12px;
            color: #64748b;
            font-weight: 800;
            padding-top: 15px;
            border-top: 1px dashed rgba(0,0,0,0.1);
          }
          .profit-base span {
            color: #1e293b;
          }

          .profit-icon {
            position: absolute;
            top: -15px;
            right: -15px;
            font-size: 120px;
            opacity: 0.05;
            transform: rotate(15deg);
          }

          .sales-card .profit-amount { color: #10b981; }
          .costs-card .profit-amount { color: #ef4444; }
          
          .net-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
            border-width: 2px;
          }
          .net-card.profitable { border-color: #10b981; }
          .net-card.profitable .profit-amount { color: #059669; }
          .net-card.profitable .status-badge { color: #059669; background: rgba(16, 185, 129, 0.1); padding: 5px 10px; border-radius: 8px; display: inline-block; margin-top: 10px; }

          .net-card.loss { border-color: #ef4444; }
          .net-card.loss .profit-amount { color: #b91c1c; }
          .net-card.loss .status-badge { color: #b91c1c; background: rgba(239, 68, 68, 0.1); padding: 5px 10px; border-radius: 8px; display: inline-block; margin-top: 10px; }

          /* Table Styles */
          .table-glass-container {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(15px);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.4);
            padding: 5px;
            overflow-x: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          }
          .aqua-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }
          .aqua-table th {
            background: rgba(18, 41, 70, 0.05);
            color: #122946;
            font-weight: 900;
            padding: 18px 20px;
            text-align: right;
            font-size: 13px;
            border-bottom: 2px solid rgba(18, 41, 70, 0.1);
          }
          .aqua-table td {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(0,0,0,0.03);
            font-size: 14px;
            vertical-align: middle;
          }
          .aqua-table tbody tr:hover {
            background: rgba(255,255,255,0.8);
          }
          
          .badge {
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 900;
          }
          .badge-closed {
            background: rgba(16, 185, 129, 0.15);
            color: #059669;
          }
          .badge-open {
            background: rgba(245, 158, 11, 0.15);
            color: #d97706;
          }
        `}</style>
      </MasterPage>
    </div>
  );
}
