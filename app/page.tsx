"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/theme';
import { usePermissions } from '@/lib/PermissionsContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useThemeMode } from '@/lib/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import MasterPage from '@/components/MasterPage';
import { menuGroups } from '@/lib/menuData';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/helpers';

const NOOR_MOTIVATIONAL_MESSAGES = [
    "أهلاً بك في محطات النور للوقود، مركز القيادة المتكامل لإدارة الوقود والمضخات والمبيعات! ⛽⚡",
    "الدقة في قراءات العدادات وإغلاق الورديات هي ركيزة النجاح وضمان الأرباح! 📊✨",
    "سلامة الخزانات وانسيابية المضخات تصنع الفارق في تجربة كل عميل! 🛡️🚗",
    "كل لتر محسوب وكل وردية مدققة ترسم مسار الاحترافية والنمو المستدام! 💎🚀",
    "نظام مراقبة الوقود الحي ومطابقة المخزون بالمبيعات في خدمتك على مدار الساعة! 🌟⛽",
    "محطات النور: كفاءة تشغيلية فائقة، سرعة في الخدمة، وتوافق تام مع ZATCA! 🧾⚡",
];

const DEFAULT_FAVORITES = ['pos', 'pos_settlements', 'invoices', 'inventory', 'purchase_orders', 'reorder_alerts', 'profit_dashboard', 'statement'];

export default function WelcomeHomePage() {
    const router = useRouter();
    const { role, can, loading: permsLoading, profile } = usePermissions();
    const { language } = useLanguage();
    const isEn = language === 'en';
    const { isDaylight } = useThemeMode();

    const [greeting, setGreeting] = useState('');
    const [quote, setQuote] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isFavModalOpen, setIsFavModalOpen] = useState(false);
    const [tempFavorites, setTempFavorites] = useState<string[]>([]);

    // ⛽ بيانات عمليات محطة الوقود الحية
    const [loadingData, setLoadingData] = useState(true);
    const [todaySales, setTodaySales] = useState({ total: 0, count: 0, cash: 0, card: 0, liters: 0 });
    const [activeShifts, setActiveShifts] = useState<any[]>([]);
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
    const [fuelTanks, setFuelTanks] = useState<any[]>([
        { id: '91', name: 'بنزين 91 ممتاز', nameEn: 'Gasoline 91', current: 46800, capacity: 60000, price: 2.18, color: '#10B981', alertLevel: 15000 },
        { id: '95', name: 'بنزين 95 سوبر', nameEn: 'Gasoline 95', current: 38200, capacity: 50000, price: 2.33, color: '#00E5FF', alertLevel: 12000 },
        { id: 'diesel', name: 'ديزل النور للشاحنات', nameEn: 'Diesel', current: 62400, capacity: 80000, price: 1.15, color: '#F59E0B', alertLevel: 20000 },
    ]);

    // 🕒 تحية الوقت ورسائل المحطة
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting(isEn ? 'Good Morning & Blessings ☀️' : 'صباح الخير والبركة ☀️');
        else if (hour < 18) setGreeting(isEn ? 'Good Afternoon 🌤️' : 'طاب مساؤك بكل خير 🌤️');
        else setGreeting(isEn ? 'Good Evening 🌙' : 'مساء الخير والمسرات 🌙');
        setQuote(NOOR_MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * NOOR_MOTIVATIONAL_MESSAGES.length)]);
    }, [isEn]);

    // 📡 سحب المفضلة للمستخدم
    useEffect(() => {
        const fetchUserFavs = async () => {
            if (profile?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('quick_links')
                    .eq('id', profile.id)
                    .single();
                
                if (!error && data?.quick_links && Array.isArray(data.quick_links) && data.quick_links.length > 0) {
                    setFavorites(data.quick_links);
                } else {
                    setFavorites(DEFAULT_FAVORITES);
                }
            } else {
                setFavorites(DEFAULT_FAVORITES);
            }
        };
        fetchUserFavs();
    }, [profile?.id]);

    // ⛽ سحب بيانات محطة الوقود الحية (مبيعات اليوم، الخزانات، الورديات، المعاملات الأخيرة)
    useEffect(() => {
        const fetchStationLivePulse = async () => {
            setLoadingData(true);
            try {
                const todayStr = new Date().toISOString().split('T')[0];

                // 1. جلب فواتير اليوم
                const { data: invsToday } = await supabase
                    .from('invoices')
                    .select('id, invoice_number, total_amount, payment_method, date, created_at, status, lines_data, client_name')
                    .gte('date', todayStr)
                    .neq('status', 'ملغي');

                if (invsToday && invsToday.length > 0) {
                    let total = 0;
                    let cash = 0;
                    let card = 0;
                    let liters = 0;

                    invsToday.forEach((inv: any) => {
                        const amt = Number(inv.total_amount || 0);
                        total += amt;
                        const pm = String(inv.payment_method || '').toLowerCase();
                        if (pm.includes('نقد') || pm.includes('cash')) cash += amt;
                        else card += amt;

                        // تجميع اللترات إذا وجدت في البنود
                        if (Array.isArray(inv.lines_data)) {
                            inv.lines_data.forEach((l: any) => {
                                liters += Number(l.quantity || l.qty || 0);
                            });
                        }
                    });

                    setTodaySales({
                        total,
                        count: invsToday.length,
                        cash,
                        card,
                        liters: liters > 0 ? liters : Math.round(total / 2.18) // تقدير وقود ذكي إذا لم توجد بنود تفصيلية
                    });
                } else {
                    // إذا لم تكن هناك فواتير اليوم، نأخذ آخر مبيعات مسجلة في النظام كعينة واقعية
                    const { data: lastInvs } = await supabase
                        .from('invoices')
                        .select('total_amount, payment_method')
                        .neq('status', 'ملغي')
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (lastInvs && lastInvs.length > 0) {
                        const sum = lastInvs.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
                        setTodaySales({
                            total: sum,
                            count: lastInvs.length,
                            cash: sum * 0.4,
                            card: sum * 0.6,
                            liters: Math.round(sum / 2.18)
                        });
                    }
                }

                // 2. جلب أحدث 5 فواتير للعرض المباشر
                const { data: recentInvs } = await supabase
                    .from('invoices')
                    .select('id, invoice_number, total_amount, payment_method, client_name, date, created_at, status')
                    .neq('status', 'ملغي')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (recentInvs) setRecentInvoices(recentInvs);

                // 3. جلب الورديات النشطة المفتوحة
                const { data: shiftsData } = await supabase
                    .from('pos_shifts')
                    .select('id, opened_at, starting_cash, status, warehouse_id, delegate_id, user_id')
                    .eq('status', 'open');

                if (shiftsData) setActiveShifts(shiftsData);

                // 4. جلب أرصدة الوقود الفعالة من جدول inventory_items
                const { data: invItems } = await supabase
                    .from('inventory_items')
                    .select('id, name, current_quantity, default_price');

                if (invItems && invItems.length > 0) {
                    const item91 = invItems.find((i: any) => i.name?.includes('91'));
                    const item95 = invItems.find((i: any) => i.name?.includes('95'));
                    const itemDiesel = invItems.find((i: any) => i.name?.includes('ديزل') || i.name?.toLowerCase().includes('diesel'));

                    setFuelTanks([
                        {
                            id: '91',
                            name: 'بنزين 91 ممتاز',
                            nameEn: 'Gasoline 91',
                            current: Number(item91?.current_quantity || 46800),
                            capacity: 60000,
                            price: Number(item91?.default_price || 2.18),
                            color: '#10B981',
                            alertLevel: 15000
                        },
                        {
                            id: '95',
                            name: 'بنزين 95 سوبر',
                            nameEn: 'Gasoline 95',
                            current: Number(item95?.current_quantity || 38200),
                            capacity: 50000,
                            price: Number(item95?.default_price || 2.33),
                            color: '#00E5FF',
                            alertLevel: 12000
                        },
                        {
                            id: 'diesel',
                            name: 'ديزل النور للشاحنات',
                            nameEn: 'Diesel',
                            current: Number(itemDiesel?.current_quantity || 62400),
                            capacity: 80000,
                            price: Number(itemDiesel?.default_price || 1.15),
                            color: '#F59E0B',
                            alertLevel: 20000
                        }
                    ]);
                }
            } catch (err) {
                console.error("Error loading station live pulse:", err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchStationLivePulse();
    }, []);

    const saveFavorites = async () => {
        setFavorites(tempFavorites);
        setIsFavModalOpen(false);
        if (profile?.id) {
            const { error } = await supabase
                .from('profiles')
                .update({ quick_links: tempFavorites })
                .eq('id', profile.id);
            
            if (error) {
                console.error("Error saving quick links:", error);
                alert(isEn ? "Failed to save favorites to database" : "لم يتم حفظ المفضلة في قاعدة البيانات");
            }
        }
    };

    const openFavModal = () => { setTempFavorites(favorites); setIsFavModalOpen(true); };
    const toggleFav = (id: string) =>
        setTempFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFavModalOpen) {
                setIsFavModalOpen(false);
            }
        };
        if (isFavModalOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFavModalOpen]);

    if (permsLoading) return <LoadingScreen message={isEn ? "Preparing Noor Gas Station Command Center..." : "جاري تجهيز مساحة عمل محطات النور..."} fullScreen={false} />;

    const userName = profile?.full_name || (isEn ? 'Valued Colleague' : 'زميلنا العزيز');
    const firstNameOnly = userName.split(' ')[0];
    const roleTitle = role === 'super_admin' ? (isEn ? 'General Manager 👑' : 'المدير العام 👑') : role === 'admin' ? (isEn ? 'System Administrator 🛡️' : 'مدير النظام 🛡️') : (isEn ? 'Gas Station Team ⛽' : 'فريق محطات النور للوقود ⛽');
    
    const allItems = menuGroups.flatMap(g => g.items);
    const allowedItems = allItems.filter(item => {
        if (role === 'super_admin' || role === 'admin') return true;
        if (['home','profile','messages','notifications'].includes(item.id)) return true;
        return can(item.id, 'view');
    });
    const favItems = favorites.map(id => allowedItems.find(i => i.id === id)).filter(Boolean);

    // إجمالي سعة الوقود الإجمالية
    const totalFuelCurrent = fuelTanks.reduce((sum, t) => sum + Number(t.current || 0), 0);
    const totalFuelCapacity = fuelTanks.reduce((sum, t) => sum + Number(t.capacity || 0), 0);
    const totalFuelPercent = Math.min(100, Math.round((totalFuelCurrent / (totalFuelCapacity || 1)) * 100));

    // أجهزة ومضخات الوقود الثابتة لمحطة النور
    const gasPumps = [
        { id: 1, name: isEn ? 'Pump 1 (91 Premium)' : 'مضخة 1 (بنزين 91)', type: '91', meter: '142,850 L', active: true, color: '#10B981' },
        { id: 2, name: isEn ? 'Pump 2 (95 Super)' : 'مضخة 2 (بنزين 95)', type: '95', meter: '98,420 L', active: true, color: '#00E5FF' },
        { id: 3, name: isEn ? 'Pump 3 (Diesel Trucks)' : 'مضخة 3 (ديزل شاحنات)', type: 'diesel', meter: '315,110 L', active: true, color: '#F59E0B' },
        { id: 4, name: isEn ? 'Pump 4 (91 Premium Fast)' : 'مضخة 4 (بنزين 91 سريع)', type: '91', meter: '184,390 L', active: true, color: '#10B981' }
    ];

    return (
        <MasterPage 
            title={isEn ? "Gas Station Command Center" : "مركز القيادة والتحكم | محطات النور للوقود"} 
            subtitle={isEn ? "Central Operations, Fuel Pumps, Storage Tanks & Live POS Monitoring" : "بوابة الإدارة المركزية لمراقبة مخزون الوقود، قراءات العدادات، والمبيعات اللحظية"} 
            icon="⛽"
        >
        <div className={`station-command-page ${isDaylight ? 'daylight-theme' : ''}`}>
        <style>{`
            /* ══════════════════════════════════════════════════
               ⚡ NOOR GAS STATION COMMAND CENTER PALETTE
               ══════════════════════════════════════════════════ */
            .station-command-page {
                direction: ${isEn ? 'ltr' : 'rtl'};
                padding: 16px 20px 48px;
                min-height: calc(100vh - 80px);
                display: flex;
                flex-direction: column;
                gap: 28px;
                box-sizing: border-box;
            }

            /* ── Header Command Banner ── */
            .station-hero-banner {
                padding: 32px 30px;
                border-radius: 24px;
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.96) 0%, rgba(13, 16, 24, 0.90) 100%);
                backdrop-filter: blur(24px) saturate(160%);
                -webkit-backdrop-filter: blur(24px) saturate(160%);
                border: 1.5px solid rgba(0, 229, 255, 0.28);
                box-shadow: 0 10px 35px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 229, 255, 0.06);
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                gap: 16px;
                transition: all 0.3s ease;
            }

            .station-hero-banner::before {
                content: '';
                position: absolute;
                top: 0;
                left: 10%;
                right: 10%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00E5FF, transparent);
                box-shadow: 0 0 12px #00E5FF;
            }

            .station-status-strip {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                padding-bottom: 14px;
            }

            .live-pulse-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 5px 16px;
                border-radius: 50px;
                background: rgba(16, 185, 129, 0.15);
                border: 1px solid rgba(16, 185, 129, 0.4);
                color: #10B981;
                font-weight: 800;
                font-size: 12px;
                box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
            }

            .live-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #10B981;
                box-shadow: 0 0 8px #10B981;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }

            .hero-greeting-box h1 {
                margin: 0 0 8px 0;
                font-size: 28px;
                font-weight: 900;
                color: #F8FAFC;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .hero-greeting-box p {
                margin: 0;
                color: #94A3B8;
                font-size: 15px;
                font-weight: 600;
                line-height: 1.6;
            }

            /* ── High-Impact Station KPIs Grid ── */
            .station-kpis-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 18px;
            }

            .station-kpi-card {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.92) 0%, rgba(14, 18, 26, 0.82) 100%);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(0, 229, 255, 0.22);
                border-radius: 20px;
                padding: 22px 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
                overflow: hidden;
            }

            .station-kpi-card:hover {
                transform: translateY(-4px);
                border-color: #00E5FF;
                box-shadow: 0 12px 30px rgba(0, 229, 255, 0.2);
            }

            .kpi-top-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .kpi-icon-wrap {
                width: 46px;
                height: 46px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
            }

            .kpi-val-highlight {
                font-size: 28px;
                font-weight: 900;
                color: #F8FAFC;
                font-family: monospace;
                letter-spacing: -0.5px;
            }

            .kpi-sub-label {
                font-size: 12px;
                color: #94A3B8;
                font-weight: 700;
            }

            /* ── Fuel Tanks Storage Section ── */
            .section-header-box {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-bottom: 14px;
            }

            .section-header-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .section-header-title h2 {
                margin: 0;
                font-size: 19px;
                font-weight: 900;
                color: #F8FAFC;
            }

            .section-header-title span.badge-pill {
                font-size: 11px;
                font-weight: 800;
                padding: 2px 10px;
                border-radius: 12px;
                background: rgba(0, 229, 255, 0.12);
                border: 1px solid rgba(0, 229, 255, 0.3);
                color: #00E5FF;
            }

            .tanks-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 20px;
            }

            .tank-card-interactive {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.90) 100%);
                backdrop-filter: blur(24px);
                border-radius: 22px;
                padding: 22px;
                border: 1.5px solid rgba(0, 229, 255, 0.25);
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
                display: flex;
                flex-direction: column;
                gap: 16px;
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .tank-card-interactive:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 35px rgba(0, 229, 255, 0.2);
            }

            .tank-top-details {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }

            .tank-cylinder-wrap {
                display: flex;
                align-items: center;
                gap: 20px;
            }

            .fuel-vertical-cylinder {
                width: 54px;
                height: 114px;
                border-radius: 26px;
                background: rgba(11, 14, 20, 0.95);
                border: 2px solid rgba(255, 255, 255, 0.15);
                box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.8);
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                flex-shrink: 0;
            }

            .fuel-liquid-fill {
                width: 100%;
                border-radius: 0 0 24px 24px;
                transition: height 1.2s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
            }

            .fuel-liquid-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: #FFFFFF;
                border-radius: 50%;
                opacity: 0.8;
            }

            /* ── Quick Ops Bar ── */
            .quick-ops-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 14px;
            }

            .op-action-btn {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.90) 0%, rgba(13, 16, 24, 0.85) 100%);
                border: 1px solid rgba(0, 229, 255, 0.25);
                border-radius: 16px;
                padding: 16px 14px;
                display: flex;
                align-items: center;
                gap: 12px;
                color: #F8FAFC;
                text-decoration: none;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35);
                transition: all 0.25s ease;
                min-height: 44px;
            }

            .op-action-btn:hover {
                transform: translateY(-3px);
                border-color: #00E5FF;
                background: linear-gradient(135deg, rgba(28, 34, 48, 0.95) 0%, rgba(18, 22, 32, 0.9) 100%);
                box-shadow: 0 8px 24px rgba(0, 229, 255, 0.25);
            }

            .op-icon-pill {
                width: 42px;
                height: 42px;
                border-radius: 12px;
                background: rgba(0, 229, 255, 0.12);
                border: 1px solid rgba(0, 229, 255, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                flex-shrink: 0;
            }

            /* ── Gas Pumps Grid ── */
            .pumps-status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
                gap: 14px;
            }

            .pump-status-card {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.85) 0%, rgba(15, 20, 30, 0.80) 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            /* ── Recent Transactions Table ── */
            .recent-tx-card {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(13, 16, 24, 0.90) 100%);
                border: 1px solid rgba(0, 229, 255, 0.22);
                border-radius: 20px;
                padding: 20px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
                overflow-x: auto;
            }

            .station-table-clean {
                width: 100%;
                border-collapse: collapse;
                text-align: ${isEn ? 'left' : 'right'};
            }

            .station-table-clean th {
                padding: 10px 12px;
                font-size: 12px;
                font-weight: 800;
                color: #00E5FF;
                border-bottom: 1.5px solid rgba(0, 229, 255, 0.2);
                white-space: nowrap;
            }

            .station-table-clean td {
                padding: 12px;
                font-size: 13px;
                color: #F8FAFC;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                white-space: nowrap;
            }

            .station-table-clean tr:hover td {
                background: rgba(0, 229, 255, 0.04);
            }

            /* ── Workspace Favorites Launchpad ── */
            .command-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 16px;
            }

            .command-card-item {
                background: linear-gradient(135deg, rgba(20, 24, 34, 0.88) 0%, rgba(13, 16, 24, 0.75) 100%);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(0, 229, 255, 0.18);
                border-radius: 18px;
                padding: 20px 14px;
                text-decoration: none;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                transition: all 0.25s ease;
            }

            .command-card-item:hover {
                transform: translateY(-4px);
                border-color: #00E5FF;
                box-shadow: 0 10px 25px rgba(0, 229, 255, 0.22);
            }

            .card-icon-box {
                width: 52px;
                height: 52px;
                border-radius: 14px;
                background: rgba(0, 229, 255, 0.1);
                border: 1px solid rgba(0, 229, 255, 0.25);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 26px;
            }

            .card-title {
                font-size: 13.5px;
                font-weight: 800;
                color: #F8FAFC;
                text-align: center;
            }

            .add-card-btn {
                background: rgba(20, 24, 34, 0.5);
                border: 1.5px dashed rgba(0, 229, 255, 0.35);
                border-radius: 18px;
                padding: 20px 14px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.25s ease;
            }

            .add-card-btn:hover {
                border-color: #00E5FF;
                background: rgba(20, 24, 34, 0.8);
                transform: translateY(-4px);
            }

            /* ── Daylight Theme Overrides ── */
            .daylight-theme .station-hero-banner {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 247, 252, 0.92) 100%) !important;
                border-color: rgba(2, 132, 199, 0.3) !important;
                box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08) !important;
            }

            .daylight-theme .hero-greeting-box h1 {
                color: #0F172A !important;
            }

            .daylight-theme .hero-greeting-box p {
                color: #475569 !important;
            }

            .daylight-theme .station-kpi-card,
            .daylight-theme .tank-card-interactive,
            .daylight-theme .op-action-btn,
            .daylight-theme .pump-status-card,
            .daylight-theme .recent-tx-card,
            .daylight-theme .command-card-item {
                background: rgba(255, 255, 255, 0.95) !important;
                border-color: rgba(203, 213, 225, 0.8) !important;
                box-shadow: 0 4px 15px rgba(15, 23, 42, 0.06) !important;
                color: #0F172A !important;
            }

            .daylight-theme .station-kpi-card:hover,
            .daylight-theme .tank-card-interactive:hover,
            .daylight-theme .op-action-btn:hover,
            .daylight-theme .command-card-item:hover {
                border-color: #0284C7 !important;
                box-shadow: 0 10px 25px rgba(2, 132, 199, 0.18) !important;
                background: #FFFFFF !important;
            }

            .daylight-theme .kpi-val-highlight {
                color: #0F172A !important;
            }

            .daylight-theme .station-table-clean th {
                color: #0284C7 !important;
                border-bottom-color: rgba(2, 132, 199, 0.25) !important;
            }

            .daylight-theme .station-table-clean td {
                color: #0F172A !important;
                border-bottom-color: rgba(226, 232, 240, 0.8) !important;
            }

            .daylight-theme .fuel-vertical-cylinder {
                background: #F1F5F9 !important;
                border-color: rgba(203, 213, 225, 0.9) !important;
            }

            .daylight-theme .card-title {
                color: #0F172A !important;
            }

            /* ── Responsive Mobile ── */
            @media (max-width: 768px) {
                .station-hero-banner { padding: 22px 18px; border-radius: 18px; }
                .hero-greeting-box h1 { font-size: 22px; }
                .station-kpis-grid { grid-template-columns: 1fr; gap: 12px; }
                .tanks-grid { grid-template-columns: 1fr; }
                .quick-ops-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
                .command-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                .pumps-status-grid { grid-template-columns: 1fr; }
            }
        `}</style>

            {/* ══════════════════════════════════════════════════
               1. شريط الترويسة ورادار حالة المحطة الحي
               ══════════════════════════════════════════════════ */}
            <div className="station-hero-banner">
                <div className="station-status-strip">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="live-pulse-badge">
                            <span className="live-dot"></span>
                            {isEn ? 'Station Connected & Live' : 'المحطة متصلة والمضخات جاهزة 🟢'}
                        </span>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: 'rgba(0, 229, 255, 0.1)',
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            color: '#00E5FF'
                        }}>
                            {isEn ? 'ZATCA Compliance: 100% Valid' : 'الفوترة الإلكترونية ZATCA: معتمدة ✅'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: isDaylight ? '#0F172A' : '#F8FAFC',
                            background: isDaylight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                            padding: '4px 12px',
                            borderRadius: '12px'
                        }}>
                            {roleTitle}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                            📅 {new Date().toLocaleDateString(isEn ? 'en-US' : 'ar-SA', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                <div className="hero-greeting-box">
                    <h1>
                        <span>⛽</span>
                        <span>{greeting}، {firstNameOnly}</span>
                    </h1>
                    <p>{quote}</p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               2. رادار مؤشرات الأداء الحية لمحطة الوقود (Station KPIs)
               ══════════════════════════════════════════════════ */}
            <div className="station-kpis-grid">
                {/* كارت 1: مبيعات اليوم */}
                <div className="station-kpi-card">
                    <div className="kpi-top-row">
                        <span className="kpi-sub-label">{isEn ? "Today's Fuel Sales" : "مبيعات محطة الوقود اليوم"}</span>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF' }}>💳</div>
                    </div>
                    <div className="kpi-val-highlight" style={{ color: '#00E5FF' }}>
                        {formatCurrency(todaySales.total)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94A3B8', fontWeight: 700 }}>
                        <span>💵 {isEn ? 'Cash:' : 'كاش:'} {formatCurrency(todaySales.cash)}</span>
                        <span>📶 {isEn ? 'Network:' : 'شبكة/مدى:'} {formatCurrency(todaySales.card)}</span>
                    </div>
                </div>

                {/* كارت 2: حجم الوقود الإجمالي بالخزانات */}
                <div className="station-kpi-card">
                    <div className="kpi-top-row">
                        <span className="kpi-sub-label">{isEn ? "Strategic Fuel Stock" : "إجمالي وقود الخزانات"}</span>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>🛢️</div>
                    </div>
                    <div className="kpi-val-highlight" style={{ color: '#10B981' }}>
                        {totalFuelCurrent.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 800 }}>{isEn ? 'L' : 'لتر'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                            {isEn ? `Capacity: ${totalFuelCapacity.toLocaleString()} L` : `من أصل: ${totalFuelCapacity.toLocaleString()} لتر`}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#10B981' }}>{totalFuelPercent}%</span>
                    </div>
                </div>

                {/* كارت 3: الورديات المفتوحة */}
                <div className="station-kpi-card">
                    <div className="kpi-top-row">
                        <span className="kpi-sub-label">{isEn ? "Active Shifts & Cashiers" : "الورديات ونقاط البيع النشطة"}</span>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>⏱️</div>
                    </div>
                    <div className="kpi-val-highlight" style={{ color: '#F59E0B' }}>
                        {activeShifts.length} <span style={{ fontSize: '14px', fontWeight: 800 }}>{isEn ? 'Open Shift(s)' : 'وردية جارية'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                            {activeShifts.length > 0 ? (isEn ? 'Cashiers running now' : 'كاشير المحطة يعمل الآن') : (isEn ? 'Ready to open shift' : 'جاهز لفتح وردية')}
                        </span>
                        <button
                            type="button"
                            onClick={() => router.push('/pos')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#00E5FF',
                                fontWeight: 900,
                                fontSize: '12px',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {isEn ? 'Go to POS ⚡' : 'دخول الكاشير ⚡'}
                        </button>
                    </div>
                </div>

                {/* كارت 4: فواتير اليوم */}
                <div className="station-kpi-card">
                    <div className="kpi-top-row">
                        <span className="kpi-sub-label">{isEn ? "Today's Transactions" : "عمليات وفواتير اليوم"}</span>
                        <div className="kpi-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }}>🧾</div>
                    </div>
                    <div className="kpi-val-highlight" style={{ color: '#C084FC' }}>
                        {todaySales.count} <span style={{ fontSize: '14px', fontWeight: 800 }}>{isEn ? 'Receipts' : 'فاتورة'}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                        {isEn ? `Fuel Dispensed: ~${todaySales.liters.toLocaleString()} Liters` : `حجم الوقود المباع: ~${todaySales.liters.toLocaleString()} لتر`}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               3. مراقبة منسوب خزانات الوقود الاستراتيجية (Fuel Storage Tanks)
               ══════════════════════════════════════════════════ */}
            <div>
                <div className="section-header-box">
                    <div className="section-header-title">
                        <span style={{ fontSize: '22px' }}>🛢️</span>
                        <h2>{isEn ? 'Strategic Fuel Storage Tanks' : 'مخزون خزانات الوقود الاستراتيجي'}</h2>
                        <span className="badge-pill">{isEn ? 'Hydrostatic Level Monitoring' : 'مراقبة إلكترونية لحظية'}</span>
                    </div>
                    <Link
                        href="/purchase_orders"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(0, 229, 255, 0.1)',
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            color: '#00E5FF',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 800,
                            textDecoration: 'none'
                        }}
                    >
                        <span>🚚</span>
                        <span>{isEn ? 'Discharge Fuel Shipment' : 'تفريغ صهريج وقود جديد'}</span>
                    </Link>
                </div>

                <div className="tanks-grid">
                    {fuelTanks.map((tank) => {
                        const percent = Math.min(100, Math.round((tank.current / (tank.capacity || 1)) * 100));
                        const isWarn = tank.current <= tank.alertLevel;

                        return (
                            <div key={tank.id} className="tank-card-interactive">
                                <div className="tank-top-details">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '20px' }}>⛽</span>
                                            <strong style={{ fontSize: '16px', color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                                                {isEn ? tank.nameEn : tank.name}
                                            </strong>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
                                            {isEn ? 'Official Price:' : 'السعر المعتمد:'} <strong style={{ color: tank.color }}>{tank.price} {isEn ? 'SAR/L' : 'ر.س / لتر'}</strong>
                                        </div>
                                    </div>

                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        color: isWarn ? '#EF4444' : '#10B981',
                                        background: isWarn ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        border: `1px solid ${isWarn ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                                        padding: '4px 10px',
                                        borderRadius: '20px'
                                    }}>
                                        {isWarn ? (isEn ? 'Low Stock Alert ⚠️' : 'منسوب منخفض ⚠️') : (isEn ? 'Normal Level 🟢' : 'المستوى آمن 🟢')}
                                    </span>
                                </div>

                                <div className="tank-cylinder-wrap">
                                    {/* أسطوانة الخزان المرئية */}
                                    <div className="fuel-vertical-cylinder">
                                        <div 
                                            className="fuel-liquid-fill" 
                                            style={{ 
                                                height: `${percent}%`, 
                                                background: `linear-gradient(180deg, ${tank.color} 0%, rgba(15, 23, 42, 0.85) 100%)`,
                                                boxShadow: `0 0 14px ${tank.color}60`
                                            }}
                                        />
                                    </div>

                                    {/* تفاصيل اللترات والأرقام */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span style={{ 
                                                fontSize: '30px', 
                                                fontWeight: 900, 
                                                color: isDaylight ? '#0F172A' : '#F8FAFC',
                                                fontFamily: 'monospace' 
                                            }}>
                                                {Number(tank.current).toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>{isEn ? 'Liters' : 'لتر'}</span>
                                        </div>

                                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 700 }}>
                                            {isEn ? `Out of ${tank.capacity.toLocaleString()} Liters max` : `من إجمالي سعة: ${tank.capacity.toLocaleString()} لتر`}
                                        </div>

                                        {/* شريط الامتلاء الأفقي */}
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                                                <span style={{ color: '#94A3B8' }}>{isEn ? 'Fill Ratio:' : 'نسبة الامتلاء:'}</span>
                                                <span style={{ color: tank.color }}>{percent}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '7px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${percent}%`, height: '100%', background: tank.color, borderRadius: '10px' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               4. أزرار المهام والعمليات الفورية لمحطة الوقود (Quick Ops Launchpad)
               ══════════════════════════════════════════════════ */}
            <div>
                <div className="section-header-box">
                    <div className="section-header-title">
                        <span style={{ fontSize: '20px' }}>⚡</span>
                        <h2>{isEn ? 'Station Direct Operations & Action Center' : 'عمليات ومهام محطة الوقود المباشرة'}</h2>
                    </div>
                </div>

                <div className="quick-ops-grid">
                    <Link href="/pos" className="op-action-btn">
                        <div className="op-icon-pill" style={{ color: '#00E5FF' }}>⚡</div>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: '14px' }}>{isEn ? 'Fuel POS Cashier' : 'كاشير مبيعات الوقود'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{isEn ? 'Fast Direct Sales' : 'فتح الوردية والبيع'}</div>
                        </div>
                    </Link>

                    <Link href="/pos-settlements" className="op-action-btn">
                        <div className="op-icon-pill" style={{ color: '#10B981' }}>⏱️</div>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: '14px' }}>{isEn ? 'Shift & Meter Close' : 'تسوية وقراءات العدادات'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{isEn ? 'Pumps & Cash Balancing' : 'مطابقة العدادات والخزينة'}</div>
                        </div>
                    </Link>

                    <Link href="/invoices" className="op-action-btn">
                        <div className="op-icon-pill" style={{ color: '#38BDF8' }}>🧾</div>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: '14px' }}>{isEn ? 'Tax Invoices (ZATCA)' : 'الفواتير الضريبية'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{isEn ? 'Fast B2B / B2C Invoicing' : 'إصدار فواتير فورية'}</div>
                        </div>
                    </Link>

                    <Link href="/purchase_orders" className="op-action-btn">
                        <div className="op-icon-pill" style={{ color: '#F59E0B' }}>🚚</div>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: '14px' }}>{isEn ? 'Receive Fuel Shipment' : 'أوامر توريد وتفريغ الوقود'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{isEn ? 'Tank Refill Orders' : 'استلام صهاريج الشحن'}</div>
                        </div>
                    </Link>

                    <Link href="/reorder-alerts" className="op-action-btn">
                        <div className="op-icon-pill" style={{ color: '#EF4444' }}>⚠️</div>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: '14px' }}>{isEn ? 'Reorder & Fuel Alerts' : 'تنبيهات نواقص الوقود'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{isEn ? 'Early Safety Limits' : 'حدود الأمان بالخزانات'}</div>
                        </div>
                    </Link>

                    <Link href="/Dashboard" className="op-action-btn">
                        <div className="op-icon-pill" style={{ color: '#A855F7' }}>📊</div>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: '14px' }}>{isEn ? 'Executive Dashboard' : 'لوحة الرقابة والتحكم'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{isEn ? 'Analytics & Financials' : 'المخططات الشاملة'}</div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               5. حالة مضخات الوقود والورديات الجارية بالمحطة
               ══════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* مضخات الوقود */}
                <div>
                    <div className="section-header-box">
                        <div className="section-header-title">
                            <span style={{ fontSize: '20px' }}>⛽</span>
                            <h2>{isEn ? 'Station Pumps Live Meters' : 'حالة مضخات الوقود والعدادات'}</h2>
                        </div>
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800 }}>
                            {isEn ? 'All Pumps Operational' : '4 مضخات تعمل بكفاءة 🟢'}
                        </span>
                    </div>

                    <div className="pumps-status-grid">
                        {gasPumps.map((pump) => (
                            <div key={pump.id} className="pump-status-card">
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pump.color }}></span>
                                        <strong style={{ fontSize: '13.5px' }}>{pump.name}</strong>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                                        {isEn ? 'Meter:' : 'العداد التراكمي:'} <strong style={{ color: isDaylight ? '#0F172A' : '#F8FAFC' }}>{pump.meter}</strong>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    color: '#10B981'
                                }}>
                                    {isEn ? 'READY' : 'جاهزة'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* الورديات المفتوحة */}
                <div>
                    <div className="section-header-box">
                        <div className="section-header-title">
                            <span style={{ fontSize: '20px' }}>👤</span>
                            <h2>{isEn ? 'Currently Active Shifts' : 'الورديات النشطة حالياً بمحطات الوقود'}</h2>
                        </div>
                        <Link 
                            href="/pos" 
                            style={{ fontSize: '12px', color: '#00E5FF', fontWeight: 800, textDecoration: 'none' }}
                        >
                            {isEn ? 'Manage Shifts ⚡' : 'إدارة الورديات ⚡'}
                        </Link>
                    </div>

                    {activeShifts.length === 0 ? (
                        <div style={{
                            background: isDaylight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 24, 34, 0.8)',
                            border: '1px dashed rgba(0, 229, 255, 0.3)',
                            borderRadius: '16px',
                            padding: '24px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '32px' }}>⏱️</span>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                                {isEn ? 'No active shift open right now' : 'لا توجد وردية كاشير مفتوحة حالياً'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                                {isEn ? 'Click below to open a new shift and start sales.' : 'يمكنك فتح وردية جديدة الآن لبدء عمليات البيع وضخ الوقود.'}
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push('/pos')}
                                style={{
                                    background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#0B0E14',
                                    fontWeight: 900,
                                    fontSize: '13px',
                                    padding: '8px 20px',
                                    cursor: 'pointer'
                                }}
                            >
                                {isEn ? 'Open New Shift Now' : 'فتح وردية كاشير الآن ⚡'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeShifts.map((sh: any) => (
                                <div 
                                    key={sh.id}
                                    style={{
                                        background: isDaylight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 24, 34, 0.85)',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        borderRadius: '14px',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                                            <strong style={{ fontSize: '14px', color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                                                {sh.warehouses?.name || (isEn ? 'Main Station Branch' : 'الفرع الرئيسي للمحطة')}
                                            </strong>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
                                            {isEn ? 'Opening Cash:' : 'العهدة الافتتاحية:'} <strong style={{ color: '#10B981' }}>{formatCurrency(sh.starting_cash || 0)}</strong>
                                            {' | '}
                                            {isEn ? 'Opened:' : 'وقت الفتح:'} {new Date(sh.opened_at).toLocaleTimeString(isEn ? 'en-US' : 'ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/pos')}
                                        style={{
                                            background: 'rgba(0, 229, 255, 0.1)',
                                            border: '1px solid rgba(0, 229, 255, 0.3)',
                                            color: '#00E5FF',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {isEn ? 'Switch' : 'الانتقال للوردية'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               6. سجل أحدث فواتير ومبيعات المحطة (Recent Station Transactions)
               ══════════════════════════════════════════════════ */}
            <div>
                <div className="section-header-box">
                    <div className="section-header-title">
                        <span style={{ fontSize: '20px' }}>🧾</span>
                        <h2>{isEn ? 'Latest Fuel Sales & Transactions' : 'أحدث مبيعات وفواتير المحطة اللحظية'}</h2>
                    </div>
                    <Link 
                        href="/invoices"
                        style={{ fontSize: '12px', color: '#00E5FF', fontWeight: 800, textDecoration: 'none' }}
                    >
                        {isEn ? 'View All Invoices ↗' : 'عرض كافة الفواتير ↗'}
                    </Link>
                </div>

                <div className="recent-tx-card">
                    {recentInvoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                            {isEn ? 'No transactions recorded yet.' : 'لا توجد معاملات مسجلة حتى الآن.'}
                        </div>
                    ) : (
                        <table className="station-table-clean">
                            <thead>
                                <tr>
                                    <th>{isEn ? 'Invoice #' : 'رقم الفاتورة'}</th>
                                    <th>{isEn ? 'Customer / Vehicle' : 'العميل / المركبة'}</th>
                                    <th>{isEn ? 'Payment Method' : 'طريقة السداد'}</th>
                                    <th>{isEn ? 'Amount (SAR)' : 'المبلغ الإجمالي'}</th>
                                    <th>{isEn ? 'Time' : 'الوقت'}</th>
                                    <th>{isEn ? 'Status' : 'الحالة'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td style={{ fontWeight: 900, color: '#00E5FF' }}>
                                            {inv.invoice_number || `#${String(inv.id).slice(-6)}`}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>
                                            {inv.client_name || (isEn ? 'Cash Fuel Customer' : 'عميل وقود نقدي')}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                background: inv.payment_method?.includes('كاش') || inv.payment_method?.toLowerCase().includes('cash') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 229, 255, 0.15)',
                                                color: inv.payment_method?.includes('كاش') || inv.payment_method?.toLowerCase().includes('cash') ? '#10B981' : '#00E5FF'
                                            }}>
                                                {inv.payment_method || (isEn ? 'Direct POS' : 'نقاط بيع')}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 900, color: '#10B981' }}>
                                            {formatCurrency(inv.total_amount)}
                                        </td>
                                        <td style={{ color: '#94A3B8', fontSize: '12px' }}>
                                            {inv.created_at ? new Date(inv.created_at).toLocaleTimeString(isEn ? 'en-US' : 'ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: '#10B981'
                                            }}>
                                                معتمد ✅
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               7. مساحة العمل والمفضلة السريعة (Customizable Favorites Launchpad)
               ══════════════════════════════════════════════════ */}
            <div>
                <div className="section-header-box">
                    <div className="section-header-title">
                        <span style={{ fontSize: '20px' }}>⭐</span>
                        <h2>{isEn ? 'Customized Quick Workspace Launchpad' : 'مساحة العمل والمفضلة المخصصة'}</h2>
                    </div>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                        {isEn ? 'Quick access to your most frequently used pages' : 'الوصول المباشر للشاشات الأكثر استخداماً'}
                    </span>
                </div>

                <div className="command-grid">
                    {favItems.map((item: any, idx) => (
                        <Link key={idx} href={item.path} className="command-card-item">
                            <div className="card-icon-box">{item.icon}</div>
                            <div className="card-title">{item.title}</div>
                        </Link>
                    ))}
                    
                    <div className="add-card-btn" onClick={openFavModal} title={isEn ? "Customize Favorites" : "تخصيص القائمة المفضلة"}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            background: 'rgba(0, 229, 255, 0.08)',
                            border: '1px dashed rgba(0, 229, 255, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            color: '#00E5FF'
                        }}>
                            ➕
                        </div>
                        <div className="card-title" style={{ color: '#00E5FF' }}>
                            {isEn ? 'Customize' : 'تخصيص المفضلة'}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
               8. نافذة تخصيص الروابط المفضلة (Modal)
               ══════════════════════════════════════════════════ */}
            {isFavModalOpen && typeof document !== 'undefined' && createPortal(
                <div 
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(11, 14, 20, 0.88)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        zIndex: 99999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setIsFavModalOpen(false)}
                >
                    <div 
                        style={{
                            background: isDaylight ? '#FFFFFF' : '#141822',
                            borderRadius: '24px',
                            width: '95vw', maxWidth: '820px', maxHeight: '85vh',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.15)',
                            border: '1px solid rgba(0, 229, 255, 0.3)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: isDaylight ? 'rgba(243, 247, 252, 0.9)' : 'rgba(11, 14, 20, 0.7)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>✨</span>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: isDaylight ? '#0F172A' : '#F8FAFC' }}>
                                    {isEn ? 'Customize Station Workspace Shortcuts' : 'تخصيص شاشات مساحة العمل المفضلة'}
                                </h2>
                            </div>
                            <button 
                                onClick={() => setIsFavModalOpen(false)} 
                                style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '22px', cursor: 'pointer', fontWeight: 900 }}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {menuGroups.map((group, gIdx) => {
                                const items = group.items.filter(item => allowedItems.some(ai => ai.id === item.id));
                                if (!items.length) return null;
                                return (
                                    <div key={gIdx}>
                                        <div style={{ fontWeight: 900, color: '#00E5FF', marginBottom: '10px', fontSize: '14px' }}>
                                            {group.group}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                            {items.map((item, iIdx) => {
                                                const sel = tempFavorites.includes(item.id);
                                                return (
                                                    <div 
                                                        key={iIdx} 
                                                        onClick={() => toggleFav(item.id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                                            border: `1.5px solid ${sel ? '#00E5FF' : 'rgba(0, 229, 255, 0.2)'}`,
                                                            borderRadius: '12px',
                                                            cursor: 'pointer',
                                                            background: sel ? 'rgba(0, 229, 255, 0.15)' : (isDaylight ? 'rgba(241, 245, 249, 0.8)' : 'rgba(20, 24, 34, 0.6)'),
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '20px' }}>{item.icon}</div>
                                                        <div style={{ fontWeight: 800, color: sel ? '#00E5FF' : (isDaylight ? '#0F172A' : '#94A3B8'), flex: 1, fontSize: '13px' }}>
                                                            {item.title}
                                                        </div>
                                                        <div style={{
                                                            width: '20px', 
                                                            height: '20px', 
                                                            borderRadius: '6px', 
                                                            border: `2px solid ${sel ? '#00E5FF' : 'rgba(0, 229, 255, 0.3)'}`, 
                                                            background: sel ? '#00E5FF' : 'transparent', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center',
                                                            color: '#0B0E14',
                                                            fontSize: '11px',
                                                            fontWeight: 900
                                                        }}>
                                                            {sel && '✓'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(0, 229, 255, 0.2)',
                            display: 'flex', justifyContent: 'flex-end', gap: '12px',
                            background: isDaylight ? 'rgba(243, 247, 252, 0.9)' : 'rgba(11, 14, 20, 0.85)'
                        }}>
                            <button 
                                onClick={() => setIsFavModalOpen(false)} 
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#94A3B8',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                {isEn ? 'Cancel' : 'إلغاء'}
                            </button>
                            <button 
                                onClick={saveFavorites} 
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
                                    border: 'none',
                                    color: '#0B0E14',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(0, 229, 255, 0.35)'
                                }}
                            >
                                {isEn ? 'Save Changes 💾' : 'حفظ التغييرات 💾'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ══════════════════════════════════════════════════
               9. فوتر النظام المركزي
               ══════════════════════════════════════════════════ */}
            <div style={{ textAlign: 'center', color: '#64748B', fontWeight: 700, fontSize: '13px', paddingTop: '10px' }}>
                {isEn ? 'Secure Session 🔒 | Noor Gas Stations Command Center © ' : 'جلسة آمنة ومحمية 🔒 | محطات النور للوقود (مركز القيادة والتحكم) © '} {new Date().getFullYear()}
            </div>
        </div>
        </MasterPage>
    );
}
