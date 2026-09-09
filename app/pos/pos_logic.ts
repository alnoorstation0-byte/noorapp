"use client";
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';

export function usePosLogic() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [cart, setCart] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'نقدي (كاش)' | 'شبكة (مدى)' | 'آجل'>('نقدي (كاش)');
    const [partnerId, setPartnerId] = useState<string>('');

    // Fetch Warehouses (Points of Sale)
    const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
        queryKey: ['pos_warehouses'],
        queryFn: async () => {
            const { data } = await supabase.from('warehouses').select('*').eq('is_active', true).order('name');
            if (data && data.length > 0 && !selectedWarehouseId) {
                setSelectedWarehouseId(data[0].id);
            }
            return data || [];
        }
    });

    // Fetch available items in the selected POS
    const { data: inventoryItems = [], isLoading: loadingItems } = useQuery({
        queryKey: ['pos_inventory', selectedWarehouseId],
        queryFn: async () => {
            if (!selectedWarehouseId) return [];
            const { data } = await supabase
                .from('warehouse_inventory')
                .select(`
                    id, quantity, item_id,
                    inventory_items (id, name, default_price, unit, code)
                `)
                .eq('warehouse_id', selectedWarehouseId)
                .gt('quantity', 0);
            
            return data?.map((row: any) => ({
                id: row.inventory_items?.id,
                name: row.inventory_items?.name,
                price: row.inventory_items?.default_price || 0,
                unit: row.inventory_items?.unit || 'حبة',
                code: row.inventory_items?.code,
                available_qty: row.quantity
            })) || [];
        },
        enabled: !!selectedWarehouseId
    });

    // Fetch customers
    const { data: customers = [] } = useQuery({
        queryKey: ['pos_customers'],
        queryFn: async () => {
            const { data } = await supabase.from('partners').select('id, name').in('partner_type', ['عميل', 'نقدي']);
            return data || [];
        }
    });

    const filteredItems = useMemo(() => {
        if (!searchQuery) return inventoryItems;
        return inventoryItems.filter((i: any) => i.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [inventoryItems, searchQuery]);

    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.qty + 1 > item.available_qty) {
                    showToast(`الكمية المتاحة لا تكفي! المتاح: ${item.available_qty}`, 'warning');
                    return prev;
                }
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, qty: 1, discount: 0 }];
        });
    };

    const handleBarcodeScan = (barcode: string) => {
        const item = inventoryItems.find((i: any) => String(i.code) === barcode || String(i.id) === barcode);
        if (item) {
            addToCart(item);
            showToast(`تمت إضافة ${item.name}`, 'success');
        } else {
            showToast(`الصنف غير موجود أو نفدت كميته: ${barcode}`, 'error');
        }
    };

    const updateCartItemQty = (id: string, qty: number) => {
        const item = inventoryItems.find((i: any) => i.id === id);
        if (item && qty > item.available_qty) {
            showToast(`الكمية المتاحة لا تكفي! المتاح: ${item.available_qty}`, 'warning');
            return;
        }
        if (qty <= 0) {
            setCart(prev => prev.filter(i => i.id !== id));
            return;
        }
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id));
    };

    const cartTotal = useMemo(() => {
        let subtotal = 0;
        cart.forEach(item => {
            subtotal += (item.price * item.qty) - (item.discount || 0);
        });
        const tax = subtotal * 0.15; // Assuming 15% VAT for simplicity in POS
        return { subtotal, tax, total: subtotal + tax };
    }, [cart]);

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            if (cart.length === 0) throw new Error("السلة فارغة!");
            if (!selectedWarehouseId) throw new Error("يرجى تحديد منفذ البيع!");

            const autoNumber = `INV-POS-${Date.now().toString().slice(-6)}`;
            
            // 1. Create Invoice
            const invoiceHeader = {
                invoice_number: autoNumber,
                date: new Date().toISOString().split('T')[0],
                partner_id: partnerId || null,
                client_name: !partnerId ? 'عميل نقدي' : customers.find((c: any) => c.id === partnerId)?.name,
                total_amount: cartTotal.total,
                taxable_amount: cartTotal.subtotal,
                tax_amount: cartTotal.tax,
                status: 'مغلق', // automatically close POS invoices
                warehouse_id: selectedWarehouseId,
                payment_method: paymentMethod,
                paid_amount: paymentMethod !== 'آجل' ? cartTotal.total : 0,
                debit_account_id: '4f828d0d-a1f4-4762-83e3-c17dafae802d', // default customers
                credit_account_id: '6667f91a-9478-49ab-9721-521ee09381fa', // sales revenue
                lines_data: cart.map(item => ({
                    item_id: item.id,
                    name: item.name,
                    quantity: item.qty,
                    unit_price: item.price,
                    discount: item.discount || 0,
                    total: (item.qty * item.price) - (item.discount || 0)
                }))
            };

            const { data: insertedInv, error: invErr } = await supabase.from('invoices').insert([invoiceHeader]).select().single();
            if (invErr) throw invErr;

            // 2. Auto-Post (deduct inventory & create journal entries)
            const { error: postErr } = await supabase.rpc('post_invoices_bulk', { p_ids: [insertedInv.id] });
            if (postErr) throw postErr;

            // 3. Create Receipt Voucher if paid
            if (paymentMethod !== 'آجل') {
                const receiptData = {
                    receipt_number: `RV-POS-${Date.now().toString().slice(-6)}`,
                    date: new Date().toISOString().split('T')[0],
                    amount: cartTotal.total,
                    payment_method: paymentMethod,
                    notes: `سداد فاتورة نقاط البيع #${autoNumber}`,
                    invoice_id: insertedInv.id,
                    partner_id: partnerId || null,
                    safe_bank_acc_id: '21b8a1db-bc9f-4cf8-b741-1efeded0963c', // main safe
                    partner_acc_id: '4f828d0d-a1f4-4762-83e3-c17dafae802d'
                };
                const { error: rectErr } = await supabase.from('receipt_vouchers').insert([receiptData]);
                if (rectErr) throw rectErr;
            }
        },
        onSuccess: () => {
            showToast("تمت عملية البيع بنجاح! ✅", "success");
            setCart([]);
            queryClient.invalidateQueries({ queryKey: ['pos_inventory'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
        onError: (err: any) => {
            showToast(`فشلت العملية: ${err.message}`, "error");
        }
    });

    return {
        warehouses, selectedWarehouseId, setSelectedWarehouseId,
        inventoryItems: filteredItems, searchQuery, setSearchQuery,
        cart, addToCart, updateCartItemQty, removeFromCart, cartTotal, handleBarcodeScan,
        paymentMethod, setPaymentMethod,
        customers, partnerId, setPartnerId,
        handleCheckout: () => checkoutMutation.mutate(),
        isCheckingOut: checkoutMutation.isPending,
        isLoading: loadingWarehouses || loadingItems
    };
}
