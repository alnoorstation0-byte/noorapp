"use client";
import { emitTableChange } from '@/lib/useRealtimeSync';

/**
 * 📢 محرك بث وإرسال الإشعارات الموحد لنظام صيدلية تاج المودة
 * يقوم ببث الإشعارات إلى قاعدة البيانات وبثها فورياً للمستخدمين المعنيين (Realtime & Mobile Push)
 */

export type NotificationType = 'sale' | 'pos' | 'finance' | 'inventory' | 'fleet' | 'alert' | 'system';

export interface SendNotificationPayload {
  title: string;
  message: string;
  type?: NotificationType;
  related_id?: string | null;
  target_roles?: string[] | null;
  target_user_id?: string | null;
  action_url?: string | null;
}

/**
 * دالة الإرسال الأساسية - تتصل بـ API الإشعارات الداخلي وتبث التحديث فورياً بدون ريفرش
 */
export async function sendSystemNotification(payload: SendNotificationPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn('⚠️ تعذر إرسال الإشعار عبر API، الرد:', res.status);
      return false;
    }

    // ⚡ بث فوري فائق السرعة لكافة التبويبات والمكونات المفتوحة
    emitTableChange('notifications');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
      window.dispatchEvent(new CustomEvent('pending_counts_refresh'));
    }

    return true;
  } catch (err) {
    console.warn('⚠️ خطأ شبكة أثناء إرسال الإشعار:', err);
    return false;
  }
}

// =========================================================================
// 🛒 إشعارات المبيعات ونقاط البيع
// =========================================================================

/**
 * إشعار إصدار فاتورة مبيعات جديدة
 */
export async function notifyInvoiceCreated(params: {
  invoiceNumber: string;
  clientName?: string;
  totalAmount: number;
  invoiceId?: string;
}) {
  const clientText = params.clientName ? ` للعميل: ${params.clientName}` : '';
  return sendSystemNotification({
    title: `🧾 فاتورة مبيعات جديدة #${params.invoiceNumber}`,
    message: `تم إصدار فاتورة مبيعات${clientText} بقيمة ${Number(params.totalAmount).toLocaleString('ar-SA')} ر.س`,
    type: 'sale',
    related_id: params.invoiceId,
    action_url: `/invoices?highlight=${params.invoiceNumber}`,
    target_roles: ['super_admin', 'admin', 'accountant', 'manager', 'staff']
  });
}

/**
 * إشعار فتح وردية كاشير / منفذ بيع
 */
export async function notifyShiftOpened(params: {
  shiftId: string;
  cashierName?: string;
  warehouseName?: string;
  startingCash?: number;
}) {
  const cName = params.cashierName || 'كاشير';
  const whName = params.warehouseName ? ` في ${params.warehouseName}` : '';
  const cashText = params.startingCash ? ` بعهدة نقدية ${params.startingCash} ر.س` : '';

  return sendSystemNotification({
    title: `🟢 بدء وردية جديدة: ${cName}`,
    message: `قام ${cName} ببدء وردية جديدة${whName}${cashText}`,
    type: 'pos',
    related_id: params.shiftId,
    action_url: '/pos/dashboard',
    target_roles: ['super_admin', 'admin', 'manager', 'staff']
  });
}

/**
 * إشعار إغلاق وردية كاشير مع التدقيق المالي (عجز / زيادة)
 */
export async function notifyShiftClosed(params: {
  shiftId: string;
  cashierName?: string;
  totalSales?: number;
  shortageOverage?: number;
}) {
  const diff = Number(params.shortageOverage || 0);
  let statusBadge = 'متطابق ومضبوط ✅';
  let isAlert = false;

  if (diff > 0) {
    statusBadge = `فائض نقدي +${diff.toFixed(2)} ر.س ⚠️`;
    isAlert = true;
  } else if (diff < 0) {
    statusBadge = `عجز نقدي ${diff.toFixed(2)} ر.س 🚨`;
    isAlert = true;
  }

  return sendSystemNotification({
    title: isAlert ? `🚨 تنبيه إغلاق وردية (${params.cashierName || 'كاشير'})` : `🔒 تم إغلاق وردية: ${params.cashierName || 'كاشير'}`,
    message: `تم إغلاق الوردية بمبيعات إجمالية ${(params.totalSales || 0).toLocaleString('ar-SA')} ر.س | حالة الصندوق: ${statusBadge}`,
    type: isAlert ? 'alert' : 'pos',
    related_id: params.shiftId,
    action_url: '/pos/dashboard',
    target_roles: ['super_admin', 'admin', 'accountant', 'manager', 'staff']
  });
}

// =========================================================================
// 💰 إشعارات المالية والمحاسبة والسندات
// =========================================================================

/**
 * إشعار سند قبض أو سند صرف جديد
 */
export async function notifyVoucherCreated(params: {
  voucherType: 'receipt' | 'payment';
  voucherNumber: string;
  amount: number;
  partnerName?: string;
  voucherId?: string;
}) {
  const isReceipt = params.voucherType === 'receipt';
  const typeTitle = isReceipt ? '📥 سند قبض جديد' : '📤 سند صرف جديد';
  const partnerText = params.partnerName ? ` - ${params.partnerName}` : '';

  return sendSystemNotification({
    title: `${typeTitle} #${params.voucherNumber}`,
    message: `تم تسجيل ${isReceipt ? 'تحصيل وقبض' : 'صرف'} مبلغ ${Number(params.amount).toLocaleString('ar-SA')} ر.س${partnerText}`,
    type: 'finance',
    related_id: params.voucherId,
    action_url: isReceipt ? '/ReceiptVouchers' : '/PaymentVouchers',
    target_roles: ['super_admin', 'admin', 'accountant', 'manager', 'staff']
  });
}

/**
 * إشعار تسجيل مصروف جديد
 */
export async function notifyExpenseCreated(params: {
  expenseNumber?: string;
  amount: number;
  category?: string;
  description?: string;
  expenseId?: string;
}) {
  const catText = params.category ? ` [${params.category}]` : '';
  const descText = params.description ? ` (${params.description})` : '';

  return sendSystemNotification({
    title: `💸 تسجيل مصروف جديد${catText}`,
    message: `تم تسجيل مصروف بقيمة ${Number(params.amount).toLocaleString('ar-SA')} ر.س${descText}`,
    type: 'finance',
    related_id: params.expenseId,
    action_url: '/expenses',
    target_roles: ['super_admin', 'admin', 'accountant', 'manager', 'staff']
  });
}

// =========================================================================
// 📦 إشعارات المخزون وتنبيهات إعادة الطلب
// =========================================================================

/**
 * تنبيه انخفاض المخزون عن حد الطلب
 */
export async function notifyLowStockAlert(params: {
  itemName: string;
  currentQty: number;
  minQty: number;
  warehouseName?: string;
}) {
  const whText = params.warehouseName ? ` في مستودع: ${params.warehouseName}` : '';
  return sendSystemNotification({
    title: `⚠️ تنبيه حرج: نقص مخزون (${params.itemName})`,
    message: `الرصيد المتبقي للصنف ${params.itemName} وصل إلى ${params.currentQty} فقط (حد الطلب المعتمد: ${params.minQty})${whText}`,
    type: 'alert',
    action_url: '/reorder-alerts',
    target_roles: ['super_admin', 'admin', 'manager', 'staff']
  });
}

// =========================================================================
// 🚚 إشعارات الأسطول والتوزيع
// =========================================================================

/**
 * إشعار عملية أسطول جديدة أو معلقة تحتاج مراجعة وإغلاق
 */
export async function notifyFleetOperationAlert(params: {
  tripNumber: string;
  driverName?: string;
  vehiclePlate?: string;
  status?: string;
  operationId?: string;
}) {
  const driverText = params.driverName ? ` (السائق: ${params.driverName})` : '';
  const plateText = params.vehiclePlate ? ` - شاحنة: ${params.vehiclePlate}` : '';
  return sendSystemNotification({
    title: `🚚 رحلة أسطول معلقة #${params.tripNumber}`,
    message: `رحلة توزيع بانتظار المراجعة والاعتماد النهائي${driverText}${plateText}`,
    type: 'fleet',
    related_id: params.operationId,
    action_url: `/fleet_operations`,
    target_roles: ['super_admin', 'admin', 'accountant', 'manager', 'staff']
  });
}

/**
 * إشعار مستندات تحتاج مراجعة أو ترحيل
 */
export async function notifyPendingReviewAlert(params: {
  documentType: string;
  documentNumber: string;
  message?: string;
  actionUrl: string;
}) {
  return sendSystemNotification({
    title: `⚠️ مستند يحتاج مراجعة: ${params.documentType} #${params.documentNumber}`,
    message: params.message || `يوجد مستند بانتظار التدقيق والترحيل المحاسبي`,
    type: 'alert',
    action_url: params.actionUrl,
    target_roles: ['super_admin', 'admin', 'accountant', 'manager', 'staff']
  });
}

// =========================================================================
// 🛡️ إشعارات النظام والعمليات الإدارية
// =========================================================================

/**
 * إشعار أمني أو إداري عام
 */
export async function notifySystemAlert(params: {
  title: string;
  message: string;
  actionUrl?: string;
}) {
  return sendSystemNotification({
    title: params.title,
    message: params.message,
    type: 'alert',
    action_url: params.actionUrl || '/settings',
    target_roles: ['super_admin', 'admin', 'staff']
  });
}
