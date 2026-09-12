export type PromotionType = 'BOGO' | 'THRESHOLD' | 'CROSS_SELLING' | 'TIERED' | 'BUNDLE';

export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  status: 'active' | 'inactive' | 'scheduled' | 'expired';
  start_date: string | null;
  end_date: string | null;
  conditions: any; // JSONB
  rewards: any; // JSONB
  priority: number;
}

export interface PosCartItem {
  id: string;
  name?: string;
  qty: number;
  unit_price: number;
  discount?: number;
  promo_discount?: number;
  total?: number;
  [key: string]: any;
}

/**
 * Distributes a manual discount equally across all cart items.
 * @param cart The current cart items
 * @param manualDiscountAmount The total amount of discount to apply
 * @param discountType 'amount' or 'percentage'
 * @returns An updated cart with `discount` and `net_total` fields updated for each item
 */
export function distributeManualDiscount(
  cart: PosCartItem[], 
  manualDiscountAmount: number, 
  discountType: 'amount' | 'percentage'
): PosCartItem[] {
  if (!cart || cart.length === 0 || manualDiscountAmount <= 0) return cart;

  // Calculate gross total of the cart before any discounts
  const grossTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
  if (grossTotal === 0) return cart;

  // Determine the absolute total discount amount
  let totalDiscountAmount = 0;
  if (discountType === 'percentage') {
    totalDiscountAmount = grossTotal * (manualDiscountAmount / 100);
  } else {
    totalDiscountAmount = manualDiscountAmount;
  }

  // Prevent discounting more than the cart total
  if (totalDiscountAmount > grossTotal) {
    totalDiscountAmount = grossTotal;
  }

  // Calculate proportional discount for each item
  let remainingDiscount = totalDiscountAmount;
  
  return cart.map((item, index) => {
    const itemGross = item.unit_price * item.qty;
    
    let itemDiscount = 0;
    
    // If it's the last item, assign all remaining discount to handle rounding errors
    if (index === cart.length - 1) {
      itemDiscount = Number(remainingDiscount.toFixed(2));
    } else {
      // Proportional discount based on item's share of gross total
      const proportion = itemGross / grossTotal;
      itemDiscount = Number((totalDiscountAmount * proportion).toFixed(2));
      remainingDiscount -= itemDiscount;
    }

    // Ensure we don't discount more than the item's remaining gross value after promo_discount
    const promoDiscount = item.promo_discount || 0;
    const maxAllowedDiscount = Math.max(0, itemGross - promoDiscount);
    if (itemDiscount > maxAllowedDiscount) {
        itemDiscount = maxAllowedDiscount;
    }

    const totalDiscount = itemDiscount + promoDiscount;
    const net_total = Math.max(0, itemGross - totalDiscount);

    return {
      ...item,
      discount: itemDiscount,
      total: net_total
    };
  });
}

/**
 * Applies active promotions to the cart. 
 */
export function applyPromotions(cart: PosCartItem[], promotions: Promotion[]): PosCartItem[] {
    const now = new Date();
    const activePromos = (promotions || []).filter(p => {
        if (p.status !== 'active') return false;
        if (p.start_date && new Date(p.start_date) > now) return false;
        if (p.end_date && new Date(p.end_date) < now) return false;
        return true;
    }).sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let updatedCart = [...cart].map(item => ({...item, promo_discount: 0}));

    for (const promo of activePromos) {
        if (promo.type === 'BOGO') {
            const buyItemId = promo.conditions?.buy_item_id;
            const getItemId = promo.rewards?.get_item_id || buyItemId;
            const buyQty = Number(promo.conditions?.buy_qty) || 1;
            const getQty = Number(promo.rewards?.get_qty) || 1;
            const discountPercent = Number(promo.rewards?.discount_percentage) || 100;

            const buyItemIndex = updatedCart.findIndex(i => i.id === buyItemId);
            if (buyItemIndex > -1) {
                const buyItem = updatedCart[buyItemIndex];

                if (getItemId === buyItemId) {
                    // Same item BOGO (e.g. Buy 2 Get 1 Free = set of 3)
                    const setSize = buyQty + getQty;
                    const eligibleSets = Math.floor(buyItem.qty / setSize);
                    
                    if (eligibleSets > 0) {
                         const discountedCount = eligibleSets * getQty;
                         const discountAmount = Math.min(
                             buyItem.unit_price * buyItem.qty, 
                             discountedCount * buyItem.unit_price * (discountPercent / 100)
                         );
                         updatedCart[buyItemIndex] = {
                             ...buyItem,
                             promo_discount: Number(((buyItem.promo_discount || 0) + discountAmount).toFixed(2))
                         };
                    }
                } else {
                    // Cross-item BOGO (e.g. Buy 1 Dispenser Get 2 Gallons Free)
                    const eligibleSets = Math.floor(buyItem.qty / buyQty);
                    const getItemIndex = updatedCart.findIndex(i => i.id === getItemId);
                    
                    if (eligibleSets > 0 && getItemIndex > -1) {
                        const getItem = updatedCart[getItemIndex];
                        const freeQtyEligible = eligibleSets * getQty;
                        const discountedCount = Math.min(getItem.qty, freeQtyEligible);
                        const discountAmount = Math.min(
                            getItem.unit_price * getItem.qty,
                            discountedCount * getItem.unit_price * (discountPercent / 100)
                        );
                        updatedCart[getItemIndex] = {
                            ...getItem,
                            promo_discount: Number(((getItem.promo_discount || 0) + discountAmount).toFixed(2))
                        };
                    }
                }
            }
        }
        else if (promo.type === 'THRESHOLD') {
             const threshold = Number(promo.conditions?.min_cart_value) || 0;
             const discountAmt = Number(promo.rewards?.discount_amount) || 0;
             const discountPct = Number(promo.rewards?.discount_percentage) || 0;

             const cartGross = updatedCart.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
             
             if (cartGross >= threshold && cartGross > 0) {
                 const totalDiscount = discountAmt > 0 ? discountAmt : (cartGross * (discountPct / 100));
                 const cappedDiscount = Math.min(cartGross, totalDiscount);

                 updatedCart = updatedCart.map(item => {
                     const itemGross = item.unit_price * item.qty;
                     const proportion = itemGross / cartGross;
                     const itemShare = Number((cappedDiscount * proportion).toFixed(2));
                     return {
                         ...item,
                         promo_discount: Number(((item.promo_discount || 0) + itemShare).toFixed(2))
                     };
                 });
             }
        }
    }

    return updatedCart.map(item => {
        const itemGross = item.unit_price * item.qty;
        const totalDiscount = (item.discount || 0) + (item.promo_discount || 0);
        return {
            ...item,
            total: Math.max(0, Number((itemGross - totalDiscount).toFixed(2)))
        };
    });
}
