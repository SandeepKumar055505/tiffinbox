CREATE TABLE IF NOT EXISTS meal_cells (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  meal_type       VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  is_included     BOOLEAN NOT NULL DEFAULT true,
  item_id         INTEGER NOT NULL REFERENCES meal_items(id),
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'scheduled'
                    CHECK (delivery_status IN (
                      'scheduled','preparing','out_for_delivery',
                      'delivered','skipped','cancelled','failed'
                    )),
  wallet_credited BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(subscription_id, date, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_meal_cells_subscription_id ON meal_cells(subscription_id);
CREATE INDEX IF NOT EXISTS idx_meal_cells_date ON meal_cells(date);
CREATE INDEX IF NOT EXISTS idx_meal_cells_delivery_status ON meal_cells(delivery_status);
