const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', 'utf8');

// Change glass-input to glass-input-field
code = code.replace(/className="glass-input"/g, 'className="glass-input-field"');

// Add emojis to labels
code = code.replace(/<label(.*?)>??????<\/label>/g, '<label>?? ?????? (????????)</label>');
code = code.replace(/<label(.*?)>??? ?????<\/label>/g, '<label>?? ??? ?????</label>');
code = code.replace(/<label(.*?)>???????<\/label>/g, '<label>?? ???????</label>');
code = code.replace(/<label(.*?)>???????<\/label>/g, '<label>?? ??????? ??????</label>');
code = code.replace(/<h4(.*?)>???????<\/h4>/g, '<h4>?? ??????? ????????</h4>');

// Change modal size back if needed, I'll just change the layout containers
code = code.replace(/background: 'rgba\\(255, 255, 255, 0\\.5\\)', padding: '15px', borderRadius: '12px'/g, "background: 'rgba(255,255,255,0.4)', padding: '15px', borderRadius: '16px'");
code = code.replace(/border: '1px solid rgba\\(255,255,255,0\\.8\\)'/g, "border: '1px solid rgba(255,255,255,0.7)'");

// Ensure the inner items look more like InvoiceFormModal
code = code.replace(/background: 'rgba\\(255,255,255,0\\.7\\)', padding: '10px'/g, "background: 'rgba(255,255,255,0.6)', padding: '10px'");

fs.writeFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', code, 'utf8');
console.log('Done!');
