const fs = require('fs');

const files = [
    'app/pos/ShiftOpenModal.tsx',
    'app/pos/ShiftCloseModal.tsx',
    'app/pos/OpenShiftsModal.tsx',
    'app/pos/ShiftDetailsModal.tsx'
];

for (const file of files) {
    let code = fs.readFileSync(file, 'utf-8');
    if (!code.includes("import { useLanguage }")) {
        code = code.replace("import React", "import { useLanguage } from '@/lib/LanguageContext';\nimport React");
        fs.writeFileSync(file, code);
        console.log(`Import added to ${file}`);
    }
}
