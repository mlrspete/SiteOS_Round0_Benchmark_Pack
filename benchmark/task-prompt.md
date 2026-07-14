# Implementation task

Build the single-page Gridline Field Services vertical slice described by `PRODUCT_CONTRACT.md` in this repository.

Treat the supplied contract and `src/content.ts` as source material, not as permission to produce a generic template. The result should feel composed for this business while remaining restrained, credible and usable. Work in small, testable increments.

Required behaviours:

1. Implement a responsive header with a keyboard-usable mobile menu.
2. Implement the hero and service explorer using the supplied content and local assets.
3. Service filters must update the visible cards and the `discipline` URL query parameter. Loading a supported query value must restore the filter.
4. Selecting a service must reveal its supplied detail content in a clear detail region.
5. Implement an accessible “Request a scope review” dialog and form. It must validate the required name, email, project type and a project summary of at least 20 characters. Valid submission must show the exact supplied success message; no network request is required.
6. Design explicitly for 360, 768 and 1440 CSS-pixel widths. Preserve long copy and provide an intentional fallback for the service whose image is absent.
7. Add purposeful, restrained motion and respect `prefers-reduced-motion`.
8. Preserve the evaluator hooks listed in `PRODUCT_CONTRACT.md`.

Constraints:

- Use the existing React, TypeScript, Vite and Motion dependencies. Do not add a UI kit, CSS framework, external font, remote asset, tracking script or backend.
- Do not change the supplied copy or invent claims, statistics, certifications, testimonials, phone numbers or locations.
- Do not read or modify files outside this repository.
- Do not create screenshots that impersonate a working UI.
- Complete the implementation, run `npm run check` and `npm run build`, fix issues you find, and record concise evidence in `PROGRESS.md`.

Stop when the vertical slice is correct and polished. Do not expand it into a multi-page site.

