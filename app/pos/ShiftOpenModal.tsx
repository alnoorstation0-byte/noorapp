
"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export default function ShiftOpenModal({ isOpen, onClose, userProfile, delegateId, warehouseId }: any) {
    const [startingCash, setStartingCash] = useState(0);
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const openShiftMutation = useMutation({
        mutationFn: async () => {
            if (!userProfile?.id) throw new Error('لا يوجد مستخدم مسجل الدخول');
            const { error } = await supabase.from('pos_shifts').insert([{
                user_id: userProfile.id,
                delegate_id: delegateId || null,
                warehouse_id: warehouseId || null,
                starting_cash: startingCash,
                status: 'open'
            }]);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            showToast('تم فتح الوردية بنجاح 🚀', 'success');
            queryClient.invalidateQueries({ queryKey: ['active_pos_shift'] });
            if (onClose) onClose();
        },
        onError: (err: any) => showToast(`فشل فتح الوردية: ${err.message}`, 'error')
    });

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(244, 241, 238, 0.3)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <style>{`
                .aqua-shift-btn {
                    background: linear-gradient(135deg, #2891C8 0%, #1C73AB 100%);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    border-radius: 16px;
                    width: 100%;
                    padding: 15px;
                    font-size: 18px;
                    font-weight: 900;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 25px rgba(28, 115, 171, 0.3);
                }
                .aqua-shift-btn:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 30px rgba(28, 115, 171, 0.5);
                    background: linear-gradient(135deg, #7FD4E3 0%, #2891C8 100%);
                }
                .aqua-shift-input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.6);
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    border-radius: 16px;
                    padding: 15px;
                    font-size: 28px;
                    font-weight: 900;
                    text-align: center;
                    color: #1C73AB;
                    transition: all 0.3s ease;
                    outline: none;
                }
                .aqua-shift-input:focus {
                    border-color: #2891C8;
                    box-shadow: 0 0 15px rgba(40, 145, 200, 0.2);
                    background: rgba(255, 255, 255, 0.9);
                }
                .aqua-glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(40px) saturate(200%);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 24px;
                    width: 95vw;
                    max-width: 450px;
                    padding: 40px 30px;
                    text-align: center;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
                    animation: fadeUp 0.5s ease-out;
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            
            <div className="aqua-glass-card" style={{ position: 'relative' }}>
                {userProfile?.role === 'super_admin' && onClose && (
                    <button 
                        onClick={onClose} 
                        style={{ position: 'absolute', top: 15, left: 15, background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', zIndex: 10 }}
                    >
                        ❌
                    </button>
                )}
                <div style={{ fontSize: '60px', marginBottom: '15px', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.1))' }}>💵</div>
                <h2 style={{ color: '#1C73AB', marginBottom: '10px', fontWeight: 900, fontSize: '28px' }}>فتح وردية جديدة</h2>
                <p style={{ color: '#475569', marginBottom: '30px', fontWeight: 'bold' }}>يجب تسجيل العهدة الافتتاحية لفتح نقطة البيع</p>
                
                <div style={{ textAlign: 'right', marginBottom: '30px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#1C73AB', fontWeight: 'bold', fontSize: '15px' }}>
                        العهدة الافتتاحية (المبلغ بالدرج الآن)
                    </label>
                    <input 
                        type="number" 
                        className="aqua-shift-input"
                        value={startingCash} 
                        onChange={(e) => setStartingCash(Number(e.target.value))}
                        placeholder="0.00"
                        min="0"
                    />
                </div>

                <button 
                    onClick={() => openShiftMutation.mutate()} 
                    disabled={openShiftMutation.isPending}
                    className="aqua-shift-btn"
                >
                    {openShiftMutation.isPending ? '⏳ جاري فتح الوردية...' : '✨ فتح الصندوق وبدء العمل'}
                </button>
            </div>
        </div>
    );
}
