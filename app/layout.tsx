import { Cairo } from "next/font/google";
import LayoutClient from '../components/layout/LayoutClient';
import "./globals.css";
import AppClientProviders from '@/components/AppClientProviders';
import { THEME } from '@/lib/theme';

const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"], // أضف وزن 500 للعمليات
  display: 'swap',
  variable: '--font-cairo', // تحويلها لـ CSS Variable لسهولة الاستخدام
});

// 📱 التعديل هنا : منع الـ Zoom وتغطية الشاشة بالكامل للموبايل
export const viewport = {
  themeColor: THEME.coffeeDark,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  viewportFit: 'cover',
};

export const metadata = {
  title: "رواسي - نظام الإدارة الموحد",
  description: "نظام إدارة العملاء والموارد والمصروفات",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "رواسي",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 💡 suppressHydrationWarning يمنع أخطاء التوافق في الكونسول
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body 
        className={`${cairo.className} ${cairo.variable}`} 
        style={{ 
          position: 'relative', 
          minHeight: '100vh', 
          margin: 0, 
          backgroundColor: THEME.sandLight,
          color: THEME.text 
        }}
      >
        
        {/* 🎨 ستايل الهوية البصرية الأساسية (تحسين الإضاءة) */}
        <style dangerouslySetInnerHTML={{__html: `
          .bg-master-container {
            position: fixed; inset: 0; z-index: -4; 
            background: linear-gradient(135deg, var(--accent-light, #A1D6E2) 0%, var(--bg-main, #D4F0F7) 100%); 
            overflow: hidden;
            pointer-events: none;
          }
          .bg-image-base {
            position: absolute; inset: 0;
            background-image: url('/ghayam_logo.png'); 
            background-size: cover;
            background-position: center;
            filter: blur(60px); 
            transform: scale(1.1); 
            opacity: 0.15; 
          }
          .bg-glass-tint {
            position: absolute; inset: 0; z-index: -3;
            background: linear-gradient(
              135deg, 
              rgba(255, 255, 255, 0.4) 0%, 
              rgba(255, 255, 255, 0.1) 100% 
            );
            backdrop-filter: blur(20px);
          }
          .watermark-bg {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 50vw; max-width: 600px; opacity: 0.035; z-index: -2;
            pointer-events: none; user-select: none;
          }
          @media print { .no-print { display: none !important; } }
        `}} />

        <div className="bg-master-container no-print">
            <div className="bg-image-base"></div>
            <div className="bg-glass-tint"></div>
        </div>

        <img src="/ghayam_logo.png" alt="watermark" className="watermark-bg no-print" />

        <AppClientProviders>
            {children}
        </AppClientProviders>
        
      </body>
    </html>
  );
}
