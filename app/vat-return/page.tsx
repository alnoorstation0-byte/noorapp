"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useVATReturnLogic } from './vat_logic';
import PrintHeader from '@/components/PrintHeader';

export default function VATReturnPage() {
  const logic = useVATReturnLogic();

  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <button 
        className="btn-main-glass blue" 
        onClick={logic.handleRefresh}
        disabled={logic.isLoading}
      >
        {logic.isLoading ? '⏳ جاري الحساب...' : '🔄 تحديث الإقرار'}
      </button>
      <button 
        className="btn-main-glass white" 
        onClick={() => window.print()}
      >
        🖨️ طباعة الإقرار الضريبي
      </button>
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage icon="🏛️" 
        title="الإقرار الضريبي (VAT Return)" 
        subtitle="تقرير شامل لضريبة المدخلات والمخرجات وصافي الضريبة المستحقة لهيئة الزكاة"
      >
        <RawasiSidebarManager 
          actions={sidebarActions}
          summary={
            <div className="summary-glass-card">
              <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>الفترة الضريبية 📅</span>
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
            جاري احتساب الضريبة بناءً على القيود المحاسبية...
          </div>
        ) : (
          <>
            <PrintHeader title="الإقرار الضريبي" subtitle={`عن الفترة من ${logic.dateRange.start} إلى ${logic.dateRange.end}`} />

            {/* حاوية الطباعة العلوية لجمع الملخص والرسم البياني معاً في صفحة واحدة */}
            <div className="print-top-section">
              {/* ملخص الإقرار الضريبي */}
              <div className="vat-summary-grid">
                
                {/* ضريبة المخرجات (المبيعات) */}
                <div className="vat-card output-card">
                  <div className="vat-icon">🟢</div>
                  <h3>ضريبة المخرجات (المبيعات)</h3>
                  <div className="vat-amount">{formatCurrency(logic.summary.totalOutputVAT)}</div>
                  <div className="vat-base">
                    المبيعات الخاضعة: <span>{formatCurrency(logic.summary.outputBase)}</span>
                  </div>
                </div>

                {/* ضريبة المدخلات (المشتريات) */}
                <div className="vat-card input-card">
                  <div className="vat-icon">🔴</div>
                  <h3>ضريبة المدخلات (المشتريات)</h3>
                  <div className="vat-amount">{formatCurrency(logic.summary.totalInputVAT)}</div>
                  <div className="vat-base">
                    المشتريات الخاضعة: <span>{formatCurrency(logic.summary.inputBase)}</span>
                  </div>
                </div>

                {/* صافي الضريبة */}
                <div className={`vat-card net-card ${logic.summary.netVAT >= 0 ? 'payable' : 'refundable'}`}>
                  <div className="vat-icon">💰</div>
                  <h3>الصافي (Net VAT)</h3>
                  <div className="vat-amount">{formatCurrency(Math.abs(logic.summary.netVAT))}</div>
                  <div className="vat-base status-badge">
                    {logic.summary.netVAT >= 0 ? 'مستحقة لهيئة الزكاة' : 'استرداد ضريبي'}
                  </div>
                </div>

              </div>

              {/* الرسم البياني (Chart) */}
              <div className="vat-card vat-chart-container" style={{ marginTop: '20px', padding: '30px', textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#122946', fontWeight: 900, fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '26px', marginLeft: '12px' }}>📊</span> التحليل البياني للضريبة
              </h3>
              <div style={{ height: '350px', width: '100%', direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'المدخلات (مشتريات)', value: logic.summary.totalInputVAT, fill: 'url(#colorInput)' },
                    { name: 'الصافي', value: Math.abs(logic.summary.netVAT), fill: 'url(#colorNet)' },
                    { name: 'المخرجات (مبيعات)', value: logic.summary.totalOutputVAT, fill: 'url(#colorOutput)' }
                  ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#475569', fontWeight: 900, fontSize: 13 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontWeight: 900, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val.toLocaleString()} />
                    <Tooltip 
                      formatter={(value: any) => [`${formatCurrency(Number(value) || 0)}`, 'قيمة الضريبة']} 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '16px', fontWeight: 900, textAlign: 'right', direction: 'rtl', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '15px' }}
                    />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={60}>
                      {
                        [
                          { name: 'المدخلات (مشتريات)', value: logic.summary.totalInputVAT, fill: 'url(#colorInput)' },
                          { name: 'الصافي', value: Math.abs(logic.summary.netVAT), fill: 'url(#colorNet)' },
                          { name: 'المخرجات (مبيعات)', value: logic.summary.totalOutputVAT, fill: 'url(#colorOutput)' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

            {/* جدول تفاصيل الحركات */}
            <h2 className="section-title" style={{ marginTop: '30px' }}>
              <span>🧾</span> التفاصيل الدقيقة لحركات الضريبة
            </h2>
            <div className="table-glass-container">
              <table className="aqua-table">
                <thead>
                  <tr>
                    <th>تاريخ الحركة</th>
                    <th>نوع الحركة</th>
                    <th style={{ width: '40%' }}>البيان / الوصف</th>
                    <th style={{ textAlign: 'left' }}>المبلغ الأساسي</th>
                    <th style={{ textAlign: 'left' }}>قيمة الضريبة</th>
                  </tr>
                </thead>
                <tbody>
                  {logic.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#ef4444', fontWeight: 900 }}>
                        لا توجد حركات ضريبية في هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    logic.transactions.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 800 }}>{t.date}</td>
                        <td>
                          {t.type === 'output' ? (
                            <span className="badge badge-output">مخرجات (مبيعات)</span>
                          ) : (
                            <span className="badge badge-input">مدخلات (مصروفات)</span>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', color: '#475569', fontWeight: 700 }}>
                          {t.description}
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: 900, color: '#1e293b' }}>
                          {formatCurrency(t.base_amount)}
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: 900, color: t.type === 'output' ? '#10b981' : '#ef4444' }}>
                          {formatCurrency(t.vat_amount)}
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
          .filter-bar { display: flex; gap: 15px; margin-bottom: 25px; background: rgba(255,255,255,0.2); backdrop-filter: blur(15px); padding: 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.3); align-items: center; }
          .filter-group { display: flex; flex-direction: column; gap: 5px; }
          .filter-group label { font-size: 12px; font-weight: 900; color: #475569; }
          .filter-group input { padding: 10px 15px; border-radius: 12px; border: none; outline: none; font-weight: 800; background: rgba(255,255,255,0.7); }
          
          .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
          .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
          .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
          
          .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
          .loading-state { text-align: center; padding: 100px; font-weight: 900; color: #64748b; }
          .loading-state .spinner { font-size: 40px; margin-bottom: 15px; }

          .section-title { color: #122946; font-weight: 900; margin-top: 40px; margin-bottom: 25px; border-bottom: 2px solid rgba(40,145,200,0.15); padding-bottom: 12px; display: flex; align-items: center; font-size: 20px; }
          .section-title span { font-size: 26px; margin-left: 12px; }

          .vat-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .vat-card {
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
          
          .vat-card h3 {
            font-size: 16px;
            color: #475569;
            font-weight: 900;
            margin: 0 0 15px 0;
          }

          .vat-amount {
            font-size: 32px;
            font-weight: 900;
            margin-bottom: 15px;
          }

          .vat-base {
            font-size: 13px;
            color: #64748b;
            font-weight: 800;
            padding-top: 15px;
            border-top: 1px dashed rgba(0,0,0,0.1);
          }
          .vat-base span {
            color: #1e293b;
          }

          .vat-icon {
            position: absolute;
            top: -15px;
            right: -15px;
            font-size: 120px;
            opacity: 0.05;
            transform: rotate(15deg);
          }

          .output-card .vat-amount { color: #10b981; }
          .input-card .vat-amount { color: #ef4444; }
          
          .net-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
            border-width: 2px;
          }
          .net-card.payable { border-color: #f59e0b; }
          .net-card.payable .vat-amount { color: #d97706; }
          .net-card.payable .status-badge { color: #d97706; background: rgba(245, 158, 11, 0.1); padding: 5px 10px; border-radius: 8px; display: inline-block; margin-top: 10px; }

          .net-card.refundable { border-color: #10b981; }
          .net-card.refundable .vat-amount { color: #059669; }
          .net-card.refundable .status-badge { color: #059669; background: rgba(16, 185, 129, 0.1); padding: 5px 10px; border-radius: 8px; display: inline-block; margin-top: 10px; }

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
          .badge-output {
            background: rgba(16, 185, 129, 0.15);
            color: #059669;
          }
          .badge-input {
            background: rgba(239, 68, 68, 0.15);
            color: #b91c1c;
          }

          @media (max-width: 768px) {
            .filter-bar { flex-direction: column !important; align-items: stretch !important; padding: 15px !important; }
            .filter-group { width: 100% !important; justify-content: space-between !important; }
            .filter-group input { flex: 1 !important; }
            .vat-summary-grid { grid-template-columns: 1fr !important; gap: 15px !important; }
            .vat-card { padding: 15px !important; border-radius: 16px !important; }
            .vat-amount { font-size: 24px !important; }
            .vat-chart-container { padding: 15px !important; border-radius: 16px !important; }
            .table-glass-container { border-radius: 16px !important; overflow-x: auto !important; }
            .aqua-table { min-width: 600px !important; }
            .aqua-table th, .aqua-table td { padding: 10px 12px !important; font-size: 12px !important; }
          }

          @media print {
            body { 
                background: white !important; 
                margin: 0 auto !important; 
                padding: 0 !important;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                width: 100% !important;
            }
            .clean-page { 
                width: 100% !important; 
                max-width: 210mm !important; /* A4 Width */
                margin: 0 auto !important; 
                padding: 0 !important;
            }
            
            /* دمج الملخص والرسم البياني في صف واحد لتوفير المساحة */
            .print-top-section {
                display: flex !important;
                flex-direction: row !important;
                align-items: stretch !important;
                gap: 15px !important;
                width: 100% !important;
                margin-bottom: 10px !important;
            }
            
            .vat-summary-grid { 
                display: flex !important; 
                flex-direction: column !important; 
                width: 35% !important; 
                gap: 8px !important; 
                margin-bottom: 0 !important; 
            }
            
            .vat-card { padding: 10px !important; border-radius: 8px !important; box-shadow: none !important; border: 1px solid #ccc !important; text-align: center; }
            .vat-amount { font-size: 16px !important; margin-bottom: 2px !important; }
            .vat-card h3 { font-size: 13px !important; margin-bottom: 2px !important; font-weight: 900; }
            .vat-base { font-size: 10px !important; padding-top: 5px !important; }
            
            /* تصغير وتجهيز الرسم البياني للطباعة بجوار الملخص */
            .vat-chart-container { 
                width: 65% !important; 
                margin-top: 0 !important; 
                padding: 10px !important; 
                border: 1px solid #ccc !important; 
                background: white !important; 
            }
            .vat-chart-container h3 { font-size: 14px !important; margin-bottom: 5px !important; }
            .vat-chart-container > div { height: 200px !important; }
            
            /* تنسيق الجدول والمسافات */
            .section-title { margin-top: 10px !important; margin-bottom: 5px !important; font-size: 14px !important; padding-bottom: 3px !important; text-align: center; justify-content: center; }
            .section-title span { font-size: 16px !important; }
            
            .table-glass-container { padding: 0 !important; background: transparent !important; border: none !important; margin-bottom: 0 !important; width: 100% !important; box-shadow: none !important; }
            .aqua-table { width: 100% !important; }
            .aqua-table th, .aqua-table td { padding: 4px !important; font-size: 10px !important; border: 1px solid #475569 !important; text-align: center !important; }
            .aqua-table th { background: #f1f5f9 !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            
            @page { margin: 0.8cm; size: A4 portrait; }
          }
        `}</style>
      </MasterPage>
    </div>
  );
}
