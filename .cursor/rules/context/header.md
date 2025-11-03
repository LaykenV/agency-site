# Animated Burger Menu & Mobile Menu Documentation

## Overview

This document provides comprehensive documentation for recreating the animated burger menu button and mobile menu system used in the portfolio header. The implementation includes:

- **Animated SVG hamburger icon** that morphs into an X when opened
- **Glassmorphic mobile menu panel** with smooth slide-in animations
- **Accessible keyboard and click-outside handling**
- **Theme-aware styling** with dark mode support

## Component Architecture

The mobile menu system consists of three main parts:

1. **`MobileMenuController`** - Client component that manages menu state
2. **`MobileMenu`** - Wrapper component that handles animations and interactions
3. **CSS Styles** - Distributed across `mobile.css` and `globals.css`

## File Structure

```
components/
├── mobile-menu-controller.tsx  # State management & trigger button
└── mobile-menu.tsx              # Menu panel wrapper

app/
└── mobile.css                   # Hamburger animation styles

app/
└── globals.css                  # Mobile menu panel styles
```

---

## Component 1: MobileMenuController

**Location:** `components/mobile-menu-controller.tsx`

**Purpose:** Manages the menu open/close state and renders the hamburger button trigger.

### Key Features:
- Uses React `useState` to track open/closed state
- Renders animated hamburger button
- Contains menu content (social links, theme toggle)

### Implementation:

```tsx
'use client'

import { useState } from 'react'
import { MobileMenu } from '@/components/mobile-menu'
import { AnimatedThemeToggler } from '@/components/animated-theme-toggler'
import { Github, Linkedin, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileMenuControllerProps {
  className?: string
}

export function MobileMenuController({ className }: MobileMenuControllerProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn(className, 'z-50')}>
      {/* Hamburger button */}
      <label className="hamburger" aria-label="Open menu">
        <input
          type="checkbox"
          checked={open}
          onChange={() => setOpen(!open)}
          aria-checked={open}
          aria-controls="mobile-menu"
        />
        <svg viewBox="0 0 32 32" aria-hidden="true" width="32" height="32">
          <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
          <path className="line" d="M7 16 27 16"></path>
        </svg>
      </label>

      {/* Mobile menu panel */}
      <MobileMenu open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold opacity-80">Menu</span>
            <AnimatedThemeToggler className="btn-icon" />
          </div>
          <div className="h-px" style={{ background: 'hsl(var(--blue-strong) / 0.2)' }} />
          {/* Menu content: social links, etc. */}
        </div>
      </MobileMenu>
    </div>
  )
}
```

### Usage in Page:

```tsx
// In app/page.tsx
<MobileMenuController className="absolute top-4 right-6 md:top-4 md:right-4 md:hidden" />
```

---

## Component 2: MobileMenu

**Location:** `components/mobile-menu.tsx`

**Purpose:** Handles menu panel rendering, animations, keyboard events, and click-outside detection.

### Key Features:
- Conditional rendering based on `open` prop
- ESC key handling to close menu
- Click-outside detection (excludes hamburger button)
- Slide-in animation using Tailwind classes
- ARIA attributes for accessibility

### Implementation:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function MobileMenu({ open, onClose, children }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Handle ESC key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Handle click outside
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (panelRef.current && !panelRef.current.contains(target) && !target.closest('label.hamburger')) {
        onClose()
      }
    }
    // Delay to avoid immediate close on open
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      id="mobile-menu"
      className="md:hidden absolute right-0 top-[calc(100%+12px)] w-[min(92vw,20rem)]"
      ref={panelRef}
      aria-modal="true"
      role="dialog"
    >
      <div className={cn(
        'relative rounded-2xl p-4 outline-none',
        'mobile-menu-panel',
        'animate-in slide-in-from-top-2 duration-200'
      )}>
        {children}
      </div>
    </div>
  )
}
```

---

## Styling: Hamburger Animation

**Location:** `app/mobile.css`

### CSS for Animated Hamburger:

```css
/* Animated hamburger menu */
.hamburger {
  cursor: pointer;
  display: inline-block;
  position: relative;
}

.hamburger input {
  display: none;
}

.hamburger svg {
  height: 32px;
  width: 32px;
  transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.line {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
  transition: stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1),
              stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.line-top-bottom {
  stroke-dasharray: 12 63;
}

.hamburger input:checked + svg {
  transform: rotate(-45deg);
}

.hamburger input:checked + svg .line-top-bottom {
  stroke-dasharray: 20 300;
  stroke-dashoffset: -32.42;
}
```

### Animation Explanation:

1. **Initial State:**
   - SVG rotated at 0deg
   - Top-bottom line has `stroke-dasharray: 12 63` (short dash, long gap)
   - Middle line is solid

2. **Checked State:**
   - SVG rotates -45deg
   - Top-bottom line morphs: `stroke-dasharray: 20 300` (longer dash, huge gap)
   - `stroke-dashoffset: -32.42` shifts the dash to create X shape
   - Both transitions use `600ms cubic-bezier(0.4, 0, 0.2, 1)` easing

3. **SVG Path Details:**
   - The top-bottom path creates a curved line that morphs into one arm of the X
   - The middle horizontal line becomes the other arm of the X when rotated

---

## Styling: Mobile Menu Panel

**Location:** `app/mobile.css` and `app/globals.css`

### Glassmorphic Panel Styles:

```css
/* Glassmorphic mobile menu panel */
.mobile-menu-panel {
  background:
    radial-gradient(120% 120% at 50% 0%, hsl(var(--blue-strong) / 0.14), transparent 62%),
    radial-gradient(120% 120% at 100% 100%, hsl(var(--peach-strong) / 0.12), transparent 62%),
    hsl(var(--card));
  border: 1px solid hsl(var(--blue-strong) / 0.22);
  backdrop-filter: saturate(140%) blur(16px);
  -webkit-backdrop-filter: saturate(140%) blur(16px);
  box-shadow:
    0 28px 64px -28px hsl(var(--blue-strong) / 0.45),
    0 14px 36px -16px hsl(var(--peach-strong) / 0.22),
    inset 0 1px 0 hsl(var(--foreground-hsl) / 0.06);
  transform: translateZ(0); /* Force GPU acceleration */
  backface-visibility: hidden;
}

html.dark .mobile-menu-panel {
  background:
    radial-gradient(120% 120% at 50% 0%, hsl(var(--blue-soft) / 0.12), transparent 62%),
    radial-gradient(120% 120% at 100% 100%, hsl(var(--peach-soft) / 0.10), transparent 62%),
    hsl(var(--card));
  border-color: hsl(var(--blue-soft) / 0.18);
  box-shadow:
    0 28px 64px -28px hsl(var(--blue-soft) / 0.45),
    0 14px 36px -16px hsl(var(--peach-soft) / 0.18),
    inset 0 1px 0 hsl(var(--foreground-hsl) / 0.05);
}
```

### Panel Features:
- **Glassmorphism:** Dual radial gradients + backdrop blur
- **Layered shadows:** Multiple box-shadows for depth
- **GPU acceleration:** `translateZ(0)` and `backface-visibility: hidden`
- **Theme-aware:** Different opacity/colors for light/dark modes

---

## Animation Utilities

**Location:** `app/globals.css`

### Slide-in Animation:

```css
@keyframes slide-in-from-top {
  from {
    transform: translateY(-0.5rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.slide-in-from-top-2 {
  animation-name: slide-in-from-top;
}

.animate-in {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: both;
  will-change: transform, opacity;
}
```

---

## Step-by-Step Recreation Guide

### Step 1: Create MobileMenuController Component

1. Create `components/mobile-menu-controller.tsx`
2. Import dependencies: `useState`, `MobileMenu`, icons, `cn` utility
3. Add state management with `useState(false)`
4. Render hamburger button with checkbox input (hidden)
5. Include SVG with two paths (top-bottom curve, middle line)
6. Wrap menu content in `MobileMenu` component

### Step 2: Create MobileMenu Component

1. Create `components/mobile-menu.tsx`
2. Add props: `open`, `onClose`, `children`
3. Implement `useRef` for panel reference
4. Add ESC key handler with `useEffect`
5. Add click-outside handler (with 100ms delay)
6. Return conditional render based on `open`
7. Apply positioning classes and animation classes

### Step 3: Add Hamburger CSS

1. Add to `app/mobile.css`:
   - `.hamburger` base styles
   - `.hamburger input` (hidden)
   - `.hamburger svg` with transition
   - `.line` stroke styles
   - `.line-top-bottom` initial dasharray
   - `:checked` state transforms and dasharray changes

### Step 4: Add Panel CSS

1. Add `.mobile-menu-panel` to `app/mobile.css`:
   - Background gradients (blue + peach)
   - Border with CSS variable opacity
   - Backdrop filter blur
   - Layered box-shadows
   - Dark mode variant

### Step 5: Add Animation Utilities

1. Ensure `app/globals.css` has:
   - `@keyframes slide-in-from-top`
   - `.animate-in` utility class
   - `.slide-in-from-top-2` animation class

### Step 6: Integrate in Page

1. Import `MobileMenuController` in `app/page.tsx`
2. Add component with positioning classes:
   ```tsx
   <MobileMenuController className="absolute top-4 right-6 md:hidden" />
   ```

---

## Required CSS Variables

The components rely on these CSS custom properties (defined in `globals.css`):

```css
:root {
  --blue-strong: 218 88% 74%;
  --peach-strong: 20 86% 78%;
  --blue-soft: 218 100% 94%;
  --peach-soft: 20 100% 93%;
  --card: 36 50% 98%;
  --foreground-hsl: 0 0% 13%;
}

.dark {
  --blue-strong: 218 90% 72%;
  --peach-strong: 20 90% 72%;
  --blue-soft: 218 100% 86%;
  --peach-soft: 20 100% 86%;
  --card: 24 12% 10%;
  --foreground-hsl: 0 0% 93%;
}
```

---

## Dependencies

### React/Next.js:
- `'use client'` directive (both components are client components)
- `useState`, `useEffect`, `useRef` hooks

### Utilities:
- `cn()` function from `@/lib/utils` (clsx/tailwind-merge wrapper)

### Icons:
- `lucide-react` for social icons (GitHub, LinkedIn, FileText)

### Optional:
- `AnimatedThemeToggler` component for theme switching

---

## Accessibility Features

1. **ARIA Labels:**
   - `aria-label="Open menu"` on hamburger button
   - `aria-checked={open}` on checkbox
   - `aria-controls="mobile-menu"` linking button to panel
   - `aria-modal="true"` and `role="dialog"` on menu panel

2. **Keyboard Support:**
   - ESC key closes menu
   - Hidden checkbox ensures screen reader compatibility

3. **Focus Management:**
   - Click-outside detection excludes hamburger button
   - Panel has proper focus containment

---

## Customization Options

### Animation Speed:
- Hamburger: Change `600ms` in `.hamburger svg` and `.line` transitions
- Panel: Change `320ms` in `.animate-in` class

### Panel Size:
- Modify `w-[min(92vw,20rem)]` in `MobileMenu` component
- Adjust `top-[calc(100%+12px)]` for spacing

### Colors:
- Update CSS variables (`--blue-strong`, `--peach-strong`, etc.)
- Modify gradient positions and opacity values

### Panel Position:
- Change `right-0` to `left-0` for left-aligned menu
- Adjust positioning classes as needed

---

## Browser Support

- **Backdrop Filter:** Requires browsers supporting `backdrop-filter` (Chrome 76+, Safari 9+, Firefox 103+)
- **CSS Variables:** Modern browsers (IE11+ with polyfill)
- **SVG Animations:** All modern browsers
- **View Transitions:** Optional enhancement (Chrome 111+)

---

## Testing Checklist

- [ ] Hamburger animates smoothly when clicked
- [ ] Menu panel slides in from top
- [ ] ESC key closes menu
- [ ] Click outside closes menu
- [ ] Click on hamburger button doesn't close menu
- [ ] Menu content is accessible and readable
- [ ] Dark mode styles apply correctly
- [ ] Panel is properly positioned on mobile
- [ ] Panel is hidden on desktop (`md:hidden`)
- [ ] ARIA attributes are correct for screen readers

---

## Notes

- The hamburger uses a **hidden checkbox** pattern for semantic HTML while maintaining visual animation control
- The **100ms delay** on click-outside handler prevents immediate closing when opening the menu
- **GPU acceleration** (`translateZ(0)`) ensures smooth animations on mobile devices
- The panel uses **glassmorphism** with dual radial gradients for visual depth
- Menu is **mobile-only** (`md:hidden`) - desktop uses different navigation

---

## Related Files Reference

- **`app/page.tsx`** - Integration point, positioning
- **`components/mobile-menu-controller.tsx`** - State management & trigger
- **`components/mobile-menu.tsx`** - Panel wrapper & interactions
- **`app/mobile.css`** - Hamburger animation & panel base styles
- **`app/globals.css`** - Animation utilities & CSS variables

