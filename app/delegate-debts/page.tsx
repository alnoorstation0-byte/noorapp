"use client";
import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useDelegateDebtsLogic } from './delegate_debts_logic';

export default function DelegateDebtsPage() {
  const logic = useDelegateDebtsLogic();
  const [expandedDelegates, setExpandedDelegates] = useState<Record<string, boolean>>({});

  const toggleDelegate = (id: string) => {
    setExpandedDelegates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <button 
        className="btn-main-glass blue" 
        onClick={logic.handleRefresh}
        disabled={logic.isLoading}
      >
        {logic.isLoading ? '⏳ جاري جلب الديون...' : '🔄 تحديث الكشف'}
      </button>
      <button 
        className="btn-main-glass white" 
        onClick={() => window.print()}
      >
        🖨️ طباعة كشف التحصيل
      </button>
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage icon="🎯" 
        title="كشف عهدة التحصيل (Delegate Outstanding Debts)" 
        subtitle="حصر الديون المتأخرة في السوق والمطلوب من كل مندوب تحصيلها"
      >
        <RawasiSidebarManager 
          actions={sidebarActions}
          summary={
            <div className="summary-glass-card">
              <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الديون بالسوق 📉</span>
              <div style={{fontSize:'22px', color: '#ef4444', fontWeight:900, marginTop:'5px'}}>
                {formatCurrency(logic.grandTotalDebt)}
              </div>
            </div>
          }
        />

        {logic.isLoading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            جاري حصر الفواتير غير المحصلة وتوزيعها على المناديب...
          </div>
        ) : (
          <div className="delegates-list">
            {logic.delegatesData.length === 0 ? (
              <div className="empty-state">
                🎉 لا توجد ديون متأخرة أو فواتير غير محصلة لدى المناديب
              </div>
            ) : (
              logic.delegatesData.map(delegate => (
                <div key={delegate.delegate_id} className="delegate-section">
                  {/* شريط المندوب (الرأس) */}
                  <div 
                    className="delegate-header" 
                    onClick={() => toggleDelegate(delegate.delegate_id)}
                  >
                    <div className="delegate-info">
                      <div className="delegate-avatar">👨‍💼</div>
                      <div>
                        <h3>{delegate.delegate_name}</h3>
                        <span className="invoice-count">يوجد {delegate.invoice_count} فاتورة غير محصلة</span>
                      </div>
                    </div>
                    <div className="delegate-total">
                      <span className="label">العهدة المطلوبة</span>
                      <span className="amount">{formatCurrency(delegate.total_debt)}</span>
                      <span className="toggle-icon">{expandedDelegates[delegate.delegate_id] ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* تفاصيل فواتير المندوب */}
                  {expandedDelegates[delegate.delegate_id] && (
                    <div className="delegate-invoices-container">
                      <table className="aqua-table">
                        <thead>
                          <tr>
                            <th>رقم الفاتورة</th>
                            <th>التاريخ</th>
                            <th>اسم العميل</th>
                            <th style={{ textAlign: 'left' }}>القيمة الإجمالية</th>
                            <th style={{ textAlign: 'left' }}>المحصل سابقاً</th>
                            <th style={{ textAlign: 'left' }}>المتبقي (المطلوب تحصيله)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {delegate.invoices.map(inv => (
                            <tr key={inv.id}>
                              <td style={{ fontWeight: 900, color: '#1e293b' }}>{inv.invoice_number}</td>
                              <td style={{ fontWeight: 700, color: '#64748b' }}>{inv.date}</td>
                              <td style={{ fontWeight: 800 }}>{inv.client_name}</td>
                              <td style={{ textAlign: 'left', fontWeight: 800, color: '#475569' }}>
                                {formatCurrency(inv.total_amount)}
                              </td>
                              <td style={{ textAlign: 'left', fontWeight: 800, color: '#10b981' }}>
                                {formatCurrency(inv.paid_amount)}
                              </td>
                              <td style={{ textAlign: 'left', fontWeight: 900, color: '#ef4444' }}>
                                {formatCurrency(inv.remaining_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <style>{`
          .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
          .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
          .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
          
          .summary-glass-card { background: rgba(239, 68, 68, 0.05); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 25px; }
          
          .loading-state { text-align: center; padding: 100px; font-weight: 900; color: #64748b; }
          .loading-state .spinner { font-size: 40px; margin-bottom: 15px; }

          .empty-state { text-align: center; padding: 60px; font-weight: 900; color: #10b981; font-size: 18px; background: rgba(255,255,255,0.5); border-radius: 24px; border: 1px dashed rgba(16, 185, 129, 0.5); }

          .delegates-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-top: 20px;
          }

          .delegate-section {
            background: rgba(255,255,255,0.6);
            backdrop-filter: blur(15px);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.5);
            box-shadow: 0 10px 40px rgba(0,0,0,0.03);
            overflow: hidden;
            transition: 0.3s;
          }

          .delegate-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 25px;
            cursor: pointer;
            background: linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.8));
          }
          .delegate-header:hover {
            background: linear-gradient(to right, rgba(255,255,255,0.3), rgba(255,255,255,0.9));
          }

          .delegate-info {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .delegate-avatar {
            font-size: 30px;
            background: rgba(40,145,200,0.1);
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
          }
          .delegate-info h3 {
            margin: 0 0 5px 0;
            font-size: 18px;
            font-weight: 900;
            color: #1e293b;
          }
          .invoice-count {
            font-size: 12px;
            font-weight: 800;
            color: #64748b;
            background: rgba(0,0,0,0.05);
            padding: 3px 10px;
            border-radius: 10px;
          }

          .delegate-total {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .delegate-total .label {
            font-size: 13px;
            font-weight: 800;
            color: #475569;
          }
          .delegate-total .amount {
            font-size: 22px;
            font-weight: 900;
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            padding: 5px 15px;
            border-radius: 12px;
          }
          .toggle-icon {
            font-size: 12px;
            color: #94a3b8;
            margin-right: 10px;
          }

          /* Table Styles */
          .delegate-invoices-container {
            border-top: 1px dashed rgba(0,0,0,0.1);
            padding: 10px;
            background: rgba(255,255,255,0.3);
          }
          .aqua-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }
          .aqua-table th {
            color: #475569;
            font-weight: 900;
            padding: 15px 20px;
            text-align: right;
            font-size: 12px;
            border-bottom: 2px solid rgba(0, 0, 0, 0.05);
          }
          .aqua-table td {
            padding: 12px 20px;
            border-bottom: 1px solid rgba(0,0,0,0.03);
            font-size: 13px;
            vertical-align: middle;
          }
          .aqua-table tbody tr:hover {
            background: rgba(255,255,255,0.5);
          }

          @media (max-width: 768px) {
            .delegate-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 15px !important; }
            .delegate-total { width: 100% !important; justify-content: space-between !important; }
            .delegate-total .amount { font-size: 18px !important; }
            .delegate-invoices-container { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; padding: 5px !important; }
            .aqua-table { min-width: 600px !important; }
            .aqua-table th, .aqua-table td { padding: 8px 10px !important; font-size: 11px !important; }
          }
        `}</style>
      </MasterPage>
    </div>
  );
}
