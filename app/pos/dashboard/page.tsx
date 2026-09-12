"use client";
import React from 'react';
import MasterPage from '@/components/MasterPage';
import { usePosDashboardLogic } from './pos_dashboard_logic';
import { THEME } from '@/lib/theme';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import ShiftDetailsModal from '../ShiftDetailsModal';

export default function PosDashboardPage() {
    const logic = usePosDashboardLogic();
    const [selectedShiftId, setSelectedShiftId] = React.useState<string | null>(null);

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

    const shiftColumns = [
        {
            key: 'shift_number',
            header: 'رقم الوردية',
            render: (r: any) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 900, color: THEME.primary }}>#{r.shift_number || (r.id ? r.id.substring(0, 8) : '-')}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {r.opened_at ? new Date(r.opened_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                </div>
            )
        },
        {
            key: 'warehouse',
            header: 'منفذ البيع / السيارة',
            render: (r: any) => (
                <div>
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>{r.warehouse?.name || 'مستودع غير محدد'}</span>
                    {r.warehouse?.type === 'vehicle' && <span style={{ marginRight: '6px', fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '6px' }}>سيارة توزيع</span>}
                </div>
            )
        },
        {
            key: 'delegate',
            header: 'المندوب / الكاشير',
            render: (r: any) => (
                <span style={{ fontWeight: 700, color: '#475569' }}>
                    {r.delegate?.name || 'غير محدد'}
                </span>
            )
        },
        {
            key: 'starting_cash',
            header: 'عهدة البداية',
            render: (r: any) => formatCurrency(r.starting_cash || 0)
        },
        {
            key: 'status',
            header: 'الحالة',
            render: (r: any) => {
                const isOpen = r.status === 'open';
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 900,
                        background: isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: isOpen ? '#059669' : '#475569',
                        border: `1px solid ${isOpen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`
                    }}>
                        {isOpen ? '🟢 مفتوحة حالياً' : '🔒 مغلقة'}
                    </span>
                );
            }
        },
        {
            key: 'shortage_overage_amount',
            header: 'عجز / زيادة',
            render: (r: any) => {
                if (r.status === 'open') return <span style={{ color: '#94a3b8' }}>-</span>;
                const diff = Number(r.shortage_overage_amount || 0);
                if (diff === 0) return <span style={{ color: '#16a34a', fontWeight: 800 }}>متطابق ✓</span>;
                if (diff > 0) return <span style={{ color: '#0284c7', fontWeight: 800 }}>+{formatCurrency(diff)} (زيادة)</span>;
                return <span style={{ color: '#ef4444', fontWeight: 800 }}>{formatCurrency(diff)} (عجز)</span>;
            }
        },
        {
            key: 'actions',
            header: 'الإجراءات',
            render: (r: any) => (
                <button
                    type="button"
                    onClick={() => setSelectedShiftId(r.id)}
                    style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(28, 115, 171, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>🔍</span>
                    <span>تفاصيل وتدقيق</span>
                </button>
            )
        }
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
                        {/* Shifts Audit Log */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h2 style={{ color: THEME.primary, fontWeight: 900, margin: 0 }}>
                                    📋 سجل ومراجعة الورديات (Shift Audit Trail)
                                </h2>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                    مراجعة وتقفيل الجرد المالي، فواتير المبيعات، ومخزون القوارير
                                </span>
                            </div>
                            <RawasiSmartTable 
                                columns={shiftColumns} 
                                data={logic.shiftsHistory} 
                                enablePagination={true}
                                rowsPerPage={10}
                            />
                        </div>

                        <div>
                            <h2 style={{ color: THEME.primary, fontWeight: 900, marginBottom: '15px' }}>📦 أرصدة البضاعة في المنافذ</h2>
                            <RawasiSmartTable 
                                columns={invColumns} 
                                data={logic.inventoryBalances} 
                                enablePagination={true}
                                rowsPerPage={10}
                            />
                        </div>

                        <div>
                            <h2 style={{ color: THEME.primary, fontWeight: 900, marginBottom: '15px' }}>🧾 فواتير المبيعات الصادرة من المنافذ</h2>
                            <RawasiSmartTable 
                                columns={salesColumns} 
                                data={logic.sales} 
                                enablePagination={true}
                                rowsPerPage={10}
                            />
                        </div>
                    </div>

                    {/* Shift Details Audit Modal */}
                    <ShiftDetailsModal 
                        isOpen={!!selectedShiftId}
                        onClose={() => setSelectedShiftId(null)}
                        shiftId={selectedShiftId}
                    />
                </>
            )}
        </MasterPage>
    );
}
