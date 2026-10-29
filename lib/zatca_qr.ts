// بيانات الشركة الرسمية المعتمدة (شركة مدهش علي ال قريع)
export const COMPANY_INFO = {
    nameAr: 'شركة مدهش علي ال قريع',
    nameEn: 'MUDHISH ALI ALGAREA Company',
    vatNumber: '315082337900003',
    crNumber: '7051013519',
    unifiedNumber: '7051013519',
    manager: 'مدهش علي فنيس آل قريع',
    phone: '0569545201',
    email: 'alnoor.station.0@gmail.com',
};

/**
 * تنسيق التاريخ والوقت بصيغة ISO 8601 القياسية المعتمدة لدى هيئة الزكاة والضريبة والجمارك (ZATCA)
 * بدون أجزاء الثانية (YYYY-MM-DDTHH:mm:ssZ) لضمان عمل الباركود في كافة تطبيقات الفحص الضريبي.
 */
export function formatZatcaTimestamp(dateInput?: string | null, createdAt?: string | null): string {
    if (dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
        const cleanDate = dateInput.trim();
        if (createdAt) {
            const parsedCreated = new Date(createdAt);
            if (!isNaN(parsedCreated.getTime())) {
                const timePart = parsedCreated.toISOString().split('T')[1].replace(/\.\d{3}Z$/, 'Z');
                return `${cleanDate}T${timePart}`;
            }
        }
        return `${cleanDate}T12:00:00Z`;
    }

    const raw = dateInput || createdAt;
    if (raw) {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z');
        }
    }

    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * توليد باركود الفاتورة الإلكترونية (ZATCA Phase 1 TLV Base64)
 * متوافق 100% مع متطلبات هيئة الزكاة والضريبة والجمارك.
 */
export function generateZatcaQR(
    sellerName?: string,
    vatNumber?: string,
    timestamp?: string,
    total?: string | number,
    vatTotal?: string | number
): string {
    const cleanSeller = (sellerName || COMPANY_INFO.nameAr).trim();
    const cleanVat = (vatNumber || COMPANY_INFO.vatNumber).trim();
    const cleanTimestamp = formatZatcaTimestamp(timestamp);
    const cleanTotal = (Number(String(total ?? 0).replace(/[^0-9.-]/g, '')) || 0).toFixed(2);
    const cleanVatTotal = (Number(String(vatTotal ?? 0).replace(/[^0-9.-]/g, '')) || 0).toFixed(2);

    const encoder = new TextEncoder();
    const encodeTLV = (tag: number, value: string): number[] => {
        const valueBytes = Array.from(encoder.encode(value));
        return [tag, valueBytes.length, ...valueBytes];
    };

    const tlvBytes = new Uint8Array([
        ...encodeTLV(1, cleanSeller),
        ...encodeTLV(2, cleanVat),
        ...encodeTLV(3, cleanTimestamp),
        ...encodeTLV(4, cleanTotal),
        ...encodeTLV(5, cleanVatTotal),
    ]);

    if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
        return Buffer.from(tlvBytes).toString('base64');
    }

    let binary = '';
    for (let i = 0; i < tlvBytes.byteLength; i++) {
        binary += String.fromCharCode(tlvBytes[i]);
    }
    return btoa(binary);
}
