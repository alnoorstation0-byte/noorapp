"use client";
import { useLanguage } from '@/lib/LanguageContext';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { notifyShiftOpened } from '@/lib/notificationService';


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
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const { language } = useLanguage();
    const isEn = language === 'en';

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

    // 🔒 جلب كافة الورديات النشطة حالياً في النظام لفحص التعارضات فورياً وبأمان تام
    const { data: allActiveShifts = [], isLoading: checkingShifts } = useQuery({
        queryKey: ['pos_open_shifts', isOpen],
        enabled: !!isOpen,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pos_shifts')
                .select('id, warehouse_id, delegate_id, user_id, opened_at, starting_cash')
                .eq('status', 'open');

            if (error) {
                console.warn('Error fetching all active shifts:', error);
                return [];
            }

            return (data || []).map((s: any) => {
                const wh = warehouses.find((w: any) => w.id === s.warehouse_id);
                const del = delegates.find((d: any) => 
                    (s.delegate_id && (d.id === s.delegate_id || d.partnerId === s.delegate_id)) ||
                    (s.user_id && d.userId === s.user_id)
                );
                return {
                    ...s,
                    warehouse: wh || { name: 'المستودع' },
                    delegate: del ? { name: del.name } : null
                };
            });
        }
    });

    // 🔄 فحص هل نفس الموظف/المندوب لديه وردية أُغلقت اليوم في هذا المنفذ؟
    const { data: todayClosedShift = null } = useQuery({
        queryKey: ['pos_today_closed_shift', targetWarehouseId, targetDelegateId],
        enabled: !!isOpen && !!targetWarehouseId,
        queryFn: async () => {
            const now = new Date();
            const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const todayStartIso = `${todayDateStr}T00:00:00.000Z`;

            let q = supabase
                .from('pos_shifts')
                .select('id, starting_cash, opened_at, closed_at, total_sales')
                .eq('warehouse_id', targetWarehouseId)
                .eq('status', 'closed')
                .gte('opened_at', todayStartIso)
                .order('closed_at', { ascending: false })
                .limit(1);

            const selectedEmp = delegates.find((d: any) => d.id === targetDelegateId || d.partnerId === targetDelegateId);
            const partId = selectedEmp?.partnerId || selectedEmp?.id || targetDelegateId;

            if (partId) {
                q = q.eq('delegate_id', partId);
            } else {
                q = q.is('delegate_id', null);
            }

            const { data, error } = await q;
            if (error) {
                console.warn('Error checking today closed shift:', error);
                return null;
            }
            return data?.[0] || null;
        }
    });

    // 👑 صلاحية الإدارة العليا للإشراف على عدة فروع
    const isManagerOrAdmin = Boolean(
        userProfile?.role === 'super_admin' || 
        userProfile?.role === 'admin' || 
        userProfile?.role === 'manager'
    );

    // 1. هل المستودع المختار لديه وردية مفتوحة بالفعل؟
    const existingWarehouseShift = (allActiveShifts || []).find(
        (s: any) => s.warehouse_id === targetWarehouseId
    );

    // 2. هل الموظف المختار لديه وردية مفتوحة في مستودع آخر؟
    const selectedDelegate = delegates?.find((d: any) => d.id === targetDelegateId || d.partnerId === targetDelegateId);

    const existingDelegateShift = selectedDelegate ? (allActiveShifts || []).find(
        (s: any) => (s.delegate_id && (s.delegate_id === selectedDelegate.id || s.delegate_id === selectedDelegate.partnerId)) ||
                    (s.user_id && selectedDelegate.userId && s.user_id === selectedDelegate.userId)
    ) : null;

    // يُستثنى المدير / المشرف من المنع عند فتح ورديات لفروع ومستودعات مختلفة لضمان استقلالية كل فرع
    const isConflictWithOtherWarehouse = !isManagerOrAdmin && Boolean(existingDelegateShift && existingDelegateShift.id !== existingWarehouseShift?.id);

    const selectedWarehouse = warehouses?.find((w: any) => w.id === targetWarehouseId);

    const openShiftMutation = useMutation({
        mutationFn: async () => {
            if (!targetWarehouseId) {
                throw new Error(isEn ? 'Please select a gas station first' : 'يرجى تحديد محطة الوقود / الخزان أولاً');
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

            const chosenEmp = delegates.find((d: any) => d.id === targetDelegateId || d.partnerId === targetDelegateId);
            const resolvedShiftUserId = chosenEmp?.userId || currentUserId;
            const resolvedShiftDelegateId = chosenEmp?.partnerId || chosenEmp?.id || targetDelegateId;

            // استدعاء مسار الباك إند المحمي بالكامل
            const res = await fetch('/api/pos/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouse_id: targetWarehouseId,
                    delegate_id: resolvedShiftDelegateId || null,
                    user_id: resolvedShiftUserId || null,
                    starting_cash: Number(startingCash) || 0
                })
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'فشل فتح الوردية');
            }

            return result;
        },
        onSuccess: (res: any) => {
            const isResumed = res?.is_resumed;
            showToast(isResumed ? (res?.message || (isEn ? 'Shift resumed successfully 🔄' : 'تم استئناف وردية اليوم بنجاح وتكملة المبيعات عليها 🔄')) : (isEn ? 'Shift opened successfully 🚀' : 'تم فتح الوردية بنجاح 🚀'), 'success');
            if (onWarehouseChange && targetWarehouseId !== warehouseId) {
                onWarehouseChange(targetWarehouseId);
            }
            if (onDelegateChange && targetDelegateId !== delegateId) {
                onDelegateChange(targetDelegateId);
            }
            queryClient.invalidateQueries({ queryKey: ['active_pos_shift'] });
            queryClient.invalidateQueries({ queryKey: ['pos_open_shifts'] });
            queryClient.invalidateQueries({ queryKey: ['pos_today_closed_shift'] });

            // 🔔 بث إشعار فتح الوردية للمسؤولين
            const whObj = warehouses.find((w: any) => w.id === targetWarehouseId);
            notifyShiftOpened({
                shiftId: res?.shift?.id || 'new-shift',
                cashierName: userProfile?.displayName || userProfile?.full_name || 'الكاشير',
                warehouseName: whObj?.name || (isEn ? 'Gas Station' : 'محطة الوقود'),
                startingCash: Number(startingCash) || 0
            }).catch(() => {});

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

    const handleOpenShift = () => {
        if (!openShiftMutation.isPending && targetWarehouseId && !existingWarehouseShift && !isConflictWithOtherWarehouse) {
            openShiftMutation.mutate();
        }
    };
    const loading = openShiftMutation.isPending;

    if (!isOpen || !mounted) return null;

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
            <style>{`
                .aqua-shift-btn {
                    background: linear-gradient(135deg, #00E5FF 0%, #0088CC 100%);
                    color: #0B0E14;
                    border: none;
                    border-radius: 14px;
                    width: 100%;
                    padding: 14px;
                    font-size: 16px;
                    font-weight: 900;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
                }
                .aqua-shift-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 0 25px rgba(0, 229, 255, 0.6);
                    filter: brightness(1.1);
                }
                .aqua-shift-input {
                    width: 100%;
                    background: rgba(15, 20, 30, 0.85);
                    border: 2px solid rgba(0, 229, 255, 0.3);
                    border-radius: 14px;
                    padding: 12px;
                    font-size: 24px;
                    font-weight: 900;
                    text-align: center;
                    color: #00E5FF;
                    transition: all 0.3s ease;
                    outline: none;
                    box-sizing: border-box;
                }
                .aqua-shift-input:focus {
                    border-color: #00E5FF;
                    box-shadow: 0 0 15px rgba(0, 229, 255, 0.35);
                    background: rgba(15, 20, 30, 0.95);
                }
                .aqua-glass-card {
                    background: linear-gradient(135deg, rgba(20, 24, 34, 0.98) 0%, rgba(13, 16, 24, 0.95) 100%);
                    backdrop-filter: blur(24px) saturate(160%);
                    WebkitBackdropFilter: blur(24px) saturate(160%);
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    border-radius: 24px;
                    width: 95vw;
                    max-width: 480px;
                    padding: 30px 24px;
                    text-align: right;
                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.1);
                    animation: fadeUp 0.35s ease-out;
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
                    border: 1.5px solid rgba(0, 229, 255, 0.25);
                    background: rgba(15, 20, 30, 0.85);
                    font-size: 13px;
                    font-weight: 700;
                    color: #F8FAFC;
                    outline: none;
                    transition: 0.2s;
                    box-sizing: border-box;
                }
                .shift-select-field option {
                    background: #141822;
                    color: #F8FAFC;
                }
                .shift-select-field:focus {
                    border-color: #00E5FF;
                    box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.2);
                }

                .daylight-theme .aqua-glass-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.98) 0%, rgba(250, 246, 240, 0.95) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.35) !important;
                    box-shadow: 0 25px 60px rgba(44, 26, 18, 0.15) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .aqua-glass-card h2 {
                    color: #2C1A12 !important;
                }
                .daylight-theme .aqua-glass-card p {
                    color: rgba(44, 26, 18, 0.7) !important;
                }
                .daylight-theme .shift-select-field {
                    background: #FFFFFF !important;
                    border-color: rgba(194, 155, 98, 0.35) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .shift-select-field option {
                    background: #FFFFFF !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .aqua-shift-input {
                    background: #FFFFFF !important;
                    border-color: rgba(194, 155, 98, 0.35) !important;
                    color: #A8573C !important;
                }
                .daylight-theme .shift-info-box {
                    background: rgba(194, 155, 98, 0.08) !important;
                    border-color: rgba(194, 155, 98, 0.25) !important;
                }
                .daylight-theme .shift-info-box label,
                .daylight-theme .shift-info-box span {
                    color: #2C1A12 !important;
                }
            `}</style>
            
            <div className="aqua-glass-card glass-modal-container" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        type="button"
                        style={{ 
                            position: 'absolute', top: 18, left: 18, 
                            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', 
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
                    <h2 style={{ color: '#F8FAFC', margin: 0, fontWeight: 900, fontSize: '21px' }}>{isEn ? 'Open New Shift' : 'فتح وردية جديدة'}</h2>
                    <p style={{ color: '#94A3B8', margin: '4px 0 0 0', fontWeight: 700, fontSize: '12px' }}>
                        {isEn ? 'Record opening cash and start register' : 'تسجيل العهدة الافتتاحية وبدء تشغيل الصندوق'}
                    </p>
                </div>

                {/* اختيار وتحديد منفذ البيع والمندوب */}
                <div className="shift-info-box" style={{
                    background: 'rgba(15, 20, 30, 0.7)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '14px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#F8FAFC', marginBottom: '5px' }}>
                            ⛽ {isEn ? 'Gas Station / Fuel Tank to open shift for:' : 'محطة الوقود / الخزان المراد فتح ورديتها:'}
                        </label>
                        <select 
                            className="shift-select-field"
                            value={targetWarehouseId}
                            onChange={(e) => setTargetWarehouseId(e.target.value)}
                        >
                            <option value="">{isEn ? '-- Select Gas Station --' : '-- اختر محطة الوقود --'}</option>
                            {warehouses.map((w: any) => {
                                const hasOpen = allActiveShifts.some((s: any) => s.warehouse_id === w.id);
                                return (
                                    <option key={w.id} value={w.id}>
                                        {w.name} {hasOpen ? (isEn ? '🔴 (Busy - Active Shift)' : '🔴 (مشغول - به وردية نشطة)') : (isEn ? '🟢 (Available)' : '🟢 (متاح لفتح وردية)')}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#F8FAFC', marginBottom: '5px' }}>
                            👤 {isEn ? 'Station Operator / Cashier:' : 'مشغل المحطة / الكاشير المسؤول:'}
                        </label>
                        <select 
                            className="shift-select-field"
                            value={targetDelegateId}
                            onChange={(e) => setTargetDelegateId(e.target.value)}
                        >
                            <option value="">{isEn ? '-- Select Station Operator --' : '-- اختر مشغل المحطة / الكاشير --'}</option>
                            {delegates.map((d: any) => {
                                const hasOpen = allActiveShifts.some((s: any) => 
                                    (s.delegate_id && (s.delegate_id === d.id || s.delegate_id === d.partnerId)) ||
                                    (s.user_id && d.userId && s.user_id === d.userId)
                                );
                                const roleLabel = d.role ? `(${d.role})` : '';
                                return (
                                    <option key={d.id} value={d.id}>
                                        {d.name} {roleLabel} {hasOpen ? (isEn ? '🔴 (Has active shift)' : '🔴 (لديه وردية نشطة حالياً)') : (isEn ? '🟢 (Available)' : '🟢 (متاح)')}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                {/* ⛔ تنبيه الحماية 1: المستودع لديه وردية مفتوحة بالفعل */}
                {existingWarehouseShift && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.08) 100%)',
                        border: '1.5px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '16px',
                        padding: '14px',
                        marginBottom: '16px',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 900, fontSize: '14px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '18px' }}>⛔</span>
                            <span>{isEn ? 'Station already running!' : 'محطة الوقود قيد التشغيل بالفعل!'}</span>
                        </div>
                        <p style={{ color: '#fca5a5', fontSize: '12.5px', margin: '0 0 8px 0', lineHeight: 1.6, fontWeight: 700 }}>
                            {isEn ? 'A shift is currently open for this station: ' : 'توجد وردية نشطة ومفتوحة حالياً لهذه المحطة برقم '}<strong>#{existingWarehouseShift.shift_number || String(existingWarehouseShift.id).slice(-6)}</strong>.
                        </p>
                    </div>
                )}

                {/* ⚠️ تنبيه الحماية 2: المشغل لديه وردية مفتوحة في محطة أخرى */}
                {isConflictWithOtherWarehouse && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
                        border: '1.5px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: '16px',
                        padding: '14px',
                        marginBottom: '16px',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 900, fontSize: '14px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '18px' }}>⚠️</span>
                            <span>{isEn ? 'Operator has active shift in another station!' : 'المشغل مسؤول عن وردية نشطة في محطة أخرى!'}</span>
                        </div>
                        <p style={{ color: '#fcd34d', fontSize: '12.5px', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>
                            {isEn ? 'Operator ' : 'المشغل '}<strong>{selectedDelegate?.name}</strong>{isEn ? ' is currently managing an active shift in ' : ' يدير حالياً وردية نشطة في '}<strong>{(Array.isArray(existingDelegateShift?.warehouse) ? existingDelegateShift?.warehouse[0]?.name : (existingDelegateShift?.warehouse as any)?.name) || (isEn ? 'another station' : 'محطة أخرى')}</strong>.
                            <br />
                            {isEn ? 'An operator cannot manage two shifts simultaneously.' : 'المسؤول شخص واحد ولا يمكن الجمع بين ورديتين لنفس المشغل في نفس الوقت.'}
                        </p>
                    </div>
                )}

                {/* 👑 إشعار الإدارة: إمكانية فتح وإشراف ورديات متعددة للفروع المستقلة */}
                {isManagerOrAdmin && existingDelegateShift && existingDelegateShift.id !== existingWarehouseShift?.id && !existingWarehouseShift && (
                    <div style={{
                        background: 'rgba(0, 229, 255, 0.08)',
                        border: '1.5px solid rgba(0, 229, 255, 0.3)',
                        borderRadius: '16px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00E5FF', fontWeight: 900, fontSize: '13px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px' }}>👑</span>
                            <span>{isEn ? 'Management Mode: Multi-Branch Shifts Permitted' : 'وضع الإدارة: فتح وإدارة ورديات مستقلة للفروع متاح'}</span>
                        </div>
                        <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0, lineHeight: 1.5, fontWeight: 700 }}>
                            {isEn 
                                ? 'As an administrator, you can open and supervise independent shifts across different branches simultaneously.' 
                                : 'بصفتك مديراً / مسؤول نظام، يمكنك فتح وردية مستقلة تماماً لهذا الفرع مع بقاء ورديات الفروع الأخرى نشطة ومستقلة بمبيعاتها وخزينتها.'}
                        </p>
                    </div>
                )}

                {/* 🔄 إشعار استئناف وردية اليوم لنفس المندوب */}
                {todayClosedShift && !existingWarehouseShift && !isConflictWithOtherWarehouse && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1.5px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '16px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        textAlign: 'right'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 900, fontSize: '13.5px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px' }}>🔄</span>
                            <span>{isEn ? 'Resume today\'s shift for this operator' : 'استئناف وردية اليوم لنفس المشغل'}</span>
                        </div>
                        <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0, lineHeight: 1.5, fontWeight: 700 }}>
                            {isEn ? 'There is a closed shift today for this operator in this station ID: ' : 'توجد وردية أُغلقت اليوم لهذا المشغل في هذه المحطة برقم '}<strong>#{todayClosedShift.shift_number || String(todayClosedShift.id).slice(-6)}</strong>.
                            <br />
                            {isEn ? 'Clicking below will ' : 'النقر أدناه سيقوم بـ '}<strong>{isEn ? 'resume the same shift' : 'استئناف نفس الوردية'}</strong>{isEn ? ' to continue today\'s sales.' : ' لتكملة مبيعات اليوم عليها دون فتح وردية مكررة.'}
                        </p>
                    </div>
                )}

                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#00E5FF', fontWeight: 900, fontSize: '13px' }}>
                        {isEn ? 'Opening Cash (Amount in register SAR):' : 'العهدة الافتتاحية (المبلغ بالدرج الآن بالريال):'}
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

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        disabled={loading || !!existingWarehouseShift || !!isConflictWithOtherWarehouse || !targetWarehouseId}
                        onClick={handleOpenShift}
                        type="button"
                        style={{
                            flex: 2,
                            background: (existingWarehouseShift || isConflictWithOtherWarehouse || !targetWarehouseId)
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'linear-gradient(135deg, #00E5FF 0%, #0077B6 100%)',
                            color: (existingWarehouseShift || isConflictWithOtherWarehouse || !targetWarehouseId) ? '#64748B' : '#0B0E14',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '14px',
                            fontWeight: 900,
                            fontSize: '14px',
                            cursor: (existingWarehouseShift || isConflictWithOtherWarehouse || !targetWarehouseId) ? 'not-allowed' : 'pointer',
                            boxShadow: (existingWarehouseShift || isConflictWithOtherWarehouse || !targetWarehouseId)
                                ? 'none'
                                : '0 4px 20px rgba(0, 229, 255, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {loading 
                            ? (todayClosedShift ? (isEn ? '⏳ Resuming shift...' : '⏳ جاري استئناف الوردية...') : (isEn ? '⏳ Opening shift...' : '⏳ جاري فتح الوردية...'))
                            : existingWarehouseShift 
                                ? (isEn ? '⛔ Station has active shift' : '⛔ المحطة بها وردية نشطة بالفعل') 
                                : isConflictWithOtherWarehouse 
                                    ? (isEn ? '⛔ Operator has active shift' : '⛔ المشغل لديه وردية نشطة') 
                                    : !targetWarehouseId
                                        ? (isEn ? '⚠️ Select Station' : '⚠️ اختر محطة الوقود')
                                        : todayClosedShift
                                            ? (isEn ? '🔄 Resume Shift' : '🔄 استئناف وردية اليوم وتكملة المبيعات')
                                            : (isEn ? '✨ Open Shift & Start' : '✨ فتح الصندوق وبدء الوردية')
                        }
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            type="button"
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#94A3B8',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '16px',
                                fontWeight: 800,
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            {isEn ? 'Cancel' : 'إلغاء'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
