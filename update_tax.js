const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', 'utf8');

// 1. Add taxMode state
code = code.replace(/const \[notes, setNotes\] = useState\(''\);/, "const [notes, setNotes] = useState('');\n  const [taxMode, setTaxMode] = useState<'exclusive'|'inclusive'|'none'>('exclusive');");

// 2. Modify initial data to guess taxMode
const initialDataBlock =         setPartnerId(initialData.partner_id || '');
        setNotes(initialData.notes || '');
        // Map initialData.items if editing;
const newInitialDataBlock =         setPartnerId(initialData.partner_id || '');
        setNotes(initialData.notes || '');
        setTaxMode(initialData.items?.[0]?.include_tax ? (initialData.items[0].tax_amount < (initialData.items[0].unit_price * initialData.items[0].quantity * 0.15) ? 'inclusive' : 'exclusive') : 'none');
        // Map initialData.items if editing;
code = code.replace(initialDataBlock, newInitialDataBlock);

// 3. resetForm
code = code.replace(/setNotes\(''\);/, "setNotes('');\n    setTaxMode('exclusive');");

// 4. Recalculate tax function
const handleLineChange =   const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    
    // Auto-fill price
    if (field === 'item_id') {
      const selectedItem = items.find((i: any) => i.id === value);
      if (selectedItem) {
        newLines[index].unit_price = selectedItem.cost_price || selectedItem.default_price || 0;
      }
    }

    if (newLines[index].include_tax) {
        newLines[index].tax_amount = (newLines[index].quantity * newLines[index].unit_price) * 0.15;
    } else {
        newLines[index].tax_amount = 0;
    }

    setLines(newLines);
  };;

const newHandleLineChange =   const recalculateTaxes = (currentLines: any[], mode: string) => {
    return currentLines.map(line => {
      const subtotal = line.quantity * line.unit_price;
      if (mode === 'exclusive') {
        line.tax_amount = subtotal * 0.15;
        line.include_tax = true;
      } else if (mode === 'inclusive') {
        line.tax_amount = subtotal - (subtotal / 1.15);
        line.include_tax = true;
      } else {
        line.tax_amount = 0;
        line.include_tax = false;
      }
      return line;
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    let newLines = [...lines];
    newLines[index][field] = value;
    
    if (field === 'item_id') {
      const selectedItem = items.find((i: any) => i.id === value);
      if (selectedItem) {
        newLines[index].unit_price = selectedItem.cost_price || selectedItem.default_price || 0;
      }
    }

    setLines(recalculateTaxes(newLines, taxMode));
  };

  const handleTaxModeChange = (mode: string) => {
    setTaxMode(mode as any);
    setLines(recalculateTaxes([...lines], mode));
  };;
code = code.replace(handleLineChange, newHandleLineChange);

// 5. Add master tax toggle in UI
const headerGrid =         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>;
const newHeaderGrid =         <div style={{ background: 'rgba(255,255,255,0.4)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <label style={{ fontWeight: 900, color: THEME.primary }}>?? ??????? ??????? ????? ???????:</label>
            <select className="glass-input-field" value={taxMode} onChange={e => handleTaxModeChange(e.target.value)} style={{ width: 'auto', fontWeight: 'bold' }}>
                <option value="exclusive">??? ???? ??????? (??? ????? 15% ????????)</option>
                <option value="inclusive">???? ??????? (??? ??????? 15% ?? ????????)</option>
                <option value="none">???? ????? (0%)</option>
            </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>;
code = code.replace(headerGrid, newHeaderGrid);

// 6. Fix line items UI (remove checkbox)
const lineItemsUI =                 <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" checked={line.include_tax} onChange={e => handleLineChange(index, 'include_tax', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: THEME.primary }} />
                    ????? (15%)
                </label>
                <input type="number" readOnly className="glass-input-field" value={line.tax_amount} style={{ background: 'rgba(0,0,0,0.05)', color: '#1e293b' }} />
                </div>;
const newLineItemsUI =                 <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'block' }}>???? ???????</label>
                <input type="number" readOnly className="glass-input-field" value={Number(line.tax_amount).toFixed(2)} style={{ background: 'rgba(0,0,0,0.05)', color: '#1e293b' }} />
                </div>
                <div>
                <label style={{ fontSize: '13px', fontWeight: 900, color: THEME.primary, marginBottom: '5px', display: 'block' }}>????????</label>
                <input type="number" readOnly className="glass-input-field" value={(Number(line.unit_price) * Number(line.quantity) + (taxMode === 'exclusive' ? Number(line.tax_amount) : 0)).toFixed(2)} style={{ background: 'rgba(0,0,0,0.05)', color: '#16a34a', fontWeight: 'bold' }} />
                </div>;

code = code.replace(lineItemsUI, newLineItemsUI);

// update grid template columns
code = code.replace(/gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto'/g, "gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto'");

fs.writeFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderModal.tsx', code, 'utf8');
console.log('Done!');
