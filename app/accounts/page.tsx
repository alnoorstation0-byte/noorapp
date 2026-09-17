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
    selectedIds, setSelectedIds, toggleSelection, handleDelete, handleAdd, handleEdit, handleSave,
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
    <MasterPage title="شجرة الحسابات والميزان" subtitle="إدارة المركز المالي ودليل الحسابات - محطات النور للوقود">
      
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
                </div>
              </div>

              {/* 🎯 شريط الإجراءات الموحد عند التحديد (داخل الإطار ومناسب 100% للجوال والكمبيوتر) */}
              {selectedIds.length > 0 && (
                <div className="accounts-selection-bar">
                  <div className="selection-bar-info">
                    <span className="selection-badge">
                      🎯 تم تحديد {selectedIds.length === 1 ? 'حساب' : `${selectedIds.length} حسابات`}
                    </span>
                    {selectedIds.length === 1 && (
                      <span className="selection-account-name">
                        {allAccounts?.find((a: any) => String(a.id) === String(selectedIds[0]))?.name || ''}
                      </span>
                    )}
                  </div>
                  <div className="selection-bar-actions">
                    <SecureAction module="accounts" action="edit">
                      <button 
                        type="button"
                        className="selection-action-btn edit" 
                        onClick={() => handleEdit(selectedIds)} 
                        disabled={selectedIds.length !== 1 || isDeleting}
                      >
                        ✏️ تعديل
                      </button>
                    </SecureAction>
                    <SecureAction module="accounts" action="delete">
                      <button 
                        type="button"
                        className="selection-action-btn delete" 
                        onClick={() => handleDelete(selectedIds)} 
                        disabled={isDeleting}
                      >
                        {isDeleting ? '⏳ حذف...' : `🗑️ حذف (${selectedIds.length})`}
                      </button>
                    </SecureAction>
                    <button 
                      type="button"
                      className="selection-action-btn clear" 
                      onClick={() => setSelectedIds([])}
                      title="إلغاء التحديد"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="table-inner-scroll cinematic-scroll">
              
              <div className="table-header">
                <div className="table-header-main">
                  <div className="table-header-check-space" />
                  <div className="table-header-title">اسم الحساب / الكود</div>
                  <div className="table-header-type">التصنيف</div>
                </div>
                <div className="table-header-stats">
                  <div className="table-header-stat">إجمالي مدين</div>
                  <div className="table-header-stat">إجمالي دائن</div>
                  <div className="table-header-stat">الرصيد النهائي</div>
                </div>
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
        .warm-depth-glow { position: absolute; inset: 0; background: radial-gradient(circle at 20% 30%, rgba(0, 229, 255, 0.08) 0%, transparent 70%); z-index: -1; pointer-events: none; }
        .content-container { max-width: 1600px; margin: 0 auto; width: 100%; box-sizing: border-box; }

        .glass-master-card {
          background: rgba(20, 24, 34, 0.75); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
          border-radius: 30px; border: 1px solid rgba(0, 229, 255, 0.2);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5); overflow: hidden;
          margin-top: 20px; animation: cardFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-header { padding: 22px 30px; background: rgba(11, 14, 20, 0.6); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }

        .table-inner-scroll { padding: 20px; overflow-x: auto; -webkit-overflow-scrolling: touch; }

        .summary-glass-card { background: rgba(20, 24, 34, 0.6); border: 1px solid rgba(0, 229, 255, 0.2); padding: 15px; border-radius: 16px; text-align: center; transition: 0.3s; }
        .glass-input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(11, 14, 20, 0.6); color: #F8FAFC; font-weight: 800; outline: none; transition: 0.3s; color-scheme: dark; box-sizing: border-box; }
        .glass-input:focus { background: rgba(20, 24, 34, 0.9); border-color: #00E5FF; }

        .btn-premium-gold { width: 100%; padding: 16px; border-radius: 16px; background: linear-gradient(135deg, #00E5FF, #0077B6); color: #0B0E14; font-weight: 900; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(0, 229, 255, 0.3); transition: 0.3s; min-height: 44px; }
        .btn-premium-gold:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(0, 229, 255, 0.4); filter: brightness(1.1); }

        .btn-main-glass { width: 100%; padding: 12px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; min-height: 44px; }
        .btn-main-glass.blue { background: rgba(0, 229, 255, 0.12); color: #00E5FF; border: 1px solid rgba(0, 229, 255, 0.3); }
        .btn-main-glass.blue:hover:not(:disabled) { background: #00E5FF; color: #0B0E14; }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass.red:hover:not(:disabled) { background: #ef4444; color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.05); color: #F8FAFC; border: 1px solid rgba(255, 255, 255, 0.1); }
        .btn-main-glass.white:hover:not(:disabled) { background: rgba(255, 255, 255, 0.15); color: white; }
        .btn-main-glass:disabled { opacity: 0.5; cursor: not-allowed; }

        /* 🖥️ Desktop Header & Rows */
        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 20px;
          font-weight: 900;
          color: #94A3B8;
          font-size: 13px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-sizing: border-box;
        }

        .table-header-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .table-header-check-space {
          width: 18px;
          min-width: 18px;
          flex-shrink: 0;
        }

        .table-header-title {
          flex: 1;
          min-width: 0;
          text-align: right;
          font-weight: 800;
          color: #F8FAFC;
        }

        .table-header-type {
          width: 100px;
          text-align: center;
          flex-shrink: 0;
          font-weight: 800;
          color: #64748b;
        }

        .table-header-stats {
          display: grid;
          grid-template-columns: 120px 120px 140px;
          gap: 12px;
          align-items: center;
          flex-shrink: 0;
        }

        .table-header-stat {
          text-align: center;
          font-weight: 800;
          color: #64748b;
        }

        .account-node-wrapper {
          margin-right: calc(var(--node-depth, 0) * 24px);
          position: relative;
          transition: margin-right 0.2s ease;
        }

        .acc-row { 
          border-radius: 16px;
          margin-bottom: 8px; 
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 20px;
          cursor: pointer; 
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: 0.2s;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          box-sizing: border-box;
          background: rgba(20, 24, 34, 0.85);
        }
        .acc-row.root-node {
          background: rgba(15, 20, 30, 0.95); 
          border: 1px solid rgba(0, 229, 255, 0.25);
        }
        .acc-row.child-node {
          background: rgba(20, 24, 34, 0.8);
        }

        .acc-row:hover {
          border-color: #00E5FF;
          transform: translateY(-1px);
          box-shadow: 0 5px 20px rgba(0, 229, 255, 0.15);
        }
        .acc-row.selected {
          background: rgba(0, 229, 255, 0.12);
          border-color: #00E5FF;
        }

        .acc-row-main-block {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .custom-checkbox {
          width: 18px !important;
          height: 18px !important;
          min-width: 18px !important;
          max-width: 18px !important;
          min-height: 18px !important;
          max-height: 18px !important;
          flex-shrink: 0 !important;
          align-self: center !important;
          margin: 0 !important;
          cursor: pointer;
          accent-color: #00E5FF;
        }

        .acc-name-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .acc-name-text {
          font-weight: 700;
          color: #F8FAFC;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
        }

        .acc-code-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .acc-code-badge {
          font-size: 11px;
          color: #94A3B8;
          font-weight: 800;
          font-family: monospace;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 7px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .acc-type-pill {
          width: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .acc-type-tag {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          line-height: 1.2;
          box-sizing: border-box;
        }
        .acc-type-tag.trans {
          color: #94A3B8;
          background: rgba(148, 163, 184, 0.1);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .acc-type-tag.summary {
          color: #00E5FF;
          background: rgba(0, 229, 255, 0.1);
          border: 1px solid rgba(0, 229, 255, 0.25);
        }

        .acc-expand-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0, 229, 255, 0.1);
          color: #00E5FF;
          font-size: 9px;
          flex-shrink: 0;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .acc-row-stats-block {
          display: grid;
          grid-template-columns: 120px 120px 140px;
          gap: 12px;
          align-items: center;
          flex-shrink: 0;
        }

        .acc-stat-box {
          text-align: center;
        }
        .acc-stat-box.debit .acc-stat-val {
          color: #10B981;
          font-weight: 800;
          font-family: monospace;
          font-size: 13px;
        }
        .acc-stat-box.credit .acc-stat-val {
          color: #EF4444;
          font-weight: 800;
          font-family: monospace;
          font-size: 13px;
        }
        .acc-stat-box.balance .acc-stat-val {
          font-weight: 900;
          color: #00E5FF;
          font-family: monospace;
          font-size: 13px;
          background: rgba(0, 229, 255, 0.08);
          border: 1px solid rgba(0, 229, 255, 0.25);
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-block;
          min-width: 90px;
          box-sizing: border-box;
        }
        .acc-stat-box.root-balance .acc-stat-val {
          color: #0B0E14;
          background: #00E5FF;
          border-color: #00E5FF;
        }

        .acc-stat-label {
          display: none;
        }
        .mobile-only {
          display: none !important;
        }
        .desktop-only {
          display: inline-flex !important;
        }

        /* 📜 Entry lines (Transactions) on Desktop */
        .entry-line { 
          background: rgba(15, 20, 30, 0.85);
          margin: 4px 6px 6px 6px;
          padding: 8px 12px; 
          border-radius: 9px;
          border-right: 3px solid #00E5FF;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-sizing: border-box;
          max-width: 100%;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        .entry-line:hover {
          background: rgba(20, 24, 34, 0.95);
          border-color: rgba(0, 229, 255, 0.3);
          box-shadow: 0 2px 8px rgba(0, 229, 255, 0.1);
        }
        .entry-line-top {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .entry-line-date {
          font-weight: 700;
          color: #94A3B8;
          font-family: monospace;
          font-size: 10.5px;
          width: 78px;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 5px;
          text-align: center;
          letter-spacing: -0.2px;
          margin-top: 1px;
        }
        .entry-line-desc {
          color: #E2E8F0;
          font-weight: 600;
          font-size: 11px;
          line-height: 1.45;
          flex: 1;
          min-width: 0;
          white-space: normal;
          word-break: break-word;
        }
        .entry-line-values {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .entry-stat-chip {
          text-align: center;
          font-weight: 800;
          font-family: monospace;
          font-size: 10.5px;
          padding: 2px 7px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .entry-stat-chip.text-success { 
          color: #10B981; 
          background: rgba(16, 185, 129, 0.12); 
          border: 1px solid rgba(16, 185, 129, 0.3); 
        }
        .entry-stat-chip.text-danger { 
          color: #EF4444; 
          background: rgba(239, 68, 68, 0.12); 
          border: 1px solid rgba(239, 68, 68, 0.3); 
        }
        .entry-stat-label { 
          display: inline; 
          font-size: 10px; 
          opacity: 0.8; 
          font-weight: 700;
        }

        .mobile-summary-strip { display: none; }
        .mobile-accounts-toolbar { display: none; }

        .cinematic-scroll::-webkit-scrollbar { width: 6px; }
        .cinematic-scroll::-webkit-scrollbar-track { background: transparent; }
        .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.2); border-radius: 10px; }

        /* 🎯 Dedicated Selection Action Bar (Desktop & Mobile) */
        .accounts-selection-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(20, 24, 34, 0.9));
          border: 1.5px solid rgba(0, 229, 255, 0.35);
          border-radius: 14px;
          padding: 10px 16px;
          margin-top: 14px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 15px rgba(0, 229, 255, 0.1);
          animation: selectionSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          box-sizing: border-box;
          gap: 12px;
        }

        @keyframes selectionSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .selection-bar-info {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-shrink: 1;
        }

        .selection-badge {
          font-size: 12px;
          font-weight: 900;
          color: #00E5FF;
          background: rgba(0, 229, 255, 0.15);
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(0, 229, 255, 0.3);
          white-space: nowrap;
        }

        .selection-account-name {
          font-size: 13px;
          font-weight: 800;
          color: #F8FAFC;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px;
        }

        .selection-bar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .selection-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          min-height: 38px;
          touch-action: manipulation;
          transition: all 0.2s ease;
          border: none;
          box-sizing: border-box;
        }

        .selection-action-btn.edit {
          background: linear-gradient(135deg, #00E5FF, #0077B6);
          color: #0B0E14;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(0, 229, 255, 0.3);
        }
        .selection-action-btn.edit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 229, 255, 0.4);
        }
        .selection-action-btn.edit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .selection-action-btn.delete {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .selection-action-btn.delete:hover:not(:disabled) {
          background: #ef4444;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .selection-action-btn.clear {
          background: rgba(255, 255, 255, 0.08);
          color: #94A3B8;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 7px 12px;
        }
        .selection-action-btn.clear:hover {
          background: rgba(100, 116, 139, 0.2);
          color: #1e293b;
        }

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
            padding: 12px 10px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
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
            border: 1px solid rgba(0, 229, 255, 0.2) !important;
            background: rgba(20, 24, 34, 0.85) !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #F8FAFC !important;
            outline: none !important;
            box-sizing: border-box !important;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
          }
          .mobile-search-input:focus {
            background: rgba(20, 24, 34, 0.95) !important;
            border-color: #00E5FF !important;
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
            background: rgba(255, 255, 255, 0.08) !important;
            border: none !important;
            width: 22px !important;
            height: 22px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #94A3B8 !important;
            font-size: 11px !important;
            cursor: pointer !important;
          }

          .mobile-btn-group {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

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
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            background: rgba(20, 24, 34, 0.8) !important;
            color: #F8FAFC !important;
            cursor: pointer !important;
            min-height: 40px !important;
            touch-action: manipulation !important;
            flex-shrink: 0 !important;
          }
          .mobile-action-pill.primary {
            background: linear-gradient(135deg, #00E5FF, #0077B6) !important;
            color: #0B0E14 !important;
            border: none !important;
            box-shadow: 0 4px 10px rgba(0, 229, 255, 0.3) !important;
          }

          /* 🎯 Dedicated Selection Bar (Mobile Layout) */
          .accounts-selection-bar {
            padding: 10px 10px !important;
            margin-top: 10px !important;
            border-radius: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .selection-bar-info {
            width: 100% !important;
            justify-content: space-between !important;
            align-items: center !important;
            display: flex !important;
          }
          .selection-account-name {
            max-width: calc(100vw - 150px) !important;
            font-size: 12px !important;
          }
          .selection-bar-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr 40px !important;
            gap: 6px !important;
          }
          .selection-action-btn {
            width: 100% !important;
            padding: 6px 10px !important;
            font-size: 12px !important;
            min-height: 36px !important;
          }
          .selection-action-btn.clear {
            width: auto !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .mobile-only { display: inline-flex !important; }
          .desktop-only { display: none !important; }

          /* 4. Tree Nodes / Rows (Acc Row) Mobile Re-architecture */
          .account-node-wrapper {
            margin-right: calc(var(--node-depth, 0) * 8px) !important;
          }

          .acc-row {
            padding: 10px 10px !important;
            gap: 8px !important;
            border-radius: 12px !important;
            margin-bottom: 6px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .acc-row.root-node {
            background: rgba(248, 250, 252, 0.95) !important;
          }

          .acc-row-main-block {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .custom-checkbox {
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            max-width: 18px !important;
            min-height: 18px !important;
            max-height: 18px !important;
            flex-shrink: 0 !important;
            align-self: center !important;
            margin: 0 !important;
            cursor: pointer !important;
          }

          .acc-name-info {
            flex: 1 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
          }

          .acc-name-text {
            font-size: 13px !important;
            line-height: 1.3 !important;
            color: #F8FAFC !important;
          }

          .acc-code-row {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }

          .acc-code-badge {
            font-size: 10px !important;
            padding: 1px 5px !important;
            color: #94A3B8 !important;
            background: rgba(255, 255, 255, 0.05) !important;
          }

          .acc-type-pill {
            width: auto !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex-shrink: 0 !important;
          }

          .acc-type-tag {
            font-size: 9.5px !important;
            padding: 1px 5px !important;
            border-radius: 4px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            line-height: 1.2 !important;
            box-sizing: border-box !important;
          }

          .acc-expand-arrow {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 28px !important;
            height: 28px !important;
            border-radius: 50% !important;
            background: rgba(0, 229, 255, 0.15) !important;
            color: #00E5FF !important;
            font-size: 10px !important;
            flex-shrink: 0 !important;
            cursor: pointer !important;
          }

          /* 6. Stats Bar (3 mini columns on mobile) */
          .acc-row-stats-block {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1.15fr !important;
            gap: 6px !important;
            background: rgba(15, 20, 30, 0.6) !important;
            padding: 6px 8px !important;
            border-radius: 10px !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .acc-stat-box {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 0 !important;
            overflow: hidden !important;
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
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          .acc-stat-box.credit .acc-stat-val {
            font-size: 11px !important;
            font-weight: 800 !important;
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          .acc-stat-box.balance .acc-stat-val {
            font-size: 11px !important;
            font-weight: 900 !important;
            padding: 1px 6px !important;
            border-radius: 5px !important;
            max-width: 100% !important;
            min-width: unset !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          /* 7. Transactions (entry-line) on Mobile */
          .entry-line {
            margin: 4px 4px 6px 4px !important;
            padding: 8px 10px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            border-radius: 8px !important;
            background: rgba(15, 20, 30, 0.9) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            font-size: 10.5px !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .entry-line-top {
            display: flex !important;
            align-items: flex-start !important;
            gap: 6px !important;
            width: 100% !important;
            min-width: 0 !important;
          }

          .entry-line-desc {
            white-space: normal !important;
            word-break: break-word !important;
            flex: 1 !important;
            min-width: 0 !important;
            font-size: 10.5px !important;
            line-height: 1.4 !important;
            color: #CBD5E1 !important;
          }

          .entry-line-date {
            font-size: 9.5px !important;
            padding: 2px 5px !important;
            flex-shrink: 0 !important;
            width: auto !important;
            margin-top: 1px !important;
            background: rgba(255, 255, 255, 0.05) !important;
            color: #94A3B8 !important;
          }

          .entry-line-values {
            display: flex !important;
            justify-content: flex-end !important;
            gap: 6px !important;
            border-top: 1px dashed rgba(255, 255, 255, 0.08) !important;
            padding-top: 4px !important;
            width: 100% !important;
          }

          .entry-stat-label {
            display: inline !important;
            font-size: 9px !important;
            color: #64748b !important;
            margin-left: 2px !important;
          }

          .entry-stat-chip {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
        }

        .daylight-theme .glass-master-card {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
          box-shadow: 0 10px 40px rgba(44, 26, 18, 0.08) !important;
        }
        .daylight-theme .card-header {
          background: rgba(194, 155, 98, 0.08) !important;
          border-bottom-color: rgba(194, 155, 98, 0.2) !important;
        }
        .daylight-theme .summary-glass-card {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
          box-shadow: 0 4px 15px rgba(44, 26, 18, 0.06) !important;
        }
        .daylight-theme .glass-input {
          background: #FFFFFF !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
          color: #2C1A12 !important;
        }
        .daylight-theme .table-header {
          background: rgba(194, 155, 98, 0.12) !important;
          border-color: rgba(194, 155, 98, 0.25) !important;
          color: #2C1A12 !important;
        }
        .daylight-theme .table-header-title {
          color: #2C1A12 !important;
        }
        .daylight-theme .acc-row {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
          border-color: rgba(194, 155, 98, 0.25) !important;
          box-shadow: 0 2px 10px rgba(44, 26, 18, 0.06) !important;
        }
        .daylight-theme .acc-row.root-node {
          background: linear-gradient(135deg, #FFFFFF 0%, rgba(248, 242, 232, 0.95) 100%) !important;
          border-color: rgba(194, 155, 98, 0.4) !important;
        }
        .daylight-theme .acc-row.child-node {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.92) 0%, rgba(250, 246, 240, 0.85) 100%) !important;
        }
        .daylight-theme .acc-row:hover {
          border-color: #C29B62 !important;
          box-shadow: 0 6px 20px rgba(168, 87, 60, 0.15) !important;
        }
        .daylight-theme .acc-row.selected {
          background: rgba(194, 155, 98, 0.18) !important;
          border-color: #C29B62 !important;
        }
        .daylight-theme .acc-name-text {
          color: #2C1A12 !important;
        }
        .daylight-theme .acc-stat-box.balance .acc-stat-val {
          color: #2C1A12 !important;
        }
        .daylight-theme .entry-line {
          background: rgba(255, 253, 250, 0.9) !important;
          border-color: rgba(194, 155, 98, 0.25) !important;
          color: #2C1A12 !important;
        }
        .daylight-theme .entry-line-desc {
          color: #2C1A12 !important;
        }
        .daylight-theme .mobile-summary-card {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
        }
        .daylight-theme .mobile-accounts-toolbar {
          background: rgba(194, 155, 98, 0.08) !important;
          border-color: rgba(194, 155, 98, 0.2) !important;
        }
        .daylight-theme .mobile-search-bar {
          background: #FFFFFF !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
        }
        .daylight-theme .mobile-search-input {
          color: #2C1A12 !important;
        }
        .daylight-theme .mobile-action-pill {
          background: rgba(194, 155, 98, 0.12) !important;
          border-color: rgba(194, 155, 98, 0.3) !important;
          color: #2C1A12 !important;
        }
        .daylight-theme .accounts-selection-bar {
          background: rgba(194, 155, 98, 0.15) !important;
          border-color: rgba(194, 155, 98, 0.35) !important;
          color: #2C1A12 !important;
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
              {node.name || 'بدون اسم'}
            </span>
            <div className="acc-code-row">
              <span className="acc-code-badge">#{node.code || '-'}</span>
              <span className={`acc-type-tag mobile-only ${node.is_transactional ? 'trans' : 'summary'}`}>
                {node.is_transactional ? 'فرعي' : 'تجميعي'}
              </span>
            </div>
          </div>
          <div className="acc-type-pill">
            <span className={`acc-type-tag desktop-only ${node.is_transactional ? 'trans' : 'summary'}`}>
              {node.is_transactional ? 'فرعي' : 'تجميعي'}
            </span>
            {hasSub && (
              <span className="acc-expand-arrow" title={isExpanded ? 'طي الحساب' : 'فتح الحساب'}>
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
          {/* 🚀 عرض القيود تحت الحسابات الفرعية بحجم متناسق ومريح */}
          {node.transactions?.map((t: any, idx: number) => (
            <div key={idx} className="entry-line">
              <div className="entry-line-top">
                <span className="entry-line-date">{t.date}</span>
                <span className="entry-line-desc" title={t.notes || t.description || 'بدون بيان'}>
                  {t.notes || t.description || 'بدون بيان'}
                </span>
              </div>
              <div className="entry-line-values">
                {Number(t.debit) > 0 && (
                  <div className="entry-stat-chip text-success">
                    <span className="entry-stat-label">مدين:</span>
                    <span>{formatCurrency(t.debit)}</span>
                  </div>
                )}
                {Number(t.credit) > 0 && (
                  <div className="entry-stat-chip text-danger">
                    <span className="entry-stat-label">دائن:</span>
                    <span>{formatCurrency(t.credit)}</span>
                  </div>
                )}
                {!Number(t.debit) && !Number(t.credit) && (
                  <div className="entry-stat-chip" style={{ color: '#94a3b8' }}>
                    <span>0.00 ر.س</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
