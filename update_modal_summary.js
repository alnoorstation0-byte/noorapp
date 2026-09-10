const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', 'utf8');

const targetStr = \        <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 900, color: THEME.primary }}>?? ??????? ??????</label>\;

const summaryBlock = \        {/* Summary Block */}
        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(28, 115, 171, 0.05)', borderRadius: '15px', border: '1px solid rgba(28, 115, 171, 0.2)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: THEME.primary, fontWeight: 900, borderBottom: '1px solid rgba(28, 115, 171, 0.1)', paddingBottom: '10px' }}>?? ???? ????????</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px' }}>
                <span style={{ fontWeight: 600 }}>???????? ??? ???????:</span>
                <span>{formatCurrency(lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price)), 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px' }}>
                <span style={{ fontWeight: 600 }}>?????? ???????:</span>
                <span>{formatCurrency(lines.reduce((s, l) => s + Number(l.tax_amount || 0), 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '2px dashed rgba(28, 115, 171, 0.2)', fontSize: '18px', color: THEME.primary }}>
                <span style={{ fontWeight: 900 }}>???????? ???????:</span>
                <span style={{ fontWeight: 900 }}>{formatCurrency(lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price) + (taxMode === 'exclusive' ? Number(l.tax_amount || 0) : 0)), 0))}</span>
            </div>
        </div>

        <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 900, color: THEME.primary }}>?? ??????? ??????</label>\;

if (!code.includes(targetStr)) {
    console.log("Could not find target string.");
} else {
    code = code.replace(targetStr, summaryBlock);
    
    // Check if formatCurrency is imported, if not add it
    if (!code.includes('formatCurrency')) {
        code = code.replace("import { showGlobalToast } from '@/lib/toast-context';", "import { showGlobalToast } from '@/lib/toast-context';\nimport { formatCurrency } from '@/lib/utils';");
    }

    fs.writeFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', code, 'utf8');
    console.log("Summary block added!");
}
