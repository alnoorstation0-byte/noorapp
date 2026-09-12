/**
 * 🌐 خدمة الترجمة الفورية لنظام مياه غيام
 * تدعم الترجمة ثنائية الاتجاه (عربي ⇋ إنجليزي)
 */

export interface TranslationResult {
    translatedText: string;
    detectedSource: string;
    targetLang: string;
    success: boolean;
}

export async function translateText(text: string, targetLang?: 'ar' | 'en'): Promise<TranslationResult> {
    if (!text || !text.trim()) {
        return { translatedText: '', detectedSource: 'ar', targetLang: targetLang || 'en', success: false };
    }

    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim(), targetLang })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            translatedText: data.translatedText || text,
            detectedSource: data.detectedSource || 'auto',
            targetLang: data.targetLang || (data.detectedSource === 'ar' ? 'en' : 'ar'),
            success: true
        };
    } catch (error) {
        console.warn('Translation service error:', error);
        return {
            translatedText: text,
            detectedSource: 'ar',
            targetLang: targetLang || 'en',
            success: false
        };
    }
}
