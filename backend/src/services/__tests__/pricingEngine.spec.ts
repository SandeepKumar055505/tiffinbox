import { describe, it, expect, vi } from 'vitest';
import { calculateQuote } from '../pricingEngine';

// Mock DB
vi.mock('../../config/db', () => ({
  db: vi.fn((table: string) => {
    if (table === 'app_settings') {
      return {
        where: () => ({
          first: () => Promise.resolve({
            breakfast_price: 10000,
            lunch_price: 15000,
            dinner_price: 10000,
          })
        })
      };
    }
    if (table === 'plan_discounts') {
      return {
        where: () => Promise.resolve([
          { meals_per_day: 1, discount_amount: 0 },
          { meals_per_day: 2, discount_amount: 5 },
          { meals_per_day: 3, discount_amount: 15 },
        ])
      };
    }
    return { where: () => ({ first: () => Promise.resolve(null) }) };
  })
}));

describe('Pricing Engine', () => {
  it('calculates a basic 1-day quote correctly', async () => {
    const input: any = {
      plan_days: 1,
      days: [
        { date: '2026-05-01', meals: ['breakfast', 'lunch'] }
      ]
    };
    const result = await calculateQuote(input);
    
    // Breakfast (100) + Lunch (150) = 250
    // 2 meals discount = 5
    // Final = 245
    expect(result.base_total).toBe(250);
    expect(result.discount_total).toBe(5);
    expect(result.final_total).toBe(245);
  });

  it('applies wallet balance correctly up to the limit', async () => {
    const input: any = {
      plan_days: 1,
      days: [{ date: '2026-05-01', meals: ['lunch'] }],
      wallet_balance: 50,
      apply_wallet: true
    };
    const result = await calculateQuote(input);
    
    // Lunch(150) - Wallet(50) = 100
    expect(result.wallet_applied).toBe(50);
    expect(result.final_total).toBe(100);
  });

  it('applies promo discounts correctly', async () => {
    const input: any = {
      plan_days: 1,
      days: [{ date: '2026-05-01', meals: ['lunch'] }],
      promo_discount: 20
    };
    const result = await calculateQuote(input);
    
    // Lunch(150) - Promo(20) = 130
    expect(result.final_total).toBe(130);
  });

  it('prevents negative final total when wallet/promo exceeds base', async () => {
    const input: any = {
      plan_days: 1,
      days: [{ date: '2026-05-01', meals: ['breakfast'] }],
      wallet_balance: 500 // Exceeds meal price
    };
    const result = await calculateQuote(input);
    
    expect(result.final_total).toBe(0);
    expect(result.wallet_applied).toBe(100); // 100 is the limit
  });
});
