"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { THEME } from '@/lib/theme';

interface ShortcutItem {
    key: string;
    action: string;
    category: 'modals' | 'confirm' | 'navigation' | 'pos' | 'table';
    scope: string;
    description: string;
}

const SHORTCUTS_DATA: ShortcutItem[] = [
    // ➕ المودلات والنوافذ
    {
        key: 'F2  /  Alt + N  /  Insert',
        action: '➕ إنشاء / إضافة جديد',
        category: 'modals',
        scope: 'جميع الشاشات الرئيسية',
        description: 'يفتح فورياً نافذة إضافة سجل جديد (فاتورة جديدة، سند قبض، سند صرف، مصروف، صنف، حساب...)'
    },
    {
        key: 'Ctrl + Enter  /  ⌘ + Enter',
        action: '💾 حفظ وموافقة واعتماد',
        category: 'modals',
        scope: 'داخل أي مودال',
        description: 'ينفذ زر الحفظ الرئيسي والاعتماد النهائي في أي نافذة منبثقة مباشرة دون لمس الماوس'
    },
    {
        key: 'Escape  (Esc)',
        action: '❌ إغلاق وإلغاء المودال',
        category: 'modals',
        scope: 'داخل أي مودال أو نافذة',
        description: 'إغلاق المودال الحالي والتراجع فوراً دون حفظ أي تغييرات'
    },
    // ✅ التأكيد والموافقة
    {
        key: 'Enter  ↵',
        action: '✅ موافقة وتأكيد فوري',
        category: 'confirm',
        scope: 'نوافذ التأكيد والتحذير',
        description: 'تنفيذ خيار "نعم، تأكيد" في نوافذ تأكيد الحذف أو الاعتماد أو الإجراءات الحساسة'
    },
    {
        key: 'Escape  (Esc)',
        action: '🚫 تراجع وإلغاء',
        category: 'confirm',
        scope: 'نوافذ التأكيد والتحذير',
        description: 'إلغاء إجراء التأكيد وإغلاق نافذة التحذير بأمان'
    },
    {
        key: 'Ctrl + P  /  Enter',
        action: '🖨️ بدء الطباعة',
        category: 'confirm',
        scope: 'شاشات معاينة الطباعة والإيصالات',
        description: 'إرسال أمر الطباعة المباشر إلى الطابعة أو تصدير PDF'
    },
    // 📊 الجداول والعمليات
    {
        key: 'F3  /  Alt + S',
        action: '🔍 الانتقال للبحث',
        category: 'table',
        scope: 'الجداول والشاشات الرئيسية',
        description: 'نقل مؤشر الكتابة فوراً إلى خانة البحث السريع بالاسم أو الكود'
    },
    {
        key: 'F4  /  Alt + P',
        action: '⚡ اعتماد وترحيل المحدد',
        category: 'table',
        scope: 'الفواتير والسندات',
        description: 'اعتماد وترحيل كافة السجلات المحددة بعلامة صح بنقرة كيبورد واحدة'
    },
    {
        key: 'Alt + B',
        action: '📊 فتح / إغلاق السايد بار والملخص',
        category: 'table',
        scope: 'كافة شاشات النظام',
        description: 'إظهار أو إخفاء لوحة الفلاتر والملخص المالي والإحصائي'
    },
    // 🛍️ كاشير نقاط البيع
    {
        key: '0  -  9  /  لوحة الأرقام Numpad',
        action: '🔢 إدخال الكمية أو السعر',
        category: 'pos',
        scope: 'كاشير نقاط البيع (POS)',
        description: 'كتابة الكمية المطلوبة للصنف مباشرة بالأرقام الإنجليزية أو العربية'
    },
    {
        key: 'Enter  ↵',
        action: '🛒 إضافة الصنف إلى السلة',
        category: 'pos',
        scope: 'نافذة الصنف في الكاشير',
        description: 'تأكيد الكمية وإضافة المنتج للسلة وإغلاق النافذة فوراً'
    },
    {
        key: 'Tab  /  الأسهم ↑ ↓ → ←',
        action: '🔄 التبديل بين الكمية والسعر',
        category: 'pos',
        scope: 'نافذة الصنف في الكاشير',
        description: 'التبديل السريع بين تعديل كمية المنتج وتعديل سعره'
    },
    {
        key: '+  /  -',
        action: '➕ ➖ زيادة أو إنقاص الكمية بمقدار 1',
        category: 'pos',
        scope: 'نافذة الصنف في الكاشير',
        description: 'تعديل كمية الصنف سريعاً حبة بحبة مع فحص الرصيد المتوفر'
    },
    // 🚀 التنقل السريع
    {
        key: 'Alt + 1',
        action: '📈 الداشبورد الرئيسي',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'الانتقال الفوري إلى لوحة التحكم والمؤشرات المالية'
    },
    {
        key: 'Alt + 3',
        action: '💸 المصروفات',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'الانتقال الفوري إلى شاشة المصروفات والمشتريات'
    },
    {
        key: 'Alt + 4',
        action: '📤 سندات الصرف',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'الانتقال الفوري إلى سندات الصرف للموردين والجهات'
    },
    {
        key: 'Alt + 5',
        action: '📥 سندات القبض',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'الانتقال الفوري إلى سندات القبض والتحصيلات'
    },
    {
        key: 'Alt + 6',
        action: '🧾 فواتير المبيعات',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'الانتقال الفوري إلى فواتير المبيعات والعملاء'
    },
    {
        key: 'Alt + 9',
        action: '📑 كشف الحساب العام',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'الانتقال الفوري إلى كشف حساب الأستاذ العام'
    },
    {
        key: 'Alt + 0',
        action: '👥 أرصدة الجهات والعملاء',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'الانتقال الفوري إلى تقرير ومتابعة أرصدة الشركاء والجهات'
    },
    {
        key: 'F1  /  Shift + ?',
        action: '❓ دليل وخريطة الاختصارات',
        category: 'navigation',
        scope: 'عام في النظام',
        description: 'فتح هذه النافذة الإرشادية في أي وقت لعرض كافة اختصارات الكيبورد'
    }
];

const CATEGORIES = [
    { id: 'all', label: 'الكل' },
    { id: 'modals', label: '➕ المودلات والحفظ' },
    { id: 'confirm', label: '✅ التأكيد والموافقة' },
    { id: 'table', label: '📊 الجداول والبحث' },
    { id: 'pos', label: '🛍️ كاشير نقاط البيع' },
    { id: 'navigation', label: '🚀 التنقل السريع' }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const filteredShortcuts = useMemo(() => {
        return SHORTCUTS_DATA.filter(item => {
            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
            const matchesSearch = !search.trim() || 
                item.key.toLowerCase().includes(search.toLowerCase()) ||
                item.action.toLowerCase().includes(search.toLowerCase()) ||
                item.description.toLowerCase().includes(search.toLowerCase()) ||
                item.scope.toLowerCase().includes(search.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [search, selectedCategory]);

    if (!isOpen) return null;

    return (
        <div className="shortcuts-modal-overlay" onClick={onClose}>
            <style>{`
                .shortcuts-modal-overlay {
                    position: fixed !important;
                    inset: 0 !important;
                    background: rgba(15, 23, 42, 0.72) !important;
                    backdrop-filter: blur(12px) !important;
                    -webkit-backdrop-filter: blur(12px) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 999999999 !important;
                    padding: 20px;
                    direction: rtl;
                }
                .shortcuts-modal-card {
                    background: rgba(255, 255, 255, 0.96);
                    border: 1px solid rgba(255, 255, 255, 0.9);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 820px;
                    max-height: 90vh;
                    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.35);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: shortcutsFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes shortcutsFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                .shortcuts-header {
                    background: linear-gradient(135deg, #1C73AB 0%, #2891C8 100%);
                    padding: 18px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    color: white;
                    flex-shrink: 0;
                }
                .shortcuts-search-box {
                    padding: 14px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .shortcuts-input {
                    flex: 1;
                    min-width: 220px;
                    padding: 10px 14px;
                    border-radius: 12px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 13px;
                    font-weight: 700;
                    outline: none;
                    background: white;
                    color: #122946;
                    transition: 0.2s;
                }
                .shortcuts-input:focus {
                    border-color: #2891C8;
                    box-shadow: 0 0 0 3px rgba(40, 145, 200, 0.15);
                }
                .shortcuts-category-tab {
                    padding: 6px 12px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    font-size: 12px;
                    font-weight: 800;
                    color: #64748b;
                    cursor: pointer;
                    transition: 0.15s;
                }
                .shortcuts-category-tab.active {
                    background: #1C73AB;
                    color: white;
                    border-color: #1C73AB;
                }
                .shortcuts-table-container {
                    padding: 10px 20px 20px 20px;
                    overflow-y: auto;
                    flex: 1;
                }
                .shortcut-row {
                    display: grid;
                    grid-template-columns: 220px 1fr;
                    gap: 16px;
                    align-items: center;
                    padding: 12px 14px;
                    border-bottom: 1px solid #f1f5f9;
                    border-radius: 12px;
                    transition: background 0.15s;
                }
                .shortcut-row:hover {
                    background: #f8fafc;
                }
                .shortcut-kbd {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 10px;
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    border-bottom: 2.5px solid #94a3b8;
                    border-radius: 8px;
                    font-family: inherit;
                    font-size: 12px;
                    font-weight: 900;
                    color: #1C73AB;
                    direction: ltr;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                @media (max-width: 768px) {
                    .shortcut-row {
                        grid-template-columns: 1fr;
                        gap: 6px;
                    }
                    .shortcuts-modal-card {
                        max-height: 96vh;
                        border-radius: 20px;
                    }
                }
            `}</style>

            <div className="shortcuts-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="shortcuts-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⌨️</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 900 }}>خريطة ودليل اختصارات لوحة المفاتيح</h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.85 }}>تحكم بالسيستم بالكامل وافتح المودلات وتفاعل مع الأزرار بسرعة فائقة</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="إغلاق"
                    >
                        ×
                    </button>
                </div>

                {/* Filter & Search */}
                <div className="shortcuts-search-box">
                    <input 
                        type="text"
                        placeholder="ابحث عن اختصار أو وظيفة (مثال: حفظ، إضافة، طباعة، Esc)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="shortcuts-input"
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`shortcuts-category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shortcuts List */}
                <div className="shortcuts-table-container cinematic-scroll">
                    {filteredShortcuts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 800 }}>
                            لا توجد اختصارات مطابقة للبحث
                        </div>
                    ) : (
                        filteredShortcuts.map((item, idx) => (
                            <div key={idx} className="shortcut-row">
                                <div>
                                    <span className="shortcut-kbd">{item.key}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                        <span style={{ fontWeight: 900, color: '#122946', fontSize: '14px' }}>{item.action}</span>
                                        <span style={{ fontSize: '10.5px', background: 'rgba(40,145,200,0.1)', color: '#1C73AB', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                            {item.scope}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, lineHeight: 1.4 }}>
                                        {item.description}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', fontWeight: 800 }}>
                    <span>💡 يمكنك فتح هذا الدليل في أي وقت بالضغط على مفتاح <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#1C73AB' }}>F1</kbd></span>
                    <button 
                        onClick={onClose} 
                        style={{ background: '#1C73AB', color: 'white', border: 'none', borderRadius: '10px', padding: '6px 18px', fontWeight: 900, cursor: 'pointer', fontSize: '12px' }}
                    >
                        حسناً، فهمت
                    </button>
                </div>
            </div>
        </div>
    );
}
