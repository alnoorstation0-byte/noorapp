"use client";
import React from 'react';
import { COMPANY_INFO } from '@/lib/zatca_qr';

interface PrintHeaderProps {
    title: string;
    subtitle?: string;
    showDate?: boolean;
}

export default function PrintHeader({ title, subtitle, showDate = true }: PrintHeaderProps) {
    return (
        <div className="print-only" style={{ display: 'none', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #ddd', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Logo & Company Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img 
                        src="/logo.png" 
                        alt={COMPANY_INFO.nameAr} 
                        style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} 
                    />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px', color: '#000' }}>{COMPANY_INFO.nameAr}</h2>
                        <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                            س.ت / موحد: {COMPANY_INFO.crNumber} &nbsp;|&nbsp; الرقم الضريبي: {COMPANY_INFO.vatNumber}
                        </div>
                    </div>
                </div>

                {/* Report Info */}
                <div style={{ textAlign: 'left' }}>
                    <h1 style={{ margin: 0, fontSize: '28px', color: '#000' }}>{title}</h1>
                    {subtitle && <div style={{ fontSize: '16px', color: '#555', marginTop: '4px' }}>{subtitle}</div>}
                    {showDate && (
                        <div style={{ fontSize: '14px', color: '#777', marginTop: '8px' }}>
                            تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
