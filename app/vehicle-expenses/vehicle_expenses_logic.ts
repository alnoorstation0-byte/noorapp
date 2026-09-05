"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useVehicleExpensesLogic() {
    const [globalSearch, setGlobalSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const vehiclesQuery = useQuery({
        queryKey: ['fleet_vehicles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('fleet_vehicles').select('*');
            if (error) throw error;
            return data || [];
        }
    });

    const expensesQuery = useQuery({
        queryKey: ['expenses_for_vehicles', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase.from('expenses').select('*');
            if (dateFrom) q = q.gte('exp_date', dateFrom);
            if (dateTo) q = q.lte('exp_date', dateTo);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const operationsQuery = useQuery({
        queryKey: ['operations_for_vehicles', dateFrom, dateTo],
        queryFn: async () => {
            let q = supabase.from('fleet_operations').select('id, vehicle_id, total_expenses, operation_date, status');
            if (dateFrom) q = q.gte('operation_date', dateFrom);
            if (dateTo) q = q.lte('operation_date', dateTo);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        }
    });

    const rawVehicles = vehiclesQuery.data || [];
    const rawExpenses = expensesQuery.data || [];
    const rawOperations = operationsQuery.data || [];

    const processedData = useMemo(() => {
        return rawVehicles.map(vehicle => {
            // Expenses linked via site_ref
            const vehicleExpenses = rawExpenses.filter(e => e.site_ref === vehicle.id);
            
            let dieselCost = 0;
            let maintenanceCost = 0;
            let otherCost = 0;

            vehicleExpenses.forEach(exp => {
                const amount = Number(exp.paid_amount || exp.total_price || (exp.quantity * exp.unit_price) || 0);
                if (exp.main_category?.includes('محروقات') || exp.main_category?.includes('ديزل') || exp.description?.includes('ديزل')) {
                    dieselCost += amount;
                } else if (exp.main_category?.includes('صيانة') || exp.description?.includes('صيانة') || exp.description?.includes('زيت') || exp.description?.includes('بنشر')) {
                    maintenanceCost += amount;
                } else {
                    otherCost += amount;
                }
            });

            // Trip expenses
            const vehicleOps = rawOperations.filter(op => op.vehicle_id === vehicle.id);
            const totalTrips = vehicleOps.length;
            const tripExpenses = vehicleOps.reduce((sum, op) => sum + Number(op.total_expenses || 0), 0);

            const totalCost = dieselCost + maintenanceCost + otherCost + tripExpenses;

            return {
                id: vehicle.id,
                plate_number: vehicle.plate_number,
                vehicle_model: vehicle.vehicle_model,
                name: vehicle.name || `${vehicle.vehicle_model} - ${vehicle.plate_number}`,
                dieselCost,
                maintenanceCost,
                otherCost,
                tripExpenses,
                totalTrips,
                totalCost
            };
        });
    }, [rawVehicles, rawExpenses, rawOperations]);

    const filteredData = useMemo(() => {
        let result = processedData;
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            result = result.filter(v => 
                v.plate_number?.toLowerCase().includes(s) || 
                v.vehicle_model?.toLowerCase().includes(s) || 
                v.name?.toLowerCase().includes(s)
            );
        }
        return result.sort((a, b) => b.totalCost - a.totalCost); // Sort by highest cost by default
    }, [processedData, globalSearch]);

    const totalDiesel = filteredData.reduce((sum, item) => sum + item.dieselCost, 0);
    const totalMaintenance = filteredData.reduce((sum, item) => sum + item.maintenanceCost, 0);
    const totalOther = filteredData.reduce((sum, item) => sum + item.otherCost, 0);
    const totalTripExpenses = filteredData.reduce((sum, item) => sum + item.tripExpenses, 0);
    const totalOverallCost = totalDiesel + totalMaintenance + totalOther + totalTripExpenses;

    const exportToExcel = () => {
        const exportData = filteredData.map(v => ({
            'اسم / موديل السيارة': v.name,
            'رقم اللوحة': v.plate_number,
            'مصروفات الديزل/المحروقات': v.dieselCost,
            'مصروفات الصيانة': v.maintenanceCost,
            'مصروفات أخرى (مباشرة)': v.otherCost,
            'مصروفات الرحلات (أوامر تشغيل)': v.tripExpenses,
            'عدد الرحلات': v.totalTrips,
            'إجمالي التكلفة الكلية': v.totalCost
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "مصروفات السيارات");
        XLSX.writeFile(wb, `Vehicle_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        filteredData,
        globalSearch,
        setGlobalSearch,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        exportToExcel,
        totals: {
            totalDiesel,
            totalMaintenance,
            totalOther,
            totalTripExpenses,
            totalOverallCost
        },
        isLoading: vehiclesQuery.isLoading || expensesQuery.isLoading || operationsQuery.isLoading
    };
}
