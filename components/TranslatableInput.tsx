"use client";
import React, { useState } from 'react';
import { translateText } from '@/lib/translationService';
import { useToast } from '@/lib/toast-context';

interface TranslatableInputProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    required?: boolean;
    isTextArea?: boolean;
    rows?: number;
    className?: string;
    inputClassName?: string;
    style?: React.CSSProperties;
    allowBilingualMerge?: boolean;
    name?: string;
    id?: string;
    autoFocus?: boolean;
}

export default function TranslatableInput({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    isTextArea = false,
    rows = 2,
    className = '',
    inputClassName = '',
    style,
    allowBilingualMerge = true,
    name,
    id,
    autoFocus = false
}: TranslatableInputProps) {
    const { showToast } = useToast();
    const [isTranslating, setIsTranslating] = useState(false);
    const [lastOriginal, setLastOriginal] = useState<string | null>(null);
    const [lastTranslated, setLastTranslated] = useState<string | null>(null);

    // Auto-detect if content contains Arabic characters
    const hasArabic = /[\u0600-\u06FF]/.test(value || '');
    const suggestedTarget: 'ar' | 'en' = hasArabic ? 'en' : 'ar';
    const textDir = hasArabic ? 'rtl' : (value && /[a-zA-Z]/.test(value) ? 'ltr' : 'inherit');

    const handleTranslate = async (targetOverride?: 'ar' | 'en') => {
        const textToTranslate = value?.trim();
        if (!textToTranslate) {
            showToast('يرجى كتابة نص أولاً لترجمته (Please enter text to translate)', 'error');
            return;
        }

        const target = targetOverride || suggestedTarget;
        setIsTranslating(true);

        try {
            const res = await translateText(textToTranslate, target);
            if (res.success && res.translatedText && res.translatedText !== textToTranslate) {
                setLastOriginal(textToTranslate);
                setLastTranslated(res.translatedText);
                onChange(res.translatedText);
                showToast(`تمت الترجمة: ${res.translatedText.slice(0, 30)}${res.translatedText.length > 30 ? '...' : ''}`, 'success');
            } else if (res.translatedText === textToTranslate) {
                showToast('النص المترجم مطابق للنص الأصلي', 'info');
            } else {
                showToast('تعذر إتمام الترجمة حالياً، يرجى المحاولة لاحقاً', 'error');
            }
        } catch (e: any) {
            showToast(e?.message || 'خطأ أثناء الترجمة', 'error');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleMergeBilingual = () => {
        if (!lastOriginal || !lastTranslated) return;
        // Format as: Arabic - English (or original - translated)
        const isOriginalAr = /[\u0600-\u06FF]/.test(lastOriginal);
        const combined = isOriginalAr
            ? `${lastOriginal} - ${lastTranslated}`
            : `${lastTranslated} - ${lastOriginal}`;
        onChange(combined);
        setLastOriginal(null);
        setLastTranslated(null);
        showToast('تم الدمج الثنائي (عربي / English)', 'success');
    };

    const handleUndo = () => {
        if (lastOriginal !== null) {
            onChange(lastOriginal);
            setLastOriginal(null);
            setLastTranslated(null);
            showToast('تم التراجع عن الترجمة', 'info');
        }
    };

    return (
        <div className={`translatable-input-container ${className}`} style={{ marginBottom: '14px', ...style }}>
            {/* Header / Label with Translation Action Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                flexWrap: 'wrap',
                gap: '6px'
            }}>
                <label style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#1C73AB',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    margin: 0
                }}>
                    <span>{label}</span>
                    {required && <span style={{ color: '#ef4444', fontWeight: 900 }}>*</span>}
                </label>

                {/* Translation Controls */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <button
                        type="button"
                        onClick={() => handleTranslate(suggestedTarget)}
                        disabled={isTranslating || !value?.trim()}
                        title={`ترجمة ذكية فورية إلى ${suggestedTarget === 'en' ? 'الإنجليزية' : 'العربية'}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: isTranslating 
                                ? 'rgba(203, 213, 225, 0.5)' 
                                : 'linear-gradient(135deg, rgba(40, 145, 200, 0.15) 0%, rgba(127, 212, 227, 0.25) 100%)',
                            border: '1px solid rgba(40, 145, 200, 0.35)',
                            color: '#1C73AB',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: (isTranslating || !value?.trim()) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 6px rgba(28, 115, 171, 0.08)',
                            opacity: (!value?.trim() && !isTranslating) ? 0.65 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (value?.trim() && !isTranslating) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 145, 200, 0.25)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(28, 115, 171, 0.08)';
                        }}
                    >
                        <span>{isTranslating ? '⏳' : '🌐'}</span>
                        <span>
                            {isTranslating 
                                ? 'جاري الترجمة...' 
                                : (suggestedTarget === 'en' ? 'ترجمة للإنجليزي (AR ➔ EN)' : 'ترجمة للعربي (EN ➔ AR)')}
                        </span>
                    </button>

                    {/* Secondary Manual Toggle Button for Specific Target */}
                    <button
                        type="button"
                        onClick={() => handleTranslate(suggestedTarget === 'en' ? 'ar' : 'en')}
                        disabled={isTranslating || !value?.trim()}
                        title={`ترجمة عكسية إلى ${suggestedTarget === 'en' ? 'العربية' : 'الإنجليزية'}`}
                        style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(28, 115, 171, 0.2)',
                            color: '#475569',
                            padding: '4px 7px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: (isTranslating || !value?.trim()) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {suggestedTarget === 'en' ? 'AR' : 'EN'}
                    </button>
                </div>
            </div>

            {/* Input or Textarea */}
            {isTextArea ? (
                <textarea
                    id={id}
                    name={name}
                    rows={rows}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    dir={textDir}
                    className={`glass-input-field ${inputClassName}`}
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        direction: textDir,
                        textAlign: textDir === 'ltr' ? 'left' : 'right'
                    }}
                />
            ) : (
                <input
                    type="text"
                    id={id}
                    name={name}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    dir={textDir}
                    className={`glass-input-field ${inputClassName}`}
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        direction: textDir,
                        textAlign: textDir === 'ltr' ? 'left' : 'right'
                    }}
                />
            )}

            {/* Post-Translation Action Chips (Undo / Bilingual Merge) */}
            {lastOriginal && lastTranslated && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    padding: '6px 10px',
                    background: 'rgba(40, 145, 200, 0.08)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(40, 145, 200, 0.3)',
                    fontSize: '11px',
                    animation: 'fadeIn 0.25s ease'
                }}>
                    <span style={{ color: '#1C73AB', fontWeight: 800 }}>✨ تمت الترجمة:</span>
                    <span style={{ color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastTranslated}
                    </span>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        {allowBilingualMerge && (
                            <button
                                type="button"
                                onClick={handleMergeBilingual}
                                style={{
                                    background: 'linear-gradient(135deg, #1C73AB, #2891C8)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                                title="دمج الاسمين معاً مثل: مؤسسة الغيام - Al Ghayam Est"
                            >
                                ➕ دمج ثنائي (AR + EN)
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleUndo}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                            title="استعادة النص قبل الترجمة"
                        >
                            ↩️ تراجع
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
