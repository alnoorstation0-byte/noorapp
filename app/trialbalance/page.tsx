"use client";
import React, { useMemo } from 'react';
import { useTrialBalanceLogic } from './trial_balance_logic';
import MasterPage from '@/components/MasterPage';
import LoadingScreen from '@/components/LoadingScreen';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { formatCurrency } from '@/lib/helpers';

const THEME = {
  primary: '#00E5FF',    
  accent: '#F59E0B',     
  success: '#10B981',    // اللون الأخضر للمدين
  ruby: '#EF4444',       // اللون الأحمر للدائن
  slate: 'rgba(20, 24, 34, 0.85)',
  border: 'rgba(0, 229, 255, 0.2)',
  textMain: '#F8FAFC',   
  textMuted: '#94A3B8'
};

export default function TrialBalancePage() {
  const logic = useTrialBalanceLogic();

  // 🚀 الحل السحري لمشكلة الجافاسكريبت: نتجاهل الكسور الوهمية اللي أقل من هللة/قرش
  const isBalanced = Math.abs((logic.totals.end_debit || 0) - (logic.totals.end_credit || 0)) < 0.01;

  const sidebarActions = useMemo(() => [
    <button 
      key="print_tb"
      onClick={() => window.print()}
      style={{ padding: '12px', borderRadius: '12px', border: `1px solid rgba(255, 255, 255, 0.15)`, background: 'rgba(255, 255, 255, 0.05)', color: '#F8FAFC', fontWeight: '900', cursor: 'pointer', width: '100%', marginBottom: '10px', transition: '0.2s' }}
    >
      🖨️ طباعة الميزان الرسمي
    </button>,

    <button 
      key="export_excel"
      onClick={logic.exportToExcel}
      style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#07090D', fontWeight: '900', cursor: 'pointer', width: '100%', boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}
    >
      📊 تصدير Excel
    </button>
  ], [logic.exportToExcel]);

  return (
    <MasterPage icon="⚖️" 
      title="ميزان المراجعة (Trial Balance)" 
      description="عرض الأرصدة الافتتاحية، حركات الفترة، والأرصدة الختامية لجميع الحسابات"
    >
      <style>{`
        /* تنسيقات الشاشة الأساسية */
        .tb-table { width: 100%; border-collapse: collapse; text-align: center; background: rgba(20, 24, 34, 0.95); }
        .tb-table th, .tb-table td { border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 10px; font-size: 13.5px; }
        
        .tb-table thead th { color: #00E5FF !important; font-weight: 900; }
        .tb-table tbody td { color: #F8FAFC; } 
        .tb-table tbody tr:hover { background-color: rgba(0, 229, 255, 0.05); }
        .tb-table tbody td.text-right { text-align: right; font-weight: 800; }
        .tb-table tbody td.number { font-family: monospace; font-size: 13px; font-weight: 900; }
        
        .tb-totals { font-weight: 900 !important; }
        .tb-totals td { border-top: 2px solid rgba(0, 229, 255, 0.4) !important; font-size: 15px; }

        @media (max-width: 768px) {
          .tb-container { flex-direction: column !important; gap: 12px !important; }
          .tb-filter-bar { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; padding: 12px !important; }
          .tb-date-group { width: 100% !important; justify-content: space-between !important; }
          .tb-date-group input { flex: 1 !important; }
          .tb-table th, .tb-table td { padding: 6px 4px !important; font-size: 11px !important; }
          .tb-table { min-width: 650px !important; }
        }

        /* تنسيقات الطباعة المعزولة */
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; width: 100%; direction: rtl; font-family: 'Cairo', sans-serif; }
          .print-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; text-align: center; background: #ffffff; }
          .print-table th, .print-table td { border: 1px solid #475569; padding: 6px 4px; }
          .print-table thead th { background-color: rgba(40, 145, 200, 0.15) !important; font-weight: 900; color: #000000 !important; }
          .print-table tr:nth-child(even) { background-color: rgba(255, 255, 255, 0.6) !important; }
          .print-table td.number { font-family: monospace; font-weight: 900; }
          .print-table td.text-right { text-align: right; font-weight: 900; color: #000000; }
          .print-totals { font-weight: 900 !important; background-color: rgba(40, 145, 200, 0.2) !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>

      <div style={{ display: 'flex', gap: '20px' }} className="no-print tb-container">
        
        {/* منطقة المحتوى الرئيسي */}
        <div style={{ flex: 1, overflowX: 'auto', width: '100%' }}>
          
          {/* لوحة الفلاتر */}
          <div className="tb-filter-bar" style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(20, 24, 34, 0.85)', backdropFilter: 'blur(20px)', padding: '16px 20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900, color: '#00E5FF', fontSize: '15px', minWidth: '100px' }}>📅 فترة الميزان:</div>
            
            <div className="tb-date-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(11, 14, 20, 0.8)', border: '1px solid rgba(0, 229, 255, 0.25)', padding: '6px 14px', borderRadius: '10px' }}>
              <label style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 800 }}>من:</label>
              <input 
                type="date" 
                value={logic.startDate} 
                onChange={e => logic.setStartDate(e.target.value)} 
                style={{ padding: '4px 6px', borderRadius: '6px', border: 'none', fontWeight: 800, outline: 'none', color: '#F8FAFC', backgroundColor: 'transparent' }} 
              />
            </div>
            
            <div className="tb-date-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(11, 14, 20, 0.8)', border: '1px solid rgba(0, 229, 255, 0.25)', padding: '6px 14px', borderRadius: '10px' }}>
              <label style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 800 }}>إلى:</label>
              <input 
                type="date" 
                value={logic.endDate} 
                onChange={e => logic.setEndDate(e.target.value)} 
                style={{ padding: '4px 6px', borderRadius: '6px', border: 'none', fontWeight: 800, outline: 'none', color: '#F8FAFC', backgroundColor: 'transparent' }} 
              />
            </div>
          </div>

          {/* الجدول والشاشة */}
          {logic.isLoading ? (
            <LoadingScreen message="جاري إعداد ميزان المراجعة وتجميع القيود..." fullScreen={false} />
          ) : (
            <>
              <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', background: 'rgba(20, 24, 34, 0.95)' }}>
                <table className="tb-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ width: '10%', background: 'rgba(0, 229, 255, 0.12)', color: '#00E5FF' }}>رقم الحساب</th>
                      <th rowSpan={2} style={{ width: '30%', background: 'rgba(0, 229, 255, 0.12)', color: '#00E5FF' }}>اسم الحساب</th>
                      <th colSpan={2} style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#F8FAFC' }}>الرصيد الافتتاحي</th>
                      <th colSpan={2} style={{ background: 'rgba(0, 229, 255, 0.08)', color: '#00E5FF' }}>حركة الفترة</th>
                      <th colSpan={2} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>الرصيد الختامي</th>
                    </tr>
                    <tr>
                      <th style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10B981' }}>مدين</th>
                      <th style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444' }}>دائن</th>
                      <th style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10B981' }}>مدين</th>
                      <th style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444' }}>دائن</th>
                      <th style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>مدين</th>
                      <th style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>دائن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logic.records.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent' }}>
                        <td className="number" style={{ color: '#00E5FF' }}>{r.account_code}</td>
                        <td className="text-right" style={{ color: '#F8FAFC' }}>{r.account_name}</td>
                        
                        <td className="number" style={{ color: r.opening_debit > 0 ? '#10B981' : '#64748B' }}>{r.opening_debit > 0 ? formatCurrency(r.opening_debit) : '-'}</td>
                        <td className="number" style={{ color: r.opening_credit > 0 ? '#EF4444' : '#64748B' }}>{r.opening_credit > 0 ? formatCurrency(r.opening_credit) : '-'}</td>
                        
                        <td className="number" style={{ color: r.period_debit > 0 ? '#10B981' : '#64748B' }}>{r.period_debit > 0 ? formatCurrency(r.period_debit) : '-'}</td>
                        <td className="number" style={{ color: r.period_credit > 0 ? '#EF4444' : '#64748B' }}>{r.period_credit > 0 ? formatCurrency(r.period_credit) : '-'}</td>
                        
                        <td className="number" style={{ color: r.ending_debit > 0 ? '#10B981' : '#64748B' }}>{r.ending_debit > 0 ? formatCurrency(r.ending_debit) : '-'}</td>
                        <td className="number" style={{ color: r.ending_credit > 0 ? '#EF4444' : '#64748B' }}>{r.ending_credit > 0 ? formatCurrency(r.ending_credit) : '-'}</td>
                      </tr>
                    ))}
                    
                    {/* صف الإجماليات */}
                    <tr className="tb-totals" style={{ backgroundColor: isBalanced ? 'rgba(0, 229, 255, 0.12)' : 'rgba(239, 68, 68, 0.2)' }}>
                      <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '20px', color: '#00E5FF', fontWeight: 900 }}>الإجمـــالي الكـــلي:</td>
                      <td className="number" style={{ color: '#10B981', fontWeight: 900 }}>{formatCurrency(logic.totals.op_debit)}</td>
                      <td className="number" style={{ color: '#EF4444', fontWeight: 900 }}>{formatCurrency(logic.totals.op_credit)}</td>
                      <td className="number" style={{ color: '#10B981', fontWeight: 900 }}>{formatCurrency(logic.totals.per_debit)}</td>
                      <td className="number" style={{ color: '#EF4444', fontWeight: 900 }}>{formatCurrency(logic.totals.per_credit)}</td>
                      <td className="number" style={{ color: '#10B981', fontWeight: 900 }}>{formatCurrency(logic.totals.end_debit)}</td>
                      <td className="number" style={{ color: '#EF4444', fontWeight: 900 }}>{formatCurrency(logic.totals.end_credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* مؤشر اتزان الميزان */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1, padding: '16px 20px', borderRadius: '14px', background: isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: `1px solid ${isBalanced ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                    <span style={{ color: isBalanced ? '#10B981' : '#EF4444', fontSize: '15px' }}>
                      {isBalanced ? '✅ الميزان متزن تماماً (لا توجد فروق محاسبية)' : '❌ يوجد فرق في الميزان! يرجى مراجعة قيود اليومية.'}
                    </span>
                    {!isBalanced && (
                      <span style={{ color: '#EF4444', fontSize: '16px' }}>قيمة الفرق: {formatCurrency(Math.abs(logic.totals.end_debit - logic.totals.end_credit))}</span>
                    )}
                  </div>
              </div>
            </>
          )}
        </div>

        <RawasiSidebarManager actions={sidebarActions} />
      </div>

      {/* مساحة الطباعة */}
      <div className="print-area" style={{ display: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `4px solid ${THEME.primary}`, paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
                
                <p style={{ margin: '8px 0 0 0', fontWeight: 700, fontSize: '14px', color: '#000000' }}>محطات النور للوقود</p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 900, fontSize: '13px', color: '#000000' }}>عن الفترة من {logic.startDate} إلى {logic.endDate}</p>
            </div>
            <img src="/logo.png" alt="Company Logo" style={{ height: '50px', objectFit: 'contain' }} />
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: '10%', background: 'rgba(40, 145, 200, 0.15)' }}>رقم الحساب</th>
                <th rowSpan={2} style={{ width: '30%', background: 'rgba(40, 145, 200, 0.15)' }}>اسم الحساب</th>
                <th colSpan={2} style={{ background: 'rgba(255, 255, 255, 0.4)' }}>الرصيد الافتتاحي</th>
                <th colSpan={2} style={{ background: 'rgba(40, 145, 200, 0.15)' }}>حركة الفترة</th>
                <th colSpan={2} style={{ background: 'rgba(40, 145, 200, 0.2)' }}>الرصيد الختامي</th>
              </tr>
              <tr>
                <th style={{ background: 'rgba(255, 255, 255, 0.6)', color: THEME.success }}>مدين</th>
                <th style={{ background: 'rgba(255, 255, 255, 0.6)', color: THEME.ruby }}>دائن</th>
                <th style={{ background: 'rgba(255, 255, 255, 0.4)', color: THEME.success }}>مدين</th>
                <th style={{ background: 'rgba(255, 255, 255, 0.4)', color: THEME.ruby }}>دائن</th>
                <th style={{ background: 'rgba(40, 145, 200, 0.15)', color: THEME.success }}>مدين</th>
                <th style={{ background: 'rgba(40, 145, 200, 0.15)', color: THEME.ruby }}>دائن</th>
              </tr>
            </thead>
            <tbody>
              {logic.records.map((r, i) => (
                <tr key={i}>
                  <td className="number">{r.account_code}</td>
                  <td className="text-right">{r.account_name}</td>
                  
                  <td className="number" style={{ color: r.opening_debit > 0 ? THEME.success : '#475569' }}>{r.opening_debit > 0 ? formatCurrency(r.opening_debit) : '-'}</td>
                  <td className="number" style={{ color: r.opening_credit > 0 ? THEME.ruby : '#475569' }}>{r.opening_credit > 0 ? formatCurrency(r.opening_credit) : '-'}</td>
                  
                  <td className="number" style={{ color: r.period_debit > 0 ? THEME.success : '#475569' }}>{r.period_debit > 0 ? formatCurrency(r.period_debit) : '-'}</td>
                  <td className="number" style={{ color: r.period_credit > 0 ? THEME.ruby : '#475569' }}>{r.period_credit > 0 ? formatCurrency(r.period_credit) : '-'}</td>
                  
                  <td className="number" style={{ color: r.ending_debit > 0 ? THEME.success : '#475569' }}>{r.ending_debit > 0 ? formatCurrency(r.ending_debit) : '-'}</td>
                  <td className="number" style={{ color: r.ending_credit > 0 ? THEME.ruby : '#475569' }}>{r.ending_credit > 0 ? formatCurrency(r.ending_credit) : '-'}</td>
                </tr>
              ))}
              <tr className="print-totals" style={{ backgroundColor: isBalanced ? 'rgba(40, 145, 200, 0.2)' : '#fecaca' }}>
                <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '20px', color: '#000000' }}>الإجمـــالي الكـــلي:</td>
                <td className="number" style={{ color: THEME.success }}>{formatCurrency(logic.totals.op_debit)}</td>
                <td className="number" style={{ color: THEME.ruby }}>{formatCurrency(logic.totals.op_credit)}</td>
                <td className="number" style={{ color: THEME.success }}>{formatCurrency(logic.totals.per_debit)}</td>
                <td className="number" style={{ color: THEME.ruby }}>{formatCurrency(logic.totals.per_credit)}</td>
                <td className="number" style={{ color: THEME.success }}>{formatCurrency(logic.totals.end_debit)}</td>
                <td className="number" style={{ color: THEME.ruby }}>{formatCurrency(logic.totals.end_credit)}</td>
              </tr>
            </tbody>
          </table>

          {/* توقيعات الطباعة */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', fontSize: '14px', fontWeight: 900, padding: '0 40px', color: '#000000' }}>
              <div style={{textAlign: 'center', width: '200px'}}>أعده / المحاسب المالي<br/><br/><hr style={{borderTop: '2px dashed #000000', margin: '30px 0 10px 0'}}/>الاسم والتوقيع</div>
              <div style={{textAlign: 'center', width: '200px'}}>اعتمده / المدير المالي<br/><br/><hr style={{borderTop: '2px dashed #000000', margin: '30px 0 10px 0'}}/>الاسم والتوقيع</div>
              <div style={{textAlign: 'center', width: '200px'}}>المدير العام<br/><br/><hr style={{borderTop: '2px dashed #000000', margin: '30px 0 10px 0'}}/>الاسم والتوقيع</div>
          </div>
      </div>

    </MasterPage>
  );
}
