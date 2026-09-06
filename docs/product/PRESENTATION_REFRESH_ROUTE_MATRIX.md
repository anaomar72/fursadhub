# Presentation Refresh — Route → Reference Matrix

Canonical visual source of truth:

```text
design-reference/presentation-refresh-2026
```

This document maps every real application surface to the approved reference that governs it, and
records where a surface has no dedicated mockup and therefore inherits the approved portal visual
language by extrapolation.

## Reference inventory

The canonical directory contains eleven files: ten 1448×1086 page mockups and one 1536×1024 brand
sheet.

| Ref | File | Surface |
| --- | --- | --- |
| 01 | `ChatGPT Image Sep 4, 2026, 02_42_39 PM (1).png` | Public home |
| 02 | `ChatGPT Image Sep 4, 2026, 02_42_39 PM (2).png` | Public internships directory |
| 03 | `ChatGPT Image Sep 4, 2026, 02_42_40 PM (3).png` | Public internship detail |
| 04 | `ChatGPT Image Sep 4, 2026, 02_42_41 PM (4).png` | Public organizations directory |
| 05 | `ChatGPT Image Sep 4, 2026, 02_42_41 PM (5).png` | Public organization profile |
| 06 | `ChatGPT Image Sep 4, 2026, 02_42_42 PM (6).png` | Public universities directory |
| 07 | `ChatGPT Image Sep 4, 2026, 02_42_42 PM (7).png` | Student portal shell + dashboard |
| 08 | `ChatGPT Image Sep 4, 2026, 02_42_43 PM (8).png` | Organization portal shell + dashboard |
| 09 | `ChatGPT Image Sep 4, 2026, 02_42_43 PM (9).png` | University portal shell + dashboard |
| 10 | `ChatGPT Image Sep 4, 2026, 02_42_44 PM (10).png` | Super Admin console shell + dashboard |
| — | `redesigned brand/brand logo.png` | Canonical logo sheet and declared palette |

There is no reference for: authentication screens, any portal sub-page, any detail/record page
inside a portal, university detail, or the Verification Officer surfaces. Those are covered by
extrapolation from the shell they live in — see below.

## Shared visual language derived from the set

Six references (01–06) define the public language; four (07–10) define the portal language.

- **Public chrome** — a compact white header (50px in the reference; shipped at 60px, see Phase C), lockup left, destinations centred with an orange active
  underline, language/theme/login/Get-Started right. Navy footer with link columns, closing rule,
  strapline and a faint skyline. Content column caps at 1400px.
- **Portal chrome** — fixed 264px rail + 72px topbar. Two approved rail treatments: **light** rail
  (07 student, 08 organization) and **navy** rail (09 university, 10 platform admin). In both, the
  active destination is a tinted pill with an **orange trailing edge** and an orange icon.
- **Tenant branding** — 08 and 09 replace the FursadHub lockup with the tenant's own logo, name and
  portal label, and move FursadHub attribution to a subordinate "powered by" strip.
- **Cards** — white, hairline border, 12px radius, shallow navy-tinted shadow, content block over a
  ruled footer carrying a meta item on the left and an outline action on the right.
- **Verification** — a compact blue check beside the entity name, replacing the previous large
  green badge. 06 also shows the blue "Verified" pill where the word is spelled out.
- **Colour roles** — navy for identity, headings and dark bands; orange for the single primary
  action and for active-state indicators; blue for system/trust signals (verification, chips,
  in-portal links); white/near-white surfaces throughout.

## Matrix

Confidence key — **Direct**: a dedicated mockup governs this surface. **Shared**: several routes
are governed by one mockup. **Extrapolated**: no mockup; the surface takes the approved language of
its shell.

### Public

| Route / surface | Reference | Confidence | Notes |
| --- | --- | --- | --- |
| `/` | 01 | Direct | Hero search, live counts, featured internships, verified-organization strip, three-audience band, navy CTA. Testimonial row omitted — no endpoint supplies testimonials. |
| `/opportunities` | 02 | Direct | Hero + filters + paged card grid. Right-hand promotional rail omitted — advertises recommendations/alerts the API does not provide. |
| `/opportunities/:id` | 03 | Direct | Identity block, fact strip, long-form body, sticky apply + organization panel. Cover image, countdown, stipend and "similar internships" omitted — no such fields. |
| `/organizations` | 04 | Direct | Now backed by the real `GET /public/organizations` directory rather than a feed-derived list. |
| `/organizations/:id` | 05 | Direct | Cover banner, overlapping logo, identity row, About beside quick facts and the verification note. Culture video, employee/founded stats and follower count omitted. |
| `/universities` | 06 | Direct | Converted from a marketing page to a real directory over `GET /public/universities`. Headline counter strip omitted — only the university count has an endpoint. |
| `/universities/:id` | 05 | Extrapolated | No university-detail mockup; takes the organization-profile composition exactly. |
| `/about` | 01 | Shared | Public section language only. |
| `/legal/*` | 01 | Shared | Public chrome; document body unchanged. |
| `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | brand sheet | Extrapolated | No auth mockups in this set. The chrome-free `AuthLayout` is retained and inherits the palette, controls and lockup. |

### Student portal

| Route / surface | Reference | Confidence | Notes |
| --- | --- | --- | --- |
| Shell (rail + topbar) | 07 | Direct | Light rail, FursadHub-branded, orange active edge. |
| `/student/dashboard` | 07 | Direct | Counter tiles, recent applications, recommendations. |
| `/student/opportunities`, `/applications`, `/nominations`, `/placements`, `/profile`, `/enrollment`, and all placement sub-routes | 07 | Extrapolated | No sub-page mockups. Each inherits the student shell, card, table and badge language. |

### Organization portal

| Route / surface | Reference | Confidence | Notes |
| --- | --- | --- | --- |
| Shell (rail + topbar) | 08 | Direct | Light rail, tenant logo + name + "Recruiter Portal", "powered by FursadHub" strip. |
| `/organization/dashboard` | 08 | Direct | Stat tiles, recent applications, active internships, quick actions. |
| `/organization/opportunities`, `/candidates`, `/placements`, `/staff`, `/profile`, `/partners`, `/supervision` and detail routes | 08 | Extrapolated | No sub-page mockups; inherit the organization shell language. |
| Organization verification | 08 | Extrapolated | Verification status uses the compact blue check per the reference README. |

### University portal

| Route / surface | Reference | Confidence | Notes |
| --- | --- | --- | --- |
| Shell (rail + topbar) | 09 | Direct | **Navy** rail, tenant crest + name + orange "UNIVERSITY PORTAL", "Powered by FursadHub". |
| `/university/dashboard` | 09 | Direct | Stat tiles, recent activity, placement overview, top partner organizations. |
| `/university/students`, `/departments`, `/staff`, `/placements`, `/nominations`, `/opportunity-requests`, `/supervision`, `/my-students`, `/partners`, `/profile`, `/internship-policy`, verification cases | 09 | Extrapolated | No sub-page mockups; inherit the navy-rail portal language. |

### Platform

| Route / surface | Reference | Confidence | Notes |
| --- | --- | --- | --- |
| Shell (rail + topbar) | 10 | Direct | Navy rail, FursadHub lockup + "Super Admin Console". |
| `/admin/dashboard` | 10 | Direct | Visual hierarchy only. Per the reference README, no new administrative capability, metric or monitoring system is created because it appears in the mockup — the System Health, Flagged Issues and System Alerts panels are **not** built. |
| `/admin/users`, `/organizations`, `/universities`, `/verification-escalations`, `/opportunities`, `/privacy-requests`, `/legal-documents`, `/audit`, `/platform-roles` and detail routes | 10 | Extrapolated | Inherit the admin shell, table and badge language. |
| Verification Officer surfaces | 10 | Extrapolated | Same shell; which destinations render is driven by the caller's platform roles, unchanged. |

### Account

| Route / surface | Reference | Confidence | Notes |
| --- | --- | --- | --- |
| `/account/profile`, `/notifications`, `/privacy` | 07 | Extrapolated | Role-neutral area; takes the light-rail portal language. |

## Reference elements deliberately not built

Each of these appears in a mockup but has no field or endpoint behind it. Per the reference
README ("do not fabricate data; do not modify the backend merely to match the mockup"), they are
omitted and reported rather than invented:

- Footer newsletter subscribe form; Support/Resources footer columns and destinations.
- Home page testimonials.
- Internships page promotional rail (personalised recommendations, email alerts).
- Internship detail: cover image, application countdown, stipend, "similar internships".
- Organization profile: culture video, "why students love us" panel, employee/founded/follower
  statistics, "get alerts" signup.
- Universities page headline counters for students-reached and opportunities-shared.
- Global authenticated search field (no search endpoint for any authenticated area).
- A person's display name beside the topbar avatar (`/me` returns an email, not a name).
- Dashboard period-over-period deltas ("↗ 12% from last month") — no historical metric endpoint.
- Super Admin System Health, Flagged Issues and System Alerts panels.

## Open items for the FursadHub team

1. **`CLAUDE.md` section 57 conflicts with the canonical reference.** Section 57 lists
   `#091423 / #F8891F / #E56D0E / #FBF6EE / #EDCFAE` and the tagline
   "Opening doors to your future." The canonical brand sheet declares `#0B2A5B` and `#F97316` and
   the tagline "Opportunities for a Brighter Tomorrow". The implementation follows the canonical
   reference, as instructed; section 57 needs updating to match.
2. **Accent contrast.** White text on the approved `#F97316` measures 2.9:1, below the WCAG 2.2 AA
   floor of 4.5:1 for normal text; orange as a state indicator measures 2.9:1 against the 3:1
   non-text floor. The approved fill is used as-is rather than silently altered. Mitigations in
   place: a darkened `--color-brand-accent-ink` carries all orange *text* on light surfaces, and
   every orange state marker is paired with a weight/`aria-current` change so status is never
   conveyed by colour alone. Whether to darken the button fill is a brand decision for the team.
3. **Dark mode has no approved mockup.** The product ships a per-user theme switch, so the dark
   palette is a deliberate extrapolation of the same navy/orange system and is marked as such in
   `tokens.css`.

---

# Phase C — visual fidelity pass

Every public route was compared against its reference **at matching width** using a side-by-side
harness: the reference PNG at its native 1448px beside an `<iframe>` of the running application
pinned to the same 1448px, both scaled by the same factor. Geometry was then read numerically
(`getBoundingClientRect` on the live page, pixel-run scanning on the reference PNG) rather than
judged by eye.

## The scale finding that governs this pass

The reference mockups are presentation renders, not pixel specifications. Measured directly from
`ref01`:

| element | reference | legible equivalent shipped |
| --- | --- | --- |
| navbar height | 50px | 60px |
| "For Students" heading | ~9.5px | 16px |
| "How it works" body copy | **~7px / 10px leading** | 12px / 20px |
| search control height | 39px | 40px |
| hero headline | ~40px | 44px |

Body copy at 7px is unreadable and fails WCAG at any contrast. **Composition, proportion, structure
and hierarchy are therefore matched exactly; absolute type size is held at legible values.** The
consequence is that pages run taller than the reference — the home page reaches its footer at
1251px where the reference (scaled to the same width) reaches it at ~1025px. That difference is
entirely line-height and font-size, not layout.

## Fixes made in this pass

- Public navbar 72px → 60px; gutters `px-8` → `px-14` (reference measures a 54px gutter at 1448).
- Hero headline 54px → 44px, sub-copy 15/28 → 14/24, search controls 48px → 40px across all
  public pages.
- Featured internships strip: 3 columns → **6 columns at `xl`**, compact card density, and the
  whole card is the link (the reference has no per-card button there).
- "How FursadHub Works" restructured from three separate cards into **one bordered panel divided by
  vertical rules**, as the reference shows.
- Navy call-to-action band and verified-organization rail tightened to the reference proportions.
- Hero visual re-proportioned from 4:3 to **2.07:1** (measured off the reference photo).
- Internship detail: main-to-rail ratio 1.6:1 → **2.2:1** (reference measures ~69:31); fact strip
  laid out as one 6-across row; organization logo enlarged; a **derived** "Applications close in N
  days" notice added from the real `applicationDeadline`.
- Profile pages: cover band 160px → 112/160px (reference ~155px at 1448); **only the logo overlaps
  the cover** now — previously the entity name collided with the cover's bottom edge; main-to-rail
  ratio → 2.3:1.
- Organization profile gained the reference's **"Latest opportunities"** strip, populated from the
  organization's own published feed (the count query was already fetching it).
- Organizations and universities directories gained the reference's **location filter and sort
  control**, both backed by parameters the public endpoints already accept.

## DESIGN DEVIATIONS

**1. Type density**
- reference: body copy ~7px, section headings ~9.5px, navbar 50px
- backend support: n/a — this is a legibility and WCAG constraint, not a data one
- implemented truthful alternative: identical composition at 12px minimum body copy; pages run
  ~20-35% taller than the reference as a direct result

**2. Internship detail content tabs**
- reference: Overview / Responsibilities / Requirements / Perks / About Organization tab bar
- backend support: the fields exist, so tabs are buildable
- implemented truthful alternative: the sections are stacked and all visible. Hiding requirements
  behind a tab on a job posting costs the reader more than the tab bar gains, and the brief asks
  for the spacing *between* metadata, description, responsibilities and requirements — which
  presumes they are simultaneously visible

**3. Sort control on the internships directory**
- reference: "Sort by: Most Recent"
- backend support: **none** — `GET /public/opportunities` accepts no `sort` parameter, unlike the
  organization and university directories
- implemented truthful alternative: omitted entirely; the two directories that *do* support sorting
  now have the control

**4. Quick facts placement on profiles**
- reference: a four-across strip inside the main column, with the rail holding "Why students love
  X" and "Partner with X"
- backend support: neither rail panel has any backing data
- implemented truthful alternative: quick facts moved into the rail so it is populated rather than
  empty — the approved two-column geometry is preserved instead of collapsing to one column

**5. Footer social links**
- reference: LinkedIn / X / YouTube / Instagram icons
- backend support: none — FursadHub's own social accounts are not recorded anywhere in the repo or
  the API (organizations have social fields; the platform does not)
- implemented truthful alternative: omitted; inventing profile URLs would be fabrication

**6. Featured strip with fewer than six published internships**
- reference: always six cards
- backend support: the strip renders whatever the feed returns
- implemented truthful alternative: a fixed six-column grid, so a short row left-aligns with a
  trailing gap rather than stretching four cards to double the approved width
