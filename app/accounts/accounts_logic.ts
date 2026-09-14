"use client";
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';
import * as XLSX from 'xlsx'; // 🚀 استدعاء مكتبة الإكسل

export function useHierarchicalAccountsLogic() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>({});

  // 🧠 1. جلب البيانات "المطبوخة" من الباك إند مع Fallback ذكي للمحرك المباشر
  const { data: accountsReport = [], isLoading } = useQuery({
    queryKey: ['accounts_report_with_lines', startDate, endDate], 
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_accounts_report_with_lines', {
          p_date_from: startDate || '1900-01-01',
          p_date_to: endDate || '2099-12-31'
        });
        if (!error && data) return data;
      } catch (rpcErr) {
        console.warn("get_accounts_report_with_lines RPC not available, using direct calculation:", rpcErr);
      }

      // 🛡️ Fallback المباشر: حساب أرصدة الحركات وتجميع الشجرة مباشرة
      const [accRes, linesRes, headersRes, partnersRes] = await Promise.all([
        supabase.from('accounts').select('*').order('code'),
        supabase.from('journal_lines').select('id, header_id, account_id, partner_id, debit, credit, notes, item_name'),
        supabase.from('journal_headers').select('id, entry_date, description, status'),
        supabase.from('partners').select('id, name')
      ]);

      const accounts = accRes.data || [];
      const lines = linesRes.data || [];
      const headers = headersRes.data || [];
      const partners = partnersRes.data || [];

      const headerMap = new Map(headers.map((h: any) => [h.id, h]));
      const partnerMap = new Map(partners.map((p: any) => [p.id, p]));

      const dateFrom = startDate || '1900-01-01';
      const dateTo = endDate || '2099-12-31';

      return accounts.map(acc => {
        const accLines = lines.filter((l: any) => {
          if (l.account_id !== acc.id) return false;
          const h = headerMap.get(l.header_id);
          const d = h?.entry_date;
          return d ? (d >= dateFrom && d <= dateTo) : true;
        });

        const totalDebit = accLines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
        const totalCredit = accLines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);
        const isDebitNature = ['assets', 'expenses', 'asset', 'expense', 'أصول', 'مصروفات', 'المصروفات', 'الأصول'].includes(String(acc.account_type || '').toLowerCase());
        const balance = isDebitNature ? totalDebit - totalCredit : totalCredit - totalDebit;

        const transactions = accLines.map((l: any) => {
          const h = headerMap.get(l.header_id);
          const p = partnerMap.get(l.partner_id);
          return {
            id: l.id,
            entry_date: h?.entry_date,
            description: h?.description,
            debit: l.debit,
            credit: l.credit,
            notes: l.notes || l.item_name,
            partner_name: p?.name
          };
        });

        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          account_type: acc.account_type,
          parent_id: acc.parent_id,
          is_transactional: acc.is_transactional,
          total_debit: totalDebit,
          total_credit: totalCredit,
          balance: balance,
          transactions: transactions
        };
      });
    }
  });

  // 🧠 2. بناء الشجرة (عملية خفيفة جداً للفرونت إند فقط لترتيب العرض وتطهير الأرقام)
  const treeData = useMemo(() => {
    if (!accountsReport.length) return [];

    const mapById: Record<string, any> = {};

    const sortedAccounts = [...accountsReport].sort((a: any, b: any) => {
         const codeA = a.code ? String(a.code) : '';
         const codeB = b.code ? String(b.code) : '';
         return codeA.localeCompare(codeB);
    });

    sortedAccounts.forEach(acc => {
      const safeId = String(acc.id).trim();
      
      // 🚀 تطهير الأرقام من فخ الكسور العائمة (Floating-Point Precision Fix)
      const cleanDebit = Math.round(Number(acc.total_debit || 0) * 100) / 100;
      const cleanCredit = Math.round(Number(acc.total_credit || 0) * 100) / 100;
      const cleanBalance = Math.round(Number(acc.balance || 0) * 100) / 100;

      mapById[safeId] = { 
        ...acc, 
        children: [], 
        transactions: acc.transactions || [], 
        totalDebit: cleanDebit,
        totalCredit: cleanCredit,
        balance: cleanBalance
      };
    });

    const roots: any[] = [];
    sortedAccounts.forEach(acc => {
      const safeId = String(acc.id).trim();
      const safeParentId = acc.parent_id ? String(acc.parent_id).trim() : null;
      
      if (safeParentId && mapById[safeParentId]) {
        mapById[safeParentId].children.push(mapById[safeId]);
      } else if (!safeParentId) {
        roots.push(mapById[safeId]);
      }
    });

    // 🚀 حساب المجاميع التراكمية للآباء من الأبناء (Rollup)
    const computeTotals = (node: any) => {
      let debit = node.totalDebit || 0;
      let credit = node.totalCredit || 0;
      
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => {
          const childTotals = computeTotals(child);
          debit += childTotals.debit;
          credit += childTotals.credit;
        });
      }
      
      node.totalDebit = Math.round(debit * 100) / 100;
      node.totalCredit = Math.round(credit * 100) / 100;
      const isDebitNature = ['assets', 'expenses', 'asset', 'expense', 'أصول', 'مصروفات', 'المصروفات', 'الأصول'].includes(String(node.account_type || '').toLowerCase());
      node.balance = isDebitNature 
        ? Math.round((node.totalDebit - node.totalCredit) * 100) / 100 
        : Math.round((node.totalCredit - node.totalDebit) * 100) / 100;
      
      return { debit: node.totalDebit, credit: node.totalCredit };
    };

    roots.forEach(root => computeTotals(root));

    return roots;
  }, [accountsReport]);

  // 🧠 3. منطق البحث السريع
  const filteredTree = useMemo(() => {
    if (!searchTerm) return treeData;
    const searchLower = searchTerm.toLowerCase();
    const searchRecursive = (nodes: any[]): any[] => {
      return nodes.map(node => {
        const matchingChildren = searchRecursive(node.children);
        const isMatch = (node.name || '').toLowerCase().includes(searchLower) || (node.code && String(node.code).includes(searchLower));
        if (isMatch || matchingChildren.length > 0) return { ...node, children: matchingChildren };
        return null;
      }).filter(Boolean) as any[];
    };
    return searchRecursive(treeData);
  }, [treeData, searchTerm]);

  const paginatedTree = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTree.slice(start, start + itemsPerPage);
  }, [filteredTree, currentPage, itemsPerPage]);

  // 🚀 4. طابور العمليات (حذف الحسابات)
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
        const { error } = await supabase.from('accounts').delete().in('id', ids); 
        if (error) throw error;
    },
    onMutate: async (ids) => {
        await queryClient.cancelQueries({ queryKey: ['accounts_report_with_lines'] });
        const previous = queryClient.getQueryData(['accounts_report_with_lines']);
        queryClient.setQueryData(['accounts_report_with_lines'], (old: any[]) => old?.filter(acc => !ids.includes(acc.id)));
        return { previous };
    },
    onError: (err: any, vars, context) => {
        queryClient.setQueryData(['accounts_report_with_lines'], context?.previous);
        showToast(`حدث خطأ أثناء الحذف: ${err.message}`, 'error');
    },
    onSuccess: () => {
        setSelectedIds([]);
        showToast('تم حذف الحسابات بنجاح 🗑️', 'success');
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['accounts_report_with_lines'] });
    }
  });

  const saveMutation = useMutation({
      mutationFn: async (payload: any) => {
          // Sanitize payload to only include actual database columns
          const cleanPayload = {
              code: payload.code,
              name: payload.name,
              parent_id: payload.parent_id || null,
              account_type: payload.account_type,
              is_transactional: payload.is_transactional
          };

          if (payload.id) {
              const { error } = await supabase.from('accounts').update(cleanPayload).eq('id', payload.id);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('accounts').insert([cleanPayload]);
              if (error) throw error;
          }
      },
      onSuccess: () => {
          showToast('تم حفظ الحساب بنجاح 💾', 'success');
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['accounts_report_with_lines'] });
      },
      onError: (err: any) => showToast(`خطأ أثناء الحفظ: ${err.message}`, 'error')
  });

  // 📊 5. تصدير ميزان المراجعة إلى Excel بدقة متناهية
  const exportToExcel = () => {
    if (!accountsReport || accountsReport.length === 0) {
        showToast("لا توجد بيانات لتصديرها", "error");
        return;
    }

    // تجهيز البيانات المطهرة
    const excelData = accountsReport.map((acc: any) => {
        const bal = Math.round(Number(acc.balance || 0) * 100) / 100;
        return {
            "كود الحساب": acc.code || '',
            "اسم الحساب": acc.name || '',
            "إجمالي مدين": Math.round(Number(acc.total_debit || 0) * 100) / 100,
            "إجمالي دائن": Math.round(Number(acc.total_credit || 0) * 100) / 100,
            "رصيد مدين": bal > 0 ? bal : 0,
            "رصيد دائن": bal < 0 ? Math.abs(bal) : 0,
        };
    });

    // حساب الإجماليات السفلية مع التقريب لمنع الخلل العائم
    const totalDebit = Math.round(excelData.reduce((sum: number, row: any) => sum + Number(row["إجمالي مدين"] || 0), 0) * 100) / 100;
    const totalCredit = Math.round(excelData.reduce((sum: number, row: any) => sum + Number(row["إجمالي دائن"] || 0), 0) * 100) / 100;
    const totalBalDebit = Math.round(excelData.reduce((sum: number, row: any) => sum + Number(row["رصيد مدين"] || 0), 0) * 100) / 100;
    const totalBalCredit = Math.round(excelData.reduce((sum: number, row: any) => sum + Number(row["رصيد دائن"] || 0), 0) * 100) / 100;

    // إضافة سطر المجاميع
    excelData.push({
        "كود الحساب": "---",
        "اسم الحساب": "الإجماليات الكلية",
        "إجمالي مدين": totalDebit,
        "إجمالي دائن": totalCredit,
        "رصيد مدين": totalBalDebit,
        "رصيد دائن": totalBalCredit,
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // تظبيط عرض الأعمدة للإكسل
    worksheet['!cols'] = [
        { wch: 15 }, // الكود
        { wch: 45 }, // الاسم
        { wch: 20 }, // إجمالي مدين
        { wch: 20 }, // إجمالي دائن
        { wch: 20 }, // رصيد مدين
        { wch: 20 }  // رصيد دائن
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ميزان المراجعة");
    
    // التنزيل الفوري
    const fileName = `ميزان_المراجعة_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    showToast("تم تصدير ميزان المراجعة بنجاح 📊", "success");
  };

  return { 
    paginatedTree, 
    allAccounts: accountsReport,
    totalPages: Math.ceil(filteredTree.length / itemsPerPage) || 1,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    isLoading, searchTerm, setSearchTerm, 
    startDate, setStartDate, endDate, setEndDate,
    expandedIds, 
    toggleExpand: (id: string) => setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    expandAll: () => {
      if (accountsReport && Array.isArray(accountsReport)) {
        const allIds = accountsReport.map((a: any) => String(a.id));
        setExpandedIds([...new Set(allIds)]);
      }
    }, 
    collapseAll: () => setExpandedIds([]),
    selectedIds, setSelectedIds,
    toggleSelection: (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
    
    
    isModalOpen, setIsModalOpen,
    currentRecord, setCurrentRecord,
    handleAdd: () => {
        setCurrentRecord({});
        setIsModalOpen(true);
    },
    handleEdit: (ids: string[]) => {
      if (ids.length === 1) {
          const acc = treeData.find((a:any) => a.id === ids[0]) || accountsReport.find((a:any) => a.id === ids[0]);
          if (acc) {
              setCurrentRecord(acc);
              setIsModalOpen(true);
          }
      }
    },
    handleSave: (payload: any) => saveMutation.mutate(payload),
    handleDelete: (ids: string[]) => { 
        if(confirm(`هل أنت متأكد من حذف ${ids.length} حساب/حسابات بجميع تفاصيلها؟`)) {
            deleteMutation.mutate(ids);
        }
    },
    isDeleting: deleteMutation.isPending,
    isSaving: saveMutation.isPending,
    exportToExcel // 🚀 تم استخراج دالة التصدير هنا لربطها بالزرار
  };
}
