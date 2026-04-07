# TiffinBox — API Reference

> Base URL: `/api`. All endpoints return JSON. Errors use `ApiError` shape.
> Auth: `Authorization: Bearer <jwt>` header. Admin endpoints require admin JWT.

---

## Auth Errors

```json
{ "error": "Unauthorized" }           // 401 — no/invalid token
{ "error": "Forbidden" }              // 403 — wrong role
{ "error": "Validation failed",
  "details": ["field is required"] }  // 422 — bad input
```

---

## Auth Routes — `/api/auth`

### POST /api/auth/google
Authenticate user via Google OAuth code.
```
Body: { code: string }
Response 200: { token: string, user: AuthUser }
Response 400: { error: "Invalid Google token" }
```

### POST /api/auth/admin/login
Admin login with email + password.
```
Body: { email: string, password: string }
Response 200: { token: string, user: { id, name, email, role: 'admin' } }
Response 401: { error: "Invalid credentials" }
```

### GET /api/auth/me
Get current user from JWT. Works for both user and admin tokens.
```
Headers: Authorization: Bearer <token>
Response 200: AuthUser
```

---

## User Routes — `/api/users`
> All require user JWT.

### GET /api/users/:id
Get user profile.
```
Response 200: AuthUser & { persons: Person[] }
```

### PATCH /api/users/:id
Update user profile (name only — email/google_id immutable).
```
Body: { name?: string }
Response 200: AuthUser
```

---

## Person Routes — `/api/persons`
> All require user JWT. Users can only access their own persons.

### GET /api/persons
List all persons for the authenticated user.
```
Response 200: Person[]
```

### POST /api/persons
Create a new person (family member).
```
Body: {
  name: string,
  preferences: {
    is_vegetarian: boolean,
    is_vegan: boolean,
    allergies: string[],
    spice_level: 'mild' | 'medium' | 'hot',
    notes?: string
  }
}
Response 201: Person
Response 422: Validation error
Response 409: { error: "Max persons limit reached" }
```

### PATCH /api/persons/:id
Update person details.
```
Body: Partial<{ name: string, preferences: PersonPreferences }>
Response 200: Person
```

### DELETE /api/persons/:id
Delete a person (only if no active subscriptions).
```
Response 204: (empty)
Response 409: { error: "Cannot delete person with active subscription" }
```

---

## Meal Item Routes — `/api/meals`

### GET /api/meals
List all available meal items.
```
Query: ?type=breakfast|lunch|dinner|extra&is_extra=true|false&is_available=true
Response 200: MealItem[]
```

### GET /api/meals/:id
Get single meal item.
```
Response 200: MealItem
```

---

## Default Menu Routes — `/api/menu`

### GET /api/menu
Get the full default menu grid (21 entries = 7 days × 3 meals).
```
Response 200: DefaultMenuEntry[]   // each has item and available_items populated
```

### GET /api/menu/week
Get default menu formatted as a grid object for the subscription builder.
```
Response 200: {
  [weekday: 0-6]: {
    breakfast?: { default: MealItem, alternatives: MealItem[] },
    lunch?: { ... },
    dinner?: { ... }
  }
}
```

---

## Subscription Routes — `/api/subscriptions`
> All require user JWT.

### GET /api/subscriptions
List subscriptions for the authenticated user.
```
Query: ?status=active|paused|cancelled|completed&person_id=<id>
Response 200: Subscription[]   // with person populated, meals_schedule populated
```

### GET /api/subscriptions/:id
Get single subscription with full detail.
```
Response 200: Subscription   // all fields, meal_cells + day_extras + person
Response 403: if not owner
```

### POST /api/subscriptions
Create new subscription (after successful payment).
```
Body: CreateSubscriptionRequest = {
  person_id: number,
  plan_days: 1 | 7 | 14,
  week_pattern: 'full' | 'no_sun' | 'weekdays',
  start_date: string,           // 'YYYY-MM-DD'
  meals_schedule: Array<{
    date: string,
    meal_type: 'breakfast' | 'lunch' | 'dinner',
    is_included: boolean,
    item_id: number
  }>,
  extras: Array<{
    date: string,
    item_id: number,
    quantity: number
  }>,
  promo_code?: string,
  payment_token: string         // Razorpay payment_id after successful payment
}
Response 201: Subscription
Response 400: { error: "Payment verification failed" }
Response 422: Validation errors
```

### PATCH /api/subscriptions/:id/cancel
Cancel an active subscription.
```
Response 200: { status: 'cancelled', refund_note: string }
```

---

## Skip Routes — `/api/skips`
> All require user JWT.

### POST /api/skips
Request to skip a meal.
```
Body: {
  subscription_id: number,
  date: string,
  meal_type: 'breakfast' | 'lunch' | 'dinner'
}
Response 201: {
  skip: SkipRequest,
  auto_applied: boolean    // true if before cutoff → applied immediately
}
Response 400: { error: "Already skipped" | "Subscription not active" }
Response 409: { error: "Max skip days reached for this week" }
```

### GET /api/skips
List skip requests for the authenticated user.
```
Query: ?subscription_id=<id>&status=pending|approved|denied
Response 200: SkipRequest[]
```

### DELETE /api/skips/:id
Cancel a pending skip request (before cutoff).
```
Response 204: (empty)
Response 400: { error: "Cannot cancel after cutoff" }
```

---

## Extras Routes — `/api/extras`
> All require user JWT.

### POST /api/extras
Add an extra to a day.
```
Body: {
  subscription_id: number,
  date: string,
  item_id: number,
  quantity: number
}
Response 201: DayExtra
```

### DELETE /api/extras/:id
Remove an extra.
```
Response 204: (empty)
```

---

## Pricing Routes — `/api/pricing`

### POST /api/pricing/calculate
Calculate price for a prospective plan (no auth required — used in checkout flow).
```
Body: {
  plan_days: 1 | 7 | 14,
  meals_schedule: Array<{
    date: string,
    meal_type: 'breakfast' | 'lunch' | 'dinner',
    is_included: boolean
  }>,
  extras: Array<{
    item_id: number,
    quantity: number
  }>,
  promo_code?: string
}
Response 200: PriceBreakdown = {
  base_total: number,
  discount_total: number,
  extras_total: number,
  promo_discount: number,
  final_total: number,
  per_day: Array<{ date, base, discount, extras, total }>
}
Response 400: { error: "Invalid promo code" | "Promo code expired" }
```

---

## Payment Routes — `/api/payments`
> Require user JWT.

### POST /api/payments/create-order
Create a Razorpay order before checkout.
```
Body: { amount: number }    // final_total in paise
Response 200: {
  order_id: string,         // Razorpay order_id
  amount: number,
  currency: 'INR',
  key_id: string            // Razorpay public key
}
```

### POST /api/payments/verify
Verify payment signature after Razorpay callback.
```
Body: {
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
}
Response 200: { verified: true }
Response 400: { error: "Signature mismatch" }
```

---

## Notification Routes — `/api/notifications`
> Require user JWT.

### GET /api/notifications
Get notifications for the authenticated user (own + broadcast).
```
Query: ?unread_only=true&limit=20&page=1
Response 200: PaginatedResponse<Notification>
```

### PATCH /api/notifications/:id/read
Mark notification as read.
```
Response 200: { is_read: true }
```

### POST /api/notifications/read-all
Mark all notifications as read.
```
Response 200: { updated: number }
```

---

## Support Routes — `/api/support`
> Require user JWT.

### GET /api/support/tickets
List user's support tickets.
```
Response 200: SupportTicket[]   // without messages
```

### POST /api/support/tickets
Open a new support ticket.
```
Body: { subject: string, message: string }
Response 201: SupportTicket
```

### GET /api/support/tickets/:id
Get ticket with full message thread.
```
Response 200: SupportTicket   // with messages array
```

### POST /api/support/tickets/:id/reply
User adds a reply to their ticket.
```
Body: { message: string }
Response 201: TicketMessage
```

---

## Admin Routes — `/api/admin`
> All require admin JWT.

### GET /api/admin/stats
Get dashboard statistics.
```
Response 200: DashboardStats
```

### GET /api/admin/users
List all users with pagination.
```
Query: ?search=<name/email>&page=1&per_page=20
Response 200: PaginatedResponse<AuthUser & { active_subscriptions: number }>
```

### GET /api/admin/users/:id
Get user detail with all subscriptions.
```
Response 200: AuthUser & { persons: Person[], subscriptions: Subscription[] }
```

### GET /api/admin/subscriptions
List all subscriptions.
```
Query: ?status=active|paused|cancelled&user_id=<id>&date=YYYY-MM-DD&page=1
Response 200: PaginatedResponse<Subscription & { user: AuthUser, person: Person }>
```

### PATCH /api/admin/subscriptions/:id
Admin modify subscription (status, cutoff overrides).
```
Body: {
  status?: 'active' | 'paused' | 'cancelled',
  breakfast_cutoff_hour?: number,
  lunch_cutoff_hour?: number,
  dinner_cutoff_hour?: number
}
Response 200: Subscription
```

### GET /api/admin/deliveries
Get delivery schedule for a specific date.
```
Query: ?date=YYYY-MM-DD (required)
Response 200: Array<{
  subscription_id, user_name, person_name,
  meal_type, item_name, delivery_status
}>
```

### PATCH /api/admin/deliveries/bulk-status
Bulk update delivery status.
```
Body: {
  meal_cell_ids: number[],
  delivery_status: 'preparing' | 'out_for_delivery' | 'delivered'
}
Response 200: { updated: number }
```

### GET /api/admin/skips
List all skip requests.
```
Query: ?status=pending|approved|denied&page=1
Response 200: PaginatedResponse<SkipRequest & { user: AuthUser }>
```

### PATCH /api/admin/skips/:id
Approve or deny a skip request.
```
Body: { status: 'approved' | 'denied', admin_note?: string }
Response 200: SkipRequest
```

### GET /api/admin/menu
Get full default menu.
```
Response 200: DefaultMenuEntry[]
```

### PUT /api/admin/menu/:weekday/:meal_type
Set default item for a slot.
```
Body: { item_id: number }
Response 200: DefaultMenuEntry
```

### POST /api/admin/menu/:weekday/:meal_type/alternatives
Set available alternative items for a slot.
```
Body: { item_ids: number[] }
Response 200: DefaultMenuEntry
```

### GET /api/admin/meals
List all meal items.
```
Query: ?type=breakfast|lunch|dinner|extra&is_available=true|false
Response 200: MealItem[]
```

### POST /api/admin/meals
Create a new meal item.
```
Body: {
  name: string, description: string,
  type: MealType, image_url: string,
  price: number, is_available: boolean,
  is_extra: boolean, tags: string[]
}
Response 201: MealItem
```

### PATCH /api/admin/meals/:id
Update a meal item.
```
Body: Partial<MealItem>
Response 200: MealItem
```

### DELETE /api/admin/meals/:id
Delete a meal item (only if not in active subscriptions).
```
Response 204: (empty)
Response 409: { error: "Item in use" }
```

### GET /api/admin/offers
List all promo offers.
```
Response 200: Offer[]
```

### POST /api/admin/offers
Create a promo code.
```
Body: {
  code: string, description: string,
  discount_type: 'flat' | 'percent', value: number,
  min_order_amount?: number,
  valid_from: string, valid_to: string,
  usage_limit?: number
}
Response 201: Offer
```

### PATCH /api/admin/offers/:id
Update an offer.
```
Body: Partial<Offer>
Response 200: Offer
```

### POST /api/admin/notifications
Send a notification.
```
Body: {
  user_id?: number,    // null = broadcast to all
  title: string,
  message: string,
  type: 'info' | 'offer' | 'system' | 'greeting'
}
Response 201: Notification
```

### GET /api/admin/support/tickets
List all support tickets.
```
Query: ?status=open|pending|resolved&page=1
Response 200: PaginatedResponse<SupportTicket & { user: AuthUser }>
```

### POST /api/admin/support/tickets/:id/reply
Admin replies to a ticket.
```
Body: { message: string }
Response 201: TicketMessage
```

### PATCH /api/admin/support/tickets/:id/status
Update ticket status.
```
Body: { status: 'pending' | 'resolved' }
Response 200: SupportTicket
```

### GET /api/admin/settings
Get app settings.
```
Response 200: AppSettings
```

### PATCH /api/admin/settings
Update app settings.
```
Body: Partial<AppSettings>   // excluding discounts array
Response 200: AppSettings
```

### PUT /api/admin/settings/discounts
Replace discount table.
```
Body: { discounts: Array<Omit<PlanDiscount, 'id'>> }
Response 200: PlanDiscount[]
```

---

## Response Codes Summary

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete success) |
| 400 | Bad Request (business logic error) |
| 401 | Unauthorized (no/bad token) |
| 403 | Forbidden (wrong role or not owner) |
| 404 | Not Found |
| 409 | Conflict (duplicate, constraint violation) |
| 422 | Unprocessable Entity (validation failed) |
| 500 | Internal Server Error |
