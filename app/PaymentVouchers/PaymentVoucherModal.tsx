"use client";
import React, { useState, useEffect } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';
import { formatCurrency } from '@/lib/helpers';

export default function PaymentVoucherModal({ 
    isOpen, 
    onClose, 
    record, 
    setRecord, 
    onSave, 
    isSaving,
    partnerBalance = 0, 
    isBalanceLoading = false
}: any) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => { 
        setMounted(true); 
    }, []);

    if (!isOpen || !mounted || !record) return null;

    // 💰 حساب نسبة السداد من المستحق (إذا كان الرصيد دائناً أي أن الشركة مدينة له)
    const amountToPay = Number(record.amount || 0);
    const hasOwedBalance = partnerBalance > 0; // الرصيد الدائن (مستحق له)
    const paymentPercentage = hasOwedBalance ? (amountToPay / partnerBalance) * 100 : 0;
    const isOverpaid = paymentPercentage > 100;

    const headerExtraInfo = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {record.voucher_number && (
                <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 800 }}>
                    رقم السند: <span style={{ color: '#00E5FF' }}>{record.voucher_number}</span>
                </div>
            )}
            <div style={{ textAlign: 'left', background: 'rgba(239, 68, 68, 0.15)', padding: '10px 20px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>مبلغ السند</div>
                <div style={{ color: '#EF4444', fontWeight: 900, fontSize: '24px' }}>{formatCurrency(amountToPay)}</div>
            </div>
        </div>
    );

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={record.id ? 'تعديل سند الصرف' : 'إصدار سند صرف'}
            icon="💸"
            width="750px"
            headerExtra={headerExtraInfo}
        >

                {/* ⚖️ التوجيه المحاسبي الدقيق (القيد المزدوج) */}
                <div style={{ background: 'rgba(255, 255, 255, 0.6)', padding: '15px', borderRadius: '20px', border: '1px solid rgba(40, 145, 200, 0.2)', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(40, 145, 200, 0.15)', paddingBottom: '5px', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: THEME.primary }}>⚖️ التوجيه المحاسبي</h3>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800 }}>يمكن إضافتها لاحقاً للتوجيه المجمع</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ zIndex: 60, position: 'relative' }}>
                            {/* 1. الحساب المدين */}
                            <SmartCombo 
                                label="🧾 الحساب المدين (مطلوب للترحيل) *" 
                                table="accounts" 
                                displayCol="name" 
                                initialDisplay={record.debit_account_name || ''} 
                                onSelect={(val:any) => setRecord({
                                    ...record, 
                                    debit_account_name: val?.name || '',
                                    debit_account_id: val?.id || null 
                                })} 
                                strict={true} 
                            />
                        </div>
                        <div style={{ zIndex: 50, position: 'relative' }}>
                            {/* 2. الحساب الدائن */}
                            <SmartCombo 
                                label="🏦 الحساب الدائن (مطلوب للترحيل) *" 
                                table="accounts" 
                                displayCol="name" 
                                initialDisplay={record.credit_account_name || ''} 
                                onSelect={(val:any) => setRecord({
                                    ...record, 
                                    credit_account_name: val?.name || '',
                                    credit_account_id: val?.id || null 
                                })} 
                                strict={true} 
                            />
                        </div>
                    </div>

                    {/* 3. المستفيد المباشر */}
                    <div style={{ zIndex: 40, position: 'relative' }}>
                        <SmartCombo 
                            label="👤 المستفيد / المستلم المباشر (العامل/الموظف/المورد) *" 
                            table="partners" 
                            displayCol="name" 
                            initialDisplay={record.payee_name || ''} 
                            onSelect={(val:any) => setRecord({
                                ...record, 
                                payee_name: val?.name || '', 
                                payee_id: val?.id || null 
                            })} 
                            allowAddNew={true} 
                        />
                    </div>
                </div>

                {/* 📊 عرض رصيد العامل/المستفيد ونسبة السداد اللحظية */}
                {record.payee_id && (
                    <div style={{ background: 'rgba(11, 14, 20, 0.7)', padding: '14px 18px', borderRadius: '16px', marginBottom: '15px', border: '1px solid rgba(0, 229, 255, 0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'modalEntrance 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#94A3B8' }}>الرصيد المتبقي للمستفيد قبل الصرف:</span>
                            {isBalanceLoading ? (
                                <span style={{ fontSize: '14px', fontWeight: 900, color: '#00E5FF' }}>⏳ جاري الحساب...</span>
                            ) : (
                                <div style={{ textAlign: 'left' }}>
                                    <span style={{ fontSize: '22px', fontWeight: 900, color: partnerBalance > 0 ? '#EF4444' : partnerBalance < 0 ? '#10B981' : '#94A3B8' }}>
                                        {formatCurrency(Math.abs(partnerBalance))} 
                                    </span>
                                    <span style={{ fontSize: '12px', marginRight: '8px', fontWeight: 800, color: partnerBalance > 0 ? '#EF4444' : partnerBalance < 0 ? '#10B981' : '#94A3B8' }}>
                                        {partnerBalance > 0 ? '(مستحق له)' : partnerBalance < 0 ? '(مدين - عليه)' : 'مُصَفَّر'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* شريط التقدم المرئي لنسبة الصرف */}
                        {!isBalanceLoading && hasOwedBalance && amountToPay > 0 && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(40, 145, 200, 0.15)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900, marginBottom: '8px', color: '#475569' }}>
                                    <span>مؤشر السداد من المستحق:</span>
                                    <span style={{ color: isOverpaid ? THEME.danger : '#059669', fontSize: '14px' }}>
                                        {paymentPercentage.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '12px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <div className="progress-bar-striped" style={{ 
                                        width: `${Math.min(paymentPercentage, 100)}%`, 
                                        height: '100%', 
                                        background: isOverpaid ? THEME.danger : 'linear-gradient(90deg, #10b981, #059669)',
                                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s'
                                    }}></div>
                                </div>
                                {isOverpaid && (
                                    <div style={{ fontSize: '12px', color: THEME.danger, marginTop: '10px', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #fecaca' }}>
                                        <span>⚠️</span> تنبيه: مبلغ الصرف يتجاوز المستحق بـ {formatCurrency(amountToPay - partnerBalance)}! سيتحول هذا الفارق كمديونية (سلفة) على المستفيد لصالح الشركة.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 📅 التاريخ والمبلغ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 900, color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>📅 تاريخ السداد *</label>
                        <input 
                            type="date" 
                            style={{ width: '100%', padding: '10px', borderRadius: '14px', border: '1.5px solid rgba(40, 145, 200, 0.15)', background: 'rgba(255, 255, 255, 0.6)', fontWeight: 700, color: '#1e293b', outline: 'none' }} 
                            value={record.date || ''} 
                            onChange={e => setRecord({...record, date: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.danger, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>💰 المبلغ المراد صرفه *</label>
                        <input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            style={{ width: '100%', padding: '10px', borderRadius: '14px', border: `2px solid ${THEME.danger}50`, background: '#fef2f2', fontWeight: 900, color: THEME.danger, outline: 'none', fontSize: '16px' }} 
                            value={record.amount || ''} 
                            onChange={e => setRecord({...record, amount: Number(e.target.value)})} 
                        />
                    </div>
                </div>

                {/* 📝 طريقة الدفع والبيان */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 900, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>💳 طريقة الدفع</label>
                        <select 
                            style={{ width: '100%', padding: '10px', borderRadius: '14px', border: '1px solid rgba(0, 229, 255, 0.25)', background: 'rgba(11, 14, 20, 0.8)', fontWeight: 700, color: '#F8FAFC', outline: 'none', cursor: 'pointer' }} 
                            value={record.payment_method || 'تحويل بنكي'} 
                            onChange={e => setRecord({...record, payment_method: e.target.value})} 
                        >
                            <option value="تحويل بنكي">تحويل بنكي</option>
                            <option value="نقدي">نقدي (كاش)</option>
                            <option value="شيك">شيك</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 900, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>🔢 رقم المرجع (حوالة / شيك)</label>
                        <input 
                            type="text" 
                            placeholder="رقم المرجع..." 
                            style={{ width: '100%', padding: '10px', borderRadius: '14px', border: '1px solid rgba(0, 229, 255, 0.25)', background: 'rgba(11, 14, 20, 0.8)', fontWeight: 700, color: '#F8FAFC', outline: 'none' }} 
                            value={record.reference_number || record.reference_no || ''} 
                            onChange={e => setRecord({...record, reference_number: e.target.value, reference_no: e.target.value})} 
                        />
                    </div>
                    <div style={{ zIndex: 20, position: 'relative' }}>
                        <SmartCombo 
                            label="📂 بيان السند / الوصف" 
                            freeText={true} 
                            initialDisplay={record.description || ''} 
                            onSelect={(val:any) => setRecord({...record, description: typeof val === 'object' ? val.name : val})} 
                        />
                    </div>
                </div>

                {/* 🔘 أزرار الأكشن */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '15px' }}>
                    <button 
                        onClick={onClose} 
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(255, 255, 255, 0.05)', color: '#F8FAFC', fontWeight: 900, cursor: 'pointer', fontSize: '15px', transition: '0.2s' }}
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={() => onSave(record)} 
                        disabled={isSaving || amountToPay <= 0 || !record.debit_account_id || !record.credit_account_id} 
                        style={{ 
                            flex: 2, 
                            padding: '12px', 
                            borderRadius: '12px', 
                            background: (amountToPay > 0 && record.debit_account_id && record.credit_account_id) ? THEME.danger : 'rgba(40, 145, 200, 0.2)', 
                            color: 'white', 
                            fontWeight: 900, 
                            border: 'none', 
                            cursor: amountToPay > 0 ? 'pointer' : 'not-allowed', 
                            fontSize: '16px', 
                            boxShadow: amountToPay > 0 ? `0 10px 25px ${THEME.danger}40` : 'none', 
                            transition: '0.2s' 
                        }}
                    >
                        {isSaving ? '⏳ جاري التنفيذ...' : '📝 حفظ كمسودة (معلق)'}
                    </button>
                </div>
        </AquaModalWrapper>
    );
}
