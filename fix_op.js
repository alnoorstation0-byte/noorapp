
const fs = require('fs');
let content = fs.readFileSync('D:/waterapp/app/fleet_operations/fleet_logic.ts', 'utf-8');
content = content.replace('partner_type\', \'U.U^O,U?\'', 'partner_type\', \'????\'');
fs.writeFileSync('D:/waterapp/app/fleet_operations/fleet_logic.ts', content);
console.log('Fixed fleet_operations/fleet_logic.ts');

