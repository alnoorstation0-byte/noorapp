import { Cairo } from "next/font/google";
import LayoutClient from '../components/layout/LayoutClient';
import "./globals.css";
import AppClientProviders from '@/components/AppClientProviders';
import { THEME } from '@/lib/theme';

const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
  display: 'swap',
  variable: '--font-cairo',
});

// 📱 إعدادات الشاشة للجوال والشاشات المختلفة
export const viewport = {
  themeColor: '#0B0E14', // تيتانيوم داكن فائق العمق
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  viewportFit: 'cover',
};

export const metadata = {
  title: "محطات النور للوقود - مركز القيادة والتحكم",
  description: "نظام إدارة ومراقبة محطات النور المتخصصة في إدارة محطات الوقود والخزانات",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "محطات النور",
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
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var savedMode = localStorage.getItem('lowGraphicsMode');
                if (savedMode === 'true') {
                  document.documentElement.classList.add('low-graphics-mode');
                }
                var savedTheme = localStorage.getItem('noor_theme_mode');
                if (savedTheme === 'daylight') {
                  document.documentElement.classList.add('daylight-theme');
                  document.documentElement.setAttribute('data-theme', 'daylight');
                }
                window.addEventListener('DOMContentLoaded', function() {
                  if (savedMode === 'true' && document.body) {
                    document.body.classList.add('low-graphics-mode');
                  }
                  if (savedTheme === 'daylight' && document.body) {
                    document.body.classList.add('daylight-theme');
                    document.body.setAttribute('data-theme', 'daylight');
                    document.body.style.backgroundColor = '#FDFBF7';
                    document.body.style.color = '#2C1A12';
                  }
                });
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body 
        suppressHydrationWarning={true}
        className={`${cairo.className} ${cairo.variable}`} 
        style={{ 
          position: 'relative', 
          minHeight: '100vh', 
          margin: 0, 
          backgroundColor: '#0B0E14', // تيتانيوم داكن افتراضي
          color: '#F8FAFC',           // نصوص بيضاء ساطعة
        }}
      >
        
        {/* 🚀 ستايل خلفية مركز القيادة والتحكم (Command Center Titanium Radial Glow & Daylight Pearl) */}
        <style dangerouslySetInnerHTML={{__html: `
          .bg-master-container {
            position: fixed; inset: 0; z-index: -4; 
            background: 
              radial-gradient(circle at 10% 15%, rgba(0, 229, 255, 0.08) 0%, transparent 45%),
              radial-gradient(circle at 90% 85%, rgba(224, 109, 68, 0.07) 0%, transparent 45%),
              #0B0E14; 
            overflow: hidden;
            pointer-events: none;
            transform: translateZ(0);
            transition: background 0.3s ease;
          }
          .bg-glass-tint {
            position: absolute; inset: 0; z-index: -3;
            background: radial-gradient(
              circle at 50% 50%, 
              rgba(20, 24, 34, 0.4) 0%, 
              rgba(11, 14, 20, 0.85) 100% 
            );
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            transform: translateZ(0);
            transition: background 0.3s ease;
          }
          @media (max-width: 768px) {
            .bg-glass-tint {
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
            }
          }
          .watermark-bg {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 45vw; max-width: 500px; opacity: 0.03; z-index: -2;
            pointer-events: none; user-select: none;
            filter: drop-shadow(0 0 30px rgba(0, 229, 255, 0.15));
            transition: opacity 0.3s ease, filter 0.3s ease;
          }

          /* ☀️ خلفية الرؤية النهارية الصحراوية (Desert Glassmorphism Daylight Mode Background) */
          .daylight-theme body, body.daylight-theme, html.daylight-theme body {
            background-color: #FDFBF7 !important;
            color: #2C1A12 !important;
          }
          .daylight-theme .bg-master-container {
            background: 
              radial-gradient(circle at 10% 15%, rgba(194, 155, 98, 0.12) 0%, transparent 50%),
              radial-gradient(circle at 90% 85%, rgba(168, 87, 60, 0.08) 0%, transparent 50%),
              #FDFBF7 !important; 
          }
          .daylight-theme .bg-glass-tint {
            background: radial-gradient(
              circle at 50% 50%, 
              rgba(255, 253, 250, 0.5) 0%, 
              rgba(253, 251, 247, 0.85) 100% 
            ) !important;
          }
          .daylight-theme .watermark-bg {
            opacity: 0.035 !important;
            filter: drop-shadow(0 0 30px rgba(194, 155, 98, 0.18)) !important;
          }

          @media print { .no-print { display: none !important; } }
        `}} />

        <div className="bg-master-container no-print">
            <div className="bg-glass-tint"></div>
        </div>

        <img src="/logo.png" alt="watermark" className="watermark-bg no-print" decoding="async" fetchPriority="low" />

        <AppClientProviders>
            {children}
        </AppClientProviders>
        
      </body>
    </html>
  );
}

