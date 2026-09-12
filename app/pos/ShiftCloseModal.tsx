
"use client";
import React, { useState, useEffect } from 'react';
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
    const [actualCash, setActualCash] = useState<number | ''>('');
    const [actualBottlesReturned, setActualBottlesReturned] = useState<number | ''>('');
    const [bottlesSold, setBottlesSold] = useState(0);
    const [totals, setTotals] = useState({ cash: 0, card: 0, credit: 0, total: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const currentWarehouse = warehouses?.find((w: any) => w.id === activeShift?.warehouse_id);
    const currentDelegate = delegates?.find((d: any) => d.id === activeShift?.delegate_id);

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
                .neq('status', 'ملغي');

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
                .neq('status', 'ملغي');

            let cash = 0, card = 0, credit = 0;
            let cashExpenses = 0, totalExpenses = 0;
            let soldUnits = 0;

            // Fetch returnable items to accurately count bottles
            const { data: retItems } = await supabase
                .from('inventory_items')
                .select('id')
                .eq('is_returnable_bottle', true);
            const retItemSet = new Set((retItems || []).map(r => r.id));

            const shiftInvoiceIdSet = new Set((invoices || []).map(i => i.id));

            (invoices || []).forEach(inv => {
                const amt = Number(inv.total_amount || 0);
                const paymentCat = classifyPaymentMethod(inv.payment_method);
                if (paymentCat === 'cash') cash += amt;
                else if (paymentCat === 'card') card += amt;
                else if (paymentCat === 'credit') credit += amt;

                if (Array.isArray(inv.lines_data)) {
                    inv.lines_data.forEach((line: any) => {
                        const isReturnable = line.is_returnable_bottle === true || retItemSet.has(line.item_id);
                        if (isReturnable) {
                            soldUnits += Number(line.quantity || line.qty || 0);
                        }
                    });
                }
            });

            // Add standalone receipts collected during shift (not already in this shift's invoices)
            (shiftReceipts || []).forEach((rc: any) => {
                if (!rc.invoice_id || !shiftInvoiceIdSet.has(rc.invoice_id)) {
                    const rcAmt = Number(rc.amount || 0);
                    const rcCat = classifyPaymentMethod(rc.payment_method);
                    if (rcCat === 'cash') cash += rcAmt;
                    else if (rcCat === 'card') card += rcAmt;
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

            setTotals({ cash, card, credit, total: cash + card + credit, cashExpenses, totalExpenses } as any);
            setBottlesSold(soldUnits);
            setActualBottlesReturned(soldUnits); // الافتراضي مطابقة كاملة
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const expectedCash = Number(activeShift?.starting_cash || 0) + (totals.cash || 0) - ((totals as any).cashExpenses || 0);
    const difference = actualCash === '' ? 0 : Number(actualCash) - expectedCash;
    const returnedCount = actualBottlesReturned === '' ? 0 : Number(actualBottlesReturned);
    const bottlesShortage = bottlesSold - returnedCount;

    const closeShiftMutation = useMutation({
        mutationFn: async () => {
            if (actualCash === '') throw new Error('الرجاء إدخال النقدية الفعلية الموجودة في الدرج');
            
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
                bottles_sold: bottlesSold,
                bottles_returned: returnedCount,
                bottles_shortage: bottlesShortage,
                status: 'closed'
            }).eq('id', activeShift.id);

            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            showToast('تم إغلاق الوردية وتقفيل الصندوق وعهدة الفوارغ بنجاح 🔒', 'success');
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

    if (!isOpen) return null;

    if (!activeShift) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 99999,
                padding: '15px'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(40px) saturate(200%)',
                    borderRadius: '24px',
                    width: '95vw',
                    maxWidth: '450px',
                    padding: '35px 25px',
                    textAlign: 'center',
                    direction: 'rtl',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.8)'
                }}>
                    <div style={{ fontSize: '55px', marginBottom: '12px' }}>ℹ️</div>
                    <h3 style={{ color: '#1C73AB', marginBottom: '10px', fontWeight: 900, fontSize: '20px' }}>لا توجد وردية نشطة حالياً</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px', fontWeight: 700, lineHeight: '1.6' }}>
                        لا توجد وردية مفتوحة حالياً لحسابك لإغلاقها. يمكنك فتح وردية جديدة من شريط التحكم بأعلى الشاشة.
                    </p>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, #1C73AB, #2891C8)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 30px',
                            borderRadius: '14px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: '15px',
                            boxShadow: '0 4px 15px rgba(28, 115, 171, 0.3)'
                        }}
                    >
                        حسناً، فهمت
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            padding: '15px'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '24px',
                width: '95vw',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '28px 24px',
                textAlign: 'right',
                direction: 'rtl',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '15px', marginBottom: '14px' }}>
                    <div>
                        <h2 style={{ color: '#1C73AB', margin: 0, fontSize: '20px', fontWeight: 900 }}>🔒 تقفيل الصندوق والوردية (Z-Report)</h2>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                            وردية رقم: #{String(activeShift.id).slice(-6)}
                        </span>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: '#fee2e2', 
                            color: '#ef4444', 
                            border: 'none', 
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
                    background: 'rgba(28, 115, 171, 0.06)',
                    border: '1px solid rgba(28, 115, 171, 0.2)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px'
                }}>
                    <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 700 }}>🏪 منفذ البيع:</span>
                        <strong style={{ color: '#1C73AB', fontSize: '13px' }}>{currentWarehouse?.name || 'مستودع غير محدد'}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 700 }}>👤 المندوب / الكاشير:</span>
                        <strong style={{ color: '#0f172a', fontSize: '13px' }}>{currentDelegate?.name || 'مبيعات مباشرة (بدون مندوب)'}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 700 }}>🕒 وقت الفتح:</span>
                        <strong style={{ color: '#0f172a', fontSize: '12px' }}>
                            {activeShift?.opened_at ? new Date(activeShift.opened_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </strong>
                    </div>
                </div>

                {isLoadingStats ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 800, fontSize: '15px' }}>
                        ⏳ جاري جرد وحساب مبيعات الوردية...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* ملخص المبيعات */}
                        <div style={{ background: 'rgba(248, 250, 252, 0.9)', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                                <span>💵 العهدة الافتتاحية:</span>
                                <strong style={{ color: '#0f172a' }}>{Number(activeShift.starting_cash || 0).toFixed(2)} ريال</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                                <span>💰 المبيعات النقدية (كاش):</span>
                                <strong>+ {totals.cash.toFixed(2)} ريال</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#2891C8' }}>
                                <span>💳 مبيعات الشبكة / مدى:</span>
                                <strong>{totals.card.toFixed(2)} ريال</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#d97706' }}>
                                <span>📋 المبيعات الآجلة:</span>
                                <strong>{totals.credit.toFixed(2)} ريال</strong>
                            </div>
                            <hr style={{ borderColor: '#e2e8f0', margin: '10px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#1C73AB' }}>
                                <span>🏦 النقدية المتوقعة بالدرج:</span>
                                <span style={{ fontSize: '20px', color: '#1C73AB' }}>{expectedCash.toFixed(2)} ريال</span>
                            </div>
                        </div>

                        {/* إدخال النقدية الفعلية */}
                        <div className="form-group">
                            <label style={{ fontWeight: 900, color: '#ef4444', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                💵 المبلغ الفعلي الموجود في الدرج الآن (بعد العد):
                            </label>
                            <input 
                                type="number" 
                                className="glass-input-field" 
                                value={actualCash} 
                                onChange={(e) => setActualCash(e.target.value === '' ? '' : Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                style={{ fontSize: '26px', fontWeight: 900, textAlign: 'center', borderColor: '#ef4444', height: '54px' }}
                                placeholder="0.00"
                            />
                        </div>

                        {actualCash !== '' && (
                            <div style={{ 
                                textAlign: 'center', 
                                fontSize: '16px', 
                                fontWeight: 900, 
                                color: difference === 0 ? '#16a34a' : difference > 0 ? '#0284c7' : '#dc2626', 
                                padding: '12px', 
                                background: difference === 0 ? '#dcfce7' : difference > 0 ? '#e0f2fe' : '#fee2e2', 
                                borderRadius: '12px',
                                border: `1px solid ${difference === 0 ? '#86efac' : difference > 0 ? '#7dd3fc' : '#fca5a5'}`
                            }}>
                                {difference === 0 
                                    ? '✅ الصندوق مطابق تماماً (لا يوجد عجز أو زيادة)' 
                                    : difference > 0 
                                        ? `💰 يوجد زيادة بقيمة: +${difference.toFixed(2)} ريال` 
                                        : `⚠️ يوجد عجز بقيمة: -${Math.abs(difference).toFixed(2)} ريال`}
                            </div>
                        )}

                        {/* 🔄 مطابقة عهدة فوارغ الجالونات والعبوات */}
                        <div style={{ background: 'rgba(240, 249, 255, 0.9)', border: '1.5px solid rgba(40, 145, 200, 0.35)', padding: '15px', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: '#1C73AB' }}>🔄 عهدة فوارغ المياه المباعة:</span>
                                <span style={{ fontSize: '15px', fontWeight: 900, color: '#122946' }}>{bottlesSold} عبوة / جالون</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>عدد الفوارغ المستلمة فعلياً:</label>
                                <input 
                                    type="number"
                                    min="0"
                                    className="glass-input-field"
                                    value={actualBottlesReturned}
                                    onChange={(e) => setActualBottlesReturned(e.target.value === '' ? '' : Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center', borderColor: '#2891C8', padding: '6px' }}
                                    placeholder="الفوارغ"
                                />
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 800, textAlign: 'center', padding: '8px', borderRadius: '10px', background: bottlesShortage === 0 ? '#dcfce7' : bottlesShortage > 0 ? '#fee2e2' : '#f0f9ff', color: bottlesShortage === 0 ? '#16a34a' : bottlesShortage > 0 ? '#b91c1c' : '#0369a1' }}>
                                {bottlesShortage === 0 
                                    ? '✅ الفوارغ مطابقة تماماً' 
                                    : bottlesShortage > 0 
                                        ? `⚠️ عجز فوارغ: ${bottlesShortage} عبوة (تُقيد كذمة على المندوب)` 
                                        : `ℹ️ فوارغ إضافية مستلمة: +${Math.abs(bottlesShortage)} عبوة`}
                            </div>
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
                                    background: (actualCash === '' || closeShiftMutation.isPending) ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', 
                                    color: 'white', 
                                    fontWeight: 900, 
                                    fontSize: '16px', 
                                    cursor: (actualCash === '' || closeShiftMutation.isPending) ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                    transition: '0.2s'
                                }}
                            >
                                {closeShiftMutation.isPending ? '⏳ جاري الإغلاق...' : '🔒 تأكيد وإغلاق الصندوق'}
                            </button>
                            <button
                                onClick={onClose}
                                type="button"
                                style={{
                                    height: '52px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#64748b',
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
        </div>
    );
}
