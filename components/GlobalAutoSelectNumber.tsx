"use client";

import { useEffect } from 'react';

/**
 * GlobalAutoSelectNumber
 * يحدد تلقائياً كافة الأرقام في أي خانة أو حقل إدخال عددي بمجرد النقر عليه أو التركيز فيه
 * ليتمكن المستخدم من الكتابة والاستبدال الفوري دون الحاجة للمسح اليدوي أو الضغط على Backspace
 */
export default function GlobalAutoSelectNumber() {
  useEffect(() => {
    let lastFocusedInput: HTMLInputElement | null = null;

    const isNumericInput = (el: EventTarget | null): el is HTMLInputElement => {
      if (!el || !(el instanceof HTMLInputElement)) return false;

      // تجاهل الحقول غير النصية
      const nonSelectableTypes = [
        'checkbox', 'radio', 'button', 'submit', 'reset', 
        'file', 'image', 'color', 'date', 'datetime-local', 
        'time', 'month', 'week', 'range'
      ];
      if (nonSelectableTypes.includes(el.type)) return false;

      // 1. نوع عددي صريح
      if (el.type === 'number') return true;

      // 2. وضع إدخال عددي
      if (el.inputMode === 'numeric' || el.inputMode === 'decimal') return true;

      // 3. كلاسات تدل على الأرقام والأسعار والمبالغ والكميات
      const cls = (el.className || '').toLowerCase();
      if (
        cls.includes('number') || cls.includes('price') || cls.includes('amount') || 
        cls.includes('qty') || cls.includes('digit') || cls.includes('total') || 
        cls.includes('cost') || cls.includes('balance')
      ) {
        return true;
      }

      // 4. خصائص name أو id أو placeholder تدل على حقول أرقام
      const meta = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''}`.toLowerCase();
      if (
        meta.includes('qty') || meta.includes('price') || meta.includes('amount') ||
        meta.includes('total') || meta.includes('cost') || meta.includes('discount') ||
        meta.includes('tax') || meta.includes('vat') || meta.includes('rate') ||
        meta.includes('unit_price') || meta.includes('quantity') ||
        meta.includes('كمية') || meta.includes('سعر') || meta.includes('مبلغ') ||
        meta.includes('إجمالي') || meta.includes('اجمالي') || meta.includes('ضريبة') ||
        meta.includes('خصم') || meta.includes('تكلفة') || meta.includes('رصيد')
      ) {
        return true;
      }

      // 5. القيمة الحالية رقمية أو عملة أو نسبة (مثل 0 أو 0.00 أو 150 أو 1,250.00 أو 150 ر.س أو 15%)
      const val = (el.value || '').trim();
      if (!val) return false;
      if (/^[+-]?[\d,\.٠-٩]+$/.test(val)) return true;
      if (/^[+-]?[\d,\.٠-٩]+\s*(ر\.س|ريال|sar|%|usd|\$)?$/i.test(val)) return true;

      return false;
    };

    const performSelection = (target: HTMLInputElement) => {
      // تنفيذ التحديد عبر requestAnimationFrame و setTimeout لضمان تجاوزه لموضع المؤشر الافتراضي للمتصفح بعد النقر
      requestAnimationFrame(() => {
        try {
          target.select();
        } catch {}
      });
      setTimeout(() => {
        try {
          target.select();
        } catch {}
      }, 35);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target;
      if (isNumericInput(target)) {
        // إذا كان الحقل لم يكن نشطاً من قبل، نضع علامة لتحديده عند انتهاء النقر
        if (target !== document.activeElement) {
          target.dataset.autoSelectPending = 'true';
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (isNumericInput(target)) {
        if (target !== lastFocusedInput) {
          lastFocusedInput = target;
          target.dataset.autoSelectPending = 'true';
          performSelection(target);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target;
      if (isNumericInput(target) && target.dataset.autoSelectPending === 'true') {
        delete target.dataset.autoSelectPending;
        performSelection(target);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target;
      if (isNumericInput(target) && target.dataset.autoSelectPending === 'true') {
        delete target.dataset.autoSelectPending;
        performSelection(target);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target;
      if (isNumericInput(target) && target.dataset.autoSelectPending === 'true') {
        delete target.dataset.autoSelectPending;
        performSelection(target);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if (e.target === lastFocusedInput) {
        lastFocusedInput = null;
      }
      if (e.target && e.target instanceof HTMLInputElement) {
        delete e.target.dataset.autoSelectPending;
      }
    };

    // استخدام طور الالتقاط (Capture phase = true) لضمان العمل مع كافة الحقول حتى لو أوقفت الكومبوننتات الأخرى انتشار الحدث
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('touchend', handleTouchEnd, true);
    document.addEventListener('focusout', handleFocusOut, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
      document.removeEventListener('focusout', handleFocusOut, true);
    };
  }, []);

  return null;
}
