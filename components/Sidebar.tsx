"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { THEME } from '@/lib/theme';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

    const menuItems = [
    { name: 'لوحة القيادة', icon: '🏠', path: '/Dashboard' },
    { name: 'رحلات التشغيل', icon: '🚚', path: '/fleet_operations' },
    { name: 'الفواتير والمبيعات', icon: '🧾', path: '/invoices' },
    { name: 'المخزون', icon: '📦', path: '/inventory' },
    { name: 'سندات القبض والصرف', icon: '💵', path: '/ReceiptVouchers' },
    { name: 'التقارير المحاسبية', icon: '📊', path: '/journal' }
  ];

  return (
    <div style={{
      width: isCollapsed ? '80px' : '260px',
      height: '100vh',
      background: THEME.primary, // Deep Ocean
      color: 'white',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      right: 0,
      top: 0,
      zIndex: 1000,
      boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
      direction: 'rtl'
    }}>
      {/* اللوجو وزر التصغير */}
      <div style={{ padding: '25px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {!isCollapsed && <span style={{ fontWeight: 900, fontSize: '20px', color: THEME.warning }}>غيام - النظام الموحد</span>}
        <button onClick={() => setIsCollapsed(!isCollapsed)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>

      {/* الروابط */}
      <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '12px 15px',
              borderRadius: '12px',
              textDecoration: 'none',
              color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? THEME.accent : 'transparent',
              fontWeight: isActive ? 900 : 600,
              transition: '0.2s',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* فوتر السايد بار */}
      {!isCollapsed && (
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', fontSize: '12px', textAlign: 'center', color: '#475569' }}>
          نسخة v2.0.1 🚀
        </div>
      )}
    </div>
  );
}
