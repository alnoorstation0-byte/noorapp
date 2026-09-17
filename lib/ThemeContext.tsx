"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export type ThemeMode = 'dark' | 'daylight';

interface ThemeContextType {
    themeMode: ThemeMode;
    isDaylight: boolean;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    themeMode: 'dark',
    isDaylight: false,
    setThemeMode: () => {},
    toggleTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
    const [mounted, setMounted] = useState(false);

    const applyThemeToDOM = (mode: ThemeMode) => {
        if (typeof document === 'undefined') return;
        const html = document.documentElement;
        const body = document.body;

        if (mode === 'daylight') {
            html.classList.add('daylight-theme');
            html.setAttribute('data-theme', 'daylight');
            if (body) {
                body.classList.add('daylight-theme');
                body.setAttribute('data-theme', 'daylight');
                body.style.backgroundColor = '#F1F5F9';
                body.style.color = '#0F172A';
            }
        } else {
            html.classList.remove('daylight-theme');
            html.setAttribute('data-theme', 'dark');
            if (body) {
                body.classList.remove('daylight-theme');
                body.setAttribute('data-theme', 'dark');
                body.style.backgroundColor = '#0B0E14';
                body.style.color = '#F8FAFC';
            }
        }
    };

    useEffect(() => {
        setMounted(true);
        // 1. قراءة التفضيل المحلي من المتصفح
        const saved = localStorage.getItem('noor_theme_mode') as ThemeMode;
        if (saved === 'daylight' || saved === 'dark') {
            setThemeModeState(saved);
            applyThemeToDOM(saved);
        } else {
            // الافتراضي هو مركز القيادة الداكن
            setThemeModeState('dark');
            applyThemeToDOM('dark');
        }

        // 2. مزامنة مع بروفايل المستخدم في Supabase إن وجد
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && user.user_metadata?.theme_mode) {
                const profileTheme = user.user_metadata.theme_mode as ThemeMode;
                if (saved === null && (profileTheme === 'daylight' || profileTheme === 'dark')) {
                    setThemeModeState(profileTheme);
                    applyThemeToDOM(profileTheme);
                    localStorage.setItem('noor_theme_mode', profileTheme);
                }
            }
        }).catch(() => {});
    }, []);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('noor_theme_mode', mode);
            applyThemeToDOM(mode);
            window.dispatchEvent(new CustomEvent('noor_theme_changed', { detail: mode }));

            // مزامنة التفضيل في بروفايل المستخدم
            supabase.auth.updateUser({
                data: { theme_mode: mode }
            }).catch(() => {});
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const nextMode: ThemeMode = themeMode === 'dark' ? 'daylight' : 'dark';
        setThemeMode(nextMode);

        if (nextMode === 'daylight') {
            toast.success('☀️ تم تفعيل وضع الرؤية النهارية (Daylight Mode)', {
                style: {
                    background: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid rgba(2, 132, 199, 0.4)',
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
                    fontWeight: 800,
                    fontFamily: 'Cairo, sans-serif'
                }
            });
        } else {
            toast.success('🌙 تم تفعيل وضع الرؤية الليلية (Command Center Dark)', {
                style: {
                    background: '#141822',
                    color: '#F8FAFC',
                    border: '1px solid rgba(0, 229, 255, 0.4)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                    fontWeight: 800,
                    fontFamily: 'Cairo, sans-serif'
                }
            });
        }
    }, [themeMode, setThemeMode]);

    return (
        <ThemeContext.Provider value={{
            themeMode,
            isDaylight: themeMode === 'daylight',
            setThemeMode,
            toggleTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeMode() {
    return useContext(ThemeContext);
}
