"use client";
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast-context';
import { useRealtimeInvalidate } from '@/lib/useRealtimeSync';
import { SALES_ACCOUNTS, CASH_ACCOUNTS, ACC } from '@/lib/account-ids';
import { notifyInvoiceCreated } from '@/lib/notificationService';
import { distributeManualDiscount, applyPromotions, Promotion, PosCartItem } from '@/lib/promotions_engine';


export function usePosLogic() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // 🔄 مزامنة فورية - تحديث المخزون والفواتير والورديات تلقائياً
    useRealtimeInvalidate(['warehouse_inventory', 'invoices', 'pos_shifts'], ['pos_inventory', 'invoices', 'active_pos_shift', 'pos_open_shifts']);

    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [cart, setCart] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'نقدي (كاش)' | 'شبكة (مدى)' | 'آجل'>('نقدي (كاش)');
    const [partnerId, setPartnerId] = useState<string>('');
    const [delegateId, setDelegateId] = useState<string>(''); // المندوب المسؤول
    const [isDelegateLocked, setIsDelegateLocked] = useState(false); // القفل إذا كان المستخدم مندوب
    const [manualDiscountAmount, setManualDiscountAmount] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');

    // Fetch current user and profile
    const { data: userProfile, isLoading: loadingProfile } = useQuery({
        queryKey: ['pos_user_profile'],
        queryFn: async () => {
            let userId: string | undefined;
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
            if (!userId) {
                const { data: { user } } = await supabase.auth.getUser();
                userId = user?.id;
            }
            if (!userId) return null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, linked_partner_id, role')
                .eq('id', userId)
                .maybeSingle();
            return profile || { id: userId };
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

    // Fetch Active Shift (حماية أمنية: وردية واحدة فقط لكل مستودع في نفس الوقت)
    const { data: activeShift, isLoading: loadingShift } = useQuery({
        queryKey: ['active_pos_shift', selectedWarehouseId],
        queryFn: async () => {
            if (!selectedWarehouseId) return null;

            const { data, error } = await supabase
                .from('pos_shifts')
                .select(`
                    *,
                    warehouse:warehouses(id, name, type),
                    delegate:partners!delegate_id(id, name, phone, code)
                `)
                .eq('status', 'open')
                .eq('warehouse_id', selectedWarehouseId)
                .order('opened_at', { ascending: false })
                .limit(1);

            if (error) {
                console.warn('Error fetching active pos shift:', error);
                return null;
            }
            return data?.[0] || null;
        },
        enabled: !!selectedWarehouseId
    });

    // 🔒 مزامنة المندوب المسؤول تلقائياً مع الوردية النشطة للمستودع المختار
    useEffect(() => {
        if (activeShift && activeShift.warehouse_id === selectedWarehouseId) {
            if (activeShift.delegate_id && activeShift.delegate_id !== delegateId) {
                setDelegateId(activeShift.delegate_id);
            } else if (!activeShift.delegate_id && delegateId) {
                setDelegateId('');
            }
        }
    }, [activeShift?.id, activeShift?.delegate_id, selectedWarehouseId]);

    // Fetch all currently open shifts across the system (لاستعراض ورديات كل المناديب والمستودعات والتبديل السريع بينها)
    const { data: allOpenShifts = [], isLoading: loadingAllShifts } = useQuery({
        queryKey: ['pos_open_shifts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pos_shifts')
                .select('*')
                .eq('status', 'open')
                .order('opened_at', { ascending: false });

            if (error) {
                console.warn('Error fetching all open shifts:', error);
                return [];
            }
            return data || [];
        }
    });

    // 🚚 جلب أمر التشغيل المفتوح تلقائياً إذا كان منفذ البيع المختار سيارة
    const { data: activeFleetOperation = null } = useQuery({
        queryKey: ['pos_active_fleet_op', selectedWarehouseId],
        enabled: !!selectedWarehouseId,
        queryFn: async () => {
            if (!selectedWarehouseId) return null;
            const currentWh = warehouses.find(w => w.id === selectedWarehouseId);
            if (!currentWh || currentWh.type !== 'vehicle') return null;

            const targetVehicleId = currentWh.vehicle_id || currentWh.id;

            const { data, error } = await supabase
                .from('fleet_operations')
                .select(`
                    id,
                    operation_number,
                    operation_date,
                    status,
                    driver_id,
                    vehicle_id,
                    warehouse_id,
                    driver:partners!driver_id(id, name, phone),
                    vehicle:fleet_vehicles(id, plate_number)
                `)
                .or(`vehicle_id.eq.${targetVehicleId},warehouse_id.eq.${selectedWarehouseId}`)
                .neq('status', 'مغلق')
                .neq('status', 'closed')
                .order('operation_date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.warn('Could not fetch active fleet operation for POS:', error);
                return null;
            }
            return data || null;
        }
    });

    // مزامنة المندوب تلقائياً من أمر تشغيل الرحلة إذا كان منفذ البيع سيارة والمندوب غير مقفل
    useEffect(() => {
        if (activeFleetOperation?.driver_id && !isDelegateLocked) {
            setDelegateId(activeFleetOperation.driver_id);
        }
    }, [activeFleetOperation, isDelegateLocked]);

    // Auto-select delegate and warehouse based on logged-in user
    useEffect(() => {
        const profile: any = userProfile;
        if (!loadingProfile && !loadingWarehouses) {
            // إذا كان المستخدم مربوط بمندوب
            if (profile?.linked_partner_id) {
                setDelegateId(profile.linked_partner_id);
                // فقط اقفل التعديل إذا لم يكن مدير أو أدمن (حسب دورك)
                if (profile.role !== 'admin' && profile.role !== 'super_admin') {
                    setIsDelegateLocked(true);
                }
                
                // البحث عن مستودع المندوب
                if (warehouses.length > 0) {
                    const assignedWh = warehouses.find(w => w.delegate_id === profile.linked_partner_id);
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

    const [onlyLowStock, setOnlyLowStock] = useState(false);

    // Fetch available items in the selected POS
    const { data: inventoryItems = [], isLoading: loadingItems } = useQuery({
        queryKey: ['pos_inventory', selectedWarehouseId],
        queryFn: async () => {
            if (!selectedWarehouseId) return [];

            // 1. Fetch all catalog items
            // 1. Fetch Item Master Catalog
            const { data: catalog, error: catErr } = await supabase
                .from('inventory_items')
                .select('id, name, default_price, suggested_price, unit, code, reorder_level, current_quantity, is_returnable_bottle')
                .order('name');

            if (catErr) throw catErr;

            // 2. Fetch inventory for selected warehouse
            const { data: whInv, error: whErr } = await supabase
                .from('warehouse_inventory')
                .select('id, quantity, item_id')
                .eq('warehouse_id', selectedWarehouseId);

            if (whErr) throw whErr;

            const whMap = new Map();
            (whInv || []).forEach((row: any) => {
                whMap.set(row.item_id, row);
            });

            return (catalog || []).map((item: any) => {
                const whRow = whMap.get(item.id);
                let availableQty = whRow ? Number(whRow.quantity || 0) : 0;
                
                // Fallback for main warehouse if not yet recorded in warehouse_inventory
                if (!whRow && selectedWarehouseId === '11111111-1111-1111-1111-111111111111') {
                    availableQty = Number(item.current_quantity || 0);
                }

                const reorderLvl = Number(item.reorder_level) || 5;
                const isCritical = availableQty <= reorderLvl;
                const isNear = availableQty > reorderLvl && availableQty <= reorderLvl * 1.5;

                return {
                    id: item.id,
                    name: item.name || 'صنف غير معروف',
                    price: Number(item.default_price) || 0,
                    suggested_price: Number(item.suggested_price) || Number(item.default_price) || 0,
                    unit: item.unit || 'حبة',
                    code: item.code,
                    available_qty: availableQty,
                    reorder_level: reorderLvl,
                    isCriticalLow: isCritical,
                    isNearLow: isNear,
                    is_returnable_bottle: Boolean(item.is_returnable_bottle)
                };
            });
        },
        enabled: !!selectedWarehouseId
    });

    const lowStockCount = useMemo(() => {
        return inventoryItems.filter((i: any) => i.isCriticalLow).length;
    }, [inventoryItems]);

    // Fetch customers
    const { data: customers = [] } = useQuery({
        queryKey: ['pos_customers'],
        queryFn: async () => {
            const { data } = await supabase.from('partners').select('id, name').in('partner_type', ['عميل', 'نقدي']);
            return data || [];
        }
    });

    const filteredItems = useMemo(() => {
        let items = inventoryItems;
        if (onlyLowStock) {
            items = items.filter((i: any) => i.isCriticalLow || i.isNearLow);
        }
        if (searchQuery) {
            items = items.filter((i: any) => i.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return items;
    }, [inventoryItems, searchQuery, onlyLowStock]);

    const [selectedItemForCart, setSelectedItemForCart] = useState<any>(null);

    const addToCart = (item: any, qty: number = 1, price?: number) => {
        if (!activeShift) {
            setTimeout(() => showToast("⛔ يجب بدء الوردية أولاً قبل إجراء أي مبيعات!", "warning"), 0);
            setIsShiftOpenModalOpen(true);
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            const unitPrice = price !== undefined ? price : (existing ? existing.unit_price : (item.suggested_price || 0));
            
            if (existing) {
                if (existing.qty + qty > item.available_qty) {
                    setTimeout(() => showToast(`⛔ تجاوز المخزون ممنوع! الكمية المطلوبة (${existing.qty + qty}) تتجاوز الرصيد المتوفر (${item.available_qty})`, 'error'), 0);
                    return prev;
                }
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + qty, unit_price: unitPrice } : i);
            }
            if (qty > item.available_qty) {
                setTimeout(() => showToast(`⛔ تجاوز المخزون ممنوع! الكمية المطلوبة (${qty}) تتجاوز الرصيد المتوفر (${item.available_qty})`, 'error'), 0);
                return prev;
            }
            return [...prev, { ...item, qty, unit_price: unitPrice }];
        });
    };

    const handleItemClick = (item: any) => {
        if (!activeShift) {
            showToast("⛔ يجب بدء الوردية أولاً قبل اختيار الأصناف!", "warning");
            setIsShiftOpenModalOpen(true);
            return;
        }
        setSelectedItemForCart({ ...item, selected_qty: 1, selected_price: item.suggested_price || 0 });
    };

    const confirmAddToCart = () => {
        if (!activeShift) {
            showToast("⛔ يجب بدء الوردية أولاً!", "warning");
            setIsShiftOpenModalOpen(true);
            return;
        }
        if (selectedItemForCart) {
            if (selectedItemForCart.selected_qty > selectedItemForCart.available_qty) {
                showToast(`⛔ منع البيع: الكمية المطلوبة (${selectedItemForCart.selected_qty}) تتجاوز الرصيد المتوفر في المستودع (${selectedItemForCart.available_qty})!`, 'error');
                return;
            }
            addToCart(selectedItemForCart, selectedItemForCart.selected_qty, selectedItemForCart.selected_price);
            setSelectedItemForCart(null);
        }
    };


    const handleBarcodeScan = (barcode: string) => {
        if (!activeShift) {
            showToast("⛔ يجب بدء الوردية أولاً قبل مسح الباركود وإجراء المبيعات!", "warning");
            setIsShiftOpenModalOpen(true);
            return;
        }
        const item = inventoryItems.find((i: any) => String(i.code) === barcode || String(i.id) === barcode);
        if (item) {
            if (1 > item.available_qty) {
                showToast(`⛔ نفد رصيد هذا الصنف بالمستودع (${item.name})!`, 'error');
                return;
            }
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
            showToast(`⛔ تجاوز المخزون ممنوع! الرصيد المتاح لهذا الصنف هو ${item.available_qty} فقط`, 'error');
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
    const [isThermalPrintModalOpen, setIsThermalPrintModalOpen] = useState<boolean>(false);
    const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState<boolean>(false);
    const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState<boolean>(false);
    const [isOpenShiftsDrawerOpen, setIsOpenShiftsDrawerOpen] = useState<boolean>(false);
    const [hasAutoOpenedShift, setHasAutoOpenedShift] = useState<boolean>(false);

    // تذكير بفتح الوردية لمرة واحدة عند التحميل للكاشير/المندوب
    useEffect(() => {
        if (!loadingShift && !loadingProfile && selectedWarehouseId && !activeShift && !hasAutoOpenedShift) {
            setIsShiftOpenModalOpen(true);
            setHasAutoOpenedShift(true);
        }
    }, [loadingShift, loadingProfile, selectedWarehouseId, activeShift, hasAutoOpenedShift]);

    // Fetch Active Promotions
    const { data: promotions = [] } = useQuery({
        queryKey: ['active_promotions'],
        queryFn: async () => {
            const { data, error } = await supabase.from('promotions').select('*').eq('status', 'active');
            if (error) return [];
            return data as Promotion[];
        }
    });

    const processedCart = useMemo(() => {
        let currentCart = [...cart];
        
        if (promotions.length > 0) {
            currentCart = applyPromotions(currentCart, promotions);
        }
        
        if (manualDiscountAmount > 0) {
            currentCart = distributeManualDiscount(currentCart, manualDiscountAmount, discountType);
        } else {
             currentCart = currentCart.map(item => {
                 const gross = (item.unit_price || item.price || 0) * (item.qty || item.quantity);
                 const d = (item.discount || 0) + (item.promo_discount || 0);
                 return { ...item, total: gross - d };
             });
        }
        
        return currentCart;
    }, [cart, promotions, manualDiscountAmount, discountType]);

    const cartTotal = useMemo(() => {
        let sum = 0;
        processedCart.forEach(item => {
            sum += item.total || 0;
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
    }, [processedCart, isTaxInclusive]);

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            // 🔒 حماية صارمة: منع أي عملية بيع بدون بدء وفتح الوردية أولاً
            if (!activeShift) {
                setIsShiftOpenModalOpen(true);
                throw new Error("⛔ منع أمني: لا يمكن إتمام أي عملية بيع بدون بدء وفتح الوردية أولاً! يرجى الضغط على 'بدء الوردية' لتسجيل العهدة وبدء البيع.");
            }
            if (cart.length === 0) throw new Error("السلة فارغة!");
            if (!selectedWarehouseId) throw new Error("يرجى تحديد منفذ البيع!");

            const autoNumber = `INV-POS-${Date.now().toString().slice(-6)}`;
            
            const linesData = processedCart.map(item => ({
                item_id: item.inventory_items?.id || item.id,
                name: item.inventory_items?.name || item.name,
                quantity: item.quantity || item.qty,
                unit_price: item.selected_price || item.unit_price || item.price || 0,
                discount: (item.discount || 0) + (item.promo_discount || 0),
                total: item.total !== undefined ? item.total : (((item.quantity || item.qty) * (item.selected_price || item.unit_price || item.price || 0)) - ((item.discount || 0) + (item.promo_discount || 0))),
                warehouse_id: selectedWarehouseId,
                is_returnable_bottle: Boolean(item.is_returnable_bottle)
            }));

            const totalInvoiceDiscount = processedCart.reduce((sum, item) => sum + (item.discount || 0) + (item.promo_discount || 0), 0);

            // Resolve fleet_operation_id if warehouse is a vehicle
            let fleetOpId = activeFleetOperation?.id || null;
            if (!fleetOpId && selectedWarehouseId) {
                const wh = warehouses.find(w => w.id === selectedWarehouseId);
                if (wh?.type === 'vehicle') {
                    const targetVehicleId = wh.vehicle_id || wh.id;
                    const { data: op } = await supabase.from('fleet_operations')
                        .select('id, driver_id')
                        .or(`vehicle_id.eq.${targetVehicleId},warehouse_id.eq.${selectedWarehouseId}`)
                        .neq('status', 'مغلق')
                        .neq('status', 'closed')
                        .order('operation_date', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (op) {
                        fleetOpId = op.id;
                    }
                }
            }

            // 🔑 الحسابات من الملف المركزي — بدون استعلامات DB إضافية
            // 123 العملاء (ذمم مدينون) — 41 إيرادات المبيعات

            // 1. إنشاء الفاتورة بحالة معلق
            const invoiceHeader = {
                invoice_number: autoNumber,
                date: new Date().toISOString().split('T')[0],
                partner_id: partnerId || null,
                client_name: !partnerId ? 'عميل نقدي' : customers.find((c: any) => c.id === partnerId)?.name,
                total_amount: cartTotal.total,
                taxable_amount: cartTotal.subtotal,
                tax_amount: cartTotal.tax,
                materials_discount: totalInvoiceDiscount, // Add total discount here
                status: 'معلق',
                warehouse_id: selectedWarehouseId,
                delegate_id: delegateId || null,
                payment_method: paymentMethod,
                paid_amount: paymentMethod !== 'آجل' ? cartTotal.total : 0,
                debit_account_id: SALES_ACCOUNTS.AR,        // 123 العملاء
                credit_account_id: SALES_ACCOUNTS.REVENUE,  // 41 إيرادات المبيعات
                lines_data: linesData,
                shift_id: activeShift?.id,
                fleet_operation_id: fleetOpId,
                payment_status: paymentMethod !== 'آجل' ? 'paid' : 'unpaid'
            };

            const { data: insertedInv, error: invErr } = await supabase.from('invoices').insert([invoiceHeader]).select().single();
            if (invErr) throw new Error(invErr.message);

            // 🔔 بث إشعار فوري للفاتورة في النظام وعبر الجوال
            notifyInvoiceCreated({
                invoiceNumber: invoiceHeader.invoice_number,
                clientName: invoiceHeader.client_name,
                totalAmount: Number(invoiceHeader.total_amount) || 0,
                invoiceId: insertedInv?.id
            }).catch(() => {});


            // 🔄 التحديث التلقائي لعهدة فوارغ المياه (إن وُجدت أصناف فوارغ)
            const returnableBottlesCount = cart.reduce((acc, it) => acc + (it.is_returnable_bottle ? (Number(it.qty) || Number(it.quantity) || 0) : 0), 0);
            if (returnableBottlesCount > 0) {
                // 1. تسجيل عهدة الفوارغ في حساب العميل المسجل
                if (partnerId) {
                    try {
                        const { data: pRec } = await supabase.from('partners').select('bottle_custody').eq('id', partnerId).maybeSingle();
                        const currentCustody = Number(pRec?.bottle_custody || 0);
                        await supabase.from('partners').update({
                            bottle_custody: currentCustody + returnableBottlesCount
                        }).eq('id', partnerId);
                    } catch (custodyErr) {
                        console.error('Error updating partner bottle custody:', custodyErr);
                    }
                }

                // 2. تحديث عداد الفوارغ المباعة في الوردية الحالية
                if (activeShift?.id) {
                    try {
                        const { data: sRec } = await supabase.from('pos_shifts').select('bottles_sold').eq('id', activeShift.id).maybeSingle();
                        const curSold = Number(sRec?.bottles_sold || 0);
                        await supabase.from('pos_shifts').update({
                            bottles_sold: curSold + returnableBottlesCount
                        }).eq('id', activeShift.id);
                    } catch (shiftErr) {
                        console.error('Error updating shift bottles_sold:', shiftErr);
                    }
                }
            }

            // Deduct from warehouse and create inventory transaction history
            for (let line of linesData) {
                // 1. Insert inventory_transaction to persist history (bypassing RPC to prevent double accounting)
                const txNumber = 'TX-POS-' + Math.floor(Math.random() * 1000000);
                await supabase.from('inventory_transactions').insert([{
                    transaction_number: txNumber,
                    transaction_date: new Date().toISOString().split('T')[0],
                    type: 'sales_deduction',
                    quantity: line.quantity,
                    item_id: line.item_id,
                    partner_id: partnerId || null,
                    unit_price: line.unit_price,
                    total_price: (line as any).total_price || (line as any).total || (line.quantity * line.unit_price),
                    status: 'approved',
                    invoice_id: insertedInv?.id || null,
                    warehouse_id: line.warehouse_id,
                    shift_id: activeShift?.id,
                    fleet_operation_id: fleetOpId
                }]);

                // 2. Direct quantity deduction
                const { data: invItem } = await supabase.from('warehouse_inventory')
                    .select('quantity, id').eq('item_id', line.item_id).eq('warehouse_id', line.warehouse_id).maybeSingle();
                if (invItem) {
                    await supabase.from('warehouse_inventory')
                        .update({ quantity: (Number(invItem.quantity) || 0) - line.quantity })
                        .eq('id', invItem.id);
                } else {
                    await supabase.from('warehouse_inventory')
                        .insert([{
                            warehouse_id: line.warehouse_id,
                            item_id: line.item_id,
                            quantity: -line.quantity
                        }]);
                }

                // If deducting from main warehouse, also update inventory_items.current_quantity
                if (line.warehouse_id === '11111111-1111-1111-1111-111111111111') {
                    const { data: catItem } = await supabase.from('inventory_items')
                        .select('current_quantity').eq('id', line.item_id).single();
                    if (catItem) {
                        await supabase.from('inventory_items')
                            .update({ current_quantity: (Number(catItem.current_quantity) || 0) - line.quantity })
                            .eq('id', line.item_id);
                    }
                }
            }

            // AUTO POST INVOICE (Creates Journal Lines & sets status to مرحل)
            if (insertedInv) {
                await supabase.rpc('post_invoices_bulk', { p_ids: [insertedInv.id] });

                // 🧾 إنشاء وترحيل سند القبض تلقائياً للمبيعات النقدية والشبكة (كل ما هو غير آجل)
                if (paymentMethod !== 'آجل' && cartTotal.total > 0) {
                    const isCardPayment = paymentMethod === 'شبكة (مدى)' || paymentMethod.includes('شبك') || paymentMethod.includes('مدى') || paymentMethod.includes('بطاق') || paymentMethod.includes('بنك');
                    const appropriateSafeAcc = isCardPayment 
                        ? CASH_ACCOUNTS.BANKS 
                        : (delegateId ? ACC.EMPLOYEE_CUSTODY : CASH_ACCOUNTS.CASH_BOX);

                    try {
                        const { error: rpcReceiptErr } = await supabase.rpc('auto_create_pos_receipt', {
                            p_invoice_id: insertedInv.id
                        });
                        if (rpcReceiptErr) {
                            console.warn('auto_create_pos_receipt RPC error, using direct insert fallback:', rpcReceiptErr);
                            const autoRvNumber = `RV-POS-${Date.now().toString().slice(-6)}`;
                            await supabase.from('receipt_vouchers').insert([{
                                receipt_number: autoRvNumber,
                                date: new Date().toISOString().split('T')[0],
                                amount: cartTotal.total,
                                payment_method: paymentMethod,
                                notes: `سداد فاتورة مبيعات نقاط بيع #${insertedInv.invoice_number || autoNumber}`,
                                invoice_id: insertedInv.id,
                                partner_id: partnerId || null,
                                delegate_id: delegateId || null,
                                status: 'مرحل',
                                shift_id: activeShift?.id || null,
                                fleet_operation_id: fleetOpId || null,
                                safe_bank_acc_id: appropriateSafeAcc,
                                partner_acc_id: SALES_ACCOUNTS.AR
                            }]);
                        } else {
                            // ضمان تثبيت shift_id والحساب المالي الصحيح (البنك للشبكة / الخزينة أو العهدة للكاش)
                            await supabase.from('receipt_vouchers').update({
                                shift_id: activeShift?.id || null,
                                fleet_operation_id: fleetOpId || null,
                                delegate_id: delegateId || null,
                                safe_bank_acc_id: appropriateSafeAcc
                            }).eq('invoice_id', insertedInv.id);
                        }
                    } catch (receiptErr) {
                        console.error('Error auto-creating receipt voucher for POS sale:', receiptErr);
                    }
                }
            }

            return insertedInv;
        },
        onSuccess: (data) => {
            setLastInvoice(data);
            setIsThermalPrintModalOpen(true);
            showToast("تمت عملية البيع وإصدار سند القبض بنجاح! ✅", "success");
            setCart([]);
            queryClient.invalidateQueries({ queryKey: ['pos_inventory'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['pos_invoices'] });
            queryClient.invalidateQueries({ queryKey: ['receipt_vouchers'] });
        },
        onError: (err: any) => {
            showToast(`فشلت العملية: ${err.message}`, "error");
        }
    });

    return {
        selectedWarehouseId, setSelectedWarehouseId, warehouses,
        searchQuery, setSearchQuery, inventoryItems: filteredItems, filteredItems,
        selectedItemForCart, setSelectedItemForCart, confirmAddToCart, handleItemClick,
        cart, addToCart, removeFromCart, updateCartItemQty, updateCartItemPrice,
        lastInvoice, setLastInvoice, handleBarcodeScan,
        isPrintModalOpen, setIsPrintModalOpen,
        isThermalPrintModalOpen, setIsThermalPrintModalOpen,
        isShiftCloseModalOpen, setIsShiftCloseModalOpen,
        isShiftOpenModalOpen, setIsShiftOpenModalOpen,
        isOpenShiftsDrawerOpen, setIsOpenShiftsDrawerOpen,
        activeShift, loadingShift, userProfile,
        allOpenShifts, loadingAllShifts,
        switchToShift: (shift: any) => {
            if (shift.warehouse_id) setSelectedWarehouseId(shift.warehouse_id);
            if (shift.delegate_id) setDelegateId(shift.delegate_id);
            else setDelegateId('');
        },
        cartTotal, isTaxInclusive, setIsTaxInclusive,
        paymentMethod, setPaymentMethod,
        customers, partnerId, setPartnerId,
        delegates, delegateId, setDelegateId, isDelegateLocked: isDelegateLocked || !!activeShift,
        activeFleetOperation,
        onlyLowStock, setOnlyLowStock, lowStockCount,
        handleCheckout: () => checkoutMutation.mutate(),
        isCheckingOut: checkoutMutation.isPending,
        isLoading: loadingWarehouses || loadingItems || loadingShift,
        manualDiscountAmount, setManualDiscountAmount,
        discountType, setDiscountType,
        processedCart
    };
}
