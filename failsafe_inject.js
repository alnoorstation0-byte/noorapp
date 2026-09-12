const fs = require('fs');

const files = [
    'app/pos/ShiftOpenModal.tsx',
    'app/pos/ShiftCloseModal.tsx',
    'app/pos/OpenShiftsModal.tsx',
    'app/pos/ShiftDetailsModal.tsx'
];

for (const file of files) {
    let code = fs.readFileSync(file, 'utf-8');
    
    // Look for `const [loading` or `const [isOpen` or `const queryClient` - just the first statement inside the functional component body.
    // Or we can just find the first `const [` and insert before it.
    
    // Find the first occurrence of `const [`
    const insertIdx = code.indexOf('    const [');
    if (insertIdx !== -1 && !code.includes('const { language } = useLanguage();')) {
        const injected = "    const { language } = useLanguage();\n    const isEn = language === 'en';\n\n";
        code = code.slice(0, insertIdx) + injected + code.slice(insertIdx);
        fs.writeFileSync(file, code);
        console.log(`Successfully injected into ${file}`);
    }
}
