const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/page.tsx', 'utf8');

if (!code.includes('import { showGlobalToast }')) {
    code = code.replace("import { THEME }", "import { THEME } from '@/lib/theme';\nimport { showGlobalToast } from '@/lib/toast-context';\n");
    // fix the double THEME import issue from above replace
    code = code.replace("import { THEME } from '@/lib/theme';\nimport { THEME } from '@/lib/theme';\nimport { showGlobalToast } from '@/lib/toast-context';\n", "import { THEME } from '@/lib/theme';\nimport { showGlobalToast } from '@/lib/toast-context';\n");
    fs.writeFileSync('D:/waterapp/app/purchase_orders/page.tsx', code, 'utf8');
}
console.log('Import added!');
