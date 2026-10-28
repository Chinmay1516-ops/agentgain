# Page 12 — Seller overview

Verified 2026-10-28 against docs/references/image-12-seller-overview.jpeg. Page 11 was checkpointed first at 58d5cb4; this batch ends after Page 12.

## Implemented

Seller hero, shared shell/themes, listings and draft entry, local registered packages, public demo activity, sharing card, profile dialog. Landing Seller and legacy ?panel=seller route to /seller. My listings and Evaluation activity anchors scroll and focus their sections. Register a skill opens /seller/register.

Clipboard writes the actual invoice preview URL; failure provides manual copying. Localhost limitations are visible. New custom packages have no misleading invoice checkout link. Form drafts are isolated by registration/draft ID, survive navigation and clear after registration; all state resets on reload. Same-version registration preserves listing order.

## Verification

- Full unit/service suite: 38 passed. Final seller subset: 6 passed.
- Full Chromium regression: 31 passed in 1.7 minutes. Final seller subset: all 5 passed after unknown-draft guard and keyed form initialization fixes.
- Typecheck and Vite build passed: JS 389.46 kB / 114.38 kB gzip; CSS 106.04 kB / 21.43 kB gzip.
- Four widths checked: 1536, 820, 390, 320. No page-level horizontal overflow or page errors. Bounded tables intentionally scroll horizontally on smaller screens; hints and keyboard-focusable regions are present.
- Desktop, mobile, small mobile and night captures visually inspected. Mobile hero contrast was corrected after inspection. Desktop layout preserves the reference hierarchy and reuses existing static artwork.
- Axe WCAG 2 A/AA and 2.1 AA: zero violations in scanned Day/Night mobile, status, package and profile dialog states. Page 11 registration/dialog scans also pass. This is not full accessibility certification.
- Covered real clipboard round trip and denial fallback, navigation/focus, immutable package hash, draft continuity/isolation, session reset, unknown draft IDs including constructor, distinct pending/completed/failed payment states, no private buyer record exposure.

## Limits

Historical seller activity is synthetic. No actual publication, authentication, evaluation, payment, buyer entitlement or revenue is asserted. Local package hashes identify locally serialized bytes only. Custom checkout integration and remaining pages await backend work and later supplied references respectively. No remote push or deployment.
