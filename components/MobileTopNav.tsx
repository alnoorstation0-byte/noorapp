"use client";
import React from 'react';
import { THEME } from '@/lib/theme';

interface MobileTopNavProps {
    title: string;
    subtitle?: string;
}

export default function MobileTopNav({ title, subtitle }: MobileTopNavProps) {
    const handleToggleSidebar = () => {
        // 🚀 الكود ده بيضيف كلاس للـ body عشان السايد بار يفتح (حسب مكتبة رواسي)
        document.body.classList.toggle('mobile-sidebar-active');
    };

    return (
        <>
            <style>{`
                /* إخفاء البار في الشاشات الكبيرة */
                .mobile-top-nav { display: none; }
                
                /* إظهار وتنسيق البار في الجوال فقط */
                @media (max-width: 768px) {
                    .mobile-top-nav {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        padding: 10px 14px;
                        background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.9) 100%);
                        backdrop-filter: blur(24px) saturate(160%);
                        border-bottom: 1px solid rgba(0, 229, 255, 0.25);
                        position: sticky;
                        top: 0;
                        z-index: 1000;
                        border-radius: 0 0 16px 16px;
                        margin: -10px -10px 14px -10px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                        box-sizing: border-box;
                    }
                    .mobile-menu-btn {
                        background: linear-gradient(135deg, #00E5FF 0%, #0077B6 100%);
                        border: none;
                        border-radius: 9px;
                        width: 34px;
                        height: 34px;
                        min-width: 34px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #0B0E14;
                        font-size: 16px;
                        font-weight: 900;
                        box-shadow: 0 2px 10px rgba(0, 229, 255, 0.35);
                        cursor: pointer;
                        transition: 0.2s;
                        flex-shrink: 0;
                    }
                    .mobile-menu-btn:active { transform: scale(0.92); }
                }
            `}</style>

            <div className="mobile-top-nav">
                <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                    <h1 title={title} style={{ margin: 0, fontSize: '14.5px', fontWeight: 900, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>{title}</h1>
                    {subtitle && <p title={subtitle} style={{ margin: 0, fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{subtitle}</p>}
                </div>
                <button className="mobile-menu-btn" onClick={handleToggleSidebar}>
                    ☰
                </button>
            </div>
        </>
    );
}
