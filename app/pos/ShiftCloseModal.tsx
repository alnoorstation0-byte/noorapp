
"use client";
import { useLanguage } from '@/lib/LanguageContext';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { classifyPaymentMethod } from '@/lib/helpers';
import { notifyShiftClosed } from '@/lib/notificationService';


export default function ShiftCloseModal({ 
    isOpen, 
    onClose, 
    activeShift,
    warehouses = [],
    delegates = []
}: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const { language } = useLanguage();
    const isEn = language === 'en';

    const [actualCash, setActualCash] = useState<number | ''>('');
    const [pumpReadings, setPumpReadings] = useState<Array<{
        id?: string;
        pump_id: string;
        pump_number: string;
        pump_name: string;
        fuel_type: string;
        unit_price: number;
        start_reading: number;
        end_reading: number | '';
        liters_pumped: number;
        expected_amount: number;
        notes?: string;
    }>>([]);
    const [totals, setTotals] = useState({ cash: 0, card: 0, credit: 0, total: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const currentWarehouse = activeShift?.warehouse || warehouses?.find((w: any) => w.id === activeShift?.warehouse_id);
    const currentDelegate = activeShift?.delegate || delegates?.find((d: any) => 
        (activeShift?.delegate_id && (d.id === activeShift?.delegate_id || d.partnerId === activeShift?.delegate_id)) ||
        (activeShift?.user_id && d.userId === activeShift?.user_id)
    );

    useEffect(() => {
        if (isOpen && activeShift) {
            calculateZReport();
        }
    }, [isOpen, activeShift]);

    const calculateZReport = async () => {
        setIsLoadingStats(true);
        try {
            // Fetch active invoices created during this shift (exclude cancelled)
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id, total_amount, payment_method, lines_data')
                .eq('shift_id', activeShift.id)
                .neq('status', 'ملغي'); // Arabic status check remains in logic

            // Fetch active expenses created during this shift (exclude deleted)
            const { data: expenses } = await supabase
                .from('expenses')
                .select('paid_amount, payment_method')
                .eq('shift_id', activeShift.id)
                .neq('is_deleted', true);

            // Fetch active standalone receipts collected during this shift
            const { data: shiftReceipts } = await supabase
                .from('receipt_vouchers')
                .select('amount, payment_method, invoice_id')
                .eq('shift_id', activeShift.id)
                .neq('status', 'ملغي'); // Arabic status check remains in logic

            // Fetch fuel pump readings for this shift
            try {
                const { data: pReadings, error: pErr } = await supabase.rpc('get_or_init_shift_pump_readings', {
                    p_shift_id: activeShift.id
                });
                if (!pErr && pReadings) {
                    setPumpReadings(pReadings.map((pr: any) => ({
                        ...pr,
                        unit_price: Number(pr.unit_price) || 0,
                        start_reading: Number(pr.start_reading) || 0,
                        end_reading: (pr.end_reading !== null && pr.end_reading !== undefined) ? Number(pr.end_reading) : '',
                        liters_pumped: Number(pr.liters_pumped) || 0,
                        expected_amount: Number(pr.expected_amount) || 0
                    })));
                }
            } catch (pEx) {
                console.warn('Error fetching pump readings:', pEx);
            }

            const shiftInvoiceIdSet = new Set((invoices || []).map(i => i.id));

            let cashSales = 0;
            let cardSales = 0;
            let creditSales = 0;
            let standaloneCashReceipts = 0;
            let standaloneCardReceipts = 0;
            let totalExpenses = 0;
            let cashExpenses = 0;

            (invoices || []).forEach(inv => {
                const amt = Number(inv.total_amount || 0);
                const paymentCat = classifyPaymentMethod(inv.payment_method);
                if (paymentCat === 'cash') cashSales += amt;
                else if (paymentCat === 'card') cardSales += amt;
                else if (paymentCat === 'credit') creditSales += amt;
            });

            // Add standalone receipts collected during shift (not already in this shift's invoices)
            (shiftReceipts || []).forEach((rc: any) => {
                if (!rc.invoice_id || !shiftInvoiceIdSet.has(rc.invoice_id)) {
                    const rcAmt = Number(rc.amount || 0);
                    const rcCat = classifyPaymentMethod(rc.payment_method);
                    if (rcCat === 'cash') standaloneCashReceipts += rcAmt;
                    else if (rcCat === 'card') standaloneCardReceipts += rcAmt;
                }
            });

            (expenses || []).forEach(exp => {
                const amt = Number(exp.paid_amount || 0);
                totalExpenses += amt;
                const expCat = classifyPaymentMethod(exp.payment_method);
                if (expCat === 'cash') {
                    cashExpenses += amt;
                }
            });

            const totalSales = cashSales + cardSales + creditSales;
            setTotals({ 
                cash: cashSales, 
                card: cardSales, 
                credit: creditSales, 
                total: totalSales, 
                standaloneCash: standaloneCashReceipts,
                standaloneCard: standaloneCardReceipts,
                cashExpenses, 
                totalExpenses 
            } as any);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleUpdateEndReading = (pumpId: string, val: number | '') => {
        setPumpReadings(prev => prev.map(p => {
            if (p.pump_id === pumpId) {
                const endVal = val === '' ? '' : Math.max(p.start_reading, Number(val));
                const liters = endVal === '' ? 0 : Math.max(0, Number(endVal) - p.start_reading);
                const amount = liters * p.unit_price;
                return {
                    ...p,
                    end_reading: endVal,
                    liters_pumped: liters,
                    expected_amount: amount
                };
            }
            return p;
        }));
    };

    // إجمالي قراءات العدادات ومقارنتها مع المبيعات
    const meterSummary = {
        totalLiters: pumpReadings.reduce((sum, p) => sum + (Number(p.liters_pumped) || 0), 0),
        totalMeterAmount: pumpReadings.reduce((sum, p) => sum + (Number(p.expected_amount) || 0), 0)
    };

    const expectedCash = Number(activeShift?.starting_cash || 0) + (totals.cash || 0) + ((totals as any).standaloneCash || 0) - ((totals as any).cashExpenses || 0);
    const difference = actualCash === '' ? 0 : Number(actualCash) - expectedCash;
    const meterSalesVariance = meterSummary.totalMeterAmount > 0 ? (meterSummary.totalMeterAmount - totals.total) : 0;

    const closeShiftMutation = useMutation({
        mutationFn: async () => {
            if (actualCash === '') throw new Error(isEn ? 'Please enter the actual cash in the register' : 'الرجاء إدخال النقدية الفعلية الموجودة في الدرج');
            
            // 1. حفظ قراءات عدادات المضخات وتحديث العدادات للمستقبل
            if (pumpReadings.length > 0) {
                const readingsPayload = pumpReadings.map(p => ({
                    pump_id: p.pump_id,
                    start_reading: p.start_reading,
                    end_reading: p.end_reading === '' ? null : Number(p.end_reading),
                    notes: p.notes || ''
                }));

                const { error: pumpSaveErr } = await supabase.rpc('save_shift_pump_readings', {
                    p_shift_id: activeShift.id,
                    p_readings: readingsPayload,
                    p_update_meters: true
                });
                if (pumpSaveErr) console.warn('Warning saving pump readings:', pumpSaveErr);
            }

            // 2. تحديث وإقفال الوردية في قاعدة البيانات
            const { error } = await supabase.from('pos_shifts').update({
                closed_at: new Date().toISOString(),
                expected_cash: expectedCash,
                actual_cash: Number(actualCash),
                total_sales: totals.total,
                total_cash_sales: totals.cash,
                total_card_sales: totals.card,
                total_credit_sales: totals.credit,
                total_expenses: (totals as any).totalExpenses || 0,
                shortage_overage: difference,
                total_liters_sold: meterSummary.totalLiters,
                meter_total_amount: meterSummary.totalMeterAmount,
                meter_sales_variance: meterSalesVariance,
                status: 'closed'
            }).eq('id', activeShift.id);

            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            showToast(isEn ? 'Shift closed and pump meters reconciled successfully ⛽🔒' : 'تم إغلاق الوردية ومطابقة عدادات المضخات والمخزون بنجاح ⛽🔒', 'success');
            queryClient.invalidateQueries({ queryKey: ['active_pos_shift'] });
            queryClient.invalidateQueries({ queryKey: ['pos_open_shifts'] });
            
            // 🔔 بث إشعار إغلاق الوردية مع حالة الصندوق
            notifyShiftClosed({
                shiftId: activeShift?.id,
                cashierName: activeShift?.user_name || activeShift?.cashier_name || 'الكاشير',
                totalSales: Number(totals.total) || 0,
                shortageOverage: Number(difference) || 0
            }).catch(() => {});

            onClose();
        },
        onError: (err: any) => showToast(`فشل إغلاق الوردية: ${err.message}`, 'error')
    });

    // ⌨️ استجابة لوحة المفاتيح: Esc للإغلاق و Ctrl+Enter للتقفيل النهائي
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'NumpadEnter')) {
                if (!closeShiftMutation.isPending && actualCash !== '') {
                    e.preventDefault();
                    e.stopPropagation();
                    closeShiftMutation.mutate();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, actualCash, closeShiftMutation]);

    if (!isOpen || !mounted) return null;

    if (!activeShift) {
        return createPortal(
            <div className="warm-portal-overlay-fullscreen" onClick={onClose} style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(11, 14, 20, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999999,
                padding: '15px'
            }}>
                <div className="glass-modal-container" onClick={(e) => e.stopPropagation()} style={{
                    background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(15, 20, 30, 0.98) 100%)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    borderRadius: '24px',
                    width: '95vw',
                    maxWidth: '450px',
                    padding: '35px 25px',
                    textAlign: 'center',
                    direction: 'rtl',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65), 0 0 25px rgba(0, 229, 255, 0.1)',
                    border: '1px solid rgba(0, 229, 255, 0.25)'
                }}>
                    <div style={{ fontSize: '55px', marginBottom: '12px' }}>ℹ️</div>
                    <h3 style={{ color: '#00E5FF', marginBottom: '10px', fontWeight: 900, fontSize: '20px' }}>{isEn ? 'No active shift' : 'لا توجد وردية نشطة حالياً'}</h3>
                    <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '25px', fontWeight: 700, lineHeight: '1.6' }}>
                        {isEn ? 'You do not have an active shift to close. You can open a new shift from the top control bar.' : 'لا توجد وردية مفتوحة حالياً لحسابك لإغلاقها. يمكنك فتح وردية جديدة من شريط التحكم بأعلى الشاشة.'}
                    </p>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, #00E5FF, #0284C7)',
                            color: '#0B0E14',
                            border: 'none',
                            padding: '12px 30px',
                            borderRadius: '14px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            fontSize: '15px',
                            boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)'
                        }}
                    >
                        {isEn ? 'Got it' : 'حسناً، فهمت'}
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="warm-portal-overlay-fullscreen" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(11, 14, 20, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999999,
            padding: '15px'
        }}>
            <div className="glass-modal-container" onClick={(e) => e.stopPropagation()} style={{
                background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(15, 20, 30, 0.98) 100%)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '24px',
                width: '95vw',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '28px 24px',
                textAlign: 'right',
                direction: 'rtl',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65), 0 0 25px rgba(0, 229, 255, 0.1)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px', marginBottom: '14px' }}>
                    <div>
                        <h2 style={{ color: '#00E5FF', margin: 0, fontSize: '20px', fontWeight: 900 }}>🔒 {isEn ? 'Close Register & Shift (Z-Report)' : 'تقفيل الصندوق والوردية (Z-Report)'}</h2>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                            {isEn ? 'Shift ID:' : 'وردية رقم:'} #{String(activeShift.id).slice(-6)}
                        </span>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            color: '#f87171', 
                            border: '1px solid rgba(239, 68, 68, 0.3)', 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            fontSize: '18px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 'bold' 
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* تفاصيل المستودع والمندوب للوردية */}
                <div style={{
                    background: 'rgba(0, 229, 255, 0.05)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px'
                }}>
                    <div>
                        <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block', fontWeight: 700 }}>🏪 {isEn ? 'Branch:' : 'منفذ البيع:'}</span>
                        <strong style={{ color: '#00E5FF', fontSize: '13px' }}>{currentWarehouse?.name || (isEn ? 'Unknown Branch' : 'مستودع غير محدد')}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block', fontWeight: 700 }}>👤 {isEn ? 'Cashier / Rep:' : 'المندوب / الكاشير:'}</span>
                        <strong style={{ color: '#F8FAFC', fontSize: '13px' }}>{currentDelegate?.name || (isEn ? 'Direct Sales' : 'مبيعات مباشرة')}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block', fontWeight: 700 }}>🕒 {isEn ? 'Open Time:' : 'وقت الفتح:'}</span>
                        <strong style={{ color: '#F8FAFC', fontSize: '12px' }}>
                            {activeShift?.opened_at ? new Date(activeShift.opened_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </strong>
                    </div>
                </div>

                {isLoadingStats ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontWeight: 800, fontSize: '15px' }}>
                        {isEn ? '⏳ Calculating shift sales...' : '⏳ جاري جرد وحساب مبيعات الوردية...'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* ملخص المبيعات */}
                        <div style={{ background: 'rgba(15, 20, 30, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#94A3B8' }}>
                                <span>💵 {isEn ? 'Opening Cash:' : 'العهدة الافتتاحية:'}</span>
                                <strong style={{ color: '#F8FAFC' }}>{Number(activeShift.starting_cash || 0).toFixed(2)} {isEn ? 'SAR' : 'ريال'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                                <span>💰 {isEn ? 'Cash Sales:' : 'المبيعات النقدية (كاش):'}</span>
                                <strong>+ {totals.cash.toFixed(2)} {isEn ? 'SAR' : 'ريال'}</strong>
                            </div>
                            {Number((totals as any).standaloneCash || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#00E5FF' }}>
                                    <span>📥 {isEn ? 'Additional Collections:' : 'تحصيلات نقدية إضافية:'}</span>
                                    <strong>+ {Number((totals as any).standaloneCash).toFixed(2)} {isEn ? 'SAR' : 'ريال'}</strong>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#38BDF8' }}>
                                <span>💳 {isEn ? 'Card / POS Sales:' : 'مبيعات الشبكة / مدى:'}</span>
                                <strong>{totals.card.toFixed(2)} {isEn ? 'SAR' : 'ريال'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#fbbf24' }}>
                                <span>📋 {isEn ? 'Credit Sales:' : 'المبيعات الآجلة:'}</span>
                                <strong>{totals.credit.toFixed(2)} {isEn ? 'SAR' : 'ريال'}</strong>
                            </div>
                            {Number((totals as any).cashExpenses || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#f87171' }}>
                                    <span>💸 {isEn ? 'Drawer Expenses:' : 'مصروفات الدرج (كاش):'}</span>
                                    <strong>- {Number((totals as any).cashExpenses).toFixed(2)} {isEn ? 'SAR' : 'ريال'}</strong>
                                </div>
                            )}
                            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '10px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>
                                <span>🏦 {isEn ? 'Expected Cash in Register:' : 'النقدية المتوقعة بالدرج:'}</span>
                                <span style={{ fontSize: '20px', color: '#00E5FF' }}>{expectedCash.toFixed(2)} {isEn ? 'SAR' : 'ريال'}</span>
                            </div>
                        </div>

                        {/* إدخال النقدية الفعلية */}
                        <div className="form-group">
                            <label style={{ fontWeight: 900, color: '#00E5FF', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                💵 {isEn ? 'Actual Cash in Register (Counted):' : 'المبلغ الفعلي الموجود في الدرج الآن (بعد العد):'}
                            </label>
                            <input 
                                type="number" 
                                className="glass-input-field" 
                                value={actualCash} 
                                onChange={(e) => setActualCash(e.target.value === '' ? '' : Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                style={{ 
                                    fontSize: '26px', 
                                    fontWeight: 900, 
                                    textAlign: 'center', 
                                    borderColor: 'rgba(0, 229, 255, 0.5)', 
                                    height: '54px',
                                    background: 'rgba(11, 14, 20, 0.8)',
                                    color: '#00E5FF',
                                    borderRadius: '12px'
                                }}
                                placeholder="0.00"
                            />
                        </div>

                        {actualCash !== '' && (
                            <div style={{ 
                                textAlign: 'center', 
                                fontSize: '16px', 
                                fontWeight: 900, 
                                color: difference === 0 ? '#10B981' : difference > 0 ? '#00E5FF' : '#f87171', 
                                padding: '12px', 
                                background: difference === 0 ? 'rgba(16, 185, 129, 0.15)' : difference > 0 ? 'rgba(0, 229, 255, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                                borderRadius: '12px',
                                border: `1px solid ${difference === 0 ? 'rgba(16, 185, 129, 0.4)' : difference > 0 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                            }}>
                                {difference === 0 
                                    ? (isEn ? '✅ Register matches exactly (No variance)' : '✅ الصندوق مطابق تماماً (لا يوجد عجز أو زيادة)') 
                                    : difference > 0 
                                        ? `💰 يوجد زيادة بقيمة: +${difference.toFixed(2)} ${isEn ? 'SAR' : 'ريال'}` 
                                        : `⚠️ يوجد عجز بقيمة: -${Math.abs(difference).toFixed(2)} ${isEn ? 'SAR' : 'ريال'}`}
                            </div>
                        )}

                        {/* ⛽ قراءات عدادات المضخات ومطابقة كميات الوقود */}
                        <div style={{
                            background: 'rgba(15, 20, 30, 0.7)',
                            border: '1.5px solid rgba(0, 229, 255, 0.25)',
                            padding: '16px',
                            borderRadius: '16px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>⛽</span>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#F8FAFC' }}>
                                            {isEn ? 'Fuel Pump Meters & Dispensed Fuel' : 'قراءات عدادات المضخات (جرد المحروقات)'}
                                        </h4>
                                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                            {isEn ? 'Record closing meter reading for each pump' : 'سجّل قراءة العداد النهائية لمطابقة الوقود المباع مع الفواتير'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'end' }}>
                                    <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>
                                        {isEn ? 'Total Pumped' : 'إجمالي اللترات'}
                                    </span>
                                    <strong style={{ fontSize: '15px', color: '#00E5FF', fontWeight: 900 }}>
                                        {meterSummary.totalLiters.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isEn ? 'L' : 'لتر'}
                                    </strong>
                                </div>
                            </div>

                            {pumpReadings.length === 0 ? (
                                <div style={{ 
                                    padding: '12px', 
                                    textAlign: 'center', 
                                    background: 'rgba(245, 158, 11, 0.12)', 
                                    borderRadius: '12px', 
                                    color: '#fbbf24', 
                                    fontSize: '12px', 
                                    fontWeight: 700 
                                }}>
                                    {isEn ? 'No active pumps found for this station.' : 'لا توجد مضخات نشطة مسجلة لهذه المحطة.'}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                                    {pumpReadings.map((p) => {
                                        const isOctane91 = p.fuel_type?.includes('91');
                                        const isOctane95 = p.fuel_type?.includes('95');
                                        const fuelBadgeBg = isOctane91 ? 'rgba(16, 185, 129, 0.2)' : isOctane95 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)';
                                        const fuelBadgeColor = isOctane91 ? '#34d399' : isOctane95 ? '#f87171' : '#fbbf24';

                                        return (
                                            <div 
                                                key={p.pump_id} 
                                                style={{ 
                                                    background: 'rgba(20, 24, 34, 0.8)', 
                                                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                                                    borderRadius: '12px', 
                                                    padding: '10px 12px' 
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <strong style={{ fontSize: '13px', color: '#F8FAFC' }}>{p.pump_name}</strong>
                                                        <span style={{ 
                                                            fontSize: '10px', 
                                                            fontWeight: 800, 
                                                            padding: '2px 8px', 
                                                            borderRadius: '6px', 
                                                            background: fuelBadgeBg, 
                                                            color: fuelBadgeColor 
                                                        }}>
                                                            {p.fuel_type}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>
                                                        {p.unit_price.toFixed(2)} {isEn ? 'SAR/L' : 'ريال/لتر'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.2fr', gap: '8px', alignItems: 'center' }}>
                                                    {/* بداية الوردية */}
                                                    <div style={{ background: 'rgba(11, 14, 20, 0.6)', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                        <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', fontWeight: 700 }}>
                                                             {isEn ? 'Start Meter' : 'بداية الوردية'}
                                                        </span>
                                                        <strong style={{ fontSize: '12px', color: '#F8FAFC' }}>
                                                            {p.start_reading.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                                        </strong>
                                                    </div>

                                                    {/* نهاية الوردية */}
                                                    <div>
                                                        <span style={{ fontSize: '10px', color: '#00E5FF', display: 'block', fontWeight: 800, marginBottom: '2px' }}>
                                                            {isEn ? 'End Meter *' : 'نهاية الوردية (العداد) *'}
                                                        </span>
                                                        <input 
                                                            type="number"
                                                            step="any"
                                                            min={p.start_reading}
                                                            className="glass-input-field"
                                                            value={p.end_reading}
                                                            onChange={(e) => handleUpdateEndReading(p.pump_id, e.target.value === '' ? '' : Number(e.target.value))}
                                                            onFocus={(e) => e.target.select()}
                                                            style={{ 
                                                                fontSize: '13px', 
                                                                fontWeight: 800, 
                                                                textAlign: 'center', 
                                                                borderColor: 'rgba(0, 229, 255, 0.4)', 
                                                                background: 'rgba(11, 14, 20, 0.9)',
                                                                color: '#00E5FF',
                                                                padding: '6px 4px', 
                                                                height: '34px',
                                                                borderRadius: '8px'
                                                            }}
                                                            placeholder={String(p.start_reading)}
                                                        />
                                                    </div>

                                                    {/* الناتج المحسوب للترات والمبلغ */}
                                                    <div style={{ textAlign: 'end', background: 'rgba(0, 229, 255, 0.06)', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                                                        <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', fontWeight: 700 }}>
                                                            {isEn ? 'Dispensed' : 'المضخوخ'}
                                                        </span>
                                                        <strong style={{ fontSize: '12px', color: '#F8FAFC', display: 'block' }}>
                                                            {p.liters_pumped.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isEn ? 'L' : 'لتر'}
                                                        </strong>
                                                        <span style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 800 }}>
                                                            ≈ {p.expected_amount.toFixed(2)} {isEn ? 'SAR' : 'ر.س'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* ملخص مطابقة العدادات مع فواتير الكاشير */}
                                    <div style={{ 
                                        marginTop: '4px', 
                                        padding: '10px 12px', 
                                        borderRadius: '10px', 
                                        fontSize: '12px', 
                                        fontWeight: 800,
                                        background: meterSummary.totalMeterAmount === 0 
                                            ? 'rgba(255, 255, 255, 0.05)' 
                                            : Math.abs(meterSalesVariance) <= 5 
                                                ? 'rgba(16, 185, 129, 0.15)' 
                                                : meterSalesVariance > 5 
                                                    ? 'rgba(239, 68, 68, 0.15)' 
                                                    : 'rgba(245, 158, 11, 0.15)',
                                        color: meterSummary.totalMeterAmount === 0 
                                            ? '#94A3B8' 
                                            : Math.abs(meterSalesVariance) <= 5 
                                                ? '#10B981' 
                                                : meterSalesVariance > 5 
                                                    ? '#f87171' 
                                                    : '#fbbf24',
                                        border: `1px solid ${
                                            meterSummary.totalMeterAmount === 0 
                                                ? 'rgba(255, 255, 255, 0.1)' 
                                                : Math.abs(meterSalesVariance) <= 5 
                                                    ? 'rgba(16, 185, 129, 0.4)' 
                                                    : meterSalesVariance > 5 
                                                        ? 'rgba(239, 68, 68, 0.4)' 
                                                        : 'rgba(245, 158, 11, 0.4)'
                                        }`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>
                                                {meterSummary.totalMeterAmount === 0 
                                                    ? (isEn ? 'ℹ️ Please input closing meter readings above.' : 'ℹ️ يُرجى إدخال قراءات نهاية الوردية للمضخات أعلاه.')
                                                    : Math.abs(meterSalesVariance) <= 5
                                                        ? (isEn ? '✅ Meter readings match invoiced sales perfectly.' : '✅ قراءات العدادات مطابقة تماماً للمبيعات المصدرة بالكاشير.')
                                                        : meterSalesVariance > 5
                                                            ? (isEn 
                                                                ? `⚠️ Meter variance: Fuel pumped exceeds invoiced sales by +${meterSalesVariance.toFixed(2)} SAR!` 
                                                                : `⚠️ تنبيه فرق: تم ضخ وقود بقيمة +${meterSalesVariance.toFixed(2)} ريال زيادة عن فواتير الكاشير! (اشتباه وقود غير مفوتر)`)
                                                            : (isEn
                                                                ? `ℹ️ Invoiced sales exceed meter pump value by ${Math.abs(meterSalesVariance).toFixed(2)} SAR.`
                                                                : `ℹ️ مبيعات الكاشير تزيد عن قراءات العدادات بمقدار ${Math.abs(meterSalesVariance).toFixed(2)} ريال (مبيعات زيوت/خدمات إضافية).`)}
                                            </span>
                                            {meterSummary.totalMeterAmount > 0 && (
                                                <span style={{ fontSize: '11px', whiteSpace: 'nowrap', marginRight: '8px', color: '#00E5FF' }}>
                                                    (قيمة العدادات: {meterSummary.totalMeterAmount.toFixed(2)} ريال)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* أزرار الإجراء */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginTop: '8px' }}>
                            <button 
                                onClick={() => closeShiftMutation.mutate()} 
                                disabled={closeShiftMutation.isPending || actualCash === ''}
                                style={{ 
                                    height: '52px', 
                                    borderRadius: '14px', 
                                    border: 'none', 
                                    background: (actualCash === '' || closeShiftMutation.isPending) ? '#334155' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', 
                                    color: (actualCash === '' || closeShiftMutation.isPending) ? '#94a3b8' : '#ffffff', 
                                    fontWeight: 900, 
                                    fontSize: '16px', 
                                    cursor: (actualCash === '' || closeShiftMutation.isPending) ? 'not-allowed' : 'pointer',
                                    boxShadow: (actualCash === '' || closeShiftMutation.isPending) ? 'none' : '0 4px 15px rgba(239, 68, 68, 0.4)',
                                    transition: '0.2s'
                                }}
                            >
                                {closeShiftMutation.isPending ? (isEn ? '⏳ Closing...' : '⏳ جاري الإغلاق...') : (isEn ? '🔒 Confirm & Close Register' : '🔒 تأكيد وإغلاق الصندوق')}
                            </button>
                            <button
                                onClick={onClose}
                                type="button"
                                style={{
                                    height: '52px',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: '#94A3B8',
                                    fontWeight: 800,
                                    fontSize: '15px',
                                    cursor: 'pointer'
                                }}
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
