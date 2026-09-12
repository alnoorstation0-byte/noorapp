"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import AquaModalWrapper from '@/components/AquaModalWrapper';
import SearchableSelect from './SearchableSelect';
import { THEME } from '@/lib/theme';

function BarcodeScannerModal({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    let stopped = false;
    let isRunning = false;
    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('bc-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 120 } },
          (text: string) => {
            if (!stopped) {
              stopped = true;
              isRunning = false;
              scanner.stop().catch(() => {});
              onDetected(text);
            }
          },
          () => {}
        );
        isRunning = true;
        setScanning(true);
      } catch {
        setError('ERROR');
      }
    };
    start();
    return () => {
      stopped = true;
      if (scannerRef.current && isRunning) {
        scannerRef.current.stop().catch(() => {});
        isRunning = false;
      }
    };
  }, [onDetected]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,0.88)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px' }}>
      <div style={{ color:'white', fontWeight:900, fontSize:'18px' }}>
        📷 وجّه الكاميرا نحو الباركود
      </div>
      <div style={{ width:'300px', height:'200px', background:'#000', borderRadius:'16px', overflow:'hidden', border:'3px solid #2891C8', boxShadow:'0 0 40px rgba(40,145,200,0.6)' }}>
        <div id="bc-reader" style={{ width:'100%', height:'100%' }} />
      </div>
      {scanning && <div style={{ color:'#7FD4E3', fontSize:'13px', fontWeight:800 }}>🔍 جاري المسح تلقائياً...</div>}
      {error && <div style={{ color:'#ef4444', fontWeight:700 }}>تعذر الوصول للكاميرا - تحقق من الاذن</div>}
      <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.3)', color:'white', borderRadius:'12px', padding:'10px 32px', fontWeight:900, cursor:'pointer' }}>X الغاء</button>
    </div>
  );
}

async function printBarcodeLabel(barcode: string, itemName: string, price?: number) {
  if (!barcode?.trim()) return;
  const win = window.open('', '_blank', 'width=420,height=320');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>ملصق</title>
<style>@page{size:58mm 40mm;margin:1.5mm}*{box-sizing:border-box;margin:0;padding:0}body{width:58mm;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;background:white;padding:2mm;min-height:35mm}.name{font-size:9pt;font-weight:bold;text-align:center;margin-bottom:1.5mm;max-width:54mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.price{font-size:8pt;color:#1C73AB;font-weight:bold;margin-top:1.5mm}svg{max-width:54mm}</style>
</head><body>
<div class="name">${itemName || 'صنف'}</div>
<svg id="bc"></svg>
${price ? `<div class="price">السعر: ${price} ر.س</div>` : ''}
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script>window.onload=function(){try{JsBarcode('#bc','${barcode}',{format:'CODE128',width:2,height:55,displayValue:true,fontSize:13,margin:4});}catch(e){JsBarcode('#bc','${barcode}',{format:'auto',width:2,height:55,displayValue:true,fontSize:13,margin:4});}setTimeout(function(){window.print();window.close();},500);};<\/script>
</body></html>`);
  win.document.close();
}

export default function InventoryItemModal({ isOpen, onClose, currentRecord, setCurrentRecord, handleSave, isSaving }: any) {
  const [mounted, setMounted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  useEffect(() => setMounted(true), []);
  const handleBarcodeDetected = useCallback((code: string) => {
    setCurrentRecord((prev: any) => ({ ...prev, code }));
    setShowScanner(false);
  }, [setCurrentRecord]);
  if (!mounted || !isOpen) return null;
  const hasBarcode = !!(currentRecord.code?.trim());
  return (
    <>
      {showScanner && <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
      <AquaModalWrapper isOpen={isOpen} onClose={onClose}
        title={currentRecord.id ? 'تعديل بيانات صنف' : 'إضافة صنف جديد للدليل'}
        icon={currentRecord.id ? '✏️' : '📦'} width="700px">
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'15px' }}>
            <div>
              <label style={{ fontSize:'13px', fontWeight:900, color:THEME.primary, marginBottom:'8px', display:'block' }}>
                🏷️ كود الصنف / الباركود
              </label>
              <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                <input type="text" className="glass-input-field"
                  placeholder="ادخل او امسح الباركود..."
                  value={currentRecord.code || ''}
                  onChange={e => setCurrentRecord({ ...currentRecord, code: e.target.value })}
                  style={{ flex:1, fontFamily:'monospace', letterSpacing:'1px' }}
                />
                <button type="button" onClick={() => setShowScanner(true)} title="مسح الباركود بالكاميرا"
                  style={{ width:'40px', height:'40px', flexShrink:0, background:'linear-gradient(135deg,#2891C8,#7FD4E3)', border:'none', borderRadius:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', boxShadow:'0 4px 12px rgba(40,145,200,0.35)', transition:'transform 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
                  📷
                </button>
                <button type="button"
                  onClick={() => printBarcodeLabel(currentRecord.code, currentRecord.name, currentRecord.suggested_price)}
                  disabled={!hasBarcode} title={hasBarcode ? 'طباعة ملصق الباركود' : 'ادخل كود اولا'}
                  style={{ width:'40px', height:'40px', flexShrink:0, background: hasBarcode ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'rgba(148,163,184,0.25)', border:'none', borderRadius:'10px', cursor: hasBarcode ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', opacity: hasBarcode ? 1 : 0.45, transition:'transform 0.15s' }}
                  onMouseEnter={e=>hasBarcode&&(e.currentTarget.style.transform='translateY(-2px)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
                  🖨️
                </button>
              </div>
              {hasBarcode && (
                <div style={{ marginTop:'6px', padding:'3px 8px', background:'rgba(40,145,200,0.08)', borderRadius:'6px', fontSize:'10px', color:'#475569', fontFamily:'monospace', display:'flex', alignItems:'center', gap:'4px' }}>
                  <span>✅</span><span style={{ fontWeight:700 }}>{currentRecord.code}</span>
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize:'13px', fontWeight:900, color:THEME.primary, marginBottom:'8px', display:'block' }}>اسم الصنف / الخامة</label>
              <input type="text" className="glass-input-field" placeholder="مثال: مياه شرب 330 مل"
                value={currentRecord.name || ''} onChange={e => setCurrentRecord({ ...currentRecord, name: e.target.value })} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'15px' }}>
            <div>
              <label style={{ fontSize:'13px', fontWeight:900, color:THEME.primary, marginBottom:'8px', display:'block' }}>وحدة القياس</label>
              <SearchableSelect options={['كرتون','ربطة','حبة','شوال','صندوق','كجم','لتر','جالون']}
                value={currentRecord.unit || ''} onChange={(val:string) => setCurrentRecord({ ...currentRecord, unit:val })} placeholder="اختر وحدة القياس..." />
            </div>
            <div>
              <label style={{ fontSize:'13px', fontWeight:900, color:THEME.primary, marginBottom:'8px', display:'block' }}>سعر البيع المقترح</label>
              <input type="number" className="glass-input-field" placeholder="0"
                value={currentRecord.suggested_price || ''} onChange={e => setCurrentRecord({ ...currentRecord, suggested_price: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize:'13px', fontWeight:900, color:THEME.primary, marginBottom:'8px', display:'block' }}>حد اعادة الطلب</label>
              <input type="number" className="glass-input-field" placeholder="5"
                value={currentRecord.reorder_level || ''} onChange={e => setCurrentRecord({ ...currentRecord, reorder_level: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:'13px', fontWeight:900, color:THEME.primary, marginBottom:'8px', display:'block' }}>الرصيد الافتتاحي (اختياري)</label>
            <input type="number" className="glass-input-field" placeholder="0"
              value={currentRecord.current_quantity || ''} onChange={e => setCurrentRecord({ ...currentRecord, current_quantity: Number(e.target.value) })} />
          </div>

          {/* 🔄 عهدة فوارغ المياه */}
          <div 
            onClick={() => setCurrentRecord({ ...currentRecord, is_returnable_bottle: !currentRecord.is_returnable_bottle })}
            style={{
              background: currentRecord.is_returnable_bottle 
                ? 'linear-gradient(135deg, rgba(40, 145, 200, 0.15) 0%, rgba(127, 212, 227, 0.25) 100%)' 
                : 'rgba(241, 245, 249, 0.7)',
              border: currentRecord.is_returnable_bottle 
                ? '1.5px solid #2891C8' 
                : '1px solid rgba(203, 213, 225, 0.7)',
              borderRadius: '16px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: currentRecord.is_returnable_bottle ? '0 4px 15px rgba(40, 145, 200, 0.15)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: currentRecord.is_returnable_bottle ? 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)' : '#e2e8f0',
                color: currentRecord.is_returnable_bottle ? 'white' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                boxShadow: currentRecord.is_returnable_bottle ? '0 3px 10px rgba(28, 115, 171, 0.3)' : 'none'
              }}>
                🔄
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: currentRecord.is_returnable_bottle ? '#1C73AB' : '#1e293b' }}>
                  صنف خاضع لعهدة فوارغ المياه (جالون / عبوة مسترجعة)
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                  عند التفعيل، تنزل كميات الصنف تلقائياً كـ &quot;عهدة فوارغ&quot; عند البيع في شاشة الكاشير والورديات
                </div>
              </div>
            </div>
            <div style={{
              width: '26px', height: '26px', borderRadius: '8px',
              border: currentRecord.is_returnable_bottle ? '2px solid #2891C8' : '2px solid #94a3b8',
              background: currentRecord.is_returnable_bottle ? '#2891C8' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: '15px',
              transition: '0.2s'
            }}>
              {currentRecord.is_returnable_bottle ? '✓' : ''}
            </div>
          </div>

          <div>
            <label style={{ fontSize:'13px', fontWeight:900, color:THEME.primary, marginBottom:'8px', display:'block' }}>ملاحظات فنية ومواصفات</label>
            <textarea className="glass-input-field" rows={2} placeholder="اي مواصفات فنية خاصة بالخامة..."
              value={currentRecord.notes || ''} onChange={e => setCurrentRecord({ ...currentRecord, notes: e.target.value })} style={{ resize:'vertical' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:'12px', marginTop:'35px' }}>
          <button onClick={handleSave} disabled={isSaving} className="btn-glass-save" style={{ flex:2 }}>
            {isSaving ? 'جاري الحفظ...' : 'حفظ الصنف'}
          </button>
          {hasBarcode && (
            <button onClick={() => printBarcodeLabel(currentRecord.code, currentRecord.name, currentRecord.suggested_price)}
              className="btn-main-glass white" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
              🖨️ طباعة ملصق
            </button>
          )}
          <button onClick={onClose} className="btn-glass-cancel" style={{ flex:1 }}>إلغاء</button>
        </div>
      </AquaModalWrapper>
    </>
  );
}