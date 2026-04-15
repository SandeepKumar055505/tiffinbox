# TiffinPoint — Component Library

> All reusable components. Located in `frontend/src/components/`. Use glass design system from `THEME.md`.

---

## Glass Base Components — `components/glass/`

### GlassCard
```tsx
interface GlassCardProps {
  variant?: 'default' | 'elevated' | 'subtle';
  padding?: string;          // default 'p-4'
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}
```
Usage: `<GlassCard variant="elevated" padding="p-6">...</GlassCard>`

### GlassButton
```tsx
interface GlassButtonProps {
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: ReactNode;
  className?: string;
}
```
- `primary`: teal bg, white text, glow on hover
- `ghost`: transparent bg, border, text-accent
- `danger`: red tinted
- `success`: green tinted

### GlassInput
```tsx
interface GlassInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}
```
Shows `inputShake` animation on error state.

### GlassSelect
```tsx
interface GlassSelectProps {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
}
```

### GlassTextarea
```tsx
interface GlassTextareaProps {
  label?: string;
  error?: string;
  rows?: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}
```

### LoadingSkeleton
```tsx
interface LoadingSkeletonProps {
  lines?: number;    // default 3
  className?: string;
}
```
Renders shimmer placeholder lines.

### PageShell
```tsx
interface PageShellProps {
  maxWidth?: string;   // default 'max-w-md'
  className?: string;
  children: ReactNode;
}
```
Full-screen container with `bg-bg-primary` and ambient glow blob.

### StatusBadge
```tsx
interface StatusBadgeProps {
  status: SubscriptionStatus | DeliveryStatus | SkipStatus | TicketStatus;
  size?: 'sm' | 'md';
}
```
Color-coded pill badges. Maps statuses to semantic colors.

### EmptyState
```tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

---

## Navigation — `components/nav/`

### FluidHeader
```tsx
interface FluidHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;     // defaults to browser back
  right?: ReactNode;   // right slot (button, link, etc.)
}
```

### BottomNav
Fixed bottom navigation for user pages. 4 tabs: Home, Persons, Notifications, Profile. Shows unread badge on Notifications tab.

### AdminSidebar
Admin layout sidebar with route links, collapse support, badge counts.

---

## Meal Components — `components/meal/`

### MealCell
Core meal grid cell. Checkbox + dish card.
```tsx
interface MealCellProps {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  item: MealItem;
  isIncluded: boolean;
  onChange: (checked: boolean) => void;
  onItemClick: () => void;      // opens dish selector modal
  disabled?: boolean;           // true when max-off limit reached
}
```
Visual states:
- Checked: normal glass card with checkbox ✓
- Unchecked: dimmed/greyed out, checkbox empty
- Disabled + unchecked: shows lock icon, tooltip "Max days off reached"

### MealGrid
The full day × meal subscription builder grid.
```tsx
interface MealGridProps {
  dates: string[];              // ordered delivery dates
  schedule: MealCell[];         // current state
  onCellChange: (date: string, mealType: string, checked: boolean) => void;
  onDishSelect: (date: string, mealType: string, item: MealItem) => void;
  planDays: number;
}
```

### DishSelectorModal
Modal shown when user taps a meal cell. Shows default + alternatives.
```tsx
interface DishSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultItem: MealItem;
  alternatives: MealItem[];
  selectedItemId: number;
  onSelect: (item: MealItem) => void;
}
```

### MealTypeIcon
Icon + label for meal type.
```tsx
interface MealTypeIconProps {
  type: 'breakfast' | 'lunch' | 'dinner' | 'extra';
  size?: 'sm' | 'md';
  showLabel?: boolean;
}
```

### PriceBreakdownCard
Shows the real-time price calculation.
```tsx
interface PriceBreakdownCardProps {
  breakdown: PriceBreakdown;
  promoCode?: string;
  onApplyPromo?: (code: string) => void;
  isLoading?: boolean;
}
```
Displays: base total, discount (strikethrough), extras, promo discount, final total (large, highlighted).

### MealCellDeliveryCard
Admin-facing card showing a single meal delivery.
```tsx
interface MealCellDeliveryCardProps {
  userName: string;
  personName: string;
  mealType: string;
  itemName: string;
  status: DeliveryStatus;
  onStatusChange: (status: DeliveryStatus) => void;
}
```

---

## Shared Components — `components/shared/`

### ConfirmationDialog
```tsx
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;   // default 'Confirm'
  cancelLabel?: string;    // default 'Cancel'
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}
```

### FilterTabBar
```tsx
interface FilterTabBarProps {
  tabs: Array<{ key: string; label: string; count?: number }>;
  activeTab: string;
  onChange: (key: string) => void;
}
```
Renders the glass tab bar pattern from THEME.md.

### SectionDivider
```tsx
interface SectionDividerProps {
  title: string;
  action?: { label: string; onClick: () => void };
}
```

### StatCard
```tsx
interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  color?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}
```

### PriceTag
Displays a ₹ amount with optional strikethrough.
```tsx
interface PriceTagProps {
  amount: number;
  strikethrough?: number;  // original price
  size?: 'sm' | 'md' | 'lg';
}
```

### DatePicker
Simple date input with calendar styling.
```tsx
interface DatePickerProps {
  label?: string;
  value: string;           // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  error?: string;
}
```

### ToastNotification
App-level toast. Use via `useToast()` hook.
```
toast.success('Subscription created!')
toast.error('Payment failed')
toast.info('Skip request sent for review')
```

### Pagination
```tsx
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

---

## Subscription Components — `components/subscription/`

### SubscriptionCard
Summary card shown on dashboard.
```tsx
interface SubscriptionCardProps {
  subscription: Subscription;
  onClick: () => void;
}
```
Shows: person name, plan type, dates, status badge, meal count, next delivery.

### SubscriptionStatus Timeline
Vertical timeline showing delivery progress within a subscription.

### SkipRequestCard
Shows a skip request with status + admin note.
```tsx
interface SkipRequestCardProps {
  skipRequest: SkipRequest;
  onCancel?: () => void;  // if pending and before cutoff
}
```

---

## Person Components — `components/person/`

### PersonCard
```tsx
interface PersonCardProps {
  person: Person;
  onEdit: () => void;
  onDelete: () => void;
  hasActiveSubscription: boolean;
}
```

### PreferencesDisplay
Renders a person's dietary preferences as chips/tags.

---

## Notification Components — `components/notification/`

### NotificationCard
```tsx
interface NotificationCardProps {
  notification: Notification;
  onRead: () => void;
}
```
Color-coded by type: info=blue, offer=teal, system=orange, greeting=purple.

---

## Component Export Pattern

```typescript
// components/glass/index.ts
export { GlassCard } from './GlassCard';
export { GlassButton } from './GlassButton';
export { GlassInput } from './GlassInput';
export { GlassSelect } from './GlassSelect';
export { GlassTextarea } from './GlassTextarea';
export { LoadingSkeleton } from './LoadingSkeleton';
export { PageShell } from './PageShell';
export { StatusBadge } from './StatusBadge';
export { EmptyState } from './EmptyState';
```
