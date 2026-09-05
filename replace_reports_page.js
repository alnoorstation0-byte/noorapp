const fs = require('fs');

const content = `// app/reports/page.tsx
"use client";
import React from 'react';
import Link from 'next/link';
import { useReportsLogic } from './reports_logic';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';

export default function ReportsPage() {
  const logic = useReportsLogic();

  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <button 
        className="btn-main-glass blue" 
        onClick={logic.handleRefresh}
        disabled={logic.isLoading}
      >
        {logic.isLoading ? '⏳ جاري التحديث...' : '🔄 تحديث البيانات اللحظية'}
      </button>
      <button 
        className="btn-main-glass white" 
        onClick={() => window.print()}
      >
        🖨️ طباعة التقرير
      </button>
    </div>
  );

  return (
    <div className="clean-page">
      <MasterPage icon="📊" 
        title="مركز التقارير المحاسبية والتحليلية" 
        subtitle="لوحة تحكم مالية وإدارية شاملة مع وصول سريع لكافة التقارير"
      >
        <RawasiSidebarManager 
          actions={sidebarActions}
          summary={
            <div className="summary-glass-card">
              <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>نطاق التقرير 📅</span>
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

        {/* 1. الملخص السريع */}
        <h2 className="section-title">
          <span>📊</span> الملخص المالي السريع
        </h2>

        {logic.isLoading ? (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            جاري استدعاء البيانات المالية والتشغيلية...
          </div>
        ) : !logic.reportData ? (
          <div className="empty-state">
            ⚠️ لا توجد بيانات متاحة لهذا النطاق الزمني.
          </div>
        ) : (
          <div className="summary-grid">
            <ReportCard title="إجمالي المصروفات التشغيلية" data={logic.reportData.expenses} icon="💸" color="#ef4444" />
            <ReportCard title="إيرادات (فواتير العملاء)" data={logic.reportData.invoices} icon="🧾" color="#10b981" />
            <ReportCard title="سندات الصرف (المدفوعات)" data={logic.reportData.payment_vouchers} icon="🏦" color="#f59e0b" />
            <ReportCard title="سندات القبض (المتحصلات)" data={logic.reportData.receipt_vouchers} icon="💰" color="#0ea5e9" />
            <ReportCard title="تكلفة العمالة اليومية" data={logic.reportData.labor} icon="👷" color="#8b5cf6" />

            <div className="premium-card module-card">
              <div className="module-header">
                <div className="module-icon purple">👥</div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: 900 }}>شؤون الموظفين (معتمد فقط)</h3>
                <span style={{ fontSize: '24px' }}>👥</span>
              </div>
              <div className="hr-details">
                <div><span className="label">إجمالي السلف:</span><span className="value text-orange">{formatCurrency(logic.reportData.hr.advances)}</span></div>
                <div><span className="label">إجمالي الخصومات:</span><span className="value text-red">{formatCurrency(logic.reportData.hr.deductions)}</span></div>
                <div><span className="label">إجمالي المخالفات:</span><span className="value text-purple">{formatCurrency(logic.reportData.hr.violations)}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* 2. التقارير المحاسبية الأساسية */}
        <h2 className="section-title" style={{ marginTop: '50px' }}>
          <span>📑</span> دليل التقارير المحاسبية الأساسية
        </h2>
        <div className="reports-grid">
          <ReportLinkCard href="/trialbalance" icon="⚖️" title="ميزان المراجعة" desc="مراجعة أرصدة الحسابات ومطابقتها وتوازن القيود" />
          <ReportLinkCard href="/financial-statements" icon="📈" title="القوائم المالية" desc="قائمة الدخل (الأرباح والخسائر) والميزانية العمومية" />
          <ReportLinkCard href="/ledger" icon="📓" title="دفتر الأستاذ العام" desc="متابعة حركة أي حساب مالي بالتفصيل" />
          <ReportLinkCard href="/journal" icon="📝" title="دفتر القيود اليومية" desc="مراجعة كافة القيود الآلية واليدوية المرحّلة" />
          <ReportLinkCard href="/cashflows" icon="🌊" title="التدفقات النقدية" desc="مراقبة حركة السيولة النقدية (الداخلة والخارجة)" />
        </div>

        {/* 3. التقارير الإدارية والتحليلية */}
        <h2 className="section-title" style={{ marginTop: '50px' }}>
          <span>🎯</span> التقارير التحليلية والإدارية (متقدمة)
        </h2>
        <div className="reports-grid">
          <ReportLinkCard href="/statement" icon="🧾" title="كشوف الحسابات" desc="طباعة كشف حساب تفصيلي للعملاء والموردين" />
          <ReportLinkCard href="/PartnerBalances" icon="👥" title="أرصدة الشركاء" desc="تقرير مجمع بأرصدة الموردين والعملاء والموظفين" />
          <ReportLinkCard href="/financialplan" icon="🎯" title="الخطة المالية" desc="مقارنة المستهدف بالفعلي وحساب الانحراف المالي" />
          <ReportLinkCard href="#" icon="⏳" title="أعمار الديون (قريباً)" desc="تحليل وتتبع المديونيات المتأخرة المستحقة" disabled />
          <ReportLinkCard href="#" icon="🏢" title="ربحية الفروع (قريباً)" desc="تحليل مستقل للإيرادات والمصروفات لكل فرع" disabled />
          <ReportLinkCard href="#" icon="📦" title="تقييم المخزون (قريباً)" desc="قيمة البضاعة في المستودعات وحركة الأصناف" disabled />
          <ReportLinkCard href="#" icon="📊" title="تحليل المبيعات (قريباً)" desc="مؤشرات الأداء وأكثر الأصناف مبيعاً للعملاء" disabled />
          <ReportLinkCard href="#" icon="🏛️" title="الإقرار الضريبي (قريباً)" desc="تقرير مفصل بضريبة القيمة المضافة للمدخلات والمخرجات" disabled />
        </div>

        <style>{`
          .filter-bar { display: flex; gap: 15px; margin-bottom: 25px; background: rgba(255,255,255,0.2); backdrop-filter: blur(15px); padding: 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.3); align-items: center; }
          .filter-group { display: flex; flex-direction: column; gap: 5px; }
          .filter-group label { font-size: 12px; font-weight: 900; color: #475569; }
          .filter-group input { padding: 10px 15px; border-radius: 12px; border: none; outline: none; font-weight: 800; background: rgba(255,255,255,0.7); }
          
          .section-title { color: #122946; font-weight: 900; margin-bottom: 25px; border-bottom: 2px solid rgba(40,145,200,0.15); padding-bottom: 12px; display: flex; align-items: center; font-size: 20px; }
          .section-title span { font-size: 26px; margin-left: 12px; }
          
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
          .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
          
          .report-link-card {
            background: rgba(255,255,255,0.7);
            backdrop-filter: blur(15px);
            padding: 24px;
            border-radius: 20px;
            border: 1px solid rgba(40,145,200,0.15);
            text-decoration: none;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
          }
          .report-link-card:not(.disabled):hover {
            transform: translateY(-5px);
            background: rgba(255,255,255,0.95);
            box-shadow: 0 15px 35px rgba(40,145,200,0.15);
            border-color: rgba(40,145,200,0.4);
          }
          .report-link-card.disabled {
            opacity: 0.6;
            cursor: not-allowed;
            filter: grayscale(100%);
          }
          .report-link-icon { font-size: 36px; margin-bottom: 5px; }
          .report-link-title { font-size: 16px; font-weight: 900; color: #122946; margin: 0; }
          .report-link-desc { font-size: 12px; color: #64748b; font-weight: 700; line-height: 1.5; margin: 0; }
          .report-link-arrow { position: absolute; top: 24px; left: 24px; color: #2891C8; font-size: 18px; opacity: 0; transition: 0.3s; transform: translateX(10px); }
          .report-link-card:not(.disabled):hover .report-link-arrow { opacity: 1; transform: translateX(0); }
          
          .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .btn-main-glass.blue { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)); color: white; }
          .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
          .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }
          .summary-glass-card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 25px; }
          
          .loading-state { text-align: center; padding: 100px; font-weight: 900; color: #64748b; }
          .loading-state .spinner { font-size: 40px; margin-bottom: 15px; }
          .empty-state { text-align: center; padding: 50px; color: #ef4444; font-weight: 900; }
          
          .hr-details { display: flex; flex-direction: column; gap: 10px; font-size: 13px; font-weight: 800; }
          .hr-details div { display: flex; justify-content: space-between; }
          .hr-details .label { color: #64748b; }
          .text-orange { color: #f59e0b; }
          .text-red { color: #ef4444; }
          .text-purple { color: #8b5cf6; }
        `}</style>
      </MasterPage>
    </div>
  );
}

// 🃏 مكون فرعي لتوحيد شكل كروت الملخص السريع
function ReportCard({ title, data, icon, color }: { title: string, data: any, icon: string, color: string }) {
  if (!data) return null;

  return (
    <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: \`blur(\${THEME.glass.blur})\`, padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.05, transform: 'rotate(15deg)' }}>{icon}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: 900, zIndex: 2 }}>{title}</h3>
        <span style={{ fontSize: '24px', zIndex: 2 }}>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 900, color: color, margin: '20px 0', zIndex: 2, position: 'relative' }}>
        {formatCurrency(data.total)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '15px', zIndex: 2, position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#475569', fontSize: '10px' }}>معتمد ومرحل</span>
          <span style={{ color: '#059669', fontWeight: 900 }}>{formatCurrency(data.posted)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <span style={{ color: '#475569', fontSize: '10px' }}>معلق / مسودة</span>
          <span style={{ color: '#d97706', fontWeight: 900 }}>{formatCurrency(data.pending)}</span>
        </div>
      </div>
    </div>
  );
}

// 🔗 مكون فرعي لكروت روابط التقارير
function ReportLinkCard({ title, desc, icon, href, disabled }: { title: string, desc: string, icon: string, href: string, disabled?: boolean }) {
  const content = (
    <>
      <div className="report-link-icon">{icon}</div>
      <h3 className="report-link-title">{title}</h3>
      <p className="report-link-desc">{desc}</p>
      {!disabled && <div className="report-link-arrow">←</div>}
    </>
  );
  
  if (disabled) {
    return (
      <div className="report-link-card disabled">
        {content}
      </div>
    );
  }
  
  return (
    <Link href={href} className="report-link-card">
      {content}
    </Link>
  );
}
`;
fs.writeFileSync('D:\\waterapp\\app\\reports\\page.tsx', content, 'utf8');
