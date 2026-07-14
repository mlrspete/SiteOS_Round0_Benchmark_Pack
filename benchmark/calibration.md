# Evaluator calibration

The deliberately incomplete starter is the negative-control fixture.

On 13 July 2026 it:

- installed, type-checked and built successfully;
- loaded the correct content without runtime errors;
- scored 23/60 automated points;
- failed the filter, detail, dialog, form, mobile-navigation, missing-media and open-dialog accessibility gates;
- was correctly capped as ineligible.

This confirms that the evaluator accepts a healthy build but does not confuse “renders a page” with completing the vertical slice. The production build, browser launch, axe analysis and multi-viewport Playwright path all ran end-to-end.

There is intentionally no published gold implementation or target screenshot. That avoids steering models toward one aesthetic answer; visual quality is assessed against the contract by blind reviewers.

