# FursadHub Brand, UI, Motion and Interaction Guidelines

Claude MUST read this file before making frontend visual decisions.

Claude is allowed to implement the approved design system. Claude is NOT allowed to invent a new FursadHub identity.

---

# 1. Brand Source of Truth

The FursadHub team owns:

- logo
- brand colors
- typography
- icon direction
- spacing language
- border-radius language
- dashboard visual style
- status visual language
- animation/motion style

The latest approved logo direction is the bridge-based FursadHub concept.

The actual logo asset placed in the repository is the visual source of truth.

Recommended asset location:

```text
apps/web/src/assets/brand/
├── logo.svg or logo.png
├── logo-mark.svg or logo-mark.png
├── logo-light.svg or logo-light.png
├── logo-dark.svg or logo-dark.png
└── favicon.svg
```

If only one approved logo exists initially, use that one. Do not invent missing logo variants.

Claude MUST NOT:

- redraw the logo
- distort proportions
- replace it with generated text
- replace it with a generic icon
- recolor it without instruction
- create an unrelated new logo
- silently choose a permanent palette if exact values are not documented

If exact brand colors are not yet formally locked, derive temporary tokens from the approved source asset only when technically necessary and clearly report them as awaiting team confirmation.

Do not spread guessed colors directly through components.

## Approved FursadHub Logo Reference

The FursadHub team has now supplied the approved logo reference sheet.

Reference image path used by the team:

```text
/mnt/data/ghostwriter_images/context/c22b974b-b966-528c-bdfb-e42ea180a75e.png
```

This sheet contains the approved visual identity variants and MUST be treated as the brand source of truth until separate production-ready asset files are exported.

### Exact approved logo concept

The approved FursadHub logo is composed of:

- the `FH` monogram
- an arched doorway
- an open orange door
- a roadway/path starting from the opened door and extending forward
- the `FursadHub` wordmark
- the exact tagline:

```text
Opening doors to your future.
```

Claude MUST preserve this concept exactly.

Claude MUST NOT:

- redesign the logo concept
- change the monogram structure
- remove the doorway
- remove the roadway/path
- replace the door with another icon
- rewrite or paraphrase the tagline
- invent a different slogan

### Approved logo variants from the supplied sheet

Use the supplied variants as follows:

1. **Primary light-background logo**
   - use the white-background version from the supplied sheet as the main default reference for light UI surfaces.

2. **Primary dark-background logo**
   - use the dark navy-background version from the supplied sheet as the main default reference for dark surfaces, dark hero sections, dark auth panels, and dark footers.

3. **Secondary warm-light logo**
   - the cream/beige-background variant is approved as a secondary presentation option for selected marketing or decorative surfaces, but the core application UI should still primarily use the main light or dark variants.

### Wordmark and tagline rules

Exact brand text:

```text
FursadHub
Opening doors to your future.
```

Do not change the capitalization of `FursadHub`.

Preferred visual behavior from the approved logo sheet:

- on light backgrounds:
  - `Fursad` appears in a dark navy/charcoal tone
  - `Hub` appears in orange
  - tagline appears in dark text
- on dark backgrounds:
  - `Fursad` appears in white/light
  - `Hub` appears in orange
  - tagline appears in white/light

### Derived brand palette

The provided approved logo sheet implies the following core palette. These values may be used as the initial design-token defaults.

```text
Brand dark / navy:   #091423
Brand orange:        #F8891F
Brand orange deep:   #E56D0E
Off-white / cream:   #FBF6EE
Warm beige support:  #EDCFAE
```

These are now the approved initial working brand tokens unless the team later provides an exact token sheet.

### Asset-export rule

During implementation, Claude should assume the team will eventually export and store assets similar to:

```text
apps/web/src/assets/brand/
├── logo-light.png or .svg
├── logo-dark.png or .svg
├── logo-cream.png or .svg
├── logo-mark.png or .svg
└── favicon.png or .svg
```

If these exported assets do not yet exist, Claude may temporarily use the approved reference sheet as the source of truth, but must not invent alternate branding.

### Application usage rule

The main app UI should prefer:

- light application shells and content surfaces using the light-background logo
- dark/navy hero or highlighted sections may use the dark-background logo
- orange is the main accent and action color
- the logo should appear consistently in navbar, authentication pages, and footer areas

---

# 2. Brand Direction

FursadHub should feel:

- modern
- trustworthy
- professional
- opportunity-focused
- welcoming to students
- credible to universities
- credible to organizations
- clean rather than visually noisy
- polished rather than template-like

The interface should not look like a generic admin template with the FursadHub logo pasted on top.

---

# 3. Centralized Design Tokens

All permanent styling must come from centralized tokens.

Conceptual CSS variables:

```css
--color-brand-primary;
--color-brand-secondary;
--color-brand-accent;

--color-background;
--color-surface;
--color-surface-muted;
--color-border;

--color-text-primary;
--color-text-secondary;
--color-text-muted;

--color-success;
--color-warning;
--color-danger;
--color-info;

--radius-sm;
--radius-md;
--radius-lg;

--shadow-sm;
--shadow-md;

--duration-fast;
--duration-normal;
--duration-slow;

--ease-standard;
--ease-enter;
--ease-exit;
```

Map these into Tailwind semantic tokens.

Prefer usage such as:

```text
bg-brand-primary
text-brand-primary
bg-surface
text-foreground
border-border
text-muted
```

Avoid page-level arbitrary values such as:

```text
bg-blue-600
text-purple-500
bg-[#1f2937]
```

unless they are explicitly approved design tokens.

---

# 4. Shared UI Components

Build a reusable UI layer under:

```text
apps/web/src/components/ui/
```

Initial component families should support:

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio
- Badge
- StatusBadge
- Card
- Dialog / Modal
- Dropdown
- Table
- Pagination
- Tabs
- Toast
- Alert
- Avatar
- Breadcrumb
- Tooltip
- EmptyState
- LoadingState
- ErrorState
- Skeleton
- ConfirmDialog
- AnimatedCheck
- StatusIndicator
- ProgressIndicator

Do not rebuild differently styled buttons/forms inside every feature.

---

# 5. Component Variants

Use controlled variants.

Example Button:

```text
primary
secondary
outline
ghost
danger
```

Sizes:

```text
sm
md
lg
```

Status components should use semantic state variants rather than feature-specific random colors.

---

# 6. Layouts

Use a consistent visual system across:

- PublicLayout
- StudentLayout
- UniversityLayout
- OrganizationLayout
- AdminLayout

Navigation can differ by role, but all areas must clearly belong to one FursadHub product.

---

# 7. Dashboard Principles

Dashboards should prioritize workflow and next action rather than decorative charts.

## Student

Prioritize:

- enrollment verification status
- applications
- nominations requiring action
- offer requiring action
- active placement
- upcoming report/attendance/defense obligations

## University

Prioritize:

- student verification queue
- targeted opportunity requests
- nominations
- active placements
- students missing internship requirements
- upcoming defenses

## Organization

Prioritize:

- active opportunities
- candidate pipeline
- offers awaiting response
- active placements
- supervisor tasks

## Admin

Prioritize:

- university verification
- organization verification
- escalated student verification
- privacy requests
- operational issues
- key platform activity

Do not create charts simply to make a dashboard look busy.

---

# 8. Responsive Design

FursadHub must work well on:

- mobile
- tablet
- desktop

Do not treat mobile as an afterthought.

Critical mobile-friendly flows include:

- registration
- email verification
- student enrollment claim
- internship browsing
- applications
- nomination consent
- offer acceptance
- weekly logs
- attendance visibility
- final report status

Tables may transform into cards or responsive layouts where needed.

---

# 9. Accessibility

Use:

- semantic HTML
- proper form labels
- keyboard navigation
- visible focus states
- accessible error messages
- appropriate ARIA only when needed
- sufficient contrast
- meaningful icon labels

Do not communicate status through color alone.

A rejected status should have:

- color
- icon
- text

not only red color.

---

# 10. Internationalization

All FursadHub system UI supports:

- English
- Somali

Do not hardcode visible production strings directly inside reusable components.

Use translation keys.

Suggested translation structure:

```text
locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── student.json
│   ├── university.json
│   ├── organization.json
│   ├── opportunities.json
│   ├── candidacies.json
│   ├── placements.json
│   └── validation.json
└── so/
    ├── common.json
    ├── auth.json
    ├── student.json
    ├── university.json
    ├── organization.json
    ├── opportunities.json
    ├── candidacies.json
    ├── placements.json
    └── validation.json
```

Design for longer Somali labels/messages without breaking layout.

---

# 11. Forms

Forms must use consistent:

- labels
- help text
- required indicators
- validation messages
- spacing
- loading state
- disabled state
- success state
- button placement

Client validation improves UX.

Backend validation remains authoritative.

Validation errors must support translation.

---

# 12. Motion Philosophy

FursadHub should use purposeful motion.

Animation should communicate:

- success
- verification
- progress
- completion
- warnings
- errors
- opening/closing UI
- status transition
- loading completion
- navigation context

Animations must be:

- subtle
- fast
- professional
- consistent
- accessible
- meaningful

Avoid:

- excessive bouncing
- endless glowing
- constant pulsing
- heavy page transitions
- long blocking success animations
- decorative motion that distracts from work
- different motion styles on each dashboard

FursadHub is a professional university/organization platform.

---

# 13. Motion Tokens

Centralize motion values.

Suggested initial ranges:

```text
Fast feedback:
~120–180ms

Normal UI transition:
~180–300ms

Important one-time success/status animation:
~300–600ms
```

Exact values should become centralized tokens.

Use consistent easing.

Do not scatter arbitrary durations such as 137ms, 430ms, 900ms across features.

---

# 14. VERIFIED Animation

Verification is an important FursadHub state and should have a polished reusable success pattern.

Conceptual transition:

```text
        ○
circle scales/fades in
        |
        v
        ✓
checkmark draws/scales
        |
        v
     VERIFIED
text subtly fades/slides
        |
        v
animation finishes
        |
        v
stable ✓ VERIFIED state remains
```

Use the one-time animated verified pattern when appropriate for:

- email verified
- student enrollment verified
- university verified
- organization verified

Do not continuously replay animation whenever React re-renders.

Do not keep a verified badge pulsing forever.

---

# 15. Other Status Animations

## Success

Examples:

- application submitted
- nomination accepted
- offer accepted
- weekly log submitted
- final report approved
- internship completed

Use:

- short check animation
- subtle scale/fade
- toast where appropriate
- stable final status after transition

## Pending / Under Review

Examples:

- enrollment under review
- institution verification under review
- application under review
- final report submitted

Use restrained progress/clock indicators.

Do not show fake progress percentages.

## Warning

Examples:

- approaching deadline
- missing required report
- action required

Use controlled emphasis.

Avoid aggressive endless pulsing.

## Error

May use:

- subtle one-time shake for invalid form submit
- error icon reveal
- inline validation transition

Do not repeatedly animate error states.

---

# 16. Reusable Status Components

Prefer reusable shared components such as:

```text
<AnimatedCheck />
<StatusBadge />
<StatusIndicator />
<VerificationStatus />
<ProgressIndicator />
<LoadingSpinner />
<Skeleton />
<Toast />
<Alert />
```

Do not reimplement a different "verified" animation separately in student, organization, and university features.

Feature-specific wording belongs to the feature.

The motion primitive belongs to shared UI.

---

# 17. Status Visual Language

Every status must have clear semantics.

## Verified / Approved / Completed

- success token
- check icon
- stable label
- optional one-time success animation

## Pending

- neutral/info token
- clock/progress icon
- stable text

## Under Review

- info token
- review/progress icon
- clear text

## Warning / Action Required

- warning token
- warning icon
- clear action language

## Rejected / Failed / Terminated

- danger token
- appropriate icon
- clear wording

## Paused

- muted/warning treatment
- pause icon/text

Never communicate state by color alone.

---

# 18. Page and Component Transitions

Use subtle transitions for:

- modals
- dropdowns
- sidebars
- tabs
- accordions
- toasts
- loading -> loaded state
- empty -> populated state
- status transitions

Avoid heavy full-page transitions for normal dashboard navigation.

The app should feel fast.

---

# 19. Loading UX

Do not use a generic full-page spinner everywhere.

Use:

## Skeletons

For:

- dashboard cards
- lists
- tables
- profile sections

## Spinner / inline progress

For:

- button actions
- compact blocking operations

Example:

```text
[ Submit Application ]

becomes

[ spinner  Submitting... ]
```

Do not allow duplicate submission while mutation is pending.

Buttons should not change width dramatically while loading.

---

# 20. Toasts

Use toasts for temporary confirmation such as:

- profile updated
- application submitted
- nomination accepted
- report submitted

Toasts should transition subtly.

Critical state must also remain visible on the actual page. Do not make a toast the only evidence that an important action succeeded.

---

# 21. Reduced Motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

When reduced motion is preferred:

- disable non-essential drawing/bouncing effects
- reduce large scale/slide motion
- use simple opacity or immediate state changes
- preserve meaning without depending on animation

Motion must never be required to understand status.

---

# 22. Animation Implementation

Prefer:

- CSS transitions
- Tailwind transitions
- CSS keyframes for simple controlled effects

Use one approved animation library only if CSS is insufficient.

Do not introduce multiple animation libraries.

If a library is added, explain why and keep its use centralized.

Prefer performant properties:

- transform
- opacity

Avoid animation that forces expensive layout recalculation without need.

---

# 23. Icons

Use one approved icon library consistently.

Do not mix several icon sets.

Do not use emoji as production UI icons unless specifically approved.

Status icons should use the same visual language everywhere.

---

# 24. Brand Approval Rule

Claude may decide implementation details that do not alter the FursadHub identity, such as:

- semantic HTML
- responsive behavior
- component composition
- accessible focus behavior
- token wiring
- minor spacing within the approved system
- reduced-motion implementation

Claude MUST NOT make unapproved permanent decisions about:

- logo redesign
- brand palette
- typography family
- logo treatment
- illustration style
- unrelated dashboard visual language

When an exact permanent brand value is missing, use a centralized temporary token and report:

> Brand value awaiting FursadHub team approval.

Do not silently make the decision.
