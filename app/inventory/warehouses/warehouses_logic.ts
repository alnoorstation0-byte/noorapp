"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export interface StationTank {
  id?: string;
  tank_number: string;
  fuel_type: string;
  capacity_liters: number;
  current_level?: number;
}

export interface StationPump {
  id?: string;
  warehouse_id?: string;
  pump_number: string;
  pump_name: string;
  fuel_type: string;
  fuel_item_id?: string | null;
  unit_price: number;
  current_meter: number;
  is_active: boolean;
}

export function useWarehousesLogic() {
  const { showToast } = useToast();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [fuelPumps, setFuelPumps] = useState<any[]>([]);
  const [fuelItems, setFuelItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // سجل المحطة الحالي قيد التعديل أو الإضافة
  const [currentRecord, setCurrentRecord] = useState<any>({
    name: '',
    type: 'pos',
    is_active: true,
    location: '',
    phone: '',
    manager_name: '',
    description: '',
    notes: '',
    tanks: [] as StationTank[],
    pumps: [] as StationPump[]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [whRes, pumpsRes, itemsRes] = await Promise.all([
        supabase.from('warehouses').select('*').order('type', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('fuel_pumps').select('*').order('pump_number', { ascending: true }),
        supabase.from('inventory_items').select('id, name, fuel_type, default_price, unit, category').eq('is_active', true)
      ]);

      if (whRes.error) throw whRes.error;
      if (pumpsRes.error) throw pumpsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (whRes.data) setWarehouses(whRes.data);
      if (pumpsRes.data) setFuelPumps(pumpsRes.data);
      if (itemsRes.data) setFuelItems(itemsRes.data);
    } catch (err: any) {
      console.error(err);
      showToast(`فشل جلب بيانات المحطات: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // دمج بيانات الخزانات والمضخات لكل محطة لسهولة العرض في الجدول والإحصائيات
  const enrichedWarehouses = useMemo(() => {
    return warehouses.map(wh => {
      let tanks: StationTank[] = [];
      if (wh.description) {
        try {
          const parsed = JSON.parse(wh.description);
          if (Array.isArray(parsed?.tanks)) {
            tanks = parsed.tanks;
          }
        } catch {
          if (wh.tank_capacity_liters > 0 || wh.fuel_type) {
            tanks = [{
              tank_number: 'خزان 1',
              fuel_type: wh.fuel_type || 'بنزين 91',
              capacity_liters: Number(wh.tank_capacity_liters) || 0
            }];
          }
        }
      } else if (wh.tank_capacity_liters > 0 || wh.fuel_type) {
        tanks = [{
          tank_number: 'خزان 1',
          fuel_type: wh.fuel_type || 'بنزين 91',
          capacity_liters: Number(wh.tank_capacity_liters) || 0
        }];
      }

      const stationPumps = fuelPumps.filter(p => p.warehouse_id === wh.id);

      return {
        ...wh,
        tanks,
        pumps: stationPumps,
        tanksCount: tanks.length,
        pumpsCount: stationPumps.length,
        totalTanksCapacity: tanks.reduce((sum, t) => sum + (Number(t.capacity_liters) || 0), 0)
      };
    });
  }, [warehouses, fuelPumps]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      // 1. تجهيز بيانات الخزانات لحفظها داخل description كـ JSON مهيكل
      const tanksData: StationTank[] = (payload.tanks || []).map((t: any, idx: number) => ({
        tank_number: t.tank_number || `خزان ${idx + 1}`,
        fuel_type: t.fuel_type || 'بنزين 91',
        capacity_liters: Number(t.capacity_liters) || 0,
        current_level: Number(t.current_level) || 0
      }));

      const totalCapacity = tanksData.reduce((sum, t) => sum + (Number(t.capacity_liters) || 0), 0);
      const primaryFuelType = tanksData.length > 0 ? [...new Set(tanksData.map(t => t.fuel_type))].join('، ') : null;

      const descriptionObject = {
        notes: payload.notes || '',
        tanks: tanksData
      };

      const dataToSave = {
        name: payload.name,
        type: payload.type || 'pos',
        is_active: payload.is_active ?? true,
        location: payload.location || null,
        phone: payload.phone || null,
        manager_name: payload.manager_name || null,
        description: JSON.stringify(descriptionObject),
        tank_capacity_liters: totalCapacity,
        fuel_type: primaryFuelType
      };

      let savedStationId = payload.id;

      if (payload.id) {
        const { error } = await supabase.from('warehouses').update(dataToSave).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { data: newWh, error } = await supabase.from('warehouses').insert([dataToSave]).select().single();
        if (error) throw error;
        if (newWh) savedStationId = newWh.id;
      }

      // 2. مزامنة وحفظ مضخات الوقود التابعة لهذه المحطة في جدول fuel_pumps
      if (savedStationId && Array.isArray(payload.pumps)) {
        const existingPumps = fuelPumps.filter(p => p.warehouse_id === savedStationId);
        const existingIds = new Set(existingPumps.map(p => p.id));
        const keptPumpIds = new Set<string>();
        const pumpErrors: string[] = [];

        for (const pump of payload.pumps) {
          const matchedItem = fuelItems.find(i => 
            (i.name && i.name.includes(pump.fuel_type)) || 
            (i.fuel_type && i.fuel_type === pump.fuel_type)
          );

          const pumpRecord: any = {
            warehouse_id: savedStationId,
            pump_number: pump.pump_number || '01',
            pump_name: pump.pump_name || `مضخة (${pump.fuel_type})`,
            fuel_type: pump.fuel_type || 'بنزين 91',
            fuel_item_id: matchedItem?.id || pump.fuel_item_id || null,
            unit_price: Number(pump.unit_price) > 0 ? Number(pump.unit_price) : (Number(matchedItem?.default_price) || 2.18),
            current_meter: Number(pump.current_meter) || 0,
            is_active: pump.is_active ?? true
          };

          if (pump.id && existingIds.has(pump.id)) {
            keptPumpIds.add(pump.id);
            const { error: pErr } = await supabase.from('fuel_pumps').update(pumpRecord).eq('id', pump.id);
            if (pErr) pumpErrors.push(`تحديث مضخة ${pump.pump_number}: ${pErr.message}`);
          } else {
            const { data: insertedP, error: pErr } = await supabase.from('fuel_pumps').insert([pumpRecord]).select().single();
            if (pErr) pumpErrors.push(`إضافة مضخة ${pump.pump_number}: ${pErr.message}`);
            if (insertedP) keptPumpIds.add(insertedP.id);
          }
        }

        const pumpsToDelete = existingPumps.filter(p => !keptPumpIds.has(p.id)).map(p => p.id);
        if (pumpsToDelete.length > 0) {
          const { error: delErr } = await supabase.from('fuel_pumps').delete().in('id', pumpsToDelete);
          if (delErr) pumpErrors.push(`حذف مضخات قديمة: ${delErr.message}`);
        }

        if (pumpErrors.length > 0) {
          throw new Error(`تم حفظ بيانات المحطة لكن فشلت بعض عمليات المضخات:\n${pumpErrors.join('\n')}`);
        }
      }
    },
    onSuccess: () => {
      showToast("تم حفظ بيانات المحطة والخزانات والمضخات بنجاح ⛽✅", "success");
      setIsModalOpen(false);
      fetchData();
    },
    onError: (err: any) => showToast(`خطأ أثناء الحفظ: ${err.message}`, "error")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('fuel_pumps').delete().eq('warehouse_id', id);
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast('تم حذف المحطة ومضخاتها بنجاح', 'success');
      fetchData();
    },
    onError: (err: any) => showToast('لا يمكن الحذف، قد تكون المحطة مرتبطة بحركات مخزنية أو فواتير: ' + err.message, 'error')
  });

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المحطة وكافة الخزانات والمضخات التابعة لها؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setCurrentRecord({
      name: '',
      type: 'pos',
      is_active: true,
      location: '',
      phone: '',
      manager_name: '',
      description: '',
      notes: '',
      tanks: [
        { tank_number: 'خزان 1', fuel_type: 'بنزين 91', capacity_liters: 45000 },
        { tank_number: 'خزان 2', fuel_type: 'بنزين 95', capacity_liters: 30000 },
        { tank_number: 'خزان 3', fuel_type: 'ديزل', capacity_liters: 50000 }
      ],
      pumps: [
        { pump_number: '01', pump_name: 'مضخة 1 (بنزين 91)', fuel_type: 'بنزين 91', unit_price: 2.18, current_meter: 0, is_active: true },
        { pump_number: '02', pump_name: 'مضخة 2 (بنزين 91)', fuel_type: 'بنزين 91', unit_price: 2.18, current_meter: 0, is_active: true },
        { pump_number: '03', pump_name: 'مضخة 3 (بنزين 95)', fuel_type: 'بنزين 95', unit_price: 2.33, current_meter: 0, is_active: true },
        { pump_number: '04', pump_name: 'مضخة 4 (ديزل)', fuel_type: 'ديزل', unit_price: 1.15, current_meter: 0, is_active: true }
      ]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (w: any) => {
    let tanks: StationTank[] = [];
    let notes = '';
    if (w.description) {
      try {
        const parsed = JSON.parse(w.description);
        if (Array.isArray(parsed?.tanks)) tanks = parsed.tanks;
        notes = parsed?.notes || '';
      } catch {
        notes = w.description || '';
        if (w.tank_capacity_liters > 0 || w.fuel_type) {
          tanks = [{
            tank_number: 'خزان 1',
            fuel_type: w.fuel_type || 'بنزين 91',
            capacity_liters: Number(w.tank_capacity_liters) || 0
          }];
        }
      }
    } else if (w.tank_capacity_liters > 0 || w.fuel_type) {
      tanks = [{
        tank_number: 'خزان 1',
        fuel_type: w.fuel_type || 'بنزين 91',
        capacity_liters: Number(w.tank_capacity_liters) || 0
      }];
    }

    const stationPumps = fuelPumps.filter(p => p.warehouse_id === w.id);

    setCurrentRecord({
      ...w,
      notes,
      tanks,
      pumps: stationPumps
    });
    setIsModalOpen(true);
  };

  const handleAddTank = () => {
    const nextNum = (currentRecord.tanks?.length || 0) + 1;
    setCurrentRecord((prev: any) => ({
      ...prev,
      tanks: [
        ...(prev.tanks || []),
        { tank_number: `خزان ${nextNum}`, fuel_type: 'بنزين 91', capacity_liters: 40000 }
      ]
    }));
  };

  const handleUpdateTank = (index: number, field: string, value: any) => {
    setCurrentRecord((prev: any) => {
      const updatedTanks = [...(prev.tanks || [])];
      updatedTanks[index] = { ...updatedTanks[index], [field]: value };
      return { ...prev, tanks: updatedTanks };
    });
  };

  const handleRemoveTank = (index: number) => {
    setCurrentRecord((prev: any) => {
      const updatedTanks = [...(prev.tanks || [])];
      updatedTanks.splice(index, 1);
      return { ...prev, tanks: updatedTanks };
    });
  };

  const handleAddPump = () => {
    const nextNum = String((currentRecord.pumps?.length || 0) + 1).padStart(2, '0');
    setCurrentRecord((prev: any) => ({
      ...prev,
      pumps: [
        ...(prev.pumps || []),
        {
          pump_number: nextNum,
          pump_name: `مضخة ${nextNum} (بنزين 91)`,
          fuel_type: 'بنزين 91',
          unit_price: 2.18,
          current_meter: 0,
          is_active: true
        }
      ]
    }));
  };

  const handleUpdatePump = (index: number, field: string, value: any) => {
    setCurrentRecord((prev: any) => {
      const updatedPumps = [...(prev.pumps || [])];
      const pump = { ...updatedPumps[index], [field]: value };
      
      if (field === 'fuel_type') {
        const matchedItem = fuelItems.find(i => 
          (i.name && i.name.includes(value)) || 
          (i.fuel_type && i.fuel_type === value)
        );
        if (matchedItem?.default_price) {
          pump.unit_price = Number(matchedItem.default_price);
        }
        if (!pump.pump_name || pump.pump_name.startsWith('مضخة')) {
          pump.pump_name = `مضخة ${pump.pump_number || index + 1} (${value})`;
        }
      }

      updatedPumps[index] = pump;
      return { ...prev, pumps: updatedPumps };
    });
  };

  const handleRemovePump = (index: number) => {
    setCurrentRecord((prev: any) => {
      const updatedPumps = [...(prev.pumps || [])];
      updatedPumps.splice(index, 1);
      return { ...prev, pumps: updatedPumps };
    });
  };

  return {
    warehouses: enrichedWarehouses,
    rawWarehouses: warehouses,
    fuelPumps,
    fuelItems,
    isLoading,
    isModalOpen, setIsModalOpen,
    currentRecord, setCurrentRecord,
    handleAddNew, handleEdit, handleDelete,
    handleAddTank, handleUpdateTank, handleRemoveTank,
    handleAddPump, handleUpdatePump, handleRemovePump,
    handleSave: () => saveMutation.mutate(currentRecord),
    isSaving: saveMutation.isPending
  };
}
