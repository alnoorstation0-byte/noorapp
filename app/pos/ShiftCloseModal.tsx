
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export default function ShiftCloseModal({ isOpen, onClose, activeShift }: any) {
    const [actualCash, setActualCash] = useState<number | ''>('');
    const [actualBottlesReturned, setActualBottlesReturned] = useState<number | ''>('');
    const [bottlesSold, setBottlesSold] = useState(0);
    const [totals, setTotals] = useState({ cash: 0, card: 0, credit: 0, total: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen && activeShift) {
            calculateZReport();
        }
    }, [isOpen, activeShift]);

    const calculateZReport = async () => {
        setIsLoadingStats(true);
        try {
            // Fetch invoices created during this shift
            const { data: invoices } = await supabase
                .from('invoices')
                .select('total_amount, payment_method, lines_data')
                .eq('shift_id', activeShift.id);

            let cash = 0, card = 0, credit = 0;
            let soldUnits = 0;

            (invoices || []).forEach(inv => {
                const amt = Number(inv.total_amount || 0);
                if (inv.payment_method === 'نقدي' || inv.payment_method === 'كاش') cash += amt;
                else if (inv.payment_method === 'آجل') credit += amt;
                else card += amt; // شبكة، تحويل بنكي الخ

                if (Array.isArray(inv.lines_data)) {
                    inv.lines_data.forEach((line: any) => {
                        soldUnits += Number(line.quantity || line.qty || 0);
                    });
                }
            });

            setTotals({ cash, card, credit, total: cash + card + credit });
            setBottlesSold(soldUnits);
            setActualBottlesReturned(soldUnits); // الافتراضي مطابقة كاملة
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const expectedCash = Number(activeShift?.starting_cash || 0) + totals.cash;
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
            onClose();
        },
        onError: (err: any) => showToast(`فشل إغلاق الوردية: ${err.message}`, 'error')
    });

    if (!isOpen || !activeShift) return null;

    return (
        <div className="modal-overlay">
            <div className="glass-panel" style={{ width: '500px', padding: '30px', textAlign: 'right', direction: 'rtl' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h2 style={{ color: '#1C73AB', margin: 0 }}>🔒 تقفيل الصندوق (Z-Report)</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#ef4444' }}>❌</button>
                </div>

                {isLoadingStats ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}>جاري حساب المبيعات...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '15px', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>العهدة الافتتاحية:</span>
                                <strong>{Number(activeShift.starting_cash).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#16a34a' }}>
                                <span>المبيعات النقدية:</span>
                                <strong>+ {totals.cash.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#2891C8' }}>
                                <span>مبيعات الشبكة/البنك:</span>
                                <strong>{totals.card.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#f59e0b' }}>
                                <span>المبيعات الآجلة:</span>
                                <strong>{totals.credit.toFixed(2)}</strong>
                            </div>
                            <hr style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '18px' }}>
                                <span>النقدية المتوقعة بالدرج:</span>
                                <strong>{expectedCash.toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', color: '#ef4444' }}>المبلغ الفعلي الموجود في الدرج الآن:</label>
                            <input 
                                type="number" 
                                className="glass-input-field" 
                                value={actualCash} 
                                onChange={(e) => setActualCash(e.target.value === '' ? '' : Number(e.target.value))}
                                style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', borderColor: '#ef4444' }}
                                placeholder="أدخل المبلغ الفعلي"
                            />
                        </div>

                        {actualCash !== '' && (
                            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: difference === 0 ? '#16a34a' : difference > 0 ? '#2891C8' : '#ef4444', padding: '10px', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
                                {difference === 0 ? '✅ الصندوق مطابق تماماً' : difference > 0 ? `💰 يوجد زيادة بقيمة: ${difference.toFixed(2)}` : `⚠️ يوجد عجز بقيمة: ${Math.abs(difference).toFixed(2)}`}
                            </div>
                        )}

                        {/* 🔄 مطابقة عهدة فوارغ الجالونات والعبوات */}
                        <div style={{ background: 'rgba(240, 249, 255, 0.8)', border: '1px solid rgba(40, 145, 200, 0.3)', padding: '15px', borderRadius: '12px' }}>
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
                                    style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center', borderColor: '#2891C8', padding: '6px' }}
                                    placeholder="الفوارغ"
                                />
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 800, textAlign: 'center', padding: '6px', borderRadius: '8px', background: bottlesShortage === 0 ? '#dcfce7' : bottlesShortage > 0 ? '#fee2e2' : '#f0f9ff', color: bottlesShortage === 0 ? '#16a34a' : bottlesShortage > 0 ? '#b91c1c' : '#0369a1' }}>
                                {bottlesShortage === 0 
                                    ? '✅ الفوارغ مطابقة تماماً' 
                                    : bottlesShortage > 0 
                                        ? `⚠️ عجز فوارغ: ${bottlesShortage} عبوة (تُقيد كذمة على المندوب)` 
                                        : `ℹ️ فوارغ إضافية مستلمة: +${Math.abs(bottlesShortage)} عبوة`}
                            </div>
                        </div>

                        <button 
                            onClick={() => closeShiftMutation.mutate()} 
                            disabled={closeShiftMutation.isPending || actualCash === ''}
                            className="btn-glass-save" 
                            style={{ width: '100%', marginTop: '10px', padding: '15px', fontSize: '18px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
                        >
                            {closeShiftMutation.isPending ? 'جاري الإغلاق...' : 'تأكيد وإغلاق الوردية 🔒'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
