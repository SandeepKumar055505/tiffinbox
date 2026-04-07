# TiffinBox — Frontend Routes

> React Router v6. User routes use `UserLayout` (with bottom nav). Admin routes use `AdminLayout` (with sidebar). Auth routes are standalone.

---

## Route Map

### Public / Auth Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `auth/Login` | Google OAuth login for users |
| `/admin/login` | `auth/AdminLogin` | Email/password login for admin |
| `*` | `shared/NotFound` | 404 page |

### User Routes (requires user JWT)
| Path | Component | Description |
|------|-----------|-------------|
| `/` | `user/Home` | Landing / redirect to dashboard |
| `/dashboard` | `user/Dashboard` | My subscriptions overview |
| `/subscribe` | `user/Subscribe` | New subscription builder (step 1) |
| `/subscribe/customize` | `user/MealGrid` | Meal grid customization (step 2) |
| `/subscribe/checkout` | `user/Checkout` | Pricing summary + payment (step 3) |
| `/subscribe/success` | `user/SubscribeSuccess` | Confirmation screen after payment |
| `/subscriptions/:id` | `user/SubscriptionDetail` | View a single subscription |
| `/subscriptions/:id/skip` | `user/SkipMeal` | Request skip for a meal |
| `/persons` | `user/Persons` | Manage family members |
| `/persons/new` | `user/PersonForm` | Add a new person |
| `/persons/:id/edit` | `user/PersonForm` | Edit a person |
| `/notifications` | `user/Notifications` | Notification inbox |
| `/support` | `user/Support` | Support ticket list |
| `/support/new` | `user/SupportNew` | Create new ticket |
| `/support/:id` | `user/SupportTicket` | View ticket thread |
| `/profile` | `user/Profile` | Account settings |

### Admin Routes (requires admin JWT)
| Path | Component | Description |
|------|-----------|-------------|
| `/admin` | redirect → `/admin/dashboard` | |
| `/admin/dashboard` | `admin/Dashboard` | Stats overview + quick actions |
| `/admin/subscriptions` | `admin/Subscriptions` | All subscriptions list |
| `/admin/subscriptions/:id` | `admin/SubscriptionDetail` | Full subscription detail |
| `/admin/deliveries` | `admin/Deliveries` | Daily delivery schedule |
| `/admin/users` | `admin/Users` | User list |
| `/admin/users/:id` | `admin/UserDetail` | User profile + subscriptions |
| `/admin/skips` | `admin/Skips` | Pending skip requests |
| `/admin/menu` | `admin/Menu` | Default menu grid editor |
| `/admin/meals` | `admin/Meals` | Meal items list + CRUD |
| `/admin/meals/new` | `admin/MealForm` | Add new meal item |
| `/admin/meals/:id/edit` | `admin/MealForm` | Edit meal item |
| `/admin/offers` | `admin/Offers` | Promo codes list + create |
| `/admin/notifications` | `admin/Notifications` | Send notifications |
| `/admin/support` | `admin/Support` | All tickets |
| `/admin/support/:id` | `admin/SupportTicket` | Ticket thread + reply |
| `/admin/settings` | `admin/Settings` | App settings (pricing, cutoffs, discounts) |
| `/admin/analytics` | `admin/Analytics` | Revenue + trends charts |

---

## Layouts

### UserLayout
- Bottom navigation bar with 4 tabs: Home, Persons, Notifications, Profile
- Renders `<Outlet />` above the bottom nav
- Protected: redirects to `/login` if no valid user token

### AdminLayout
- Left sidebar (desktop) or top nav (mobile)
- Sidebar links: Dashboard, Subscriptions, Deliveries, Users, Skips, Menu, Meals, Offers, Notifications, Support, Settings
- Badge on Skips (pending count) and Support (open count)
- Protected: redirects to `/admin/login` if no valid admin token

---

## Route Guards

```tsx
// UserRoute — wraps user pages
const UserRoute = () => {
  const { user } = useAuth();
  if (!user || user.role !== 'user') return <Navigate to="/login" replace />;
  return <UserLayout />;
};

// AdminRoute — wraps admin pages
const AdminRoute = () => {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <AdminLayout />;
};
```

---

## Subscribe Flow (Multi-Step)

```
/subscribe              → Choose person, plan_days, week_pattern, start_date
  ↓
/subscribe/customize    → Meal grid (day × B/L/D checkboxes, dish selection)
  ↓
/subscribe/checkout     → Price breakdown, promo code, Razorpay payment
  ↓
/subscribe/success      → "You're all set!" confirmation + go to dashboard
```

State passed between steps via React context (`SubscribeContext`) or URL search params for step-level data.

---

## Navigation Constants

```typescript
export const ROUTES = {
  // Auth
  LOGIN: '/login',
  ADMIN_LOGIN: '/admin/login',
  // User
  DASHBOARD: '/dashboard',
  SUBSCRIBE: '/subscribe',
  SUBSCRIBE_CUSTOMIZE: '/subscribe/customize',
  SUBSCRIBE_CHECKOUT: '/subscribe/checkout',
  SUBSCRIBE_SUCCESS: '/subscribe/success',
  SUBSCRIPTION_DETAIL: (id: number) => `/subscriptions/${id}`,
  SUBSCRIPTION_SKIP: (id: number) => `/subscriptions/${id}/skip`,
  PERSONS: '/persons',
  PERSON_NEW: '/persons/new',
  PERSON_EDIT: (id: number) => `/persons/${id}/edit`,
  NOTIFICATIONS: '/notifications',
  SUPPORT: '/support',
  SUPPORT_NEW: '/support/new',
  SUPPORT_TICKET: (id: number) => `/support/${id}`,
  PROFILE: '/profile',
  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_DELIVERIES: '/admin/deliveries',
  ADMIN_USERS: '/admin/users',
  ADMIN_SKIPS: '/admin/skips',
  ADMIN_MENU: '/admin/menu',
  ADMIN_MEALS: '/admin/meals',
  ADMIN_OFFERS: '/admin/offers',
  ADMIN_SETTINGS: '/admin/settings',
} as const;
```
