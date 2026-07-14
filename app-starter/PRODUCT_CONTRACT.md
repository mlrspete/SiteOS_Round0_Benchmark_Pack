# Gridline Field Services — product and creative contract

## Outcome

Create one polished, credible landing-page vertical slice that helps a Victorian industrial site manager understand Gridline's service coverage, inspect a relevant service and request a scope review. This is not a full site.

Primary user: a time-poor operations, maintenance or project manager with a live reliability problem.

Primary action: **Request a scope review**.

## Content and voice

All public copy and service data are supplied in `src/content.ts`. Keep the wording exact. The voice is technically capable, calm and direct: no hype, fear, fake urgency or unsupported claims.

## Visual direction

“Field notebook meets control cabinet.” Use an editorial industrial composition, warm off-white, ink/steel tones and one high-visibility citron accent used sparingly. Fine schematic rules, labels or coordinates are welcome when functional. Photography should feel like evidence, not wallpaper.

Avoid generic SaaS gradients, glassmorphism, glowing blobs, card soup, fake dashboards, excessive rounded pills and decorative circuit traces that do not resolve cleanly. The experience should feel designed for Gridline rather than assembled from a template.

Typography must use a system stack because external fonts are prohibited. Choose hierarchy, widths and spacing deliberately.

## Required page structure

1. Responsive header: Gridline wordmark, in-page links to Services and Approach, primary action, mobile menu.
2. Hero: supplied eyebrow, heading, supporting copy, two calls to action and an intentional composition using supplied local imagery or graphic language.
3. Service explorer: introduction, four filters, result count, six service records, and a selected-service detail region.
4. Approach strip: the three supplied operating principles.
5. Compact closing action and footer details supplied in content.
6. Scope-review dialog and form.

## Interaction contract

- Filters: `All`, `Electrical`, `Controls`, `Reliability`. The active discipline must be represented by `?discipline=all|electrical|controls|reliability`. An absent/unsupported value resolves to `all`. Browser back/forward must restore the visible filter.
- Service selection: choosing a service reveals its description, deliverables and response note in a clearly labelled detail region. It must be operable with a keyboard.
- Dialog: the header/hero/closing primary actions open one accessible modal titled `Request a scope review`. Escape closes it, focus starts inside it, keyboard focus cannot fall behind it, and focus returns to the opener.
- Form fields use the visible labels `Name`, `Work email`, `Project type` and `Project summary`. All are required; email must be valid; summary must contain at least 20 non-whitespace characters. Invalid submission displays understandable field-linked errors. The submit control is labelled `Submit request`. Valid submission makes no network request and shows exactly: `Thanks — a scope engineer will reply within one business day.`
- Motion: include a restrained entrance/orientation treatment and meaningful state transitions. With reduced motion requested, non-essential animation must effectively disappear.

## Resilience fixtures

- `switchboard-modernisation` deliberately has a long title; do not truncate it.
- `power-quality` deliberately has no image; show a designed fallback with meaningful text, not a broken or empty media region.
- Layout must work without horizontal page overflow at 360, 768 and 1440 CSS pixels.

## Stable evaluator hooks

These are part of the interface contract. Preserve the exact values:

- mobile menu button: `data-testid="mobile-menu-toggle"`
- mobile navigation region: `data-testid="mobile-menu"`
- primary dialog openers: `data-testid="scope-review-open"` (more than one is allowed)
- dialog: `data-testid="scope-review-dialog"`
- form: `data-testid="scope-review-form"`
- form errors: `data-testid="error-name|error-email|error-projectType|error-summary"`
- success state: `data-testid="scope-review-success"`
- filter buttons: `data-testid="filter-all|filter-electrical|filter-controls|filter-reliability"`
- result count: `data-testid="service-count"`
- service items: `data-testid="service-card-<service id>"`
- selected detail: `data-testid="service-detail"`
- missing-image fallback: `data-testid="media-fallback"`
