"use client";
import React, { useState, useEffect, useMemo } from 'react'; 
import { createPortal } from 'react-dom';
import { useManualJournalsLogic } from './manual_journals_logic';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo'; 
import RawasiSidebarManager from '@/components/RawasiSidebarManager'; 
import { usePermissions } from '@/lib/PermissionsContext'; 
import SecureAction from '@/components/SecureAction';      
import { formatCurrency } from '@/lib/helpers';
import MasterPage from '@/components/MasterPage';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import { showGlobalToast } from '@/lib/toast-context';

export default function ManualJournalsPage() {
    const logic = useManualJournalsLogic();
    const { can } = usePermissions();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<any>(null);

    // Modal state
    const [formData, setFormData] = useState({
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        debit_account_id: '',
        credit_account_id: '',
        partner_id: ''
    });

    const openModal = (j: any = null) => {
        if (j) {
            if (j.is_posted || j.status === 'معتمد' || j.status === 'مرحل') {
                showGlobalToast('عذراً، لا يمكن تعديل قيد تم ترحيله.', 'warning');
                return;
            }
            setFormData({
                entry_date: j.entry_date,
                description: j.description,
                amount: j.amount,
                debit_account_id: j.debit_account_id,
                credit_account_id: j.credit_account_id,
                partner_id: j.partner_id || ''
            });
            setEditingVoucher(j);
        } else {
            setFormData({
                entry_date: new Date().toISOString().split('T')[0],
                description: '',
                amount: '',
                debit_account_id: '',
                credit_account_id: '',
                partner_id: ''
            });
            setEditingVoucher(null);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            await logic.actions.saveJournal({ ...formData, id: editingVoucher?.id });
            setIsModalOpen(false);
        } catch (error) {
            // Error handled in logic
        }
    };

    const columns = useMemo(() => [
        { 
            header: 'رقم السند', 
            accessor: 'voucher_number', 
            render: (row: any) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <b style={{ color: THEME.primary, fontSize: '14px' }}>{row.voucher_number}</b>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{row.entry_date}</span>
                </div>
            )
        },
        { 
            header: 'بيان التسوية', 
            accessor: 'description', 
            render: (row: any) => (
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '250px' }}>
                    <span style={{ color: '#1e293b', fontWeight: 800 }}>{row.description}</span>
                </div>
            )
        },
        { 
            header: 'من حساب (دائن 🔴)', 
            accessor: 'credit_account', 
            render: (row: any) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#dc2626', fontWeight: 800 }}>{row.credit_account?.name || '---'}</span>
                </div>
            )
        },
        { 
            header: 'إلى حساب (مدين 🟢)', 
            accessor: 'debit_account', 
            render: (row: any) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#059669', fontWeight: 800 }}>{row.debit_account?.name || '---'}</span>
                </div>
            )
        },
        { 
            header: 'المبلغ', 
            accessor: 'amount', 
            render: (row: any) => <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '15px' }}>{formatCurrency(row.amount)}</span> 
        },
        {
            header: 'الحالة',
            accessor: 'status',
            render: (row: any) => (
                row.is_posted || row.status === 'معتمد' || row.status === 'مرحل' ? 
                <span className="badge-glass green">مرحل ✅</span> : 
                <span className="badge-glass yellow">مسودة ⏳</span>
            )
        },
        {
            header: 'إجراءات',
            accessor: 'actions',
            render: (row: any) => {
                const isPosted = row.is_posted || row.status === 'معتمد' || row.status === 'مرحل';
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                        <SecureAction module="manual_journals" action="post">
                            {isPosted ? (
                                <button
                                    type="button"
                                    disabled={logic.state.isProcessing}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        logic.actions.handleUnpostSingle(row.id);
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.2) 100%)',
                                        color: '#b45309',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        padding: '6px 12px',
                                        borderRadius: '10px',
                                        cursor: logic.state.isProcessing ? 'wait' : 'pointer',
                                        fontWeight: 900,
                                        fontSize: '11px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        whiteSpace: 'nowrap',
                                        opacity: logic.state.isProcessing ? 0.6 : 1
                                    }}
                                    title="فك ترحيل قيد التسوية"
                                >
                                    <span>↩️</span>
                                    <span>فك الترحيل</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={logic.state.isProcessing}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        logic.actions.handlePostSingle(row.id);
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 14px',
                                        borderRadius: '10px',
                                        cursor: logic.state.isProcessing ? 'wait' : 'pointer',
                                        fontWeight: 900,
                                        fontSize: '11px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        whiteSpace: 'nowrap',
                                        opacity: logic.state.isProcessing ? 0.6 : 1
                                    }}
                                    title="اعتماد وترحيل قيد التسوية"
                                >
                                    <span>🚀</span>
                                    <span>ترحيل</span>
                                </button>
                            )}
                        </SecureAction>

                        <SecureAction module="manual_journals" action="edit">
                            <button className="btn-main-glass icon-only blue" onClick={() => openModal(row)} disabled={isPosted}>
                                ✏️
                            </button>
                        </SecureAction>
                    </div>
                );
            }
        }
    ], [logic.state.isProcessing, logic.actions]);

    const sidebarActions = useMemo(() => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <SecureAction module="manual_journals" action="add">
                <button className="btn-main-glass green" onClick={() => openModal()} style={{ height: '50px', fontSize: '15px' }}>
                    ➕ إضافة تسوية جديدة
                </button>
            </SecureAction>

            {logic.state.selectedIds.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                    <p style={{fontSize:'12px', textAlign:'center', color:'#475569', fontWeight:900, margin:0}}>تم تحديد ({logic.state.selectedIds.length}) سند</p>
                    <SecureAction module="manual_journals" action="post">
                        <button className="btn-main-glass blue" onClick={logic.actions.handlePostSelected}>🚀 ترحيل القيود المحددة</button>
                    </SecureAction>
                    <SecureAction module="manual_journals" action="post">
                        <button className="btn-main-glass yellow" onClick={logic.actions.handleUnpostSelected}>⏪ فك ترحيل المحددة</button>
                    </SecureAction>
                    <SecureAction module="manual_journals" action="delete">
                        <button className="btn-main-glass red" onClick={logic.actions.handleDeleteSelected}>🗑️ حذف القيود المحددة</button>
                    </SecureAction>
                </div>
            )}
        </div>
    ), [logic.state.selectedIds.length, logic.actions.handlePostSelected, logic.actions.handleUnpostSelected, logic.actions.handleDeleteSelected]); 

    if (logic.state.isLoading) return <LoadingScreen message="جاري تجهيز السجلات..." />;

    return (
        <div className="clean-page">
            <MasterPage icon="📝" title="القيود اليدوية (التسويات) 📝" subtitle="ترحيل مبالغ من حساب إلى حساب بشكل يدوي مباشر ومحاسبي.">
                
                <RawasiSidebarManager 
                    summary={
                        <div className="summary-glass-card">
                            <span style={{fontSize:'12px', fontWeight:800, color:'#64748b'}}>إجمالي مبالغ التسويات 📊</span>
                            <div style={{fontSize:'22px', fontWeight:900, color: THEME.primary, marginTop:'5px'}}>
                                {formatCurrency(logic.state.totals.amount)}
                            </div>
                        </div>
                    }
                    actions={sidebarActions}
                    watchDeps={[logic.state.selectedIds]}
                />

                {logic.state.unpostedCount > 0 && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(255, 237, 213, 0.95) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: '16px',
                        padding: '12px 20px',
                        marginBottom: '18px',
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
                                    تنبيه القيود: يوجد ({logic.state.unpostedCount}) قيد تسوية يدوي غير مرحل!
                                </div>
                                <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>
                                    القيود غير المرحلة لا تؤثر في الحسابات والأرصدة حتى يتم ترحيلها.
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => logic.state.setFilterStatus(logic.state.filterStatus === 'مسودة' ? 'الكل' : 'مسودة')}
                            style={{
                                background: logic.state.filterStatus === 'مسودة' ? '#d97706' : '#ea580c',
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
                            {logic.state.filterStatus === 'مسودة' ? 'عرض كافة القيود' : '🔍 استعراض القيود غير المرحلة فقط'}
                        </button>
                    </div>
                )}

                <RawasiSmartTable 
                    columns={columns}
                    data={logic.state.paginatedJournals}
                    selectable={true}
                    selectedIds={logic.state.selectedIds}
                    onSelectionChange={logic.state.setSelectedIds}
                />
            </MasterPage>

            {mounted && isModalOpen && createPortal(
                <div className="warm-portal-overlay-fullscreen" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(7, 9, 13, 0.75)', backdropFilter: 'blur(16px)', zIndex: 999999999, isolation: 'isolate', pointerEvents: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflowY: 'auto' }} onClick={() => setIsModalOpen(false)}>
                    <div className="cinematic-scroll manual-journal-modal" onClick={e => e.stopPropagation()} style={{ padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '900px', direction: 'rtl', margin: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '15px' }}>
                            <h2 style={{ fontWeight: 900, fontSize: '22px', margin: 0 }}>{editingVoucher ? 'تعديل سند التسوية ✏️' : 'سند تسوية جديد ➕'}</h2>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)} style={{ width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="glass-input-group">
                                <label style={{ color: '#00E5FF', fontWeight: 800 }}>التاريخ 📅</label>
                                <input type="date" className="glass-input" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} />
                            </div>
                            <div className="glass-input-group">
                                <label style={{ color: '#00E5FF', fontWeight: 800 }}>المبلغ 💰</label>
                                <input type="number" className="glass-input" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                            </div>
                            <div className="glass-input-group">
                                <label style={{ color: '#00E5FF', fontWeight: 800 }}>البيان / تفاصيل التسوية 📝</label>
                                <textarea className="glass-input" rows={2} placeholder="سبب التسوية..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="glass-input-group" style={{ flex: 1 }}>
                                    <label style={{ color: '#EF4444', fontWeight: 800 }}>من حساب (الطرف الدائن 🔴)</label>
                                    <SmartCombo 
                                        options={logic.state.accounts || []}
                                        displayCol="name"
                                        initialDisplay={(logic.state.accounts || []).find((a:any) => a.id === formData.credit_account_id)?.name || ''}
                                        onSelect={(val: any) => setFormData({...formData, credit_account_id: val?.id || ''})}
                                        placeholder="اختر الحساب الدائن..."
                                    />
                                </div>
                                <div className="glass-input-group" style={{ flex: 1 }}>
                                    <label style={{ color: '#10B981', fontWeight: 800 }}>إلى حساب (الطرف المدين 🟢)</label>
                                    <SmartCombo 
                                        options={logic.state.accounts || []}
                                        displayCol="name"
                                        initialDisplay={(logic.state.accounts || []).find((a:any) => a.id === formData.debit_account_id)?.name || ''}
                                        onSelect={(val: any) => setFormData({...formData, debit_account_id: val?.id || ''})}
                                        placeholder="اختر الحساب المدين..."
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="glass-input-group" style={{ flex: 1 }}>
                                    <label style={{ color: '#00E5FF', fontWeight: 800 }}>الشريك (اختياري) 👥</label>
                                    <SmartCombo 
                                        options={logic.state.partners || []}
                                        displayCol="name"
                                        initialDisplay={(logic.state.partners || []).find((p:any) => p.id === formData.partner_id)?.name || ''}
                                        onSelect={(val: any) => setFormData({...formData, partner_id: val?.id || ''})}
                                        placeholder="بدون شريك"
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '30px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
                            <button className="btn-main-glass green" onClick={handleSave} disabled={logic.state.isProcessing} style={{ flex: 2, padding: '15px', fontSize: '16px' }}>
                                {editingVoucher ? 'تحديث التسوية 💾' : 'حفظ التسوية 💾'}
                            </button>
                            <button className="btn-main-glass red" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '15px', fontSize: '16px' }}>إلغاء ❌</button>
                        </div>
                    </div>
                </div>
            , document.body)}

            <style>{`
                .manual-journal-modal {
                    background: linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(11, 14, 20, 0.95) 100%);
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    box-shadow: 0 25px 70px rgba(0,0,0,0.7);
                }
                .manual-journal-modal h2 {
                    color: #F8FAFC;
                }
                .manual-journal-modal .btn-close-modal {
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: #94A3B8;
                }

                /* Daylight Desert Glassmorphism */
                .daylight-theme .warm-portal-overlay-fullscreen {
                    background-color: rgba(253, 251, 247, 0.85) !important;
                }
                .daylight-theme .manual-journal-modal {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(245, 238, 228, 0.95) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.35) !important;
                    box-shadow: 0 25px 70px rgba(44, 26, 18, 0.15) !important;
                }
                .daylight-theme .manual-journal-modal h2 {
                    color: #2C1A12 !important;
                }
                .daylight-theme .manual-journal-modal .glass-input-group label {
                    color: #2C1A12 !important;
                }
                .daylight-theme .manual-journal-modal .glass-input {
                    background: #FFFFFF !important;
                    border: 1px solid rgba(194, 155, 98, 0.35) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .manual-journal-modal .btn-close-modal {
                    background: rgba(44, 26, 18, 0.06) !important;
                    border: 1px solid rgba(194, 155, 98, 0.3) !important;
                    color: #2C1A12 !important;
                }
            `}</style>
        </div>
    );
}

