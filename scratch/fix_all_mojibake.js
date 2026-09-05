const fs = require('fs');
const path = require('path');

const win1252Map = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201C: 0x93, // “
  0x201D: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
};

function fixMojibake(text) {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Surrogate pairs check
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
      const nextCode = text.charCodeAt(i + 1);
      if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
        const pair = text[i] + text[i + 1];
        const uBytes = Buffer.from(pair, 'utf8');
        for (const b of uBytes) bytes.push(b);
        i++;
        continue;
      }
    }
    
    if (code <= 0xFF) {
      bytes.push(code);
    } else if (win1252Map[code]) {
      bytes.push(win1252Map[code]);
    } else {
      const utf8Bytes = Buffer.from(text[i], 'utf8');
      for (const b of utf8Bytes) bytes.push(b);
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

const targetFiles = [
  'app/ManualJournals/page.tsx',
  'app/ReceiptVouchers/page.tsx',
  'app/partners/page.tsx',
  'app/inventory/warehouses/page.tsx',
  'app/inventory/transactions/page.tsx',
  'app/statement/page.tsx',
  'app/fleet/page.tsx',
  'components/authGuard.tsx'
];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log('Skipping missing file:', relPath);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('Ø') || content.includes('Ù')) {
    console.log('Fixing mojibake in:', relPath);
    const fixed = fixMojibake(content);
    fs.writeFileSync(fullPath, fixed, 'utf8');
    console.log('Successfully fixed:', relPath);
  } else {
    console.log('Already clean:', relPath);
  }
}
