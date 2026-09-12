"use client";
import React, { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import SmartCombo from '@/components/SmartCombo'; 
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import PrintHeader from '@/components/PrintHeader';

// ==========================================
// 🧠 العقل المدبر (Logic) - متوافق مع قوانين Supabase
// ==========================================
function useJournalLogic() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [globalSearch, setGlobalSearch] = useState('');
    const deferredSearch = useDeferredValue(globalSearch); 

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
    const [filterPartnerId, setFilterPartnerId] = useState<string | null>(null);

    const [filterVType, setFilterVType] = useState<string>('الكل');
    const [filterStatus, setFilterStatus] = useState('الكل'); 
    
    // 🟢 ترقيم الصفحات (Pagination) اليدوي للجدول
    const [rowsPerPage, setRowsPerPage] = useState<number>(100);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [rowActionLoadingId, setRowActionLoadingId] = useState<string | null>(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [globalSearch, dateFrom, dateTo, filterAccountId, filterPartnerId, filterVType, filterStatus, rowsPerPage]);

    // 🟢 السحب من السيرفر (بيسحب الداتا 1000 بـ 1000 عشان Supabase ميقفلش الطلب)
    const { data: journalMaster = [], isLoading, isError } = useQuery({
        queryKey: ['journal_master_view', dateFrom, dateTo, filterAccountId, filterPartnerId, filterVType, filterStatus], 
        queryFn: async () => {
            const allData: any[] = [];
            const seenIds = new Set<string>(); // 🛡️ حماية من التكرار
            const step = 1000; // 🟢 الرقم ده ثابت عشان Supabase بيرفض يبعت أكتر منه في المرة
            let from = 0; 
            let hasMore = true;
            let loopGuard = 0;

            // 🟢 يقدر يسحب لحد 50 مرة (يعني 50 ألف سطر)
            while (hasMore && loopGuard < 50) {
                loopGuard++;
                let query = supabase
                    .from('journal_master_view') 
                    .select('*')
                    .order('entry_date', { ascending: false })
                    .order('line_created_at', { ascending: false })
                    .order('line_id', { ascending: false }) // 🚀 تم إضافته هنا لضمان استقرار الترتيب وعدم سقوط أو تكرار أي مبالغ محاسبية
                    .range(from, from + step - 1);
                
                if (dateFrom) query = query.gte('entry_date', dateFrom);
                if (dateTo) query = query.lte('entry_date', dateTo);
                if (filterAccountId) query = query.eq('account_id', filterAccountId);
                if (filterPartnerId) query = query.eq('partner_id', filterPartnerId);
                
                if (filterStatus === 'معتمد') query = query.eq('header_status', 'معتمد');
                if (filterStatus === 'مسودة') query = query.eq('header_status', 'draft');
                if (filterVType && filterVType !== 'الكل') query = query.eq('v_type', filterVType);

                if (filterStatus === 'غير متزن') {
                     // نقوم بجلب القيود غير المتزنة عبر استعلام مباشر:
                     const { data: headersData } = await supabase.from('journal_headers').select('id, total_debit, total_credit');
                     if (headersData) {
                         const unbalancedIds = headersData.filter(h => h.total_debit !== h.total_credit).map(h => h.id);
                         if (unbalancedIds.length > 0) {
                             query = query.in('header_id', unbalancedIds);
                         } else {
                             // لا توجد قيود غير متزنة
                             query = query.eq('header_id', '00000000-0000-0000-0000-000000000000'); 
                         }
                     }
                }

                const { data, error } = await query;
                if (error) throw error;

                if (data && data.length > 0) {
                    // 🛡️ إضافة فقط الأسطر الغير مكررة
                    for (const row of data) {
                        const id = String(row.line_id);
                        if (!seenIds.has(id)) {
                            seenIds.add(id);
                            allData.push(row);
                        }
                    }
                    from += step;
                    
                    if (data.length < step) {
                        hasMore = false; 
                    }
                } else {
                    hasMore = false;
                }
            }
            return allData;
        },
        staleTime: 60 * 1000 
    });

    const displayedLines = useMemo(() => {
        if (!deferredSearch) return journalMaster; 
        const lower = deferredSearch.toLowerCase();
        return journalMaster.filter(r => 
            (r.line_notes && String(r.line_notes).toLowerCase().includes(lower)) ||
            (r.header_description && String(r.header_description).toLowerCase().includes(lower)) ||
            (r.account_name && String(r.account_name).toLowerCase().includes(lower)) ||
            (r.partner_name && String(r.partner_name).toLowerCase().includes(lower))
        );
    }, [journalMaster, deferredSearch]);

    // 🧮 محرك الحسابات الجبار
    const totals = useMemo(() => {
        let td = 0;
        let tc = 0;
        
        displayedLines.forEach(line => {
            const debitStr = String(line.debit || 0).replace(/[^\d.-]/g, '');
            const creditStr = String(line.credit || 0).replace(/[^\d.-]/g, '');
            
            const d = parseFloat(debitStr);
            const c = parseFloat(creditStr);
            
            td += isNaN(d) ? 0 : d;
            tc += isNaN(c) ? 0 : c;
        });
        
        return { totalDebit: td, totalCredit: tc, balance: td - tc, count: displayedLines.length };
    }, [displayedLines]);

    const paginatedLines = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return displayedLines.slice(start, end);
    }, [displayedLines, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(displayedLines.length / rowsPerPage) || 1;

    const deleteHeadersMutation = useMutation({
        mutationFn: async () => {
            const selectedLines = journalMaster.filter(l => selectedIds.includes(String(l.line_id)));
            const invalidStatusLines = selectedLines.filter(l => l.header_status !== 'مسودة');
            if (invalidStatusLines.length > 0) {
                 throw new Error('مرفوض ⛔: لا يمكن مسح قيد حالته "مرحل" أو "معتمد". يجب فك الترحيل أولاً.');
            }

            const headerIds = [...new Set(selectedLines.map(l => l.header_id))];

            if (headerIds.length === 0) throw new Error('لم يتم تحديد أي قيود صالحة.');
            const { error } = await supabase.from('journal_headers').delete().in('id', headerIds);
            if (error) throw error;
        },
        onSuccess: () => {
            showToast('تم حذف القيود وارتباطاتها بنجاح 🗑️', 'success');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
        },
        onError: (err: any) => showToast(`فشل في الحذف: ${err.message}`, 'error')
    });

    const { data: pendingJournalsCount = 0 } = useQuery({
        queryKey: ['pending_journals_count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('journal_headers')
                .select('*', { count: 'exact', head: true })
                .in('status', ['draft', 'pending', 'مسودة', 'غير مرحل']);
            if (error) return 0;
            return count || 0;
        },
        staleTime: 30000
    });

    // كاشف الفلترة النشطة
    const isFiltered = !!(filterAccountId || filterPartnerId || dateFrom || dateTo || (filterStatus !== 'الكل') || (filterVType !== 'الكل'));

    return {
        isLoading, isError,
        globalSearch, setGlobalSearch, 
        dateFrom, setDateFrom, dateTo, setDateTo,
        filterAccountId, setFilterAccountId,
        filterPartnerId, setFilterPartnerId,
        filterVType, setFilterVType,
        filterStatus, setFilterStatus,
        rowsPerPage, setRowsPerPage, 
        currentPage, setCurrentPage, totalPages,
        paginatedLines, 
        totals,
        pendingJournalsCount,
        selectedIds, setSelectedIds,
        isFiltered,
        handleBulkPostDrafts: async () => {
            if (!confirm(`هل أنت متأكد من اعتماد وترحيل كافة القيود اليومية المسودة (${pendingJournalsCount}) دفعة واحدة؟`)) return;
            try {
                const { error } = await supabase
                    .from('journal_headers')
                    .update({ status: 'posted' })
                    .in('status', ['draft', 'pending', 'مسودة', 'غير مرحل']);
                if (error) throw error;
                showToast('✅ تم اعتماد وترحيل كافة القيود المسودة بنجاح!', 'success');
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
                queryClient.invalidateQueries({ queryKey: ['pending_journals_count'] });
            } catch (err: any) {
                showToast(`❌ فشل الترحيل الجماعي: ${err.message}`, 'error');
            }
        },
        handleDeleteHeaders: () => {
            if (confirm('تنبيه: سيتم حذف القيود المحددة بالكامل (مدين ودائن). هل أنت متأكد؟')) {
                deleteHeadersMutation.mutate();
            }
        },
        rowActionLoadingId,
        handlePostSingleHeader: async (headerId: string) => {
            if (!headerId) return;
            setRowActionLoadingId(headerId);
            try {
                const { error } = await supabase
                    .from('journal_headers')
                    .update({ status: 'posted' })
                    .eq('id', headerId);
                if (error) throw error;
                showToast('✅ تم اعتماد وترحيل القيد بنجاح!', 'success');
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
                queryClient.invalidateQueries({ queryKey: ['pending_journals_count'] });
            } catch (err: any) {
                showToast(`❌ فشل ترحيل القيد: ${err.message}`, 'error');
            } finally {
                setRowActionLoadingId(null);
            }
        },
        handleUnpostSingleHeader: async (headerId: string) => {
            if (!headerId) return;
            setRowActionLoadingId(headerId);
            try {
                const { error } = await supabase
                    .from('journal_headers')
                    .update({ status: 'draft' })
                    .eq('id', headerId);
                if (error) throw error;
                showToast('↩️ تم فك ترحيل القيد وإعادته لمسودة!', 'success');
                queryClient.invalidateQueries({ queryKey: ['journal_master_view'] });
                queryClient.invalidateQueries({ queryKey: ['pending_journals_count'] });
            } catch (err: any) {
                showToast(`❌ فشل فك الترحيل: ${err.message}`, 'error');
            } finally {
                setRowActionLoadingId(null);
            }
        }
    };
}

// ==========================================
// 🎨 الواجهة (UI) السيادية
// ==========================================
export default function JournalPage() {
  const logic = useJournalLogic();
  const { can, loading: permsLoading } = usePermissions();

  const columns = useMemo(() => [
    { 
      header: 'التاريخ / القيد', 
      accessor: 'date', 
      render: (row: any) => {
        if (!row) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#64748b', fontWeight: 900 }}>{row.entry_date}</span>
            <span style={{ fontSize: '10px', color: '#475569' }}>#{row.reference_id?.split('-')[0] || row.header_id?.split('-')[0]}</span>
          </div>
        );
      } 
    },
    { 
      header: 'الحساب المحاسبي', 
      accessor: 'account_name', 
      render: (row: any) => {
        if (!row) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <b style={{ color: THEME.primary, fontSize: '13px' }}>{row.account_name || '---'}</b>
            <span style={{ fontSize: '11px', color: '#64748b' }}>{row.account_code || ''}</span>
          </div>
        );
      } 
    },
    { 
      header: 'الشريك', 
      accessor: 'partner_name', 
      render: (row: any) => {
        if (!row) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, color: '#334155' }}>{row.partner_name || '---'}</span>
          </div>
        );
      } 
    },
    { 
      header: 'البيان / الوصف', 
      accessor: 'header_description', 
      render: (row: any) => {
        if (!row) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '300px' }}>
            <span style={{ color: '#1e293b', fontWeight: 800, fontSize: '12px' }}>{row.header_description}</span>
            {row.line_notes && <span style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>* {row.line_notes}</span>}
          </div>
        );
      } 
    },
    { 
      header: 'مدين 🟢', 
      accessor: 'debit', 
      render: (row: any) => row && row.debit > 0 ? <span style={{ fontWeight: 900, color: '#059669', fontSize: '14px' }}>{formatCurrency(row.debit)}</span> : '-' 
    },
    { 
      header: 'دائن 🔴', 
      accessor: 'credit', 
      render: (row: any) => row && row.credit > 0 ? <span style={{ fontWeight: 900, color: '#dc2626', fontSize: '14px' }}>{formatCurrency(row.credit)}</span> : '-' 
    },
    {
      header: 'الحالة',
      accessor: 'header_status',
      render: (row: any) => {
        if (!row) return null;
        return row.header_status === 'معتمد' ? 
          <span className="badge-glass green">معتمد ✅</span> : 
          <span className="badge-glass yellow">مسودة ⏳</span>;
      }
    },
    {
      header: 'الإجراءات',
      accessor: 'actions',
      render: (row: any) => {
        if (!row || !row.header_id) return null;
        const isPosted = row.header_status === 'معتمد';
        const isLoading = logic.rowActionLoadingId === row.header_id;
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
            <SecureAction module="journal" action="post">
              {isPosted ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    logic.handleUnpostSingleHeader(row.header_id);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.2) 100%)',
                    color: '#b45309',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    cursor: isLoading ? 'wait' : 'pointer',
                    fontWeight: 900,
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    opacity: isLoading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(245, 158, 11, 0.15)';
                  }}
                  title="فك ترحيل هذا القيد وإعادته لمسودة"
                >
                  <span>{isLoading ? '⏳' : '↩️'}</span>
                  <span>{isLoading ? 'جاري الفك...' : 'فك الترحيل'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    logic.handlePostSingleHeader(row.header_id);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    cursor: isLoading ? 'wait' : 'pointer',
                    fontWeight: 900,
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    opacity: isLoading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.45)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                  title="اعتماد وترحيل هذا القيد"
                >
                  <span>{isLoading ? '⏳' : '🚀'}</span>
                  <span>{isLoading ? 'جاري الترحيل...' : 'ترحيل'}</span>
                </button>
              )}
            </SecureAction>
          </div>
        );
      }
    }
  ], [logic.rowActionLoadingId, logic.handlePostSingleHeader, logic.handleUnpostSingleHeader]);

  const sidebarActions = useMemo(() => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <button 
        className="btn-main-glass" 
        onClick={() => window.print()}
        style={{ background: THEME.accent, color: 'white', borderColor: THEME.accent }}
      >
        🖨️ طباعة التقرير
      </button>

      {logic.selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
          <p style={{fontSize:'11px', textAlign:'center', color:'#475569', fontWeight:900, margin:0}}>تم تحديد ({logic.selectedIds.length}) سطر من الدفتر</p>
          <SecureAction module="journal" action="delete">
            <button className="btn-main-glass red" onClick={logic.handleDeleteHeaders}>🗑️ حذف القيود المحددة نهائياً</button>
          </SecureAction>
        </div>
      )}
    </div>
  ), [logic.selectedIds.length, logic.handleDeleteHeaders]); 

  return (
    <div className="clean-page">
      <MasterPage icon="📓" title="دفتر اليومية الشامل 📓" subtitle="استعلام شامل وسريع جداً مع تقسيم يدوي للصفحات لمنع التهنيج.">
          
          <RawasiSidebarManager 
            summary={
              <div className="summary-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي المدين 🟢</span>
                  <div style={{fontSize:'18px', fontWeight:900, color: '#059669'}}>
                    {formatCurrency(logic.totals.totalDebit)}
                  </div>
                </div>
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: '10px' }}>
                  <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي الدائن 🔴</span>
                  <div style={{fontSize:'18px', fontWeight:900, color: '#dc2626'}}>
                    {formatCurrency(logic.totals.totalCredit)}
                  </div>
                </div>
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: '10px', background: logic.totals.balance !== 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <span style={{fontSize:'12px', fontWeight:800, color: logic.totals.balance !== 0 ? '#d97706' : '#059669'}}>
                     {logic.isFiltered ? 'صافي رصيد الفلترة 📊' : (logic.totals.balance === 0 ? 'متزن ⚖️' : (logic.totals.balance > 0 ? 'رصيد مدين' : 'رصيد دائن'))}
                  </span>
                  <div style={{fontSize:'20px', fontWeight:900, color: logic.totals.balance !== 0 ? '#d97706' : '#059669'}}>
                    {formatCurrency(Math.abs(logic.totals.balance))}
                  </div>
                </div>
              </div>
            }
            actions={sidebarActions}
            customFilters={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                
                <div>
                    <label className="filter-label">⚙️ عدد الصفوف في الصفحة (للجدول)</label>
                    <select 
                        value={logic.rowsPerPage} 
                        onChange={(e) => logic.setRowsPerPage(Number(e.target.value))} 
                        className="filter-input-glass custom-select"
                    >
                        <option value={50}>50 صف / صفحة</option>
                        <option value={100}>100 صف / صفحة</option>
                        <option value={500}>500 صف / صفحة</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                        <label className="filter-label">📅 من تاريخ</label>
                        <input type="date" value={logic.dateFrom} onChange={e => logic.setDateFrom(e.target.value)} className="filter-input-glass" />
                    </div>
                    <div>
                        <label className="filter-label">📅 إلى تاريخ</label>
                        <input type="date" value={logic.dateTo} onChange={e => logic.setDateTo(e.target.value)} className="filter-input-glass" />
                    </div>
                </div>

                <div style={{ zIndex: 100 }}>
                    <SmartCombo 
                        label="البحث برقم / اسم الحساب" 
                        table="accounts"
                        displayCol="name"
                        initialDisplay="" 
                        onSelect={(v:any) => logic.setFilterAccountId(v?.id || null)} 
                    />
                </div>

                <div style={{ zIndex: 90 }}>
                    <SmartCombo 
                        label="البحث باسم الشريك (مورد/عميل/عامل)" 
                        table="partners"
                        displayCol="name"
                        initialDisplay="" 
                        onSelect={(v:any) => logic.setFilterPartnerId(v?.id || null)} 
                    />
                </div>

                <div>
                  <label className="filter-label">تصفية حسب نوع القيد</label>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {['الكل', 'يدوي', 'مصروف', 'إيراد', 'صرف', 'قبض', 'توريد', 'تسوية'].map(type => (
                      <button 
                        key={type} 
                        onClick={() => logic.setFilterVType(type)} 
                        className={`filter-btn ${logic.filterVType === type ? 'active' : ''}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="filter-label">تصفية حسب الحالة</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {['الكل', 'معتمد', 'مسودة', 'غير متزن'].map(type => (
                      <button 
                        key={type} 
                        onClick={() => logic.setFilterStatus(type)} 
                        className={`filter-btn ${logic.filterStatus === type ? 'active' : ''}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            }
            onSearch={(val) => logic.setGlobalSearch(val)} 
            watchDeps={[logic.selectedIds.length, logic.totals.balance, logic.filterStatus, logic.filterVType, logic.dateFrom, logic.dateTo, logic.filterAccountId, logic.filterPartnerId, logic.rowsPerPage, logic.globalSearch]}
          />

          <style>{`
            .btn-main-glass { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.8); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .btn-main-glass.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
            .btn-main-glass:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.1); }
            
            .summary-glass-card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.9); margin-bottom: 25px; box-shadow: 0 4px 15px rgba(28, 115, 171, 0.05); }
            
            .filter-label { color: #122946; fontSize: 11px; font-weight: 900; display: block; margin-bottom: 8px; }
            .filter-input-glass { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(28, 115, 171, 0.2); background: white; color: #122946; outline: none; font-family: inherit; font-weight: 800; font-size: 13px; transition: 0.3s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
            .filter-input-glass:focus { border-color: #1C73AB; box-shadow: 0 0 0 3px rgba(28, 115, 171, 0.1); }
            .filter-input-glass::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
            .filter-input-glass::-webkit-calendar-picker-indicator:hover { opacity: 1; }
            
            .custom-select { appearance: auto; cursor: pointer; }
            .custom-select option { background: white; color: #122946; font-weight: 900; }

            .filter-btn { flex: 1; padding: 10px; border-radius: 10px; background: white; color: #1C73AB; border: 1px solid rgba(28, 115, 171, 0.2); font-weight: 900; cursor: pointer; font-size: 11px; transition: 0.3s; }
            .filter-btn.active { background: #1C73AB; color: white; box-shadow: 0 4px 10px rgba(28, 115, 171, 0.2); border-color: #1C73AB; }
            
            .badge-glass { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-block; }
            .badge-glass.green { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
            .badge-glass.yellow { background: #fff7ed; color: #d97706; border: 1px solid #fde68a; }
            
            .pagination-container { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.6); border-radius: 16px; border: 1px solid white; box-shadow: 0 4px 15px rgba(28, 115, 171, 0.05); }
            .btn-pagination { background: white; color: #1C73AB; border: 1px solid rgba(28, 115, 171, 0.2); padding: 10px 20px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.3s; }
            .btn-pagination:hover:not(:disabled) { background: #1C73AB; color: white; border-color: #1C73AB; }
            .btn-pagination:disabled { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; }
          `}</style>

          {(logic.isLoading || permsLoading) ? (
            <LoadingScreen message="جاري سحب البيانات (دفعات 1000 سطر)..." fullScreen={false} />
          ) : logic.isError ? (
            <div style={{ textAlign: 'center', padding: '100px', fontWeight: 900, color: '#ef4444' }}>
              ❌ حدث خطأ في الاتصال بقاعدة البيانات.
            </div>
          ) : (
            <>
              {logic.pendingJournalsCount > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(255, 237, 213, 0.95) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 900, color: '#92400e', fontSize: '14px' }}>
                        تنبيه القيود: يوجد ({logic.pendingJournalsCount}) قيد يومية مسودة / قيد الانتظار لم يتم ترحيلها بعد!
                      </div>
                      <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>
                        القيود المسودة لا تؤثر على الأرصدة الختامية حتى يتم ترحيلها.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={logic.handleBulkPostDrafts}
                      style={{
                        background: 'linear-gradient(135deg, #16a34a, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        fontWeight: 900,
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                        transition: '0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>⚡</span>
                      <span>ترحيل جميع المسودات ({logic.pendingJournalsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => logic.setFilterStatus(logic.filterStatus === 'مسودة' ? 'الكل' : 'مسودة')}
                      style={{
                        background: logic.filterStatus === 'مسودة' ? '#d97706' : '#ea580c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)',
                        transition: '0.2s'
                      }}
                    >
                      {logic.filterStatus === 'مسودة' ? 'عرض كافة القيود' : '🔍 استعراض المعلقة فقط'}
                    </button>
                  </div>
                </div>
              )}
              <PrintHeader title="دفتر اليومية الشامل" subtitle={logic.isFiltered ? "تقرير مفلتر" : "تقرير عام"} />
              <RawasiSmartTable 
                  data={logic.paginatedLines} 
                  columns={columns} 
                  selectable={true}
                  selectedIds={logic.selectedIds}
                  onSelectionChange={logic.setSelectedIds}
                  enablePagination={false} 
                  rowKey="line_id" 
              />
              
              {logic.totals.count > 0 && (
                <div className="pagination-container">
                    <button 
                        className="btn-pagination" 
                        onClick={() => logic.setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={logic.currentPage === 1}
                    >\
                        ◀️ السابق
                    </button>
                    
                    <span style={{ color: '#475569', fontWeight: 800, fontSize: '13px' }}>
                        صفحة <b style={{color: 'white'}}>{logic.currentPage}</b> من <b style={{color: 'white'}}>{logic.totalPages}</b> 
                        <span style={{margin: '0 10px'}}>|</span> 
                        إجمالي <b style={{color: THEME.goldAccent}}>{logic.totals.count}</b> سطر
                    </span>

                    <button 
                        className="btn-pagination" 
                        onClick={() => logic.setCurrentPage(p => Math.min(logic.totalPages, p + 1))} 
                        disabled={logic.currentPage === logic.totalPages}
                    >
                        التالي ▶️
                    </button>
                </div>
              )}
            </>
          )}
      </MasterPage>
    </div>
  );
}
