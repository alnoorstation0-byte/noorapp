'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MasterPage from '@/components/MasterPage';
import RawasiSmartTable from '@/components/rawasismarttable';
import { formatCurrency } from '@/lib/helpers';
import { useParams, useRouter } from 'next/navigation';

export default function FleetOperationDetails() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params?.id as string;
    const [activeTab, setActiveTab] = useState('invoices');

    const { data: operation, isLoading } = useQuery({
        queryKey: ['fleet_operation_details', id],
        queryFn: async () => {
            const { data } = await supabase
                .from('fleet_operations')
                .select(`
                    *,
                    vehicle:fleet_vehicles(plate_number),
                    driver:partners!driver_id(name)
                `)
                .eq('id', id)
                .single();
            return data;
        },
        enabled: !!id
    });

    const { data: invoices = [] } = useQuery({
        queryKey: ['fleet_operation_invoices', id],
        queryFn: async () => {
            const { data } = await supabase
                .from('invoices')
                .select('id, invoice_number, date, total_amount, paid_amount, status, client_name, partner:partners!partner_id(name)')
                .eq('fleet_operation_id', id);
            return data || [];
        },
        enabled: !!id
    });

    const { data: expenses = [] } = useQuery({
        queryKey: ['fleet_operation_expenses', id],
        queryFn: async () => {
            const { data } = await supabase
                .from('expenses')
                .select('id, exp_date, description, total_price, payee:partners!payee_id(name)')
                .eq('fleet_operation_id', id);
            return data || [];
        },
        enabled: !!id
    });

    const { data: inventory = [] } = useQuery({
        queryKey: ['fleet_operation_inventory', id],
        queryFn: async () => {
            const { data } = await supabase
                .from('inventory_transactions')
                .select('id, transaction_date, type, quantity, unit_price, total_price, item:inventory_items(name, unit)')
                .eq('fleet_operation_id', id);
            return data || [];
        },
        enabled: !!id
    });

    if (isLoading) return <MasterPage title="جاري التحميل..."><div style={{padding: '50px', textAlign: 'center'}}>جاري تحميل تفاصيل الرحلة...</div></MasterPage>;
    if (!operation) return <MasterPage title="خطأ"><div style={{padding: '50px', textAlign: 'center'}}>الرحلة غير موجودة!</div></MasterPage>;

    const LBL = {
        back: String.fromCharCode(0x0631,0x062c,0x0648,0x0639,0x0020,0x0644,0x0644,0x0642,0x0627,0x0626,0x0645,0x0629),
        sales: String.fromCharCode(0x0627,0x0644,0x0645,0x0628,0x064a,0x0639,0x0627,0x062a),
        expenses: String.fromCharCode(0x0627,0x0644,0x0645,0x0635,0x0631,0x0648,0x0641,0x0627,0x062a),
        inv: String.fromCharCode(0x062d,0x0631,0x0643,0x0629,0x0020,0x0627,0x0644,0x0628,0x0636,0x0627,0x0639,0x0629),
        invType: {
            'out': String.fromCharCode(0x0635,0x0631,0x0641,0x0020,0x0644,0x0644,0x0633,0x064a,0x0627,0x0631,0x0629),
            'in': String.fromCharCode(0x0625,0x0631,0x062c,0x0627,0x0639,0x0020,0x0645,0x0646,0x0020,0x0627,0x0644,0x0633,0x064a,0x0627,0x0631,0x0629),
            'sales_deduction': String.fromCharCode(0x0645,0x0628,0x064a,0x0639,0x0627,0x062a)
        }
    };

    const invoiceCols = [
        { header: 'رقم الفاتورة', accessor: 'invoice_number', render: (r: any) => <b style={{color: '#3b82f6'}}>{r.invoice_number}</b> },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'العميل', accessor: 'client_name', render: (r: any) => r.client_name || r.partner?.name || '---' },
        { header: 'الإجمالي', accessor: 'total_amount', render: (r: any) => <span style={{fontWeight: 900, color: '#059669'}}>{formatCurrency(r.total_amount)}</span> },
        { header: 'الحالة', accessor: 'status' },
    ];

    const expenseCols = [
        { header: 'التاريخ', accessor: 'exp_date' },
        { header: 'الوصف', accessor: 'description' },
        { header: 'المستفيد', accessor: 'payee.name', render: (r: any) => r.payee?.name || '---' },
        { header: 'المبلغ', accessor: 'total_price', render: (r: any) => <span style={{fontWeight: 900, color: '#dc2626'}}>{formatCurrency(r.total_price)}</span> },
    ];

    const invCols = [
        { header: 'التاريخ', accessor: 'transaction_date' },
        { header: 'النوع', accessor: 'type', render: (r: any) => <span style={{padding: '4px 8px', borderRadius: '4px', fontSize: '11px', background: r.type === 'out' ? '#dcfce7' : '#fee2e2', color: r.type === 'out' ? '#166534' : '#991b1b'}}>{(LBL.invType as any)[r.type] || r.type}</span> },
        { header: 'الصنف', accessor: 'item.name', render: (r: any) => r.item?.name },
        { header: 'الكمية', accessor: 'quantity', render: (r: any) => <b>{r.quantity} {r.item?.unit}</b> },
        { header: 'التكلفة الإجمالية', accessor: 'total_price', render: (r: any) => <span>{formatCurrency(r.total_price)}</span> },
    ];

    return (
        <MasterPage 
            title={`تفاصيل الرحلة: ${operation.operation_number}`} 
            subtitle={`السيارة: ${operation.vehicle?.plate_number} | المندوب: ${operation.driver?.name}`}
        >
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <button className="btn-main-glass" style={{ width: 'auto', background: '#e2e8f0', color: '#334155', margin: 0 }} onClick={() => router.push('/fleet_operations')}>
                    ⬅️ {LBL.back}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                        background: operation?.status === 'مفتوح' ? '#fef08a' : '#dcfce7', 
                        border: operation?.status === 'مفتوح' ? '1px solid #fde047' : '1px solid #86efac',
                        padding: '8px 18px', 
                        borderRadius: '12px', 
                        fontWeight: 900, 
                        color: operation?.status === 'مفتوح' ? '#854d0e' : '#166534',
                        fontSize: '14px'
                    }}>
                        الحالة: {operation?.status === 'مفتوح' ? 'مفتوح 🔓' : 'مغلق 🔒'}
                    </div>
                    {operation?.status === 'مفتوح' ? (
                        <button
                            className="btn-main-glass"
                            style={{ width: 'auto', margin: 0, background: '#f59e0b', color: 'white', fontWeight: 800, padding: '8px 16px', borderRadius: '12px', fontSize: '13px' }}
                            onClick={async () => {
                                if (confirm(`تأكيد إغلاق أمر التشغيل رقم ${operation?.operation_number}؟`)) {
                                    await supabase.from('fleet_operations').update({ status: 'مغلق' }).eq('id', id);
                                    queryClient.invalidateQueries({ queryKey: ['fleet_operation_details', id] });
                                    queryClient.invalidateQueries({ queryKey: ['fleet_operations'] });
                                }
                            }}
                        >
                            🔒 إغلاق أمر التشغيل
                        </button>
                    ) : (
                        <button
                            className="btn-main-glass"
                            style={{ width: 'auto', margin: 0, background: '#10b981', color: 'white', fontWeight: 800, padding: '8px 16px', borderRadius: '12px', fontSize: '13px' }}
                            onClick={async () => {
                                if (confirm(`تأكيد إعادة فتح أمر التشغيل رقم ${operation?.operation_number}؟`)) {
                                    await supabase.from('fleet_operations').update({ status: 'مفتوح' }).eq('id', id);
                                    queryClient.invalidateQueries({ queryKey: ['fleet_operation_details', id] });
                                    queryClient.invalidateQueries({ queryKey: ['fleet_operations'] });
                                }
                            }}
                        >
                            🔓 إعادة فتح أمر التشغيل
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>المبيعات (إيرادات)</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', marginTop: '10px' }}>{formatCurrency(operation.total_sales)}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>المصروفات</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626', marginTop: '10px' }}>{formatCurrency(operation.total_expenses)}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>تكلفة البضاعة</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#d97706', marginTop: '10px' }}>{formatCurrency(operation.total_cost)}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center', background: operation.net_profit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800 }}>صافي الربح</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: operation.net_profit >= 0 ? '#10b981' : '#dc2626', marginTop: '10px' }}>{formatCurrency(operation.net_profit)}</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.4)', padding: '5px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                <button 
                    onClick={() => setActiveTab('invoices')}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'invoices' ? '#1C73AB' : 'transparent', color: activeTab === 'invoices' ? 'white' : '#475569', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s' }}
                >
                    🧾 {LBL.sales} ({invoices.length})
                </button>
                <button 
                    onClick={() => setActiveTab('expenses')}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'expenses' ? '#1C73AB' : 'transparent', color: activeTab === 'expenses' ? 'white' : '#475569', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s' }}
                >
                    📉 {LBL.expenses} ({expenses.length})
                </button>
                <button 
                    onClick={() => setActiveTab('inventory')}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'inventory' ? '#1C73AB' : 'transparent', color: activeTab === 'inventory' ? 'white' : '#475569', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s' }}
                >
                    📦 {LBL.inv} ({inventory.length})
                </button>
            </div>

            {/* Tab Content */}
            <div className="table-card">
                {activeTab === 'invoices' && (
                    <RawasiSmartTable columns={invoiceCols} data={invoices} />
                )}
                {activeTab === 'expenses' && (
                    <RawasiSmartTable columns={expenseCols} data={expenses} />
                )}
                {activeTab === 'inventory' && (
                    <RawasiSmartTable columns={invCols} data={inventory} />
                )}
            </div>
        </MasterPage>
    );
}
