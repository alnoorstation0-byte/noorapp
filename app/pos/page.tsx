"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { usePosLogic } from './pos_logic';
import { THEME } from '@/lib/theme';
import LoadingScreen from '@/components/LoadingScreen';
import BarcodeScannerWidget from '@/components/BarcodeScannerWidget';
import InvoicePrintModal from '../invoices/InvoicePrintModal';
import ThermalReceiptModal from '../invoices/ThermalReceiptModal';
import ShiftOpenModal from './ShiftOpenModal';
import ShiftCloseModal from './ShiftCloseModal';
import { FaPlus, FaMinus, FaTrash, FaCheckCircle, FaBarcode } from 'react-icons/fa';

export default function PosPage() {
    const logic = usePosLogic();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);
    };

    return (
        <MasterPage 
            title="نقاط البيع (POS)" 
            subtitle="شاشة المبيعات السريعة (كاشير) من منافذ البيع" 
            icon="🛍️"
        >
            <style>{`
                /* 🎛️ شريط تحكم الكاشير الماسي */
                .pos-control-bar {
                    background: rgba(255, 255, 255, 0.72);
                    backdrop-filter: blur(25px) saturate(180%);
                    -webkit-backdrop-filter: blur(25px);
                    border: 1px solid rgba(255, 255, 255, 0.85);
                    border-radius: 20px;
                    box-shadow: 0 8px 25px rgba(28, 115, 171, 0.08);
                    padding: 12px 20px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 14px;
                }
                .pos-selectors-group {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    flex-wrap: wrap;
                }
                .pos-select-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .pos-item-label {
                    font-size: 13px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    white-space: nowrap;
                }
                .pos-glass-select {
                    padding: 9px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 800;
                    color: #122946;
                    background: rgba(255, 255, 255, 0.95);
                    border: 1.5px solid rgba(28, 115, 171, 0.22);
                    box-shadow: 0 2px 8px rgba(28, 115, 171, 0.06);
                    outline: none;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    min-height: 42px;
                }
                .pos-glass-select:focus {
                    border-color: #1C73AB;
                    box-shadow: 0 0 0 3px rgba(28, 115, 171, 0.15);
                }
                .pos-badge-delegate {
                    font-size: 11px;
                    font-weight: 800;
                    color: #16a34a;
                    background: rgba(22, 163, 74, 0.12);
                    padding: 4px 10px;
                    border-radius: 20px;
                    white-space: nowrap;
                    border: 1px solid rgba(22, 163, 74, 0.25);
                }
                .pos-shift-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .pos-shift-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 14px;
                    font-size: 12px;
                    font-weight: 800;
                }
                .pos-shift-status.open {
                    background: rgba(22, 163, 74, 0.08);
                    color: #16a34a;
                    border: 1px solid rgba(22, 163, 74, 0.25);
                }
                .pos-shift-status.closed {
                    background: rgba(100, 116, 139, 0.08);
                    color: #64748b;
                    border: 1px solid rgba(100, 116, 139, 0.2);
                }
                .pos-pulse-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                }
                .pos-pulse-dot.green {
                    background: #16a34a;
                    box-shadow: 0 0 8px #16a34a;
                    animation: pulseDot 2s infinite;
                }
                .pos-pulse-dot.gray {
                    background: #94a3b8;
                }
                @keyframes pulseDot {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
                }
                .pos-btn-shift {
                    padding: 9px 20px;
                    border-radius: 12px;
                    border: none;
                    cursor: pointer;
                    font-weight: 800;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: 0.2s;
                    min-height: 42px;
                }
                .pos-btn-shift.open {
                    background: linear-gradient(135deg, #16a34a 0%, #10b981 100%);
                    color: white;
                    box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
                }
                .pos-btn-shift.close {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
                }
                .pos-btn-shift:hover {
                    transform: translateY(-2px);
                }

                .pos-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                    height: calc(100vh - 235px);
                    min-height: 480px;
                }
                @media (max-width: 1024px) {
                    .pos-grid { grid-template-columns: 1fr; height: auto; }
                }
                @media (max-width: 768px) {
                    .pos-control-bar {
                        padding: 12px;
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }
                    .pos-selectors-group {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                    }
                    .pos-select-item {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 4px;
                    }
                    .pos-glass-select {
                        width: 100% !important;
                    }
                    .pos-shift-group {
                        flex-direction: column;
                        align-items: stretch;
                        width: 100%;
                        gap: 8px;
                    }
                    .pos-btn-shift {
                        width: 100%;
                        justify-content: center;
                    }
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
                    position: relative;
                }
                .pos-item-card.critical {
                    border: 1.5px solid #ef4444;
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
                    background: rgba(254, 242, 242, 0.85);
                }
                .pos-item-card.near-low {
                    border: 1.5px solid #f59e0b;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.18);
                    background: rgba(255, 251, 235, 0.85);
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

            {/* 🎛️ شريط تحكم الكاشير المتكامل (منفذ البيع + المندوب + الوردية) */}
            <div className="pos-control-bar">
                <div className="pos-selectors-group">
                    {/* منفذ البيع */}
                    <div className="pos-select-item">
                        <span className="pos-item-label" style={{ color: THEME.primary }}>
                            🏪 منفذ البيع:
                        </span>
                        <select 
                            className="pos-glass-select" 
                            value={logic.selectedWarehouseId}
                            onChange={(e) => logic.setSelectedWarehouseId(e.target.value)}
                            style={{ minWidth: '190px' }}
                            disabled={logic.isDelegateLocked}
                        >
                            <option value="" disabled>-- اختر منفذ البيع --</option>
                            {logic.warehouses.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* المندوب */}
                    <div className="pos-select-item">
                        <span className="pos-item-label" style={{ color: '#16a34a' }}>
                            👤 المندوب / الكاشير:
                        </span>
                        <select 
                            className="pos-glass-select" 
                            value={logic.delegateId}
                            onChange={(e) => logic.setDelegateId(e.target.value)}
                            style={{ 
                                minWidth: '180px',
                                borderColor: logic.delegateId ? '#16a34a' : undefined
                            }}
                            disabled={logic.isDelegateLocked}
                        >
                            <option value="">-- اختر المندوب --</option>
                            {logic.delegates.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {logic.delegateId && (
                            <span className="pos-badge-delegate">
                                ✅ {logic.isDelegateLocked ? 'حسابك المقترن' : 'تم التعيين'}
                            </span>
                        )}
                    </div>
                </div>

                {/* إدارة الوردية */}
                <div className="pos-shift-group">
                    {logic.activeShift ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div className="pos-shift-status open">
                                <span className="pos-pulse-dot green"></span>
                                <span>وردية نشطة #{logic.activeShift.id ? String(logic.activeShift.id).slice(-4) : ''}</span>
                            </div>
                            <button 
                                onClick={() => logic.setIsShiftCloseModalOpen(true)}
                                className="pos-btn-shift close"
                            >
                                🔒 إغلاق الوردية
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div className="pos-shift-status closed">
                                <span className="pos-pulse-dot gray"></span>
                                <span>لا توجد وردية مفتوحة</span>
                            </div>
                            <button 
                                onClick={() => logic.setIsShiftOpenModalOpen(true)}
                                className="pos-btn-shift open"
                            >
                                ✨ فتح وردية جديدة
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {logic.isLoading ? (
                <LoadingScreen message="جاري تحضير شاشة الكاشير..." fullScreen={false} />
            ) : (
                <div className="pos-grid">

                    
                    {/* Left: Items Selection */}
                    <div className="items-section">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Barcode Scanner */}
                            <BarcodeScannerWidget onScan={logic.handleBarcodeScan} />
                            
                            {/* Low Stock Alert Banner */}
                            {logic.lowStockCount > 0 && (
                                <div style={{
                                    background: 'rgba(254, 243, 199, 0.85)',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    borderRadius: '14px',
                                    padding: '8px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backdropFilter: 'blur(10px)',
                                    gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: '#92400e' }}>
                                        <span style={{ fontSize: '16px' }}>⚠️</span>
                                        <span>تنبيه: يوجد <strong>{logic.lowStockCount}</strong> صنف وصل لحد إعادة الطلب في هذا المنفذ!</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => logic.setOnlyLowStock(!logic.onlyLowStock)}
                                        style={{
                                            background: logic.onlyLowStock ? '#d97706' : 'white',
                                            color: logic.onlyLowStock ? 'white' : '#92400e',
                                            border: '1px solid #d97706',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: '0.2s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {logic.onlyLowStock ? 'عرض كل الأصناف' : 'تصفية النواقص فقط 🔍'}
                                    </button>
                                </div>
                            )}

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
                                    {logic.onlyLowStock ? 'لا توجد أصناف تحت حد الطلب حالياً 🎉' : 'لا توجد أصناف متاحة في هذا المنفذ حالياً'}
                                </div>
                            ) : (
                                logic.inventoryItems.map((item: any) => {
                                    const cardClass = `pos-item-card ${item.isCriticalLow ? 'critical' : (item.isNearLow ? 'near-low' : '')}`;
                                    return (
                                        <div key={item.id} className={cardClass} onClick={() => logic.handleItemClick(item)}>
                                            {item.isCriticalLow ? (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    color: '#b91c1c',
                                                    background: '#fee2e2',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)'
                                                }}>
                                                    ⚠️ حد الطلب ({item.reorder_level})
                                                </span>
                                            ) : item.isNearLow ? (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    fontSize: '9px',
                                                    fontWeight: 800,
                                                    color: '#b45309',
                                                    background: '#fef3c7',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(245, 158, 11, 0.4)'
                                                }}>
                                                    ⚡ قارب على النفاد
                                                </span>
                                            ) : null}
                                            <div className="pos-item-name" style={{ marginTop: (item.isCriticalLow || item.isNearLow) ? '16px' : '0' }}>{item.name}</div>
                                            <div className="pos-item-price">{formatCurrency(item.suggested_price || item.price || 0)}</div>
                                            <div className="pos-item-qty" style={{
                                                background: item.isCriticalLow ? '#fecaca' : (item.isNearLow ? '#fef08a' : '#f1f5f9'),
                                                color: item.isCriticalLow ? '#991b1b' : (item.isNearLow ? '#854d0e' : '#64748b'),
                                                fontWeight: 800
                                            }}>
                                                المتاح: {item.available_qty} {item.unit}
                                            </div>
                                        </div>
                                    );
                                })
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
        
            {/* ===== NUMPAD MODAL ===== */}
            {logic.selectedItemForCart && (() => {
                const item = logic.selectedItemForCart;
                const [activeField, setActiveField] = React.useState<'qty' | 'price'>('qty');
                const [isFirstPress, setIsFirstPress] = React.useState(true);

                const handleNumpad = (key: string) => {
                    const currentVal = activeField === 'qty'
                        ? String(item.selected_qty || '')
                        : String(item.selected_price || '');

                    let newVal: string;

                    if (key === '⌫') {
                        newVal = currentVal.slice(0, -1) || '0';
                    } else if (key === '.') {
                        newVal = isFirstPress ? '0.' : (currentVal.includes('.') ? currentVal : currentVal + '.');
                    } else {
                        newVal = isFirstPress ? key : currentVal + key;
                    }

                    setIsFirstPress(false);
                    const num = parseFloat(newVal) || 0;

                    if (activeField === 'qty') {
                        logic.setSelectedItemForCart({ ...item, selected_qty: key === '⌫' ? (Number(newVal) || 0) : num });
                    } else {
                        logic.setSelectedItemForCart({ ...item, selected_price: key === '⌫' ? (Number(newVal) || 0) : parseFloat(newVal) || 0 });
                    }
                };

                const switchField = (field: 'qty' | 'price') => {
                    setActiveField(field);
                    setIsFirstPress(true);
                };

                const numpadKeys = ['7','8','9','4','5','6','1','2','3','.','0','⌫'];

                return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
                        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '28px', width: '95vw', maxWidth: '460px', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.6)', overflow: 'hidden' }}>

                            {/* Header */}
                            <div style={{ background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ color: 'white', fontWeight: 900, fontSize: '18px' }}>{item.name}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', marginTop: '3px' }}>المتاح: {item.available_qty} {item.unit}</div>
                                </div>
                                <button onClick={() => logic.setSelectedItemForCart(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>×</button>
                            </div>

                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                {/* Active Field Displays */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {/* Qty Field */}
                                    <div
                                        onClick={() => switchField('qty')}
                                        style={{ 
                                            background: (item.selected_qty > item.available_qty)
                                                ? '#fee2e2'
                                                : (activeField === 'qty' ? 'linear-gradient(135deg,#1C73AB,#2891C8)' : '#f1f5f9'), 
                                            borderRadius: '16px', 
                                            padding: '14px', 
                                            cursor: 'pointer', 
                                            border: (item.selected_qty > item.available_qty)
                                                ? '2px solid #ef4444'
                                                : (activeField === 'qty' ? '2px solid #2891C8' : '2px solid transparent'), 
                                            transition: '0.2s', 
                                            textAlign: 'center' 
                                        }}
                                    >
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: (item.selected_qty > item.available_qty) ? '#dc2626' : (activeField === 'qty' ? 'rgba(255,255,255,0.8)' : '#64748b'), marginBottom: '6px' }}>
                                            {(item.selected_qty > item.available_qty) ? '⚠️ الكمية (تجاوزت المخزون)' : 'الكمية'}
                                        </div>
                                        <div style={{ fontSize: '32px', fontWeight: 900, color: (item.selected_qty > item.available_qty) ? '#dc2626' : (activeField === 'qty' ? 'white' : '#0f172a'), letterSpacing: '-1px' }}>
                                            {item.selected_qty || 0}
                                        </div>
                                        <div style={{ fontSize: '11px', color: (item.selected_qty > item.available_qty) ? '#dc2626' : (activeField === 'qty' ? 'rgba(255,255,255,0.65)' : '#94a3b8'), marginTop: '4px' }}>{item.unit}</div>
                                    </div>

                                    {/* Price Field */}
                                    <div
                                        onClick={() => switchField('price')}
                                        style={{ background: activeField === 'price' ? 'linear-gradient(135deg,#16a34a,#10b981)' : '#f1f5f9', borderRadius: '16px', padding: '14px', cursor: 'pointer', border: activeField === 'price' ? '2px solid #16a34a' : '2px solid transparent', transition: '0.2s', textAlign: 'center' }}
                                    >
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: activeField === 'price' ? 'rgba(255,255,255,0.8)' : '#64748b', marginBottom: '6px' }}>
                                            {logic.isTaxInclusive ? 'السعر شامل ض.ق.م' : 'السعر قبل ض.ق.م'}
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: 900, color: activeField === 'price' ? 'white' : '#16a34a', letterSpacing: '-1px' }}>
                                            {Number(item.selected_price || 0).toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: activeField === 'price' ? 'rgba(255,255,255,0.65)' : '#94a3b8', marginTop: '4px' }}>ريال</div>
                                    </div>
                                </div>

                                {/* Stock Warning Message */}
                                {item.selected_qty > item.available_qty && (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '8px 12px', color: '#b91c1c', fontSize: '12px', fontWeight: 800, textAlign: 'center' }}>
                                        ⛔ الكمية المطلوبة ({item.selected_qty}) تتجاوز الرصيد المتاح بالمستودع ({item.available_qty})!
                                    </div>
                                )}

                                {/* Quick +/- for Qty */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => { logic.setSelectedItemForCart({ ...item, selected_qty: Math.max(1, (item.selected_qty || 1) - 1) }); setIsFirstPress(false); }}
                                        style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '24px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >−</button>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700, minWidth: '80px', textAlign: 'center' }}>الكمية السريعة</span>
                                    <button
                                        onClick={() => { const next = (item.selected_qty || 1) + 1; if(next <= item.available_qty) { logic.setSelectedItemForCart({ ...item, selected_qty: next }); setIsFirstPress(false); } }}
                                        style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: '#dcfce7', color: '#16a34a', fontSize: '24px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >+</button>
                                </div>

                                {/* Numpad */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {numpadKeys.map(key => (
                                        <button
                                            key={key}
                                            onClick={() => handleNumpad(key)}
                                            style={{
                                                height: '58px',
                                                borderRadius: '14px',
                                                border: 'none',
                                                background: key === '⌫' ? '#fee2e2' : key === '.' ? '#f0f9ff' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                                color: key === '⌫' ? '#dc2626' : key === '.' ? '#0ea5e9' : '#0f172a',
                                                fontSize: key === '⌫' ? '20px' : '22px',
                                                fontWeight: 900,
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                                transition: 'all 0.1s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
                                            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                                            onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.94)')}
                                            onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                </div>

                                {/* Total Preview */}
                                <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: '14px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '14px' }}>الإجمالي المتوقع:</span>
                                    <span style={{ color: '#10b981', fontWeight: 900, fontSize: '22px' }}>
                                        {formatCurrency((item.selected_qty || 0) * (item.selected_price || 0))}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                                    <button
                                        onClick={logic.confirmAddToCart}
                                        disabled={!item.selected_qty || item.selected_qty <= 0 || item.selected_qty > item.available_qty}
                                        style={{ 
                                            height: '54px', 
                                            background: (item.selected_qty > item.available_qty)
                                                ? 'linear-gradient(135deg, #ef4444, #991b1b)'
                                                : 'linear-gradient(135deg,#2891C8,#1C73AB)', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '14px', 
                                            fontWeight: 900, 
                                            fontSize: '15px', 
                                            cursor: (item.selected_qty > item.available_qty) ? 'not-allowed' : 'pointer', 
                                            boxShadow: '0 4px 15px rgba(40,145,200,0.4)',
                                            transition: '0.2s'
                                        }}
                                    >
                                        {item.selected_qty > item.available_qty 
                                            ? `⛔ تجاوز المخزون (المتاح ${item.available_qty})`
                                            : '🛒 إضافة للسلة'}
                                    </button>
                                    <button
                                        onClick={() => logic.setSelectedItemForCart(null)}
                                        style={{ height: '54px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
                                    >
                                        إلغاء
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                );
            })()}


        
            <ThermalReceiptModal 
                isOpen={logic.isThermalPrintModalOpen}
                onClose={() => logic.setIsThermalPrintModalOpen(false)}
                record={logic.lastInvoice || {}}
                onOpenA4={() => logic.setIsPrintModalOpen(true)}
            />

            <InvoicePrintModal 
                isOpen={logic.isPrintModalOpen}
                onClose={() => logic.setIsPrintModalOpen(false)}
                record={logic.lastInvoice || {}}
            />

            <ShiftOpenModal 
                isOpen={!logic.activeShift && !logic.isLoading && logic.userProfile?.role !== 'super_admin'} 
                userProfile={logic.userProfile} 
                delegateId={logic.delegateId} 
                warehouseId={logic.selectedWarehouseId} 
            />

            <ShiftCloseModal 
                isOpen={logic.isShiftCloseModalOpen} 
                onClose={() => logic.setIsShiftCloseModalOpen(false)} 
                activeShift={logic.activeShift} 
            />
        </MasterPage>

    );
}
