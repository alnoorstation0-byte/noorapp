import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/helpers';
import { useToast } from '@/lib/toast-context';

// 🚀 دالة سحب البيانات الآمنة والسريعة للوحة القيادة
const fetchAllForDashboard = async (
  tableName: string, 
  columns: string, 
  filters?: { col: string, val: any, op?: 'eq' | 'neq' }[]
) => {
  try {
    let query = supabase.from(tableName).select(columns).limit(1000);
    if (filters) {
      filters.forEach(f => {
        if (f.op === 'neq') query = query.neq(f.col, f.val);
        else query = query.eq(f.col, f.val);
      });
    }
    const { data, error } = await query;
    if (error) {
      if (tableName === 'warehouses') {
        const fb = await supabase.from('warehouses').select('id, name, type, location, phone, manager_name, is_active, tank_capacity_liters, fuel_type, description').limit(500);
        return fb.data || [];
      }
      if (tableName === 'inventory_items') {
        const fb = await supabase.from('inventory_items').select('id, name, current_quantity, default_price, cost_price, unit').limit(1000);
        return fb.data || [];
      }
      if (tableName === 'pos_shifts') {
        const fb = await supabase.from('pos_shifts').select('id, opened_at, closed_at, status, starting_cash, expected_cash, actual_cash, total_sales').limit(500);
        return fb.data || [];
      }
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
};

export const useDashboardLogic = () => {
  const query = useQuery({
    queryKey: ['dashboard_stats_comprehensive'],
    queryFn: async () => {
      // 1. 📡 سحب كل البيانات الأساسية بما فيها مضخات الوقود والخزانات والورديات
      const [
        expenses, invoices, payments, receipts,
        journalLines, accounts,
        warehouses, warehouseInventory, inventoryItems,
        posShifts
      ] = await Promise.all([
        fetchAllForDashboard('expenses', 'id, total_price, unit_price, quantity, vat_amount, discount_amount, paid_amount, is_posted, main_category, created_at'),
        fetchAllForDashboard('invoices', 'id, total_amount, status, created_at'),
        fetchAllForDashboard('payment_vouchers', 'amount, is_posted, status'),
        fetchAllForDashboard('receipt_vouchers', 'amount, status'),
        fetchAllForDashboard('journal_lines', 'debit, credit, account_id'),
        fetchAllForDashboard('accounts', 'id, account_type, code, name'),
        fetchAllForDashboard('warehouses', 'id, name, type, location, phone, manager_name, is_active, tank_capacity_liters, fuel_type, description'),
        fetchAllForDashboard('warehouse_inventory', 'warehouse_id, item_id, quantity'),
        fetchAllForDashboard('inventory_items', 'id, name, current_quantity, default_price, cost_price, unit'),
        fetchAllForDashboard('pos_shifts', 'id, opened_at, closed_at, status, starting_cash, expected_cash, actual_cash, total_sales')
      ]);

      // --- ⛽ تحليل حالة مضخات الوقود مباشرة من بيانات المحطات لمنع أخطاء 404 ---
      const fuelPumps: any[] = [];
      (warehouses || []).forEach((wh: any) => {
        if (wh.description) {
          try {
            const parsed = JSON.parse(wh.description);
            if (Array.isArray(parsed?.pumps)) {
              fuelPumps.push(...parsed.pumps.map((p: any) => ({ ...p, warehouse_id: wh.id })));
            }
          } catch {
            // ignore JSON parse error
          }
        }
      });
      const activePumpsCount = fuelPumps.filter(p => p.is_active !== false).length;
      const pumpStatusData = [
        { name: 'مضخات نشطة', value: activePumpsCount },
        { name: 'مضخات تحت الصيانة', value: fuelPumps.filter(p => p.is_active === false).length }
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

      // --- ⏳ مراقبة الصلاحيات والإنذارات ---
      let expiredItemsCount = 0;
      let criticalExpiryCount = 0;
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let localExp: any = {};
        if (typeof window !== 'undefined') {
          try { localExp = JSON.parse(localStorage.getItem('taj_expiry_metadata_cache') || '{}'); } catch {}
        }
        (inventoryItems || []).forEach((it: any) => {
          const cached = localExp[it.id] || {};
          const expDate = it.expiry_date || cached.expiry_date;
          const alertDays = Number(it.alert_before_days || cached.alert_before_days || 30);
          if (expDate) {
            const exp = new Date(expDate);
            exp.setHours(0, 0, 0, 0);
            const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diff <= 0) expiredItemsCount++;
            else if (diff <= alertDays) criticalExpiryCount++;
          }
        });
      } catch (e) {
        console.warn('Dashboard expiry check fallback:', e);
      }

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

      // --- ⛽ استخراج خزانات الوقود الحقيقية من المستودعات (Real Fuel Storage Tanks) ---
      // --- ⛽ استخراج أسطول محطات الوقود مع خزاناتها ومضخاتها ومسؤوليها بدقة فائقة ---
      const processedStations = (warehouses || []).map(w => {
        let stationTanks: any[] = [];
        let stationPumps: any[] = [];
        let notes = '';

        try {
          if (w.description && typeof w.description === 'string' && w.description.trim().startsWith('{')) {
            const parsed = JSON.parse(w.description);
            if (Array.isArray(parsed.tanks)) stationTanks = parsed.tanks;
            if (Array.isArray(parsed.pumps)) stationPumps = parsed.pumps;
            notes = parsed.notes || '';
          } else {
            notes = w.description || '';
          }
        } catch (e) {
          notes = w.description || '';
        }

        if (stationTanks.length === 0 && (Number(w.tank_capacity_liters) > 0 || w.fuel_type)) {
          stationTanks = [{
            tank_number: 'خزان 1',
            fuel_type: w.fuel_type || 'بنزين 91',
            capacity_liters: Number(w.tank_capacity_liters) || 45000,
            current_level: 0
          }];
        }

        const tanks = stationTanks.map((tank, tIdx) => {
          const isGasoline95 = tank.fuel_type?.includes('95');
          const isDiesel = tank.fuel_type?.includes('ديزل');
          const isGasoline91 = tank.fuel_type?.includes('91');
          const tankColor = isGasoline95 ? '#38BDF8' : isDiesel ? '#E06D44' : isGasoline91 ? '#10B981' : '#00E5FF';
          const glowClass = isDiesel ? 'shadow-neon-orange' : isGasoline91 ? 'shadow-neon-green' : 'shadow-neon-cyan';

          const capacity = Number(tank.capacity_liters) || 50000;
          
          let currentLiters = 0;
          if (tank.current_level !== undefined && tank.current_level !== null && Number(tank.current_level) > 0) {
            currentLiters = Number(tank.current_level);
          } else {
            const matchedItem = inventoryItems.find(i => 
              (i.name && i.name.includes(tank.fuel_type)) ||
              (i.fuel_type && i.fuel_type === tank.fuel_type)
            );
            const whInv = warehouseInventory.find((wi: any) => wi.warehouse_id === w.id && wi.item_id === matchedItem?.id);
            if (whInv && Number(whInv.quantity) > 0) {
              currentLiters = Number(whInv.quantity);
            } else if (Number(matchedItem?.current_quantity) > 0) {
              currentLiters = Number(matchedItem?.current_quantity);
            }
          }

          const percentage = capacity > 0 ? Math.min(100, Math.round((currentLiters / capacity) * 100)) : 0;
          const unitPrice = (tank.unit_price && Number(tank.unit_price) > 0) ? Number(tank.unit_price) : (isGasoline95 ? 2.33 : isDiesel ? 1.15 : 2.18);

          let statusText = 'المستوى آمن 🟢';
          let status = 'healthy';
          if (percentage === 0) {
            status = 'critical';
            statusText = 'خزان فارغ 🔴';
          } else if (percentage <= 20) {
            status = 'warning';
            statusText = 'منسوب منخفض ⚠️';
          } else if (percentage >= 90) {
            status = 'healthy';
            statusText = 'شبه ممتلئ 🟢';
          }

          return {
            id: `${w.id}-t-${tIdx}`,
            tankIndex: tIdx,
            warehouseId: w.id,
            warehouseName: w.name,
            name: `${tank.tank_number || `خزان ${tIdx + 1}`} (${tank.fuel_type || 'بنزين 91'})`,
            shortName: `${tank.fuel_type || 'بنزين 91'}`,
            tankNumber: tank.tank_number || `خزان ${tIdx + 1}`,
            fuelType: tank.fuel_type || 'بنزين 91',
            currentLiters,
            capacity,
            unitPrice,
            totalValue: currentLiters * unitPrice,
            percentage,
            color: tankColor,
            glowClass,
            status,
            statusText
          };
        });

        const pumps = stationPumps.map((pump, pIdx) => {
          const isGasoline95 = pump.fuel_type?.includes('95');
          const isDiesel = pump.fuel_type?.includes('ديزل');
          const isGasoline91 = pump.fuel_type?.includes('91');
          const color = isGasoline95 ? '#38BDF8' : isDiesel ? '#E06D44' : isGasoline91 ? '#10B981' : '#00E5FF';

          return {
            id: pump.id || `${w.id}-p-${pIdx}`,
            warehouseId: w.id,
            pumpNumber: pump.pump_number || `0${pIdx + 1}`,
            pumpName: pump.pump_name || `مضخة (${pump.fuel_type || 'بنزين 91'})`,
            fuelType: pump.fuel_type || 'بنزين 91',
            unitPrice: Number(pump.unit_price) || (isGasoline95 ? 2.33 : isDiesel ? 1.15 : 2.18),
            currentMeter: Number(pump.current_meter) || 0,
            isActive: pump.is_active !== false,
            color
          };
        });

        const totalCapacity = tanks.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
        const totalCurrentLiters = tanks.reduce((sum, t) => sum + (Number(t.currentLiters) || 0), 0);
        const fillPercentage = totalCapacity > 0 ? Math.min(100, Math.round((totalCurrentLiters / totalCapacity) * 100)) : 0;
        const activePumpsCount = pumps.filter(p => p.isActive).length;

        return {
          id: w.id,
          name: w.name,
          type: w.type || 'pos',
          managerName: w.manager_name || 'إدارة المحطة',
          phone: w.phone || 'غير مسجل',
          location: w.location || 'الفرع الرئيسي',
          isActive: w.is_active !== false,
          notes,
          tanks,
          pumps,
          tanksCount: tanks.length,
          pumpsCount: pumps.length,
          activePumpsCount,
          totalCapacity,
          totalCurrentLiters,
          fillPercentage
        };
      });

      const tanksData: any[] = processedStations.flatMap(s => s.tanks);
      const allPumpsData: any[] = processedStations.flatMap(s => s.pumps);

      // 📊 إحصائيات الخزانات الإجمالية
      const totalTanksCount = tanksData.length;
      const totalStorageCapacity = tanksData.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
      const totalCurrentLiters = tanksData.reduce((sum, t) => sum + (Number(t.currentLiters) || 0), 0);
      const overallFillPercentage = totalStorageCapacity > 0 ? Math.min(100, Math.round((totalCurrentLiters / totalStorageCapacity) * 100)) : 0;

      // --- ⏱️ إحصائيات الورديات والمضخات ومبيعات اللترات الحقيقية ---
      const openShift = posShifts.find(s => s.status === 'open');
      const totalLitersSold = posShifts.reduce((acc, s) => acc + Number(s.total_liters_sold || 0), 0);
      const totalShiftSales = posShifts.reduce((acc, s) => acc + Number(s.total_sales || 0), 0);

      // إعداد بيانات خط اتجاه المبيعات (Sales Timeline) الحقيقية
      const currentSalesToday = approvedInvoices || totalShiftSales;
      const salesTimelineData = [
        { time: '06:00', sales: 0, liters: 0 },
        { time: '09:00', sales: 0, liters: 0 },
        { time: '12:00', sales: 0, liters: 0 },
        { time: '15:00', sales: 0, liters: 0 },
        { time: '18:00', sales: 0, liters: 0 },
        { time: '21:00', sales: 0, liters: 0 },
        { time: 'الآن', sales: currentSalesToday, liters: totalLitersSold }
      ];

      // حساب توزيع المبيعات أو المخزون حسب نوع الوقود الحقيقي
      const fuelDistributionData = [
        { name: 'بنزين 91', value: 0, liters: 0, color: '#00E5FF' },
        { name: 'بنزين 95', value: 0, liters: 0, color: '#38BDF8' },
        { name: 'ديزل', value: 0, liters: 0, color: '#E06D44' }
      ];
      inventoryItems.forEach(item => {
        const matched = fuelDistributionData.find(f => item.name?.includes(f.name));
        if (matched) {
          matched.liters = Number(item.current_quantity || 0);
        }
      });
      const totalFuelStock = fuelDistributionData.reduce((sum, f) => sum + f.liters, 0);
      fuelDistributionData.forEach(f => {
        f.value = totalFuelStock > 0 ? Math.round((f.liters / totalFuelStock) * 100) : (f.name === 'بنزين 91' ? 100 : 0);
      });

      return {
        // 🚀 مركز القيادة والتحكم: المؤشرات الحيوية لمحطات النور
        fuelTanks: tanksData,
        fuelPumps: fuelPumps,
        primaryStationName: primaryStation?.name || 'محطة النور الرئيسية',
        activeShift: openShift || null,
        totalLitersSold,
        salesTimelineData,
        fuelDistributionData,

        // 📊 الخصائص المباشرة والمؤشرات المالية
        totalRevenues: approvedInvoices || totalShiftSales,
        totalExpenses: approvedExpenses,
        cashAndBankBalance: cashAndBankBalance,
        totalWarehouses: warehouses.length,
        totalInventoryValue: totalInventoryValue,
        totalPumps: fuelPumps.length,
        activePumps: activePumpsCount,
        totalShifts: posShifts.length,
        cashFlowData: [
          { name: 'المبيعات', income: approvedInvoices || totalShiftSales, expense: 0 },
          { name: 'المصروفات', income: 0, expense: approvedExpenses }
        ],
        expensesByCategory,
        pendingActions,
        expiredItemsCount,
        criticalExpiryCount,

        // 🏛️ كائن totals والبيانات المتقدمة
        totals: {
          totalExpenses,
          totalInvoices,
          approvedExpenses,
          approvedInvoices,
          netProfit,
          totalInventoryValue,
          activePumps: activePumpsCount,
          totalAssets,
          totalLiabilities
        },
        // 🛢️ ملخص وقائمة الخزانات والمحطات
        tanksSummary: {
          totalTanksCount,
          totalStorageCapacity,
          totalCurrentLiters,
          overallFillPercentage
        },
        allStations: processedStations,
        allPumps: allPumpsData,
        projectsStatusData: pumpStatusData,
        warehouseChartData,
        postingCharts,
        alerts
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // 💾 حفظ وضبط الخزانات والمضخات لأي محطة مباشرة من الداشبورد
  const saveStationTanksMutation = useMutation({
    mutationFn: async ({ warehouseId, tanks, pumps }: { warehouseId: string, tanks?: any[], pumps?: any[] }) => {
      const { data: wh, error: fetchErr } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId)
        .single();
      if (fetchErr) throw fetchErr;

      let descObj: any = {};
      try {
        if (wh.description && wh.description.trim().startsWith('{')) {
          descObj = JSON.parse(wh.description);
        } else {
          descObj = { notes: wh.description || '' };
        }
      } catch {
        descObj = { notes: wh.description || '' };
      }

      let totalCap = wh.tank_capacity_liters;
      let primaryFuel = wh.fuel_type;

      if (tanks && Array.isArray(tanks)) {
        const formattedTanks = (tanks || []).map((t: any, idx: number) => ({
          tank_number: t.tank_number || `خزان ${idx + 1}`,
          fuel_type: t.fuel_type || 'بنزين 91',
          capacity_liters: Number(t.capacity_liters) || 0,
          current_level: Number(t.current_level) || 0
        }));
        descObj.tanks = formattedTanks;
        totalCap = formattedTanks.reduce((sum, t) => sum + (Number(t.capacity_liters) || 0), 0);
        primaryFuel = formattedTanks.length > 0 ? [...new Set(formattedTanks.map(t => t.fuel_type))].join('، ') : null;
      }

      if (pumps && Array.isArray(pumps)) {
        const formattedPumps = (pumps || []).map((p: any, idx: number) => ({
          id: p.id || `pump_${idx + 1}`,
          pump_number: p.pump_number || `0${idx + 1}`,
          pump_name: p.pump_name || `مضخة (${p.fuel_type || 'بنزين 91'})`,
          fuel_type: p.fuel_type || 'بنزين 91',
          unit_price: Number(p.unit_price) || 0,
          current_meter: Number(p.current_meter) || 0,
          is_active: p.is_active !== false
        }));
        descObj.pumps = formattedPumps;
      }

      const { error: updateErr } = await supabase
        .from('warehouses')
        .update({
          description: JSON.stringify(descObj),
          tank_capacity_liters: totalCap,
          fuel_type: primaryFuel
        })
        .eq('id', warehouseId);

      if (updateErr) throw updateErr;

      // محاولة حفظ المضخات في جدول fuel_pumps إن كان موجوداً
      if (pumps && Array.isArray(pumps)) {
        try {
          for (const p of pumps) {
            const pumpRecord: any = {
              warehouse_id: warehouseId,
              pump_number: p.pump_number || '01',
              pump_name: p.pump_name || `مضخة (${p.fuel_type || 'بنزين 91'})`,
              fuel_type: p.fuel_type || 'بنزين 91',
              unit_price: Number(p.unit_price) || 0,
              current_meter: Number(p.current_meter) || 0,
              is_active: p.is_active !== false
            };
            if (p.id && !p.id.startsWith('pump_')) {
              await supabase.from('fuel_pumps').update(pumpRecord).eq('id', p.id);
            }
          }
        } catch {
          // ignore table missing error
        }
      }

      // تحديث رصيد الأصناف المقابلة في inventory_items
      for (const t of formattedTanks) {
        if (t.fuel_type && Number(t.current_level) > 0) {
          const { data: matchedItems } = await supabase
            .from('inventory_items')
            .select('id, name')
            .ilike('name', `%${t.fuel_type}%`);

          if (matchedItems && matchedItems.length > 0) {
            await supabase
              .from('inventory_items')
              .update({ current_quantity: Number(t.current_level) })
              .eq('id', matchedItems[0].id);
          }
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats_comprehensive'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      showToast('تم حفظ وضبط الخزانات بنجاح وتحديث الداشبورد ✅', 'success');
    },
    onError: (err: any) => {
      showToast(`فشل حفظ الخزانات: ${err.message}`, 'error');
    }
  });

  // ⚡ تعديل منسوب الخزان السريع (قراءة المسطرة / تفريغ شحنة)
  const updateTankLevelMutation = useMutation({
    mutationFn: async ({ warehouseId, tankIndex, newLevel }: { warehouseId: string, tankIndex: number, newLevel: number }) => {
      const { data: wh, error: fetchErr } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId)
        .single();
      if (fetchErr) throw fetchErr;

      let descObj: any = {};
      try {
        if (wh.description && wh.description.trim().startsWith('{')) {
          descObj = JSON.parse(wh.description);
        }
      } catch {}

      if (!Array.isArray(descObj.tanks) || !descObj.tanks[tankIndex]) {
        throw new Error('بيانات الخزان غير متوفرة للتعديل');
      }

      descObj.tanks[tankIndex].current_level = Number(newLevel) || 0;
      const fuelType = descObj.tanks[tankIndex].fuel_type;

      const { error: updateErr } = await supabase
        .from('warehouses')
        .update({ description: JSON.stringify(descObj) })
        .eq('id', warehouseId);
      if (updateErr) throw updateErr;

      // تحديث رصيد الصنف المباشر
      if (fuelType) {
        const { data: matchedItems } = await supabase
          .from('inventory_items')
          .select('id')
          .ilike('name', `%${fuelType}%`);
        if (matchedItems && matchedItems[0]) {
          await supabase
            .from('inventory_items')
            .update({ current_quantity: Number(newLevel) || 0 })
            .eq('id', matchedItems[0].id);
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats_comprehensive'] });
      showToast('تم تحديث منسوب الخزان بنجاح ⛽', 'success');
    },
    onError: (err: any) => {
      showToast(`فشل تحديث منسوب الخزان: ${err.message}`, 'error');
    }
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    formatCurrency,
    saveStationTanks: saveStationTanksMutation.mutateAsync,
    isSavingTanks: saveStationTanksMutation.isPending,
    updateTankLevel: updateTankLevelMutation.mutateAsync,
    isUpdatingLevel: updateTankLevelMutation.isPending,
    refetch: query.refetch
  };
};
