'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { showBrowserNotification, playNotificationSound } from '@/lib/pushNotificationService';
import { showGlobalToast } from '@/lib/toast-context';


/**
 * 🔄 نظام المزامنة الفورية (Realtime Sync)
 * 
 * يشتغل كالتالي:
 * 1. يشترك في Supabase Realtime على الجداول الرئيسية
 * 2. عند أي تغيير (INSERT/UPDATE/DELETE) يبث حدث مخصص على window
 * 3. أي hook في أي صفحة يستطيع الاستماع لهذا الحدث وتحديث بياناته
 * 
 * الاستخدام في أي hook:
 *   useRealtimeListener('inventory_transactions', fetchData);
 *   useRealtimeListener('expenses', fetchExpenses);
 */

/**
 * 🔄 تشغيل نغمة تنبيه ناعمة وأنيقة عند وصول إشعار جديد (Web Audio API)
 */
function playNotificationAudio() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // تجاهل القيود إذا لم يتفاعل المستخدم مع الصفحة بعد
  }
}

// 🌐 الجداول المشمولة في المزامنة اللحظية الشاملة
export const WATCHED_TABLES = [
  'notifications',
  'messages',
  'user_tasks',
  'user_requests',
  'cash_flows',
  'inventory_transactions',
  'expenses',
  'payment_vouchers',
  'receipt_vouchers',
  'invoices',
  'purchase_orders',
  'journal_headers',
  'journal_lines',
  'manual_journals',
  'inventory_items',
  'warehouse_inventory',
  'vehicle_inventory',
  'warehouses',
  'partners',
  'accounts',
  'fleet_operations',
  'fleet_vehicles',
  'pos_shifts',
  'payroll_slips',
] as const;

export type WatchedTable = typeof WATCHED_TABLES[number];

// خريطة إبطال الكاش التلقائي لجميع استعلامات React Query عبر كافة صفحات التطبيق
const TABLE_QUERY_KEY_MAP: Record<string, string[][]> = {
  invoices: [
    ['invoices'], 
    ['pos_invoices'], 
    ['ar_aging_invoices'], 
    ['kpis_invoices'], 
    ['dashboard'], 
    ['accounts_report_with_lines']
  ],
  expenses: [
    ['expenses'], 
    ['expenses_for_vehicles'], 
    ['dashboard'], 
    ['accounts_report_with_lines']
  ],
  receipt_vouchers: [
    ['receipt_vouchers'], 
    ['kpis_receipts'], 
    ['invoices'], 
    ['accounts_report_with_lines']
  ],
  payment_vouchers: [
    ['payment_vouchers'], 
    ['expenses'], 
    ['accounts_report_with_lines']
  ],
  inventory_transactions: [
    ['inventory'], 
    ['warehouse_inventory'], 
    ['item_transactions'], 
    ['warehouse_items'], 
    ['pos_inventory']
  ],
  inventory_items: [
    ['inventory_items'], 
    ['inventory_items_list'], 
    ['warehouse_items'], 
    ['pos_inventory']
  ],
  warehouse_inventory: [
    ['warehouse_inventory'], 
    ['inventory'], 
    ['warehouse_items'], 
    ['pos_inventory']
  ],
  vehicle_inventory: [
    ['vehicle_inventory'], 
    ['inventory']
  ],
  warehouses: [
    ['warehouses'], 
    ['pos_warehouses']
  ],
  partners: [
    ['partners'], 
    ['partner_balances_summary'], 
    ['partner_balances'], 
    ['kpis_clients'], 
    ['clients_list'], 
    ['delegates'], 
    ['pos_delegates']
  ],
  accounts: [
    ['accounts'], 
    ['accounts_report_with_lines'], 
    ['ledger_accounts_list'], 
    ['ledger_entries'], 
    ['trial_balance']
  ],
  fleet_operations: [
    ['fleet_operations'], 
    ['fleet_operations_open'], 
    ['operations_for_vehicles']
  ],
  fleet_vehicles: [
    ['fleet_vehicles'], 
    ['fleet_vehicles_list']
  ],
  pos_shifts: [
    ['pos_shifts'], 
    ['active_pos_shift'], 
    ['pos_open_shifts'], 
    ['active_shift_status']
  ],
  payroll_slips: [
    ['payroll_slips']
  ],
  journal_headers: [
    ['journal_master_view'], 
    ['pending_journals_count'], 
    ['ledger_entries'], 
    ['accounts_report_with_lines']
  ],
  journal_lines: [
    ['journal_master_view'], 
    ['pending_journals_count'], 
    ['ledger_entries'], 
    ['accounts_report_with_lines']
  ],
  manual_journals: [
    ['manual_journals'], 
    ['journal_master_view'], 
    ['pending_journals_count']
  ],
  notifications: [
    ['notifications'], 
    ['unread_counts'], 
    ['user_profile']
  ],
  messages: [
    ['messages'], 
    ['unread_counts']
  ],
  user_tasks: [
    ['user_tasks'], 
    ['user_profile']
  ],
  user_requests: [
    ['user_requests'], 
    ['user_profile']
  ],
  cash_flows: [
    ['cash_flows']
  ]
};

// دالة لبث الحدث
function emitTableChange(table: string, eventType: string, payload: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`db:${table}`, { 
      detail: { eventType, payload, timestamp: Date.now() } 
    }));
    // حدث عام لأي مكون يريد الاستماع لكل التغييرات
    window.dispatchEvent(new CustomEvent('db:any_change', { 
      detail: { table, eventType, payload, timestamp: Date.now() } 
    }));
  }
}

/**
 * المكون الرئيسي - يوضع مرة واحدة في AppClientProviders
 * يشترك في Supabase Realtime على كل الجداول المهمة ويقوم بالتحديث الفوري
 */
export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // إنشاء قناة واحدة للاستماع لكل الجداول
    const channel = supabase.channel('global-sync', {
      config: { broadcast: { self: true } }
    });

    // الاشتراك في كل جدول
    WATCHED_TABLES.forEach(table => {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        (payload: any) => {
          console.log(`🔄 [Realtime] ${table}:`, payload.eventType);

          // 1. بث الحدث للمكونات المستمعة محلياً
          emitTableChange(table, payload.eventType, payload);

          // 2. تحديث وإبطال كاش React Query أوتوماتيكياً لكل الصفحات المفتوحة
          const relatedQueries = TABLE_QUERY_KEY_MAP[table];
          if (relatedQueries && queryClient) {
            relatedQueries.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey, exact: false });
            });
          }

          // 3. معالجة خاصة للإشعارات الفورية وبثها على الجوال والمتصفح
          if (table === 'notifications') {
            window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
            if (payload.eventType === 'INSERT' && payload.new) {
              supabase.auth.getSession().then(({ data: { session } }) => {
                const myId = session?.user?.id;
                if (!payload.new.user_id || payload.new.user_id === myId) {
                  // 1. تشغيل نغمة التنبيه الصوتية
                  playNotificationSound();

                  // 2. استخراج رابط الأكشن إن وُجد
                  let actionUrl = '/notifications';
                  if (payload.new.content && typeof payload.new.content === 'string' && payload.new.content.includes('__ACTION__')) {
                    actionUrl = payload.new.content.split('__ACTION__')[1] || '/notifications';
                  }

                  const notifTitle = payload.new.title || '🔔 إشعار جديد';
                  const notifMsg = payload.new.message || 'يوجد تحديث جديد في النظام';

                  // 3. إظهار تنبيه الواجهة الداخلي (In-App Toast)
                  if (typeof showGlobalToast === 'function') {
                    showGlobalToast(`${notifTitle}: ${notifMsg}`, payload.new.type === 'alert' ? 'error' : 'info');
                  }

                  // 4. إظهار الإشعار على الجوال والمتصفح (Native Mobile Web Push)
                  showBrowserNotification(notifTitle, notifMsg, {
                    actionUrl,
                    id: payload.new.id,
                    type: payload.new.type
                  });
                }
              });
            }
          }


          // 4. معالجة خاصة للرسائل الفورية
          if (table === 'messages') {
            window.dispatchEvent(new CustomEvent('unread_counts_refresh'));
            if (payload.eventType === 'INSERT' && payload.new) {
              supabase.auth.getSession().then(({ data: { session } }) => {
                const myId = session?.user?.id;
                if (payload.new.receiver_id === myId) {
                  playNotificationAudio();
                  const sender = payload.new.sender_name ? `${payload.new.sender_name}: ` : '';
                  showGlobalToast(`💬 رسالة جديدة: ${sender}${payload.new.content || payload.new.message || 'رسالة جديدة'}`, 'info');
                }
              });
            }
          }
        }
      );
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ [Realtime] مزامنة فورية مفعلة على', WATCHED_TABLES.length, 'جدول');
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [queryClient]);

  return <>{children}</>;
}

/**
 * Hook للاستماع لتغييرات جدول معين وتنفيذ callback
 * 
 * @param table - اسم الجدول (مثل 'expenses', 'inventory_transactions')
 * @param callback - دالة تتنفذ عند أي تغيير
 * @param debounceMs - مدة الانتظار قبل التنفيذ (لمنع التكرار السريع) - افتراضي 500ms
 * 
 * الاستخدام:
 *   useRealtimeListener('inventory_transactions', () => fetchTransactions());
 *   useRealtimeListener(['expenses', 'payment_vouchers'], () => refetch());
 */
export function useRealtimeListener(
  tables: WatchedTable | WatchedTable[] | 'any_change',
  callback: (detail?: any) => void,
  debounceMs: number = 500
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  
  // تحديث الـ callback reference بدون إعادة الاشتراك
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const debouncedCallback = (e: Event) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current((e as CustomEvent).detail);
      }, debounceMs);
    };

    const tableList = tables === 'any_change' 
      ? ['any_change'] 
      : Array.isArray(tables) ? tables : [tables];

    tableList.forEach(table => {
      window.addEventListener(`db:${table}`, debouncedCallback);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      tableList.forEach(table => {
        window.removeEventListener(`db:${table}`, debouncedCallback);
      });
    };
  }, [tables, debounceMs]);
}

/**
 * Hook لإبطال كاش React Query أو تحديثه محلياً عند تغيير جدول معين
 * تم الإصلاح: يستخدم useQueryClient() بدلاً من window.__REACT_QUERY_CLIENT__ الهش
 * يدعم الآن التعديل الجزئي (Optimistic Updates) بدون سحب نت!
 * 
 * الاستخدام:
 *   useRealtimeInvalidate('expenses', ['expenses']);
 *   useRealtimeInvalidate(['invoices', 'receipt_vouchers'], ['invoices', 'receipts']);
 */
export function useRealtimeInvalidate(
  tables: WatchedTable | WatchedTable[],
  queryKeys: string[]
) {
  // ✅ استخدام useQueryClient hook مباشرة - تم استيراده في أعلى الملف
  const queryClient = useQueryClient();

  useRealtimeListener(tables, (detail) => {
    if (!queryClient) return;

    const eventType = detail?.eventType;
    const newRecord = detail?.payload?.new;
    const oldRecord = detail?.payload?.old;

    queryKeys.forEach(key => {
      // 1. تحديث جزئي (بدون سحب نت) في حالة التعديل UPDATE
      if (eventType === 'UPDATE' && newRecord?.id) {
        queryClient.setQueriesData({ queryKey: [key], exact: false }, (oldData: any) => {
          if (!oldData) return oldData;
          
          if (Array.isArray(oldData)) {
            return oldData.map(item => item.id === newRecord.id ? { ...item, ...newRecord } : item);
          } else if (typeof oldData === 'object' && oldData !== null) {
              const newData = { ...oldData };
              let updated = false;
              for (const k in newData) {
                  if (Array.isArray(newData[k])) {
                      newData[k] = newData[k].map((item:any) => item.id === newRecord.id ? { ...item, ...newRecord } : item);
                      updated = true;
                  }
              }
              return updated ? newData : oldData;
          }
          return oldData;
        });
      } 
      // 2. حذف جزئي (بدون سحب نت) في حالة الحذف DELETE
      else if (eventType === 'DELETE' && oldRecord?.id) {
        queryClient.setQueriesData({ queryKey: [key], exact: false }, (oldData: any) => {
          if (!oldData) return oldData;
          
          if (Array.isArray(oldData)) {
            return oldData.filter(item => item.id !== oldRecord.id);
          } else if (typeof oldData === 'object' && oldData !== null) {
              const newData = { ...oldData };
              let updated = false;
              for (const k in newData) {
                  if (Array.isArray(newData[k])) {
                      newData[k] = newData[k].filter((item:any) => item.id !== oldRecord.id);
                      updated = true;
                  }
              }
              return updated ? newData : oldData;
          }
          return oldData;
        });
      } 
      // 3. إضافة جديدة — نُبطل الكاش بالكامل لضمان جلب البيانات المرتبطة (JOIN) بشكل صحيح
      else if (eventType === 'INSERT') {
        // invalidate with exact:false يشمل أي queryKey يبدأ بـ [key] بصرف النظر عن باقي الـ params
        queryClient.invalidateQueries({ queryKey: [key], exact: false });
      }
      else {
        queryClient.invalidateQueries({ queryKey: [key], exact: false });
      }
    });
  });
}

