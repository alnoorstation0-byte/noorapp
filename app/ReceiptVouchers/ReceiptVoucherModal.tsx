"use client";
import React, { useState, useEffect, useRef } from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';
import AquaModalWrapper from '@/components/AquaModalWrapper';

// =========================================================================
// 🔍 مكون البحث الذكي المطور (مع دعم السحب الآلي initialDisplay) 💎
// =========================================================================
const SmartCombo = ({ label, table, onSelect, placeholder, searchCols = 'name,code', displayCol = 'name', filterStatus, tabIndex, multi = false, selectedValues = [], initialDisplay = '' }: any) => {
    const [search, setSearch] = useState<string>(initialDisplay || ''); 
    const [results, setResults] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialDisplay) {
            setSearch(initialDisplay);
        } else if (!multi) {
            setSearch('');
        }
    }, [initialDisplay, multi]);

    const loadInitialData = async (query = '') => {
        if (!table) return;
        setIsLoading(true);
        try {
            let q = supabase.from(table).select('*').limit( multi ? 50 : 15); 
            if (table === 'accounts') q = q.eq('is_transactional', true);
            if (filterStatus) q = q.eq('status', filterStatus);
            if (query) {
                const orQuery = searchCols.split(',').map((col: string) => `${col}.ilike.%${query}%`).join(',');
                q = q.or(orQuery);
            }
            const { data, error } = await q;
            if (!error) setResults((data as any[]) || []);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!show && e.key === 'ArrowDown') { setShow(true); loadInitialData(search); return; }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                if (show && highlightedIndex >= 0) {
                    e.preventDefault();
                    handleItemAction(results[highlightedIndex]);
                }
                break;
            case 'Escape': setShow(false); break;
        }
    };

    const handleItemAction = (item: any) => {
        onSelect(item);
        if (!multi) {
            const displayName = item[displayCol] || item.Property || item.invoice_number || item.name;
            setSearch(displayName); 
            setShow(false);
        }
    };

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const el = listRef.current.children[highlightedIndex] as HTMLElement;
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>{label}</label>
            <input 
                type="text" 
                tabIndex={tabIndex}
                placeholder={placeholder || '🔍 ابحث...'}
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setShow(true); loadInitialData(e.target.value); }}
                onFocus={() => { setShow(true); loadInitialData(search); }}
                onKeyDown={handleKeyDown} 
                className="glass-input-field"
            />
            {show && (
                <>
                    <div onClick={() => setShow(false)} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />
                    <div ref={listRef} className="cinematic-scroll glass-dropdown" style={{ zIndex: 2000 }}>
                        {isLoading ? (
                            <LoadingScreen message="جاري البحث..." fullScreen={false} />
                        ) : results.length > 0 ? (
                            results.map((item: any, index: number) => {
                                const isSelected = multi ? selectedValues.some((v: any) => v.id === item.id) : false;
                                const isHighlighted = index === highlightedIndex;
                                return (
                                    <div key={item.id} onClick={() => handleItemAction(item)} 
                                         className={`dropdown-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}>
                                        {multi && <input type="checkbox" checked={isSelected} readOnly style={{ width: '18px', height: '18px', accentColor: THEME.success }} />}
                                        <span style={{ fontWeight: isSelected ? '900' : 'bold' }}>{item[displayCol] || item.Property || item.invoice_number || item.name}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '15px', textAlign: 'center', fontSize: '12px', color: '#ef4444', fontWeight: 900 }}>🚫 لا توجد نتائج</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// =========================================================================
// 📝 المودال الرئيسي (سند القبض) - مطابق للميثاق الماسي V9
// =========================================================================
export default function ReceiptVoucherModal({ isOpen, onClose, record, setRecord, onSave, delegates, fleetOperations }: any) {
    if (!isOpen) return null;

    // 🚀 المراقبة الذكية لجلب الأسماء عند الضغط من الخارج
    useEffect(() => {
        const syncNames = async () => {
            if (!isOpen || !record) return;
            
            let updates: any = {};
            let needsUpdate = false;

            // 2. ترجمة العميل (partner_id) لاسم
            if (record.partner_id && !record.partner_name) {
                const { data } = await supabase.from('partners').select('name').eq('id', record.partner_id).single();
                if (data) {
                    updates.partner_name = data.name;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                setRecord((prev: any) => ({ ...prev, ...updates }));
            }
        };

        syncNames();
    }, [isOpen, record?.partner_id]);

    // 🧠 1. سحر السحب الآلي عند اختيار الفاتورة يدوياً من الداخل
    // 🧠 1. سحر السحب الآلي عند اختيار الفاتورة يدوياً من الداخل
    const handleInvoiceSelect = async (inv: any) => {
        const remainingAmount = Number(inv.total_amount) - Number(inv.paid_amount || 0);
        const { data: partnerData } = await supabase.from('partners').select('name').eq('id', inv.partner_id).single();
        
        let pAccName = 'العملاء (أصحاب الفروع)';
        let pAccId = '4f828d0d-a1f4-4762-83e3-c17dafae802d';
        
        if (inv.debit_account_id) {
            pAccId = inv.debit_account_id;
            const { data: accData } = await supabase.from('accounts').select('name').eq('id', inv.debit_account_id).single();
            if (accData) pAccName = accData.name;
        }

        // 🚀 الحماية الذكية: لو المستخدم كتب مبلغ بإيده، السيستم يحترمه وميمسحوش!
        // ولو الخانة كانت فاضية (صفر)، السيستم يسحب رصيد الفاتورة المتبقي.
        const userTypedAmount = Number(record.amount || 0);
        const amountToSet = userTypedAmount > 0 ? userTypedAmount : (remainingAmount > 0 ? remainingAmount : 0);

        setRecord({
            ...record,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            partner_id: inv.partner_id,
            partner_name: partnerData?.name || '', 
            amount: amountToSet, // 🚀 تثبيت المبلغ المكتوب
            partner_acc_id: pAccId, 
            partner_acc_name: pAccName,
            safe_bank_acc_id: record.safe_bank_acc_id || '21b8a1db-bc9f-4cf8-b741-1efeded0963c',
            safe_bank_acc_name: record.safe_bank_acc_name || 'الخزينة الرئيسية',
            delegate_id: inv.delegate_id || record.delegate_id,
            fleet_operation_id: inv.fleet_operation_id || record.fleet_operation_id,
            job_order_id: inv.job_order_id || record.job_order_id
        });
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(record);
    };

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={record.id ? 'تعديل سند قبض' : 'إصدار سند قبض جديد'}
            icon="💰"
            width="980px"
        >
                <style>{`
                    .glass-dropdown {
                        position: absolute; top: calc(100% + 5px); left: 0; right: 0;
                        background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px);
                        z-index: 2000; border-radius: 12px;
                        box-shadow: 0 15px 35px rgba(0,0,0,0.15); border: 1px solid rgba(255, 255, 255, 0.8);
                        max-height: 200px; overflow-y: auto; padding: 6px;
                    }
                    .dropdown-item {
                        padding: 12px; cursor: pointer; border-radius: 8px;
                        font-size: 13px; transition: all 0.1s; display: flex; align-items: center; gap: 10px; color: #0f172a;
                    }
                    .dropdown-item.highlighted { background: rgba(255, 255, 255, 0.4); border-right: 4px solid ${THEME.primary}; }
                    .dropdown-item.selected { background: #f0fdf4; border-right: 4px solid ${THEME.success}; }
                `}</style>

                
                <form onSubmit={handleSubmit}>
                    
                    {/* 🔹 القسم الأول: بيانات الدفع والعميل */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.3)', padding: '20px', borderRadius: '16px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.5)' }}>
                        <h4 style={{ color: THEME.primary, margin: '0 0 15px 0', fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>💳</span> بيانات السداد
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <div style={{ zIndex: 90 }}>
                                <SmartCombo 
                                    tabIndex={4} 
                                    label="رقم الفاتورة (سحب آلي ⚡)" 
                                    table="invoices" 
                                    searchCols="invoice_number" 
                                    displayCol="invoice_number" 
                                    initialDisplay={record.invoice_number}
                                    onSelect={handleInvoiceSelect} 
                                />
                            </div>

                            <div style={{ zIndex: 80 }}>
                                <SmartCombo 
                                    tabIndex={5} 
                                    label="العميل الدافع *" 
                                    table="partners" 
                                    searchCols="name" 
                                    displayCol="name" 
                                    initialDisplay={record.partner_name}
                                    onSelect={(p: any) => setRecord({...record, partner_id: p.id, partner_name: p.name})} 
                                />
                            </div>
                            
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>طريقة الدفع *</label>
                                <select required tabIndex={2} value={record.payment_method || ''} onChange={e => setRecord({...record, payment_method: e.target.value})} className="glass-input-field" style={{ appearance: 'auto' }}>
                                    <option value="نقدي (كاش)">نقدي (كاش)</option>
                                    <option value="تحويل بنكي">تحويل بنكي</option>
                                    <option value="شيك">شيك</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>تاريخ السند *</label>
                                <input type="date" required tabIndex={1} value={record.date || ''} onChange={e => setRecord({...record, date: e.target.value})} className="glass-input-field" />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '14px', fontWeight: 900, color: THEME.success, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>المبلغ المُحصل (ريال) *</label>
                                <input type="number" required tabIndex={3} step="0.01" value={record.amount ?? ''} onChange={e => setRecord({...record, amount: e.target.value})} className="glass-input-field" style={{ background: '#f0fdf4', color: THEME.success, fontSize: '24px', fontWeight: 900, border: `2px solid ${THEME.success}50`, textAlign: 'center', padding: '15px' }} />
                            </div>
                        </div>
                    </div>

                    {/* 🔹 القسم الثاني: تفاصيل التنفيذ (الرحلة والمندوب) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.15)', borderRadius: '16px', marginBottom: '20px', border: '1px dashed rgba(40, 145, 200, 0.3)' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>🚚 رحلة التوزيع (أمر تشغيل)</label>
                            <select 
                                tabIndex={7}
                                className="glass-input-field" 
                                style={{ appearance: 'auto' }}
                                value={record?.fleet_operation_id || ''} 
                                onChange={e => setRecord({...record, fleet_operation_id: e.target.value})}
                            >
                                <option value="">-- ربط برحلة توزيع --</option>
                                  {fleetOperations?.map((op: any) => (
                                      <option key={op.id} value={op.id}>{op.name}</option>
                                  ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>👤 المندوب المحصل</label>
                            <select tabIndex={8} value={record.delegate_id || ''} onChange={e => setRecord({...record, delegate_id: e.target.value})} className="glass-input-field" style={{ appearance: 'auto' }}>
                                <option value="">-- اختر المندوب (اختياري) --</option>
                                {delegates?.map((del: any) => (
                                    <option key={del.id} value={del.id}>{del.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* --- التوجيه المحاسبي --- */}
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.15)', borderRadius: '16px', marginBottom: '15px', border: '1px dashed rgba(40, 145, 200, 0.3)', zIndex: 40 }}>
                        <h4 style={{ color: THEME.primary, margin: '0 0 10px 0', fontSize: '14px', fontWeight: 900 }}>🏦 التوجيه المحاسبي</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <div style={{ zIndex: 30 }}>
                                <SmartCombo tabIndex={10} label="حساب الصندوق/البنك (مدين)" table="accounts" initialDisplay={record.safe_bank_acc_name} onSelect={(a: any) => setRecord({...record, safe_bank_acc_id: a.id, safe_bank_acc_name: a.name})} />
                            </div>
                            <div style={{ zIndex: 20 }}>
                                <SmartCombo tabIndex={11} label="الحساب الدائن (تجميعي العملاء)" table="accounts" initialDisplay={record.partner_acc_name || ''} onSelect={(a: any) => setRecord({...record, partner_acc_id: a.id, partner_acc_name: a.name})} />
                            </div>
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginBottom: '15px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: THEME.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>البيان / الملاحظات العامة</label>
                        <input type="text" tabIndex={12} placeholder="بيان السند توضيحي..." value={record.notes || ''} onChange={e => setRecord({...record, notes: e.target.value})} className="glass-input-field" />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <button type="submit" tabIndex={13} className="btn-glass-save" style={{ flex: 2 }}>💾 حفظ وإصدار السند</button>
                        <button type="button" tabIndex={14} onClick={onClose} className="btn-glass-cancel" style={{ flex: 1 }}>❌ إغلاق النافذة</button>
                    </div>
                </form>
            </AquaModalWrapper>
    );
}
