"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export function useArAgingLogic() {
    const [globalSearch, setGlobalSearch] = useState('');

    const invoicesQuery = useQuery({
        queryKey: ['ar_aging_invoices'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invoices')
                .select('id, invoice_number, date, due_date, total_amount, paid_amount, status, partner_id, partners!invoices_partner_id_fkey(name)')
                .neq('status', 'مسودة');
            if (error) throw error;
            return data || [];
        }
    });

    const rawInvoices = invoicesQuery.data || [];

    const processedClients = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const clientsMap = new Map<string, any>();

        rawInvoices.forEach((inv: any) => {
            const amount = Number(inv.total_amount || 0);
            const paid = Number(inv.paid_amount || 0);
            const balance = amount - paid;

            if (balance > 0) {
                const partnerId = inv.partner_id || 'unknown';
                const partnerName = inv.partners?.name || 'عميل غير معروف';

                if (!clientsMap.has(partnerId)) {
                    clientsMap.set(partnerId, {
                        id: partnerId,
                        name: partnerName,
                        totalDue: 0,
                        current: 0,
                        days1_30: 0,
                        days31_60: 0,
                        days61_90: 0,
                        over90: 0
                    });
                }

                const client = clientsMap.get(partnerId);
                client.totalDue += balance;

                const dueDate = new Date(inv.due_date || inv.date);
                dueDate.setHours(0, 0, 0, 0);

                const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) {
                    client.current += balance;
                } else if (diffDays <= 30) {
                    client.days1_30 += balance;
                } else if (diffDays <= 60) {
                    client.days31_60 += balance;
                } else if (diffDays <= 90) {
                    client.days61_90 += balance;
                } else {
                    client.over90 += balance;
                }
            }
        });

        return Array.from(clientsMap.values());
    }, [rawInvoices]);

    const filteredClients = useMemo(() => {
        let res = processedClients;
        if (globalSearch) {
            const s = globalSearch.toLowerCase();
            res = res.filter(c => c.name.toLowerCase().includes(s));
        }
        // Sort by total due
        return res.sort((a, b) => b.totalDue - a.totalDue);
    }, [processedClients, globalSearch]);

    // Totals
    const totals = filteredClients.reduce((acc, client) => {
        acc.totalDue += client.totalDue;
        acc.current += client.current;
        acc.days1_30 += client.days1_30;
        acc.days31_60 += client.days31_60;
        acc.days61_90 += client.days61_90;
        acc.over90 += client.over90;
        return acc;
    }, { totalDue: 0, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 });

    const exportToExcel = () => {
        const exportData = filteredClients.map(c => ({
            'العميل': c.name,
            'إجمالي المديونية': c.totalDue,
            'حالي (لم يحن الاستحقاق)': c.current,
            '1 - 30 يوم': c.days1_30,
            '31 - 60 يوم': c.days31_60,
            '61 - 90 يوم': c.days61_90,
            'أكثر من 90 يوم': c.over90
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "أعمار الديون");
        XLSX.writeFile(wb, `AR_Aging_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return {
        filteredClients,
        globalSearch,
        setGlobalSearch,
        totals,
        isLoading: invoicesQuery.isLoading,
        exportToExcel
    };
}
