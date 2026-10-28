# Architectural artwork

Three raster scene assets were prepared with built-in imagegen from the user's image-1.jpeg. They are text-free architectural recreations, not the screenshot flattened into the page. All page text, navigation, cards, icons and interaction affordances are React/HTML/CSS. Original source reference is in references/image-1.jpeg.

The reference supplies three scenes but no editable/source architectural images. Consequently the building artwork is a close recreation rather than a pixel-identical extraction. No stock-photo or customer endorsement claims are made.

## Day asset — public/images/building-day.png

Generation prompt:

Use case: precise-object-edit. Produce one clean photographic architectural BACKGROUND ASSET, landscape 1600x1152, based closely on ONLY THE TOP HERO architectural scene in the reference screenshot. Recreate the exact recognizable multi-wing blue-glass office building on the RIGHT, warm illuminated interiors with small people, front urban plaza with trees and subtle wet reflections, light blue sky. The building should occupy x=42%-96%, top=10%, bottom=86%. Left 40% must be mostly clear pale blue sky for separately rendered website text, with low distant skyline only near bottom. Preserve this architecture, perspective and luminous pale blue daylight/early evening atmosphere closely. Remove ALL screenshot UI, ALL text, ALL words, logo, navigation, headlines, labels, status cards, button, theme selector, badges, neon light trails, drag hints. Building facade must have NO logo or text. Do not include sunset middle section or lower night scene. This is only the top building scene as clean website artwork, not a website mockup. No borders or vignette, no graphic panels. Photoreal commercial architectural visualization, detailed glass mullions and warm offices, original screenshot's composition. Render the clean artwork only.

## Sunset asset — public/images/building-sunset.png

Generation prompt:

Use case: precise-object-edit. Create a single clean architectural background image, landscape 1600x1000. Closely recreate ONLY THE MIDDLE SECTION in the provided reference: the warm sunset sky on the LEFT 40% and the close-up multi-story blue-glass office building on the RIGHT 65%, visible warm illuminated office floors, trees inside, desk furniture and small people. Camera is similar to the reference's second architectural scene, building extending beyond right edge, at sunset with peach sky and distant hills at lower left, blue twilight shadows near bottom. Preserve that building design and composition faithfully. LEFT side remains open sunset sky for live website text to be overlaid later. REMOVE ALL screenshot text, headline, instructions, numbers, timeline, logo, floating cards, checkmarks, PayPal mark, UI and glowing light trails. No writing anywhere on facade. Output only clean photoreal building/environment artwork. Do not include top building scene or bottom night section. Do not render a web page. No border. Intended as one section's responsive background, not the full screenshot.

## Night asset — public/images/building-night.png

Generation prompt:

Use case: precise-object-edit. Create ONE clean architectural background asset, landscape 1600x1000, based closely on ONLY THE BOTTOM NIGHT BUILDING SCENE in the supplied reference. A compact multi-wing glass modern office building sits on the LEFT HALF, warm gold illuminated windows, urban trees, wet reflective plaza, distant subtle city lights, rich dark navy blue night sky. The whole building is visible at x=6%-48%, y=12%-80%. RIGHT HALF is clear deep navy #04172e atmosphere for a separate HTML evidence panel to be placed over it later. Preserve reference architecture, professional photographic detail, ground perspective and quiet upscale feel. Remove all screenshot UI and text, all headlines, every logo, floating panel, PayPal marks, buttons, badges and graphical light trails. No writing anywhere. Not a website mockup, only the clean night architectural illustration. Do not include the daytime top building or sunset middle scene. No border. Full scene should blend into navy #04172e at edges and bottom.

No additional page designs were generated. Exact output sizes may differ from prompt targets; CSS handles responsive placement without editing the images. Images are served locally, with later scenes lazy-loaded. Inter is bundled locally through @fontsource/inter; no external font request is required.

## Page 02 building — public/images/buyer-workspace.png

Created with built-in imagegen using docs/references/image-2-buyer-overview.jpeg as the visual reference. Exact prompt: [page-02-asset-prompt.txt](page-02-asset-prompt.txt). Saved output: public/images/buyer-workspace.png, 1536×1024, 32-bit ARGB, transparent alpha verified at corner, 2,309,113 bytes. Original tool output: C:/Users/nihar/.codex/generated_images/01a158f3-06bc-7642-b00d-4e572afa9e0f/exec-80b78d0e-cabf-42ea-98a3-ac837c6a9b21.png. Copied without image manipulation.

Only the isolated architectural building/plaza was generated, with no text or interface. Buyer page cards, trophy, icons, navigation and all text are live React/SVG/CSS. The screenshot's profile headshot is replaced with fictional-profile initials JD. Artwork remains static; Explore workspace opens task information. This is an architectural recreation, not a promise of pixel-identical source assets.

## Page 03 catalogue assets

Built-in imagegen generated four individual transparent illustrations using image-3-explore-skills.jpeg as a visual reference. Prompts: [page-03-assets.json](page-03-assets.json). Final local files: public/images/skill-invoice.png, skill-orders.png, skill-returns.png, skill-attributes.png. Originals under C:/Users/nihar/.codex/generated_images/01a158f3-06bc-7642-b00d-4e572afa9e0f/: exec-d8ae9ef3-5054-4a9e-8d7f-8293b1f23efd.png (invoice), exec-71ea807f-4a38-4814-b769-35172709f86e.png (orders), exec-a8480bba-7e6e-4777-8ee5-539416b7f317.png (returns), exec-6cefd686-ac67-4af1-bb65-d4cbdeb33744.png (attributes). Files copied without image edits and visually inspected. All interface labels are HTML. Header artwork reuses building-day.png; no full-page raster UI.
