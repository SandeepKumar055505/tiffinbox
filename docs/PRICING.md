# TiffinPoint — Pricing & Discount Logic

> Single source of truth for all price calculations. Mirror in `frontend/src/utils/pricing.ts` and `backend/src/services/pricing.ts`.

---

## Base Prices

```typescript
const MEAL_PRICES = {
  breakfast: 100,  // ₹
  lunch: 120,
  dinner: 100,
};
```

---

## Discount Table

Discount per **day** (not total), based on plan duration and meals selected that day.

| Plan | Meals/day | Discount/day |
|------|-----------|-------------|
| 1 week (7d) | 3 meals | ₹20 |
| 1 week (7d) | 2 meals | ₹15 |
| 1 week (7d) | 1 meal | ₹10 |
| 2 weeks (14d) | 3 meals | ₹40 |
| 2 weeks (14d) | 2 meals | ₹30 |
| 2 weeks (14d) | 1 meal | ₹20 |
| 1 day | any | ₹0 (no discount) |

---

## Pricing Algorithm

```typescript
interface DayPriceInput {
  date: string;
  meals: Array<{ meal_type: 'breakfast' | 'lunch' | 'dinner'; is_included: boolean }>;
  extras: Array<{ price: number; quantity: number }>;
}

function getDiscountAmount(planDays: number, mealsCount: number): number {
  if (planDays < 7) return 0;
  const table: Record<number, Record<number, number>> = {
    7:  { 1: 10, 2: 15, 3: 20 },
    14: { 1: 20, 2: 30, 3: 40 },
  };
  const tier = planDays >= 14 ? 14 : 7;
  return table[tier][mealsCount] ?? 0;
}

function calculateDayPrice(
  day: DayPriceInput,
  planDays: number
): { base: number; discount: number; extras: number; total: number } {
  const includedMeals = day.meals.filter(m => m.is_included);
  const base = includedMeals.reduce(
    (sum, m) => sum + MEAL_PRICES[m.meal_type], 0
  );
  const discount = includedMeals.length > 0
    ? getDiscountAmount(planDays, includedMeals.length)
    : 0;
  const extras = day.extras.reduce(
    (sum, e) => sum + e.price * e.quantity, 0
  );
  return {
    base,
    discount,
    extras,
    total: base - discount + extras,
  };
}

function calculateTotal(
  days: DayPriceInput[],
  planDays: number,
  promoDiscount: number = 0
): PriceBreakdown {
  const perDay = days.map(d => ({
    date: d.date,
    ...calculateDayPrice(d, planDays),
  }));
  const base_total = perDay.reduce((s, d) => s + d.base, 0);
  const discount_total = perDay.reduce((s, d) => s + d.discount, 0);
  const extras_total = perDay.reduce((s, d) => s + d.extras, 0);
  const final_total = base_total - discount_total + extras_total - promoDiscount;
  return {
    base_total,
    discount_total,
    extras_total,
    promo_discount: promoDiscount,
    final_total: Math.max(0, final_total),
    per_day: perDay,
  };
}
```

---

## Promo Code Application

```typescript
function applyPromoCode(
  promoCode: string,
  offer: Offer,
  subtotal: number  // base_total - discount_total + extras_total
): number {
  if (!offer.is_active) return 0;
  const today = new Date().toISOString().split('T')[0];
  if (today < offer.valid_from || today > offer.valid_to) return 0;
  if (offer.usage_limit && offer.used_count >= offer.usage_limit) return 0;
  if (offer.min_order_amount && subtotal < offer.min_order_amount) return 0;

  if (offer.discount_type === 'flat') {
    return Math.min(offer.value, subtotal);  // can't reduce below 0
  } else {
    // percent
    return Math.floor((subtotal * offer.value) / 100);
  }
}
```

---

## Worked Examples

### Example 1: 1-week plan, Mon–Fri (weekdays), all 3 meals daily

```
Each day: B(₹100) + L(₹120) + D(₹100) = ₹320 base
Discount: 3 meals × 7-day plan = ₹20/day
Day price: ₹300

5 days × ₹300 = ₹1,500 total
```

### Example 2: 1-week plan, Mon–Sun (full), 2 meals/day (B+D)

```
Each day: B(₹100) + D(₹100) = ₹200 base
Discount: 2 meals × 7-day plan = ₹15/day
Day price: ₹185

7 days × ₹185 = ₹1,295 total
```

### Example 3: 2-week plan, 1 meal/day (lunch only), Mon–Sun

```
Each day: L(₹120) base
Discount: 1 meal × 14-day plan = ₹20/day
Day price: ₹100

14 days × ₹100 = ₹1,400 total
```

### Example 4: Days with 0 meals (skipped day)

```
Day meals_count = 0
Discount = 0 (no discount applies to a zero-meal day)
Day price = ₹0
This day counts toward the 2-day-off-per-week limit
```

### Example 5: With extras

```
Day: L(₹120), + Raita(₹15 × 2) = ₹150
Plan discount (1 meal, 7-day): ₹10
Day total: ₹120 - ₹10 + ₹30 = ₹140

Extras are charged at full price, no discount on extras.
```

---

## Frontend Real-Time Pricing

The meal grid page (`/subscribe/customize`) recalculates price on every checkbox change:

1. Watch `mealsSchedule` state (array of `{date, meal_type, is_included}`)
2. On change → call `calculateTotal(mealsSchedule, planDays)` locally (no API call)
3. Display `PriceBreakdown.final_total` in sticky bottom bar
4. On "Apply Promo" → call `POST /api/pricing/calculate` with promo_code to verify server-side

---

## Validation Rules

| Rule | Enforcement |
|------|-------------|
| Max 2 complete zero-meal days per week | UI: disable unchecking if limit reached. Backend: validate in subscription creation |
| Extras must be `is_extra: true` items | Backend validation |
| Subscription can't start in the past | Backend: `start_date >= today` |
| Plan end_date calculation | `end_date = start_date + (plan_days - 1) days` adjusted for week_pattern |

---

## End Date Calculation

```typescript
function calculateEndDate(
  startDate: string,
  planDays: 1 | 7 | 14,
  weekPattern: 'full' | 'no_sun' | 'weekdays'
): string {
  // planDays means: 1d=1 delivery day, 7d=7 delivery days, 14d=14 delivery days
  // weekPattern determines which calendar days count as delivery days
  // We count forward until we've hit 'planDays' delivery days

  const excludeSunday = weekPattern === 'no_sun' || weekPattern === 'weekdays';
  const excludeSaturday = weekPattern === 'weekdays';

  const start = new Date(startDate);
  let current = new Date(start);
  let count = 0;

  while (count < planDays) {
    const dow = current.getDay(); // 0=Sun, 6=Sat
    if (!(dow === 0 && excludeSunday) && !(dow === 6 && excludeSaturday)) {
      count++;
    }
    if (count < planDays) current.setDate(current.getDate() + 1);
  }

  return current.toISOString().split('T')[0];
}
```
