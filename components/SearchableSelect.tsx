"use client";
import React, { useState, useRef, useEffect } from 'react';
import { THEME } from '@/lib/theme';

interface SelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: (string | SelectOption)[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getLabel = (val: string) => {
    const opt = options.find(o => (typeof o === 'string' ? o === val : o.value === val));
    return opt ? (typeof opt === 'string' ? opt : opt.label) : val;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="glass-input-field"
        placeholder={placeholder}
        value={isOpen ? searchTerm : getLabel(value)}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onClick={() => {
          setIsOpen(true);
          setSearchTerm('');
        }}
      />
      
      {/* Dropdown Indicator Icon */}
      <div 
        style={{ 
          position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', 
          pointerEvents: 'none', color: '#64748b', transition: '0.3s',
          rotate: isOpen ? '180deg' : '0deg'
        }}
      >
        ▼
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(40, 145, 200, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 9999,
          direction: 'rtl'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <div
                  key={index}
                  onClick={() => {
                    onChange(optValue);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '12px 15px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    color: '#1e293b',
                    borderBottom: index < filteredOptions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(40, 145, 200, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {optLabel}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '12px 15px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
              لا توجد نتائج مطابقة...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
