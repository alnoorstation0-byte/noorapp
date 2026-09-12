"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export default function ShiftOpenModal({ 
    isOpen, 
    onClose, 
    userProfile, 
    delegateId, 
    warehouseId,
    warehouses = [],
    delegates = [],
    onWarehouseChange,
    onDelegateChange
}: any) {
    const [targetWarehouseId, setTargetWarehouseId] = useState<string>(warehouseId || '');
    const [targetDelegateId, setTargetDelegateId] = useState<string>(delegateId || '');
    const [startingCash, setStartingCash] = useState<number | ''>(0);
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen) {
            setTargetWarehouseId(warehouseId || '');
            setTargetDelegateId(delegateId || '');
            setStartingCash(0);
        }
    }, [isOpen, warehouseId, delegateId]);

    // 🔒 جلب كافة الورديات النشطة حالياً في النظام لفحص التعارضات فورياً
    const { data: allActiveShifts = [], isLoading: checkingShifts } = useQuery({
        queryKey: ['pos_open_shifts'],
        enabled: !!isOpen,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pos_shifts')
                .select(`
                    id,
                    warehouse_id,
                    delegate_id,
                    opened_at,
                    starting_cash,
                    warehouse:warehouses(id, name, type),
                    delegate:partners!delegate_id(id, name)
                `)
                .eq('status', 'open');

            if (error) {
                console.warn('Error fetching all active shifts:', error);
                return [];
            }
            return data || [];
        }
    });

    // 1. هل المستودع المختار لديه وردية مفتوحة بالفعل؟
    const existingWarehouseShift = (allActiveShifts || []).find(
        (s: any) => s.warehouse_id === targetWarehouseId
    );

    // 2. هل المندوب المختار لديه وردية مفتوحة في مستودع آخر؟
    const existingDelegateShift = targetDelegateId ? (allActiveShifts || []).find(
        (s: any) => s.delegate_id === targetDelegateId
    ) : null;

    const isConflictWithOtherWarehouse = existingDelegateShift && existingDelegateShift.id !== existingWarehouseShift?.id;

    const selectedWarehouse = warehouses?.find((w: any) => w.id === targetWarehouseId);
    const selectedDelegate = delegates?.find((d: any) => d.id === targetDelegateId);

    const openShiftMutation = useMutation({
        mutationFn: async () => {
            if (!targetWarehouseId) {
                throw new Error('يرجى تحديد منفذ البيع / المستودع أولاً');
            }

            let currentUserId = userProfile?.id;
            if (!currentUserId) {
                const { data: { session } } = await supabase.auth.getSession();
                currentUserId = session?.user?.id;
            }
            if (!currentUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                currentUserId = user?.id;
            }

            // استدعاء مسار الباك إند المحمي بالكامل
            const res = await fetch('/api/pos/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouse_id: targetWarehouseId,
                    delegate_id: targetDelegateId || null,
                    user_id: currentUserId || null,
                    starting_cash: Number(startingCash) || 0
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'فشل فتح الوردية');
            }

            return result.data;
        },
        onSuccess: (data) => {
            showToast('تم فتح الوردية بنجاح 🚀', 'success');
            if (onWarehouseChange && targetWarehouseId !== warehouseId) {
                onWarehouseChange(targetWarehouseId);
            }
            if (onDelegateChange && targetDelegateId !== delegateId) {
                onDelegateChange(targetDelegateId);
            }
            queryClient.invalidateQueries({ queryKey: ['active_pos_shift'] });
            queryClient.invalidateQueries({ queryKey: ['pos_open_shifts'] });
            if (onClose) onClose();
        },
        onError: (err: any) => showToast(`فشل فتح الوردية: ${err.message}`, 'error')
    });

    // ⌨️ استجابة لوحة المفاتيح: Esc للإغلاق و Enter / Ctrl+Enter للبدء
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (onClose) onClose();
            } else if (e.key === 'Enter' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
                if (!openShiftMutation.isPending && targetWarehouseId && !existingWarehouseShift && !isConflictWithOtherWarehouse) {
                    e.preventDefault();
                    e.stopPropagation();
                    openShiftMutation.mutate();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, targetWarehouseId, existingWarehouseShift, isConflictWithOtherWarehouse, openShiftMutation]);

    if (!isOpen) return null;

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
            <style>{`
                .aqua-shift-btn {
                    background: linear-gradient(135deg, #2891C8 0%, #1C73AB 100%);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    border-radius: 16px;
                    width: 100%;
                    padding: 14px;
                    font-size: 16px;
                    font-weight: 900;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 25px rgba(28, 115, 171, 0.3);
                }
                .aqua-shift-btn:hover:not(:disabled) {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 30px rgba(28, 115, 171, 0.5);
                    background: linear-gradient(135deg, #7FD4E3 0%, #2891C8 100%);
                }
                .aqua-shift-input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.85);
                    border: 2px solid rgba(28, 115, 171, 0.2);
                    border-radius: 14px;
                    padding: 12px;
                    font-size: 24px;
                    font-weight: 900;
                    text-align: center;
                    color: #1C73AB;
                    transition: all 0.3s ease;
                    outline: none;
                    box-sizing: border-box;
                }
                .aqua-shift-input:focus {
                    border-color: #2891C8;
                    box-shadow: 0 0 15px rgba(40, 145, 200, 0.2);
                    background: #ffffff;
                }
                .aqua-glass-card {
                    background: rgba(255, 255, 255, 0.96);
                    backdrop-filter: blur(40px) saturate(200%);
                    WebkitBackdropFilter: blur(40px) saturate(200%);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    border-radius: 24px;
                    width: 95vw;
                    max-width: 480px;
                    padding: 30px 24px;
                    text-align: right;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                    animation: fadeUp 0.4s ease-out;
                    direction: rtl;
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .shift-select-field {
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    border: 1.5px solid rgba(28, 115, 171, 0.2);
                    background: rgba(255, 255, 255, 0.9);
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e293b;
                    outline: none;
                    transition: 0.2s;
                    box-sizing: border-box;
                }
                .shift-select-field:focus {
                    border-color: #2891C8;
                    box-shadow: 0 0 0 3px rgba(40, 145, 200, 0.15);
                }
            `}</style>
            
            <div className="aqua-glass-card" style={{ position: 'relative' }}>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        type="button"
                        style={{ 
                            position: 'absolute', top: 18, left: 18, 
                            background: '#fee2e2', border: 'none', 
                            fontSize: '15px', color: '#ef4444',
                            width: '32px', height: '32px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 10, fontWeight: 'bold' 
                        }}
                    >
                        ✕
                    </button>
                )}
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '42px', marginBottom: '4px' }}>💵</div>
                    <h2 style={{ color: '#1C73AB', margin: 0, fontWeight: 900, fontSize: '21px' }}>فتح وردية جديدة</h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontWeight: 700, fontSize: '12px' }}>
                        تسجيل العهدة الافتتاحية وبدء تشغيل الصندوق
                    </p>
                </div>

                {/* اختيار وتحديد منفذ البيع والمندوب */}
                <div style={{
                    background: 'rgba(28, 115, 171, 0.04)',
                    border: '1px solid rgba(28, 115, 171, 0.15)',
                    borderRadius: '16px',
                    padding: '14px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '5px' }}>
                            🏪 منفذ البيع / المستودع المراد فتح ورديته:
                        </label>
                        <select 
                            className="shift-select-field"
                            value={targetWarehouseId}
                            onChange={(e) => setTargetWarehouseId(e.target.value)}
                        >
                            <option value="">-- اختر منفذ البيع --</option>
                            {warehouses.map((w: any) => {
                                const hasOpen = allActiveShifts.some((s: any) => s.warehouse_id === w.id);
                                return (
                                    <option key={w.id} value={w.id}>
                                        {w.name} {hasOpen ? '🔴 (مشغول - به وردية نشطة)' : '🟢 (متاح لفتح وردية)'}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1C73AB', marginBottom: '5px' }}>
                            👤 المندوب / الكاشير المسؤول عن الوردية:
                        </label>
                        <select 
                            className="shift-select-field"
                            value={targetDelegateId}
                            onChange={(e) => setTargetDelegateId(e.target.value)}
                        >
                            <option value="">مبيعات مباشرة (بدون مندوب)</option>
                            {delegates.map((d: any) => {
                                const hasOpen = allActiveShifts.some((s: any) => s.delegate_id === d.id);
                                return (
                                    <option key={d.id} value={d.id}>
                                        {d.name} {hasOpen ? '🔴 (مسؤول عن وردية نشطة حالياً)' : '🟢 (متاح)'}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                {/* ⛔ تنبيه الحماية 1: المستودع لديه وردية مفتوحة بالفعل */}
                {existingWarehouseShift && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.05) 100%)',
                        border: '1.5px solid #ef4444',
                        borderRadius: '16px',
                        padding: '14px',
                        marginBottom: '16px',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 900, fontSize: '14px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '18px' }}>⛔</span>
                            <span>المستودع قيد التشغيل بالفعل!</span>
                        </div>
                        <p style={{ color: '#991b1b', fontSize: '12.5px', margin: '0 0 8px 0', lineHeight: 1.6, fontWeight: 700 }}>
                            توجد حالياً وردية مفتوحة في <strong>{selectedWarehouse?.name}</strong> برقم <strong>#{String(existingWarehouseShift.id).slice(-6)}</strong>.
                            <br />
                            المسؤول الحالي: <strong style={{ color: '#111827' }}>{(Array.isArray(existingWarehouseShift.delegate) ? existingWarehouseShift.delegate[0]?.name : (existingWarehouseShift.delegate as any)?.name) || 'مبيعات مباشرة'}</strong>.
                        </p>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.9)',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            color: '#b91c1c',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            border: '1px dashed #ef4444'
                        }}>
                            🔒 حماية النظام: المسؤول شخص واحد في المستودع ولا يمكن فتح ورديتين معاً في نفس الوقت. يجب إنهاء وتقفيل الوردية الحالية أولاً لبدء وردية جديدة.
                        </div>
                    </div>
                )}

                {/* ⚠️ تنبيه الحماية 2: المندوب لديه وردية مفتوحة في مستودع آخر */}
                {isConflictWithOtherWarehouse && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.05) 100%)',
                        border: '1.5px solid #f59e0b',
                        borderRadius: '16px',
                        padding: '14px',
                        marginBottom: '16px',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontWeight: 900, fontSize: '14px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '18px' }}>⚠️</span>
                            <span>المندوب مسؤول عن وردية نشطة في منفذ آخر!</span>
                        </div>
                        <p style={{ color: '#92400e', fontSize: '12.5px', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>
                            المندوب <strong>{selectedDelegate?.name}</strong> يدير حالياً وردية نشطة في <strong>{(Array.isArray(existingDelegateShift?.warehouse) ? existingDelegateShift?.warehouse[0]?.name : (existingDelegateShift?.warehouse as any)?.name) || 'منفذ آخر'}</strong>.
                            <br />
                            المسؤول شخص واحد ولا يمكن الجمع بين ورديتين لنفس الشخص في نفس الوقت.
                        </p>
                    </div>
                )}

                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#1C73AB', fontWeight: 900, fontSize: '13px' }}>
                        العهدة الافتتاحية (المبلغ بالدرج الآن بالريال):
                    </label>
                    <input 
                        type="number" 
                        className="aqua-shift-input"
                        value={startingCash} 
                        onChange={(e) => setStartingCash(e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        min="0"
                        disabled={!!existingWarehouseShift || !!isConflictWithOtherWarehouse || !targetWarehouseId}
                        style={{
                            opacity: (existingWarehouseShift || isConflictWithOtherWarehouse || !targetWarehouseId) ? 0.5 : 1,
                            cursor: (existingWarehouseShift || isConflictWithOtherWarehouse || !targetWarehouseId) ? 'not-allowed' : 'text'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => openShiftMutation.mutate()} 
                        disabled={
                            openShiftMutation.isPending || 
                            !targetWarehouseId || 
                            !!existingWarehouseShift || 
                            !!isConflictWithOtherWarehouse
                        }
                        className="aqua-shift-btn"
                        style={{ 
                            flex: 2,
                            opacity: (!targetWarehouseId || !!existingWarehouseShift || !!isConflictWithOtherWarehouse) ? 0.6 : 1,
                            cursor: (!targetWarehouseId || !!existingWarehouseShift || !!isConflictWithOtherWarehouse) ? 'not-allowed' : 'pointer',
                            background: (existingWarehouseShift || isConflictWithOtherWarehouse)
                                ? '#94a3b8'
                                : 'linear-gradient(135deg, #2891C8 0%, #1C73AB 100%)'
                        }}
                    >
                        {openShiftMutation.isPending 
                            ? '⏳ جاري فتح الوردية...' 
                            : existingWarehouseShift 
                                ? '⛔ المستودع به وردية نشطة بالفعل' 
                                : isConflictWithOtherWarehouse 
                                    ? '⛔ المندوب لديه وردية نشطة' 
                                    : !targetWarehouseId
                                        ? '⚠️ اختر منفذ البيع'
                                        : '✨ فتح الصندوق وبدء الوردية'
                        }
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            type="button"
                            style={{
                                flex: 1,
                                background: '#f1f5f9',
                                color: '#64748b',
                                border: 'none',
                                borderRadius: '16px',
                                fontWeight: 800,
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            إلغاء
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
