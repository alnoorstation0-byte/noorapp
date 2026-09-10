const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', 'utf8');

code = code.replace(/width="1000px"/, 'width="850px"');
code = code.replace(/gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px'/, "gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px'");
code = code.replace(/gap: '15px', marginBottom: '15px', alignItems: 'end', background: 'rgba\(255,255,255,0.7\)', padding: '15px'/g, "gap: '10px', marginBottom: '10px', alignItems: 'end', background: 'rgba(255,255,255,0.7)', padding: '10px'");
code = code.replace(/padding: '20px', borderRadius: '16px'/g, "padding: '15px', borderRadius: '12px'");
code = code.replace(/marginTop: '25px'/g, "marginTop: '15px'");
code = code.replace(/marginTop: '30px'/g, "marginTop: '15px'");

fs.writeFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', code, 'utf8');
console.log('Done!');
