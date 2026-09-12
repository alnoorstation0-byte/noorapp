"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ar, LocaleKeys } from './locales/ar';
import { en } from './locales/en';

export type Language = 'ar' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: (key: LocaleKeys | string) => string;
    dir: 'rtl' | 'ltr';
    isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'ar',
    setLanguage: () => {},
    toggleLanguage: () => {},
    t: (key: LocaleKeys | string) => (ar as any)[key] || key,
    dir: 'rtl',
    isRtl: true
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('ar');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedLang = localStorage.getItem('app_language') as Language;
        if (savedLang === 'en' || savedLang === 'ar') {
            setLanguageState(savedLang);
            document.documentElement.setAttribute('lang', savedLang);
            document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
            if (document.body) {
                document.body.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
                document.body.style.direction = savedLang === 'ar' ? 'rtl' : 'ltr';
            }
        }
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('app_language', lang);
            document.documentElement.setAttribute('lang', lang);
            document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
            if (document.body) {
                document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
                document.body.style.direction = lang === 'ar' ? 'rtl' : 'ltr';
            }
            window.dispatchEvent(new CustomEvent('language_changed', { detail: lang }));
        }
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguage(language === 'ar' ? 'en' : 'ar');
    }, [language, setLanguage]);

    const t = useCallback((key: LocaleKeys | string): string => {
        const dict = language === 'en' ? en : ar;
        return (dict as any)[key] || (ar as any)[key] || key;
    }, [language]);

    const dir = useMemo<'rtl' | 'ltr'>(() => (language === 'ar' ? 'rtl' : 'ltr'), [language]);
    const isRtl = useMemo<boolean>(() => language === 'ar', [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, dir, isRtl }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

export function useTranslation() {
    const { t, language, dir, isRtl, toggleLanguage, setLanguage } = useLanguage();
    return { t, language, dir, isRtl, toggleLanguage, setLanguage };
}
