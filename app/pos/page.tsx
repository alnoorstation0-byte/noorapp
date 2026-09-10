"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { usePosLogic } from './pos_logic';
import { THEME } from '@/lib/theme';
import LoadingScreen from '@/components/LoadingScreen';
import BarcodeScannerWidget from '@/components/BarcodeScannerWidget';
import InvoicePrintModal from '../invoices/InvoicePrintModal';

export default function PosPage() {
    const logic = usePosLogic();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);
    };

    const headerContent = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontWeight: 900, color: THEME.primary }}>🏪 منفذ البيع:</span>
            <select 
                className="glass-input-field" 
                value={logic.selectedWarehouseId}
                onChange={(e) => logic.setSelectedWarehouseId(e.target.value)}
                style={{ width: '250px', fontWeight: 'bold' }}
            >
                <option value="" disabled>-- اختر منفذ البيع --</option>
                {logic.warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                ))}
            </select>
        </div>
    );

    return (
        <MasterPage 
            title="نقاط البيع (POS)" 
            subtitle="شاشة المبيعات السريعة (كاشير) من منافذ البيع" 
            icon="🛍️"
            headerContent={headerContent}
        >
            <style>{`
                .pos-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                    height: calc(100vh - 160px);
                }
                @media (max-width: 1024px) {
                    .pos-grid { grid-template-columns: 1fr; height: auto; }
                }
                .items-section, .cart-section {
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(20px);
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.8);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .items-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 15px;
                    overflow-y: auto;
                    padding-right: 5px;
                    margin-top: 15px;
                }
                .pos-item-card {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(28, 115, 171, 0.1);
                    border-radius: 16px;
                    padding: 15px;
                    cursor: pointer;
                    transition: 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 10px;
                }
                .pos-item-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 20px rgba(28, 115, 171, 0.15);
                    border-color: ${THEME.goldAccent};
                }
                .pos-item-name { font-weight: 900; color: #122946; fontSize: 14px; }
                .pos-item-price { font-weight: 900; color: #16a34a; fontSize: 16px; }
                .pos-item-qty { font-size: 11px; color: #64748b; font-weight: bold; background: #f1f5f9; padding: 3px 8px; border-radius: 10px; }
                
                .cart-list {
                    flex: 1;
                    overflow-y: auto;
                    margin-top: 15px;
                    padding-right: 5px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .cart-item {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 10px 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .qty-btn {
                    width: 28px; height: 28px;
                    border-radius: 50%;
                    border: none;
                    background: #f1f5f9;
                    color: #0f172a;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                }
                .qty-btn:hover { background: #e2e8f0; }
                .remove-btn { color: #ef4444; background: #fee2e2; border: none; padding: 5px 10px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: bold; }
                .checkout-panel {
                    background: #122946;
                    color: white;
                    border-radius: 20px;
                    padding: 20px;
                    margin-top: 15px;
                }
                .summary-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #cbd5e1; }
                .summary-total { display: flex; justify-content: space-between; font-size: 22px; font-weight: 900; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); color: #10b981; }
            `}</style>

            {logic.isLoading ? (
                <LoadingScreen message="جاري تحضير شاشة الكاشير..." fullScreen={false} />
            ) : (
                <div className="pos-grid">
                    
                    {/* Left: Items Selection */}
                    <div className="items-section">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* Barcode Scanner */}
                            <BarcodeScannerWidget onScan={logic.handleBarcodeScan} />
                            
                            <input 
                                type="text" 
                                className="glass-input-field" 
                                placeholder="ابحث عن صنف بالاسم..." 
                                value={logic.searchQuery}
                                onChange={(e) => logic.setSearchQuery(e.target.value)}
                                style={{ flex: 1 }}
                            />
                        </div>
                        
                        <div className="items-grid cinematic-scroll">
                            {logic.inventoryItems.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#64748b', fontWeight: 'bold' }}>
                                    لا توجد أصناف متاحة في هذا المنفذ حالياً
                                </div>
                            ) : (
                                logic.inventoryItems.map((item: any) => (
                                    <div key={item.id} className="pos-item-card" onClick={() => logic.handleItemClick(item)}>
                                        <div className="pos-item-name">{item.name}</div>
                                        <div className="pos-item-price">{formatCurrency(item.suggested_price || item.price || 0)}</div>
                                        <div className="pos-item-qty">المتاح: {item.available_qty} {item.unit}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Cart & Checkout */}
                    <div className="cart-section">
                        <h3 style={{ margin: 0, color: THEME.primary, fontWeight: 900, borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
                            🛒 الفاتورة الحالية
                        </h3>

                        <div className="cart-list cinematic-scroll">
                            {logic.cart.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontWeight: 'bold' }}>
                                    السلة فارغة. انقر على الأصناف لإضافتها.
                                </div>
                            ) : (
                                logic.cart.map((item: any) => (
                                    <div key={item.id} className="cart-item">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 900, fontSize: '13px', color: '#1e293b' }}>{item.name}</div>
                                            <input 
                                                type="number" 
                                                value={item.unit_price !== undefined ? item.unit_price : (item.price || 0)}
                                                onChange={(e) => logic.updateCartItemPrice(item.id, Number(e.target.value))}
                                                style={{ width: '80px', fontSize: '12px', color: '#16a34a', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 5px', marginTop: '2px' }}
                                                min={0}
                                                step="any"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 15px' }}>
                                            <button className="qty-btn" onClick={() => logic.updateCartItemQty(item.id, item.qty + 1)}>+</button>
                                            <input 
                                                type="number" 
                                                value={item.qty}
                                                onChange={(e) => logic.updateCartItemQty(item.id, Number(e.target.value))}
                                                style={{ width: '40px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px' }}
                                                min={1}
                                            />
                                            <button className="qty-btn" onClick={() => logic.updateCartItemQty(item.id, item.qty - 1)}>-</button>
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '14px', color: '#0f172a', width: '70px', textAlign: 'left' }}>
                                            {formatCurrency(item.qty * (item.unit_price || item.price || 0))}
                                        </div>
                                        <button className="remove-btn" onClick={() => logic.removeFromCart(item.id)}>❌</button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="checkout-panel">
                            {/* Customer & Payment Method */}
                            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <select 
                                    className="glass-input-field" 
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                    value={logic.partnerId}
                                    onChange={e => logic.setPartnerId(e.target.value)}
                                >
                                    <option value="" style={{ color: 'black' }}>عميل نقدي (بدون اسم)</option>
                                    {logic.customers.map((c: any) => (
                                        <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>
                                    ))}
                                </select>
                                <select 
                                    className="glass-input-field" 
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                    value={logic.paymentMethod}
                                    onChange={(e: any) => logic.setPaymentMethod(e.target.value)}
                                >
                                    <option value="نقدي (كاش)" style={{ color: 'black' }}>الدفع نقدي (كاش)</option>
                                    <option value="شبكة (مدى)" style={{ color: 'black' }}>شبكة (مدى / بطاقة)</option>
                                    <option value="آجل" style={{ color: 'black' }}>آجل (على الحساب)</option>
                                </select>
                            </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '10px' }}>
                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>طريقة الحساب:</span>
                                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button 
                                        onClick={() => logic.setIsTaxInclusive(true)}
                                        style={{ border: 'none', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: logic.isTaxInclusive ? '#16a34a' : 'transparent', color: logic.isTaxInclusive ? 'white' : '#475569', transition: '0.3s' }}
                                    >شامل الضريبة</button>
                                    <button 
                                        onClick={() => logic.setIsTaxInclusive(false)}
                                        style={{ border: 'none', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: !logic.isTaxInclusive ? '#3b82f6' : 'transparent', color: !logic.isTaxInclusive ? 'white' : '#475569', transition: '0.3s' }}
                                    >غير شامل</button>
                                </div>
                            </div>
                            <div className="summary-row">
                                <span>المجموع الفرعي:</span>
                                <span>{formatCurrency(logic.cartTotal.subtotal)}</span>
                            </div>
                            <div className="summary-row">
                                <span>ضريبة القيمة المضافة (15%):</span>
                                <span>{formatCurrency(logic.cartTotal.tax)}</span>
                            </div>
                            <div className="summary-total">
                                <span>الإجمالي المطلوب:</span>
                                <span>{formatCurrency(logic.cartTotal.total)}</span>
                            </div>

                            <button 
                                onClick={logic.handleCheckout}
                                disabled={logic.cart.length === 0 || logic.isCheckingOut}
                                className="btn-main-glass"
                                style={{ 
                                    width: '100%', marginTop: '20px', 
                                    background: logic.cart.length > 0 ? '#10b981' : 'rgba(255,255,255,0.1)', 
                                    color: 'white', fontSize: '18px', padding: '15px' 
                                }}
                            >
                                {logic.isCheckingOut ? '⏳ جاري الإصدار...' : '✅ الدفع وإصدار الفاتورة'}
                            </button>
                        </div>
                    </div>

                </div>
            )}
        
            {logic.selectedItemForCart && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '25px', borderRadius: '20px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
                        <h3 style={{ margin: '0 0 20px 0', color: '#1C73AB', textAlign: 'center', fontSize: '20px', fontWeight: 900 }}>{logic.selectedItemForCart.name}</h3>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#1C73AB' }}>الكمية المطلوبة</label>
                            <input 
                                type="number" 
                                className="glass-input-field" 
                                style={{ width: '100%', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }}
                                value={logic.selectedItemForCart.selected_qty || ''}
                                onChange={(e) => logic.setSelectedItemForCart({...logic.selectedItemForCart, selected_qty: Number(e.target.value)})}
                                min={1}
                            />
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#1C73AB' }}>{logic.isTaxInclusive ? "السعر (شامل الضريبة)" : "السعر (غير شامل الضريبة)"}</label>
                            <input 
                                type="number" 
                                className="glass-input-field" 
                                style={{ width: '100%', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }}
                                value={logic.selectedItemForCart.selected_price || ''}
                                onChange={(e) => logic.setSelectedItemForCart({...logic.selectedItemForCart, selected_price: Number(e.target.value)})}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={logic.confirmAddToCart} style={{ flex: 2, background: '#2891C8', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                إضافة للسلة 🛒
                            </button>
                            <button onClick={() => logic.setSelectedItemForCart(null)} style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

        
            <InvoicePrintModal 
                isOpen={logic.isPrintModalOpen}
                onClose={() => logic.setIsPrintModalOpen(false)}
                record={logic.lastInvoice || {}}
            />
        </MasterPage>

    );
}
