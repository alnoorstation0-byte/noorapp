import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/helpers';

// 🚀 دالة البلدوزر السريعة لسحب البيانات الضخمة
const fetchAllForDashboard = async (
  tableName: string, 
  columns: string, 
  filters?: { col: string, val: any, op?: 'eq' | 'neq' }[]
) => {
  let allData: any[] = [];
  let currentOffset = 0;
  const limit = 1000;
  while (true) {
    let query = supabase.from(tableName).select(columns).range(currentOffset, currentOffset + limit - 1);
    if (filters) {
      filters.forEach(f => {
        if (f.op === 'neq') query = query.neq(f.col, f.val);
        else query = query.eq(f.col, f.val);
      });
    }
    const { data, error } = await query;
    if (error) break;
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < limit) break;
      currentOffset += limit;
    } else break;
  }
  return allData;
};

export const useDashboardLogic = () => {
  const query = useQuery({
    queryKey: ['dashboard_stats_comprehensive'],
    queryFn: async () => {
      // 1. 📡 سحب كل البيانات الأساسية
      const [
        expenses, invoices, payments, receipts,
        journalLines, accounts, fleetOps,
        warehouses, warehouseInventory, inventoryItems,
        fleetVehicles
      ] = await Promise.all([
        fetchAllForDashboard('expenses', 'id, total_price, unit_price, quantity, vat_amount, discount_amount, paid_amount, is_posted, main_category'),
        fetchAllForDashboard('invoices', 'total_amount, status'),
        fetchAllForDashboard('payment_vouchers', 'amount, is_posted, status'),
        fetchAllForDashboard('receipt_vouchers', 'amount, status'),
        fetchAllForDashboard('journal_lines', 'debit, credit, account_id'),
        fetchAllForDashboard('accounts', 'id, account_type, code, name'),
        fetchAllForDashboard('fleet_operations', 'status, id'),
        fetchAllForDashboard('warehouses', 'id, name'),
        fetchAllForDashboard('warehouse_inventory', 'warehouse_id, item_id, quantity'),
        fetchAllForDashboard('inventory_items', 'id, default_price'),
        fetchAllForDashboard('fleet_vehicles', 'id, status')
      ]);

      // --- 🏗️ تحليل حالات رحلات التوزيع ---
      const activeProjectsCount = fleetOps.filter(f => f.status === 'نشط' || f.status === 'قيد التنفيذ').length;
      const projectsStatusData = [
        { name: 'رحلات نشطة', value: activeProjectsCount },
        { name: 'رحلات مكتملة', value: fleetOps.filter(f => f.status === 'مكتمل').length },
        { name: 'رحلات ملغاة', value: fleetOps.filter(f => f.status === 'ملغى').length }
      ].filter(p => p.value > 0);

      // --- 🏛️ حساب المركز المالي ورصيد النقدية والبنوك من القيود ---
      let totalAssets = 0;
      let totalLiabilities = 0;
      let cashAndBankBalance = 0;
      const accountTypesMap: Record<string, string> = {};
      const cashAccountIds = new Set(
        accounts
          .filter(a => 
            (a.code && (a.code.startsWith('122') || a.code.startsWith('129') || a.code.startsWith('121'))) ||
            (a.name && (a.name.includes('نقد') || a.name.includes('خزين') || a.name.includes('بنك') || a.name.includes('الراجحي') || a.name.includes('الرياض')))
          )
          .map(a => a.id)
      );

      accounts.forEach(acc => { accountTypesMap[acc.id] = acc.account_type || ''; });

      journalLines.forEach(line => {
        const type = accountTypesMap[line.account_id] || '';
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        if (type.includes('أصول') || type.includes('Asset') || type.includes('مدين')) {
          totalAssets += (debit - credit);
        } else if (type.includes('خصوم') || type.includes('التزام') || type.includes('Liability') || type.includes('دائن')) {
          totalLiabilities += (credit - debit);
        }
        if (cashAccountIds.has(line.account_id)) {
          cashAndBankBalance += (debit - credit);
        }
      });

      // --- 💰 حساب المبالغ بدقة وحساب المصروفات بدون عمود amount غير الموجود ---
      const getExpenseAmount = (item: any) => {
        return Number(item.total_price) || 
          ((Number(item.quantity || 1) * Number(item.unit_price || 0)) + Number(item.vat_amount || 0) - Number(item.discount_amount || 0)) || 
          Number(item.paid_amount || 0);
      };

      const validStatuses = ['معتمد', 'posted', 'مرحل', 'مدفوع', 'مغلق', 'approved'];
      const totalExpenses = expenses.reduce((sum, item) => sum + getExpenseAmount(item), 0);
      const totalInvoices = invoices.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      const approvedExpenses = expenses.filter(e => e.is_posted === true).reduce((sum, item) => sum + getExpenseAmount(item), 0);
      const approvedInvoices = invoices.filter(i => validStatuses.includes(i.status)).reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      const netProfit = approvedInvoices - approvedExpenses;

      // --- 📦 تقييم المخزون وأرصدة المستودعات ---
      const itemPrices: Record<string, number> = {};
      inventoryItems.forEach(item => { itemPrices[item.id] = Number(item.default_price || 0); });

      const warehouseBalances: Record<string, { name: string, qty: number, value: number }> = {};
      warehouses.forEach(wh => { warehouseBalances[wh.id] = { name: wh.name, qty: 0, value: 0 }; });

      let totalInventoryValue = 0;
      warehouseInventory.forEach(inv => {
        if (warehouseBalances[inv.warehouse_id]) {
          const qty = Number(inv.quantity || 0);
          const price = itemPrices[inv.item_id] || 0;
          const value = qty * price;
          warehouseBalances[inv.warehouse_id].qty += qty;
          warehouseBalances[inv.warehouse_id].value += value;
          totalInventoryValue += value;
        }
      });

      const warehouseChartData = Object.values(warehouseBalances)
        .sort((a, b) => b.qty - a.qty);

      // --- 🧮 إحصائيات الترحيل الشاملة ---
      const getPostingStats = (data: any[], postedKey: string = 'is_posted', postedVal: any = true) => {
        const posted = data.filter(item => {
          if (Array.isArray(postedVal)) return postedVal.includes(item[postedKey]);
          return item[postedKey] === postedVal || item[postedKey] === true;
        }).length;
        const pending = data.length - posted;
        return [{ name: 'معتمد', value: posted }, { name: 'معلق/مسودة', value: pending }];
      };

      const postingCharts = {
        expenses: getPostingStats(expenses, 'is_posted', true),
        invoices: getPostingStats(invoices, 'status', validStatuses),
        payments: getPostingStats(payments, 'is_posted', true),
        receipts: getPostingStats(receipts, 'status', validStatuses)
      };

      // --- 🚨 المهام المعلقة (pendingActions) المطلوبة في واجهة لوحة القيادة ---
      const unpostedExpenses = expenses.filter(e => e.is_posted !== true).length;
      const unpostedInvoices = invoices.filter(i => !validStatuses.includes(i.status)).length;
      const unpostedPayments = payments.filter(p => p.is_posted !== true).length;
      const unpostedReceipts = receipts.filter(r => !validStatuses.includes(r.status)).length;

      const pendingActions = [
        { type: 'expenses', count: unpostedExpenses },
        { type: 'invoices', count: unpostedInvoices },
        { type: 'payments', count: unpostedPayments },
        { type: 'receipts', count: unpostedReceipts }
      ].filter(a => a.count > 0);

      const alerts: any[] = [];
      pendingActions.forEach(p => {
        alerts.push({
          title: `يوجد (${p.count}) ${p.type} غير معتمد يحتاج مراجعة`,
          type: p.count > 10 ? 'danger' : 'warning',
          route: `/${p.type}`
        });
      });

      // --- 🍩 تجميع المصروفات للرسم البياني ---
      const categoryMap: Record<string, number> = {};
      expenses.forEach(exp => {
        const cat = exp.main_category || 'مصروفات تشغيلية';
        categoryMap[cat] = (categoryMap[cat] || 0) + getExpenseAmount(exp);
      });

      const expensesByCategory = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      return {
        // 📊 الخصائص المباشرة التي تطلبها صفحة DashboardPage
        totalRevenues: approvedInvoices,
        totalExpenses: approvedExpenses,
        cashAndBankBalance,
        totalWarehouses: warehouses.length,
        totalInventoryValue,
        totalVehicles: fleetVehicles.length,
        totalFleetTrips: fleetOps.length,
        cashFlowData: [
          { name: 'المبيعات', income: approvedInvoices, expense: 0 },
          { name: 'المصروفات', income: 0, expense: approvedExpenses }
        ],
        expensesByCategory,
        pendingActions,

        // 🏛️ كائن totals والبيانات المتقدمة
        totals: {
          totalExpenses,
          totalInvoices,
          approvedExpenses,
          approvedInvoices,
          netProfit,
          totalInventoryValue,
          activeProjects: activeProjectsCount,
          totalAssets,
          totalLiabilities
        },
        projectsStatusData,
        warehouseChartData,
        postingCharts,
        alerts
      };
    },
    staleTime: 1000 * 60 * 5,
  });


  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    formatCurrency
  };
};
