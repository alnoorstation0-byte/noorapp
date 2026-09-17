"use client";
import React, { useState, useEffect } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import { THEME } from '@/lib/theme';
import SmartCombo from '@/components/SmartCombo';

export default function AccountModal({ isOpen, onClose, record, setRecord, onSave, allAccounts }: any) {
    const [mounted, setMounted] = useState(false);
    const [localRootId, setLocalRootId] = useState<string>('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const isEdit = !!record?.id;

    // Initialize localRootId when modal opens
    useEffect(() => {
        if (isOpen && allAccounts && !isEdit) {
            // New account: if they didn't pass a parent, we don't set a root.
            setLocalRootId(record?.parent_id ? (allAccounts.find((a: any) => a.id === record.parent_id)?.parent_id || record.parent_id) : '');
        } else if (isOpen && allAccounts && isEdit) {
            if (record?.parent_id) {
                const parent = allAccounts.find((a: any) => a.id === record.parent_id);
                if (parent && parent.parent_id) {
                    setLocalRootId(parent.parent_id);
                } else if (parent) {
                    setLocalRootId(parent.id);
                }
            } else {
                setLocalRootId('');
            }
        }
    }, [isOpen, record, allAccounts, isEdit]);

    // Auto-generate initial code when modal opens for a new account
    useEffect(() => {
        if (isOpen && !isEdit && !record?.code && allAccounts && allAccounts.length > 0) {
            const roots = allAccounts.filter((a: any) => !a.parent_id);
            const maxRoot = roots.reduce((max: number, a: any) => {
                const num = parseInt(a.code, 10);
                return !isNaN(num) && num > max ? num : max;
            }, 0);
            const nextCode = maxRoot > 0 ? (maxRoot + 1).toString() : '1';
            setRecord((prev: any) => ({ ...prev, code: nextCode }));
        }
    }, [isOpen, isEdit, allAccounts]);

    // Extract available types from database
    const availableTypes = Array.from(new Set(allAccounts?.map((a: any) => a.account_type || a.type).filter(Boolean))) as string[];
    const fallbackTypes = ['أصول', 'خصوم', 'حقوق ملكية', 'إيرادات', 'مصروفات'];
    const typeOptions = availableTypes.length > 0 ? availableTypes : fallbackTypes;

    // Determine default values
    const initialRecord = {
        code: record?.code || '',
        name: record?.name || '',
        parent_id: record?.parent_id || null,
        account_type: record?.account_type || record?.type || typeOptions[0],
        is_transactional: record?.is_transactional !== undefined ? record.is_transactional : true,
        ...record
    };

    if (!isOpen || !mounted) return null;

    const handleChange = (field: string, value: any) => {
        const updates: any = { [field]: value };

        // 🧠 Auto-generate code when parent_id changes
        if (field === 'parent_id' && !isEdit) {
            if (!value) {
                // Reset to root code
                const roots = allAccounts.filter((a: any) => !a.parent_id);
                const maxRoot = roots.reduce((max: number, a: any) => {
                    const num = parseInt(a.code, 10);
                    return !isNaN(num) && num > max ? num : max;
                }, 0);
                updates.code = maxRoot > 0 ? (maxRoot + 1).toString() : '1';
            } else {
                // Parent selected
                const parent = allAccounts.find((a: any) => a.id === value);
                if (parent) {
                    updates.account_type = parent.account_type || parent.type; // Inherit type
                    
                    const siblings = allAccounts.filter((a: any) => a.parent_id === value);
                    if (siblings.length === 0) {
                        updates.code = `${parent.code}01`; // First child
                    } else {
                        // Find max sibling code
                        let maxSibling = 0;
                        let codeLength = 0;
                        siblings.forEach((a: any) => {
                            const num = parseInt(a.code, 10);
                            if (!isNaN(num) && num > maxSibling) {
                                maxSibling = num;
                                codeLength = a.code.length;
                            }
                        });
                        
                        if (maxSibling > 0) {
                            updates.code = (maxSibling + 1).toString().padStart(codeLength, '0');
                        } else {
                            updates.code = `${parent.code}01`;
                        }
                    }
                }
            }
        }

        setRecord({ ...initialRecord, ...updates });
    };

    return (
        <AquaModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد'}
            icon={isEdit ? '✏️' : '➕'}
            width="600px"
        >
            <style>{`
                .glass-input-dark { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(11, 14, 20, 0.7); color: #F8FAFC; font-weight: 700; outline: none; transition: 0.3s; min-height: 44px; box-sizing: border-box; }
                .glass-input-dark:focus { background: rgba(20, 24, 34, 0.95); border-color: #00E5FF; box-shadow: 0 0 15px rgba(0, 229, 255, 0.2); }
                .acc-modal-grid-1-2 { display: grid; grid-template-columns: 1fr 2fr; gap: 15px; }
                .acc-modal-grid-1-1 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .acc-radio-group { display: flex; gap: 15px; margin-top: 5px; flex-wrap: wrap; }
                .acc-modal-actions { padding: 20px 25px; background: rgba(11, 14, 20, 0.5); border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; gap: 10px; justify-content: flex-end; margin: 0 -25px -25px -25px; border-radius: 0 0 25px 25px; }
                .acc-modal-body { padding: 25px; display: flex; flex-direction: column; gap: 20px; }

                @media (max-width: 768px) {
                    .acc-modal-grid-1-2,
                    .acc-modal-grid-1-1 {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                    }
                    .acc-modal-body {
                        padding: 15px 10px !important;
                        gap: 14px !important;
                    }
                    .acc-modal-actions {
                        flex-direction: column-reverse !important;
                        padding: 15px 12px !important;
                        margin: 0 -10px -15px -10px !important;
                        gap: 10px !important;
                    }
                    .acc-modal-actions button {
                        width: 100% !important;
                        min-height: 44px !important;
                        font-size: 14px !important;
                        justify-content: center !important;
                    }
                    .acc-radio-group {
                        flex-direction: column !important;
                        gap: 10px !important;
                    }
                }

                /* Daylight Desert Glassmorphism */
                .daylight-theme .glass-input-dark {
                    background: #FFFFFF !important;
                    border-color: rgba(194, 155, 98, 0.35) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .glass-input-dark:focus {
                    background: #FFFFFF !important;
                    border-color: #C29B62 !important;
                    box-shadow: 0 0 15px rgba(194, 155, 98, 0.25) !important;
                }
                .daylight-theme .glass-input-dark option {
                    background: #FFFFFF !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .acc-modal-actions {
                    background: rgba(194, 155, 98, 0.08) !important;
                    border-top: 1px solid rgba(194, 155, 98, 0.2) !important;
                }
                .daylight-theme .acc-modal-body label {
                    color: rgba(44, 26, 18, 0.75) !important;
                }
                .daylight-theme .acc-radio-group label {
                    color: #2C1A12 !important;
                }
                .daylight-theme .acc-modal-actions button:first-child {
                    background: rgba(44, 26, 18, 0.06) !important;
                    color: #2C1A12 !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                }
                .daylight-theme .acc-modal-actions button:last-child {
                    background: linear-gradient(135deg, #C29B62, #A8573C) !important;
                    color: #FFFFFF !important;
                    box-shadow: 0 4px 12px rgba(168, 87, 60, 0.25) !important;
                }
            `}</style>

                <div className="acc-modal-body">
                    <div className="acc-modal-grid-1-2">
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px', display: 'block' }}>رمز / كود الحساب *</label>
                            <input 
                                type="text" 
                                className="glass-input-dark" 
                                value={initialRecord.code} 
                                onChange={e => handleChange('code', e.target.value)} 
                                placeholder="مثال: 1101"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px', display: 'block' }}>اسم الحساب *</label>
                            <input 
                                type="text" 
                                className="glass-input-dark" 
                                value={initialRecord.name} 
                                onChange={e => handleChange('name', e.target.value)} 
                                placeholder="اسم الحساب..."
                            />
                        </div>
                    </div>

                    <div className="acc-modal-grid-1-1">
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px', display: 'block' }}>الحساب الرئيسي</label>
                            <select
                                className="glass-input-dark"
                                value={localRootId}
                                onChange={e => {
                                    const rootId = e.target.value;
                                    setLocalRootId(rootId);
                                    if (rootId) {
                                        handleChange('parent_id', rootId);
                                    } else {
                                        handleChange('parent_id', null);
                                    }
                                }}
                            >
                                <option value="">-- حساب رئيسي جديد (مستوى أول) --</option>
                                {allAccounts?.filter((a: any) => !a.parent_id).map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px', display: 'block' }}>الحساب الفرعي (مستوى ثاني)</label>
                            <select
                                className="glass-input-dark"
                                value={initialRecord.parent_id === localRootId ? '' : initialRecord.parent_id || ''}
                                onChange={e => {
                                    const subId = e.target.value;
                                    if (subId) {
                                        handleChange('parent_id', subId);
                                    } else {
                                        handleChange('parent_id', localRootId || null);
                                    }
                                }}
                                disabled={!localRootId}
                            >
                                <option value="">-- تفريع مباشر من الحساب الرئيسي --</option>
                                {allAccounts
                                    ?.filter((a: any) => a.parent_id === localRootId && a.id !== record?.id)
                                    .map((a: any) => (
                                        <option key={a.id} value={a.id}>
                                            {a.code} - {a.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    <div className="acc-modal-grid-1-1">
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px', display: 'block' }}>التصنيف المالي *</label>
                            <select 
                                className="glass-input-dark"
                                value={initialRecord.account_type}
                                onChange={e => handleChange('account_type', e.target.value)}
                                disabled={!!localRootId}
                                style={{ opacity: localRootId ? 0.6 : 1 }}
                            >
                                {typeOptions.map((t: string) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            {localRootId && <span style={{ fontSize: '10px', color: '#64748b' }}>موروث من الحساب الرئيسي</span>}
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px', display: 'block' }}>نوع الحساب</label>
                            <div className="acc-radio-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#F8FAFC', minHeight: '36px' }}>
                                    <input 
                                        type="radio" 
                                        name="acc_type" 
                                        checked={initialRecord.is_transactional === true}
                                        onChange={() => handleChange('is_transactional', true)}
                                        style={{ accentColor: '#00E5FF', width: '18px', height: '18px' }}
                                    />
                                    حساب فرعي (يقبل حركات)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#F8FAFC', minHeight: '36px' }}>
                                    <input 
                                        type="radio" 
                                        name="acc_type" 
                                        checked={initialRecord.is_transactional === false}
                                        onChange={() => handleChange('is_transactional', false)}
                                        style={{ accentColor: '#00E5FF', width: '18px', height: '18px' }}
                                    />
                                    رئيسي (تجميعي فقط)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="acc-modal-actions">
                    <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: '#94A3B8', fontWeight: 800, cursor: 'pointer' }}>إلغاء</button>
                    <button onClick={() => {
                        if (!initialRecord.code || !initialRecord.name) {
                            (window as any).showGlobalToast?.('الرجاء إدخال كود واسم الحساب', 'warning');
                            return;
                        }
                        onSave(initialRecord);
                    }} style={{ padding: '12px 30px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #00E5FF, #0077B6)', color: '#0B0E14', fontWeight: 900, cursor: 'pointer', boxShadow: '0 5px 15px rgba(0, 229, 255, 0.3)' }}>
                        {isEdit ? 'حفظ التعديلات 💾' : 'إضافة الحساب ➕'}
                    </button>
                </div>
        </AquaModalWrapper>
    );
}
