"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';

interface JournalVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: any[];
  headerId?: string | null;
}

export default function JournalVoucherModal({
  isOpen,
  onClose,
  lines,
  headerId
}: JournalVoucherModalProps) {
  if (!isOpen || !lines || lines.length === 0) return null;

  // Filter lines if specific headerId is passed
  const voucherLines = headerId ? lines.filter(l => l.header_id === headerId) : lines;
  if (voucherLines.length === 0) return null;

  const firstLine = voucherLines[0];
  const isSingleHeader = new Set(voucherLines.map(l => l.header_id)).size === 1;

  const totalDebit = voucherLines.reduce((sum, l) => sum + (parseFloat(String(l.debit || 0).replace(/[^\d.-]/g, '')) || 0), 0);
  const totalCredit = voucherLines.reduce((sum, l) => sum + (parseFloat(String(l.credit || 0).replace(/[^\d.-]/g, '')) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const isPosted = ['posted', 'معتمد', 'مرحل', 'approved'].includes(String(firstLine.header_status || '').trim().toLowerCase());

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="jv-modal-overlay" onClick={onClose}>
      <div className="jv-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Top actions (Screen only) */}
        <div className="jv-screen-actions no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📓</span>
            <span style={{ fontWeight: 900, color: '#122946', fontSize: '16px' }}>
              {isSingleHeader ? 'سند قيد اليومية' : 'كشف قيود اليومية المحددة'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handlePrint} className="jv-btn-print">
              <span>🖨️</span>
              <span>طباعة السند</span>
            </button>
            <button type="button" onClick={onClose} className="jv-btn-close">
              <span>✖️</span>
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="jv-paper-container">
          {/* Header */}
          <div className="jv-header">
            <div className="jv-header-brand">
              <div className="jv-logo-box">💧</div>
              <div>
                <h2 className="jv-company-name">مؤسسة غيام التجارية</h2>
                <p className="jv-vat-number">الرقم الضريبي: 300000000000003</p>
                <p className="jv-sub-info">لتجارة وتوزيع مياه الشرب النقية</p>
              </div>
            </div>

            <div className="jv-header-title-box">
              <h1 className="jv-doc-title">
                {isSingleHeader ? 'سند قيد يومية' : 'كشف قيود يومية'}
              </h1>
              <div className="jv-badge-status">
                {isPosted ? 'معتمد ومرحل ✅' : 'مسودة قيد الانتظار ⏳'}
              </div>
              <p className="jv-print-date">
                تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>

          <div className="jv-divider-thick" />

          {/* Metadata Grid (if single header) */}
          {isSingleHeader ? (
            <div className="jv-meta-grid">
              <div className="jv-meta-item">
                <span className="jv-meta-label">رقم القيد / المرجع:</span>
                <span className="jv-meta-val">#{firstLine.reference_id || firstLine.header_id?.slice(0, 8)}</span>
              </div>
              <div className="jv-meta-item">
                <span className="jv-meta-label">تاريخ القيد:</span>
                <span className="jv-meta-val">{firstLine.entry_date || '---'}</span>
              </div>
              <div className="jv-meta-item">
                <span className="jv-meta-label">نوع المعاملة:</span>
                <span className="jv-meta-val">{firstLine.v_type || 'قيد عام'}</span>
              </div>
              <div className="jv-meta-item" style={{ gridColumn: 'span 3' }}>
                <span className="jv-meta-label">البيان العام للقيد:</span>
                <span className="jv-meta-val" style={{ fontWeight: 800 }}>{firstLine.header_description || '---'}</span>
              </div>
            </div>
          ) : (
            <div className="jv-meta-grid">
              <div className="jv-meta-item">
                <span className="jv-meta-label">عدد القيود المحددة:</span>
                <span className="jv-meta-val">{new Set(voucherLines.map(l => l.header_id)).size} قيد</span>
              </div>
              <div className="jv-meta-item">
                <span className="jv-meta-label">إجمالي الأسطر:</span>
                <span className="jv-meta-val">{voucherLines.length} سطر</span>
              </div>
              <div className="jv-meta-item">
                <span className="jv-meta-label">تاريخ الكشف:</span>
                <span className="jv-meta-val">{new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>
          )}

          {/* Lines Table */}
          <table className="jv-table">
            <thead>
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}>م</th>
                <th style={{ width: '12%' }}>كود الحساب</th>
                <th style={{ width: '24%' }}>اسم الحساب</th>
                <th style={{ width: '18%' }}>الشريك / المستفيد</th>
                <th style={{ width: '23%' }}>البيان / ملاحظات</th>
                <th style={{ width: '9%', textAlign: 'left' }}>مدين 🟢</th>
                <th style={{ width: '9%', textAlign: 'left' }}>دائن 🔴</th>
              </tr>
            </thead>
            <tbody>
              {voucherLines.map((line: any, idx: number) => {
                const d = parseFloat(String(line.debit || 0).replace(/[^\d.-]/g, '')) || 0;
                const c = parseFloat(String(line.credit || 0).replace(/[^\d.-]/g, '')) || 0;
                return (
                  <tr key={line.line_id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 800, color: THEME.primary }}>{line.account_code || '---'}</td>
                    <td style={{ fontWeight: 800, color: '#1e293b' }}>{line.account_name || '---'}</td>
                    <td style={{ color: '#475569' }}>{line.partner_name || '---'}</td>
                    <td style={{ color: '#334155', fontSize: '11px' }}>
                      {line.line_notes || line.header_description || '---'}
                    </td>
                    <td style={{ textAlign: 'left', fontWeight: 900, color: d > 0 ? '#059669' : '#cbd5e1' }}>
                      {d > 0 ? formatCurrency(d) : '-'}
                    </td>
                    <td style={{ textAlign: 'left', fontWeight: 900, color: c > 0 ? '#dc2626' : '#cbd5e1' }}>
                      {c > 0 ? formatCurrency(c) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="jv-total-row">
                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 900, fontSize: '13px' }}>
                  الإجمالي العام ({isBalanced ? 'قيد متزن ⚖️' : '⚠️ قيد غير متزن'})
                </td>
                <td style={{ textAlign: 'left', fontWeight: 900, color: '#059669', fontSize: '14px' }}>
                  {formatCurrency(totalDebit)}
                </td>
                <td style={{ textAlign: 'left', fontWeight: 900, color: '#dc2626', fontSize: '14px' }}>
                  {formatCurrency(totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures Section */}
          <div className="jv-signatures">
            <div className="jv-sign-box">
              <span className="jv-sign-title">إعداد (المحاسب)</span>
              <div className="jv-sign-line" />
            </div>
            <div className="jv-sign-box">
              <span className="jv-sign-title">مراجعة (المدير المالي)</span>
              <div className="jv-sign-line" />
            </div>
            <div className="jv-sign-box">
              <span className="jv-sign-title">اعتماد (المدير العام)</span>
              <div className="jv-sign-line" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .jv-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(18, 41, 70, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          direction: rtl;
        }

        .jv-modal-box {
          background: white;
          width: 900px;
          max-width: 95vw;
          max-height: 92vh;
          border-radius: 20px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: jvModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes jvModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .jv-screen-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .jv-btn-print {
          background: linear-gradient(135deg, #1C73AB, #2891C8);
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: 0.2s;
          box-shadow: 0 4px 12px rgba(28, 115, 171, 0.25);
        }
        .jv-btn-print:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .jv-btn-close {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: 0.2s;
        }
        .jv-btn-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .jv-paper-container {
          padding: 25px 30px;
          overflow-y: auto;
          flex: 1;
        }

        .jv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .jv-header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .jv-logo-box {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1C73AB, #2891C8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          color: white;
          box-shadow: 0 4px 12px rgba(28, 115, 171, 0.2);
        }

        .jv-company-name {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          color: #122946;
        }

        .jv-vat-number {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .jv-sub-info {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #94a3b8;
        }

        .jv-header-title-box {
          text-align: left;
        }

        .jv-doc-title {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: #1C73AB;
        }

        .jv-badge-status {
          display: inline-block;
          margin-top: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .jv-print-date {
          margin: 4px 0 0 0;
          font-size: 11px;
          color: #94a3b8;
        }

        .jv-divider-thick {
          height: 2px;
          background: linear-gradient(90deg, #1C73AB, rgba(28, 115, 171, 0.2));
          margin-bottom: 16px;
        }

        .jv-meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }

        .jv-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .jv-meta-label {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
        }

        .jv-meta-val {
          font-size: 12px;
          font-weight: 900;
          color: #1e293b;
        }

        .jv-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          font-size: 12px;
        }

        .jv-table th {
          background: #f1f5f9;
          color: #1e293b;
          font-weight: 900;
          padding: 10px;
          border: 1px solid #cbd5e1;
          text-align: right;
        }

        .jv-table td {
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
        }

        .jv-table tr:nth-child(even) td {
          background: #fbfcfe;
        }

        .jv-total-row td {
          background: #f8fafc !important;
          border-top: 2px solid #1C73AB !important;
          padding: 10px !important;
        }

        .jv-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
          padding-top: 20px;
        }

        .jv-sign-box {
          text-align: center;
          width: 25%;
        }

        .jv-sign-title {
          font-size: 12px;
          font-weight: 900;
          color: #475569;
          display: block;
          margin-bottom: 35px;
        }

        .jv-sign-line {
          border-bottom: 1px dashed #94a3b8;
          width: 100%;
        }

        /* 🖨️ Print Styles */
        @media print {
          .jv-modal-overlay {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            backdrop-filter: none !important;
          }
          .jv-modal-box {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            border-radius: 0 !important;
          }
          .jv-screen-actions {
            display: none !important;
          }
          .jv-paper-container {
            padding: 0 !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
