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
                        background: linear-gradient(135deg, rgba(255, 253, 250, 0.9) 0%, rgba(255, 253, 250, 0.7) 100%);
                        backdrop-filter: blur(20px);
                        border-bottom: 1px solid rgba(194, 155, 98, 0.3);
                        position: sticky;
                        top: 0;
                        z-index: 1000;
                        border-radius: 0 0 16px 16px;
                        margin: -10px -10px 14px -10px;
                        box-shadow: 0 4px 14px rgba(44, 26, 18, 0.06);
                        box-sizing: border-box;
                    }
                    .mobile-menu-btn {
                        background: linear-gradient(135deg, #C29B62 0%, #A8573C 100%);
                        border: none;
                        border-radius: 9px;
                        width: 34px;
                        height: 34px;
                        min-width: 34px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 16px;
                        box-shadow: 0 3px 8px rgba(168, 87, 60, 0.25);
                        cursor: pointer;
                        transition: 0.2s;
                        flex-shrink: 0;
                    }
                    .mobile-menu-btn:active { transform: scale(0.92); }
                }
            `}</style>

            <div className="mobile-top-nav">
                <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                    <h1 title={title} style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#2C1A12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>{title}</h1>
                    {subtitle && <p title={subtitle} style={{ margin: 0, fontSize: '10.5px', color: 'rgba(44, 26, 18, 0.6)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{subtitle}</p>}
                </div>
                <button className="mobile-menu-btn" onClick={handleToggleSidebar}>
                    ☰
                </button>
            </div>
        </>
    );
}
