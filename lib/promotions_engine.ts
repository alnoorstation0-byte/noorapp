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

    // Ensure we don't discount more than the item's gross value
    if (itemDiscount > itemGross) {
        itemDiscount = itemGross;
    }

    const totalDiscount = itemDiscount + (item.promo_discount || 0);
    const net_total = itemGross - totalDiscount;

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
    const activePromos = promotions.filter(p => {
        if (p.status !== 'active') return false;
        if (p.start_date && new Date(p.start_date) > now) return false;
        if (p.end_date && new Date(p.end_date) < now) return false;
        return true;
    }).sort((a, b) => b.priority - a.priority);

    let updatedCart = [...cart].map(item => ({...item, promo_discount: 0}));

    for (const promo of activePromos) {
        if (promo.type === 'BOGO') {
            const buyItemId = promo.conditions.buy_item_id;
            const buyQty = promo.conditions.buy_qty || 1;
            const getQty = promo.rewards.get_qty || 1;
            const discountPercent = promo.rewards.discount_percentage || 100;

            const itemIndex = updatedCart.findIndex(i => i.id === buyItemId);
            if (itemIndex > -1) {
                const item = updatedCart[itemIndex];
                const eligibleSets = Math.floor(item.qty / (buyQty + getQty));
                
                if (eligibleSets > 0) {
                     const discountedItemsCount = eligibleSets * getQty;
                     const discountAmount = discountedItemsCount * item.unit_price * (discountPercent / 100);
                     updatedCart[itemIndex] = {
                         ...item,
                         promo_discount: (item.promo_discount || 0) + discountAmount
                     };
                }
            }
        }
        else if (promo.type === 'THRESHOLD') {
             const threshold = promo.conditions.min_cart_value || 0;
             const discountAmt = promo.rewards.discount_amount || 0;
             const discountPct = promo.rewards.discount_percentage || 0;

             const cartGross = updatedCart.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
             
             if (cartGross >= threshold) {
                 const totalDiscount = discountAmt > 0 ? discountAmt : (cartGross * (discountPct / 100));
                 updatedCart = updatedCart.map(item => {
                     const itemGross = item.unit_price * item.qty;
                     const proportion = itemGross / cartGross;
                     return {
                         ...item,
                         promo_discount: (item.promo_discount || 0) + (totalDiscount * proportion)
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
            total: itemGross - totalDiscount
        };
    });
}
