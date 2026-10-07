# FursadHub design foundation

The rules the shared primitives encode. Values live in `tokens.css` (colour, shape, layout,
motion) and `src/index.css` (type scale, Tailwind mapping, keyframes, workspace families). This
file says which value to use for what. It does not replace those files and repeats none of their
numbers that could drift.

Visual direction: **calm institutional SaaS**. Hierarchy comes from type, space, grouping and
alignment, not from putting boxes around everything.

Authority, in order: `design-reference/presentation-refresh-2026`, the approved implementation,
then these tokens and primitives (CLAUDE.md §57).

## Brand and action colour

| Token | Use |
|---|---|
| `brand-navy` `#0B2A5B` | Identity: headings (through `text-foreground`), navy rail, secondary button |
| `brand-accent` `#F97316` | Brand emphasis only: logo, illustration accents, active-navigation edge, large or non-text marks |
| `action-primary` `#C2410C` | Any fill that carries **white text**: primary buttons, CTA links, count badges, step markers |
| `action-danger` `#B42318` | Destructive buttons, in both themes |

White on `#F97316` measures 2.80:1 and fails WCAG AA for text. White on `#C2410C` measures
5.18:1. `tests/design-system/foundation.test.ts` re-measures this from `tokens.css` on every run.
Never put white text on `brand-accent`. Use `buttonClasses()` / `<Button>` / `<ButtonLink>` rather
than hand-writing an orange button.

**Known conflict, documented and not resolved here:** CLAUDE.md §57 still lists an older palette
(`#091423`, `#F8891F`, …) and the tagline "Opening doors to your future." The approved reference
and production use `#0B2A5B` / `#F97316` and "Opportunities for a Brighter Tomorrow." The product
follows the approved reference. §57 needs a team update.

## Typography

One role per job: `text-display-xl`, `text-display-lg`, `text-title-page`, `text-title-section`,
`text-title-panel`, `text-body-lg`, `text-body`, `text-label`, `text-caption`, `text-metric`.

- A page's `<h1>` comes only from `PageHeader` (`title-page`). Section and panel headings come from
  `SectionHeading` / `Panel` (`title-panel`). Don't hand-write heading classes.
- Text colour comes from semantic tokens (`text-foreground`, `text-foreground-secondary`,
  `text-muted`). Never pair `text-brand-navy` with `dark:text-foreground`: `text-foreground` is navy
  in light mode already.
- **12px (`caption`) is the floor.** No `text-[11px]` or `text-[10px]`.
- Sentence case for labels and table headers. Forced capitals cost Somali text real width.
- `cn()` is configured to know these roles. Plain `tailwind-merge` would drop them next to a
  text colour.

## Spacing and layout

4px scale. Rhythm:

| Where | Value | Primitive |
|---|---|---|
| App page gutters | 16 / 24 / 32px (mobile / `sm` / `lg`) | `PageContainer` |
| App content width | 1280px (`wide`), 768px (`narrow`, forms) | `PageContainer` |
| Public sections | 1280px, gutters as above, 40px / 64px vertical | `PublicContainer` |
| Gap between page modules | `--workspace-gap` (per workspace family) | page layout |
| Panel body | 24px default, 16px compact | `Panel` |
| Form fields / form sections | 16px / 32px with a rule | `FormSection` |
| Table cells | 12×16px comfortable, 8×12px dense | `DataTable` |

No new arbitrary pixel values (`max-w-[1448px]`, `px-[54px]`) outside the token files. Existing
public pages migrate to `PublicContainer` in Phase 3.

## Surfaces, borders, radius, elevation

Four planes: **page** (`bg-background`) → **panel** (`bg-surface`) → **inset**
(`bg-surface-muted`) → **raised** (`bg-surface-raised`: menus, popovers, dialogs, drawers, toasts).

- A static panel or card has a hairline `border-border` and **no shadow**.
- `shadow-xs` only for a resting interactive surface. `shadow-md` for menus, popovers, toasts and
  interactive hover. `shadow-lg` for dialogs and drawers.
- Controls (inputs, outline buttons) use `border-border-strong`. A control's edge needs 3:1
  (WCAG 1.4.11). The hairline is for separating content.
- Radius roles: `sm` 6px (chips, checkboxes), `md` 10px (controls), `lg` 12px (panels, tables,
  dialogs), `xl` 16px (the maximum, for expressive surfaces). `full` is for pills and avatars only.
- **Never nest surfaces.** No card in a card, no panel in a panel. Group with space, a divider or
  an inset region.

## Which container

| Content | Use |
|---|---|
| The page's title, description and actions | `PageHeader` |
| A titled module scanned as one unit (dashboard block, detail-page section) | `Panel` |
| A plain section of the page (a form, a list, prose) | `SectionHeading` + content, no box |
| One of many repeated items in a grid or list | `Card` / `EntityCard` / `InternshipCard` |
| A clickable tile | `Card interactive` |
| A KPI tile on its own | `StatCard` |
| A KPI inside an existing surface | `Metric` |
| A group of form fields | `FormSection` |
| Tabular records | `DataTable` (+ `renderMobileRow` for phones) |

## Status

`StatusBadge` is for lifecycle states only. Categories, skills and modes use `Badge`. Tones come
from a map, never inline:

- Cross-feature machines (account, institution verification, enrollment verification, privacy
  requests) use `src/lib/status/statusTones.ts`.
- Single-feature machines keep a map in their feature (`features/*/statusTone.ts`) and follow the
  same rule: success = done and good, info = in progress, warning = someone must act,
  danger = stopped by a decision, neutral = inert.
- Use `toneOf(map, value)` for values typed as plain strings. Unknown values render neutral.
- Every badge carries the translated state name. Tone is never the only signal.

## Feedback states

| Situation | Use |
|---|---|
| First load of a region | Layout-shaped skeleton: `SkeletonPanel`, `SkeletonMetricRow`, `SkeletonList`, `SkeletonText`, `DataTable loading`. Not a centred spinner. |
| Page or main region failed | `ErrorState` (block) |
| One section failed, the rest works | `ErrorState variant="inline"` |
| Nothing to show yet | `EmptyState` with a contextual `icon` name, one sentence, one action |
| A mutation succeeded or failed | `useToast()` for the acknowledgement. An error the person must act on also stays inline next to its cause. Errors never auto-dismiss. |
| Persistent page-level notice | `Alert` |

## Forms

- `FormField` marks optional fields with the translated word "Optional". Required fields are
  unmarked and get `aria-required` through the `required` prop.
- Hint above the control, error below it (it replaces any success message).
- All text controls share `controlClasses()` (40px high, strong border, shared focus ring).
- Long forms are a sequence of `FormSection`s: title and description beside the fields from
  `lg` up, one column below that.

## Motion

Durations and easings are in `tokens.css`, keyframes in `index.css`. Only transform and opacity
are animated. Everything collapses under `prefers-reduced-motion`. No hover lift, no looping
badges, no decorative page motion. The one-time confirmation (`AnimatedCheck`) is reserved for the
events in CLAUDE.md §58.

## Responsive and language

Test at 360, 414, 768, 1024, 1280 and 1536px, in English and Somali, light and dark. Labels wrap
rather than truncate, except user-generated names in a constrained cell. Action rows wrap. On
phones the page's actions share the full width.
