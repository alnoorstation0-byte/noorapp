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
  themeColor: '#2C1A12', // بني الخيام الداكن
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  viewportFit: 'cover',
};

export const metadata = {
  title: "صيدلية تاج المودة البيطرية - نظام الإدارة الموحد",
  description: "نظام إدارة صيدلية تاج المودة المتخصصة في رعاية الخيول والإبل",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "تاج المودة",
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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body 
        className={`${cairo.className} ${cairo.variable}`} 
        style={{ 
          position: 'relative', 
          minHeight: '100vh', 
          margin: 0, 
          backgroundColor: '#FDFBF7', // كثبان لؤلؤية
          color: '#2C1A12',           // بني الخيام الداكن
        }}
      >
        
        {/* 🏜️ ستايل الخلفية الصحراوية الزجاجية (Dune Pearl Glass Background) */}
        <style dangerouslySetInnerHTML={{__html: `
          .bg-master-container {
            position: fixed; inset: 0; z-index: -4; 
            background: radial-gradient(circle at 10% 20%, rgba(194, 155, 98, 0.08) 0%, rgba(253, 251, 247, 1) 90%); 
            overflow: hidden;
            pointer-events: none;
          }
          .bg-glass-tint {
            position: absolute; inset: 0; z-index: -3;
            background: linear-gradient(
              135deg, 
              rgba(255, 253, 250, 0.6) 0%, 
              rgba(253, 251, 247, 0.2) 100% 
            );
            backdrop-filter: blur(24px) saturate(160%);
            -webkit-backdrop-filter: blur(24px);
          }
          .watermark-bg {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 45vw; max-width: 500px; opacity: 0.035; z-index: -2;
            pointer-events: none; user-select: none;
          }
          @media print { .no-print { display: none !important; } }
        `}} />

        <div className="bg-master-container no-print">
            <div className="bg-glass-tint"></div>
        </div>

        <img src="/taj_logo.png" alt="watermark" className="watermark-bg no-print" />

        <AppClientProviders>
            {children}
        </AppClientProviders>
        
      </body>
    </html>
  );
}
