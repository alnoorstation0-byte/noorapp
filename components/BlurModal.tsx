"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME } from '@/lib/theme';

interface BlurModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BlurModal({ isOpen, onClose, title, children }: BlurModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || (!mounted && typeof document === 'undefined')) return null;

  const content = (
    <div 
      className="blur-modal-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        zIndex: 999999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        isolation: 'isolate',
        pointerEvents: 'auto',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(11, 14, 20, 0.85)',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      {/* 🎬 جسم المودال السينمائي */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          ...THEME.cinematicGlass,
          width: '100%', maxWidth: '550px',
          maxHeight: '90vh', overflowY: 'auto',
          position: 'relative', padding: '30px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          borderRadius: '24px'
        }}
      >
        {/* العلوية (الهيدر) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '20px', fontWeight: 900 }}>{title}</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%' }}
          >
            ✕
          </button>
        </div>

        {/* محتوى الفورم */}
        {children}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
