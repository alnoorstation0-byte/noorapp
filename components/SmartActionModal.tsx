"use client";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SmartActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteData: { id: number; name: string } | null;
}

export default function SmartActionModal({ isOpen, onClose, siteData }: SmartActionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'financial' | 'labor' | 'attachments'>('financial');
  
  // States لحساب التكلفة التلقائية للخامات
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !siteData || (!mounted && typeof document === 'undefined')) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose} className="smart-action-modal-overlay">
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        
        {/* 🔝 الهيدر */}
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>{siteData.name}</h2>
            <small style={{ color: '#eaddca' }}>تسجيل حركة يومية مفصلة</small>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* 📑 شريط التبويبات (Tabs) */}
        <div style={styles.tabsContainer}>
          <button 
            style={{...styles.tab, borderBottom: activeTab === 'financial' ? '3px solid #00E5FF' : 'none', color: activeTab === 'financial' ? '#00E5FF' : '#94A3B8'}}
            onClick={() => setActiveTab('financial')}
          >
            💰 الخامات والماليات
          </button>
          <button 
            style={{...styles.tab, borderBottom: activeTab === 'labor' ? '3px solid #10B981' : 'none', color: activeTab === 'labor' ? '#10B981' : '#94A3B8'}}
            onClick={() => setActiveTab('labor')}
          >
            👷 العمالة والإنتاجية
          </button>
          <button 
            style={{...styles.tab, borderBottom: activeTab === 'attachments' ? '3px solid #38BDF8' : 'none', color: activeTab === 'attachments' ? '#38BDF8' : '#94A3B8'}}
            onClick={() => setActiveTab('attachments')}
          >
            📎 المرفقات والملاحظات
          </button>
        </div>

        {/* 📝 محتوى التبويبات */}
        <div style={styles.body}>
          
          {/* التبويب الأول: الماليات */}
          {activeTab === 'financial' && (
            <div className="animate-fade-in">
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>نوع الحركة</label>
                  <select style={styles.input}>
                    <option>صرف (شراء خامات)</option>
                    <option>تحصيل (دفعة من المالك)</option>
                    <option>سلفة موقع</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>التاريخ</label>
                  <input type="date" style={styles.input} defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div style={styles.sectionBox}>
                <h4 style={styles.secTitle}>تفاصيل البند (آلة حاسبة مدمجة)</h4>
                <div style={styles.row}>
                  <div style={styles.field}>
                    <label style={styles.label}>اسم الصنف / البيان</label>
                    <input type="text" placeholder="مثال: أسمنت بورتلاندي" style={styles.input} />
                  </div>
                </div>
                <div style={{...styles.row, marginTop: '15px'}}>
                  <div style={styles.field}>
                    <label style={styles.label}>الكمية</label>
                    <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={styles.input} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>سعر الوحدة</label>
                    <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} style={styles.input} />
                  </div>
                  <div style={styles.totalBox}>
                    <span style={{fontSize: '11px', color: '#94A3B8'}}>الإجمالي التلقائي</span>
                    <strong style={{fontSize: '18px', color: '#00E5FF'}}>{(qty * unitPrice).toLocaleString()} ر.س</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* التبويب الثاني: العمالة والإنتاجية */}
          {activeTab === 'labor' && (
            <div className="animate-fade-in">
              <div style={{...styles.sectionBox, borderColor: '#27ae60'}}>
                <h4 style={{...styles.secTitle, color: '#27ae60'}}>سحب بيانات التقرير اليومي</h4>
                <div style={styles.row}>
                  <div style={styles.field}>
                    <label style={styles.label}>بند الأعمال المنفذ</label>
                    <select style={styles.input}>
                      <option>محارة واجهات</option>
                      <option>تأسيس سباكة</option>
                      <option>صبة خرسانة</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>حجم الإنجاز (متر/مقطوعية)</label>
                    <input type="number" placeholder="مثال: 150" style={styles.input} />
                  </div>
                </div>
                
                <div style={styles.divider}></div>
                
                <div style={styles.row}>
                  <div style={styles.autoField}>
                    <span style={styles.autoLabel}>إجمالي عمالة اليوم</span>
                    <p style={styles.autoText}><b>18 عامل / فني</b></p>
                  </div>
                  <div style={styles.autoField}>
                    <span style={styles.autoLabel}>تكلفة اليوميات التقديرية</span>
                    <p style={styles.autoText}><b style={{color: '#e74c3c'}}>5,400 ج.م</b></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* التبويب الثالث: المرفقات */}
          {activeTab === 'attachments' && (
            <div className="animate-fade-in">
              <div style={styles.sectionBox}>
                <h4 style={styles.secTitle}>إرفاق مستندات (فواتير/صور موقع)</h4>
                <div style={styles.uploadArea}>
                  <div style={{fontSize: '30px', marginBottom: '10px'}}>📁</div>
                  <p style={{margin: '0 0 10px 0', fontSize: '13px', color: '#666'}}>اضغط هنا لرفع صورة الفاتورة أو المستخلص</p>
                  <input type="file" style={styles.fileInput} />
                </div>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>ملاحظات مدير المشروع</label>
                <textarea placeholder="سجل أي عجز في الخامات أو ملاحظات استلام..." style={styles.textarea}></textarea>
              </div>
            </div>
          )}

        </div>

        {/* 💾 الفوتر وزر الحفظ */}
        <div style={styles.footer}>
          <button style={styles.saveBtn} onClick={() => {
            alert('تم تشفير البيانات وترحيلها بنجاح!');
            onClose();
          }}>
            💾 حفظ واعتماد الحركة
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', inset: 0, top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(11, 14, 20, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999999, isolation: 'isolate', pointerEvents: 'auto', backdropFilter: 'blur(12px)', direction: 'rtl', padding: '15px' },
  card: { backgroundColor: 'rgba(20, 24, 34, 0.98)', width: '100%', maxWidth: '750px', maxHeight: '95vh', borderRadius: '16px', border: '1px solid rgba(0, 229, 255, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' },
  
  header: { padding: '20px 25px', backgroundColor: 'rgba(11, 14, 20, 0.95)', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', color: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: '#94A3B8', fontSize: '24px', cursor: 'pointer' },
  
  tabsContainer: { display: 'flex', backgroundColor: 'rgba(15, 20, 30, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
  tab: { flex: 1, padding: '15px 10px', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: '0.3s' },
  
  body: { padding: '25px', overflowY: 'auto', flex: 1 },
  
  sectionBox: { backgroundColor: 'rgba(11, 14, 20, 0.6)', border: '1px solid rgba(0, 229, 255, 0.15)', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  secTitle: { margin: '0 0 15px 0', fontSize: '15px', color: '#00E5FF', fontWeight: 'bold' },
  
  row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' },
  label: { fontSize: '13px', color: '#94A3B8', fontWeight: 'bold' },
  input: { padding: '12px 15px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.25)', outline: 'none', backgroundColor: 'rgba(11, 14, 20, 0.8)', color: '#F8FAFC', fontSize: '14px' },
  
  totalBox: { flex: 1, minWidth: '150px', backgroundColor: 'rgba(0, 229, 255, 0.08)', border: '1px dashed #00E5FF', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '10px' },
  
  divider: { height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '20px 0' },
  
  autoField: { flex: 1, padding: '15px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' },
  autoLabel: { display: 'inline-block', padding: '4px 10px', background: '#10B981', color: '#0B0E14', borderRadius: '20px', fontSize: '11px', fontWeight: 900, marginBottom: '10px' },
  autoText: { margin: 0, fontSize: '15px', color: '#F8FAFC' },
  
  uploadArea: { border: '2px dashed rgba(0, 229, 255, 0.3)', borderRadius: '10px', padding: '30px', textAlign: 'center', backgroundColor: 'rgba(11, 14, 20, 0.5)', position: 'relative', cursor: 'pointer' },
  fileInput: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  textarea: { width: '100%', height: '100px', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.25)', outline: 'none', resize: 'none', boxSizing: 'border-box', backgroundColor: 'rgba(11, 14, 20, 0.8)', color: '#F8FAFC' },
  
  footer: { padding: '20px 25px', backgroundColor: 'rgba(11, 14, 20, 0.95)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' },
  saveBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)', color: '#0B0E14', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, fontSize: '16px', transition: '0.3s', boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)' }
};
