const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Check if there's any alert( or window.alert(
            // We want to replace it only if it's an alert call.
            const alertRegex = /(?<![a-zA-Z0-9_])(?:window\.)?alert\((.*?)\)/g;
            
            if (alertRegex.test(content)) {
                content = content.replace(alertRegex, "showGlobalToast($1, 'warning')");
                
                // Now ensure showGlobalToast is imported
                if (!content.includes('showGlobalToast')) {
                    // if it already imports useToast from toast-context, we can just add showGlobalToast
                    if (content.includes('@/lib/toast-context')) {
                        content = content.replace(/{([\s\w,]*)useToast([\s\w,]*)}/, '{$1useToast, showGlobalToast$2}');
                    } else {
                        // find last import or start of file
                        const lines = content.split('\n');
                        let lastImportIdx = -1;
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].trim().startsWith('import ')) {
                                lastImportIdx = i;
                            }
                        }
                        const importStr = "import { showGlobalToast } from '@/lib/toast-context';";
                        if (lastImportIdx !== -1) {
                            lines.splice(lastImportIdx + 1, 0, importStr);
                        } else {
                            lines.unshift(importStr);
                        }
                        content = lines.join('\n');
                    }
                } else if (content.includes('showGlobalToast') && !content.includes('import { showGlobalToast') && content.includes('@/lib/toast-context')) {
                    // if useToast is imported but not showGlobalToast
                    const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]@\/lib\/toast-context['"]/);
                    if (importMatch && !importMatch[1].includes('showGlobalToast')) {
                        content = content.replace(/(import\s+{)([^}]+)(}\s+from\s+['"]@\/lib\/toast-context['"])/, "$1$2, showGlobalToast$3");
                    }
                } else if (!content.includes('import ') && !content.includes('@/lib/toast-context')) {
                    content = "import { showGlobalToast } from '@/lib/toast-context';\n" + content;
                }
                
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

walk('D:\\waterapp\\app');
console.log('Alert Replacement complete.');
