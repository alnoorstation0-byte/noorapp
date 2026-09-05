"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { useToast } from '@/lib/toast-context'; 

export function useFleetLogic() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>({
    plate_number: '', vehicle_model: '', driver_id: '', status: 'متاح'
  });
  const [isSaving, setIsSaving] = useState(false);

  // 1. جلب السيارات
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['fleet_vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fleet_vehicles').select('*, driver:driver_id(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. جلب المناديب والسائقين لاستخدامهم في القائمة المنسدلة
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('partners').select('*').eq('partner_type', 'موظف');
      if (error) throw error;
      return data || [];
    }
  });

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const search = searchQuery.toLowerCase();
      return (v.plate_number || '').toLowerCase().includes(search) || 
             (v.vehicle_model || '').toLowerCase().includes(search) ||
             (v.driver?.name || '').toLowerCase().includes(search);
    });
  }, [vehicles, searchQuery]);

  const handleAddNew = () => {
    setCurrentRecord({ plate_number: '', vehicle_model: '', driver_id: '', status: 'متاح' });
    setIsModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setCurrentRecord({ ...record });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from('fleet_vehicles').update(payload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fleet_vehicles').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsModalOpen(false);
      showToast("تم حفظ بيانات السيارة بنجاح 🚗", "success");
      queryClient.invalidateQueries({ queryKey: ['fleet_vehicles'] });
    },
    onError: (err: any) => showToast(`خطأ في الحفظ: ${err.message}`, "error")
  });

  const handleSave = async () => {
    if (!currentRecord.plate_number) {
        showToast("رقم اللوحة مطلوب", "error");
        return;
    }
    setIsSaving(true);
    await saveMutation.mutateAsync(currentRecord);
    setIsSaving(false);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fleet_vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast("تم حذف السيارة بنجاح 🗑️", "success");
      queryClient.invalidateQueries({ queryKey: ['fleet_vehicles'] });
    },
    onError: (err: any) => showToast(`فشل الحذف: ${err.message}`, "error")
  });

  const handleDelete = (id: string) => {
      if(confirm("هل أنت متأكد من حذف هذه السيارة؟")) {
          deleteMutation.mutate(id);
      }
  };

  return {
    vehicles: filteredVehicles,
    drivers,
    isLoading,
    isSaving,
    searchQuery, setSearchQuery,
    isModalOpen, setIsModalOpen,
    currentRecord, setCurrentRecord,
    handleAddNew,
    handleEdit,
    handleSave,
    handleDelete
  };
}
