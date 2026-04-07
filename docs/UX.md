# TiffinBox — UX & User Flows

> Interaction patterns, edge cases, and UX decisions. Read with PRODUCT.md for full context.

---

## User Flows

### 1. First-Time User Onboarding

```
Landing / Login page
  → Click "Sign in with Google"
  → Google OAuth popup
  → Redirected to /dashboard

Dashboard (empty state)
  → Shows "No plans yet" with prominent "Start a Plan" CTA
  → Prompts to add first person if none exist
```

**UX Notes:**
- No registration form — Google OAuth is the only way in
- No email verification step
- On first login, auto-prompt to add a person (bottom sheet or inline)

---

### 2. Creating a Subscription (Core Flow)

```
Step 1: /subscribe
  Select person → plan duration → week pattern → start date
  → "Customize Meals" button

Step 2: /subscribe/customize
  Meal grid: rows = dates, columns = B/L/D
  Default: all checked with admin's default dish
  Toggle checkboxes to skip specific meals
  Tap any cell to swap the dish (opens DishSelectorModal)
  Bottom sticky bar shows real-time price
  → "Review & Pay" button

Step 3: /subscribe/checkout
  Shows PriceBreakdownCard (base, discount, extras, promo)
  Promo code input (optional)
  "Pay ₹X" button → Razorpay sheet
  On success → POST /api/subscriptions → /subscribe/success

Step 4: /subscribe/success
  Confirmation animation
  "View My Plan" → /subscriptions/:id
  "Add Another Person" → /persons/new
```

**UX Notes:**
- State persists across steps via `SubscribeContext`
- Back navigation preserves all selections
- Pricing recalculates client-side (no API call per toggle)
- Promo code validation requires API call (show spinner)
- If payment fails: stay on checkout, show error toast, allow retry
- If subscription POST fails after payment: show error + support contact

---

### 3. Meal Grid Interaction

**Checkbox behavior:**
- Check → meal included, price increases
- Uncheck → meal skipped (grey out cell), price decreases
- If unchecking would create a 3rd zero-meal day: disable the checkbox + show tooltip "You've used your 2 free days off"
- Zero-meal days show a greyed-out row

**Dish swap:**
- Tap cell (not just checkbox) → DishSelectorModal opens
- Modal shows: current selection (highlighted), alternatives list
- Each alternative: image, name, (same price — no surcharge)
- Select → modal closes, cell updates with new dish

---

### 4. Viewing a Subscription

```
/subscriptions/:id
  Header: person name, plan badge, status badge, date range
  Two tabs: "Schedule" | "Extras"

Schedule tab:
  Grouped by week, then by day
  Each day shows 3 meal cells (or as many as included)
  Each cell: dish image, name, delivery status chip
  Tap cell → options (skip / view dish detail)

Extras tab:
  List of extras added, date + item + quantity + price
  "Add Extra" → item picker modal → choose date → confirm
```

---

### 5. Skip Flow

```
User taps a future meal cell → options sheet appears
  Option: "Skip this meal"
  → Check if before cutoff (local calculation)

If before cutoff:
  Confirm dialog: "Skip [Lunch] on [Monday]? You'll save ₹X."
  Confirm → PATCH meal_cell (auto skip) → show success toast
  Cell immediately shows "Skipped" status

If after cutoff:
  Info dialog: "Skip cutoff has passed. Send a skip request to admin?"
  Confirm → POST /api/skips → show "Pending admin approval" toast
  Cell shows "Pending" chip until admin decides

If approved → cell → "Skipped", notification sent
If denied → cell → back to "Scheduled", notification sent with reason
```

**UX Notes:**
- Cutoff check is client-side for speed (server validates on submit)
- User can cancel a pending skip from the SkipRequests section (if still before cutoff)

---

### 6. Extras

```
On SubscriptionDetail / Extras tab:
  "Add Extra" button
  → Opens item picker modal (list of is_extra=true items)
  → Tap item → date picker (calendar, only subscription dates)
  → Quantity stepper (1-5)
  → Confirm → POST /api/extras → toast "Extra added for [date]"
```

---

### 7. Support Ticket Flow

```
/support
  Shows list of open/pending/resolved tickets
  "New Ticket" button

/support/new
  Subject input + message textarea
  Submit → POST /api/support/tickets → redirect to ticket page

/support/:id
  Chat-style thread (user messages right-aligned, admin left)
  "Reply" textarea at bottom
  Poll for new messages every 30s (or use SSE if available)
```

---

### 8. Admin: Daily Deliveries

```
/admin/deliveries
  Date picker at top (defaults to today)
  Groups meals by meal type (Breakfast → Lunch → Dinner)
  Each item: person name, dish, subscription ID
  Status toggle buttons: Scheduled → Preparing → Out → Delivered
  "Mark All Delivered" bulk action per meal type
```

---

### 9. Admin: Skip Approvals

```
/admin/skips
  Filter tabs: Pending | Approved | Denied
  Each card: user name, meal, date, requested_at
  "Approve" (green) and "Deny" (red) buttons
  Deny → shows note input dialog (optional reason)
  On action → notification sent to user automatically
```

---

## Interaction Patterns

### Optimistic Updates
Use optimistic UI for:
- Checking/unchecking meal cells (instant feedback)
- Marking a notification as read
- Adding/removing extras

Roll back on API error with toast.

### Loading States
- Page load: `LoadingSkeleton` (shimmer lines)
- Button actions: spinner inside button (disabled until resolved)
- Grid recalculation: instant (client-side), no spinner

### Empty States
Every list has an empty state with contextual CTA:
- Dashboard → "No plans yet → Start a Plan"
- Persons list → "No family members → Add Person"
- Notifications → "All caught up" (no action needed)
- Support tickets → "No tickets → Need help? Open a ticket"

### Error States
- API error on page load: error card with "Retry" button
- Form validation: inline errors under each field, shake animation
- Payment failure: error toast + "Try Again" button stays on checkout

### Confirmations
Require confirmation for:
- Cancel subscription (irreversible)
- Delete person (if no active sub)
- Skip a meal (with cost info shown)

Do NOT require confirmation for:
- Checking/unchecking meal grid cells (easily reversible)
- Marking notifications read
- Adding extras (easily removable)

---

## Mobile UX (Primary Target)

- All pages max-width `max-w-md`, centered
- Bottom navigation (not sidebar) for user pages
- Touch targets minimum 44px
- Meal grid cells: minimum 80×80px (scrollable horizontally if needed)
- Dish selector modal: bottom sheet on mobile
- Date picker: native `<input type="date">` on mobile
- Payment: Razorpay's native mobile sheet (handles UPI apps)

---

## Accessibility

- All interactive elements keyboard-accessible
- Status colors always paired with text labels (not color alone)
- Form inputs have visible labels
- Error messages linked to inputs via `aria-describedby`
- Modal focus trap + `Escape` to close
