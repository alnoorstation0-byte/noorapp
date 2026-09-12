"use client";
import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const PermissionsMatrix = dynamic(() => import('./PermissionsMatrix'), { 
  loading: () => <div style={{ textAlign: 'center', padding: '40px', fontWeight: 800, color: '#1C73AB' }}>⏳ جاري تحميل مصفوفة الصلاحيات...</div>,
  ssr: false 
});

const SystemHealthRadar = dynamic(() => import('./SystemHealthRadar'), { 
  loading: () => <div style={{ textAlign: 'center', padding: '40px', fontWeight: 800, color: '#1C73AB' }}>⏳ جاري فحص سلامة النظام...</div>,
  ssr: false 
});

const AuditLogs = dynamic(() => import('./AuditLogs'), { 
  loading: () => <div style={{ textAlign: 'center', padding: '40px', fontWeight: 800, color: '#1C73AB' }}>⏳ جاري تحميل سجل المراقبة...</div>,
  ssr: false 
});
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import MasterPage from '@/components/MasterPage';
import GlassContainer from '@/components/GlassContainer';
import { THEME } from '@/lib/theme'; 
import { useToast } from '@/lib/toast-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  SYSTEM_TABLES,
  exportToProfessionalExcel,
  exportToSQL,
  restoreUnifiedFile,
  clearTransactionsOnly,
  fullFactoryReset
} from '@/lib/backupRestoreEngine';
import { emitTableChange } from '@/lib/useRealtimeSync';

// تجميع الجداول حسب الموديول للعرض
const TABLE_GROUPS = [
  {
    name: "🛒 المبيعات ونقاط البيع والتشغيل",
    tables: SYSTEM_TABLES.filter(t => t.group === '🛒 المبيعات والتشغيل')
  },
  {
    name: "💰 المالية والحسابات العامة",
    tables: SYSTEM_TABLES.filter(t => t.group === '💰 المالية والمحاسبة')
  },
  {
    name: "📦 المخزون والمستودعات والأسطول",
    tables: SYSTEM_TABLES.filter(t => t.group === '📦 المخزون والأسطول')
  },
  {
    name: "👥 الشركاء والموارد البشرية والإعدادات",
    tables: SYSTEM_TABLES.filter(t => t.group === '👥 الشركاء والموارد البشرية' || t.group === '⚙️ إعدادات النظام')
  }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('backup'); 
  const [selectedTables, setSelectedTables] = useState<string[]>(SYSTEM_TABLES.map(t => t.id));
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' }); 

  // نوافذ التأكيد الأمنية
  const [confirmModalType, setConfirmModalType] = useState<'clear' | 'factory' | null>(null);
  const [confirmInputText, setConfirmInputText] = useState('');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // تبديل اختيار جدول
  const toggleTable = (id: string) => {
    setSelectedTables(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // اختيار/إلغاء مجموعة
  const selectGroup = (tableIds: string[]) => {
    const allSelected = tableIds.every(id => selectedTables.includes(id));
    if (allSelected) {
      setSelectedTables(prev => prev.filter(id => !tableIds.includes(id))); 
    } else {
      setSelectedTables(prev => Array.from(new Set([...prev, ...tableIds]))); 
    }
  };

  // تحديد الكل / إلغاء الكل
  const selectAllTables = () => {
    if (selectedTables.length === SYSTEM_TABLES.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(SYSTEM_TABLES.map(t => t.id));
    }
  };

  // تحديد العمليات فقط
  const selectTransactionsOnly = () => {
    setSelectedTables(SYSTEM_TABLES.filter(t => !t.isMaster).map(t => t.id));
  };

  // تحديد الأساسيات فقط
  const selectMasterOnly = () => {
    setSelectedTables(SYSTEM_TABLES.filter(t => t.isMaster).map(t => t.id));
  };

  // تنفيذ تصدير الـ Excel الاحترافي
  const handleExportExcel = async () => {
    if (selectedTables.length === 0) {
      showToast('⚠️ يرجى تحديد جدول واحد على الأقل للتصدير!', 'warning');
      return;
    }
    setIsProcessing(true);
    setStatusMsg({ text: '⏳ جاري تجميع البيانات وتجهيز ملف Excel الاحترافي...', type: 'loading' });
    try {
      const res = await exportToProfessionalExcel(selectedTables, (msg) => {
        setStatusMsg({ text: msg, type: 'loading' });
      });
      if (res.success) {
        showToast('✅ تم تصدير تقرير Excel الشامل بنجاح!', 'success');
        setStatusMsg({ text: '✅ تم تحميل ملف Excel بنجاح', type: 'success' });
      } else {
        showToast('❌ فشل التصدير: ' + (res.error || 'حدث خطأ'), 'error');
        setStatusMsg({ text: '❌ ' + (res.error || 'حدث خطأ'), type: 'error' });
      }
    } catch (e: any) {
      showToast('❌ حدث خطأ: ' + e.message, 'error');
      setStatusMsg({ text: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // تنفيذ تصدير الـ SQL
  const handleExportSQL = async () => {
    if (selectedTables.length === 0) {
      showToast('⚠️ يرجى تحديد جدول واحد على الأقل للتصدير!', 'warning');
      return;
    }
    setIsProcessing(true);
    setStatusMsg({ text: '⏳ جاري كتابة سكريبت SQL المتكامل (PostgreSQL)...', type: 'loading' });
    try {
      const res = await exportToSQL(selectedTables, (msg) => {
        setStatusMsg({ text: msg, type: 'loading' });
      });
      if (res.success) {
        showToast('✅ تم تصدير سكريبت SQL بنجاح!', 'success');
        setStatusMsg({ text: '✅ تم تحميل سكريبت SQL بنجاح', type: 'success' });
      } else {
        showToast('❌ فشل تصدير SQL: ' + (res.error || 'حدث خطأ'), 'error');
        setStatusMsg({ text: '❌ ' + (res.error || 'حدث خطأ'), type: 'error' });
      }
    } catch (e: any) {
      showToast('❌ حدث خطأ: ' + e.message, 'error');
      setStatusMsg({ text: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // تنفيذ الاستعادة الذكية (يقبل Excel أو SQL تلقائياً)
  const handleConfirmRestore = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setStatusMsg({ text: '⏳ جاري قراءة الملف وتجهيز الاستعادة الذكية...', type: 'loading' });

    try {
      const res = await restoreUnifiedFile(selectedFile, (msg) => {
        setStatusMsg({ text: msg, type: 'loading' });
      });

      if (res.success) {
        showToast('✨ تمت استعادة ' + res.totalRestored + ' سجل بنجاح!', 'success');
        setStatusMsg({ text: '✅ تمت استعادة ' + res.totalRestored + ' سجل بنجاح!', type: 'success' });
        setSelectedFile(null);
        queryClient.invalidateQueries();
      } else {
        showToast('❌ فشلت الاستعادة: ' + (res.error || 'حدث خطأ'), 'error');
        setStatusMsg({ text: '❌ ' + (res.error || 'حدث خطأ'), type: 'error' });
      }
    } catch (err: any) {
      showToast('❌ فشل: ' + err.message, 'error');
      setStatusMsg({ text: '❌ ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // تنفيذ مسح القيود فقط
  const handleExecuteClearTransactions = async () => {
    if (confirmInputText.trim() !== 'مسح القيود') {
      showToast('⚠️ النص المدخل غير متطابق!', 'warning');
      return;
    }

    setIsProcessing(true);
    setConfirmModalType(null);
    setStatusMsg({ text: '🧹 جاري مسح كافة القيود والعمليات وتصفير الحركات...', type: 'loading' });

    try {
      const res = await clearTransactionsOnly((msg) => setStatusMsg({ text: msg, type: 'loading' }));
      if (res.success) {
        showToast('✅ تم مسح جميع القيود وسجل الورديات وأوامر تشغيل الرحلات وتصفير الأرصدة بنجاح!', 'success');
        setStatusMsg({ text: '✅ تم مسح القيود وسجل الورديات وأوامر تشغيل الرحلات وتصفير الحركات بنجاح.', type: 'success' });
        
        // ⚡ بث التحديثات اللحظية وإبطال الكاش لكافة الشاشات
        emitTableChange('pos_shifts');
        emitTableChange('fleet_operations');
        emitTableChange('invoices');
        emitTableChange('receipt_vouchers');
        emitTableChange('payment_vouchers');
        emitTableChange('expenses');
        emitTableChange('inventory_transactions');
        emitTableChange('warehouse_inventory');
        emitTableChange('vehicle_inventory');
        emitTableChange('journal_headers');

        queryClient.invalidateQueries();
      } else {
        showToast('❌ خطأ: ' + (res.error || 'حدث خطأ'), 'error');
        setStatusMsg({ text: '❌ ' + (res.error || 'حدث خطأ'), type: 'error' });
      }
    } catch (e: any) {
      showToast('❌ فشل: ' + e.message, 'error');
    } finally {
      setIsProcessing(false);
      setConfirmInputText('');
    }
  };

  // تنفيذ ضبط المصنع الشامل
  const handleExecuteFactoryReset = async () => {
    if (confirmInputText.trim() !== 'ضبط المصنع') {
      showToast('⚠️ النص المدخل غير متطابق!', 'warning');
      return;
    }

    setIsProcessing(true);
    setConfirmModalType(null);
    setStatusMsg({ text: '⚠️ جاري تنفيذ إعادة ضبط المصنع الشاملة للنظام...', type: 'loading' });

    try {
      const res = await fullFactoryReset((msg) => setStatusMsg({ text: msg, type: 'loading' }));
      if (res.success) {
        showToast('🚀 تمت إعادة ضبط المصنع بنجاح! النظام الآن نظيف ومهيأ كأول يوم عمل.', 'success');
        setStatusMsg({ text: '✅ تمت إعادة ضبط المصنع الشاملة بنجاح.', type: 'success' });
        queryClient.invalidateQueries();
      } else {
        showToast('❌ خطأ: ' + (res.error || 'حدث خطأ'), 'error');
        setStatusMsg({ text: '❌ ' + (res.error || 'حدث خطأ'), type: 'error' });
      }
    } catch (e: any) {
      showToast('❌ فشل: ' + e.message, 'error');
    } finally {
      setIsProcessing(false);
      setConfirmInputText('');
    }
  };

  const selectedCount = selectedTables.length;

  // إعداد محتويات السايد بار
  const sidebarContent = useMemo(() => {
    let summary = null;
    let actions = null;

    if (activeTab === 'backup') {
      summary = (
        <div className="sidebar-summary-glass">
          <div className="icon-pulse">📦</div>
          <p className="summary-title">الجداول المحددة للتصدير</p>
          <h3 className="summary-value">{selectedCount} / {SYSTEM_TABLES.length}</h3>
        </div>
      );
      actions = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={handleExportExcel} 
            disabled={selectedCount === 0 || isProcessing}
            className={`btn-premium-glass excel ${selectedCount === 0 ? 'disabled' : ''}`}
          >
            <span className="btn-icon">📊</span> تصدير Excel (تقرير احترافي)
          </button>
          <button 
            onClick={handleExportSQL} 
            disabled={selectedCount === 0 || isProcessing}
            className={`btn-premium-glass sql ${selectedCount === 0 ? 'disabled' : ''}`}
          >
            <span className="btn-icon">💾</span> تصدير سكريبت SQL (Postgres)
          </button>
        </div>
      );
    } else {
      summary = (
        <div className="sidebar-summary-glass info">
          <div className="icon-pulse">🛡️</div>
          <p className="summary-title" style={{color: '#1C73AB'}}>النظام محمي ومؤمن</p>
        </div>
      );
    }

    return { summary, actions };
  }, [activeTab, selectedCount, selectedTables, isProcessing]);

  return (
    <MasterPage icon="⚙️" title="إعدادات النظام والنسخ الاحتياطي" hideTitleOnMobile={true}>
      
      <RawasiSidebarManager 
        summary={sidebarContent.summary}
        actions={sidebarContent.actions}
        watchDeps={[activeTab, selectedCount, isProcessing]} 
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeUp 0.4s ease-out' }}>
        
        {/* التبويبات الرئيسية */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
            💾 النسخ الاحتياطي والاستعادة والتهيئة
          </button>
          <button className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => setActiveTab('permissions')}>
            🔐 مصفوفة الصلاحيات
          </button>
          <button className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`} onClick={() => setActiveTab('health')}>
            🛡️ سلامة النظام (الرادار)
          </button>
          <button className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            🕵️‍♂️ سجل المراقبة والعمليات
          </button>
        </div>

        {activeTab === 'permissions' && <PermissionsMatrix />}
        {activeTab === 'health' && <SystemHealthRadar />}
        {activeTab === 'audit' && <AuditLogs />}

        {activeTab === 'backup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* القسم العلوي: تصدير واستيراد البيانات */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 2fr) minmax(280px, 1fr)', gap: '25px', alignItems: 'start' }}>
              
              {/* صندوق تصدير الجداول */}
              <GlassContainer>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid rgba(255, 255, 255, 0.5)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontSize: '17px', color: THEME.primary, margin: '0 0 4px 0', fontWeight: 900 }}>
                      📦 تصدير النسخ الاحتياطية والتقارير
                    </h2>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                      حدد الجداول المراد استخراجها كتقرير Excel احترافي منسق أو كسكريبت SQL.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={selectAllTables} className="btn-action-small">
                      {selectedCount === SYSTEM_TABLES.length ? 'إلغاء التحديد' : 'تحديد كل الجداول'}
                    </button>
                    <button onClick={selectTransactionsOnly} className="btn-action-small">
                      العمليات فقط
                    </button>
                    <button onClick={selectMasterOnly} className="btn-action-small">
                      الأساسيات فقط
                    </button>
                  </div>
                </div>

                <div className="cinematic-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
                  {TABLE_GROUPS.map((group, gIdx) => (
                    <div key={gIdx} className="group-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(40, 145, 200, 0.15)', paddingBottom: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '13px', color: THEME.primary, fontWeight: 900 }}>{group.name}</h3>
                        <button onClick={() => selectGroup(group.tables.map(t => t.id))} className="link-btn">
                          {group.tables.every(t => selectedTables.includes(t.id)) ? 'إلغاء' : 'تحديد المجموعة'}
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {group.tables.map(table => (
                          <div key={table.id} className={`table-row ${selectedTables.includes(table.id) ? 'selected' : ''}`}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: '#334155', flex: 1 }}>
                              <input 
                                type="checkbox" 
                                className="custom-checkbox" 
                                checked={selectedTables.includes(table.id)} 
                                onChange={() => toggleTable(table.id)} 
                              />
                              {table.name}
                            </label>
                            {table.isMaster && (
                              <span className="badge-master" title="جدول أساسي Master Data">أساسي</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* أزرار سريعة داخل البطاقة للشاشات المتجاوبة */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(40,145,200,0.15)' }}>
                  <button 
                    onClick={handleExportExcel} 
                    disabled={selectedCount === 0 || isProcessing}
                    style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    📊 تصدير Excel احترافي
                  </button>
                  <button 
                    onClick={handleExportSQL} 
                    disabled={selectedCount === 0 || isProcessing}
                    style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #1C73AB, #2891C8)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    💾 تصدير سكريبت SQL
                  </button>
                </div>
              </GlassContainer>

              {/* صندوق استعادة البيانات الموحد (يدعم Excel و SQL) */}
              <GlassContainer>
                <h3 style={{ margin: '0 0 5px 0', color: THEME.primary, fontWeight: 900, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔄</span> استعادة البيانات الذكية (Restore)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px 0', fontWeight: 700, lineHeight: 1.5 }}>
                  ارفع ملف النسخة الاحتياطية سواء كان ملف <strong>Excel (.xlsx)</strong> أو ملف <strong>SQL (.sql)</strong>، وسيقوم المحرك باستعادته آلياً.
                </p>
                
                <label className={`premium-dropzone ${selectedFile ? 'has-file' : ''} ${isProcessing ? 'uploading' : ''}`}>
                  {isProcessing ? (
                    <div style={{ width: '100%', padding: '20px 0' }}>
                      <div className="loading-spinner">⚙️</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginTop: '10px' }}>
                        {statusMsg.text || 'جاري معالجة واستعادة البيانات...'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '38px' }}>{selectedFile ? '📑' : '📂'}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: selectedFile ? '#059669' : THEME.primary, marginBottom: '4px' }}>
                          {selectedFile ? selectedFile.name : 'اسحب أو اختر ملف النسخة'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>
                          {selectedFile ? `الحجم: ${(selectedFile.size / 1024).toFixed(1)} KB` : 'يدعم صيغ .xlsx أو .sql'}
                        </div>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.sql" 
                    disabled={isProcessing}
                    onChange={(e) => { 
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setStatusMsg({ text: '', type: '' }); 
                      } 
                    }} 
                    style={{ display: 'none' }} 
                  />
                </label>

                {statusMsg.text && (
                  <div className={`status-alert ${statusMsg.type}`}>
                    {statusMsg.text}
                  </div>
                )}

                {selectedFile && !isProcessing && (
                  <button onClick={handleConfirmRestore} className="btn-premium-upload">
                    🚀 بدء استعادة وترحيل البيانات
                  </button>
                )}

                <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(40,145,200,0.2)', padding: '12px 15px', borderRadius: '12px', marginTop: '20px' }}>
                  <div style={{ color: THEME.primary, fontWeight: 900, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>💡</span> مميزات الاستعادة الذكية
                  </div>
                  <ul style={{ fontSize: '11px', color: '#475569', margin: '6px 0 0 0', paddingRight: '18px', lineHeight: 1.6, fontWeight: 700 }}>
                    <li>يتعرف آلياً على الملف سواء كان Excel أو SQL.</li>
                    <li>يطبق الحماية ضد التكرار (Upsert) لمنع ازدواجية المعرفات.</li>
                    <li>يراعي ترتيب التبعيات لمنع أي تعارض في القيود.</li>
                  </ul>
                </div>
              </GlassContainer>

            </div>

            {/* ========================================================================= */}
            {/* 🚨 منطقة العمليات الحساسة وتصفير النظام (Aqua Glassmorphism Danger Zone)    */}
            {/* ========================================================================= */}
            <div className="danger-zone-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#991b1b' }}>
                    منطقة العمليات الحساسة وإعادة التهيئة
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>
                    تحكم دقيق لتنظيف النظام وتصفير الحركات قبل بدء دورة تشغيل جديدة.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* البطاقة الأولى: مسح القيود فقط */}
                <div className="danger-card warning-level">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: '#b45309' }}>
                      🧹 مسح القيود وتصفير الحركات
                    </div>
                    <span className="badge-safe">يحافظ على الأساسيات</span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#78350f', lineHeight: 1.5, margin: '0 0 15px 0', fontWeight: 700 }}>
                    يحذف الفواتير، سندات القبض والصرف، القيود المحاسبية، المصروفات، <strong>سجل الورديات (نقاط البيع)</strong>، <strong>أوامر تشغيل الرحلات (الأسطول)</strong>، والتدفقات، ويصفر أرصدة المخزون وعهد الفوارغ. <strong>ويحافظ تماماً</strong> على شجرة الحسابات، العملاء، الموردين، المستودعات، والأصناف.
                  </p>
                  <button 
                    onClick={() => { setConfirmModalType('clear'); setConfirmInputText(''); }}
                    className="btn-danger warning"
                    disabled={isProcessing}
                  >
                    🧹 مسح القيود وتصفير الحركات
                  </button>
                </div>

                {/* البطاقة الثانية: إعادة ضبط المصنع الشاملة */}
                <div className="danger-card critical-level">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: '#991b1b' }}>
                      🚨 إعادة ضبط المصنع الشاملة
                    </div>
                    <span className="badge-critical">إجراء كلي وحرج</span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#7f1d1d', lineHeight: 1.5, margin: '0 0 15px 0', fontWeight: 700 }}>
                    إعادة تهيئة كاملة للنظام كأول يوم تشغيل. يحذف كافة العمليات والبيانات المدخلة بما فيها العملاء والأصناف والسيارات الإضافية، مع الإبقاء فقط على حساب مدير النظام الحالي وشجرة الحسابات الأساسية.
                  </p>
                  <button 
                    onClick={() => { setConfirmModalType('factory'); setConfirmInputText(''); }}
                    className="btn-danger critical"
                    disabled={isProcessing}
                  >
                    🚨 إعادة ضبط المصنع الشاملة
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 🔒 نافذة التأكيد الأمني للعمليات الخطيرة                                   */}
      {/* ========================================================================= */}
      {confirmModalType && (
        <div className="security-modal-overlay">
          <div className="security-modal-card">
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>
              {confirmModalType === 'clear' ? '⚠️' : '🚨'}
            </div>
            
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: confirmModalType === 'clear' ? '#b45309' : '#dc2626' }}>
              {confirmModalType === 'clear' ? 'تأكيد مسح القيود وتصفير الحركات' : 'تأكيد إعادة ضبط المصنع الشاملة'}
            </h2>

            <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 15px 0', fontWeight: 700 }}>
              {confirmModalType === 'clear' ? (
                <>
                  أنت على وشك حذف جميع <strong>الفواتير، السندات، القيود المحاسبية، المصروفات، والورديات</strong> وتصفير أرصدة المخزون.
                  <br/>
                  <span style={{ color: '#059669', fontWeight: 900 }}>✅ لن يتم حذف العملاء، الأصناف، شجرة الحسابات، أو المستودعات.</span>
                </>
              ) : (
                <>
                  أنت على وشك <strong>إعادة ضبط المصنع الشاملة</strong>. سيتم مسح كافة البيانات والعمليات والعملاء والأصناف بالكامل!
                  <br/>
                  <span style={{ color: '#dc2626', fontWeight: 900 }}>⛔ هذا الإجراء لا يمكن التراجع عنه نهائياً!</span>
                </>
              )}
            </p>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px dashed #cbd5e1', marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: 900, color: '#334155', display: 'block', marginBottom: '6px' }}>
                للتأكيد، يرجى كتابة عبارة: <span style={{ color: '#dc2626', direction: 'rtl' }}>({confirmModalType === 'clear' ? 'مسح القيود' : 'ضبط المصنع'})</span> في الحقل أدناه:
              </label>
              <input 
                type="text"
                className="security-input"
                placeholder={confirmModalType === 'clear' ? 'مسح القيود' : 'ضبط المصنع'}
                value={confirmInputText}
                onChange={(e) => setConfirmInputText(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={confirmModalType === 'clear' ? handleExecuteClearTransactions : handleExecuteFactoryReset}
                disabled={confirmInputText.trim() !== (confirmModalType === 'clear' ? 'مسح القيود' : 'ضبط المصنع')}
                className={`btn-confirm-action ${confirmModalType === 'clear' ? 'warning' : 'critical'}`}
              >
                تأكيد التنفيذ فوراً ⚡
              </button>
              <button 
                onClick={() => { setConfirmModalType(null); setConfirmInputText(''); }}
                className="btn-cancel-action"
              >
                إلغاء الأمر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ستايلات الـ CSS وفق طابع Aqua Glassmorphism */}
      <style>{`
        .tab-btn { 
          padding: 10px 20px; border-radius: 14px; 
          border: 1px solid rgba(40, 145, 200, 0.2); 
          font-weight: 900; font-size: 13px; cursor: pointer; 
          transition: 0.2s; background: rgba(255, 255, 255, 0.7); 
          color: #64748b; white-space: nowrap; backdrop-filter: blur(10px);
        }
        .tab-btn:hover { background: rgba(255, 255, 255, 0.95); color: #1C73AB; transform: translateY(-2px); }
        .tab-btn.active { 
          background: linear-gradient(135deg, #1C73AB, #2891C8); 
          color: white; border-color: #1C73AB; 
          box-shadow: 0 4px 15px rgba(28, 115, 171, 0.25); 
        }

        .group-card { 
          background: rgba(255, 255, 255, 0.6); 
          padding: 14px; border-radius: 16px; 
          border: 1px solid rgba(255, 255, 255, 0.8); 
          box-shadow: 0 4px 15px rgba(28, 115, 171, 0.04);
        }
        .table-row { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 8px 12px; background: white; border-radius: 10px; 
          margin-top: 5px; border: 1px solid rgba(40, 145, 200, 0.15); 
          transition: 0.2s; 
        }
        .table-row.selected { border-color: #2891C8; background: rgba(40, 145, 200, 0.05); }
        .table-row:hover { border-color: #1C73AB; }
        .custom-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #1C73AB; }

        .btn-action-small {
          background: rgba(255, 255, 255, 0.8); 
          border: 1px solid rgba(40, 145, 200, 0.2); 
          padding: 6px 14px; border-radius: 8px; 
          cursor: pointer; font-weight: 800; color: #1C73AB; font-size: 11px;
          transition: 0.2s;
        }
        .btn-action-small:hover { background: #1C73AB; color: white; }

        .link-btn { background: none; border: none; color: #0284c7; cursor: pointer; font-weight: 800; font-size: 11px; }
        .link-btn:hover { text-decoration: underline; }

        .badge-master {
          font-size: 9.5px; font-weight: 800; background: #e0f2fe; color: #0369a1;
          padding: 2px 6px; border-radius: 6px; border: 1px solid #bae6fd;
        }

        .premium-dropzone { 
          background: rgba(255, 255, 255, 0.6); 
          border: 2px dashed rgba(40, 145, 200, 0.3); 
          border-radius: 18px; padding: 25px 20px; 
          text-align: center; cursor: pointer; transition: 0.2s; 
          display: flex; flex-direction: column; gap: 8px; 
          justify-content: center; align-items: center; 
        }
        .premium-dropzone:hover { background: white; border-color: #1C73AB; }
        .premium-dropzone.has-file { background: #f0fdf4; border-color: #10b981; border-style: solid; }
        .premium-dropzone.uploading { pointer-events: none; opacity: 0.8; border-color: #1C73AB; }
        
        .loading-spinner { font-size: 24px; animation: spin 2s linear infinite; }
        .btn-premium-upload { 
          background: linear-gradient(135deg, #1C73AB, #2891C8); 
          color: white; padding: 12px; border-radius: 12px; 
          border: none; font-weight: 900; font-size: 14px; 
          cursor: pointer; transition: 0.2s; width: 100%; margin-top: 12px; 
          box-shadow: 0 4px 15px rgba(28, 115, 171, 0.25);
        }
        .btn-premium-upload:hover { transform: translateY(-2px); filter: brightness(1.1); }

        .sidebar-summary-glass { 
          background: rgba(255,255,255,0.85); padding: 18px; 
          border-radius: 18px; text-align: center; 
          border: 1px solid rgba(40, 145, 200, 0.2); 
          box-shadow: 0 4px 20px rgba(28, 115, 171, 0.08);
        }
        .sidebar-summary-glass .icon-pulse { font-size: 28px; margin-bottom: 4px; }
        .summary-title { margin: 0; font-size: 11.5px; color: #64748b; font-weight: 800; }
        .summary-value { margin: 4px 0 0 0; font-weight: 900; font-size: 24px; color: #122946; }

        .btn-premium-glass { 
          width: 100%; padding: 11px; border-radius: 12px; 
          border: none; color: white; display: flex; align-items: center; 
          justify-content: center; gap: 8px; cursor: pointer; 
          font-weight: 900; font-size: 12.5px; transition: 0.2s; 
        }
        .btn-premium-glass.excel { background: linear-gradient(135deg, #10b981, #059669); }
        .btn-premium-glass.sql { background: linear-gradient(135deg, #1C73AB, #2891C8); }
        .btn-premium-glass:hover:not(.disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-premium-glass.disabled { opacity: 0.5; cursor: not-allowed; }

        .status-alert { 
          padding: 10px; border-radius: 10px; font-size: 12px; 
          font-weight: 800; text-align: center; margin-top: 12px; 
        }
        .status-alert.loading { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .status-alert.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .status-alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

        /* منطقة العمليات الحساسة */
        .danger-zone-container {
          background: rgba(254, 242, 242, 0.7);
          border: 1.5px solid rgba(239, 68, 68, 0.3);
          border-radius: 20px;
          padding: 22px;
          backdrop-filter: blur(10px);
        }
        .danger-card {
          background: white;
          padding: 18px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        }
        .danger-card.warning-level { border-top: 4px solid #f59e0b; }
        .danger-card.critical-level { border-top: 4px solid #ef4444; }

        .badge-safe {
          font-size: 10px; font-weight: 800; background: #fef3c7; color: #b45309;
          padding: 2px 8px; border-radius: 12px; border: 1px solid #fde68a;
        }
        .badge-critical {
          font-size: 10px; font-weight: 800; background: #fee2e2; color: #b91c1c;
          padding: 2px 8px; border-radius: 12px; border: 1px solid #fca5a5;
        }

        .btn-danger {
          width: 100%; padding: 11px; border-radius: 10px;
          border: none; font-weight: 900; font-size: 13px;
          cursor: pointer; transition: 0.2s;
        }
        .btn-danger.warning { background: #fffbeb; color: #b45309; border: 1.5px solid #f59e0b; }
        .btn-danger.warning:hover { background: #f59e0b; color: white; }
        .btn-danger.critical { background: #fef2f2; color: #dc2626; border: 1.5px solid #ef4444; }
        .btn-danger.critical:hover { background: #dc2626; color: white; }

        /* نافذة التأكيد الأمني */
        .security-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(18, 41, 70, 0.88);
          backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          z-index: 999999999; padding: 20px;
        }
        .security-modal-card {
          background: white; border-radius: 20px;
          padding: 25px; max-width: 440px; width: 100%;
          text-align: center; direction: rtl;
          box-shadow: 0 25px 50px rgba(0,0,0,0.4);
          animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .security-input {
          width: 100%; padding: 10px; border: 2px solid #cbd5e1;
          border-radius: 8px; font-size: 15px; font-weight: 900;
          text-align: center; outline: none; margin-top: 5px;
          box-sizing: border-box;
        }
        .security-input:focus { border-color: #dc2626; }
        .btn-confirm-action {
          flex: 1; padding: 12px; border-radius: 10px; border: none;
          font-weight: 900; font-size: 13px; cursor: pointer; color: white;
          transition: 0.2s;
        }
        .btn-confirm-action.warning { background: #d97706; }
        .btn-confirm-action.warning:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-confirm-action.critical { background: #dc2626; }
        .btn-confirm-action.critical:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-cancel-action {
          padding: 12px 20px; border-radius: 10px; border: 1px solid #cbd5e1;
          background: white; color: #475569; font-weight: 800; cursor: pointer;
        }

        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </MasterPage>
  );
}
