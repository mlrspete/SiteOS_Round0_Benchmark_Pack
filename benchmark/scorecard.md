# Blind review scorecard

Candidate code: ______  Reviewer code: ______  Date: ______

Review only the supplied 360, 768 and 1440 screenshots, the interaction video and the anonymized diff. Do not infer or seek the model identity.

## Visual craft and intentionality — 20

- Hierarchy and composition (0–5): the eye is guided; density and whitespace feel deliberate.
- Business specificity (0–5): the result belongs to Gridline rather than a generic SaaS template.
- Typography and detail (0–4): scale, rhythm, line length, controls and micro-details are coherent.
- Responsive judgement (0–4): layouts are recomposed rather than merely shrunk.
- Motion appropriateness (0–2): use the interaction video; motion supports orientation and does not distract.

Visual score: ____ / 20

## Code quality — 10

- Clear component and state boundaries (0–3)
- Readability and maintainability (0–3)
- Robust interaction, cleanup and edge-case handling (0–2)
- Avoids needless dependencies, abstractions and duplication (0–2)

Code score: ____ / 10

## Scoring anchors

- 0: absent, broken or contradicts the contract.
- Half points: competent but generic, inconsistent or incomplete.
- Full points: deliberate, coherent and unusually strong for a first autonomous pass.

Submit totals with `npm run review:record`. Two reviews are required. A third is required when visual totals differ by more than 4 points or code totals differ by more than 3.

## Notes

Strengths:

Risks or defects:

Review confidence (low / medium / high):

