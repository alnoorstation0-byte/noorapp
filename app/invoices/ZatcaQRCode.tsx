"use client";
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { COMPANY_INFO, formatZatcaTimestamp, generateZatcaQR } from '@/lib/zatca_qr';

const THEME = {
  primary: '#0f172a',
  ruby: '#e11d48',
};

export default function ZatcaQRCode({ record, size = 105 }: { record: any; size?: number }) {
  if (!record) return null;

  // في حال الفاتورة الداخلية غير الخاضعة للضريبة (بدون أي شعار داخل الباركود)
  if (record.is_internal || record.skip_zatca) {
    return (
      <div style={{ padding: '6px', border: `1.5px solid ${THEME.ruby}`, borderRadius: '8px', background: '#ffffff', display: 'inline-flex' }}>
        <QRCodeSVG
          value={`INTERNAL-INV-${record.invoice_number || record.id || ''}`}
          size={size}
          level="M"
          marginSize={2}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
    );
  }

  const timestamp = formatZatcaTimestamp(record.date, record.created_at);
  const totalAmount = Number(record.total_amount || 0);
  const taxableAmount = Number(record.taxable_amount || (totalAmount / 1.15));
  const taxAmount = Number(record.tax_amount ?? (totalAmount - taxableAmount));

  const qrBase64 = generateZatcaQR(
    COMPANY_INFO.nameAr,
    COMPANY_INFO.vatNumber,
    timestamp,
    totalAmount.toFixed(2),
    taxAmount.toFixed(2)
  );

  // باركود ZATCA نقي بدون أي شعار في المنتصف لضمان قراءة فورية في تطبيقات الزكاة والضريبة
  return (
    <div style={{ padding: '6px', border: `1.5px solid ${THEME.primary}`, borderRadius: '8px', background: '#ffffff', display: 'inline-flex' }}>
      <QRCodeSVG
        value={qrBase64}
        size={size}
        level="M"
        marginSize={2}
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  );
}
