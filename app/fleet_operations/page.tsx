'use client';
import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import SecureAction from '@/components/SecureAction';
import { useFleetLogic } from './fleet_logic';
import FleetModal from './FleetModal';

const formatCurrency = (val: any) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FleetOperationsPage() {
    const logic = useFleetLogic();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    const columns = [
        { header: 'رقم الرحلة', accessor: 'operation_number', render: (row: any) => <b style={{color: '#3b82f6'}}>{row.operation_number}</b> },
        { header: 'التاريخ', accessor: 'operation_date' },
        { header: 'السيارة', accessor: 'vehicle.plate_number', render: (row: any) => <span style={{fontWeight: 800, color: '#334155'}}>{row.vehicle?.plate_number}</span> },
        { header: 'المندوب', accessor: 'driver.name', render: (row: any) => <span>{row.driver?.name}</span> },
        { header: 'المبيعات 💰', accessor: 'total_sales', render: (row: any) => <span style={{color: '#059669', fontWeight: 900}}>{formatCurrency(row.total_sales)}</span> },
        { header: 'تكلفة البضاعة 📦', accessor: 'total_cost', render: (row: any) => <span style={{color: '#d97706', fontWeight: 900}}>{formatCurrency(row.total_cost)}</span> },
        { header: 'المصروفات 📉', accessor: 'total_expenses', render: (row: any) => <span style={{color: '#dc2626', fontWeight: 900}}>{formatCurrency(row.total_expenses)}</span> },
        { header: 'صافي الربح 📈', accessor: 'net_profit', render: (row: any) => <span style={{color: row.net_profit >= 0 ? '#10b981' : '#dc2626', fontWeight: 900}}>{formatCurrency(row.net_profit)}</span> },
        { header: 'الحالة', accessor: 'status', render: (row: any) => (
            <span style={{ 
              background: row.status === 'مفتوح' ? '#fef08a' : '#dcfce7', 
              color: row.status === 'مفتوح' ? '#854d0e' : '#166534', 
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 900 
            }}>
              {row.status === 'مفتوح' ? 'مفتوح 🔓' : 'مغلق 🔒'}
            </span>
        )},
        { header: 'إجراءات', accessor: 'actions', render: (row: any) => (
            <div style={{display:'flex', gap:'10px'}}>
                <SecureAction module="fleet_operations" action="edit">
                    <button className="btn-main-glass blue" style={{ width: 'auto', margin: 0, padding: '5px 12px', fontSize: '11px' }} onClick={() => { setEditData(row); setModalOpen(true); }}>
                        تعديل
                    </button>
                </SecureAction>
            </div>
        )}
    ];

    const sidebarActions = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <SecureAction module="fleet_operations" action="create">
                <button className="btn-main-glass gold" onClick={() => { setEditData(null); setModalOpen(true); }}>
                    ➕ رحلة جديدة
                </button>
            </SecureAction>
            {logic.state.selectedIds.length > 0 && (
                <SecureAction module="fleet_operations" action="delete">
                    <button className="btn-main-glass red" onClick={() => {
                        if (confirm('تأكيد الحذف؟')) logic.mutations.deleteMutation.mutate(logic.state.selectedIds);
                    }}>
                        🗑️ حذف ({logic.state.selectedIds.length})
                    </button>
                </SecureAction>
            )}
        </div>
    );

    return (
        <MasterPage title="أوامر الشغل (الرحلات)" subtitle="متابعة حركة المناديب والمبيعات والتكاليف الخاصة بكل رحلة">
            <RawasiSidebarManager 
                actions={sidebarActions} 
                onSearch={logic.state.setSearchTerm} 
                onDateFilter={(start, end) => logic.state.setDateRange({start, end})} 
            />

            <div className="table-card">
                <RawasiSmartTable 
                    columns={columns}
                    data={logic.state.filteredData}
                    onSelectionChange={logic.state.setSelectedIds}
                    selectedIds={logic.state.selectedIds}
                    keyExtractor={(r: any) => r.id}
                />
            </div>

            {isModalOpen && (
                <FleetModal 
                    isOpen={isModalOpen}
                    onClose={() => setModalOpen(false)}
                    initialData={editData}
                    drivers={logic.state.drivers}
                    vehicles={logic.state.vehicles}
                    inventoryItems={logic.state.inventoryItems}
                    onSave={(data: any) => logic.mutations.saveMutation.mutate(data, {
                        onSuccess: () => setModalOpen(false)
                    })}
                    isSaving={logic.mutations.saveMutation.isPending}
                />
            )}
        </MasterPage>
    );
}
