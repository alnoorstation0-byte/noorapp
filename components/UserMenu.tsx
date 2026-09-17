"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';

export default function UserCard() {
    // 🚀 تحويله لمكون ذكي بيجيب بياناته بنفسه
    const [profile, setProfile] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // 📥 جلب بيانات المستخدم السيادي أوتوماتيكياً
    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfile({
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'القيادة العليا',
                    role: user.user_metadata?.role || 'super_admin',
                    avatar_url: user.user_metadata?.avatar_url || ''
                });
            }
        };
        fetchUserData();
    }, []);

    // 🖱️ إغلاق القائمة عند الضغط خارجها
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // ⏳ الهيكل العظمي أثناء التحميل
    if (!profile) return <div className="skeleton-grand"></div>;

    return (
        <div className="imperial-wrapper" ref={menuRef}>
            
            {/* 🟢 الكارت الإمبراطوري العملاق */}
            <div className={`imperial-trigger ${isOpen ? 'active' : ''}`} 
                 ref={triggerRef}
                 onClick={() => setIsOpen(!isOpen)}>
                
                {/* 📱 إضافة كلاس hidden-on-mobile-text لإخفاء النص في الموبايل */}
                <div className="imperial-info hidden-on-mobile-text">
                    <span className="u-name-grand">{profile.full_name}</span>
                    <div className="u-badge-grand">
                        <span className="crown">👑</span>
                        {profile.role === 'super_admin' ? 'رئيس مجلس الإدارة' : 'المدير التنفيذي'}
                    </div>
                </div>
                
                <div className="avatar-frame-grand">
                    <div className="magical-glow"></div>
                    <img 
                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=C5A059&color=fff&bold=true&size=128`} 
                        alt="Grand Master" 
                    />
                    <div className="active-pulse-grand"></div>
                </div>
            </div>

            {/* 🔽 القائمة المنسدلة السينمائية */}
            {isOpen && (
                <div className="imperial-dropdown">
                    <div className="dropdown-title-c">
                        <p>لوحة تحكم القيادة العليا 🕹️</p>
                        <small>{profile.full_name}</small>
                    </div>
                    
                    <div className="dropdown-link-g" onClick={() => { router.push('/profile'); setIsOpen(false); }}>
                        <span className="icon">💎</span> البروفايل الملكي
                    </div>
                    
                    <div className="dropdown-link-g" onClick={() => { router.push('/settings'); setIsOpen(false); }}>
                        <span className="icon">🛡️</span> إعدادات المنصة السيادية
                    </div>

                    <div className="imperial-divider"></div>
                    
                    <div className="dropdown-link-g logout-grand" onClick={handleLogout}>
                        <span className="icon">🚨</span> تسجيل الخروج النهائي
                    </div>
                </div>
            )}

            {/* 🎨 نفس ستايلاتك العظمة بالظبط مع تعديل بسيط للموبايل في الآخر */}
            <style>{`
                /* 🚀 1. التموضع والحركة السينمائية */
                .imperial-wrapper { 
                    position: relative; 
                    z-index: 99999;
                    animation: grandFloat 5s ease-in-out infinite;
                }

                @keyframes grandFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-4px) rotate(0.5deg); }
                }

                /* 🟢 2. الزرار الرئيسي لملف المستخدم */
                .imperial-trigger {
                    display: flex; align-items: center; gap: 16px;
                    background: rgba(20, 24, 34, 0.85);
                    backdrop-filter: blur(24px);
                    padding: 8px 24px 8px 12px; 
                    border-radius: 100px;
                    border: 1.5px solid rgba(0, 229, 255, 0.25);
                    cursor: pointer; 
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 10px rgba(0, 229, 255, 0.05);
                }
                .imperial-trigger:hover, .imperial-trigger.active { 
                    transform: scale(1.03); 
                    border-color: #00E5FF;
                    box-shadow: 0 15px 40px rgba(0, 229, 255, 0.2), 0 0 20px rgba(0, 229, 255, 0.15);
                }
                
                /* 👤 3. النصوص ومعلومات المستخدم */
                .imperial-info { display: flex; flex-direction: column; text-align: right; }
                .u-name-grand { 
                    font-size: 18px; 
                    font-weight: 900; 
                    color: #F8FAFC; 
                    white-space: nowrap; 
                    letter-spacing: -0.5px;
                    line-height: 1.2;
                }
                .u-badge-grand { 
                    font-size: 11.5px; font-weight: 800; 
                    color: #00E5FF; 
                    background: rgba(0, 229, 255, 0.12);
                    border: 1px solid rgba(0, 229, 255, 0.35);
                    padding: 4px 12px; border-radius: 20px; 
                    margin-top: 4px; display: flex; align-items: center; gap: 6px;
                    width: fit-content; align-self: flex-end;
                    box-shadow: 0 2px 8px rgba(0, 229, 255, 0.1);
                }

                /* 📸 4. صورة المستخدم والتوهج النيوني */
                .avatar-frame-grand { position: relative; width: 62px; height: 62px; flex-shrink: 0; }
                .avatar-frame-grand img { 
                    width: 100%; height: 100%; 
                    border-radius: 50%; object-fit: cover; 
                    border: 2px solid #00E5FF; 
                    position: relative; z-index: 2;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                }
                .magical-glow {
                    position: absolute; inset: -6px;
                    background: conic-gradient(from 0deg, transparent, rgba(0, 229, 255, 0.8), transparent);
                    border-radius: 50%;
                    animation: rotateGlow 3s linear infinite;
                    z-index: 1; opacity: 0.6;
                }
                @keyframes rotateGlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .active-pulse-grand { 
                    position: absolute; bottom: 3px; right: 3px; 
                    width: 16px; height: 16px; 
                    background: #10B981; 
                    border: 3px solid #141822; border-radius: 50%; 
                    box-shadow: 0 0 12px rgba(16, 185, 129, 0.9);
                    z-index: 3;
                }

                /* 🔽 5. القائمة المنسدلة (Command Menu) */
                .imperial-dropdown {
                    position: absolute; top: 115%; left: 0; width: 320px;
                    background: rgba(20, 24, 34, 0.98);
                    backdrop-filter: blur(30px);
                    border-radius: 24px; padding: 20px;
                    box-shadow: 0 30px 80px rgba(0,0,0,0.8), 0 0 25px rgba(0, 229, 255, 0.15);
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    z-index: 100000; 
                    transform-origin: top left;
                    animation: supremeShow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes supremeShow {
                    from { opacity: 0; transform: scale(0.9) translateY(-20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                .dropdown-title-c { padding-bottom: 16px; text-align: right; }
                .dropdown-title-c p { margin: 0; font-weight: 900; font-size: 16px; color: #F8FAFC; }
                .dropdown-title-c small { color: #00E5FF; font-weight: 800; font-size: 12px; }

                .dropdown-link-g {
                    display: flex; align-items: center; gap: 16px;
                    padding: 14px 20px; border-radius: 16px;
                    font-size: 14.5px; font-weight: 800; color: #94A3B8;
                    cursor: pointer; transition: 0.2s; direction: rtl;
                }
                .dropdown-link-g:hover { 
                    background: rgba(0, 229, 255, 0.1); color: #00E5FF; 
                    transform: translateX(-8px); 
                }
                .logout-grand { color: #EF4444 !important; background: rgba(239, 68, 68, 0.12); margin-top: 14px; }
                .logout-grand:hover { background: #EF4444 !important; color: #0B0E14 !important; }
                
                .imperial-divider { height: 1px; background: rgba(0, 229, 255, 0.15); margin: 12px 0; }
                .skeleton-grand { width: 240px; height: 75px; background: rgba(20, 24, 34, 0.6); border: 1px solid rgba(0, 229, 255, 0.15); border-radius: 100px; animation: pulse 2s infinite; }

                /* 📱 6. التجاوب مع الموبايل */
                @media (max-width: 768px) {
                    .hidden-on-mobile-text { display: none !important; }
                    .imperial-trigger { padding: 4px; gap: 0; border-radius: 50%; border: none; background: transparent; box-shadow: none; }
                    .avatar-frame-grand { width: 50px; height: 50px; }
                    .imperial-dropdown { width: 280px; left: auto; right: -10px; transform-origin: top right; }
                }
            `}</style>
        </div>
    );
}
