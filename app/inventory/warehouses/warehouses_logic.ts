"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export function useWarehousesLogic() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>({ name: '', type: 'sub', is_active: true });

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('warehouses').select('*').order('type', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setWarehouses(data);
    } catch (err: any) {
      console.error(err);
      showToast(`فشل جلب المستودعات: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from('warehouses').update({
          name: payload.name,
          type: payload.type,
          is_active: payload.is_active
        }).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('warehouses').insert([{
          name: payload.name,
          type: payload.type || 'sub',
          is_active: payload.is_active ?? true
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      showToast("تم حفظ المستودع بنجاح ✅", "success");
      setIsModalOpen(false);
      fetchWarehouses();
    },
    onError: (err: any) => showToast(`خطأ أثناء الحفظ: ${err.message}`, "error")
  });

  const handleAddNew = () => {
    setCurrentRecord({ name: '', type: 'sub', is_active: true });
    setIsModalOpen(true);
  };

  const handleEdit = (w: any) => {
    setCurrentRecord({ ...w });
    setIsModalOpen(true);
  };

  return {
    warehouses,
    isLoading,
    isModalOpen, setIsModalOpen,
    currentRecord, setCurrentRecord,
    handleAddNew, handleEdit,
    handleSave: () => saveMutation.mutate(currentRecord),
    isSaving: saveMutation.isPending
  };
}
