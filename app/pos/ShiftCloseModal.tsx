
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export default function ShiftCloseModal({ isOpen, onClose, activeShift }: any) {
    const [actualCash, setActualCash] = useState<number | ''>('');
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
                .select('total_amount, payment_method')
                .eq('shift_id', activeShift.id);

            let cash = 0, card = 0, credit = 0;
            (invoices || []).forEach(inv => {
                const amt = Number(inv.total_amount || 0);
                if (inv.payment_method === 'نقدي' || inv.payment_method === 'كاش') cash += amt;
                else if (inv.payment_method === 'آجل') credit += amt;
                else card += amt; // شبكة، تحويل بنكي الخ
            });

            setTotals({ cash, card, credit, total: cash + card + credit });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const expectedCash = Number(activeShift?.starting_cash || 0) + totals.cash;
    const difference = actualCash === '' ? 0 : Number(actualCash) - expectedCash;

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
                status: 'closed'
            }).eq('id', activeShift.id);

            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            showToast('تم إغلاق الوردية وتقفيل الصندوق بنجاح 🔒', 'success');
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
