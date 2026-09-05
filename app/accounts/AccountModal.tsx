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
                .glass-input-dark { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #cbd5e1; background: #f8fafc; color: #1e293b; font-weight: 700; outline: none; transition: 0.3s; }
                .glass-input-dark:focus { background: white; border-color: ${THEME.primary}; box-shadow: 0 0 0 3px rgba(40, 145, 200, 0.1); }
            `}</style>


                <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', display: 'block' }}>رمز / كود الحساب *</label>
                            <input 
                                type="text" 
                                className="glass-input-dark" 
                                value={initialRecord.code} 
                                onChange={e => handleChange('code', e.target.value)} 
                                placeholder="مثال: 1101"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', display: 'block' }}>اسم الحساب *</label>
                            <input 
                                type="text" 
                                className="glass-input-dark" 
                                value={initialRecord.name} 
                                onChange={e => handleChange('name', e.target.value)} 
                                placeholder="اسم الحساب..."
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', display: 'block' }}>الحساب الرئيسي</label>
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
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', display: 'block' }}>الحساب الفرعي (مستوى ثاني)</label>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', display: 'block' }}>التصنيف المالي *</label>
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
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', display: 'block' }}>نوع الحساب</label>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                <input 
                                    type="radio" 
                                    name="acc_type" 
                                    checked={initialRecord.is_transactional === true}
                                    onChange={() => handleChange('is_transactional', true)}
                                    style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px' }}
                                />
                                حساب فرعي (يقبل حركات)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                <input 
                                    type="radio" 
                                    name="acc_type" 
                                    checked={initialRecord.is_transactional === false}
                                    onChange={() => handleChange('is_transactional', false)}
                                    style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px' }}
                                />
                                رئيسي (تجميعي فقط)
                            </label>
                        </div>
                    </div>
                    </div>
                </div>

                <div style={{ padding: '20px 25px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '10px', justifyContent: 'flex-end', margin: '0 -25px -25px -25px', borderRadius: '0 0 25px 25px' }}>
                    <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}>إلغاء</button>
                    <button onClick={() => {
                        if (!initialRecord.code || !initialRecord.name) {
                            (window as any).showGlobalToast?.('الرجاء إدخال كود واسم الحساب', 'warning');
                            return;
                        }
                        onSave(initialRecord);
                    }} style={{ padding: '12px 30px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.goldAccent})`, color: 'white', fontWeight: 900, cursor: 'pointer', boxShadow: '0 5px 15px rgba(40,145,200,0.3)' }}>
                        {isEdit ? 'حفظ التعديلات 💾' : 'إضافة الحساب ➕'}
                    </button>
                </div>
        </AquaModalWrapper>
    );
}
