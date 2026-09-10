const fs = require('fs');
let content = fs.readFileSync('D:/waterapp/app/inventory/transactions/page.tsx', 'utf-8');

const targetStr = "{['approved', '?????', '????'].includes(row.status) && ['in', 'transfer_in'].includes(row.type) && (";
const endStr = "? ????? ?????";

const startIndex = content.indexOf(targetStr);
if (startIndex !== -1) {
    const endStrIndex = content.indexOf(endStr, startIndex);
    if (endStrIndex !== -1) {
        const nextClosingButton = content.indexOf('</button>', endStrIndex);
        const nextClosingParen = content.indexOf(')}', nextClosingButton);
        if (nextClosingParen !== -1) {
            content = content.substring(0, startIndex) + content.substring(nextClosingParen + 2);
            fs.writeFileSync('D:/waterapp/app/inventory/transactions/page.tsx', content, 'utf-8');
            console.log('Removed successfully.');
        }
    } else {
        console.log('endStr not found');
    }
} else {
    console.log('targetStr not found, looking for corrupted strings');
    // Try regex
    const regex = /\{\['approved',[^\]]+\]\.includes\(row\.status\)\s*&&\s*\['in',\s*'transfer_in'\]\.includes\(row\.type\)\s*&&\s*\([\s\S]*?<\/button>\s*\)\}/;
    if (regex.test(content)) {
        content = content.replace(regex, '');
        fs.writeFileSync('D:/waterapp/app/inventory/transactions/page.tsx', content, 'utf-8');
        console.log('Removed via regex.');
    } else {
        console.log('Regex also failed.');
    }
}
