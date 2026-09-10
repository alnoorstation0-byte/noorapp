"use client";
import { useState, useMemo, useEffect } from 'react';
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
    const [delegateId, setDelegateId] = useState<string>(''); // المندوب المسؤول
    const [isDelegateLocked, setIsDelegateLocked] = useState(false); // القفل إذا كان المستخدم مندوب

    // Fetch current user and profile
    const { data: userProfile, isLoading: loadingProfile } = useQuery({
        queryKey: ['pos_user_profile'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return null;
            const { data: profile } = await supabase
                .from('profiles')
                .select('linked_partner_id, role')
                .eq('id', session.user.id)
                .single();
            return profile || null;
        }
    });

    // Fetch Warehouses (Points of Sale)
    const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
        queryKey: ['pos_warehouses'],
        queryFn: async () => {
            const { data } = await supabase.from('warehouses').select('*').eq('is_active', true).order('name');
            return data || [];
        }
    });

    // Fetch delegates (المناديب)
    const { data: delegates = [] } = useQuery({
        queryKey: ['pos_delegates'],
        queryFn: async () => {
            const { data } = await supabase
                .from('partners')
                .select('id, name')
                .in('partner_type', ['مندوب', 'موظف', 'delegate', 'employee'])
                .eq('is_active', true)
                .order('name');
            return data || [];
        }
    });

    // Auto-select delegate and warehouse based on logged-in user
    useEffect(() => {
        if (!loadingProfile && !loadingWarehouses) {
            // إذا كان المستخدم مربوط بمندوب
            if (userProfile?.linked_partner_id) {
                setDelegateId(userProfile.linked_partner_id);
                // فقط اقفل التعديل إذا لم يكن مدير أو أدمن (حسب دورك)
                if (userProfile.role !== 'admin' && userProfile.role !== 'super_admin') {
                    setIsDelegateLocked(true);
                }
                
                // البحث عن مستودع المندوب
                if (warehouses.length > 0) {
                    const assignedWh = warehouses.find(w => w.delegate_id === userProfile.linked_partner_id);
                    if (assignedWh) {
                        setSelectedWarehouseId(assignedWh.id);
                    } else if (!selectedWarehouseId) {
                        setSelectedWarehouseId(warehouses[0].id); // fallback
                    }
                }
            } else {
                // ليس مندوب (مستخدم عادي/أدمن)
                setIsDelegateLocked(false);
                if (!selectedWarehouseId && warehouses.length > 0) {
                    setSelectedWarehouseId(warehouses[0].id);
                }
            }
        }
    }, [userProfile, warehouses, loadingProfile, loadingWarehouses]);

    // Fetch available items in the selected POS
    const { data: inventoryItems = [], isLoading: loadingItems } = useQuery({
        queryKey: ['pos_inventory', selectedWarehouseId],
        queryFn: async () => {
            if (!selectedWarehouseId) return [];
            const { data } = await supabase
                .from('warehouse_inventory')
                .select(`
                    id, quantity, item_id,
                    inventory_items (id, name, default_price, suggested_price, unit, code)
                `)
                .eq('warehouse_id', selectedWarehouseId)
                .gt('quantity', 0);
            
            return data?.map((row: any) => ({
                id: row.inventory_items?.id,
                name: row.inventory_items?.name,
                price: row.inventory_items?.default_price || 0,
                suggested_price: row.inventory_items?.suggested_price || row.inventory_items?.default_price || 0,
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

    const [selectedItemForCart, setSelectedItemForCart] = useState<any>(null);

    const addToCart = (item: any, qty: number = 1, price?: number) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            const unitPrice = price !== undefined ? price : (existing ? existing.unit_price : (item.suggested_price || 0));
            
            if (existing) {
                if (existing.qty + qty > item.available_qty) {
                    setTimeout(() => showToast(`الكمية المتاحة غير كافية! المتاح: ${item.available_qty}`, 'warning'), 0);
                    return prev;
                }
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + qty, unit_price: unitPrice } : i);
            }
            if (qty > item.available_qty) {
                setTimeout(() => showToast(`الكمية المتاحة غير كافية! المتاح: ${item.available_qty}`, 'warning'), 0);
                return prev;
            }
            return [...prev, { ...item, qty, unit_price: unitPrice }];
        });
    };

    const handleItemClick = (item: any) => {
        setSelectedItemForCart({ ...item, selected_qty: 1, selected_price: item.suggested_price || 0 });
    };

    const confirmAddToCart = () => {
        if (selectedItemForCart) {
            addToCart(selectedItemForCart, selectedItemForCart.selected_qty, selectedItemForCart.selected_price);
            setSelectedItemForCart(null);
        }
    };


    const handleBarcodeScan = (barcode: string) => {
        const item = inventoryItems.find((i: any) => String(i.code) === barcode || String(i.id) === barcode);
        if (item) {
            addToCart(item, 1, item.suggested_price || 0);
            showToast(`تمت إضافة ${item.name}`, 'success');
        } else {
            showToast(`الصنف غير موجود أو نفدت كميته: ${barcode}`, 'error');
        }
    };

    const updateCartItemPrice = (id: string, price: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, unit_price: price } : i));
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

    const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(true);
    const [lastInvoice, setLastInvoice] = useState<any>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

    const cartTotal = useMemo(() => {
        let sum = 0;
        cart.forEach(item => {
            sum += ((item.unit_price || item.price || 0) * item.qty) - (item.discount || 0);
        });
        
        if (isTaxInclusive) {
            const subtotal = sum / 1.15;
            const tax = sum - subtotal;
            return { subtotal, tax, total: sum };
        } else {
            const subtotal = sum;
            const tax = subtotal * 0.15;
            return { subtotal, tax, total: subtotal + tax };
        }
    }, [cart, isTaxInclusive]);

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            if (cart.length === 0) throw new Error("السلة فارغة!");
            if (!selectedWarehouseId) throw new Error("يرجى تحديد منفذ البيع!");

            const autoNumber = `INV-POS-${Date.now().toString().slice(-6)}`;
            
            // 1. إنشاء الفاتورة بحالة معلق (غير مرحلة) لكي يعتمدها المحاسب لاحقاً
            const invoiceHeader = {
                invoice_number: autoNumber,
                date: new Date().toISOString().split('T')[0],
                partner_id: partnerId || null,
                client_name: !partnerId ? 'عميل نقدي' : customers.find((c: any) => c.id === partnerId)?.name,
                total_amount: cartTotal.total,
                taxable_amount: cartTotal.subtotal,
                tax_amount: cartTotal.tax,
                status: 'معلق',  // تبقى غير مرحلة - يعتمدها المحاسب
                warehouse_id: selectedWarehouseId,
                delegate_id: delegateId || null,  // المندوب المسؤول عن البيع
                payment_method: paymentMethod,
                paid_amount: paymentMethod !== 'آجل' ? cartTotal.total : 0,
                debit_account_id: '4f828d0d-a1f4-4762-83e3-c17dafae802d',
                credit_account_id: '6667f91a-9478-49ab-9721-521ee09381fa',
                lines_data: cart.map(item => ({
                    item_id: item.id,
                    name: item.name,
                    quantity: item.qty,
                    unit_price: item.unit_price || item.price || 0,
                    discount: item.discount || 0,
                    total: (item.qty * (item.unit_price || item.price || 0)) - (item.discount || 0)
                }))
            };

            const { data: insertedInv, error: invErr } = await supabase
                .from('invoices')
                .insert([invoiceHeader])
                .select('*, partners:partners!invoices_partner_id_fkey(*)')
                .single();
            if (invErr) throw invErr;

            // 2. إنشاء سند قبض إذا الدفع نقدي/شبكة (لكن بدون ترحيل تلقائي)
            if (paymentMethod !== 'آجل') {
                const receiptPayload = {
                    receipt_number: `RCV-POS-${Date.now().toString().slice(-6)}`,
                    date: new Date().toISOString().split('T')[0],
                    amount: cartTotal.total,
                    payment_method: paymentMethod === 'نقدي (كاش)' ? 'نقدي' : 'بطاقة',
                    partner_id: partnerId || null,
                    invoice_id: insertedInv.id,
                    delegate_id: delegateId || null,
                    status: 'مسودة',  // غير مرحل - يعتمده المحاسب
                    notes: `POS - ${invoiceHeader.client_name || 'عميل نقدي'}`,
                    safe_bank_acc_id: '21b8a1db-bc9f-4cf8-b741-1efeded0963c', // الخزينة الرئيسية
                    partner_acc_id: '4f828d0d-a1f4-4762-83e3-c17dafae802d',
                };
                const { error: rectErr } = await supabase.from('receipt_vouchers').insert([receiptPayload]);
                if (rectErr) console.warn('Receipt voucher warning:', rectErr.message);
            }

            return insertedInv;
        },
        onSuccess: (data) => {
            setLastInvoice(data);
            setIsPrintModalOpen(true);
            showToast("تمت عملية البيع بنجاح! ✅ الفاتورة بانتظار الاعتماد المحاسبي", "success");
            setCart([]);
            queryClient.invalidateQueries({ queryKey: ['pos_inventory'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
        },
        onError: (err: any) => {
            showToast(`فشلت العملية: ${err.message}`, "error");
        }
    });

    return {
        selectedItemForCart, setSelectedItemForCart, confirmAddToCart, handleItemClick,
        warehouses, selectedWarehouseId, setSelectedWarehouseId,
        inventoryItems: filteredItems, searchQuery, setSearchQuery,
        cart, addToCart, lastInvoice, setLastInvoice, isPrintModalOpen, setIsPrintModalOpen,
        updateCartItemQty, updateCartItemPrice, removeFromCart, cartTotal, handleBarcodeScan,
        isTaxInclusive, setIsTaxInclusive,
        paymentMethod, setPaymentMethod,
        customers, partnerId, setPartnerId,
        delegates, delegateId, setDelegateId, isDelegateLocked,
        handleCheckout: () => checkoutMutation.mutate(),
        isCheckingOut: checkoutMutation.isPending,
        isLoading: loadingWarehouses || loadingItems
    };
}
