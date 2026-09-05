"use client";
import React, { useState, useEffect } from 'react';
import { useInventoryLogic } from './inventory_logic';
import { THEME } from '@/lib/theme';
import MasterPage from '@/components/MasterPage';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import RawasiSmartTable from '@/components/rawasismarttable';
import LoadingScreen from '@/components/LoadingScreen';
import SecureAction from '@/components/SecureAction';
import { useConfirm } from '@/components/ConfirmContext';
import InventoryActionModal from '@/components/InventoryActionModal';
import InventoryItemModal from '@/components/InventoryItemModal'; 

export default function InventoryPage() {
  const logic = useInventoryLogic();
  const { showConfirm } = useConfirm();
  
  const [mounted, setMounted] = useState(false);
  const [actionType, setActionType] = useState<'in' | 'out'>('in');

  useEffect(() => setMounted(true), []);

  const columns = [
    { key: 'code', label: 'كود الصنف', type: 'text',
      render: (row: any) => <span style={{ fontWeight: 900, color: '#64748b' }}>{row.code || '-'}</span>
    },
    { key: 'name', label: 'اسم الصنف', type: 'text', 
      render: (row: any) => (
        <span style={{ fontWeight: 900, color: '#0f172a' }}>{row.name}</span>
      )
    },
    { key: 'last_purchase_price', label: 'آخر سعر شراء', type: 'number',
      render: (row: any) => (
        <span style={{ fontWeight: 900, color: '#16a34a' }}>
          {row.last_purchase_price > 0 ? `${row.last_purchase_price} ر.س` : <span style={{ color: '#94a3b8' }}>-</span>}
        </span>
      )
    },
    { key: 'reorder_level', label: 'حد إعادة الطلب', type: 'number' },
    { key: 'available_qty', label: 'الكمية المتاحة', type: 'number',
      render: (row: any) => {
        const isLowStock = row.available_qty <= row.reorder_level;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '15px', fontWeight: 900, 
                color: isLowStock ? '#dc2626' : (row.available_qty > 0 ? '#16a34a' : '#475569') 
              }}>
                {row.available_qty}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{row.unit || 'حبة'}</span>
            </div>
            {isLowStock && (
              <span style={{ fontSize: '10px', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                يجب إعادة الطلب
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions', label: 'الإجراءات', type: 'actions',
      render: (row: any) => (
        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
          <SecureAction module="inventory" action="edit">
            <button 
              className="btn-main-glass" 
              style={{ background: '#3b82f6', color: 'white', padding: '5px 10px', fontSize: '11px' }}
              onClick={() => {
                logic.setCurrentRecord(row);
                logic.setIsModalOpen(true);
              }}
            >
              تعديل الصنف
            </button>
          </SecureAction>
          <SecureAction module="inventory" action="delete">
            <button 
              className="btn-main-glass" 
              style={{ background: '#ef4444', color: 'white', padding: '5px 10px', fontSize: '11px' }}
              onClick={() => {
                showConfirm({
                  title: 'حذف الصنف',
                  message: `هل أنت متأكد من حذف ${row.name}؟`,
                  type: 'danger',
                  onConfirm: () => logic.deleteItem(row.id)
                });
              }}
            >
              حذف
            </button>
          </SecureAction>
        </div>
      )
    }
  ];

  if (!mounted) return null;

  return (
    <>
      <RawasiSidebarManager />
      <div className="clean-page">
        <MasterPage 
          icon="📦" 
          title="دليل الأصناف والمخزون" 
          subtitle="إدارة الأصناف، متابعة الكميات المتوفرة في المستودعات وتنبيهات النواقص"
        >
          {logic.isLoading ? (
            <LoadingScreen message="جاري تحميل الأصناف..." fullScreen={false} />
          ) : (
            <>
              {/* Warehouse Selection Cards */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '15px', marginBottom: '20px'
              }}>
                {logic.warehouses.map(wh => (
                  <div 
                    key={wh.id} 
                    onClick={() => logic.setSelectedWarehouseId(wh.id)}
                    style={{
                      background: logic.selectedWarehouseId === wh.id ? THEME.primary : 'rgba(255,255,255,0.7)',
                      color: logic.selectedWarehouseId === wh.id ? 'white' : THEME.primary,
                      border: `1px solid ${logic.selectedWarehouseId === wh.id ? 'transparent' : THEME.primary + '50'}`,
                      borderRadius: '16px', padding: '15px', cursor: 'pointer',
                      textAlign: 'center', transition: 'all 0.3s ease',
                      boxShadow: logic.selectedWarehouseId === wh.id ? '0 10px 20px rgba(0,0,0,0.1)' : 'none',
                      transform: logic.selectedWarehouseId === wh.id ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '5px' }}>
                      {wh.type === 'main' ? '🏢' : (wh.type === 'vehicle' ? '🚚' : '🏭')}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px' }}>{wh.name}</div>
                    
                    {wh.summary && (
                      <div style={{ 
                        display: 'flex', flexDirection: 'column', gap: '4px', 
                        fontSize: '11px', 
                        background: logic.selectedWarehouseId === wh.id ? 'rgba(255,255,255,0.15)' : 'rgba(28, 115, 171, 0.05)',
                        padding: '8px', borderRadius: '10px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>عدد الأصناف:</span>
                          <span style={{ fontWeight: 900, fontSize: '12px' }}>{wh.summary.itemCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>إجمالي الكميات:</span>
                          <span style={{ fontWeight: 900, fontSize: '12px' }}>{wh.summary.totalQty}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>القيمة التقديرية:</span>
                          <span style={{ fontWeight: 900, fontSize: '12px', color: logic.selectedWarehouseId === wh.id ? '#a7f3d0' : '#16a34a' }}>
                            {wh.summary.totalValue.toLocaleString()} ر.س
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Actions Filter Bar */}
              <div className="apple-glass-filter-bar">
                <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                  
                  <SecureAction module="inventory" action="create">
                    <button 
                      onClick={() => { setActionType('out'); logic.setIsActionModalOpen(true); }}
                      className="btn-main-glass" 
                      style={{ background: '#ef4444', color: 'white', fontSize: '14px' }}
                    >
                      📤 صرف لمندوب (Out)
                    </button>
                  </SecureAction>
                  
                  <SecureAction module="inventory" action="create">
                    <button 
                      onClick={() => { logic.setCurrentRecord(null); logic.setIsModalOpen(true); }}
                      className="btn-main-glass" 
                      style={{ background: THEME.primary, color: 'white', fontSize: '14px' }}
                    >
                      ➕ تعريف صنف جديد
                    </button>
                  </SecureAction>
                </div>

                <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                  <div style={{ flex: 1, maxWidth: '300px' }}>
                    <input 
                      type="text"
                      placeholder="ابحث بالاسم أو الكود..." 
                      className="glass-input-field" 
                      value={logic.searchQuery} 
                      onChange={e => logic.setSearchQuery(e.target.value)} 
                    />
                  </div>
                  <div>
                    <select 
                      className="glass-input-field" 
                      value={logic.filterCategory} 
                      onChange={e => logic.setFilterCategory(e.target.value)}
                    >
                      <option value="الكل">جميع التصنيفات</option>
                      {logic.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <RawasiSmartTable 
                columns={columns} 
                data={logic.filteredItems} 
                keyExtractor={(r: any) => r.id}
                pagination={true}
                itemsPerPage={20}
              />

              <InventoryItemModal 
                isOpen={logic.isModalOpen}
                onClose={() => { logic.setIsModalOpen(false); logic.setCurrentRecord(null); }}
                record={logic.currentRecord}
                onSave={logic.fetchItems}
              />

              <InventoryActionModal 
                isOpen={logic.isActionModalOpen}
                onClose={() => logic.setIsActionModalOpen(false)}
                type={actionType}
                warehouseId={logic.selectedWarehouseId}
                onSave={logic.fetchItems}
              />
            </>
          )}
        </MasterPage>
      </div>
    </>
  );
}