import React from 'react';
import { THEME } from '@/lib/theme';

// 🚀 السر كله في السطر ده: ضفنا style?: React.CSSProperties
export default function GlassContainer({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)',
      border: '1px solid rgba(0, 229, 255, 0.2)',
      borderRadius: '20px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
      color: '#F8FAFC',
      padding: '20px',
      ...style
    }}>
      {children}
    </div>
  );
}
