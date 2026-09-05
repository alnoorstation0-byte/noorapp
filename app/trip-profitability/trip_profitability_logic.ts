import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TripProfitability {
  id: string;
  operation_number: string;
  operation_date: string;
  status: string;
  vehicle_name: string;
  driver_name: string;
  total_sales: number;
  total_expenses: number;
  inventory_cost: number;
  total_cost: number;
  net_profit: number;
}

export function useTripProfitabilityLogic() {
  const [isLoading, setIsLoading] = useState(false);
  const [trips, setTrips] = useState<TripProfitability[]>([]);
  
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalExpenses: 0,
    totalInventoryCost: 0,
    totalNetProfit: 0,
    tripsCount: 0
  });

  const getFirstDayOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };

  const getLastDayOfMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  };

  const [dateRange, setDateRange] = useState({
    start: getFirstDayOfMonth(),
    end: getLastDayOfMonth(),
  });

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // For drivers, it seems the foreign key might not be set up explicitly, or we don't have driver_name easily accessible without a join. 
      // If we don't have vehicles/delegates linked via FK, we'll try to fetch partners/vehicles separately if needed, but for now we'll fetch just operations.
      // Wait, let's just fetch all and map if we need to.
      
      const { data: operations, error } = await supabase
        .from('fleet_operations')
        .select('*')
        .gte('operation_date', dateRange.start)
        .lte('operation_date', dateRange.end)
        .order('operation_date', { ascending: false });

      if (error) throw error;

      // We'll also try to fetch vehicles to map names manually since FK is missing
      const { data: vehicles } = await supabase.from('fleet_vehicles').select('id, name');
      const { data: partners } = await supabase.from('partners').select('id, name');

      const vMap: Record<string, string> = {};
      vehicles?.forEach(v => { vMap[v.id] = v.name; });

      const pMap: Record<string, string> = {};
      partners?.forEach(p => { pMap[p.id] = p.name; });

      let sumSales = 0, sumExpenses = 0, sumInvCost = 0, sumNetProfit = 0;
      
      const mapped: TripProfitability[] = (operations || []).map(op => {
        const sales = op.total_sales || 0;
        const expenses = op.total_expenses || 0;
        const invCost = op.inventory_cost || 0;
        const netProfit = op.net_profit || 0;
        
        sumSales += sales;
        sumExpenses += expenses;
        sumInvCost += invCost;
        sumNetProfit += netProfit;

        return {
          id: op.id,
          operation_number: op.operation_number,
          operation_date: op.operation_date,
          status: op.status,
          vehicle_name: vMap[op.vehicle_id] || 'غير محدد',
          driver_name: pMap[op.driver_id] || 'غير محدد',
          total_sales: sales,
          total_expenses: expenses,
          inventory_cost: invCost,
          total_cost: op.total_cost || (expenses + invCost),
          net_profit: netProfit
        };
      });

      setTrips(mapped);
      setSummary({
        totalSales: sumSales,
        totalExpenses: sumExpenses,
        totalInventoryCost: sumInvCost,
        totalNetProfit: sumNetProfit,
        tripsCount: mapped.length
      });

    } catch (error) {
      console.error('Error fetching trip profitability data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    isLoading,
    dateRange,
    handleDateChange,
    trips,
    summary,
    handleRefresh: fetchData
  };
}
