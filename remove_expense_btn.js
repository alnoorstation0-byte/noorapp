const fs = require('fs');
let content = fs.readFileSync('D:/waterapp/app/inventory/transactions/page.tsx', 'utf-8');

const startMarker = "{['approved', '?????', '????'].includes(row.status) && ['in', 'transfer_in'].includes(row.type) && (";
const endMarker = "? ????? ?????";

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
    const nextClosingBracket = content.indexOf(')}', content.indexOf(endMarker));
    if (nextClosingBracket !== -1) {
        content = content.substring(0, startIndex) + content.substring(nextClosingBracket + 2);
        fs.writeFileSync('D:/waterapp/app/inventory/transactions/page.tsx', content, 'utf-8');
        console.log('Removed successfully.');
    } else {
        console.log('Could not find closing bracket.');
    }
} else {
    console.log('Could not find start marker.');
}
