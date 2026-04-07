INSERT INTO streak_rewards (streak_days, reward_type, wallet_amount, expiry_days) VALUES
  (7,  'extra',  0,   7),
  (14, 'wallet', 100, 30),
  (30, 'both',   200, 30)
ON CONFLICT (streak_days) DO NOTHING;
