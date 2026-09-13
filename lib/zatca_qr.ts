
export function generateZatcaQR(sellerName: string, vatNumber: string, timestamp: string, total: string, vatTotal: string): string {
    const getHexForTag = (tag: number, value: string) => {
        const bytes = Array.from(new TextEncoder().encode(value));
        const tagHex = tag.toString(16).padStart(2, '0');
        const lenHex = bytes.length.toString(16).padStart(2, '0');
        const valHex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
        return tagHex + lenHex + valHex;
    };

    const hexString = 
        getHexForTag(1, sellerName || 'صيدلية تاج المودة البيطرية') +
        getHexForTag(2, vatNumber || '312487477800003') +
        getHexForTag(3, timestamp || new Date().toISOString()) +
        getHexForTag(4, total || '0.00') +
        getHexForTag(5, vatTotal || '0.00');

    // Convert Hex String to Base64
    const hexArray = hexString.match(/.{1,2}/g) || [];
    const bytes = new Uint8Array(hexArray.map(h => parseInt(h, 16)));
    
    // btoa needs a string, we can use reduce to prevent stack overflow on large arrays, but it's small here.
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
