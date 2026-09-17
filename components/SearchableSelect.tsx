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
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder, disabled = false, style, className }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // تطبيع الحروف العربية للبحث الذكي
  const normalize = (t: string) =>
    String(t || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();

  // تصفية الخيارات حسب البحث
  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : opt.label;
    return normalize(label).includes(normalize(searchTerm));
  });

  const getLabel = (val: string) => {
    const opt = options.find(o => (typeof o === 'string' ? o === val : o.value === val));
    return opt ? (typeof opt === 'string' ? opt : opt.label) : val;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = getLabel(value);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', ...style }} className={className}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          disabled={disabled}
          className="glass-input-field"
          style={{
            paddingLeft: value ? '50px' : '30px',
            textOverflow: 'ellipsis',
            color: '#F8FAFC',
            fontWeight: 800,
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          placeholder={isOpen ? (currentLabel || placeholder || 'ابحث أو اختر...') : placeholder}
          value={isOpen ? searchTerm : (currentLabel || '')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchTerm('');
            }
          }}
        />

        {/* Clear Button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setSearchTerm('');
              setIsOpen(false);
            }}
            style={{
              position: 'absolute',
              left: '26px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              fontSize: '12px',
              lineHeight: 1
            }}
            title="مسح الاختيار"
          >
            ✕
          </button>
        )}

        {/* Dropdown Indicator Icon */}
        <div 
          style={{ 
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', 
            pointerEvents: 'none', color: '#00E5FF', transition: '0.2s', fontSize: '10px',
            rotate: isOpen ? '180deg' : '0deg'
          }}
        >
          ▼
        </div>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '5px',
          background: 'rgba(20, 24, 34, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '12px',
          boxShadow: '0 12px 35px rgba(0,0,0,0.5)',
          maxHeight: '220px',
          overflowY: 'auto',
          zIndex: 999999,
          direction: 'rtl'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = optValue === value;
              return (
                <div
                  key={index}
                  onClick={() => {
                    onChange(optValue);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 900 : 700,
                    fontSize: '13px',
                    color: isSelected ? '#00E5FF' : '#F8FAFC',
                    background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                    borderBottom: index < filteredOptions.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {optLabel}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '14px', color: '#94a3b8', fontSize: '12px', textAlign: 'center', fontWeight: 700 }}>
              🔍 لا توجد نتائج مطابقة...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
