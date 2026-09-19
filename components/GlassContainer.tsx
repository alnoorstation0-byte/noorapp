"use client";
import React from 'react';
import { useThemeMode } from '@/lib/ThemeContext';

export default function GlassContainer({ 
  children, 
  style, 
  className = '' 
}: { 
  children: React.ReactNode; 
  style?: React.CSSProperties; 
  className?: string; 
}) {
  const { isDaylight } = useThemeMode();

  return (
    <div 
      className={`glass-container desert-glass ${className}`}
      style={{
        background: isDaylight
          ? '#FFFFFF'
          : 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)',
        border: isDaylight 
          ? '1px solid #E2E8F0' 
          : '1px solid rgba(0, 229, 255, 0.2)',
        borderRadius: '20px',
        backdropFilter: isDaylight ? 'none' : 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: isDaylight ? 'none' : 'blur(24px)',
        boxShadow: isDaylight 
          ? '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px -4px rgba(15, 23, 42, 0.08)' 
          : '0 8px 30px rgba(0, 0, 0, 0.4)',
        color: isDaylight ? '#0F172A' : '#F8FAFC',
        padding: '20px',
        transition: 'all 0.25s ease',
        ...style
      }}
    >
      {children}
    </div>
  );
}
