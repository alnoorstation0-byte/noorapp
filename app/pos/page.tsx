"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { usePosLogic } from './pos_logic';
import { THEME } from '@/lib/theme';
import LoadingScreen from '@/components/LoadingScreen';
import BarcodeScannerWidget from '@/components/BarcodeScannerWidget';

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
                                    <div key={item.id} className="pos-item-card" onClick={() => logic.addToCart(item)}>
                                        <div className="pos-item-name">{item.name}</div>
                                        <div className="pos-item-price">{formatCurrency(item.price)}</div>
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
                                            <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(item.price)}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 15px' }}>
                                            <button className="qty-btn" onClick={() => logic.updateCartItemQty(item.id, item.qty + 1)}>+</button>
                                            <span style={{ fontWeight: 900, fontSize: '14px', width: '25px', textAlign: 'center' }}>{item.qty}</span>
                                            <button className="qty-btn" onClick={() => logic.updateCartItemQty(item.id, item.qty - 1)}>-</button>
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '14px', color: '#0f172a', width: '70px', textAlign: 'left' }}>
                                            {formatCurrency(item.qty * item.price)}
                                        </div>
                                        <button className="remove-btn" onClick={() => logic.removeFromCart(item.id)}>✕</button>
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
        </MasterPage>
    );
}
