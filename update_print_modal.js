const fs = require('fs');
let code = fs.readFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderPrintModal.tsx', 'utf8');

const tableBlock = \                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>O U,OU+U?</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>O U,UU.USOc</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>O3O1O O U,U^O-O_Oc</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>O U,OOU.O U,US</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{record.inventory_items?.name || 'OUSO U.O-O_O_'}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{record.quantity}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(record.unit_price)}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(record.quantity * record.unit_price)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>O U,OOU.O U,US U,O"U, O U,O OUSO"Oc:</span>
                                <span>{formatCurrency(record.quantity * record.unit_price)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>O OUSO"Oc O U,U,USU.Oc O U,U.O O U?Oc (15%):</span>
                                <span>{formatCurrency(record.tax_amount || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '10px', fontWeight: 'bold' }}>
                                <span>O U,OOU.O U,US O U,U.O3OO-U,:</span>
                                <span>{formatCurrency((record.quantity * record.unit_price) + (record.tax_amount || 0))}</span>
                            </div>
                        </div>
                    </div>\;

const newTableBlock = \                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>?????</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>??????</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>??? ??????</th>
                                <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>????????</th>
                            </tr>
                        </thead>
                        <tbody>
                            {record.items?.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{item.inventory_items?.name || '??? ????'}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(item.unit_price)}</td>
                                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>{formatCurrency(item.quantity * item.unit_price)}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>???????? ??? ???????:</span>
                                <span>{formatCurrency(record.items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>??????? (15%):</span>
                                <span>{formatCurrency(record.items?.reduce((sum, item) => sum + (item.tax_amount || 0), 0) || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '10px', fontWeight: 'bold' }}>
                                <span>???????? ???????:</span>
                                <span>{formatCurrency(record.total_amount)}</span>
                            </div>
                        </div>
                    </div>\;

code = code.replace(tableBlock, newTableBlock);
fs.writeFileSync('D:/waterapp/app/purchase_orders/PurchaseOrderPrintModal.tsx', code, 'utf8');
console.log('Fixed print modal!');
