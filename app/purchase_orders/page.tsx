"use client";

import React, { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import SecureAction from '@/components/SecureAction';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import { useConfirm } from '@/components/ConfirmContext';
import PurchaseOrderModal from './PurchaseOrderModal';
import { usePurchaseOrdersLogic } from './purchase_orders_logic';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { showGlobalToast } from '@/lib/toast-context';
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
      render: (row: any) => <span style={{ fontWeight: 900, color: '#00E5FF' }}>{row.transaction_number}</span>
    },
    { key: 'transaction_date', header: 'التاريخ',
      render: (row: any) => <span style={{ color: '#94A3B8' }}>{new Date(row.transaction_date).toLocaleDateString('ar-SA')}</span>
    },
    { key: 'partner', header: 'المورد',
      render: (row: any) => <span style={{ fontWeight: 900, color: '#F8FAFC' }}>{row.partners?.name || '-'}</span>
    },
    { key: 'item', header: 'الأصناف المشتراة',
      render: (row: any) => (
        <div>
           {row.items?.map((item: any, i: number) => (
               <div key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, color: '#F8FAFC' }}>{item.inventory_items?.name}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginRight: '5px' }}>({item.quantity} {item.inventory_items?.unit || 'حبة'})</span>
               </div>
           ))}
        </div>
      )
    },
    { key: 'amount', header: 'الإجمالي',
      render: (row: any) => {
        return <span style={{ fontWeight: 900, color: '#10B981' }}>{formatCurrency(row.total_amount)}</span>;
      }
    },
    { key: 'status', header: 'الحالة',
      render: (row: any) => (
        <span style={{ 
            background: (['approved', 'معتمد', 'مرحل'].includes(row.status)) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
            color: (['approved', 'معتمد', 'مرحل'].includes(row.status)) ? '#10B981' : '#F59E0B',
            border: `1px solid ${(['approved', 'معتمد', 'مرحل'].includes(row.status)) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 
        }}>
            {(['approved', 'معتمد', 'مرحل'].includes(row.status)) ? 'مستلم ✅' : 'قيد الانتظار ⏳'}
        </span>
      )
    },
    { key: 'actions', header: 'الإجراءات',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['pending', 'مسودة', 'قيد الانتظار'].includes(row.status)) && (
            <>
              <SecureAction module="inventory" action="view">
                <button 
                  onClick={() => logic.setPrintingTransaction(row)}
                  className="btn-main-glass"
                  style={{ width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0, background: '#64748b', color: 'white' }}
                >
                  🖨️ طباعة
                </button>
              </SecureAction>

              <SecureAction module="inventory" action="edit">
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
              <SecureAction module="inventory" action="delete">
                <button 
                  onClick={() => {
                    showConfirm({
                      title: 'تأكيد الحذف',
                      message: 'هل أنت متأكد من حذف هذا الأمر؟ (سيتم الحذف نهائياً)',
                      type: 'danger',
                      onConfirm: async () => {
                        await supabase.from('inventory_transactions').delete().in('id', row.ids);
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
          {(['approved', 'معتمد', 'مرحل'].includes(row.status)) && (
            <>
              <SecureAction module="inventory" action="view">
                <button 
                  onClick={() => logic.setPrintingTransaction(row)}
                  className="btn-main-glass"
                  style={{ width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0, background: '#64748b', color: 'white' }}
                >
                  🖨️ طباعة
                </button>
              </SecureAction>
              <SecureAction module="inventory" action="post">
                <button 
                  onClick={() => logic.handleCreateEntitlement(row)}
                  className="btn-main-glass"
                  style={{ background: '#3b82f6', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                  title="ينقلك لإنشاء فاتورة من مورد لتسجيل استحقاق مالي لهذا الأمر المورد"
                >
                  🧾 إنشاء استحقاق مصروف
                </button>
              </SecureAction>
              <SecureAction module="inventory" action="post">
                <button 
                  onClick={() => logic.handleUnapproveTransaction(row)}
                  className="btn-main-glass"
                  style={{ background: '#eab308', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                >
                  ↩ إلغاء الاستلام
                </button>
              </SecureAction>
              <SecureAction module="inventory" action="edit">
                <button 
                  onClick={() => showGlobalToast('يجب فك الاعتماد أولاً لتتمكن من التعديل', 'warning')}
                  className="btn-main-glass"
                  style={{ background: '#94a3b8', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                  title="لا يمكن تعديل أمر شراء معتمد، قم بفك الاعتماد أولاً"
                >
                  ✏️ تعديل
                </button>
              </SecureAction>
              <SecureAction module="inventory" action="create">
                <button 
                  onClick={() => window.location.href = '/PaymentVouchers'}
                  className="btn-main-glass"
                  style={{ background: '#8b5cf6', color: 'white', width: 'auto', padding: '5px 12px', fontSize: '11px', margin: 0 }}
                >
                  💸 سند صرف
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
      <SecureAction module="inventory" action="create">
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

      <PurchaseOrderModal 
        isOpen={logic.isActionModalOpen}
        onClose={() => {
          logic.setIsActionModalOpen(false);
          logic.setEditingTransaction(null);
        }}
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