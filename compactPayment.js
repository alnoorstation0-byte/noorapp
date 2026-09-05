const fs = require('fs');
const filePath = 'd:\\waterapp\\app\\PaymentVouchers\\PaymentVoucherModal.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Reduce paddings and margins for overall container
content = content.replace(/padding: '25px 30px'/g, "padding: '15px 25px'");
content = content.replace(/padding: 25px 30px;/g, "padding: 15px 25px;");

// 2. Reduce modal header margins
content = content.replace(/marginBottom:'30px', borderBottom:'2px dashed #e2e8f0', paddingBottom:'20px'/g, "marginBottom:'15px', borderBottom:'2px dashed #e2e8f0', paddingBottom:'10px'");

// 3. Accounting direction section
content = content.replace(/padding: '25px', borderRadius: '20px', border: '1px solid #cbd5e1', marginBottom: '25px'/g, "padding: '15px', borderRadius: '20px', border: '1px solid #cbd5e1', marginBottom: '15px'");
content = content.replace(/paddingBottom: '10px', marginBottom: '20px'/g, "paddingBottom: '5px', marginBottom: '10px'");
content = content.replace(/gap: '20px', marginBottom: '20px'/g, "gap: '10px', marginBottom: '10px'");

// 4. Partner balance section
content = content.replace(/padding: '20px', borderRadius: '16px', marginBottom: '25px'/g, "padding: '12px', borderRadius: '16px', marginBottom: '15px'");
content = content.replace(/marginTop: '15px', paddingTop: '15px'/g, "marginTop: '10px', paddingTop: '10px'");

// 5. Date and Amount section
content = content.replace(/gap: '20px', marginBottom: '25px'/g, "gap: '10px', marginBottom: '15px'");

// 6. Input paddings
content = content.replace(/padding: '14px'/g, "padding: '10px'");

// 7. Actions section
content = content.replace(/marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '25px'/g, "marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px'");

fs.writeFileSync(filePath, content, 'utf-8');
