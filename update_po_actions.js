const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/page.tsx', 'utf8');

// The block for approved actions
const approvedRegex = /\{row\.status === 'approved' && \(\s*<>\s*<SecureAction module="inventory" action="view">([\s\S]*?)<\/SecureAction>\s*<SecureAction module="inventory" action="post">([\s\S]*?)<\/SecureAction>\s*<SecureAction module="inventory" action="post">([\s\S]*?)<\/SecureAction>\s*<\/>\s*\)/;

const match = code.match(approvedRegex);
if (match) {
    const newApprovedActions = \{row.status === 'approved' && (
            <>
              <SecureAction module="inventory" action="view">
                \
              </SecureAction>
              <SecureAction module="inventory" action="post">
                \
              </SecureAction>
              <SecureAction module="inventory" action="post">
                <button 
                  onClick={() => logic.handleUnapproveTransaction(row)}
                  className="btn-main-glass"
                  style={{ background: '#eab308', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                >
                  ?? ?? ????????
                </button>
              </SecureAction>
              <SecureAction module="inventory" action="edit">
                <button 
                  onClick={() => showGlobalToast('??? ?? ???????? ????? ?????? ?? ???????', 'warning')}
                  className="btn-main-glass"
                  style={{ background: '#94a3b8', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                  title="?? ???? ????? ??? ???? ?????? ?? ??? ???????? ?????"
                >
                  ?? ?????
                </button>
              </SecureAction>
              <SecureAction module="inventory" action="create">
                <button 
                  onClick={() => window.location.href = '/PaymentVouchers'}
                  className="btn-main-glass"
                  style={{ background: '#8b5cf6', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                >
                  ?? ??? ???
                </button>
              </SecureAction>
            </>
          )\;
    
    code = code.replace(approvedRegex, newApprovedActions);
    fs.writeFileSync('D:/waterapp/app/purchase_orders/page.tsx', code, 'utf8');
    console.log('Done replacing approved actions!');
} else {
    console.log('Regex did not match!');
}
