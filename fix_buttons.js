const fs = require('fs');

let content = fs.readFileSync('D:/waterapp/app/inventory/transactions/page.tsx', 'utf-8');

content = content.replace(/className="btn-main-glass blue"[\s\S]*?>\s*? ??????\s*<\/button>/, 
    'className="btn-main-glass"\n                  style={{ width: \'auto\', padding: \'5px 12px\', fontSize: \'11px\', margin: 0, background: \'#16a34a\', color: \'white\' }}\n                >\n                  ? ???????? ???????? ???????\n                </button>'
);

content = content.replace(/className="btn-main-glass yellow"[\s\S]*?>\s*? ?? ????????\s*<\/button>/, 
    'className="btn-main-glass"\n                style={{ background: \'#eab308\', color: \'white\', width: \'auto\', padding: \'5px 12px\', fontSize: \'11px\', margin: 0 }}\n              >\n                ? ????? ????????\n              </button>'
);

fs.writeFileSync('D:/waterapp/app/inventory/transactions/page.tsx', content, 'utf-8');
console.log('Fixed Buttons');
