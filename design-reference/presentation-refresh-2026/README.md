# FursadHub Presentation Refresh — Approved Visual Reference

These mockups define the approved visual direction for the FursadHub presentation refresh.

## Visual direction

The approved presentation uses:

- FursadHub navy
- white / light neutral surfaces
- approved orange accent
- FursadHub navy + orange logo
- clean cards
- strong typography hierarchy
- generous whitespace
- compact blue verification checkmarks
- organization/university tenant branding inside their portals
- subtle "Powered by FursadHub" treatment for tenant portals

## Important distinction

These images are VISUAL REFERENCES.

They define:

- composition
- hierarchy
- spacing
- card treatment
- branding
- navigation presentation
- typography
- visual emphasis
- responsive direction

They DO NOT redefine backend behavior or platform functionality.

The existing application is the functional source of truth.

## Existing functionality must be preserved

Do not change visual-reference work into permission to modify:

- backend APIs
- database schemas
- authentication
- authorization
- RBAC
- role scopes
- organization scopes
- university scopes
- internship workflows
- application workflows
- candidacy lifecycle
- placement lifecycle
- registration logic
- verification workflows
- route semantics

## Reference data

Names, companies, universities, numbers and statistics shown in the mockups are illustrative.

Examples such as Google, Microsoft, UNICEF and Jamhuriya University demonstrate presentation only.

Never hardcode these examples into production UI.

All displayed production information must come from the existing backend.

If a visual element requires a field that the backend does not provide:

1. do not fabricate data
2. do not modify the backend merely to match the mockup
3. omit or conditionally render that element
4. report the incompatibility

## Verification

Verified organizations and universities should use a compact blue verification check adjacent to the entity name instead of the previous large verification badge where appropriate.

Verification status must continue to come from the existing backend.

## Tenant portals

Organization and university portals should emphasize the authenticated tenant's identity:

- tenant logo
- tenant name
- portal type

with subtle FursadHub attribution.

Tenant branding must be data-driven.

Never hardcode a tenant from these references.

## Super Admin

The Super Admin reference defines visual hierarchy only.

Do not create new administrative capabilities, metrics, monitoring systems, security functionality or permissions merely because they appear in the mockup.

Only expose functionality supported by the existing platform.
