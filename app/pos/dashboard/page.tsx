"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { usePosDashboardLogic } from './pos_dashboard_logic';
import { THEME } from '@/lib/theme';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';

export default function PosDashboardPage() {
    const logic = usePosDashboardLogic();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);
    };

    const invColumns = [
        { key: 'warehouse_name', header: 'منفذ البيع', render: (r: any) => <span style={{ fontWeight: 'bold' }}>{r.warehouse_name || '-'}</span> },
        { key: 'item_name', header: 'الصنف', render: (r: any) => <span style={{ color: THEME.primary, fontWeight: 900 }}>{r.item_name}</span> },
        { key: 'quantity', header: 'الرصيد المتاح', render: (r: any) => <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{r.quantity} {r.unit}</span> },
        { key: 'value', header: 'قيمة المخزون', render: (r: any) => <span style={{ color: '#16a34a', fontWeight: 900 }}>{formatCurrency(r.value)}</span> }
    ];

    const salesColumns = [
        { key: 'invoice_number', header: 'رقم الفاتورة', render: (r: any) => <span style={{ fontWeight: 'bold', color: THEME.primary }}>{r.invoice_number}</span> },
        { key: 'date', header: 'التاريخ', render: (r: any) => new Date(r.date).toLocaleDateString('ar-SA') },
        { key: 'warehouse_name', header: 'المنفذ', render: (r: any) => r.warehouses?.name || '-' },
        { key: 'client_name', header: 'العميل', render: (r: any) => r.client_name || '-' },
        { key: 'payment_method', header: 'طريقة الدفع', render: (r: any) => r.payment_method },
        { key: 'total_amount', header: 'المبلغ الإجمالي', render: (r: any) => <span style={{ fontWeight: 900, color: '#10b981' }}>{formatCurrency(r.total_amount)}</span> }
    ];

    const customFilters = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#122946' }}>اختر منفذ البيع:</label>
                <select 
                    className="glass-input-field" 
                    value={logic.selectedWarehouseId}
                    onChange={(e) => logic.setSelectedWarehouseId(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <option value="all">كافة المنافذ</option>
                    {logic.warehouses.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#122946' }}>من تاريخ:</label>
                <input 
                    type="date" 
                    className="glass-input-field" 
                    value={logic.dateRange.start} 
                    onChange={e => logic.setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#122946' }}>إلى تاريخ:</label>
                <input 
                    type="date" 
                    className="glass-input-field" 
                    value={logic.dateRange.end} 
                    onChange={e => logic.setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
            </div>
        </div>
    );

    return (
        <MasterPage 
            title="أرباح وأرصدة منافذ البيع" 
            subtitle="متابعة حركة المبيعات وقيمة المخزون لكل نقطة بيع" 
            icon="📈"
        >
            <RawasiSidebarManager customFilters={customFilters} />

            {logic.isLoading ? (
                <LoadingScreen message="جاري تحميل التقارير..." fullScreen={false} />
            ) : (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                        <div className="aqua-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#64748b' }}>إجمالي قيمة المخزون الحالي 📦</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#122946' }}>{formatCurrency(logic.totalStockValue)}</div>
                        </div>
                        <div className="aqua-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#64748b' }}>إجمالي مبيعات المنافذ 🛒</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981' }}>{formatCurrency(logic.totalSalesValue)}</div>
                        </div>
                        <div className="aqua-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#64748b' }}>المتحصلات النقدية والشبكة 💰</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#3b82f6' }}>{formatCurrency(logic.totalCollected)}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                        <div>
                            <h2 style={{ color: THEME.primary, fontWeight: 900, marginBottom: '15px' }}>📦 أرصدة البضاعة في المنافذ</h2>
                            <RawasiSmartTable 
                                columns={invColumns} 
                                data={logic.inventoryBalances} 
                                pagination={true}
                                itemsPerPage={10}
                            />
                        </div>

                        <div>
                            <h2 style={{ color: THEME.primary, fontWeight: 900, marginBottom: '15px' }}>🧾 فواتير المبيعات الصادرة من المنافذ</h2>
                            <RawasiSmartTable 
                                columns={salesColumns} 
                                data={logic.sales} 
                                pagination={true}
                                itemsPerPage={10}
                            />
                        </div>
                    </div>
                </>
            )}
        </MasterPage>
    );
}
