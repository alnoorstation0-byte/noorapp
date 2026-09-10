const fs = require('fs');
let content = fs.readFileSync('D:/waterapp/components/InventoryItemModal.tsx', 'utf-8');

if (!content.includes('isCameraOpen')) {
    content = content.replace(
        'const [mounted, setMounted] = React.useState(false);',
        'const [mounted, setMounted] = React.useState(false);\n  const [isCameraOpen, setIsCameraOpen] = React.useState(false);'
    );
}

if (!content.includes('CameraScannerModal')) {
    content = content.replace(
        'import SearchableSelect from \'./SearchableSelect\';',
        'import SearchableSelect from \'./SearchableSelect\';\nimport CameraScannerModal from \'./CameraScannerModal\';'
    );
}

const oldField = '<input type=\"text\" className=\"glass-input-field\" placeholder=\"????: WTR-330\" value={currentRecord.code || \'\'} onChange={e => setCurrentRecord({...currentRecord, code: e.target.value})} />';
const newField = \
              <div style={{ display: 'flex', gap: '5px' }}>
                <input type=\"text\" className=\"glass-input-field\" placeholder=\"????: WTR-330\" value={currentRecord.code || ''} onChange={e => setCurrentRecord({...currentRecord, code: e.target.value})} style={{ flex: 1 }} />
                <button type=\"button\" className=\"glass-button\" onClick={(e) => { e.preventDefault(); setIsCameraOpen(true); }} style={{ background: THEME.primary, color: 'white', padding: '0 15px', fontSize: '18px', border: 'none', borderRadius: '8px' }} title=\"??? ????????\">??</button>
              </div>
\;
content = content.replace(oldField, newField);

if (!content.includes('<CameraScannerModal isOpen')) {
    content = content.replace('<AquaModalWrapper', '<>\n    <AquaModalWrapper');
    content = content.replace(
        '</AquaModalWrapper>\n  );\n}',
        '</AquaModalWrapper>\n    <CameraScannerModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onScan={(code) => setCurrentRecord({...currentRecord, code})} />\n    </>\n  );\n}'
    );
}

fs.writeFileSync('D:/waterapp/components/InventoryItemModal.tsx', content);
console.log('Fixed using file');
