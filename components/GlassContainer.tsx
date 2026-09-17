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
          ? 'linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.55) 100%)'
          : 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)',
        border: isDaylight 
          ? '1px solid rgba(194, 155, 98, 0.3)' 
          : '1px solid rgba(0, 229, 255, 0.2)',
        borderRadius: '20px',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: isDaylight 
          ? '0 4px 6px rgba(44, 26, 18, 0.08)' 
          : '0 8px 30px rgba(0, 0, 0, 0.4)',
        color: isDaylight ? '#2C1A12' : '#F8FAFC',
        padding: '20px',
        transition: 'all 0.25s ease',
        ...style
      }}
    >
      {children}
    </div>
  );
}
