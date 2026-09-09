"use client";

import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import SecureAction from '@/components/SecureAction';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import { useConfirm } from '@/components/ConfirmContext';
import InventoryActionModal from '@/components/InventoryActionModal';
import { usePurchaseOrdersLogic } from './purchase_orders_logic';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { useQuery } from '@tanstack/react-query';

import PurchaseOrderPrintModal from './PurchaseOrderPrintModal';

export default function PurchaseOrdersPage() {
  const logic = usePurchaseOrdersLogic();
  const { showConfirm } = useConfirm();

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory_items_for_po'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_items').select('*').order('name');
      return data || [];
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);
  };

  const columns = [
    { key: 'transaction_number', header: 'رقم الأمر',
      render: (row: any) => <span style={{ fontWeight: 'bold', color: '#1C73AB' }}>{row.transaction_number}</span>
    },
    { key: 'transaction_date', header: 'التاريخ',
      render: (row: any) => new Date(row.transaction_date).toLocaleDateString('ar-SA')
    },
    { key: 'partner', header: 'المورد',
      render: (row: any) => <span style={{ fontWeight: 900, color: '#334155' }}>{row.partners?.name || '-'}</span>
    },
    { key: 'item', header: 'الصنف المشتري',
      render: (row: any) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#122946' }}>{row.inventory_items?.name}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{row.quantity} {row.inventory_items?.unit || 'حبة'}</div>
        </div>
      )
    },
    { key: 'amount', header: 'الإجمالي',
      render: (row: any) => {
        const total = (row.quantity * row.unit_price) + (row.tax_amount || 0);
        return <span style={{ fontWeight: 900, color: '#16a34a' }}>{formatCurrency(total)}</span>;
      }
    },
    { key: 'status', header: 'الحالة',
      render: (row: any) => (
        <span style={{ 
            background: row.status === 'approved' ? '#dcfce7' : '#fef9c3', 
            color: row.status === 'approved' ? '#166534' : '#854d0e',
            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' 
        }}>
            {row.status === 'approved' ? 'مستلم 📥' : 'معتمد (قيد الانتظار) ⏳'}
        </span>
      )
    },
    { key: 'actions', header: 'الإجراءات',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {row.status === 'pending' && (
            <>
              <SecureAction module="purchase_orders" action="view">
                <button 
                  onClick={() => logic.setPrintingTransaction(row)}
                  className="btn-main-glass"
                  style={{ width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0, background: '#64748b', color: 'white' }}
                >
                  🖨️ طباعة
                </button>
              </SecureAction>
              <SecureAction module="purchase_orders" action="post">
                <button 
                  onClick={() => logic.handleApproveTransaction(row)}
                  className="btn-main-glass"
                  style={{ width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0, background: '#16a34a', color: 'white' }}
                >
                  📥 استلام بالأنظمة
                </button>
              </SecureAction>
              <SecureAction module="purchase_orders" action="edit">
                <button 
                  onClick={() => {
                    logic.setEditingTransaction(row);
                    logic.setIsActionModalOpen(true);
                  }}
                  className="btn-main-glass"
                  style={{ background: '#3b82f6', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                >
                  ✏️ تعديل
                </button>
              </SecureAction>
              <SecureAction module="purchase_orders" action="delete">
                <button 
                  onClick={() => {
                    showConfirm({
                      title: 'تأكيد الحذف',
                      message: 'هل أنت متأكد من حذف مسودة أمر الشراء؟',
                      type: 'danger',
                      onConfirm: async () => {
                        await supabase.from('inventory_transactions').delete().eq('id', row.id);
                        logic.fetchTransactions();
                      }
                    });
                  }}
                  className="btn-main-glass"
                  style={{ background: '#ef4444', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                >
                  🗑️ حذف
                </button>
              </SecureAction>
            </>
          )}
          {row.status === 'approved' && (
            <>
              <SecureAction module="purchase_orders" action="view">
                <button 
                  onClick={() => logic.setPrintingTransaction(row)}
                  className="btn-main-glass"
                  style={{ width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0, background: '#64748b', color: 'white' }}
                >
                  🖨️ طباعة
                </button>
              </SecureAction>
              <SecureAction module="purchase_orders" action="post">
                <button 
                  onClick={() => logic.handleCreateEntitlement(row)}
                  className="btn-main-glass"
                  style={{ background: '#3b82f6', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                  title="نقل المديونية من فواتير قيد الاستلام إلى حساب المورد"
                >
                  🧾 سند استحقاق الصرف
                </button>
              </SecureAction>
              <SecureAction module="purchase_orders" action="post">
                <button 
                  onClick={() => logic.handleUnapproveTransaction(row)}
                  className="btn-main-glass"
                  style={{ background: '#eab308', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                >
                  ↩️ فك الاستلام
                </button>
              </SecureAction>
            </>
          )}
        </div>
      )
    }
  ];

  const sidebarActions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <SecureAction module="purchase_orders" action="create">
        <button 
          onClick={() => logic.setIsActionModalOpen(true)}
          className="btn-main-glass gold"
        >
          ➕ إضافة أمر شراء جديد
        </button>
      </SecureAction>
    </div>
  );

  return (
    <MasterPage 
      title="أوامر الشراء (المشتريات)" 
      subtitle="إدارة فواتير الموردين ومشتريات المستودع" 
      icon="🛒"
    >
      <RawasiSidebarManager 
          actions={sidebarActions} 
          onSearch={logic.setSearchQuery} 
      />

      {logic.isLoading ? (
        <LoadingScreen message="جاري تحميل أوامر الشراء..." fullScreen={false} />
      ) : (
        <div style={{ marginTop: '20px' }}>
          <RawasiSmartTable 
            columns={columns} 
            data={logic.transactions} 
          />
        </div>
      )}

      <InventoryActionModal 
        isOpen={logic.isActionModalOpen}
        onClose={() => {
          logic.setIsActionModalOpen(false);
          logic.setEditingTransaction(null);
        }}
        actionType="in"
        items={inventoryItems}
        initialData={logic.editingTransaction}
        onSuccess={() => logic.fetchTransactions()}
      />

      <PurchaseOrderPrintModal
        isOpen={!!logic.printingTransaction}
        onClose={() => logic.setPrintingTransaction(null)}
        record={logic.printingTransaction}
      />
    </MasterPage>
  );
}