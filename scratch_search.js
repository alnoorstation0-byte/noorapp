const fs = require('fs');
const path = require('path');

const words = ['مشروع', 'مشاريع', 'مقاول', 'بند', 'بنود', 'عقار', 'عمارة', 'أعمال', 'اعمال'];
let md = '# Terminology Search Results\n\n';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            let fileHasMatch = false;
            lines.forEach((line, i) => {
                const found = words.filter(w => line.includes(w));
                if (found.length > 0) {
                    if (!fileHasMatch) {
                        md += `\n### ${fullPath.replace('D:\\waterapp\\app\\', '')}\n`;
                        fileHasMatch = true;
                    }
                    md += `- Line ${i + 1}: \`${line.trim()}\`\n`;
                }
            });
        }
    }
}

walk('D:\\waterapp\\app');
fs.writeFileSync('D:\\waterapp\\search_results.md', md, 'utf8');
console.log('Search complete.');
