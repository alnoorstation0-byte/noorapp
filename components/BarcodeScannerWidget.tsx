"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { THEME } from '@/lib/theme';

interface BarcodeScannerWidgetProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
}

// 🔊 High-pitch POS feedback confirmation beep using Web Audio API
export const playPosBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Authentic POS high tone (1760Hz - A6) with fast decay
    osc.frequency.setValueAtTime(1760, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {
    // AudioContext blocked or not supported - safe to ignore
  }
};

// 📳 Haptic vibration feedback for mobile devices
export const triggerHaptic = (duration = 80) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([duration]);
    } catch (e) {}
  }
};

export default function BarcodeScannerWidget({ 
  onScan, 
  placeholder = "امسح الباركود بالكاميرا أو القارئ" 
}: BarcodeScannerWidgetProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle hardware handheld barcode scanner or manual Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && manualInput.trim()) {
      e.preventDefault();
      const code = manualInput.trim();
      playPosBeep();
      onScan(code);
      setManualInput('');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', position: 'relative' }}>
      {/* Input for hardware USB/Bluetooth barcode scanner & manual typing */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="glass-input-field"
          placeholder={placeholder}
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '11px 40px 11px 16px',
            fontSize: '13px',
            borderRadius: '12px',
            border: '1.5px solid rgba(28, 115, 171, 0.25)',
            background: 'rgba(255, 255, 255, 0.85)',
            color: '#122946',
            fontWeight: 700,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.2s ease'
          }}
          autoFocus
        />
        <span style={{ position: 'absolute', right: '12px', fontSize: '18px', opacity: 0.6, pointerEvents: 'none' }}>
          🏷️
        </span>
        {manualInput && (
          <button
            type="button"
            onClick={() => {
              const code = manualInput.trim();
              if (code) {
                playPosBeep();
                onScan(code);
                setManualInput('');
              }
            }}
            style={{
              position: 'absolute',
              left: '8px',
              padding: '4px 10px',
              borderRadius: '8px',
              border: 'none',
              background: '#1C73AB',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            إدخال ↵
          </button>
        )}
      </div>
      
      {/* Button to open professional camera scanner */}
      <button 
        type="button"
        onClick={(e) => { 
          e.preventDefault(); 
          setIsCameraOpen(true); 
        }}
        style={{ 
          background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)', 
          color: 'white', 
          padding: '0 16px', 
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '42px',
          minWidth: '46px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(28, 115, 171, 0.25)',
          transition: 'all 0.2s ease',
          fontSize: '13px',
          fontWeight: 800,
          whiteSpace: 'nowrap'
        }}
        title="فتح كاميرا قارئ الباركود الاحترافية"
      >
        <span style={{ fontSize: '18px' }}>📷</span>
        <span style={{ display: 'none' }}>مسح</span>
      </button>

      {/* Professional Camera Modal */}
      {isCameraOpen && (
        <ProfessionalBarcodeModal 
          onDetected={(code) => {
            setIsCameraOpen(false);
            onScan(code);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}

export interface BarcodeCameraButtonProps {
  onScan: (barcode: string) => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

// 📸 Reusable standalone Camera Barcode button (styled exactly like the POS Cashier button)
export function BarcodeCameraButton({
  onScan,
  title = "مسح الباركود بالكاميرا",
  size = 'md',
  label,
  className,
  style
}: BarcodeCameraButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeStyles = {
    sm: { height: '36px', minWidth: '36px', padding: label ? '0 10px' : '0 8px', fontSize: '12px' },
    md: { height: '42px', minWidth: '44px', padding: label ? '0 14px' : '0 12px', fontSize: '13px' },
    lg: { height: '48px', minWidth: '48px', padding: label ? '0 18px' : '0 14px', fontSize: '14px' },
  }[size];

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={className}
        title={title}
        style={{
          background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
          color: 'white',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(28, 115, 171, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontWeight: 800,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          ...sizeStyles,
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(28, 115, 171, 0.38)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(28, 115, 171, 0.25)';
        }}
      >
        <span style={{ fontSize: size === 'sm' ? '15px' : '18px' }}>📷</span>
        {label && <span>{label}</span>}
      </button>

      {isOpen && (
        <ProfessionalBarcodeModal
          onDetected={(code) => {
            setIsOpen(false);
            onScan(code);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

// 🎯 Fullscreen Professional Camera Scanner Modal
export function ProfessionalBarcodeModal({ 
  onDetected, 
  onClose 
}: { 
  onDetected: (code: string) => void; 
  onClose: () => void; 
}) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const html5QrCodeRef = useRef<any>(null);
  const scannerContainerId = "professional-barcode-viewport";
  const isStoppedRef = useRef<boolean>(false);

  // Initialize and start camera
  const startCamera = useCallback(async (cameraIdOrFacing: any) => {
    try {
      setIsInitializing(true);
      setCameraError(null);

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      
      // If an existing instance is active, stop it cleanly
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          // Ignore
        }
      }

      // Check camera devices
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
        }
      } catch (devErr) {
        console.warn("Could not list cameras:", devErr);
      }

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });

      html5QrCodeRef.current = scanner;
      isStoppedRef.current = false;

      // Config specifically calibrated for retail water bottles & cartons (wide 1D linear barcode)
      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Responsive reticle: wide rectangle for 1D barcodes
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxWidth = Math.floor(minEdge * 0.85);
          const boxHeight = Math.floor(boxWidth * 0.55); // 1D barcode aspect ratio
          return { width: boxWidth, height: boxHeight };
        },
        aspectRatio: 1.333334,
        videoConstraints: typeof cameraIdOrFacing === 'string' 
          ? { deviceId: { exact: cameraIdOrFacing } }
          : { facingMode: 'environment', focusMode: 'continuous' }
      };

      await scanner.start(
        cameraIdOrFacing || { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          if (!isStoppedRef.current) {
            isStoppedRef.current = true;
            playPosBeep();
            triggerHaptic(80);
            scanner.stop()
              .then(() => scanner.clear())
              .catch(() => {})
              .finally(() => {
                onDetected(decodedText);
              });
          }
        },
        () => {
          // Frame decode miss - normal loop, silent
        }
      );

      setIsInitializing(false);

      // Check if torch/flashlight is supported
      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (tErr) {
        setHasTorch(false);
      }

    } catch (err: any) {
      console.error("Barcode camera startup error:", err);
      setIsInitializing(false);
      const msg = String(err?.message || err || '');
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowedError')) {
        setCameraError('يرجى السماح بصلاحية الوصول للكاميرا في إعدادات المتصفح لمسح الباركود.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
        setCameraError('لم يتم العثور على كاميرا متصلة بهذا الجهاز.');
      } else if (msg.includes('NotReadableError') || msg.includes('TrackStartError')) {
        setCameraError('الكاميرا قيد الاستخدام بواسطة تطبيق آخر. يرجى إغلاقه والمحاولة مجدداً.');
      } else {
        setCameraError('تعذر تشغيل الكاميرا. تأكد من استخدام اتصال آمن (HTTPS/Localhost).');
      }
    }
  }, [onDetected]);

  // Start on mount
  useEffect(() => {
    startCamera({ facingMode: 'environment' });

    return () => {
      isStoppedRef.current = true;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop()
            .then(() => html5QrCodeRef.current.clear())
            .catch(() => {});
        } catch (e) {}
      }
    };
  }, [startCamera]);

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn("Failed to toggle torch:", e);
    }
  };

  // Switch camera if multiple cameras exist
  const handleSwitchCamera = () => {
    if (availableCameras.length < 2) return;
    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCam = availableCameras[nextIndex];
    setSelectedCameraId(nextCam.id);
    startCamera(nextCam.id);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999999,
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      direction: 'rtl',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes laserSweep {
          0% { top: 12%; opacity: 0.9; }
          50% { top: 86%; opacity: 0.95; }
          100% { top: 12%; opacity: 0.9; }
        }
        @keyframes reticleGlow {
          0% { box-shadow: 0 0 15px rgba(40, 145, 200, 0.4); }
          50% { box-shadow: 0 0 30px rgba(40, 145, 200, 0.8), inset 0 0 15px rgba(40, 145, 200, 0.2); }
          100% { box-shadow: 0 0 15px rgba(40, 145, 200, 0.4); }
        }
        #${scannerContainerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 18px !important;
        }
      `}</style>

      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '26px',
        padding: '24px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(28, 115, 171, 0.12)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>📷</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#122946' }}>
                قارئ الباركود الذكي
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                وجّه الكاميرا إلى كود الصنف أو الكرتونة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '16px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Viewport Box */}
        <div style={{
          width: '100%',
          height: '260px',
          background: '#0a101d',
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(40, 145, 200, 0.5)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
        }}>
          {/* HTML5 QR Code Container */}
          <div 
            id={scannerContainerId} 
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          />

          {/* Loading Indicator */}
          {isInitializing && !cameraError && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 16, 29, 0.85)',
              zIndex: 10,
              gap: '10px'
            }}>
              <div style={{ fontSize: '32px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
              <span style={{ color: '#7FD4E3', fontSize: '13px', fontWeight: 800 }}>
                جاري تفعيل الكاميرا وضبط الحساسية...
              </span>
            </div>
          )}

          {/* Error View */}
          {cameraError && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 16, 29, 0.95)',
              zIndex: 15,
              padding: '20px',
              textAlign: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '36px' }}>⚠️</span>
              <p style={{ margin: 0, color: '#fca5a5', fontSize: '12px', fontWeight: 700, lineHeight: 1.5 }}>
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => startCamera({ facingMode: 'environment' })}
                style={{
                  background: '#1C73AB',
                  color: 'white',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🔄 إعادة المحاولة
              </button>
            </div>
          )}

          {/* Laser & Reticle Overlay (Only shown when active) */}
          {!isInitializing && !cameraError && (
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Central Target Reticle */}
              <div style={{
                width: '78%',
                height: '52%',
                border: '2px dashed rgba(127, 212, 227, 0.7)',
                borderRadius: '16px',
                position: 'relative',
                animation: 'reticleGlow 2.5s infinite ease-in-out'
              }}>
                {/* Reticle Corner Brackets */}
                <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '18px', height: '18px', borderTop: '4px solid #2891C8', borderRight: '4px solid #2891C8', borderTopRightRadius: '10px' }} />
                <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '18px', height: '18px', borderTop: '4px solid #2891C8', borderLeft: '4px solid #2891C8', borderTopLeftRadius: '10px' }} />
                <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '18px', height: '18px', borderBottom: '4px solid #2891C8', borderRight: '4px solid #2891C8', borderBottomRightRadius: '10px' }} />
                <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '18px', height: '18px', borderBottom: '4px solid #2891C8', borderLeft: '4px solid #2891C8', borderBottomLeftRadius: '10px' }} />

                {/* Animated Glowing Laser Line */}
                <div style={{
                  position: 'absolute',
                  left: '4%',
                  right: '4%',
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent, #ef4444, #ff3b30, transparent)',
                  boxShadow: '0 0 12px 2px #ef4444',
                  borderRadius: '3px',
                  animation: 'laserSweep 2s infinite ease-in-out'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Toolbar: Flashlight & Switch Camera */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          width: '100%',
          marginTop: '14px'
        }}>
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1.5px solid rgba(28, 115, 171, 0.25)',
                background: torchOn ? '#f59e0b' : 'rgba(28, 115, 171, 0.08)',
                color: torchOn ? '#fff' : '#1C73AB',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{torchOn ? '💡 إطفاء الفلاش' : '🔦 تشغيل الفلاش'}</span>
            </button>
          )}

          {availableCameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1.5px solid rgba(28, 115, 171, 0.25)',
                background: 'rgba(28, 115, 171, 0.08)',
                color: '#1C73AB',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔄 تبديل العدسة</span>
            </button>
          )}
        </div>

        {/* Manual Code Input Fallback */}
        <div style={{
          width: '100%',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px dashed rgba(28, 115, 171, 0.18)',
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            placeholder="أو اكتب الباركود يدوياً هنا..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualCode.trim()) {
                e.preventDefault();
                playPosBeep();
                triggerHaptic(80);
                onDetected(manualCode.trim());
              }
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(28, 115, 171, 0.25)',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              background: '#f8fafc'
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (manualCode.trim()) {
                playPosBeep();
                triggerHaptic(80);
                onDetected(manualCode.trim());
              }
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              background: '#1C73AB',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            تأكيد ✓
          </button>
        </div>
      </div>
    </div>
  );
}
