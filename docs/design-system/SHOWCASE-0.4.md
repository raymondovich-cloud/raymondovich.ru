# Design System Showcase 0.4

**Status:** implemented in `main`  
**Entry point:** `tests/design-system/showcase.html`

## Purpose

A single visual catalogue for reviewing the current shared design tokens, foundations and presentation components before product integration. The showcase is a test surface only; it does not represent a production application screen.

## Files

- `tests/design-system/showcase.html` — semantic page structure and component examples.
- `tests/design-system/showcase.css` — page-specific responsive layout and swatch presentation.
- `tests/design-system/showcase.js` — local theme switch and demo interactions.
- Shared styles are loaded from `source/design-system/`; they are not copied into the showcase.

## Sections

1. Overview and theme control.
2. Brand and semantic colors.
3. Typography hierarchy.
4. Primary, secondary, accent and glass surfaces.
5. Button variants and states.
6. Text fields, select, textarea, checkbox, radio, switch and segmented control.
7. Badges and alerts.
8. Floating navigation.
9. Native details menu and dialog.
10. Motion and reduced-motion behavior.

## Behavior

- Theme switch changes only the showcase document's `data-theme` attribute.
- Segmented control and switch examples update their ARIA state locally.
- Menu uses native `details` and `summary`.
- Modal uses native `dialog.showModal()` and `method="dialog"`.
- Motion replay re-triggers the entrance animation; browser preferences for reduced motion remain respected by the shared CSS.

No project data is submitted or persisted. No Supabase or external service is called.

## Design and accessibility notes

- Page-specific styles are kept in a separate CSS file.
- Interaction logic is kept in a separate JavaScript file; no CSS-in-JS is used.
- Native HTML elements are preferred for keyboard and assistive-technology semantics.
- The showcase is responsive and includes a compact horizontal section navigation on narrower screens.
- A rendered browser review, VoiceOver test, keyboard audit and color-contrast audit still need to be completed on target devices. This document does not claim WCAG conformance.

## Non-goals

- No production routes or product modules are changed.
- No user settings, data or authentication are involved.
- The owner has approved the visual direction represented by this showcase as the Raymondovich Design System 1.0 baseline. The showcase is the reference surface for the approved visual language; product implementations must consume the shared design-system files rather than copy showcase-specific styles.
