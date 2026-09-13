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
    { name: 'المخزون والبيطرة', icon: '📦', path: '/inventory' },
    { name: 'سندات القبض والصرف', icon: '💵', path: '/ReceiptVouchers' },
    { name: 'التقارير المحاسبية', icon: '📊', path: '/journal' }
  ];

  return (
    <div style={{
      width: isCollapsed ? '80px' : '260px',
      height: '100vh',
      background: 'linear-gradient(180deg, #2C1A12 0%, #1A0F0A 100%)',
      color: '#FDFBF7',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      right: 0,
      top: 0,
      zIndex: 1000,
      borderLeft: '1px solid rgba(194, 155, 98, 0.25)',
      boxShadow: '-6px 0 20px rgba(44, 26, 18, 0.25)',
      direction: 'rtl'
    }}>
      {/* اللوجو وزر التصغير */}
      <div style={{ 
        padding: '22px 18px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid rgba(194, 155, 98, 0.2)' 
      }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/taj_logo.png" alt="تاج المودة" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #C29B62' }} />
            <span style={{ fontWeight: 900, fontSize: '17px', color: '#C29B62', letterSpacing: '-0.3px' }}>
              صيدلية تاج المودة
            </span>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          style={{ background: 'rgba(194, 155, 98, 0.15)', border: '1px solid rgba(194, 155, 98, 0.3)', borderRadius: '8px', color: '#C29B62', cursor: 'pointer', fontSize: '16px', padding: '6px' }}
        >
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>

      {/* الروابط */}
      <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              borderRadius: '12px',
              textDecoration: 'none',
              color: isActive ? '#FFFFFF' : 'rgba(253, 251, 247, 0.75)',
              background: isActive 
                ? 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)' 
                : 'transparent',
              fontWeight: isActive ? 900 : 600,
              fontSize: '14px',
              boxShadow: isActive ? '0 4px 12px rgba(168, 87, 60, 0.35)' : 'none',
              transition: 'all 0.2s ease',
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
        <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', fontSize: '12px', textAlign: 'center', color: 'rgba(253, 251, 247, 0.5)', borderTop: '1px solid rgba(194, 155, 98, 0.15)' }}>
          صيدلية تاج المودة البيطرية v2.5 🐎
        </div>
      )}
    </div>
  );
}
