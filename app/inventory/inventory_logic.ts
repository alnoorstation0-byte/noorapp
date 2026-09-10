"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import { useToast } from '@/lib/toast-context'; 

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
    code: '', name: '', unit: 'حبة', current_quantity: 0, reorder_level: 5
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

      // Fetch active fleet operations
      const { data: opData } = await supabase.from('fleet_operations').select('*, vehicle:fleet_vehicles(plate_number), driver:partners(name), description').in('status', ['draft', 'pending', 'active']).order('created_at', { ascending: false });
      if (opData) setFleetOperations(opData);

    } catch (err) {
      console.error("Error fetching inventory", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedWarehouseId]); // Re-fetch if warehouse changes

  const enrichedItems = useMemo(() => {
    return items.map(item => {
      const whItem = warehouseInventory.find(wi => wi.item_id === item.id && wi.warehouse_id === selectedWarehouseId);
      // If we are looking at the main warehouse, fallback to current_quantity if warehouse_inventory is empty
      // because we just migrated. Otherwise use 0.
      let qty = whItem ? Number(whItem.quantity) : 0;
      if (!whItem && selectedWarehouseId === '11111111-1111-1111-1111-111111111111') {
          qty = Number(item.current_quantity || 0);
      }

      return {
        ...item,
        available_qty: qty,
        last_purchase_price: lastPrices[item.id] || 0,
        avg_cost: 0
      };
    }).filter(i => {
      const matchSearch = (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = filterCategory === 'الكل' || i.unit === filterCategory;
      return matchSearch && matchCat;
    });
  }, [items, warehouseInventory, searchQuery, filterCategory, selectedWarehouseId, lastPrices]);

  const enrichedWarehouses = useMemo(() => {
    return warehouses.map(wh => {
      const whItems = warehouseInventory.filter(wi => wi.warehouse_id === wh.id);
      let itemCount = 0;
      let totalQty = 0;
      let totalValue = 0;

      if (wh.id === '11111111-1111-1111-1111-111111111111' && whItems.length === 0) {
        items.forEach(item => {
           const qty = Number(item.current_quantity || 0);
           if (qty > 0) {
             itemCount++;
             totalQty += qty;
             totalValue += qty * (lastPrices[item.id] || 0);
           }
        });
      } else {
        whItems.forEach(wi => {
           const qty = Number(wi.quantity || 0);
           if (qty > 0) {
             itemCount++;
             totalQty += qty;
             totalValue += qty * (lastPrices[wi.item_id] || 0);
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
      const cleanPayload = {
        code: payload.code,
        name: payload.name,
        unit: payload.unit,
        current_quantity: payload.current_quantity || 0,
        reorder_level: payload.reorder_level || 5
      };

      if (payload.id) {
        const { error } = await supabase.from('inventory_items').update(cleanPayload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_items').insert([cleanPayload]);
        if (error) throw error;
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
    isModalOpen, setIsModalOpen,
    isActionModalOpen, setIsActionModalOpen,
    currentRecord, setCurrentRecord,
    warehouses: enrichedWarehouses,
    selectedWarehouseId, setSelectedWarehouseId,
    fleetOperations, partners,
    handleSave: () => {
      if (!currentRecord.name) return showToast("اسم الصنف مطلوب!", "error");
      saveMutation.mutate(currentRecord);
    },
    deleteItem: (id: string) => deleteMutation.mutate(id),
    isSaving: saveMutation.isPending,
    refreshData: fetchData
  };
}
