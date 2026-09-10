const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/page.tsx', 'utf8');

code = code.replace(/module="purchase_orders"/g, 'module="inventory"');
code = code.replace(/import InventoryActionModal from '..components.InventoryActionModal';/, "import PurchaseOrderModal from './PurchaseOrderModal';");

code = code.replace(/<InventoryActionModal/g, '<PurchaseOrderModal');
code = code.replace(/actionType="in"/g, '');

const oldColumns =     { key: 'item', header: '????? ???????',
      render: (row: any) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#122946' }}>{row.inventory_items?.name}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{row.quantity} {row.inventory_items?.unit || '???'}</div>
        </div>
      )
    },
    { key: 'amount', header: '????????',
      render: (row: any) => {
        const total = (row.quantity * row.unit_price) + (row.tax_amount || 0);
        return <span style={{ fontWeight: 900, color: '#16a34a' }}>{formatCurrency(total)}</span>;
      }
    },;

const newColumns =     { key: 'item', header: '??????? ????????',
      render: (row: any) => (
        <div>
           {row.items?.map((item: any, i: number) => (
               <div key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: '#122946' }}>{item.inventory_items?.name}</span>
                  <span style={{ fontSize: '11px', color: '#64748b', marginRight: '5px' }}>({item.quantity} {item.inventory_items?.unit || '???'})</span>
               </div>
           ))}
        </div>
      )
    },
    { key: 'amount', header: '????????',
      render: (row: any) => {
        return <span style={{ fontWeight: 900, color: '#16a34a' }}>{formatCurrency(row.total_amount)}</span>;
      }
    },;

code = code.replace(oldColumns, newColumns);
code = code.replace(/delete\(\)\.eq\('id', row\.id\)/g, "delete().in('id', row.ids)");

fs.writeFileSync('D:/waterapp/app/purchase_orders/page.tsx', code, 'utf8');
console.log('Done!');
