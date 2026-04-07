CREATE TABLE IF NOT EXISTS plan_discounts (
  id              SERIAL PRIMARY KEY,
  plan_days       SMALLINT NOT NULL CHECK (plan_days IN (1,7,14,30)),
  meals_per_day   SMALLINT NOT NULL CHECK (meals_per_day BETWEEN 1 AND 3),
  discount_amount INTEGER NOT NULL DEFAULT 0,
  UNIQUE(plan_days, meals_per_day)
);
