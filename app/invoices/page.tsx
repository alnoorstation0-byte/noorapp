"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { useInvoicesLogic } from './invoices_logic';
import { THEME } from '@/lib/theme';
import { formatCurrency, getInvoiceSummaryAndAging } from '@/lib/helpers'; 
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import { useConfirm } from '@/components/ConfirmContext';
import MasterPage from '@/components/MasterPage';

  // 🧱 المكونات
import RawasiSmartTable from '@/components/rawasismarttable';
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import InvoiceAgingDashboard from '@/components/InvoiceAgingDashboard';
import SmartCombo from '@/components/SmartCombo'; 



  // 🎬 المودالز
import InvoiceFormModal from './InvoiceFormModal';
import InvoicePrintModal from './InvoicePrintModal';
import InvoiceReturnModal from './InvoiceReturnModal';
import ReceiptVoucherModal from '@/app/ReceiptVouchers/ReceiptVoucherModal';
import LoadingScreen from '@/components/LoadingScreen';

import { useSearchParams } from 'next/navigation';

export default function InvoicesPage() {
  const logic = useInvoicesLogic(); 
  const { showConfirm } = useConfirm();
  const { can, loading: permsLoading } = usePermissions();
  const [mounted, setMounted] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  
  useEffect(() => {
      setMounted(true);
  }, []);

  // 🚀 استخراج العناصر الحالية لتحديد الكل بأمان
  const currentVisibleIds = useMemo(() => {
    return logic.allFiltered
      .slice((logic.currentPage - 1) * logic.rowsPerPage, logic.currentPage * logic.rowsPerPage)
      .map((v: any) => String(v.id));
  }, [logic.allFiltered, logic.currentPage, logic.rowsPerPage]);

  const isAllVisibleSelected = currentVisibleIds.length > 0 && currentVisibleIds.every((id: string) => logic.selectedIds.includes(id));

  // =========================================================================
  // ?? ????? ?????
  // =========================================================================
  const invoiceColumns = useMemo(() => [
    {
      key: 'select',
      label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input 
                  type="checkbox" 
                  className="custom-checkbox"
                  checked={isAllVisibleSelected}
                  title="تحديد كل الصفحة"
                  onChange={() => {
                      if (isAllVisibleSelected) {
                          logic.setSelectedIds(logic.selectedIds.filter((id: string) => !currentVisibleIds.includes(id)));
                      } else {
                          logic.setSelectedIds([...new Set([...logic.selectedIds, ...currentVisibleIds])]);
                      }
                  }}
              />
          </div>
      ), 
      render: (row: any) => {
        if (!row) return null;
        const isSelected = logic.selectedIds.includes(String(row.id));
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
              <input 
                  type="checkbox" 
                  className="custom-checkbox" 
                  checked={isSelected} 
                  onChange={(e) => {
                      e.stopPropagation();
                      if (isSelected) logic.setSelectedIds(logic.selectedIds.filter((i:any) => i !== String(row.id))); 
                      else logic.setSelectedIds([...logic.selectedIds, String(row.id)]); 
                  }} 
              />
          </div>
        );
      }
    },
    { 
      key: 'invoice_number',
      label: 'رقم الفاتورة', 
      render: (row: any) => {
        if (!row) return null;
        const isReturnNote = String(row.invoice_number || '').startsWith('RET-');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <b style={{ color: isReturnNote ? '#dc2626' : THEME.accent, textShadow: '0 0 10px rgba(40, 145, 200, 0.3)', fontSize: '14px' }}>
              #{row.invoice_number}
            </b>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                 {row.skip_zatca ? '📄 فاتورة داخلية' : '✅ ضريبية (ZATCA)'}
              </span>
              {row.status === 'مرتجع' && (
                <span style={{ fontSize: '10px', color: '#dc2626', background: 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 900 }}>
                  🔄 مرتجع بالكامل
                </span>
              )}
              {row.status === 'مرتجع جزئي' && (
                <span style={{ fontSize: '10px', color: '#d97706', background: 'rgba(245, 158, 11, 0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: 900 }}>
                  🔄 مرتجع جزئي
                </span>
              )}
              {isReturnNote && row.status !== 'مرتجع' && (
                <span style={{ fontSize: '10px', color: '#dc2626', background: 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 900 }}>
                  📑 إشعار دائن
                </span>
              )}
            </div>
          </div>
        );
      } 
    },
    { 
      key: 'date',
      label: 'التاريخ', 
      render: (row: any) => {
        if (!row) return null;
        return (
          <span style={{ fontSize: '12px', fontWeight: 900, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
            {row.date ? new Date(row.date).toLocaleDateString('ar-EG') : '---'}
          </span> 
        );
      }
    },
    {
      key: 'client_name',
      label: 'العميل / الفرع', 
      render: (row: any) => {
        if (!row) return null; 
        const finalClientName = row.partners?.name || row.client_name || '---';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
             <span style={{fontWeight: 900, color: '#1e293b'}}>{finalClientName}</span>
             {row.description && (
               <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={row.description}>
                  {row.description}
               </span>
             )}
          </div>
        );
      } 
    },
    {
      key: 'delegate_name',
      label: 'مشغل المحطة / المسؤول',
      render: (row: any) => {
        if (!row) return null;
        const delegate = logic.delegates?.find((d:any) => d.id === row.delegate_id);
        return (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', background: 'rgba(241, 245, 249, 0.8)', padding: '4px 8px', borderRadius: '6px' }}>
             {delegate ? `👤 ${delegate.name}` : '---'}
          </span>
        );
      }
    },
    {
      key: 'invoice_source',
      label: 'محطة الوقود / الخزان',
      render: (row: any) => {
        if (!row) return null;
        const wh = logic.warehouses?.find((w:any) => w.id === row.warehouse_id);
        if (!wh) return <span style={{ fontSize: '11px', color: '#94a3b8' }}>---</span>;
        const typeIcon = wh.type === 'main' ? '⛽' : (wh.type === 'vehicle' ? '🚛' : (wh.type === 'pos' ? '⛽' : '🛢️'));
        return (
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
             {typeIcon} {wh.name}
          </span>
        );
      }
    },
    {
      key: 'financial_details',
      label: 'تفاصيل المبالغ (قبل الخصم)',
      render: (row: any) => {
        if (!row) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', fontWeight: 700, textAlign: 'right' }}>
             <span style={{ color: '#334155' }}>الخاضع: {formatCurrency(row.taxable_amount)}</span>
             {Number(row.tax_amount) > 0 && <span style={{ color: '#0ea5e9' }}>الضريبة (15%): +{formatCurrency(row.tax_amount)}</span>}
          </div>
        );
      }
    },
    { 
      key: 'total_amount',
      label: 'الإجمالي النهائي', 
      render: (row: any) => {
        if (!row) return null; 
        return <span style={{ fontWeight: 900, color: THEME.accent, fontSize: '15px' }}>{formatCurrency(row.total_amount)}</span>;
      } 
    },
    {
      key: 'paid_amount',
      label: 'السداد',
      render: (row: any) => {
        if (!row) return null; 
        const total = Number(row.total_amount || 0);
        const paid = Number(row.paid_amount || 0);
        const remaining = total - paid;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 800 }}>
             {paid > 0 && <span style={{ color: THEME.success }}>مسدد: {formatCurrency(paid)}</span>}
             {remaining > 0 && <span style={{ color: THEME.danger }}>متبقي: {formatCurrency(remaining)}</span>}
             {remaining < 0 && <span style={{ color: THEME.accent, background: 'rgba(40, 145, 200, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>مقدم (بالزيادة): {formatCurrency(Math.abs(remaining))}</span>}
             {paid === 0 && remaining === 0 && <span style={{ color: '#475569' }}>0.00</span>}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'الاعتماد',
      render: (row: any) => {
        if (!row) return null; 
        if (row.status === 'مرتجع') {
          return (
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span className="invoice-status-pill danger" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <span className="status-dot red" />
                <span>مرتجع بالكامل</span>
              </span>
            </div>
          );
        }
        if (row.status === 'مرتجع جزئي') {
          return (
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span className="invoice-status-pill amber" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <span className="status-dot amber" />
                <span>مرتجع جزئي</span>
              </span>
            </div>
          );
        }

        const isApproved = ['posted', 'معتمد', 'مرحل', 'approved'].includes(String(row.status || '').trim().toLowerCase()) || row.is_posted === true;
        const isToggling = String(logic.togglingId) === String(row.id);
        
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => logic.handleToggleStatus(row)}
              disabled={isToggling}
              className={`invoice-status-pill ${isApproved ? 'approved' : 'pending'}`}
              title={isApproved ? "فاتورة معتمدة ومرحلة — انقر لفك الاعتماد 🔄" : "فاتورة معلقة — انقر للاعتماد والترحيل ✅"}
            >
              {isToggling ? (
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
              ) : (
                <span className={`status-dot ${isApproved ? 'green' : 'amber'}`} />
              )}
              <span>{isApproved ? 'معتمد' : 'معلق'}</span>
            </button>
          </div>
        );
      }
    },
    {
      key: 'due_date',
      label: 'حالة الدفع',
      render: (row: any) => {
        if (!row) return null; 
        const total = Number(row.total_amount || 0);
        const paid = Number(row.paid_amount || 0);
        const balance = total - paid;
        
        if (paid > total && total > 0) return <span className="invoice-pay-badge overpaid">💸 سداد بزيادة</span>;
        if (paid === total && total > 0) return <span className="invoice-pay-badge paid">✅ مكتمل</span>;
        
        if (!row.due_date) {
          if (paid > 0) return <span className="invoice-pay-badge partial">⏳ متبقي {formatCurrency(balance)}</span>;
          return <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>آجل</span>;
        }
        
        const today = new Date();
        const due = new Date(row.due_date);
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return <span className="invoice-pay-badge overdue">⚠️ متأخر ({Math.abs(diffDays)} يوم)</span>;
        if (diffDays === 0) return <span className="invoice-pay-badge today">🚨 السداد اليوم</span>;
        return <span className="invoice-pay-badge active">⏳ متبقي {diffDays} يوم</span>;
      }
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row: any) => {
        if (!row) return null; 
        const total = Number(row.total_amount || 0);
        const paid = Number(row.paid_amount || 0);
        const balance = total - paid;
        const needsPayment = balance > 0; 
        const isApproved = ['posted', 'معتمد', 'مرحل', 'approved'].includes(String(row.status || '').trim().toLowerCase()) || row.is_posted === true;
        const isReturnNote = String(row.invoice_number || '').startsWith('RET-');
        const canReturn = row.status !== 'مرتجع' && !isReturnNote;
        
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <button 
              onClick={() => { setPrintData(row); setIsPrintModalOpen(true); }} 
              className="inv-row-btn print" 
              title="طباعة الفاتورة"
            >
              🖨️
            </button>
            
            {needsPayment && isApproved && logic.handleOpenPaymentModal && (
              <button 
                onClick={() => logic.handleOpenPaymentModal(row)} 
                className="inv-row-btn pay" 
                title="تسجيل سند قبض / دفعة سداد"
              >
                💰
              </button>
            )}

            {canReturn && (
              <button 
                onClick={() => logic.handleOpenReturnModal(row)} 
                className="inv-row-btn return" 
                title="إجراء مرتجع مبيعات (استرجاع للمخزن وتسوية الكاشير)"
              >
                🔄
              </button>
            )}

            {!isApproved && !isReturnNote && (
              <button 
                onClick={() => logic.handleEdit(row)} 
                className="inv-row-btn edit" 
                title="تعديل بيانات الفاتورة"
              >
                ✏️
              </button>
            )}

            {!isApproved && (
              <button 
                onClick={() => logic.handleDeleteSingle(row)} 
                className="inv-row-btn delete" 
                title="حذف الفاتورة"
              >
                🗑️
              </button>
            )}
          </div>
        );
      }
    }
  ], [logic.selectedIds, isAllVisibleSelected, currentVisibleIds, logic]);

  // =========================================================================
  // 🕹️ أزرار السايد بار
  // =========================================================================
  const sidebarActions = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="invoices" action="create">
        <button className="btn-main-glass gold" onClick={logic.handleAddNew}>
              ➕ إنشاء فاتورة جديدة
        </button>
      </SecureAction>

      {logic.selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
          <p style={{fontSize:'10px', textAlign:'center', color:'#475569', fontWeight:900, marginBottom:'-5px'}}>الإجراءات على ({logic.selectedIds.length})</p>
          <SecureAction module="invoices" action="post">
            <button className="btn-main-glass blue" onClick={logic.handlePostSelected} disabled={logic.isSaving}>
              {logic.isSaving ? '⏳ جاري التنفيذ...' : '✅ اعتماد وترحيل'}
            </button>
          </SecureAction>
          <SecureAction module="invoices" action="post">
            <button className="btn-main-glass yellow" onClick={logic.handleUnpostSelected} disabled={logic.isSaving}>
              ⏸️ فك الاعتماد
            </button>
          </SecureAction>
          {logic.selectedIds.length === 1 && (
            <SecureAction module="invoices" action="edit">
              <button className="btn-main-glass white" onClick={() => logic.handleEdit(logic.allFiltered.find((i:any) => String(i.id) === logic.selectedIds[0]))}>
                ✏️ تعديل البيانات
              </button>
            </SecureAction>
          )}
          <SecureAction module="invoices" action="delete">
            <button className="btn-main-glass red" onClick={() => { showConfirm({ title: 'حذف نهائي', message: `تحذير: هل أنت متأكد من حذف الفواتير المحددة وعددها ${logic.selectedIds.length}؟`, type: 'danger', onConfirm: () => logic.handleDeleteSelected() }); }} disabled={logic.isSaving}>
              🗑️ حذف نهائي
            </button>
          </SecureAction>
        </div>
      )}
    </div>
  ), [logic.selectedIds, logic]);

  return (
    <MasterPage 
      title="فواتير المبيعات" 
      subtitle="متابعة وإدارة التسويات والتحصيلات"
    >
      
      <RawasiSidebarManager 
        summary={
          <div className="summary-glass-card">
            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي المديونية 💼</span>
            <div className="val" style={{fontSize:'24px', fontWeight:900, color: THEME.accent, marginTop:'5px'}}>{formatCurrency(logic.summary.totalRemaining)}</div>
          </div>
        }
        actions={sidebarActions}
        customFilters={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <SmartCombo 
                    label="تصفية سريعة بالعميل"
                    icon="👤"
                    table="partners"
                    displayCol="name"
                    placeholder="ابحث عن عميل محدد..."
                    enableClear={true}
                    onSelect={(item:any) => logic.setGlobalSearch(item?.name || '')}
                />
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
                <InvoiceAgingDashboard summary={logic.summary} />
            </div>
        }
        onSearch={logic.setGlobalSearch}
        onDateFilter={(start, end) => { if(logic.setDateFrom) logic.setDateFrom(start); if(logic.setDateTo) logic.setDateTo(end); }}
        watchDeps={[logic.selectedIds, logic.allFiltered.length, logic.summary.totalRemaining]}
      />

      <style>{`
        .custom-checkbox { width: 20px; height: 20px; accent-color: ${THEME.accent}; cursor: pointer; transition: 0.1s; }
        .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-main-glass.gold { background: ${THEME.gradients.gold}; color: white; }
        .btn-main-glass.blue { background: ${THEME.gradients.primary}; color: white; }
        .btn-main-glass.green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.9)); color: white; }
        .btn-main-glass.yellow { background: linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9)); color: white; }
        .btn-main-glass.white { background: rgba(255, 255, 255, 0.6); color: #1e293b; border: 1px solid rgba(255,255,255,0.8); }
        .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); }

        /* 🔘 باج حالة الفاتورة التفاعلي والمضغوط */
        .invoice-status-pill {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          padding: 4px 12px !important;
          border-radius: 9999px !important;
          font-size: 11.5px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          border: 1px solid transparent !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          white-space: nowrap !important;
          height: 28px !important;
          min-height: 28px !important;
          max-height: 28px !important;
          line-height: 1 !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.04);
        }
        .invoice-status-pill.approved {
          background: rgba(34, 197, 94, 0.12) !important;
          color: #15803d !important;
          border-color: rgba(34, 197, 94, 0.3) !important;
        }
        .invoice-status-pill.approved:hover {
          background: rgba(34, 197, 94, 0.22) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25) !important;
        }
        .invoice-status-pill.pending {
          background: rgba(245, 158, 11, 0.12) !important;
          color: #b45309 !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
        }
        .invoice-status-pill.pending:hover {
          background: rgba(245, 158, 11, 0.22) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25) !important;
        }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .status-dot.green { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .status-dot.amber { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }

        /* 💳 شارات حالة السداد */
        .invoice-pay-badge {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 3px 8px !important;
          border-radius: 8px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          white-space: nowrap !important;
        }
        .invoice-pay-badge.paid { background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); }
        .invoice-pay-badge.partial { background: rgba(245, 158, 11, 0.12); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.25); }
        .invoice-pay-badge.overdue { background: rgba(239, 68, 68, 0.12); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.25); }
        .invoice-pay-badge.today { background: rgba(239, 68, 68, 0.2); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.4); animation: pulse 2s infinite; }
        .invoice-pay-badge.active { background: rgba(2, 132, 199, 0.1); color: #0284c7; border: 1px solid rgba(2, 132, 199, 0.25); }
        .invoice-pay-badge.overpaid { background: rgba(147, 51, 234, 0.1); color: #9333ea; border: 1px solid rgba(147, 51, 234, 0.25); }

        /* 🛠️ أزرار الإجراءات داخل الصف */
        .inv-row-btn {
          width: 32px !important;
          height: 32px !important;
          border-radius: 8px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          background: rgba(30, 41, 59, 0.6) !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 14px !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .inv-row-btn:hover {
          transform: translateY(-2px);
          background: rgba(20, 24, 34, 0.95) !important;
          border-color: rgba(0, 229, 255, 0.4) !important;
          box-shadow: 0 4px 12px rgba(0, 229, 255, 0.25);
        }
        .inv-row-btn.delete { color: #ef4444; }
        .inv-row-btn.delete:hover { background: rgba(239, 68, 68, 0.2) !important; border-color: #ef4444 !important; }
        .inv-row-btn.pay { color: #10b981; }
        .inv-row-btn.pay:hover { background: rgba(16, 185, 129, 0.2) !important; border-color: #10b981 !important; }
        .inv-row-btn.print { color: #f8fafc; }
        .inv-row-btn.print:hover { background: rgba(0, 229, 255, 0.2) !important; border-color: #00e5ff !important; }
        .inv-row-btn.edit { color: #00e5ff; }
        .inv-row-btn.edit:hover { background: rgba(0, 229, 255, 0.2) !important; border-color: #00e5ff !important; }
        .inv-row-btn.return { color: #f59e0b; }
        .inv-row-btn.return:hover { background: rgba(245, 158, 11, 0.2) !important; border-color: #f59e0b !important; }

        /* 📊 كروت KPI المودرن */
        .invoice-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-bottom: 5px;
        }
        .invoice-kpi-card {
          background: rgba(20, 24, 34, 0.95);
          backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(0, 229, 255, 0.18);
          border-radius: 18px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
        }
        .invoice-kpi-card:hover {
          transform: translateY(-3px);
          background: rgba(26, 32, 46, 0.95);
          box-shadow: 0 12px 30px rgba(0, 229, 255, 0.15);
          border-color: rgba(0, 229, 255, 0.4);
        }
        .invoice-kpi-card.active-filter {
          border-color: #00E5FF;
          background: rgba(26, 32, 46, 0.98);
          box-shadow: 0 8px 24px rgba(0, 229, 255, 0.25);
        }
        .kpi-icon-bubble {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .kpi-icon-bubble.blue { background: rgba(0, 229, 255, 0.12); color: #00E5FF; }
        .kpi-icon-bubble.green { background: rgba(16, 185, 129, 0.12); color: #10B981; }
        .kpi-icon-bubble.amber { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
        .kpi-icon-bubble.red { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
        .kpi-content { display: flex; flex-direction: column; min-width: 0; }
        .kpi-label { font-size: 11.5px; font-weight: 700; color: #94a3b8; margin-bottom: 2px; }
        .kpi-value { font-size: 19px; font-weight: 900; line-height: 1.2; letter-spacing: -0.3px; }
        .kpi-value.text-blue { color: #00E5FF; }
        .kpi-value.text-green { color: #10B981; }
        .kpi-value.text-amber { color: #F59E0B; }
        .kpi-value.text-red { color: #EF4444; }
        .kpi-sub { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 3px; }

        /* 🎛️ شريط التبويبات والبحث السريع */
        .invoices-toolbar-card {
          background: rgba(20, 24, 34, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 18px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .filter-tabs-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
          max-width: 100%;
        }
        .filter-tab-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(30, 41, 59, 0.6);
          font-size: 12px;
          font-weight: 800;
          color: #94A3B8;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .filter-tab-pill:hover {
          background: rgba(30, 41, 59, 0.9);
          color: #F8FAFC;
          transform: translateY(-1px);
        }
        .filter-tab-pill.active {
          background: linear-gradient(135deg, #00E5FF 0%, #00B4D8 100%);
          color: #0B0E14;
          border-color: #00E5FF;
          box-shadow: 0 4px 14px rgba(0, 229, 255, 0.35);
        }
        .filter-tab-pill.active .tab-count {
          background: rgba(11, 14, 20, 0.2);
          color: #0B0E14;
        }
        .tab-count {
          padding: 2px 7px;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 900;
          background: rgba(255, 255, 255, 0.08);
          color: #94A3B8;
        }
        .filter-tab-pill .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .filter-tab-pill .dot.green { background: #10B981; }
        .filter-tab-pill .dot.amber { background: #F59E0B; }
        .filter-tab-pill .dot.blue { background: #00E5FF; }
        .filter-tab-pill .dot.red { background: #EF4444; }

        .toolbar-actions-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-inline-start: auto;
        }
        .quick-search-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .quick-search-input {
          height: 38px;
          width: 220px;
          border-radius: 12px;
          border: 1px solid rgba(0, 229, 255, 0.2);
          background: rgba(11, 14, 20, 0.7);
          padding: 0 12px 0 32px;
          font-size: 12px;
          font-weight: 700;
          color: #F8FAFC;
          outline: none;
          transition: all 0.2s;
        }
        .quick-search-input:focus {
          border-color: #00E5FF;
          width: 250px;
          box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.25);
          background: rgba(20, 24, 34, 0.95);
        }
        .search-icon {
          position: absolute;
          left: 10px;
          pointer-events: none;
          font-size: 13px;
          color: #94a3b8;
        }
        .clear-search-btn {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          font-size: 12px;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
        }
        .btn-create-invoice {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 38px;
          padding: 0 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00E5FF 0%, #0077B6 100%);
          color: #0B0E14;
          font-size: 12.5px;
          font-weight: 900;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(0, 229, 255, 0.3);
          white-space: nowrap;
        }
        .btn-create-invoice:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 229, 255, 0.4);
          filter: brightness(1.08);
        }

        /* 🚀 شريط الإجراءات الجماعية العائم (Floating Batch Bar) */
        .floating-batch-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          background: rgba(20, 24, 34, 0.95);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(0, 229, 255, 0.35);
          border-radius: 20px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          animation: floatUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: 95vw;
          flex-wrap: wrap;
        }
        @keyframes floatUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .batch-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #F8FAFC;
        }
        .batch-badge {
          background: #00E5FF;
          color: #0B0E14;
          padding: 3px 9px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 900;
        }
        .batch-text { font-size: 12px; font-weight: 800; }
        .batch-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .batch-btn {
          height: 34px;
          padding: 0 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .batch-btn:hover { transform: translateY(-2px); }
        .batch-btn.approve { background: #22c55e; color: white; }
        .batch-btn.approve:hover { background: #16a34a; }
        .batch-btn.unpost { background: #f59e0b; color: white; }
        .batch-btn.unpost:hover { background: #d97706; }
        .batch-btn.delete { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }
        .batch-btn.delete:hover { background: #ef4444; color: white; }
        .batch-btn.cancel { background: rgba(255, 255, 255, 0.15); color: #cbd5e1; }
        .batch-btn.cancel:hover { background: rgba(255, 255, 255, 0.25); color: white; }

        @media (max-width: 768px) {
          .invoice-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .quick-search-input { width: 100% !important; }
          .toolbar-actions-group { width: 100% !important; justify-content: space-between !important; }
          .invoices-toolbar-card { padding: 8px 10px !important; }
          .floating-batch-bar { bottom: 12px !important; padding: 8px 12px !important; gap: 8px !important; width: 96vw !important; justify-content: space-between !important; }
        }

        /* 🏜️ Daylight Desert Glassmorphism */
        .daylight-theme .invoice-kpi-card {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.9) 100%) !important;
          border: 1px solid rgba(194, 155, 98, 0.3) !important;
          box-shadow: 0 4px 15px rgba(44, 26, 18, 0.08) !important;
        }
        .daylight-theme .invoice-kpi-card:hover {
          background: #FFFFFF !important;
          border-color: #C29B62 !important;
          box-shadow: 0 8px 25px rgba(168, 87, 60, 0.15) !important;
        }
        .daylight-theme .invoice-kpi-card.active-filter {
          border-color: #C29B62 !important;
          background: rgba(194, 155, 98, 0.12) !important;
          box-shadow: 0 8px 24px rgba(194, 155, 98, 0.25) !important;
        }
        .daylight-theme .kpi-label {
          color: rgba(44, 26, 18, 0.65) !important;
        }
        .daylight-theme .kpi-value.text-blue {
          color: #A8573C !important;
        }
        .daylight-theme .kpi-sub {
          color: rgba(44, 26, 18, 0.55) !important;
        }
        .daylight-theme .invoices-toolbar-card {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.9) 100%) !important;
          border: 1px solid rgba(194, 155, 98, 0.3) !important;
          box-shadow: 0 4px 15px rgba(44, 26, 18, 0.08) !important;
        }
        .daylight-theme .filter-tab-pill {
          background: #FFFFFF !important;
          border: 1px solid rgba(194, 155, 98, 0.25) !important;
          color: rgba(44, 26, 18, 0.7) !important;
        }
        .daylight-theme .filter-tab-pill:hover {
          background: #FFFFFF !important;
          color: #A8573C !important;
          border-color: #C29B62 !important;
        }
        .daylight-theme .filter-tab-pill.active {
          background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%) !important;
          color: #FFFFFF !important;
          border-color: #C29B62 !important;
          box-shadow: 0 4px 14px rgba(168, 87, 60, 0.3) !important;
        }
        .daylight-theme .filter-tab-pill.active .tab-count {
          background: rgba(255, 255, 255, 0.25) !important;
          color: #FFFFFF !important;
        }
        .daylight-theme .tab-count {
          background: rgba(44, 26, 18, 0.08) !important;
          color: rgba(44, 26, 18, 0.7) !important;
        }
        .daylight-theme .quick-search-input {
          background: #FFFFFF !important;
          border: 1px solid rgba(194, 155, 98, 0.3) !important;
          color: #2C1A12 !important;
        }
        .daylight-theme .quick-search-input:focus {
          border-color: #C29B62 !important;
          box-shadow: 0 0 0 3px rgba(194, 155, 98, 0.2) !important;
        }
        .daylight-theme .btn-create-invoice {
          background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%) !important;
          color: #FFFFFF !important;
          box-shadow: 0 4px 14px rgba(168, 87, 60, 0.3) !important;
        }
        .daylight-theme .inv-row-btn {
          background: #FFFFFF !important;
          border: 1px solid rgba(194, 155, 98, 0.3) !important;
          box-shadow: 0 2px 5px rgba(44, 26, 18, 0.06) !important;
        }
        .daylight-theme .inv-row-btn:hover {
          background: rgba(194, 155, 98, 0.15) !important;
          border-color: #C29B62 !important;
        }
        .daylight-theme .inv-row-btn.print {
          color: #2C1A12 !important;
        }
        .daylight-theme .inv-row-btn.edit {
          color: #A8573C !important;
        }
        .daylight-theme .floating-batch-bar {
          background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(245, 238, 228, 0.95) 100%) !important;
          border: 1px solid rgba(194, 155, 98, 0.4) !important;
          box-shadow: 0 20px 50px rgba(44, 26, 18, 0.2) !important;
        }
        .daylight-theme .batch-info {
          color: #2C1A12 !important;
        }
        .daylight-theme .batch-badge {
          background: linear-gradient(135deg, #C29B62, #A8573C) !important;
          color: #FFFFFF !important;
        }
        .daylight-theme .batch-btn.cancel {
          background: rgba(44, 26, 18, 0.08) !important;
          color: #2C1A12 !important;
        }
      `}</style>

      {( (logic.isLoading || permsLoading) && logic.allFiltered.length === 0 ) ? (
        <LoadingScreen message="جاري التحميل..." fullScreen={false} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 🌟 1. كروت مؤشرات الأداء السريعة (KPI Dashboard) */}
          <div className="invoice-kpi-grid">
            <div 
              className={`invoice-kpi-card ${logic.statusFilter === 'all' ? 'active-filter' : ''}`} 
              onClick={() => logic.setStatusFilter('all')}
              title="عرض كل الفواتير"
            >
              <div className="kpi-icon-bubble blue">📊</div>
              <div className="kpi-content">
                <span className="kpi-label">إجمالي المبيعات</span>
                <span className="kpi-value text-blue">{formatCurrency(logic.filterStats?.totalSales || 0)}</span>
                <span className="kpi-sub">{logic.filterStats?.all || 0} فاتورة مسجلة</span>
              </div>
            </div>

            <div 
              className={`invoice-kpi-card ${logic.statusFilter === 'posted' ? 'active-filter' : ''}`} 
              onClick={() => logic.setStatusFilter('posted')}
              title="عرض الفواتير المعتمدة والمرحلة فقط"
            >
              <div className="kpi-icon-bubble green">✅</div>
              <div className="kpi-content">
                <span className="kpi-label">فواتير معتمدة ومرحلة</span>
                <span className="kpi-value text-green">{logic.filterStats?.posted || 0}</span>
                <span className="kpi-sub">المحصل: {formatCurrency(logic.filterStats?.totalCollected || 0)}</span>
              </div>
            </div>

            <div 
              className={`invoice-kpi-card ${logic.statusFilter === 'pending' ? 'active-filter' : ''}`} 
              onClick={() => logic.setStatusFilter('pending')}
              title="عرض الفواتير المعلقة بانتظار الاعتماد"
            >
              <div className="kpi-icon-bubble amber">⏳</div>
              <div className="kpi-content">
                <span className="kpi-label">فواتير معلقة (مسودات)</span>
                <span className="kpi-value text-amber">{logic.filterStats?.pending || 0}</span>
                <span className="kpi-sub">تتطلب المراجعة والاعتماد</span>
              </div>
            </div>

            <div 
              className={`invoice-kpi-card ${logic.statusFilter === 'unpaid' ? 'active-filter' : ''}`} 
              onClick={() => logic.setStatusFilter('unpaid')}
              title="عرض الفواتير غير المسددة أو المتأخرة"
            >
              <div className="kpi-icon-bubble red">💼</div>
              <div className="kpi-content">
                <span className="kpi-label">المتبقي للتحصيل (ديون)</span>
                <span className="kpi-value text-red">{formatCurrency(logic.filterStats?.totalRemaining || 0)}</span>
                <span className="kpi-sub">{logic.filterStats?.unpaid || 0} مستحقة ({logic.filterStats?.overdue || 0} متأخرة)</span>
              </div>
            </div>
          </div>

          {/* 🎛️ 2. شريط التصفية والبحث السريع وأزرار الإجراء */}
          <div className="invoices-toolbar-card">
            <div className="filter-tabs-wrapper">
              <button
                type="button"
                className={`filter-tab-pill ${logic.statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => logic.setStatusFilter('all')}
              >
                <span>الكل</span>
                <span className="tab-count">{logic.filterStats?.all || 0}</span>
              </button>

              <button
                type="button"
                className={`filter-tab-pill ${logic.statusFilter === 'posted' ? 'active' : ''}`}
                onClick={() => logic.setStatusFilter('posted')}
              >
                <span className="dot green" />
                <span>معتمدة</span>
                <span className="tab-count">{logic.filterStats?.posted || 0}</span>
              </button>

              <button
                type="button"
                className={`filter-tab-pill ${logic.statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => logic.setStatusFilter('pending')}
              >
                <span className="dot amber" />
                <span>معلقة</span>
                <span className="tab-count">{logic.filterStats?.pending || 0}</span>
              </button>

              <button
                type="button"
                className={`filter-tab-pill ${logic.statusFilter === 'unpaid' ? 'active' : ''}`}
                onClick={() => logic.setStatusFilter('unpaid')}
              >
                <span className="dot blue" />
                <span>غير مسددة</span>
                <span className="tab-count">{logic.filterStats?.unpaid || 0}</span>
              </button>

              <button
                type="button"
                className={`filter-tab-pill ${logic.statusFilter === 'overdue' ? 'active' : ''}`}
                onClick={() => logic.setStatusFilter('overdue')}
              >
                <span className="dot red" />
                <span>متأخرة</span>
                <span className="tab-count">{logic.filterStats?.overdue || 0}</span>
              </button>

              <button
                type="button"
                className={`filter-tab-pill ${logic.statusFilter === 'returned' ? 'active' : ''}`}
                onClick={() => logic.setStatusFilter('returned')}
                style={logic.statusFilter === 'returned' ? { background: '#dc2626', borderColor: '#dc2626' } : {}}
              >
                <span className="dot red" />
                <span>مرتجعات</span>
                <span className="tab-count">{logic.filterStats?.returned || 0}</span>
              </button>
            </div>

            <div className="toolbar-actions-group">
              <div className="quick-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="ابحث برقم الفاتورة أو العميل..."
                  value={logic.globalSearch || ''}
                  onChange={(e) => logic.setGlobalSearch(e.target.value)}
                  className="quick-search-input"
                />
                {logic.globalSearch && (
                  <button
                    type="button"
                    onClick={() => logic.setGlobalSearch('')}
                    className="clear-search-btn"
                  >
                    ✕
                  </button>
                )}
              </div>

              <SecureAction module="invoices" action="create">
                <button
                  type="button"
                  className="btn-create-invoice"
                  onClick={logic.handleAddNew}
                >
                  <span>➕</span>
                  <span>فاتورة جديدة</span>
                </button>
              </SecureAction>
            </div>
          </div>

          {/* 3. أعمار الديون (إذا كان هناك أرصدة مفتوحة) */}
          {logic.summary && logic.summary.aging && (
             <InvoiceAgingDashboard summary={logic.summary} />
          )}

          {/* 4. جدول الفواتير الذكي */}
          <div className="clickable-rows cinematic-scroll summary-glass-card">
            <RawasiSmartTable 
                data={logic.allFiltered} 
                columns={invoiceColumns} 
                enablePagination={true}
                currentPage={logic.currentPage}
                totalItems={logic.allFiltered.length}
                rowsPerPage={logic.rowsPerPage}
                onPageChange={logic.setCurrentPage}
                onRowsChange={logic.setRowsPerPage}
                onRowClick={(row:any) => { setPrintData(row); setIsPrintModalOpen(true); }}
            />
          </div>

          {/* 🚀 5. شريط الإجراءات الجماعية العائم عند التحديد */}
          {logic.selectedIds.length > 0 && (
            <div className="floating-batch-bar">
              <div className="batch-info">
                <span className="batch-badge">{logic.selectedIds.length}</span>
                <span className="batch-text">فاتورة محددة</span>
              </div>

              <div className="batch-buttons">
                <SecureAction module="invoices" action="post">
                  <button
                    type="button"
                    className="batch-btn approve"
                    onClick={logic.handlePostSelected}
                    disabled={logic.isSaving}
                  >
                    {logic.isSaving ? '⏳ جاري التنفيذ...' : '✅ اعتماد وترحيل'}
                  </button>
                </SecureAction>

                <SecureAction module="invoices" action="post">
                  <button
                    type="button"
                    className="batch-btn unpost"
                    onClick={logic.handleUnpostSelected}
                    disabled={logic.isSaving}
                  >
                    ⏸️ فك الاعتماد
                  </button>
                </SecureAction>

                <SecureAction module="invoices" action="delete">
                  <button
                    type="button"
                    className="batch-btn delete"
                    onClick={() => {
                      showConfirm({
                        title: 'حذف نهائي',
                        message: `تحذير: هل أنت متأكد من حذف الفواتير المحددة وعددها ${logic.selectedIds.length}؟`,
                        type: 'danger',
                        onConfirm: () => logic.handleDeleteSelected()
                      });
                    }}
                    disabled={logic.isSaving}
                  >
                    🗑️ حذف نهائي
                  </button>
                </SecureAction>

                <button
                  type="button"
                  className="batch-btn cancel"
                  onClick={() => logic.setSelectedIds([])}
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
          )}

        </div>
      )}
      
      {mounted && logic.isReceiptModalOpen && createPortal(
        <div style={{ 
            position: 'fixed', inset: 0, zIndex: 999999999, 
            background: 'rgba(40, 24, 10, 0.85)', 
            backdropFilter: 'blur(10px)',
            display: 'flex', 
            alignItems: 'flex-start',
            justifyContent: 'center', 
            overflowY: 'auto', 
            padding: '50px 20px' 
        }}>
            <div style={{ width: '100%', maxWidth: '900px', position: 'relative' }}>
                <ReceiptVoucherModal 
                    isOpen={logic.isReceiptModalOpen} 
                    onClose={() => logic.setIsReceiptModalOpen(false)} 
                    record={logic.selectedInvoiceForPay || {}} 
                    setRecord={logic.setSelectedInvoiceForPay}
                    onSave={logic.handleSavePayment} 
                    delegates={logic.delegates}
                    fleetOperations={logic.fleetOperations}
                />
            </div>
        </div>,
        document.body
      )}

      {mounted && logic.isEditModalOpen && (
          <InvoiceFormModal 
            isOpen={logic.isEditModalOpen} 
            onClose={() => logic.setIsEditModalOpen(false)} 
            record={logic.currentRecord} 
            setRecord={logic.setCurrentRecord} 
            onSave={logic.handleSave} 
            isSaving={logic.isSaving} 
            projects={logic.projects} 
            fleetOperations={logic.fleetOperations} 
            warehouses={logic.warehouses} 
            delegates={logic.delegates}
            warehouseItems={logic.warehouseItems}
          />
      )}
      
      {mounted && isPrintModalOpen && (
          <InvoicePrintModal 
            isOpen={true} 
            onClose={() => setIsPrintModalOpen(false)} 
            record={printData} 
            projects={logic.projects} 
          />
      )}

      {mounted && logic.isReturnModalOpen && (
          <InvoiceReturnModal 
            isOpen={logic.isReturnModalOpen}
            onClose={() => logic.setIsReturnModalOpen(false)}
            invoice={logic.selectedInvoiceForReturn}
            onConfirmReturn={logic.handleConfirmReturn}
            isSubmitting={logic.isReturning}
          />
      )}
      
    </MasterPage>
  );
}



