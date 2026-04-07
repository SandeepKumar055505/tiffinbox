INSERT INTO plan_discounts (plan_days, meals_per_day, discount_amount) VALUES
  (7,  3, 20), (7,  2, 15), (7,  1, 10),
  (14, 3, 40), (14, 2, 30), (14, 1, 20),
  (30, 3, 60), (30, 2, 45), (30, 1, 30)
ON CONFLICT (plan_days, meals_per_day) DO NOTHING;
