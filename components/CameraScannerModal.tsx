"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { THEME } from '@/lib/theme';

export default function CameraScannerModal({ isOpen, onClose, onScan }: { isOpen: boolean, onClose: () => void, onScan: (code: string) => void }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (isOpen && mounted) {
            const scanner = new Html5QrcodeScanner(
                "reader-modal",
                { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: 'environment' } },
                false
            );
            
            scanner.render(
                (decodedText) => {
                    scanner.clear();
                    onScan(decodedText);
                    onClose();
                },
                (error) => { /* ignore */ }
            );

            return () => {
                scanner.clear().catch(console.error);
            };
        }
    }, [isOpen, onScan, onClose, mounted]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999999999,
            background: 'rgba(0,0,0,0.8)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'white', padding: '20px', borderRadius: '20px',
                width: '100%', maxWidth: '500px', position: 'relative'
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '15px', right: '15px',
                        background: THEME.danger, color: 'white', border: 'none',
                        borderRadius: '50%', width: '30px', height: '30px',
                        cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    ✕
                </button>
                <h3 style={{ textAlign: 'center', color: THEME.primary, marginBottom: '20px' }}>مسح الباركود بالكاميرا الخلفية</h3>
                <div id="reader-modal" style={{ width: '100%' }}></div>
            </div>
        </div>,
        document.body
    );
}
