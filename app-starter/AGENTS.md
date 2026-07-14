# Gridline implementation rules

- Build only the vertical slice in `PRODUCT_CONTRACT.md`; do not add routes, claims, content or backend work.
- Keep `src/content.ts` as the content source of truth. Preserve every required `data-testid` hook.
- Use semantic HTML and native controls first. Keyboard, focus, reduced motion and small screens are acceptance criteria.
- Use the existing dependencies. Do not add packages, remote fonts, remote images, UI kits or CSS frameworks.
- Work in small increments. Run `npm run check` and `npm run build`; record only truthful outcomes in `PROGRESS.md`.
- Never read or modify anything outside this repository.

