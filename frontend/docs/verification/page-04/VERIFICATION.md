# Page 04 — Invoice skill detail verification

2026-10-28 (Asia/Calcutta). Reference: ../../references/image-4-invoice-skill.jpeg. Route /buyer/skills/invoice-field-extractor.

## Final checks

- npm run typecheck — PASS (source and tests).
- npm run test — 24 component/service tests PASS across four pages.
- npm run build — PASS. JS 314.27 kB / 96.69 kB gzip; CSS 58.92 kB / 13.36 kB gzip.
- npm run test:browser — 13 Chromium scenarios PASS in 42.3 seconds, including landing/buyer/catalogue regressions.
- No horizontal page overflow or page errors at 1536×1024, 820×1180, 390×844 or 320×740. Detail request audit saw no third-party network requests.
- Axe zero violations in checked Day/Night Overview, Input & output and Version tabs; Night setup dialog; mobile Day. Existing pages checked too. Not complete accessibility certification.

## Interactions and evidence

Catalogue invoice link opens the correct detail, active Explore navigation is retained, breadcrumb returns to catalogue. Tabs support click, ArrowLeft/Right, Home/End, roving focus and URL reload. Setup dialog explicitly discloses unavailable setup and no contract/authorization/execution. Tab containment, Escape and focus return work. Unknown IDs show unavailable, failed service can retry, fixtures are cloned and abortable. New page navigation starts at top while filter/tab updates retain scroll; My skills anchor still focuses correctly.

Images visually reviewed: desktop.png, tablet.png, mobile.png, small-mobile.png, night.png, input-output.png, version.png, setup-dialog.png. A missing heading space on smaller layouts was identified and corrected, with text assertion and regenerated captures.

## Reference adaptations and limits

Reuses the local sunset architecture with real HTML/CSS invoice and field overlays. The duplicate decorative scene is aria-hidden; the example below is semantic/selectable. Invoice records and outputs are illustrative, unexecuted fixtures. USD 12.00 is this listing's illustrative price, not a change to the canonical USD 200 authorization. Listed version wording avoids claiming a frozen contract. Payment completion requires confirmed capture; PayPal Sandbox card says Preview · not connected. Content hash not supplied; licence terms not invented. Consistent Jordan Diaz/JD replaces the screenshot's inconsistent JS persona.

No new backend, SDK, credentials, execution or heavy animation dependency. Setup and unprovided skill details remain availability dialogs. No known critical issues remain for this page. Await IMAGE 5.
