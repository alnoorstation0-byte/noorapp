"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { THEME } from '@/lib/theme';

interface BarcodeScannerWidgetProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
}

export default function BarcodeScannerWidget({ onScan, placeholder = "امسح الباركود بالكاميرا أو القارئ" }: BarcodeScannerWidgetProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle hardware scanner or manual Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && manualInput.trim()) {
      e.preventDefault();
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
      {/* Input for hardware scanner */}
      <input
        ref={inputRef}
        type="text"
        className="glass-input-field"
        placeholder={placeholder}
        value={manualInput}
        onChange={(e) => setManualInput(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ flex: 1, padding: '12px 15px', fontSize: '14px' }}
        autoFocus
      />
      
      {/* Button to open camera */}
      <button 
        className="glass-button" 
        onClick={(e) => { e.preventDefault(); setIsCameraOpen(true); }}
        style={{ 
          background: THEME.primary, 
          color: 'white', 
          padding: '12px 20px', 
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '46px',
          width: '50px'
        }}
        title="فتح الكاميرا للمسح"
      >
        📷
      </button>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999999,
          background: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '20px', borderRadius: '20px',
            width: '100%', maxWidth: '500px', position: 'relative'
          }}>
            <button 
              onClick={() => setIsCameraOpen(false)}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: THEME.danger, color: 'white', border: 'none',
                borderRadius: '50%', width: '30px', height: '30px',
                cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              ✕
            </button>
            <h3 style={{ textAlign: 'center', color: THEME.primary, marginBottom: '20px' }}>مسح الباركود بالكاميرا</h3>
            <div id="reader" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}
      
      <ScannerInit isCameraOpen={isCameraOpen} onScan={(code) => {
        setIsCameraOpen(false);
        onScan(code);
      }} />
    </div>
  );
}

function ScannerInit({ isCameraOpen, onScan }: { isCameraOpen: boolean, onScan: (code: string) => void }) {
  useEffect(() => {
    if (isCameraOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(
        (decodedText) => {
          scanner.clear();
          onScan(decodedText);
        },
        (error) => { /* ignore */ }
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isCameraOpen, onScan]);
  return null;
}
