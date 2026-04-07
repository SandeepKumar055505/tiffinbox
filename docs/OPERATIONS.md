# TiffinBox — Admin Operations

> Daily workflows and admin features. Read with PRODUCT.md for business rules.

---

## Daily Admin Workflow

### Morning (before Breakfast delivery)
1. Open `/admin/deliveries?date=today`
2. Review Breakfast deliveries count
3. Check pending skip requests → `/admin/skips`
4. Approve/deny skip requests before 12pm cutoff
5. Mark Breakfast meals as "Preparing" → "Out for Delivery" → "Delivered"

### Midday (before Lunch delivery)
1. Handle pending Lunch skip requests (cutoff 10am)
2. Update Lunch delivery statuses

### Evening (before Dinner delivery)
1. Handle pending Dinner skip requests (cutoff 6pm)
2. Update Dinner delivery statuses

---

## Delivery Management

### Bulk Status Update Flow
```
/admin/deliveries
  Select date (defaults to today)
  View by meal type (tabs: Breakfast | Lunch | Dinner)
  Each row: person name, dish, current status

  Per-meal actions:
    → Mark Preparing (when kitchen starts)
    → Mark Out for Delivery (when delivery person leaves)
    → Mark Delivered (on delivery confirmation)

  Bulk action: "Mark All [Meal Type] Delivered"
    → Updates all non-skipped cells for that date
```

### Delivery Status Flow
```
scheduled → preparing → out_for_delivery → delivered
                                         → skipped
                                         → cancelled
```

---

## Skip Request Management

### Approve
- Meal cell status → `skipped`
- Send notification to user: "Your skip request for [meal] on [date] was approved"
- Credit/refund tracked as note (manual refund process for now)

### Deny
- Meal cell status → back to `scheduled`
- Admin must provide a note/reason
- Send notification to user: "Your skip request was denied: [reason]"

### Auto-approved skips (before cutoff)
These don't create skip_requests rows — meal_cell `is_included` is set to `false` directly.

---

## Menu Management

### Default Menu Grid
`/admin/menu` shows a 7×3 grid (weekdays × meal types).
Each cell = the default dish served that day.

To change the default:
```
Click cell → dropdown of all available meal items of that type
Select new item → Save
(This affects future subscriptions, not already-created meal_cells)
```

To set alternatives (dishes user can swap to):
```
Click cell → "Manage Alternatives" → check/uncheck items
```

### Adding New Meal Items
`/admin/meals/new`
- Name, description, type (breakfast/lunch/dinner/extra), image, price
- `is_extra: true` for add-on items
- `is_available` toggle
- `tags`: 'veg', 'vegan', 'spicy', 'light', 'heavy'

---

## Subscription Management

### View All Subscriptions
`/admin/subscriptions`
- Filter by: status, date range, user search
- Sort by: created_at, start_date, price_paid

### Modify Subscription
- Change status: active ↔ paused ↔ cancelled
- Override cutoff hours for specific subscription
- Note: never edit meal_cells directly via UI — use skip system

### Cancel + Refund
- Admin cancels subscription → status = 'cancelled'
- Refund is manual (bank transfer or Razorpay dashboard)
- System tracks `price_paid` and remaining days for prorated calculation

---

## User Management

### View User
`/admin/users/:id` shows:
- User profile (name, email, Google avatar)
- All persons
- All subscriptions (active + historical)
- Notification history

### Override Cutoffs
On any active subscription:
```
Subscription Detail → "Override Cutoffs" section
Set per-meal cutoff hours for this subscription only
Useful for VIP customers or complaints
```

---

## Promo Code Management

### Create Offer
`/admin/offers`
```
Code: WELCOME50
Type: flat / percent
Value: 50 (₹50 off) or 10 (10% off)
Min order: ₹500
Valid: 2025-01-01 to 2025-12-31
Usage limit: 100 (or blank for unlimited)
```

### Monitor Usage
Each offer shows `used_count / usage_limit`.
Deactivate via toggle (immediate effect — in-progress checkouts unaffected).

---

## Notification Management

### Send Notification
`/admin/notifications`
```
Target: All users / Specific user (search by name/email)
Type: Info | Offer | System | Greeting
Title: max 80 chars
Message: plain text, max 500 chars
```

### Broadcast Use Cases
- Festival greetings (Diwali, Holi, etc.)
- Menu change announcements
- Delivery delay alerts
- New feature announcements

---

## Support Tickets

### Ticket Queue
`/admin/support`
- Filter: Open | Pending | Resolved
- Dashboard badge shows count of open + pending tickets
- Sort by: last updated (newest first)

### Reply Flow
```
Open ticket → read thread → type reply → Submit
Status auto-changes to "pending" (waiting for user's next reply)
Admin can manually set status to "resolved"
```

### Response Time Target
- Reply within 4 business hours for subscriptions/payment issues
- Reply within 24 hours for general queries

---

## Settings Management

`/admin/settings`

### Pricing
Change base meal prices (affects new subscriptions only, not existing).
Edit discount table (change ₹20/15/10 or ₹40/30/20 per day values).

### Cutoffs
Change default skip cutoff hours.
This is the global default — per-subscription overrides take precedence.

### Limits
- Max skip days per week (default: 1)
- Max persons per user (default: 10)

---

## Analytics

`/admin/analytics`

### Key Metrics
- Revenue: daily, weekly, monthly trend line
- Active subscriptions count over time
- New signups per week
- Popular meals (meal_cells count by item_id)
- Skip rate (skipped / total scheduled)
- Support ticket volume

### Data Queries (examples)
```sql
-- Revenue last 7 days
SELECT DATE(created_at) as date, SUM(price_paid) as revenue
FROM subscriptions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Most popular items this week
SELECT mi.name, COUNT(*) as count
FROM meal_cells mc
JOIN meal_items mi ON mi.id = mc.item_id
WHERE mc.date >= CURRENT_DATE - 7
  AND mc.is_included = true
GROUP BY mi.id, mi.name
ORDER BY count DESC
LIMIT 10;
```
