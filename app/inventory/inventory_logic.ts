"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import { useToast } from '@/lib/toast-context'; 
import { useRealtimeListener } from '@/lib/useRealtimeSync';
import { syncAllWarehouseBalances, MAIN_WAREHOUSE_ID } from '@/lib/inventory_engine';

export function useInventoryLogic() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('11111111-1111-1111-1111-111111111111');
  const [warehouseInventory, setWarehouseInventory] = useState<any[]>([]);
  const [lastPrices, setLastPrices] = useState<Record<string, number>>({});
  const [fleetOperations, setFleetOperations] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('الكل');

  const [isModalOpen, setIsModalOpen] = useState(false); // For adding new product to catalog
  const [isActionModalOpen, setIsActionModalOpen] = useState(false); // For Quick Action In/Out
  const [currentRecord, setCurrentRecord] = useState<any>({
    code: '', name: '', unit: 'لتر', category: 'fuel', fuel_type: 'gasoline_91', current_quantity: 0, reorder_level: 500, suggested_price: 0, tax_rate: 15,
    expiry_date: '', batch_number: '', alert_before_days: 30
  });

  const categories = useMemo(() => {
    const cats = items.map(i => i.unit).filter(Boolean);
    return Array.from(new Set(cats));
  }, [items]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Catalog Items
      const { data } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false });
      if (data) setItems(data);
      
      // Fetch Warehouses
      const { data: whData } = await supabase.from('warehouses').select('*').eq('is_active', true).order('type');
      if (whData) setWarehouses(whData);
      
      // Fetch ALL warehouse inventory (to build summaries)
      const { data: invData } = await supabase.from('warehouse_inventory').select('*');
      if (invData) setWarehouseInventory(invData);

      // Fetch last purchase prices
      const { data: purchases } = await supabase
        .from('inventory_transactions')
        .select('item_id, unit_price')
        .eq('type', 'in')
        .order('transaction_date', { ascending: false });
        
      if (purchases) {
          const pricesMap: Record<string, number> = {};
          purchases.forEach(p => {
              if (pricesMap[p.item_id] === undefined && p.unit_price) {
                  pricesMap[p.item_id] = Number(p.unit_price);
              }
          });
          setLastPrices(pricesMap);
      }

      // Fetch partners
      const { data: pData } = await supabase.from('partners').select('*').order('name');
      if (pData) setPartners(pData);

      // Set fleet operations empty (legacy)
      setFleetOperations([]);

    } catch (err) {
      console.error("Error fetching inventory", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedWarehouseId]); // Re-fetch if warehouse changes

  // 🔄 مزامنة فورية ذكية لكافة شاشات المستودعات
  useRealtimeListener(['warehouse_inventory', 'inventory_items', 'inventory_transactions'], () => fetchData());

  const syncMutation = useMutation({
    mutationFn: async () => {
      await syncAllWarehouseBalances();
    },
    onSuccess: () => {
      showToast("تمت مزامنة وتحديث أرصدة كافة المستودعات بنجاح 🔄", "success");
      fetchData();
    },
    onError: (err: any) => showToast(`خطأ أثناء المزامنة: ${err.message}`, "error")
  });

  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  const enrichedItems = useMemo(() => {
    const localMeta = getLocalExpiryMetadata();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.map(item => {
      const whItem = warehouseInventory.find(wi => wi.item_id === item.id && wi.warehouse_id === selectedWarehouseId);
      let qty = whItem ? Math.max(0, Number(whItem.quantity)) : 0;
      if (!whItem && selectedWarehouseId === MAIN_WAREHOUSE_ID && warehouseInventory.length === 0) {
          qty = Number(item.current_quantity || 0);
      }

      const reorderLvl = Number(item.reorder_level) || 5;
      const isLow = qty <= reorderLvl;

      const cached = localMeta[item.id] || {};
      const expDate = item.expiry_date || cached.expiry_date || null;
      const batchNo = item.batch_number || cached.batch_number || null;
      const alertDays = Number(item.alert_before_days || cached.alert_before_days || 30);

      let daysLeft: number | null = null;
      let isExpired = false;
      let isNearExpiry = false;

      if (expDate) {
        const exp = new Date(expDate);
        exp.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isExpired = daysLeft <= 0;
        isNearExpiry = daysLeft > 0 && daysLeft <= alertDays;
      }

      return {
        ...item,
        available_qty: qty,
        reorder_level: reorderLvl,
        isLowStock: isLow,
        cost_price: Number(item.cost_price || 0),
        last_purchase_price: lastPrices[item.id] || Number(item.cost_price) || 0,
        avg_cost: 0,
        expiry_date: expDate,
        batch_number: batchNo,
        alert_before_days: alertDays,
        days_left: daysLeft,
        isExpired,
        isNearExpiry
      };
    }).filter(i => {
      const matchSearch = (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = filterCategory === 'الكل' || i.unit === filterCategory;
      const matchLowStock = !filterLowStockOnly || i.isLowStock;
      return matchSearch && matchCat && matchLowStock;
    });
  }, [items, warehouseInventory, searchQuery, filterCategory, filterLowStockOnly, selectedWarehouseId, lastPrices]);

  const lowStockCount = useMemo(() => {
    return enrichedItems.filter(i => i.isLowStock).length;
  }, [enrichedItems]);

  const enrichedWarehouses = useMemo(() => {
    return warehouses.map(wh => {
      const whItems = warehouseInventory.filter(wi => wi.warehouse_id === wh.id);
      let itemCount = 0;
      let totalQty = 0;
      let totalValue = 0;

      whItems.forEach(wi => {
         const qty = Number(wi.quantity || 0);
         if (qty > 0) {
           itemCount++;
           totalQty += qty;
           totalValue += qty * (lastPrices[wi.item_id] || 0);
         }
      });

      // Fallback للمستودع الرئيسي فقط في حال كان جدول أرصدة المستودعات فارغاً تماماً
      if (wh.id === MAIN_WAREHOUSE_ID && totalQty === 0 && warehouseInventory.length === 0) {
        items.forEach(item => {
           const qty = Number(item.current_quantity || 0);
           if (qty > 0) {
             itemCount++;
             totalQty += qty;
             totalValue += qty * (lastPrices[item.id] || 0);
           }
        });
      }

      return {
        ...wh,
        summary: { itemCount, totalQty, totalValue }
      };
    });
  }, [warehouses, warehouseInventory, items, lastPrices]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const cleanPayload: any = {
        code: payload.code || null,
        name: payload.name,
        unit: payload.unit || 'لتر',
        category: payload.category || 'fuel',
        fuel_type: payload.fuel_type || null,
        current_quantity: Number(payload.current_quantity) || 0,
        reorder_level: Number(payload.reorder_level) || 500,
        cost_price: Number(payload.cost_price) || 0,
        suggested_price: Number(payload.suggested_price) || 0,
        default_price: Number(payload.suggested_price) || 0,
        tax_rate: (payload.tax_rate !== undefined && payload.tax_rate !== null) ? Number(payload.tax_rate) : 15
      };

      if (payload.barcode) cleanPayload.barcode = payload.barcode;
      if (payload.item_type) cleanPayload.item_type = payload.item_type;

      // ⏳ دعم حقول الصلاحية والتشغيلة مع حماية Fallback
      if (payload.expiry_date) cleanPayload.expiry_date = payload.expiry_date;
      if (payload.batch_number) cleanPayload.batch_number = payload.batch_number;
      if (payload.alert_before_days) cleanPayload.alert_before_days = Number(payload.alert_before_days);

      const saveLocally = (id: string) => {
        saveLocalExpiryMetadata(id, {
          expiry_date: payload.expiry_date || undefined,
          batch_number: payload.batch_number || undefined,
          alert_before_days: Number(payload.alert_before_days) || 30
        });
      };

      if (payload.id) {
        saveLocally(payload.id);
        const { error } = await supabase.from('inventory_items').update(cleanPayload).eq('id', payload.id);
        if (error) {
          // If error is missing column (42703), retry without expiry columns
          if (error.code === '42703') {
            delete cleanPayload.expiry_date;
            delete cleanPayload.batch_number;
            delete cleanPayload.alert_before_days;
            await supabase.from('inventory_items').update(cleanPayload).eq('id', payload.id);
          } else {
            throw error;
          }
        }
      } else {
        let insertedItem: any = null;
        const { data, error } = await supabase.from('inventory_items').insert([cleanPayload]).select().single();
        if (error) {
          if (error.code === '42703') {
            delete cleanPayload.expiry_date;
            delete cleanPayload.batch_number;
            delete cleanPayload.alert_before_days;
            const res2 = await supabase.from('inventory_items').insert([cleanPayload]).select().single();
            if (res2.error) throw res2.error;
            insertedItem = res2.data;
          } else {
            throw error;
          }
        } else {
          insertedItem = data;
        }

        if (insertedItem) {
          saveLocally(insertedItem.id);
        }

        // 📦 إذا تم إدخال رصيد افتتاحي أولي أكبر من صفر، ننشئ حركة رصيد أول المدة للمستودع الرئيسي تلقائياً
        if (insertedItem && Number(cleanPayload.current_quantity) > 0) {
          const openQty = Number(cleanPayload.current_quantity);
          const openCost = Number(cleanPayload.cost_price) || 0;
          await supabase.from('inventory_transactions').insert([{
            transaction_number: `TX-OPEN-${Date.now().toString().slice(-6)}`,
            transaction_date: new Date().toISOString().split('T')[0],
            item_id: insertedItem.id,
            warehouse_id: MAIN_WAREHOUSE_ID,
            type: 'in',
            quantity: openQty,
            unit_price: openCost,
            total_price: openQty * openCost,
            notes: 'رصيد افتتاحي أول المدة عند إنشاء الصنف',
            status: 'approved'
          }]);

          await supabase.from('warehouse_inventory').upsert([{
            warehouse_id: MAIN_WAREHOUSE_ID,
            item_id: insertedItem.id,
            quantity: openQty
          }], { onConflict: 'warehouse_id,item_id' });
        }
      }
    },
    onSuccess: () => {
      showToast("تم حفظ الصنف بنجاح 📦", "success");
      setIsModalOpen(false);
      fetchData();
    },
    onError: (err: any) => showToast(`خطأ أثناء الحفظ: ${err.message}`, "error")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast("تم حذف الصنف بنجاح 🗑️", "success");
      fetchData();
    },
    onError: (err: any) => showToast(`فشل الحذف: ${err.message}`, "error")
  });

  return {
    items: enrichedItems,
    categories,
    isLoading,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterLowStockOnly, setFilterLowStockOnly,
    lowStockCount,
    isModalOpen, setIsModalOpen,
    isActionModalOpen, setIsActionModalOpen,
    currentRecord, setCurrentRecord,
    warehouses: enrichedWarehouses,
    selectedWarehouseId, setSelectedWarehouseId,
    fleetOperations, partners,
    handleSave: (customRecord?: any) => {
      const rec = (customRecord && customRecord.name !== undefined) ? customRecord : currentRecord;
      if (!rec?.name?.trim()) return showToast("اسم الصنف مطلوب!", "error");
      saveMutation.mutate(rec);
    },
    deleteItem: (id: string) => deleteMutation.mutate(id),
    isSaving: saveMutation.isPending,
    refreshData: fetchData,
    handleSyncBalances: () => syncMutation.mutate(),
    isSyncing: syncMutation.isPending
  };
}
