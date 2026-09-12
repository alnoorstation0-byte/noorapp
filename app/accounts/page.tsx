"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useHierarchicalAccountsLogic } from './accounts_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction'; 
import LoadingScreen from '@/components/LoadingScreen';
import AccountModal from './AccountModal';

export default function HierarchicalLedgerPage() {
  const { 
    paginatedTree, totalPages, currentPage, setCurrentPage,
    allAccounts,
    isLoading, isDeleting, searchTerm, setSearchTerm, expandedIds, toggleExpand, expandAll, collapseAll, 
    selectedIds, toggleSelection, handleDelete, handleAdd, handleEdit, handleSave,
    startDate, setStartDate, endDate, setEndDate,
    isModalOpen, setIsModalOpen, currentRecord, setCurrentRecord,
    exportToExcel // 🚀 جلب دالة تصدير الإكسل من اللوجيك
  } = useHierarchicalAccountsLogic();

  const [mounted, setMounted] = useState(false);
  const { can, loading: permsLoading } = usePermissions();

  useEffect(() => { setMounted(true); }, []);

  // 🚀 اختصار إضافة جديد (Alt + N)
  useEffect(() => {
    const handleAddShortcut = (e: KeyboardEvent) => {
      if (e.altKey && (e.code === 'KeyN' || e.key.toLowerCase() === 'n' || e.key === 'ى')) {
        e.preventDefault();
        handleAdd();
      }
    };
    window.addEventListener('keydown', handleAddShortcut);
    return () => window.removeEventListener('keydown', handleAddShortcut);
  }, [handleAdd]);


  // 🧮 السامري المحاسبي الدقيق (ميزان المراجعة) محمي ضد الكسور العائمة
  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    paginatedTree.forEach((node: any) => {
      totalDebit += Number(node.totalDebit) || 0;
      totalCredit += Number(node.totalCredit) || 0;
    });

    // 🚀 تطبيق الحماية هنا: تقريب لأقرب رقمين عشريين لمنع أي كسور لانهائية
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;
    const roundedBalance = Math.round(Math.abs(roundedDebit - roundedCredit) * 100) / 100;

    return {
      debit: roundedDebit,
      credit: roundedCredit,
      balance: roundedBalance,
      isDebitBalance: roundedDebit >= roundedCredit
    };
  }, [paginatedTree]);

  // 🚀 تجهيز أزرار السايد بار (وإضافة زر الإكسل)
  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="accounts" action="create">
        <button className="btn-premium-gold" onClick={handleAdd}>
            ➕ إضافة حساب جديد
        </button>
      </SecureAction>
      
      {selectedIds.length > 0 && (
        <>
          <p style={{fontSize:'10px', textAlign:'center', color:'#475569', fontWeight:900, marginBottom:'-5px'}}>إجراءات على ({selectedIds.length})</p>
          <SecureAction module="accounts" action="edit">
            <button className="btn-main-glass blue" onClick={() => handleEdit(selectedIds)} disabled={selectedIds.length !== 1 || isDeleting}>✏️ تعديل الحساب</button>
          </SecureAction>
          <SecureAction module="accounts" action="delete">
            <button className="btn-main-glass red" onClick={() => handleDelete(selectedIds)} disabled={isDeleting}>
              {isDeleting ? '⏳ جاري الحذف...' : '🗑️ حذف الحساب'}
            </button>
          </SecureAction>
        </>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
         <button type="button" className="btn-main-glass white" style={{flex: 1}} onClick={expandAll}>🔽 فتح الكل</button>
         <button type="button" className="btn-main-glass white" style={{flex: 1}} onClick={collapseAll}>🔼 طي الكل</button>
      </div>

      {/* 📊 زر الإكسل الاحترافي */}
      <button 
        className="btn-main-glass" 
        onClick={exportToExcel}
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}
      >
        📊 تصدير إكسل
      </button>

      {/* 🖨️ زر الطباعة الاحترافي المطور */}
      <button className="btn-main-glass white" onClick={() => {
          const printWindow = window.open('', '_blank');
          if(printWindow) {
              // دالة تكرارية لرسم الشجرة في الطباعة
              const generatePrintRows = (nodes: any[], depth = 0): string => {
                  return nodes.map(n => {
                      const indent = depth * 20;
                      const isRoot = depth === 0;
                      let rowHtml = `
                          <tr style="${isRoot ? 'background: rgba(255, 255, 255, 0.6); font-weight: bold;' : ''}">
                              <td>${n.code || ''}</td>
                              <td style="padding-right: ${indent + 10}px;">${isRoot ? '📁' : '📄'} ${n.name}</td>
                              <td class="text-center text-success">${formatCurrency(n.totalDebit)}</td>
                              <td class="text-center text-danger">${formatCurrency(n.totalCredit)}</td>
                              <td class="text-center" style="font-weight: bold;">${formatCurrency(n.balance)}</td>
                          </tr>
                      `;
                      if (n.children && n.children.length > 0) {
                          rowHtml += generatePrintRows(n.children, depth + 1);
                      }
                      return rowHtml;
                  }).join('');
              };

              printWindow.document.write(`
                  <html dir="rtl">
                  <head>
                      <title>ميزان المراجعة</title>
                      <style>
                          body { font-family: 'Arial', sans-serif; padding: 20px; direction: rtl; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
                          th { background-color: rgba(255, 255, 255, 0.4); color: #1e293b; font-weight: bold; }
                          .text-center { text-align: center; }
                          .text-success { color: #16a34a; }
                          .text-danger { color: #dc2626; }
                      </style>
                  </head>
                  <body>
                      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 15px;">
                          <h2>ميزان المراجعة الشجري</h2>
                          <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
                          ${startDate ? `<p>من: ${startDate} | إلى: ${endDate}</p>` : ''}
                      </div>
                      <table>
                          <thead>
                              <tr>
                                  <th style="width: 15%;">كود الحساب</th>
                                  <th style="width: 40%;">اسم الحساب</th>
                                  <th class="text-center">إجمالي مدين</th>
                                  <th class="text-center">إجمالي دائن</th>
                                  <th class="text-center">الرصيد</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${generatePrintRows(paginatedTree)}
                          </tbody>
                      </table>
                  </body>
                  </html>
              `);
              printWindow.document.close();
              setTimeout(() => { printWindow.print(); }, 250); // تأخير بسيط لضمان تحميل الـ CSS
          }
      }}>🖨️ طباعة الميزان</button>
    </div>
  );

  return (
    <MasterPage title="شجرة الحسابات والميزان" subtitle="إدارة المركز المالي ودليل الحسابات - مياه غيام">
      
      <div className="floating-stack-layout">
        <div className="warm-depth-glow" />

        <div className="content-container">
          <RawasiSidebarManager 
            summary={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="summary-glass-card">
                      <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي المدين 📈</span>
                      <div style={{fontSize:'18px', fontWeight:900, color: THEME.success}}>{formatCurrency(summary.debit)}</div>
                  </div>
                  <div className="summary-glass-card">
                      <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الدائن 📉</span>
                      <div style={{fontSize:'18px', fontWeight:900, color: THEME.danger}}>{formatCurrency(summary.credit)}</div>
                  </div>
                  <div className="summary-glass-card" style={{ background: summary.balance === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderColor: summary.balance === 0 ? THEME.success : THEME.warning }}>
                      <span style={{fontSize:'12px', fontWeight:800, color: summary.balance === 0 ? THEME.success : THEME.warning}}>الرصيد / الفارق ⚖️</span>
                      <div style={{fontSize:'22px', fontWeight:900, color: 'white'}}>
                        {formatCurrency(summary.balance)}
                      </div>
                      <div style={{fontSize:'10px', marginTop: '4px', color: '#475569'}}>{summary.balance !== 0 && (summary.isDebitBalance ? '(رصيد مدين)' : '(رصيد دائن)')}</div>
                  </div>
              </div>
            }
            actions={sidebarActions}
            customFilters={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                  <div>
                     <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>🔍 بحث في الدليل:</label>
                     <input type="text" placeholder="الاسم، الكود..." className="glass-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>

                  <div>
                      <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>📅 من تاريخ:</label>
                      <input type="date" className="glass-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                      <label style={{color: 'white', fontSize: '12px', fontWeight: 900, display: 'block', marginBottom: '8px'}}>📅 إلى تاريخ:</label>
                      <input type="date" className="glass-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
              </div>
            }
            watchDeps={[selectedIds, summary.balance, searchTerm, startDate, endDate, allAccounts, expandedIds]}
          />

          {/* 📱 شريط الملخص المالي السريع للجوال (يظهر فقط على الشاشات الصغيرة) */}
          <div className="mobile-summary-strip">
            <div className="mobile-summary-card debit">
              <span className="mobile-summary-label">إجمالي المدين 📈</span>
              <span className="mobile-summary-val text-success">{formatCurrency(summary.debit)}</span>
            </div>
            <div className="mobile-summary-card credit">
              <span className="mobile-summary-label">إجمالي الدائن 📉</span>
              <span className="mobile-summary-val text-danger">{formatCurrency(summary.credit)}</span>
            </div>
            <div className="mobile-summary-card balance">
              <span className="mobile-summary-label">الرصيد / الفارق ⚖️</span>
              <span className="mobile-summary-val">{formatCurrency(summary.balance)}</span>
            </div>
          </div>

          <div className="glass-master-card no-print">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ margin: 0, fontWeight: 900, color: THEME.primary, fontSize: '18px' }}>الدليل المحاسبي وميزان المراجعة</h4>
                <div className="desktop-quick-count" style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>
                  ({paginatedTree?.length || 0} حساب رئيسي)
                </div>
              </div>

              {/* 📱 شريط الأدوات السريع للجوال */}
              <div className="mobile-accounts-toolbar">
                <div className="mobile-search-bar">
                  <span className="mobile-search-icon">🔍</span>
                  <input 
                    type="text" 
                    placeholder="بحث في شجرة الحسابات (الاسم، الكود)..." 
                    className="mobile-search-input" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  {searchTerm && (
                    <button 
                      type="button"
                      onClick={() => setSearchTerm('')} 
                      className="mobile-search-clear"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="mobile-btn-group">
                  <SecureAction module="accounts" action="create">
                    <button type="button" className="mobile-action-pill primary" onClick={handleAdd}>
                      ➕ حساب جديد
                    </button>
                  </SecureAction>
                  <button type="button" className="mobile-action-pill" onClick={expandAll}>
                    🔽 فتح الكل
                  </button>
                  <button type="button" className="mobile-action-pill" onClick={collapseAll}>
                    🔼 طي الكل
                  </button>

                  {selectedIds.length > 0 && (
                    <>
                      <SecureAction module="accounts" action="edit">
                        <button 
                          type="button"
                          className="mobile-action-pill edit-btn" 
                          onClick={() => handleEdit(selectedIds)} 
                          disabled={selectedIds.length !== 1 || isDeleting}
                        >
                          ✏️ تعديل
                        </button>
                      </SecureAction>
                      <SecureAction module="accounts" action="delete">
                        <button 
                          type="button"
                          className="mobile-action-pill delete-btn" 
                          onClick={() => handleDelete(selectedIds)} 
                          disabled={isDeleting}
                        >
                          {isDeleting ? '⏳ حذف...' : `🗑️ حذف (${selectedIds.length})`}
                        </button>
                      </SecureAction>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="table-inner-scroll cinematic-scroll">
              
              <div className="table-header">
                 <div></div>
                 <div>اسم الحساب / الكود</div>
                 <div>التصنيف</div>
                 <div style={{textAlign: 'center'}}>إجمالي مدين</div>
                 <div style={{textAlign: 'center'}}>إجمالي دائن</div>
                 <div style={{textAlign: 'center'}}>الرصيد النهائي</div>
              </div>

              {(isLoading || permsLoading) ? (
                <LoadingScreen message="جاري معالجة البيانات المالية وبناء الشجرة..." fullScreen={false} />
              ) : (
                paginatedTree.map((node: any) => (
                  <AccountNode 
                    key={node.id} node={node} expandedIds={expandedIds} toggleExpand={toggleExpand} 
                    selectedIds={selectedIds} toggleSelection={toggleSelection} depth={1} 
                  />
                ))
              )}

            </div>
          </div>
        </div>
      </div>
      
      <AccountModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          record={currentRecord}
          setRecord={setCurrentRecord}
          onSave={handleSave}
          allAccounts={allAccounts || []}
      />

      <style>{`
        .floating-stack-layout { position: relative; width: 100%; padding: 0 20px 20px 20px; z-index: 5; direction: rtl; box-sizing: border-box; }
        .warm-depth-glow { position: absolute; inset: 0; background: radial-gradient(circle at 20% 30%, rgba(40, 145, 200, 0.15) 0%, transparent 70%); z-index: -1; pointer-events: none; }
        .content-container { max-width: 1600px; margin: 0 auto; width: 100%; box-sizing: border-box; }

        .glass-master-card {
          background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
          border-radius: 30px; border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.08); overflow: hidden;
          margin-top: 20px; animation: cardFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-header { padding: 22px 30px; background: rgba(255, 255, 255, 0.3); border-bottom: 1px solid rgba(0,0,0,0.03); }

        .table-inner-scroll { padding: 20px; overflow-x: auto; -webkit-overflow-scrolling: touch; }

        .summary-glass-card { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 15px; border-radius: 16px; text-align: center; transition: 0.3s; }
        .glass-input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; font-weight: 800; outline: none; transition: 0.3s; color-scheme: dark; box-sizing: border-box; }
        .glass-input:focus { background: rgba(255,255,255,0.2); border-color: ${THEME.goldAccent}; }

        .btn-premium-gold { width: 100%; padding: 16px; border-radius: 16px; background: linear-gradient(135deg, #2891C8, #17A2D4); color: white; font-weight: 900; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(40, 145, 200, 0.3); transition: 0.3s; min-height: 44px; }
        .btn-premium-gold:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(40, 145, 200, 0.4); filter: brightness(1.1); }

        .btn-main-glass { width: 100%; padding: 12px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; min-height: 44px; }
        .btn-main-glass.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .btn-main-glass.blue:hover:not(:disabled) { background: #3b82f6; color: white; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass.red:hover:not(:disabled) { background: #ef4444; color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); }
        .btn-main-glass.white:hover:not(:disabled) { background: white; color: #1e293b; }
        .btn-main-glass:disabled { opacity: 0.5; cursor: not-allowed; }

        /* 🖥️ Desktop Header & Rows */
        .table-header {
          display: grid; grid-template-columns: 40px 2.5fr 1fr 1fr 1fr 1.2fr; 
          padding: 15px 20px; font-weight: 900; color: #64748b; font-size: 13px;
          background: rgba(0,0,0,0.02); border-radius: 16px; margin-bottom: 15px; border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .account-node-wrapper {
          margin-right: calc(var(--node-depth, 0) * 28px);
          position: relative;
          transition: margin-right 0.2s ease;
        }

        .acc-row { 
          border-radius: 16px; margin-bottom: 8px; 
          display: grid; grid-template-columns: 40px 2.5fr 1fr 1fr 1fr 1.2fr; 
          align-items: center; padding: 14px 20px; cursor: pointer; 
          border: 1px solid rgba(255, 255, 255, 0.4); transition: 0.2s; box-shadow: 0 2px 10px rgba(0,0,0,0.01);
          box-sizing: border-box;
        }
        .acc-row.root-node {
          background: rgba(15, 23, 42, 0.03); 
          border: 1px solid rgba(15, 23, 42, 0.1);
        }
        .acc-row.child-node {
          background: white;
        }

        .acc-row:hover { border-color: ${THEME.goldAccent}; transform: translateY(-1px); box-shadow: 0 5px 15px rgba(40, 145, 200, 0.1); }
        .acc-row.selected { background: rgba(40, 145, 200, 0.05); border-color: ${THEME.goldAccent}; }

        .acc-row-main-block { display: contents; }
        .acc-row-stats-block { display: contents; }
        .acc-stat-label { display: none; }
        .acc-expand-arrow { display: none; }

        .acc-name-info {
          display: flex; align-items: center; gap: 8px; min-width: 0;
        }
        .acc-name-text {
          font-weight: 700; color: ${THEME.primary};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .acc-code-badge {
          font-size: 11px; color: #475569; font-weight: 800; font-family: monospace;
          background: rgba(0,0,0,0.04); padding: 2px 6px; border-radius: 6px;
        }

        .acc-type-pill {
          display: flex; align-items: center; gap: 6px;
        }
        .acc-type-tag {
          font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 8px;
        }
        .acc-type-tag.trans { color: #64748b; background: rgba(100, 116, 139, 0.08); }
        .acc-type-tag.summary { color: ${THEME.goldAccent}; background: rgba(40, 145, 200, 0.1); }

        .acc-stat-box { text-align: center; }
        .acc-stat-box.debit .acc-stat-val { color: ${THEME.success}; font-weight: 700; font-family: monospace; font-size: 14px; }
        .acc-stat-box.credit .acc-stat-val { color: ${THEME.danger}; font-weight: 700; font-family: monospace; font-size: 14px; }
        .acc-stat-box.balance .acc-stat-val {
          font-weight: 900; color: ${THEME.primary}; font-family: monospace; font-size: 14px;
          background: rgba(255, 255, 255, 0.5); padding: 4px 8px; border-radius: 8px; display: inline-block;
        }
        .acc-stat-box.root-balance .acc-stat-val {
          color: white; background: ${THEME.primary};
        }

        /* 📜 Entry lines (Transactions) on Desktop */
        .entry-line { 
          background: rgba(255, 255, 255, 0.6); margin: 4px 20px 8px 60px; padding: 12px 20px; 
          border-radius: 12px; border-right: 3px solid ${THEME.goldAccent}; display: grid; 
          grid-template-columns: 120px 2fr 120px 120px; gap: 15px; font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .entry-line-top { display: contents; }
        .entry-line-date { font-weight: 800; color: ${THEME.goldAccent}; }
        .entry-line-desc { color: ${THEME.primary}; font-weight: 700; }
        .entry-line-values { display: contents; }
        .entry-stat-chip { text-align: center; font-weight: 800; font-family: monospace; }
        .entry-stat-chip.text-success { color: ${THEME.success}; }
        .entry-stat-chip.text-danger { color: ${THEME.danger}; }
        .entry-stat-label { display: none; }

        .mobile-summary-strip { display: none; }
        .mobile-accounts-toolbar { display: none; }

        .custom-checkbox { width: 18px; height: 18px; accent-color: ${THEME.goldAccent}; cursor: pointer; }
        .cinematic-scroll::-webkit-scrollbar { width: 6px; }
        .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
        .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

        @keyframes cardFadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }

        /* =======================================================
           📱 MOBILE RESPONSIVENESS (Screens <= 768px)
           ======================================================= */
        @media (max-width: 768px) {
          .floating-stack-layout {
            padding: 0 6px 16px 6px !important;
          }

          .glass-master-card {
            border-radius: 20px !important;
            margin-top: 10px !important;
          }

          .card-header {
            padding: 14px 12px !important;
          }

          .desktop-quick-count {
            display: none !important;
          }

          .table-inner-scroll {
            padding: 8px 4px !important;
          }

          /* 1. Hide the fixed desktop grid header */
          .table-header {
            display: none !important;
          }

          /* 2. Mobile Quick Summary Strip at top */
          .mobile-summary-strip {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1.15fr !important;
            gap: 6px !important;
            margin-bottom: 10px !important;
            padding: 0 2px !important;
          }
          .mobile-summary-card {
            background: rgba(255, 255, 255, 0.8) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important;
            border-radius: 14px !important;
            padding: 8px 6px !important;
            text-align: center !important;
            box-shadow: 0 4px 12px rgba(28, 115, 171, 0.05) !important;
          }
          .mobile-summary-label {
            display: block !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            color: #64748b !important;
            margin-bottom: 2px !important;
            white-space: nowrap !important;
          }
          .mobile-summary-val {
            font-size: 12px !important;
            font-weight: 900 !important;
            font-family: monospace !important;
            display: block !important;
          }

          /* 3. Mobile Search & Action Toolbar */
          .mobile-accounts-toolbar {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            margin-top: 12px !important;
            width: 100% !important;
          }
          .mobile-search-bar {
            position: relative !important;
            width: 100% !important;
          }
          .mobile-search-input {
            width: 100% !important;
            padding: 10px 38px 10px 34px !important;
            border-radius: 12px !important;
            border: 1px solid rgba(28, 115, 171, 0.2) !important;
            background: rgba(255, 255, 255, 0.85) !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            outline: none !important;
            box-sizing: border-box !important;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02) !important;
          }
          .mobile-search-input:focus {
            background: white !important;
            border-color: #2891C8 !important;
          }
          .mobile-search-icon {
            position: absolute !important;
            right: 12px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            font-size: 14px !important;
            color: #64748b !important;
            pointer-events: none !important;
          }
          .mobile-search-clear {
            position: absolute !important;
            left: 10px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            background: rgba(0,0,0,0.06) !important;
            border: none !important;
            width: 22px !important;
            height: 22px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #64748b !important;
            font-size: 11px !important;
            cursor: pointer !important;
          }

          .mobile-btn-group {
            display: flex !important;
            gap: 6px !important;
            overflow-x: auto !important;
            padding-bottom: 2px !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .mobile-btn-group::-webkit-scrollbar { display: none; }

          .mobile-action-pill {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            padding: 8px 12px !important;
            border-radius: 10px !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            white-space: nowrap !important;
            border: 1px solid rgba(28, 115, 171, 0.2) !important;
            background: rgba(255, 255, 255, 0.8) !important;
            color: #1C73AB !important;
            cursor: pointer !important;
            min-height: 40px !important;
            touch-action: manipulation !important;
            flex-shrink: 0 !important;
          }
          .mobile-action-pill.primary {
            background: linear-gradient(135deg, #2891C8, #1C73AB) !important;
            color: white !important;
            border: none !important;
            box-shadow: 0 4px 10px rgba(28, 115, 171, 0.25) !important;
          }
          .mobile-action-pill.edit-btn {
            background: rgba(59, 130, 246, 0.1) !important;
            color: #2563eb !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
          }
          .mobile-action-pill.delete-btn {
            background: rgba(239, 68, 68, 0.1) !important;
            color: #ef4444 !important;
            border-color: rgba(239, 68, 68, 0.3) !important;
          }

          /* 4. Adaptive Indentation on Mobile */
          .account-node-wrapper {
            margin-right: calc(var(--node-depth, 0) * 8px) !important;
            border-right: calc(var(--node-depth, 0) > 0 ? 1.5px : 0px) dashed rgba(40, 145, 200, 0.25) !important;
            padding-right: calc(var(--node-depth, 0) > 0 ? 4px : 0px) !important;
          }

          /* 5. Transform account row into a mobile card */
          .acc-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 10px 12px !important;
            gap: 8px !important;
            border-radius: 16px !important;
            margin-bottom: 8px !important;
            background: rgba(255, 255, 255, 0.95) !important;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.03) !important;
          }
          .acc-row.root-node {
            background: rgba(248, 250, 252, 0.95) !important;
          }

          .acc-row-main-block {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .acc-name-info {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 2px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .acc-name-text {
            font-size: 13px !important;
            line-height: 1.3 !important;
            display: block !important;
            max-width: 100% !important;
          }

          .acc-code-badge {
            font-size: 10px !important;
            padding: 1px 5px !important;
          }

          .acc-type-pill {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            flex-shrink: 0 !important;
          }

          .acc-type-tag {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }

          .acc-expand-arrow {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 22px !important;
            height: 22px !important;
            border-radius: 50% !important;
            background: rgba(28, 115, 171, 0.08) !important;
            color: #1C73AB !important;
            font-size: 9px !important;
          }

          /* 6. Stats Bar (3 mini columns on mobile) */
          .acc-row-stats-block {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1.15fr !important;
            gap: 6px !important;
            background: rgba(241, 245, 249, 0.6) !important;
            padding: 6px 8px !important;
            border-radius: 10px !important;
            border: 1px solid rgba(226, 232, 240, 0.8) !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .acc-stat-box {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .acc-stat-label {
            display: block !important;
            font-size: 9px !important;
            font-weight: 800 !important;
            color: #64748b !important;
            margin-bottom: 1px !important;
          }

          .acc-stat-box.debit .acc-stat-val {
            font-size: 11px !important;
            font-weight: 800 !important;
          }

          .acc-stat-box.credit .acc-stat-val {
            font-size: 11px !important;
            font-weight: 800 !important;
          }

          .acc-stat-box.balance .acc-stat-val {
            font-size: 11px !important;
            font-weight: 900 !important;
            padding: 1px 4px !important;
            border-radius: 4px !important;
          }

          /* 7. Transactions (entry-line) on Mobile */
          .entry-line {
            margin: 4px 0 6px 6px !important;
            padding: 8px 10px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            border-radius: 10px !important;
            background: rgba(255, 255, 255, 0.85) !important;
            font-size: 11px !important;
          }

          .entry-line-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .entry-line-desc {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 65% !important;
          }

          .entry-line-values {
            display: flex !important;
            justify-content: flex-end !important;
            gap: 12px !important;
            border-top: 1px dashed rgba(0,0,0,0.06) !important;
            padding-top: 4px !important;
          }

          .entry-stat-label {
            display: inline !important;
            font-size: 9px !important;
            color: #64748b !important;
            margin-left: 3px !important;
          }

          .entry-stat-chip {
            font-size: 11px !important;
          }
        }
      `}</style>
    </MasterPage>
  );
}

// 📌 مكون الصفوف الفرعية للشجرة
function AccountNode({ node, expandedIds, toggleExpand, selectedIds, toggleSelection, depth }: any) {
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedIds.includes(node.id);
  const hasSub = (node.children?.length > 0) || (node.transactions?.length > 0);
  
  const isRoot = depth === 1;

  return (
    <div 
      className="account-node-wrapper"
      style={{ '--node-depth': depth - 1 } as React.CSSProperties}
    >
      <div 
        className={`acc-row ${isRoot ? 'root-node' : 'child-node'} ${isSelected ? 'selected' : ''}`}
        onClick={() => hasSub && toggleExpand(node.id)} 
        style={{ borderRight: `${isRoot ? '5px' : '3px'} solid ${isRoot ? THEME.primary : THEME.goldAccent}` }} 
      >
        <div className="acc-row-main-block">
          <input 
            type="checkbox" className="custom-checkbox" checked={isSelected} 
            onChange={() => toggleSelection(node.id)} onClick={e=>e.stopPropagation()} 
          />
          <div className="acc-name-info">
            <span className="acc-name-text" style={{ fontWeight: isRoot ? 900 : 700, fontSize: isRoot ? '15px' : '13px', color: THEME.primary }}>
              {hasSub ? (isExpanded ? '📂 ' : '📁 ') : '📄 '}
              {node.name}
            </span>
            <span className="acc-code-badge">#{node.code}</span>
          </div>
          <div className="acc-type-pill">
            <span className={`acc-type-tag ${node.is_transactional ? 'trans' : 'summary'}`}>
              {node.is_transactional ? 'فرعي' : 'تجميعي'}
            </span>
            {hasSub && (
              <span className="acc-expand-arrow">
                {isExpanded ? '▲' : '▼'}
              </span>
            )}
          </div>
        </div>

        <div className="acc-row-stats-block">
          <div className="acc-stat-box debit">
            <span className="acc-stat-label">مدين</span>
            <span className="acc-stat-val text-success">{formatCurrency(node.totalDebit)}</span>
          </div>
          <div className="acc-stat-box credit">
            <span className="acc-stat-label">دائن</span>
            <span className="acc-stat-val text-danger">{formatCurrency(node.totalCredit)}</span>
          </div>
          <div className={`acc-stat-box balance ${isRoot ? 'root-balance' : ''}`}>
            <span className="acc-stat-label">الرصيد</span>
            <span className="acc-stat-val">{formatCurrency(node.balance)}</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '4px', marginBottom: '12px' }}>
          {node.children?.map((child: any) => (
            <AccountNode key={child.id} node={child} expandedIds={expandedIds} toggleExpand={toggleExpand} selectedIds={selectedIds} toggleSelection={toggleSelection} depth={depth + 1} />
          ))}
          {/* 🚀 عرض القيود تحت الحسابات الفرعية */}
          {node.transactions?.map((t: any, idx: number) => (
            <div key={idx} className="entry-line">
              <div className="entry-line-top">
                <span className="entry-line-date">{t.date}</span>
                <span className="entry-line-desc">{t.notes || t.description || 'بدون بيان'}</span>
              </div>
              <div className="entry-line-values">
                <div className="entry-stat-chip text-success">
                  <span className="entry-stat-label">مدين:</span>
                  <span>{t.debit ? formatCurrency(t.debit) : '-'}</span>
                </div>
                <div className="entry-stat-chip text-danger">
                  <span className="entry-stat-label">دائن:</span>
                  <span>{t.credit ? formatCurrency(t.credit) : '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
