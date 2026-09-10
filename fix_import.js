const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/page.tsx', 'utf8');

code = code.replace("import { THEME }\r\nimport { showGlobalToast } from '@/lib/toast-context';\r\n from '@/lib/theme';", "import { THEME } from '@/lib/theme';\r\nimport { showGlobalToast } from '@/lib/toast-context';");
code = code.replace("import { THEME }\nimport { showGlobalToast } from '@/lib/toast-context';\n from '@/lib/theme';", "import { THEME } from '@/lib/theme';\nimport { showGlobalToast } from '@/lib/toast-context';");

fs.writeFileSync('D:/waterapp/app/purchase_orders/page.tsx', code, 'utf8');
console.log('Fixed!');
