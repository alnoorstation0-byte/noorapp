const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/purchase_orders_logic.ts', 'utf8');

const oldLogic = \        for (const id of transaction.ids) {
            const { error: rpcError } = await supabase.rpc('unapprove_inventory_transaction', { p_id: id });
            if (rpcError) throw new Error(rpcError.message);
        }\;

const newLogic = \        for (const id of transaction.ids) {
            // Fetch transaction details
            const { data: txn, error: txnError } = await supabase
                .from('inventory_transactions')
                .select('*')
                .eq('id', id)
                .single();
            if (txnError || !txn) throw new Error('Transaction not found');

            // 1. Subtract from main inventory
            const { data: itemData } = await supabase.from('inventory_items').select('current_quantity').eq('id', txn.item_id).single();
            if (itemData) {
                await supabase.from('inventory_items').update({
                    current_quantity: Number(itemData.current_quantity) - Number(txn.quantity)
                }).eq('id', txn.item_id);
            }

            // 2. Subtract from warehouse inventory (if applicable)
            const targetWarehouseId = txn.warehouse_id || '11111111-1111-1111-1111-111111111111';
            const { data: whInv } = await supabase.from('warehouse_inventory').select('id, quantity').eq('warehouse_id', targetWarehouseId).eq('item_id', txn.item_id).maybeSingle();
            
            if (whInv) {
                await supabase.from('warehouse_inventory').update({
                    quantity: Number(whInv.quantity) - Number(txn.quantity)
                }).eq('id', whInv.id);
            }

            // 3. Delete Journal Entry
            if (txn.journal_id) {
                await supabase.from('journal_headers').delete().eq('id', txn.journal_id);
            }

            // 4. Reset Transaction Status
            await supabase.from('inventory_transactions').update({
                status: 'pending',
                journal_id: null
            }).eq('id', id);
        }\;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('D:/waterapp/app/purchase_orders/purchase_orders_logic.ts', code, 'utf8');
console.log('Done!');
