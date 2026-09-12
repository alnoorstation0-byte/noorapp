const fs = require('fs');

const files = [
    'app/pos/ShiftOpenModal.tsx',
    'app/pos/ShiftCloseModal.tsx',
    'app/pos/OpenShiftsModal.tsx',
    'app/pos/ShiftDetailsModal.tsx'
];

for (const file of files) {
    let code = fs.readFileSync(file, 'utf-8');
    
    // Simple replace for export default function Name(...) {
    // We'll match `export default function [A-Za-z]+\([^)]+\)\s*\{`
    code = code.replace(
        /(export default function [A-Za-z]+\s*\([^)]*\)\s*\{)/s,
        (match) => match + "\n    const { language } = useLanguage();\n    const isEn = language === 'en';\n"
    );

    fs.writeFileSync(file, code);
    console.log(`${file} hooks injected!`);
}
