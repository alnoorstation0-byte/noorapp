"use client";
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import { notifyExpiryAlert } from '@/lib/notificationService';
import * as XLSX from 'xlsx';

export interface ExpiryItem {
 id: string;
 code: string;
 name: string;
 unit: string;
 available_qty: number;
 cost_price: number;
 suggested_price: number;
 barcode: string;
 expiry_date: string | null;
 production_date: string | null;
 batch_number: string | null;
 alert_before_days: number;
 days_left: number | null;
 status: 'expired' | 'critical' | 'warning' | 'safe' | 'no_date';
 potential_loss: number;
 warehouse_name?: string;
 warehouse_id?: string;
}

const LOCAL_EXPIRY_STORAGE_KEY = 'taj_expiry_metadata_cache';

export function getLocalExpiryMetadata(): Record<string, { expiry_date?: string; batch_number?: string; alert_before_days?: number }> {
 if (typeof window === 'undefined') return {};
 try {
 const raw = localStorage.getItem(LOCAL_EXPIRY_STORAGE_KEY);
 return raw ? JSON.parse(raw) : {};
 } catch {
 return {};
 }
}

export function saveLocalExpiryMetadata(itemId: string, data: { expiry_date?: string; batch_number?: string; alert_before_days?: number }) {
 if (typeof window === 'undefined') return;
 try {
 const current = getLocalExpiryMetadata();
 current[itemId] = { ...current[itemId], ...data };
 localStorage.setItem(LOCAL_EXPIRY_STORAGE_KEY, JSON.stringify(current));
 } catch (err) {
 console.warn('Failed to save local expiry cache:', err);
 }
}

export function useExpiryAlertsLogic() {
 const queryClient = useQueryClient();
 const { showToast } = useToast();

 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'critical' | 'warning' | 'safe' | 'no_date'>('all');
 const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(20);

 // Edit Expiry Modal State
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [selectedItemForEdit, setSelectedItemForEdit] = useState<any>(null);
 const [editExpiryDate, setEditExpiryDate] = useState('');
 const [editBatchNumber, setEditBatchNumber] = useState('');
 const [editAlertDays, setEditAlertDays] = useState(30);

 // 1. جلب المستودعات
 const { data: warehouses = [] } = useQuery({
 queryKey: ['expiry_warehouses'],
 queryFn: async () => {
 const { data } = await supabase.from('warehouses').select('id, name, is_active').order('name');
 return data || [];
 }
 });

 // 2. جلب رصيد المستودعات لكل صنف
 const { data: warehouseInventory = [] } = useQuery({
 queryKey: ['expiry_warehouse_inventory'],
 queryFn: async () => {
 const { data } = await supabase.from('warehouse_inventory').select('item_id, warehouse_id, quantity');
 return data || [];
 }
 });

 // 3. جلب الأصناف
 const { data: rawItems = [], isLoading } = useQuery({
 queryKey: ['expiry_inventory_items'],
 queryFn: async () => {
 let data: any[] | null = null;
 try {
 const res = await supabase.from('inventory_items').select('*').order('name');
 data = res.data;
 } catch (err) {
 console.warn('Error fetching inventory items with all columns:', err);
 }

 if (!data) {
 const fallbackRes = await supabase.from('inventory_items').select('id, name, code, barcode, unit, current_quantity, cost_price, suggested_price, default_price').order('name');
 data = fallbackRes.data || [];
 }
 return data || [];
 }
 });

 // 4. معالجة وتصنيف الأصناف وحساب الأيام المتبقية
 const processedItems: ExpiryItem[] = useMemo(() => {
 if (!rawItems.length) return [];
 const localMeta = getLocalExpiryMetadata();
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 return rawItems.map((item: any) => {
 const cached = localMeta[item.id] || {};
 const expDateStr = item.expiry_date || cached.expiry_date || null;
 const batchNo = item.batch_number || cached.batch_number || null;
 const alertDays = Number(item.alert_before_days || cached.alert_before_days || 30);

 // حساب إجمالي الكمية المتاحة بحسب الفلتر
 let availableQty = Number(item.current_quantity || 0);
 if (selectedWarehouseId !== 'all') {
 const winv = warehouseInventory.find((w: any) => w.item_id === item.id && w.warehouse_id === selectedWarehouseId);
 availableQty = Number(winv?.quantity || 0);
 }

 let daysLeft: number | null = null;
 let status: ExpiryItem['status'] = 'no_date';

 if (expDateStr) {
 const expDate = new Date(expDateStr);
 expDate.setHours(0, 0, 0, 0);
 const diffTime = expDate.getTime() - today.getTime();
 daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

 if (daysLeft <= 0) {
 status = 'expired';
 } else if (daysLeft <= alertDays) {
 status = 'critical';
 } else if (daysLeft <= 90) {
 status = 'warning';
 } else {
 status = 'safe';
 }
 }

 const unitPrice = Number(item.cost_price || item.suggested_price || item.default_price || 0);
 const potentialLoss = (status === 'expired' || status === 'critical') ? (availableQty * unitPrice) : 0;

 return {
 id: item.id,
 code: item.code || '',
 name: item.name || '',
 unit: item.unit || 'حبة',
 available_qty: availableQty,
 cost_price: Number(item.cost_price || 0),
 suggested_price: Number(item.suggested_price || item.default_price || 0),
 barcode: item.barcode || '',
 expiry_date: expDateStr,
 production_date: item.production_date || null,
 batch_number: batchNo,
 alert_before_days: alertDays,
 days_left: daysLeft,
 status: status,
 potential_loss: potentialLoss
 };
 });
 }, [rawItems, warehouseInventory, selectedWarehouseId]);

 // 5. المؤشرات والإحصائيات الرئيسية (KPIs)
 const metrics = useMemo(() => {
 let expiredCount = 0;
 let expiredLoss = 0;
 let criticalCount = 0;
 let criticalLoss = 0;
 let warningCount = 0;
 let safeCount = 0;
 let noDateCount = 0;

 processedItems.forEach(it => {
 if (it.status === 'expired') {
 expiredCount++;
 expiredLoss += it.potential_loss;
 } else if (it.status === 'critical') {
 criticalCount++;
 criticalLoss += it.potential_loss;
 } else if (it.status === 'warning') {
 warningCount++;
 } else if (it.status === 'safe') {
 safeCount++;
 } else {
 noDateCount++;
 }
 });

 return {
 expiredCount,
 expiredLoss,
 criticalCount,
 criticalLoss,
 warningCount,
 safeCount,
 noDateCount,
 totalItems: processedItems.length
 };
 }, [processedItems]);

 // 6. التصفية والبحث
 const filteredItems = useMemo(() => {
 return processedItems.filter(it => {
 // 1. فلتر الحالة
 if (statusFilter !== 'all' && it.status !== statusFilter) {
 return false;
 }

 // 2. البحث بالنص
 if (searchTerm.trim()) {
 const q = searchTerm.trim().toLowerCase();
 const matchName = it.name.toLowerCase().includes(q);
 const matchCode = it.code.toLowerCase().includes(q);
 const matchBarcode = it.barcode.toLowerCase().includes(q);
 const matchBatch = (it.batch_number || '').toLowerCase().includes(q);
 if (!matchName && !matchCode && !matchBarcode && !matchBatch) return false;
 }

 return true;
 }).sort((a, b) => {
 // الأولوية دائماً للمنتهي ثم الحرج ثم الأقرب انتهاءً
 const priorityOrder: Record<string, number> = {
 'expired': 1,
 'critical': 2,
 'warning': 3,
 'safe': 4,
 'no_date': 5
 };
 const pDiff = (priorityOrder[a.status] || 99) - (priorityOrder[b.status] || 99);
 if (pDiff !== 0) return pDiff;

 if (a.days_left !== null && b.days_left !== null) {
 return a.days_left - b.days_left;
 }
 return 0;
 });
 }, [processedItems, statusFilter, searchTerm]);

 // 7. الصفحات
 const paginatedItems = useMemo(() => {
 const start = (currentPage - 1) * itemsPerPage;
 return filteredItems.slice(start, start + itemsPerPage);
 }, [filteredItems, currentPage, itemsPerPage]);

 const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

 // 8. فتح نافذة تعديل / تسجيل الصلاحية
 const openEditModal = (item: ExpiryItem) => {
 setSelectedItemForEdit(item);
 setEditExpiryDate(item.expiry_date || '');
 setEditBatchNumber(item.batch_number || '');
 setEditAlertDays(item.alert_before_days || 30);
 setIsEditModalOpen(true);
 };

 // 9. حفظ بيانات الصلاحية (مزدوج: في السيرفر مع كاش فوري)
 const saveExpiryMutation = useMutation({
 mutationFn: async () => {
 if (!selectedItemForEdit) return;
 const itemId = selectedItemForEdit.id;

 // 1. حفظ فوري في الكاش المحلي لضمان عدم ضياع التعديل حتى لو السيرفر لم يطبق المايجريشن بعد
 saveLocalExpiryMetadata(itemId, {
 expiry_date: editExpiryDate || undefined,
 batch_number: editBatchNumber || undefined,
 alert_before_days: editAlertDays
 });

 // 2. محاولة الحفظ في جدول قاعدة البيانات
 try {
 const { error } = await supabase.from('inventory_items').update({
 expiry_date: editExpiryDate || null,
 batch_number: editBatchNumber || null,
 alert_before_days: editAlertDays
 }).eq('id', itemId);

 if (error && error.code === '42703') {
 console.warn('Column does not exist yet on Supabase, cached locally:', error.message);
 }
 } catch (dbErr: any) {
 console.warn('DB update failed, using local cache:', dbErr);
 }

 // 3. بث إشعار إذا كان الصنف منتهياً أو حرجا
 if (editExpiryDate) {
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const exp = new Date(editExpiryDate);
 exp.setHours(0, 0, 0, 0);
 const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
 if (days <= editAlertDays) {
 notifyExpiryAlert({
 itemName: selectedItemForEdit.name,
 daysLeft: days,
 expiryDate: editExpiryDate,
 isExpired: days <= 0,
 quantity: selectedItemForEdit.available_qty
 }).catch(() => {});
 }
 }
 },
 onSuccess: () => {
 showToast('تم تحديث بيانات الصلاحية والتشغيلة بنجاح! ⏳', 'success');
 setIsEditModalOpen(false);
 queryClient.invalidateQueries({ queryKey: ['expiry_inventory_items'] });
 },
  onError: (err: any) => {
    showToast(`فشل التحديث: ${err?.message || 'حدث خطأ'}`, 'error');
  }
 });

 // 10. تصدير تقرير الصلاحيات إلى إكسل
 const exportToExcel = () => {
 if (!filteredItems.length) {
 showToast('لا توجد بيانات متاحة للتصدير', 'warning');
 return;
 }

 const excelData = filteredItems.map((item, idx) => ({
 '#': idx + 1,
 'كود الصنف': item.code,
 'اسم الصنف': item.name,
 'الباركود': item.barcode || '-',
 'رقم التشغيلة (Batch)': item.batch_number || '-',
 'الكمية المتوفرة': item.available_qty,
 'الوحدة': item.unit,
 'تاريخ الانتهاء': item.expiry_date || 'غير محدد',
 'الأيام المتبقية': item.days_left !== null ? item.days_left : '-',
 'الحالة': item.status === 'expired' ? 'منتهي الصلاحية' :
 item.status === 'critical' ? 'حرج (أوشك على الانتهاء)' :
 item.status === 'warning' ? 'تنبيه مبكر' :
 item.status === 'safe' ? 'آمن' : 'غير مسجل',
 'سعر التكلفة': item.cost_price,
 'الخسارة المحتملة (ر.س)': item.potential_loss
 }));

 const ws = XLSX.utils.json_to_sheet(excelData);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'تقرير الصلاحيات');
    XLSX.writeFile(wb, `تقرير_صلاحيات_البضاعة_${new Date().toISOString().split('T')[0]}.xlsx`);
 showToast('تم تصدير ملف الإكسل بنجاح 📊', 'success');
 };

 return {
 items: paginatedItems,
 allFilteredCount: filteredItems.length,
 isLoading,
 metrics,
 searchTerm, setSearchTerm,
 statusFilter, setStatusFilter,
 selectedWarehouseId, setSelectedWarehouseId,
 warehouses,
 currentPage, setCurrentPage,
 totalPages,
 itemsPerPage, setItemsPerPage,
 // Modal
 isEditModalOpen, setIsEditModalOpen,
 selectedItemForEdit,
 editExpiryDate, setEditExpiryDate,
 editBatchNumber, setEditBatchNumber,
 editAlertDays, setEditAlertDays,
 openEditModal,
 handleSaveExpiry: () => saveExpiryMutation.mutate(),
 isSaving: saveExpiryMutation.isPending,
 exportToExcel
 };
}
