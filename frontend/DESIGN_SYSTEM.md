# Teamora Design System

Single source of truth for product UI. **Do not introduce one-off hex colors, radii, or durations** — extend tokens in `src/index.css` instead.

## Foundations

| Layer           | Location                                                       |
| --------------- | -------------------------------------------------------------- |
| Tokens + themes | `src/index.css` (`:root`, `.dark`, `.high-contrast`, `@theme`) |
| Primitives      | `src/components/ui/*`                                          |
| App chrome      | `AppNavbar`, `features/workspace/*`, `PageShell`               |

### Themes

| Theme         | Mechanism                                    |
| ------------- | -------------------------------------------- |
| Light         | Default (`:root`)                            |
| Dark          | `html.dark`                                  |
| High Contrast | `html.high-contrast`                         |
| System        | Follows `prefers-color-scheme` via `App.jsx` |
| Density       | `html[data-density=comfortable\|compact]`    |

Users set theme under **Settings → Appearance** (includes High Contrast). Navbar cycles Light → Dark → High Contrast → System.

### Semantic color tokens (Tailwind)

| Token                                                             | Use                          |
| ----------------------------------------------------------------- | ---------------------------- |
| `bg-background` / `text-text`                                     | Page canvas + body text      |
| `bg-card` / `bg-card-elevated` / `bg-card-sunken`                 | Surfaces                     |
| `text-muted` / `text-text-secondary`                              | Secondary copy               |
| `border-border`                                                   | Default borders              |
| `bg-primary` / `text-primary` / `hover:bg-primary-hover`          | Brand actions                |
| `text-on-primary`                                                 | Text on primary/danger fills |
| `bg-primary-subtle` / `border-primary-muted`                      | Soft brand chrome            |
| `danger` / `success` / `warning` / `info` (+ `-subtle`, `-hover`) | Feedback                     |

### Radius

`rounded-xs` · `rounded-sm` · `rounded-control` (12) · `rounded-button` (14) · `rounded-input` / `rounded-avatar` (16) · `rounded-lg` (18) · `rounded-card` (20) · `rounded-xl` (24)

### Layout

| Utility                                           | Value              |
| ------------------------------------------------- | ------------------ |
| `h-navbar` / `pt-navbar` / `top-navbar`           | 72px               |
| `w-sidebar` / `lg:pl-sidebar`                     | 240px              |
| `w-sidebar-collapsed` / `lg:pl-sidebar-collapsed` | 72px               |
| `max-w-auth`                                      | 420px              |
| `.teamora-page` / `.teamora-page-inner`           | Standard app frame |

### Motion

`duration-fast` (120ms) · `duration-normal` (180ms) · `duration-slow` (220ms) · `ease-standard`  
Respects `prefers-reduced-motion`.

### Elevation / z-index

Shadows: `shadow-card` · `shadow-hover` · `shadow-dropdown` · `shadow-modal`  
Layers: `z-navbar` · `z-sidebar` · `z-modal` · `z-toast`

### Overlays

Use `.teamora-scrim` for drawer/modal backdrops (tokenized overlay + blur).

## Component library (`src/components/ui`)

Prefer these over ad-hoc markup:

- **Button** — variants: `primary` · `secondary` · `ghost` · `danger` · `danger-ghost` · `outline`; sizes: `sm` · `md` · `lg` · `icon`; `loading`
- **Input / Textarea / Select** — `invalid`, disabled, read-only, focus rings
- **IconButton**, **Switch**, **Checkbox**, **Tabs**, **Badge**
- **Card** — `default` · `elevated` · `sunken` · `interactive`
- **Modal / Dialog**, **DropdownMenu / DropdownItem**
- **EmptyState**, **Skeleton**, **Spinner**, **Loader**
- **SearchBar**, **Avatar**, **PageShell**, **NotificationButton**

### Required states (primitives)

Default · Hover · Focus-visible · Active · Disabled · Loading (Button) · Invalid (fields) · Read-only (fields)

## Rules for contributors

1. **No hardcoded `#hex` in product chrome** — editors may keep tool palettes (whiteboard pens, etc.).
2. **No duplicate components** — extend `ui/` instead of copying class strings.
3. **Compose with tokens** — spacing via Tailwind scale; radii/colors/motion via theme utilities.
4. **Preserve behavior** — design changes must not alter API contracts or business logic.
5. **Accessibility** — min touch targets ~44px where practical; visible focus rings; semantic roles on menus/dialogs; reduced motion honored.

## Migration helper

```bash
node scripts/migrate-design-tokens.mjs
```

Codemod for common arbitrary values → tokens. Prefer tokens at authoring time so re-runs are rare.

## Verification

```bash
npm run lint
npm run build
```

Manually: toggle Light / Dark / High Contrast / System; keyboard-tab through forms and dialogs; check Dashboard, Workspace, Auth, Settings, Calendar.
