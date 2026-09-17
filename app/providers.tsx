// app/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast'; // 🚀 استدعاء التوستر للإشعارات اللحظية

export default function Providers({ children }: { children: React.ReactNode }) {
    // إنشاء نسخة من الـ Query Client مع إعدادات رواسي
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // إرجاعها لـ 5 دقائق لتخفيف الضغط على السيرفر
                refetchOnWindowFocus: false, // تعطيل التحديث التلقائي عند الرجوع للمتصفح لمنع التحميل الزائد
                retry: 2, 
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            
            {/* 🎨 إعدادات التنبيهات بستايل رواسي الفخم */}
            <Toaster 
                position="top-center"
                toastOptions={{
                    duration: 4000, // مدة ظهور الرسالة
                    style: {
                        background: '#141822', // Dark Titanium Command Center
                        color: '#F8FAFC',
                        borderRadius: '16px',
                        fontFamily: "'Cairo', sans-serif",
                        fontWeight: 700,
                        border: '1px solid rgba(0, 229, 255, 0.3)', // Electric Cyan
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    },
                    success: {
                        iconTheme: { primary: '#10B981', secondary: '#0B0E14' }, // Emerald
                    },
                    error: {
                        iconTheme: { primary: '#EF4444', secondary: '#0B0E14' }, // Ruby Alert
                    },
                    loading: {
                        iconTheme: { primary: '#00E5FF', secondary: '#0B0E14' }, // Electric Cyan
                    },
                }}
            />

            {/* أداة فحص ممتازة لك كمهندس تظهر في زاوية الشاشة أثناء التطوير فقط */}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
