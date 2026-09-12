"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

export default function GlobalNavigationShortcuts() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const isModalOpen = useCallback(() => {
    return !!document.querySelector(
      '.warm-portal-overlay-fullscreen, .pos-numpad-overlay, .thermal-modal-overlay, .print-modal-overlay, .shortcuts-modal-overlay'
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. F1 أو Shift + ? -> فتح خريطة ودليل الاختصارات
      if (e.key === 'F1' || (e.shiftKey && (e.key === '?' || e.key === '؟'))) {
        e.preventDefault();
        e.stopPropagation();
        setIsHelpOpen(prev => !prev);
        return;
      }

      // إذا كانت نافذة مساعدة الاختصارات مفتوحة وضغط Esc، يغلقها
      if (isHelpOpen && e.key === 'Escape') {
        setIsHelpOpen(false);
        return;
      }

      // 2. F2 أو Alt + N أو Insert -> فتح نافذة إضافة جديد في الصفحة الحالية
      if (
        (e.key === 'F2' || e.key === 'Insert' || (e.altKey && (e.key === 'n' || e.key === 'N' || e.key === 'ى'))) &&
        !e.ctrlKey
      ) {
        if (!isModalOpen()) {
          // البحث عن زر الإضافة الجديد في الصفحة الحالية
          const addBtn = document.querySelector<HTMLButtonElement>(
            'button.btn-main-glass.gold, [data-shortcut="new"], button.btn-new-record'
          );
          if (addBtn && !addBtn.disabled) {
            e.preventDefault();
            e.stopPropagation();
            addBtn.click();
            return;
          }

          // محاولة بديلة: البحث عن أي زر رئيسي يحتوي "جديد" أو "إضافة"
          const allButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
          const fallbackBtn = allButtons.find(b => 
            !b.disabled && 
            (b.innerText.includes('جديد') || b.innerText.includes('جديدة') || b.innerText.includes('➕'))
          );
          if (fallbackBtn) {
            e.preventDefault();
            e.stopPropagation();
            fallbackBtn.click();
            return;
          }
        }
      }

      // 3. F3 أو Alt + S -> التركيز على خانة البحث في الصفحة
      if ((e.key === 'F3' || (e.altKey && (e.key === 's' || e.key === 'S' || e.key === 'س'))) && !e.ctrlKey) {
        if (!isModalOpen()) {
          const searchInput = document.querySelector<HTMLInputElement>(
            '.table-search-input, input[placeholder*="بحث"], input[placeholder*="ابحث"], .glass-input-field'
          );
          if (searchInput) {
            e.preventDefault();
            e.stopPropagation();
            searchInput.focus();
            searchInput.select();
            return;
          }
        }
      }

      // 4. F4 أو Alt + P -> اعتماد وترحيل السجلات المحددة
      if ((e.key === 'F4' || (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح'))) && !e.ctrlKey) {
        if (!isModalOpen()) {
          const postBtn = document.querySelector<HTMLButtonElement>(
            'button.btn-main-glass.blue, [data-shortcut="post"]'
          );
          if (postBtn && !postBtn.disabled && postBtn.innerText.includes('اعتماد')) {
            e.preventDefault();
            e.stopPropagation();
            postBtn.click();
            return;
          }
        }
      }

      // 5. Alt + B -> فتح/إغلاق لوحة الفلاتر والملخص الجانبي أو السفلي
      if (e.altKey && (e.key === 'b' || e.key === 'B' || e.key === 'لا') && !e.ctrlKey) {
        const sidebarToggle = document.querySelector<HTMLButtonElement>(
          '.filter-toggle-tab-v3, [data-shortcut="sidebar"], .btn-toggle-sidebar'
        );
        if (sidebarToggle) {
          e.preventDefault();
          e.stopPropagation();
          sidebarToggle.click();
          return;
        }
      }

      // 6. التنقل السريع: Alt + 1 إلى Alt + 0
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        let path = '';
        let name = '';
        
        switch (e.code) {
          case 'Digit1':
          case 'Numpad1': path = '/Dashboard'; name = 'الداشبورد'; break;
          case 'Digit2':
          case 'Numpad2': path = '/pos'; name = 'كاشير نقاط البيع'; break;
          case 'Digit3':
          case 'Numpad3': path = '/expenses'; name = 'المصروفات'; break;
          case 'Digit4':
          case 'Numpad4': path = '/PaymentVouchers'; name = 'سندات الصرف'; break;
          case 'Digit5':
          case 'Numpad5': path = '/ReceiptVouchers'; name = 'سندات القبض'; break;
          case 'Digit6':
          case 'Numpad6': path = '/invoices'; name = 'الفواتير'; break;
          case 'Digit7':
          case 'Numpad7': path = '/inventory'; name = 'المخزون والأصناف'; break;
          case 'Digit8':
          case 'Numpad8': path = '/fleet_operations'; name = 'عمليات الأسطول'; break;
          case 'Digit9':
          case 'Numpad9': path = '/statement'; name = 'كشف الحساب العام'; break;
          case 'Digit0':
          case 'Numpad0': path = '/PartnerBalances'; name = 'أرصدة الجهات'; break;
        }

        if (path) {
          e.preventDefault();
          showToast(`🚀 جاري الانتقال إلى: ${name}...`, 'info');
          router.push(path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, showToast, isModalOpen, isHelpOpen]);

  return (
    <KeyboardShortcutsModal 
      isOpen={isHelpOpen} 
      onClose={() => setIsHelpOpen(false)} 
    />
  );
}
