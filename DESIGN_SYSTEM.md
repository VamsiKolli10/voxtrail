# VoxTrail Design System

> Scope: `travel-app-fe` (React 18 + MUI v7 + Emotion).
> **Part 1** is the reference: tokens, components, patterns, and rules. Read this before building UI.
> **Part 2** is the audit log: what was found on 2026-10-01, what was fixed on branch `design-system-fixes`, and what's still open.

---

# Part 1 — Reference

## Where things live

| What | File |
|------|------|
| All tokens (palette, type, radius, motion, shadows) + MUI overrides | `src/theme.js` → `createAppTheme(mode)` |
| Light/dark mode state | `src/contexts/AppearanceContext.jsx` → `useAppearance()` (wraps MUI `useColorScheme`) |
| Pre-load mode script (prevents dark-mode flash) | `public/theme-init.js` |
| Lint rules | `.eslintrc.cjs` → `npm run lint` |
| Global CSS (font load, focus ring, reduced motion) | `src/styles/global.css` |
| Primary navigation items (desktop + mobile) | `src/components/layout/navItems.js` |
| App-wide toasts | `src/contexts/NotificationContext.jsx` → `useNotify()` |
| Transition strings from motion tokens | `transitionFor()` exported from `src/theme.js` |
| Empty / zero-result states | `src/components/common/EmptyState.jsx` |

Mode: light and dark are MUI **color schemes with CSS variables**. MUI sets `<html data-theme="light|dark">` and emits every palette token as a `--mui-palette-*` variable (e.g. `palette.marketing.glowStrong` → `var(--mui-palette-marketing-glowStrong)`). `useAppearance()` returns `{ mode, setMode, toggleMode }`. The preference persists in `localStorage["stc:appearance"]` and falls back to `prefers-color-scheme`. `public/theme-init.js` applies it before the bundle loads.

- In JS, branch on `theme.palette.mode` (the theme passed to `sx`/`styled` is already the active scheme's).
- In plain CSS, use `var(--mui-palette-…)`; only `[data-theme="dark"]` selectors if a value isn't a token.
- Changing the storage key? Update `theme-init.js` too (a test checks they match).

## Tokens

### Color — palette

Use palette paths in `sx` (`color: "text.secondary"`, `borderColor: "border.subtle"`, `bgcolor: "surface.tint"`). Never hardcode hex/rgba in components.

| Token | Light | Dark | Use for |
|-------|-------|------|---------|
| `primary.main` | `#21808D` | `#32B8C6` | Brand, primary buttons, active nav, links |
| `primary.light` | `#32B8C6` | `#6FD3DE` | Gradients, "selected" outlines |
| `primary.dark` | `#1D7480` | `#21808D` | Hover; **primary text on tinted surfaces** (light) |
| `primary.contrastText` | `#FCFCF9` | `#0D1F24` | Text/icons on primary fills |
| `secondary.main` | `#5E5240` | same | Warm accent, sparingly |
| `background.default` | `#FCFCF9` | `#0D1F24` | Page |
| `background.paper` | `#FFFFFD` | `#102027` | Cards, sheets, app bar |
| `text.primary` | `#13343B` | `#EDF2F3` | Body, headings |
| `text.secondary` | `#626C71` | `#EDF2F3` @ 75% | Supporting text, placeholders |
| `divider` | teal @ 18% | mist @ 16% | Rules, card outlines |
| `border.subtle` | warm @ 12% | mist @ 12% | Hairlines on cards, panels, list rows |
| `border.strong` | warm @ 24% | mist @ 24% | Hover/emphasis borders |
| `surface.glass` | white @ 90% | paper @ 82% | Translucent panels over imagery/gradients (pair with `backdropFilter`) |
| `surface.tint` | teal @ 8% | teal-light @ 12% | Highlighted rows, icon chips, info panels |
| `surface.soft` | `#EEF3F6` | `#13252E` | Recessed areas |
| `error.main` | `#C0152F` | `#FF6B6F` | Destructive, validation |
| `warning.main` | `#9A5B13` | `#E8A23A` | Caution |
| `success.main` | `#2E7D4F` | `#5CC98A` | Confirmation (distinct from brand teal) |
| `info.main` | `#626C71` | `#A9B6BB` | Neutral notice |
| `rating.main` | `#F5B301` | same | Star ratings |
| `marketing.*` | see below | see below | Landing page only |

All text-role pairs above meet WCAG AA (≥ 4.5:1) on their mode's `background.default`/`paper`. Exception: `primary.main` text on a **tinted** light surface is ~4.1–4.4:1 — use `primary.dark` there. Outlined primary `Chip`s do this automatically (theme override).

### Color — marketing (Landing page)

| Token | Use |
|-------|-----|
| `marketing.background` / `backgroundSoft` / `surface` | Section bands |
| `marketing.backdropTop` / `Mid` / `Bottom`, `glowStrong`, `glowSoft` | Page backdrop; `Landing.css` reads them as `--mui-palette-marketing-*` |
| `marketing.heroGradient`, `onHero`, `onHeroMuted`, `heroBorder` | The fixed dark-teal hero card (light text in both modes; ≥ 4.9:1) |
| `marketing.ctaGradient` | Closing call-to-action panel |
| `marketing.accent`, `textPrimary`, `textSecondary` | Legacy; prefer `primary.main` / `text.*` |

### Color — Cultural Guide hero

`palette.culture.{heroGradient, heroShadow, onHero, onHeroMuted, chipBorder, chipFill}` — fixed deep-blue panel with light text in both modes (muted text 5.8:1).

### Color — categorical accents

`palette.accent.{teal, sky, violet, amber, green, red, blue}` — mode-aware. For distinguishing categories (Home feature tiles, emergency service types). Use as icon color or as `alpha(accent, 0.1–0.2)` fills. Don't use for body text.

### Typography

Family: `"DM Sans"` (400/500/600/700/800 loaded), system fallbacks.

| Variant | Size | Weight | Line height | Use for |
|---------|------|-------:|------:|---------|
| h1 | 2.75rem | 800 | 1.15 | Marketing hero only |
| h2 | 2.25rem | 800 | 1.2 | Marketing section titles |
| h3 | 1.75rem | 700 | 1.25 | — |
| h4 | 1.5rem | 700 | 1.3 | **Page titles** (rendered as `<h1>`) |
| h5 | 1.25rem | 700 | 1.35 | Detail-page titles, large card titles |
| h6 | 1.125rem | 600 | 1.4 | Section and card titles |
| subtitle1/2 | MUI default | | | Labels, list headers |
| body1 | 1rem | 400 | 1.6 | Long text, page subtitles |
| body2 | 0.95rem | 400 | 1.55 | Default UI text |
| caption | MUI default | | | Meta |

Rules: use `variant` for size and `component` for semantics (`<Typography component="h1" variant="h4">`). Every page has exactly one `<h1>`. Don't set `fontSize` inline. If you're overriding `fontWeight` on a heading, the token is wrong — raise it.

### Spacing

MUI 8px scale (`p: 2` = 16px).

| Context | Value |
|---------|-------|
| Page vertical padding | `py: { xs: 4, md: 6 }` |
| Page horizontal padding | `px: { xs: 2, sm: 3, md: 4 }` |
| Section gap | `gap: 3` |
| Card padding | `p: { xs: 3, sm: 4 }` |
| Inline control gap | `gap: 1`–`1.5` |

### Radius

`shape.borderRadius` is **4**, so numeric `sx` radii are multiples of 4px. Prefer the named scale.

| Token | px | `sx` number | Use for |
|-------|---:|:--:|---------|
| `radius.sm` | 8 | `2` | Chips, small tiles, map canvas |
| `radius.md` | 12 | `3` | Inputs, alerts, list rows, nested cards |
| — | 16 | `4` | Default `Paper`, sheets, nav bar corners |
| `radius.lg` | 20 | `5` | Cards (`MuiCard` default) |
| `radius.xl` | 24 | `6` | Feature tiles (`ModuleCard`) |
| `radius.pill` | 999 | — | Buttons |

In `sx`: `borderRadius: 3` or `borderRadius: (t) => \`${t.radius.md}px\``. In `styled()`: `borderRadius: theme.radius.md` (plain px).

### Elevation — `theme.customShadows`

Values are per scheme (`palette.elevation.*`); `theme.customShadows.*` are the matching CSS variables, so they switch with the mode without a re-render.

| Token | Use for |
|-------|---------|
| `card` / `cardHover` | Cards (applied by `MuiCard`) |
| `button` / `buttonHover` | Contained buttons (applied by `MuiButton`) |
| `appBar` | Top bar |
| `overlay` | Floating controls, menus, bottom nav, hover lift on small cards |
| `section` | Large marketing panels (Landing) |

Usage: `boxShadow: (t) => t.customShadows.overlay`.

### Motion — `theme.motion`

| Token | Value |
|-------|-------|
| `duration.fast` | 150ms — color, opacity |
| `duration.base` | 250ms — most transitions |
| `duration.slow` | 400ms — large movement |
| `easing.standard` | `cubic-bezier(0.16, 1, 0.3, 1)` |

In code: `transition: transitionFor("all")` or `transitionFor(["transform", "box-shadow"], "fast")` (import from `src/theme.js`). Don't write duration strings by hand.

Reduced motion is honored globally: CSS transitions via `global.css`, framer-motion via `<MotionConfig reducedMotion="user">` in `App.jsx`. Don't add infinite decorative animations to content the user is reading.

## Components

### PageContainer
`layout/PageContainer.jsx` — standard header + content frame for in-app pages.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `eyebrow` | node | — | Small outlined primary `Chip` above the title |
| `title` | node | — | Rendered as `<h1>` with `h4` styling |
| `subtitle` | node | — | `body1`, `text.secondary` |
| `meta` | node | — | Extra header content under the subtitle (chips, location line) |
| `actions` | node | — | Right-aligned (stacks on mobile) |
| `variant` | `"default"` \| `"fullBleed"` | `"default"` | `fullBleed`: xl width, tighter padding, no background glow, `overflow: visible` (sticky sidebars, maps) |
| `maxWidth` | breakpoint | `lg` / `xl` (fullBleed) | Container width override |
| `gap` | number | `3` | Gap between header and children |

```jsx
<PageContainer eyebrow="Plan" title="Phrasebook" subtitle="Save phrases for your trip"
  actions={<Button variant="contained">New phrase</Button>}>
  {children}
</PageContainer>
```

Default variant: Home, Translation, Phrasebook, Emergency, Cultural Guide, Legal. `fullBleed`: Stays (title + `meta` chips), Explore, Stay details and Destination details (no `title` — their `<h1>` lives in the hero). Only Landing and the auth pages (`AuthShell`) sit outside it.

### AuthShell
`layout/AuthShell.jsx` — centered card for login, register, password, and verification flows. Includes its own theme toggle.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | node | — | `<h1>` (h4 style) |
| `subtitle` | node | — | |
| `icon` | node | — | 40px glyph above the title |
| `footer` | node | — | Below the card |
| `backLink` | `{ to, label }` | — | Top-left link |
| `maxWidth` | breakpoint | `"sm"` | |

### Button
Use MUI `Button` directly. The theme styles it: pill radius, weight 700, no uppercase, teal shadow on `contained`.

| Variant | Use when |
|---------|----------|
| `contained` | One primary action per view |
| `outlined` | Secondary actions |
| `text` | Tertiary/inline actions |

Sizes: `small` / `medium` / `large`. Loading: use the `loading` prop rather than swapping children for a spinner. Icon-only actions use `IconButton` **with `aria-label`** (or a `Tooltip` with a string `title`).

### ModuleCard / ModuleCardGrid
`common/ModuleCard.jsx` — feature tiles.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `interactive` | bool | `false` | Pointer, hover lift, `role="button"`, `tabIndex=0`, Enter/Space → `onClick` |
| `onClick` | fn | — | |

`ModuleCardGrid` lays tiles out with `repeat(auto-fit, minmax(240px, 1fr))` and 24px gap. Don't nest buttons/links inside an `interactive` card.

### Toasts — Notification, useNotification, useNotify

| API | When |
|-----|------|
| `useNotify().notify(message, type?, duration?)` | **Default.** App-wide host mounted in `App.jsx`; survives route changes |
| `useNotification()` + `<Notification {...state} onClose={hideNotification} />` | Local toast state inside one component |

`type`: `info` (default) · `success` · `warning` · `error`. Default duration 6s; pass `0` to keep it open. The hook owns timing; the Snackbar ignores click-away.

**Feedback rule:** Snackbar for transient confirmation ("Phrase saved", "Logged out"). Inline `Alert` for errors tied to a form or section, or anything the user must read before continuing.

### EmptyState
`common/EmptyState.jsx` — zero results, nothing saved yet, not found.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | node | — | 40px, `text.secondary`, hidden from screen readers |
| `title` | node | — | One line, `subtitle1` weight 600 |
| `titleComponent` | string | `"h2"` | Heading level; use `"h1"` when it replaces the whole page (e.g. "Stay not found") |
| `description` | node | — | What to try next |
| `action` | node | — | At most one button |
| `variant` | `"tint"` \| `"plain"` | `"tint"` | `tint` = `surface.tint` panel |

Renders with `role="status"` so a search that returns nothing is announced. Used in Stays results, Explore, saved phrases, and Stay details (not found).

```jsx
<EmptyState
  icon={<HotelIcon />}
  title="No stays found"
  description="Try another destination, a wider distance, or fewer filters."
/>
```

### Loading
- Route-level / auth gate: `FullScreenLoader` (`role="status"`, `aria-live="polite"`).
- Content lists and cards: `Skeleton` shaped like the content (see `ResultsList`).
- Actions: `Button loading`.

### ErrorBoundary
`common/ErrorBoundary.jsx` — themed `Alert` with a Reload action. Mounted twice: inside `AppearanceProvider` in `App.jsx` (themed) and at the root in `main.jsx` (last resort). Error details are shown in dev builds only.

### Navigation — Navbar, BottomNav, navItems
- **`navItems.js`** is the single source. Each item: `{ label, to, icon, mobile: "tab" | "more", match? }`. `isNavItemActive(item, pathname)` handles nested routes (`/stays/123`) and extra prefixes (`/discover` → Explore).
- **`Navbar`** (desktop, ≥ md): all items, roving tabindex with ←/→.
- **`BottomNav`** (mobile, < md): `mobile: "tab"` items as tabs (Home, Translate, Phrasebook, Explore) plus a **More** tab that opens a bottom sheet (Stays, Emergency, Culture). More shows as selected when you're on one of its routes; nothing is selected on routes outside the nav. Standard Tab order, no focus trapping.

To add a section: add one entry to `NAV_ITEMS`. Keep `mobile: "tab"` to 4 items.

### Maps
- `stays/StaysMap.jsx` — stays search and stay details.
- `discover/DestinationMap.jsx` — destination details.

### PhotoCarousel
`stays/PhotoCarousel.jsx` — labeled prev/next buttons ("Previous photo" / "Next photo"), dots are real buttons with a 24px hit area and `aria-current`, glass arrow background that works in both modes.

## Patterns

| Pattern | Standard |
|---------|----------|
| Page | `PageContainer` → sections with `gap: 3` → `Card` / `ModuleCard` |
| Auth page | `AuthShell` + form; inline `Alert` for errors |
| Card outline | `border: (t) => \`1px solid ${t.palette.border.subtle}\`` or `variant="outlined"` + `borderColor: "border.subtle"` |
| Selected card | `borderColor: selected ? "primary.light" : "border.subtle"` |
| Tinted highlight | `bgcolor: "surface.tint"` |
| Glass panel | `bgcolor: "surface.glass", backdropFilter: "blur(12px)"` |
| Chips | `size="small"`; `variant="outlined"` for filters, filled for selected |
| Forms | `TextField` (12px radius, 2px primary focus from theme). Don't re-override `fieldset` colors per page |
| Empty state | `EmptyState` — icon, one-line title, what to try next, at most one action |

## Contributor checklist

- [ ] No hex/rgba in components — palette path, `alpha(theme.palette.x, n)`, or a `customShadows` token
- [ ] Checked in light **and** dark mode
- [ ] One `<h1>` per page (`PageContainer`, or `component="h1"`)
- [ ] Every `IconButton` has an accessible name
- [ ] Radii from the scale; shadows from `customShadows`; transitions via `transitionFor()`
- [ ] Typography via `variant`; no inline `fontSize`
- [ ] New nav destinations added in `navItems.js` only
- [ ] Toasts via `useNotify()`

---

# Part 2 — Audit log

## Score

| Area | Weight | 2026-10-01 audit | First pass | Second pass |
|------|-------:|------:|------:|------:|
| Token definition | 25 | 14 | 22 | 24 |
| Token adoption | 25 | 10 | 16 | 22 |
| Component library | 25 | 13 | 19 | 22 |
| Accessibility | 15 | 8 | 13 | 14 |
| Documentation | 10 | 1 | 9 | 9 |
| **Total** | 100 | **46** | **79** | **91** |

Hardcoded color literals in components: **192 → 82 → 8** (3 white shimmer highlights, and the Cultural Guide's fixed blue hero). Hand-written transition durations: **~45 → 0**.

## Fixed on `design-system-fixes`

**Theme & tokens**
- Added `border`, `surface`, `accent`, `rating`, `marketing` (renamed from `luxury`) palette groups; `radius`, `motion`, `customShadows` theme tokens.
- `primary`, `error`, `warning`, `success`, `info` are now mode-aware; dark-mode text pairs pass AA. `success` is now green (was identical to brand teal); `warning` is amber-brown (was close to error red).
- `shape.borderRadius` 16 → 4, so `sx={{ borderRadius: 3 }}` is 12px (was 48px). `Paper` keeps 16px and `Alert` 12px via overrides. Values that assumed px (`borderRadius: 24`, map canvas `8`, drawer corners `16`) were converted to explicit px.
- `h6` weight is 600 to match how it's actually used.
- Fonts: DM Sans now loads weight 800. Removed unused Manrope, the third-party-hosted FKGroteskNeue, the unused Font Awesome stylesheet, and the unloaded "Inter" fallback.
- `global.css` body colors match the theme (pre-hydration fallback).

**Dark mode**
- Translation main card, PhotoCarousel arrows, map loading overlays, and the Emergency warning panel now use theme surfaces.
- ErrorBoundary rebuilt with MUI `Alert`/`Button` and mounted inside the theme.
- Emergency country placeholder uses `text.secondary` (was `#999`, 2.85:1).
- 38 of the 50 repeated `rgba(94,82,64,…)` / `rgba(33,128,141,…)` literals replaced with `border.*` / `surface.*` / palette alpha (the other 12 are teal glows on the Landing page).
- Home tiles and emergency service types use `palette.accent` (readable in dark mode).

**Behavior**
- Logout toast now appears: new app-wide `NotificationProvider` + `useNotify()`.
- `useNotification` owns timing (default 6s, clears previous timer, cleans up on unmount); `Notification` no longer has a competing 6s auto-hide, and ignores click-away.
- `AppLayout` no longer lifts the entire page on hover.

**Navigation**
- `navItems.js` is the single source for desktop and mobile; labels unified ("Translate", "Explore").
- Mobile: added **More** sheet with Stays, Emergency, Culture. Fixed "Home" being highlighted on unrelated routes; removed the Tab key trap and the empty badge.
- `SharedNavbar` → `Navbar` (old unused `Navbar` deleted; test now covers the live one).

**Accessibility**
- `<h1>` added to Stays, Explore, Stay details, Destination details.
- `aria-label` on Translation mic and play buttons and carousel arrows; carousel dots are keyboard-accessible buttons with 24px targets.
- framer-motion respects reduced motion (`MotionConfig reducedMotion="user"`).

**Cleanup**
- Removed `common/Button` wrapper (all callers on MUI `Button`), `LoadingSpinner`, `BackHomeButton`, `StaysSearchBar`, `pages/Accommodation.jsx` (route-level redirect already existed) and its test, unused `pages/Destinations.jsx`, empty `components/landing/`.
- Renamed the two `MapView`s to `StaysMap` and `DestinationMap`.

**Tests**
- Test setup now renders every component under the real app theme.
- New tests: `navItems`, `BottomNav` (More selection, no false "Home", sheet contents), `NotificationProvider`. Suite: 121 passing.

**Correction to the original audit:** it reported 10 of 20 icon buttons unlabeled. The scan was wrong (it cut off at `=>` inside handlers). The real count was 4: two carousel arrows and two Translation buttons, all now fixed.

## Second pass (same branch)

- **Bug:** successful email verification crashed (`url` undefined in `AuthContext`), leaving the "Email verified! Redirecting…" loader stuck. Fixed, with a regression test.
- **Motion:** `transitionFor()` helper; 39 hand-written transition strings replaced.
- **Typography:** 24 redundant `fontWeight: 600` overrides on `h6` removed.
- **Contrast:** outlined primary chips use `primary.dark` in light mode (eyebrow chips on tinted backgrounds were 4.4:1).
- **Landing:** every hardcoded color moved to `marketing.*` tokens; `Landing.css` reads CSS variables and has no per-mode selectors. Hero card text was 2.2:1 on the light end of its gradient in light mode — now ≥ 4.9:1. Itinerary banners tint from `palette.accent`. Removed unused `journeySteps` data.
- **Components:** `EmptyState`; `PageContainer` `fullBleed` variant and `meta` slot. Stays, Explore and both detail pages now use `PageContainer`. Explore previously showed a blank grid with no results — it now has an empty state that differs before and after a search.
- **Tests:** 127 passing (new: email verification, `EmptyState`, `PageContainer`).

## Third pass

On `design-system-fixes`:
- **Lint:** `.eslintrc.cjs` + `npm run lint` (react, react-hooks). 0 errors; 9 `exhaustive-deps` warnings reviewed as intentional.
- **Login:** the "account isn't verified yet — check <email>" guidance and resend button were never shown (including right after registering). Now an info alert.
- **Explore:** search failures show an empty state with Try again (they were hidden); location errors are toasts; loading uses card skeletons.
- **Stay details:** Location map restored (shown when coordinates exist).
- **Cleanup:** unused imports/state removed; unwired code deleted (natural-language planner handler, reset-email resend handler, pitch setter, hero metrics prop).
- **Tokens:** `palette.culture` for the Cultural Guide hero (body text was 3.8:1). Components contain no hardcoded colors.

On `css-variables-theme` (branched from the above):
- Light/dark moved to MUI `colorSchemes` + CSS variables; `AppearanceProvider` uses MUI's color-scheme manager (same storage key). Removed the `html.dark` class, manual storage/attribute effects, and `--landing-*` variables.
- `theme-init.js` + a dark fallback in `global.css` remove the light flash for dark-mode users.
- Tests: 156 passing. Test setup uses `createAppTheme("light", { cssVariables: false })` because jsdom can't parse `var()` inside border shorthands.

## Still open

| Item | Notes |
|------|-------|
| `transition: "all …"` | Tokenized, but `all` animates layout properties; narrow to `transform`/`box-shadow`/`color` |
| 55 `fontWeight: 600` overrides | Mostly on `subtitle*`/`body*`; consider making 600 the `subtitle2` default |
| `theme.palette.mode` branches in components | Work, but re-render on toggle. Where a value is a token, prefer `theme.vars` / `theme.applyStyles("dark", …)` so CSS alone switches it |
| Visual QA | Not yet checked in a browser: Landing, Stays (sticky sidebar), Explore states, stay map, Login after registering, dark-mode load |
