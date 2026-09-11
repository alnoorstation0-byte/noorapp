'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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

// الجداول اللي محتاجة مزامنة فورية
const WATCHED_TABLES = [
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
  'partners',
  'accounts',
  'fleet_operations',
] as const;

type WatchedTable = typeof WATCHED_TABLES[number];

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
 * يشترك في Supabase Realtime على كل الجداول المهمة
 */
export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);

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
          emitTableChange(table, payload.eventType, payload);
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
  }, []);

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

