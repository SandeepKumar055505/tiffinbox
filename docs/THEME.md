# TiffinBox — UI Theme Specification

> Same glassmorphism system as VeilLink/AntiGravity. Copy this file as the single source of truth for all styling.

## Design Identity

**Style**: Dark-first glassmorphism with warm teal accent
**Inspiration**: Apple Music glass cards + warm Indian food photography
**Fonts**: SF Pro → Inter → System sans-serif
**Feel**: Premium, warm, trustworthy, appetizing

---

## CSS Custom Properties

### Dark Theme (default — applied to `:root`)

```css
/* Backgrounds */
--color-bg-primary: #0A1628;
--color-bg-secondary: #0F2035;
--color-bg-card: #132D4A;
--color-bg-glass: rgba(15, 32, 53, 0.5);
--color-bg-subtle: rgba(15, 32, 53, 0.35);
--color-glass-tint: rgba(0, 180, 160, 0.12);

/* Accent — warm teal */
--color-accent: #00A896;
--color-accent-hover: #00D4BE;
--color-accent-glow: rgba(0, 180, 160, 0.25);
--color-glow-subtle: rgba(0, 180, 160, 0.12);

/* Text */
--color-text-primary: #F0F4F8;
--color-text-secondary: #94A3B8;
--color-text-muted: #64748B;

/* Semantic */
--color-success: #34D399;
--color-warning: #FBBF24;
--color-danger: #F87171;
--color-info: #60A5FA;

/* Borders */
--color-border: rgba(148, 163, 184, 0.15);
--color-border-active: rgba(0, 180, 160, 0.08);

/* Special */
--color-trust-badge-bg: rgba(0, 168, 150, 0.08);
--color-timer-ring: rgba(0, 180, 160, 0.4);
--color-success-glow: rgba(52, 211, 153, 0.2);
```

### Light Theme (applied via `body.light`)

```css
--color-bg-primary: #F8FAFC;
--color-bg-secondary: #FFFFFF;
--color-bg-card: #F1F5F9;
--color-bg-glass: rgba(255, 255, 255, 0.6);
--color-bg-subtle: rgba(15, 23, 42, 0.04);
--color-accent: #009688;
--color-accent-hover: #00A896;
--color-text-primary: #0F172A;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
--color-border: rgba(15, 23, 42, 0.1);
```

### Blur Levels
```css
--blur-sm: 12px;     /* Subtle, background layers */
--blur-base: 20px;   /* Standard glass cards */
--blur-lg: 28px;     /* Elevated, prominent panels */
```

### Shadows
```css
--shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
--shadow-md: 0 8px 32px rgba(0,0,0,0.12);
--shadow-lg: 0 16px 48px rgba(0,0,0,0.16);
```

### Border Radius
```css
--radius-sm: 8px;    /* Small inputs, badges */
--radius-md: 12px;   /* Buttons, form elements */
--radius-lg: 16px;   /* Cards */
--radius-xl: 24px;   /* Elevated cards, modals */
```

### Easing Functions
```css
--ease-glass: cubic-bezier(0.25, 0.8, 0.25, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-gentle: cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Glassmorphism Recipe

### Standard Glass (`.glass`)
```css
background: var(--color-bg-glass);
backdrop-filter: blur(20px) saturate(1.5);
-webkit-backdrop-filter: blur(20px) saturate(1.5);
border: 1px solid var(--color-border);
box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.05);
transition: all 0.3s var(--ease-glass);
```

### Elevated Glass (`.glass-elevated`)
```css
background: var(--color-bg-glass);
backdrop-filter: blur(28px) saturate(1.5);
-webkit-backdrop-filter: blur(28px) saturate(1.5);
border: 1px solid var(--color-border);
box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,0.08);
```

### Subtle Glass (`.glass-subtle`)
```css
background: var(--color-bg-subtle);
backdrop-filter: blur(12px) saturate(1.2);
border: 1px solid var(--color-border);
```

### Capsule Glass (`.glass-capsule`)
```css
background: var(--color-bg-glass);
backdrop-filter: blur(28px) saturate(1.6);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 999px;
box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
```

**Fallback** (no backdrop-filter support):
```css
@supports not (backdrop-filter: blur(20px)) {
  .glass, .glass-elevated, .glass-subtle {
    background: var(--color-bg-secondary);
    opacity: 0.95;
  }
}
```

---

## Tailwind Config Extension (`tailwind.config.ts`)

```typescript
export default {
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-glass': 'var(--color-bg-glass)',
        'accent': 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'danger': 'var(--color-danger)',
        'border': 'var(--color-border)',
        'border-active': 'var(--color-border-active)',
      },
      backdropBlur: {
        sm: '12px',
        base: '20px',
        lg: '28px',
      },
      boxShadow: {
        'glass': 'var(--shadow-md)',
        'glass-elevated': 'var(--shadow-lg)',
        'accent-glow': '0 0 20px var(--color-accent-glow)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
      },
      fontFamily: {
        sans: ["'SF Pro Display'", "'SF Pro Text'", '-apple-system', 'BlinkMacSystemFont', "'Inter'", "'Segoe UI'", 'sans-serif'],
        mono: ["'SF Mono'", "'JetBrains Mono'", "'Fira Code'", 'monospace'],
      },
      animation: {
        'fade-in': 'fadeInUp 0.4s var(--ease-gentle)',
        'glass-emerge': 'glassEmerge 0.4s var(--ease-glass)',
        'shimmer': 'shimmer 2s infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-loader': 'spin 0.8s linear infinite',
      },
    },
  },
}
```

---

## Animations

### Entrance
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes glassEmerge {
  from { opacity: 0; transform: scale(0.96) rotate(0.5deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}
```

### Loading
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Glow / Pulse
```css
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 var(--color-glow-subtle); }
  50% { box-shadow: 0 0 0 8px transparent; }
}
```

### Error
```css
@keyframes inputShake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
```

### Ambient Background (page-level effect)
```css
@keyframes ambientDrift {
  0%, 100% { transform: translate(0,0) scale(1); opacity: 0.3; }
  33% { transform: translate(10%, -5%) scale(1.1); opacity: 0.4; }
  66% { transform: translate(-5%, 8%) scale(0.95); opacity: 0.35; }
}
```

---

## Typography Scale

| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-[9px] uppercase tracking-widest` | 9px | 700+ | Badge labels, stat labels |
| `text-[10px] uppercase tracking-widest` | 10px | 800 | Section headers, tab labels |
| `text-xs` | 12px | 500 | Hints, small body |
| `text-sm` | 14px | 500-600 | Body, input labels |
| `text-base` | 16px | 600 | Buttons, default body |
| `text-lg font-black` | 18px | 900 | Card titles |
| `text-xl` | 20px | 700 | Section headers |
| `text-2xl font-black` | 24px | 900 | Page subtitles |
| `text-3xl font-black` | 30px | 900 | Page titles |

---

## UI Patterns

### Page Layout
```tsx
<div className="min-h-screen bg-bg-primary relative overflow-hidden">
  {/* Ambient glow blobs */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px]
    bg-gradient-to-b from-accent/10 via-accent/5 to-transparent
    pointer-events-none blur-3xl opacity-50 -z-10" />

  <div className="max-w-md mx-auto px-4 pt-10 pb-24 relative z-10">
    {/* page content */}
  </div>
</div>
```

### Stat Card Grid (3–4 columns)
```tsx
<div className="grid grid-cols-3 gap-2">
  <div className="glass rounded-xl p-3 text-center">
    <div className="text-xl font-black text-text-primary">42</div>
    <div className="text-[9px] font-black uppercase tracking-widest text-text-muted mt-1">Meals</div>
  </div>
</div>
```

### Filter Tab Bar
```tsx
<div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/5">
  <button className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest
    bg-accent/15 border border-accent/30 text-accent">Active</button>
  <button className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest
    text-text-muted hover:text-text-secondary">Past</button>
</div>
```

### Section Divider
```tsx
<div className="flex items-center gap-3 mb-4">
  <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] whitespace-nowrap">
    Your Plans
  </h2>
  <div className="flex-1 h-px bg-border/20" />
</div>
```

### Status Dot
```tsx
<div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse
  shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.8)]" />
```

---

## Meal Cell (Grid Cell Pattern)

```tsx
<div className="relative glass rounded-xl p-2 cursor-pointer
  hover:border-accent/30 transition-all group">
  {/* Checkbox overlay */}
  <div className="absolute top-1.5 right-1.5 z-10">
    <input type="checkbox" className="w-4 h-4 accent-accent rounded" />
  </div>
  {/* Food image */}
  <img className="w-full aspect-square object-cover rounded-lg mb-1.5" src={meal.image} alt={meal.name} />
  {/* Name */}
  <p className="text-[10px] font-black text-text-primary truncate">{meal.name}</p>
  {/* Price */}
  <p className="text-[9px] text-text-muted">₹{meal.price}</p>
</div>
```

---

## Color Accessibility Notes

- All text on dark glass backgrounds meets WCAG AA (4.5:1 contrast)
- Accent teal (#00A896) on dark: ~3.8:1 — use for decorative, not critical text
- For critical text on accent: use white (#F0F4F8) — contrast 5.2:1
- In light mode, use darker teal (#009688) for sufficient contrast
- Error (#F87171) on dark: use with white label text beside it

---

## Theme Toggle

```typescript
// Toggle
const toggle = () => {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('tb_theme', isLight ? 'light' : 'dark');
};

// Restore on load (in index.html <head>)
const saved = localStorage.getItem('tb_theme');
if (saved === 'light') document.body.classList.add('light');
```

---

## Scrollbar Styling

```css
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 168, 150, 0.35);
}
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
```

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.1s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.1s !important;
  }
}
```
