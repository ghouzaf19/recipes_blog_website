# CookeTricks theme competitive audit

Research date: September 8, 2026

## Purpose and boundaries

This document uses [Natasha's Kitchen](https://natashaskitchen.com/) and [Robin Miller Cooks](https://robinmillercooks.com/) as public competitive references. It is a planning artifact, not a specification to reproduce either site.

CookeTricks must not copy source code, CSS, HTML, wording, branding, logos, photography, illustrations, icons, page compositions, or proprietary assets. No affiliation with either publisher is implied. Every visual component, design token, interaction, and piece of copy must be original to CookeTricks and must follow the editorial, testing, photography, SEO, and publishing rules in `cooketricks_profile.json`.

The current structured-content source of truth remains `src/content/content-registry.ts`. Current navigation behavior remains defined by application code, particularly `src/components/Header.tsx`. This audit does not alter either.

## Current CookeTricks baseline

The current site already provides:

- taxonomy-led desktop menus for dinners, meals, ingredients, occasions, cuisines, and kitchen tips;
- a mobile navigation drawer and a deferred search overlay;
- a homepage search prompt, featured story, latest content, category shortcuts, topic modules, and an editorial-trust panel;
- a filterable blog index with stable image areas and compact metadata;
- recipe and article schemas, breadcrumbs, author/date attribution, preview warnings, tested-note sections, source disclosure, and recipe cards when complete WordPress data exists;
- five canonical pillars: Chicken Recipes & Cooking Guides, Quick & Easy Weeknight Dinners, Essential Cooking Techniques, Air Fryer Recipes & Guides, and Meal Prep & Make-Ahead Cooking.

The main opportunity is not to add more navigation depth immediately. It is to make the existing discovery system feel more intentional, photography-led, trustworthy, and easy to scan while preserving mobile performance.

## Natasha's Kitchen

Pages reviewed: [homepage](https://natashaskitchen.com/), [full recipe index](https://natashaskitchen.com/category/recipes/), [representative Ground Beef Stir Fry article](https://natashaskitchen.com/ground-beef-stir-fry/), and [author profile](https://natashaskitchen.com/natasha-kravchuk/). The homepage and recipe index were also inspected at a 390 by 844 mobile viewport.

### Visual hierarchy

- A large, image-led trending story establishes the first focal point, followed by smaller supporting cards.
- Strong section headings separate latest, seasonal, popular, weeknight, chicken, and cooking-basics modules.
- Food photographs carry most of the visual weight; taxonomy labels and rating/comment signals create a secondary scan layer.
- Repeated card patterns make a long homepage understandable despite its density.

### Recipe discovery and search

- Search is available from the header on desktop and mobile.
- The recipe index provides both visual category entry points and grouped text links.
- Discovery facets include course, cuisine, type, method, diet, season, occasion, and ingredient.
- Homepage modules act as curated queries: latest, reader favorites, seasonal selections, weeknight dinners, chicken dinners, and kitchen basics.

### Category navigation

- The main recipe menu separates broad course categories from popular methods and topics.
- The full index exposes more taxonomy than the main navigation, keeping the header usable while preserving deep discovery.
- Image-backed category tiles help readers recognize destinations without reading a long list.

### Homepage content modules

- Trending lead story with supporting content.
- Visual recipe-category shortcuts.
- Author introduction and social proof.
- Latest recipes and multiple editorially curated topic rows.
- Reader favorites with visible engagement signals.
- Seasonal or campaign feature.
- Cookbook, newsletter, social, and press-proof areas.

### Food-image presentation

- Finished-dish photography is consistently prominent and tightly cropped for card scanning.
- Larger editorial images are mixed with repeatable grid cards to establish hierarchy.
- Descriptive alternative text is generally available in the inspected document structure.
- Images support a Pinterest-friendly, save-worthy browsing experience, but CookeTricks should retain its own aspect ratios and original-photography standard.

### Author authority and trust signals

- The author is introduced early on the homepage with a portrait, role statement, and link to a detailed profile.
- The author profile names expertise, experience, education, cuisines, publication credentials, and media coverage.
- Articles show author, publication date, ratings/comments, disclosure, and a direct recipe jump.
- Reader ratings, comments, video demonstrations, press logos, and cookbook credentials compound trust across the site.

### Newsletter sections

- Newsletter prompts appear between content and again in the footer area.
- The message is framed around receiving recipes and dinner inspiration, closely aligned with reader intent.
- CookeTricks should use fewer, well-timed placements and reserve stable space for them so forms do not cause layout shift.

### Mobile usability

- At 390 pixels, the header collapses to a logo, search control, and menu control.
- The lead story remains visually dominant, while supporting cards use a compact two-column arrangement.
- Category discovery remains image-led and tap-oriented.
- The long page is still dense; CookeTricks should adopt the clarity of the hierarchy without matching the volume of modules or adding intrusive floating controls.

### Elements useful for CookeTricks

- A strong first food image paired with one clear editorial promise.
- Search as a primary action rather than a utility hidden at the bottom of a menu.
- A dedicated, multi-facet recipe-discovery page outside the main header.
- Curated homepage rows tied to real CookeTricks pillars and populated taxonomies.
- Visible, evidence-based recipe-testing and author expertise near relevant content.
- Descriptive image text, generous tap targets, and predictable card patterns.

## Robin Miller Cooks

Pages reviewed: [homepage](https://robinmillercooks.com/), [recipe index](https://robinmillercooks.com/recipes/), [representative Lemon Garlic Pasta article](https://robinmillercooks.com/lemon-garlic-pasta/), and [about page](https://robinmillercooks.com/about/). The homepage and recipe index were also inspected at a 390 by 844 mobile viewport.

### Clean editorial style

- A limited navigation set and extensive white space create a calmer reading rhythm.
- Dark category bands provide clear contrast without making every module visually competitive.
- Teal accents and hand-drawn-feeling display details add warmth, while the content remains direct and approachable.
- The layout feels personal and editorial rather than catalogue-heavy.

### Typography and spacing

- Large section titles, roomy gaps, and clear transitions make the page easy to skim.
- A mix of expressive display type and straightforward supporting type creates personality.
- CookeTricks should preserve its existing Outfit and Cormorant Garamond identity and build an original type scale instead of imitating these typefaces or decorative treatments.

### Recipe-card presentation

- Cards prioritize food images, a compact category label, the recipe name, and ratings where available.
- Homepage grids vary in prominence while the recipe index uses more systematic groupings.
- The representative article moves from title and hero image to explanation, ingredient context, success tips, storage guidance, and a printable recipe card.

### Homepage organization

- Search and primary category shortcuts appear before the main editorial headline.
- Featured recipes lead into an author introduction and press proof.
- Latest recipes are followed by focused collections such as dinner, sides, soups, salads, sweets, and seasonal favorites.
- Cookbook and newsletter modules close the page without interrupting the initial discovery path.

### Personal-author positioning

- A prominent portrait and short first-person introduction appear near the top.
- The about page substantiates expertise through a long career, education, media work, books, and publishing experience.
- The article repeats the author card after the recipe, reinforcing responsibility for the content.
- CookeTricks should express its editorial-team model honestly rather than borrowing a single-celebrity voice.

### Newsletter sections

- A dedicated subscription destination is present in the main navigation.
- The homepage and article page use an end-of-content newsletter prompt.
- The offer is concise and does not compete with the first screen's primary recipe-discovery task.

### Mobile usability

- At 390 pixels, the desktop header becomes a compact logo row with menu and search controls.
- Search stays highly visible in the browse-recipes block.
- Six large circular category targets form a clear two-row grid.
- Recipe imagery moves into a readable two-column arrangement below the headline.
- The recipe index groups course, main ingredient, diet, and category sections in a clear vertical sequence, although the inspected page showed horizontal overflow at its bottom edge; CookeTricks should explicitly test narrow widths and avoid fixed-width children.

### Elements useful for CookeTricks

- A warmer, less crowded editorial pace.
- Search and a small set of high-value category shortcuts at the start of discovery pages.
- Clear separation between browse, latest, topic collections, author trust, and newsletter areas.
- A concise author module that links to deeper editorial-policy and testing evidence.
- Article sections that explain why a recipe works, practical success checks, and storage guidance before or around the recipe card.

## Original CookeTricks design direction

### Concept: The practical kitchen desk

CookeTricks should feel like a calm, well-organized kitchen desk: inviting food photography on top, concise tested guidance beside it, and clearly labelled routes to the next useful recipe or technique. It should combine strong discovery with generous editorial space, but the composition, components, copy, photography, tokens, and interactions must be designed from CookeTricks' own identity.

### Visual system

- Retain the existing CookeTricks brand palette and typography as the starting constraints.
- Use warm neutral surfaces for reading, one primary brand color for actions, and restrained secondary accents for taxonomy—not a different color for every category.
- Make original CookeTricks food photography the dominant decorative asset. Never use competitor imagery.
- Use one display-heading scale and one compact utility scale; avoid ornamental fonts for labels, filters, metadata, or long text.
- Keep radius, border, and shadow treatments consistent and light so food images remain the focus.

### Discovery system

- Make recipe search the clearest homepage action, with a short example prompt and accessible label.
- Present Quick Dinners first as the active growth area, then expose the other four canonical pillars.
- Keep current header taxonomy destinations; create any future visual pillar shortcuts from validated, populated routes only.
- Let the recipe index carry deep filters while the global navigation stays concise.
- Show clear active-filter state and result count on the blog index when future UI work is approved.

### Card system

- Define one original base card with a stable image ratio, descriptive alternative text, short title, content type, and only the most decision-useful facts.
- Add variants through scale, not wholly different markup: lead, standard, compact, and text-forward guide.
- Keep card metadata sparse. For recipes, prioritize time and testing state only when verified; for guides, prioritize the practical outcome.
- Reserve all media and metadata space to protect CLS.

### Trust system

- Use “CookeTricks Editorial” consistently and link it to the canonical author page.
- Surface the twice-tested standard only for recipes that have actually completed it; planned recipes with `workflowStatus: idea` remain “Needs testing” internally and must not appear as tested.
- Provide a compact “How we tested this” summary on eligible recipes, with equipment, observable checkpoints, failure cases, and revision date.
- Keep sources, safety references, corrections, AI disclosure, and affiliate disclosure legible and adjacent to the claims they support.
- Treat illustrative or AI-assisted images as non-evidence and use original food photography for production recipes.

### Performance, accessibility, and monetization constraints

- One deliberate LCP image per route; responsive `sizes`, stable intrinsic dimensions, and no eager loading of card grids.
- Server-render discovery content; client JavaScript only for interactions that need it, such as deferred search.
- Maintain visible keyboard focus, semantic headings, descriptive labels, 44-pixel-equivalent touch targets, and sufficient color contrast.
- Avoid auto-rotating carousels. Prefer horizontally scrollable rows only when they remain keyboard and screen-reader usable.
- Reserve future ad slots at natural module boundaries after meaningful content, never between a heading and its first paragraph or inside recipe instructions.
- Keep the first viewport focused on reader value; no ad or newsletter interstitial should displace the title, search, or primary food image.

## Section-by-section homepage wireframe

```text
1. Utility/header
   CookeTricks logo | existing taxonomy navigation | Search

2. Hero discovery
   Short practical promise
   Large accessible recipe-search control
   One original featured food photograph + one featured story

3. Quick Dinners now
   Section intro tied to pillar_weeknight_dinners
   One lead card + 3 standard cards
   Link to /blog?mealType=dinner

4. Browse the five canonical pillars
   Quick & Easy Weeknight Dinners
   Chicken Recipes & Cooking Guides
   Essential Cooking Techniques
   Air Fryer Recipes & Guides
   Meal Prep & Make-Ahead Cooking

5. Latest tested recipes
   Compact, consistent cards
   Testing language shown only where substantiated

6. Learn the method
   Practical guides and Kitchen Tips
   Text-forward cards with small supporting images

7. Choose by ingredient
   Chicken, Beef, Seafood, Vegetarian
   Only populated destinations receive prominent treatment

8. Editorial trust
   CookeTricks Editorial portrait/mark
   Testing-standard summary
   Links to About, Editorial Policy, and Recipe Testing Policy

9. Newsletter
   One concise benefit statement
   Minimal fields; stable reserved space

10. Footer
    Key discovery links, policies, canonical author, contact, and legal links
    Reserved future ad boundary above—not inside—the footer navigation
```

On mobile, every grid should collapse without horizontal page overflow. The hero should keep search and the featured image within the first meaningful scroll; category shortcuts may use a two-column grid, but labels must remain readable without truncating the destination meaning.

## Article-page improvement plan

### Above the fold

- Keep breadcrumbs compact and visible.
- Present content type, H1, concise outcome statement, canonical author, published/updated dates, and one original hero image.
- For tested recipes, add Jump to Recipe and a secondary Jump to Testing Notes action. Guides should not show recipe-only actions.
- Avoid overlays or ads that move the title or hero after load.

### Decision summary

- Add a compact facts row only from validated WordPress fields: total time, servings, method, and relevant diet/cuisine.
- Never invent or infer missing values.
- For untested previews, keep the current clear warning; do not expose them as production recipes.

### Editorial body

- Lead with the practical result and the reason the method works.
- Use an original “What we learned in testing” section for ratios, equipment dimensions, visual doneness cues, timing checkpoints, failure cases, and fixes.
- Preserve readable paragraph width and predictable H2/H3 hierarchy.
- Use inline original process photos only when they teach a meaningful step, with width, height, `srcset`, `sizes`, and useful alternative text.

### Recipe card and utility actions

- Keep the recipe card printable, keyboard accessible, and visually distinct from editorial prose.
- Place Pin/Save/Print actions near the recipe card rather than repeating floating controls throughout the page.
- Keep units and ingredient scaling understandable and ensure any future interactive control works without hiding the original quantities from search engines or print.

### Trust, safety, and attribution

- Keep author responsibility, tested notes, storage guidance, safety notes, sources, update date, and disclosures explicit.
- Link to the canonical author, editorial policy, and testing policy.
- Distinguish firsthand test observations from external factual or safety references.

### Continue discovery

- Follow the recipe card with 3–4 contextually related links chosen from validated ContentLink relationships or WordPress taxonomy—not generic popularity alone.
- Include the parent pillar or hub as the clearest next step.
- Use one end-of-article newsletter prompt after the reader has received the full recipe value.

### Search, Pinterest, and ads

- Retain Recipe and breadcrumb structured data, canonical URLs, and large-image preview eligibility.
- Provide original vertical-friendly food photography where editorially appropriate without forcing portrait crops into every on-page card.
- Reserve ad locations after the introduction, between complete major sections, and after the recipe card; never split ingredients from instructions or a warning from the step it qualifies.

## Adapt, design originally, and do not copy

### Patterns CookeTricks may adapt

- Prominent search and obvious recipe-index access.
- Taxonomy grouped by how readers decide: meal, ingredient, method, cuisine, occasion, and diet.
- Photography-led hierarchy with repeatable card variants.
- Curated topical rows backed by populated destinations.
- Visible author, testing, review, source, and update signals.
- A restrained end-of-value newsletter prompt.

### Elements CookeTricks must design originally

- Header, search overlay, menus, filter controls, cards, buttons, icons, badges, newsletter form, author block, testing block, and ad placeholders.
- Grid proportions, spacing scale, responsive breakpoints, motion, color assignments, and typography scale.
- All microcopy, headings, labels, calls to action, accessibility text, and editorial explanations.
- All photographs, illustrations, video, and social assets.

### Elements CookeTricks must not copy

- Either site's code, HTML structure, CSS, component implementation, exact page composition, branded phrases, decorative typography, or interaction details.
- Logos, color combinations used as trade dress, icons, photographs, video frames, thumbnails, illustrations, ratings data, testimonials, press graphics, or cookbook artwork.
- Article text, recipe titles as a systematic naming template, descriptions, ingredient quantities, instructions, testing claims, or proprietary taxonomy labels.
- Authority claims, credentials, reviews, affiliations, or audience-size statements that belong to the reference publishers.

## Recommended implementation sequence

1. Define an original CookeTricks token and component specification without changing runtime code.
2. Prototype the homepage hero, search, Quick Dinners module, pillar shortcuts, base recipe card, and trust block using current real data.
3. Validate mobile LCP, CLS, keyboard navigation, text contrast, and 320–390 pixel layouts before expanding modules.
4. Improve the article above-the-fold summary and tested-recipe trust block while preserving current schema and 404/preview behavior.
5. Add newsletter and future ad placeholders only after performance budgets and consent requirements are defined.

The safest first design implementation is a non-production prototype of the homepage hero plus the Quick Dinners and five-pillar discovery modules. It exercises the core design system with real CookeTricks priorities while leaving the existing runtime untouched until the direction is approved.
