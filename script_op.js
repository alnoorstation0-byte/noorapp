
const fs = require('fs');
let content = fs.readFileSync('D:/waterapp/app/fleet_operations/fleet_logic.ts', 'utf-8');

// fix rawOperations query
content = content.replace(
    'vehicle:vehicles(plate_number),\\n                    driver:users!fleet_operations_driver_id_fkey(name:full_name)',
    'vehicle:fleet_vehicles(plate_number),\\n                    driver:partners!driver_id(name)'
);

// fix vehicles query
content = content.replace(
    'supabase.from(\\'vehicles\\').select(\\'id, plate_number, status\\');',
    'supabase.from(\\'fleet_vehicles\\').select(\\'id, plate_number, status, driver_id\\');'
);

// fix drivers query
content = content.replace(
    'supabase.from(\\'users\\').select(\\'id, full_name\\').eq(\\'role\\', \\'driver\\');',
    'supabase.from(\\'partners\\').select(\\'id, name, partner_type\\').eq(\\'partner_type\\', \\'????\\');'
);

fs.writeFileSync('D:/waterapp/app/fleet_operations/fleet_logic.ts', content);
console.log('Fixed fleet_logic.ts');

