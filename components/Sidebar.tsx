"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { THEME } from '@/lib/theme';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: 'مركز القيادة والتحكم', icon: '⚡', path: '/Dashboard' },
    { name: 'شاشة الكاشير (POS)', icon: '⛽', path: '/pos' },
    { name: 'إغلاق الورديات والعدادات', icon: '⏱️', path: '/pos-settlements' },
    { name: 'فواتير ومبيعات الوقود', icon: '🧾', path: '/invoices' },
    { name: 'خزانات الوقود والمستودع', icon: '🛢️', path: '/inventory' },
    { name: 'سندات القبض والصرف', icon: '💵', path: '/ReceiptVouchers' },
    { name: 'التقارير المحاسبية والميزان', icon: '📊', path: '/journal' }
  ];

  return (
    <div style={{
      width: isCollapsed ? '80px' : '270px',
      height: '100vh',
      background: 'linear-gradient(180deg, #0F1218 0%, #080A0E 100%)',
      color: '#F8FAFC',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      right: 0,
      top: 0,
      zIndex: 1000,
      borderLeft: '1px solid rgba(0, 229, 255, 0.15)',
      boxShadow: '-6px 0 30px rgba(0, 0, 0, 0.65)',
      direction: 'rtl'
    }}>
      {/* اللوجو وزر التصغير */}
      <div style={{ 
        padding: isCollapsed ? '20px 10px' : '20px 16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid rgba(0, 229, 255, 0.12)',
        background: 'rgba(15, 18, 24, 0.6)'
      }}>
        {!isCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(11, 14, 20, 0.85)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              boxShadow: '0 0 15px rgba(0, 229, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <img src="/logo.png" alt="Noor Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 900, fontSize: '15px', color: '#F8FAFC', letterSpacing: '-0.3px' }}>
                محطات النور <span style={{ color: '#00E5FF' }}>للوقود</span>
              </span>
              <span style={{ fontSize: '10.5px', color: '#E06D44', fontWeight: 700 }}>
                مركز القيادة الموحد
              </span>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Noor Logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </div>
        )}

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          style={{ 
            background: 'rgba(0, 229, 255, 0.08)', 
            border: '1px solid rgba(0, 229, 255, 0.25)', 
            borderRadius: '8px', 
            color: '#00E5FF', 
            cursor: 'pointer', 
            fontSize: '13px', 
            padding: '6px 8px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {/* الروابط */}
      <nav style={{ flex: 1, padding: '18px 10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              textDecoration: 'none',
              color: isActive ? '#FFFFFF' : '#94A3B8',
              background: isActive 
                ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.16) 0%, rgba(0, 140, 200, 0.08) 100%)' 
                : 'transparent',
              borderRight: isActive ? '3.5px solid #00E5FF' : '3.5px solid transparent',
              border: isActive ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid transparent',
              fontWeight: isActive ? 900 : 600,
              fontSize: '13px',
              boxShadow: isActive ? '0 0 15px rgba(0, 229, 255, 0.2), inset 0 0 10px rgba(0, 229, 255, 0.05)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              <span style={{ 
                fontSize: '18px',
                filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.6))' : 'none'
              }}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span style={{ 
                  color: isActive ? '#00E5FF' : '#94A3B8',
                  textShadow: isActive ? '0 0 10px rgba(0, 229, 255, 0.4)' : 'none'
                }}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* فوتر السايد بار */}
      {!isCollapsed && (
        <div style={{ 
          padding: '14px 16px', 
          background: 'rgba(7, 9, 13, 0.85)', 
          fontSize: '11.5px', 
          textAlign: 'center', 
          color: '#64748B', 
          borderTop: '1px solid rgba(0, 229, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ color: '#00E5FF', fontWeight: 800 }}>⚡ نور OS v3.0</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981', fontWeight: 700 }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>
            متصل
          </span>
        </div>
      )}
    </div>
  );
}
