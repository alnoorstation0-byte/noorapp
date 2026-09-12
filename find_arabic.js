const fs = require('fs');

const content = fs.readFileSync('d:/waterapp/app/pos/page.tsx', 'utf-8');
const lines = content.split('\n');

const arabicRegex = /[\u0600-\u06FF]/;
let results = [];

for (let i = 0; i < lines.length; i++) {
    if (arabicRegex.test(lines[i])) {
        results.push(`${i + 1}: ${lines[i].trim()}`);
    }
}

fs.writeFileSync('d:/waterapp/scratch_arabic_lines.txt', results.join('\n'));
console.log(`Found ${results.length} lines with Arabic text.`);
