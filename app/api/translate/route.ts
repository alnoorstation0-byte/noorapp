import { NextResponse } from 'next/server';

// قاموس محلي سريع لمصطلحات نشاط المياه والمحاسبة كخط دفاع أول
const LOCAL_DICTIONARY: Record<string, { en: string; ar: string }> = {
    'مياه': { en: 'Water', ar: 'مياه' },
    'كرتون': { en: 'Carton', ar: 'كرتون' },
    'قارورة': { en: 'Bottle', ar: 'قارورة' },
    'جالون': { en: 'Gallon', ar: 'جالون' },
    'مياه غيام': { en: 'Ghayam Water', ar: 'مياه غيام' },
    'مؤسسة': { en: 'Establishment', ar: 'مؤسسة' },
    'شركة': { en: 'Company', ar: 'شركة' },
    'عميل': { en: 'Customer', ar: 'عميل' },
    'مورد': { en: 'Supplier', ar: 'مورد' },
    'مندوب': { en: 'Representative / Delegate', ar: 'مندوب' },
    'موظف': { en: 'Employee', ar: 'موظف' },
    'كاشير': { en: 'Cashier', ar: 'كاشير' },
    'فرع': { en: 'Branch', ar: 'فرع' },
    'منفذ بيع': { en: 'Sales Outlet', ar: 'منفذ بيع' },
    'المستودع الرئيسي': { en: 'Main Warehouse', ar: 'المستودع الرئيسي' },
    'فوارغ': { en: 'Empty Bottles', ar: 'فوارغ' }
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const text = String(body.text || '').trim();
        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Auto-detect language if not specified
        const hasArabic = /[\u0600-\u06FF]/.test(text);
        let sourceLang = body.sourceLang || (hasArabic ? 'ar' : 'en');
        let targetLang = body.targetLang || (hasArabic ? 'en' : 'ar');

        // Check local dictionary exact match
        const lowerText = text.toLowerCase();
        for (const [key, val] of Object.entries(LOCAL_DICTIONARY)) {
            if (key === text) {
                return NextResponse.json({
                    success: true,
                    translatedText: targetLang === 'en' ? val.en : val.ar,
                    detectedSource: sourceLang,
                    targetLang
                });
            }
            if (val.en.toLowerCase() === lowerText) {
                return NextResponse.json({
                    success: true,
                    translatedText: val.ar,
                    detectedSource: 'en',
                    targetLang: 'ar'
                });
            }
        }

        // 1. Google Translate GTX Public Endpoint
        try {
            const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(googleUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                next: { revalidate: 3600 }
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && Array.isArray(data[0])) {
                    const translated = data[0].map((chunk: any) => chunk[0]).join('');
                    if (translated?.trim()) {
                        return NextResponse.json({
                            success: true,
                            translatedText: translated.trim(),
                            detectedSource: sourceLang,
                            targetLang
                        });
                    }
                }
            }
        } catch (gErr) {
            console.warn('Google GTX error, attempting fallback:', gErr);
        }

        // 2. MyMemory Fallback Endpoint
        try {
            const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
            const mmRes = await fetch(myMemoryUrl);
            if (mmRes.ok) {
                const mmData = await mmRes.json();
                const trans = mmData.responseData?.translatedText;
                if (trans?.trim() && !trans.includes('MYMEMORY WARNING')) {
                    return NextResponse.json({
                        success: true,
                        translatedText: trans.trim(),
                        detectedSource: sourceLang,
                        targetLang
                    });
                }
            }
        } catch (mmErr) {
            console.warn('MyMemory fallback error:', mmErr);
        }

        // Return original if no provider succeeded
        return NextResponse.json({
            success: true,
            translatedText: text,
            detectedSource: sourceLang,
            targetLang,
            fallback: true
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Translation error' }, { status: 500 });
    }
}
