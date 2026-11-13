# UI Components 0.3

**Status:** implemented in `main`  
**Date:** 2026-11-13

## Stylesheet

`source/design-system/components/components.css`

The stylesheet is presentation-only. It contains no product rules, persistence, network calls or framework dependencies.

## Component inventory

### Surfaces
- `.ds-card`, `.ds-card--subtle`, `.ds-card--accent`
- `.ds-glass` — floating / transient surfaces only
- `.ds-divider`

### Actions
- `.ds-button`
- Variants: `--secondary`, `--ghost`, `--large`, `--icon`
- `.ds-icon-button`

### Form controls
- `.ds-field`, `.ds-input`, `.ds-select`, `.ds-textarea`
- Native checkbox and radio inputs styled through `.ds-check` and `.ds-radio`
- `.ds-switch[role="switch"][aria-checked]`
- `.ds-segmented` with child buttons exposing `aria-pressed`

Use native HTML form controls wherever possible. Labels must be programmatically associated with their controls. Do not use placeholder text as the only label.

### Feedback
- `.ds-badge` with accent, success, warning and danger variants
- `.ds-alert` with status variants; choose `role="status"` for non-urgent updates and `role="alert"` only for urgent messages.

### Navigation and menus
- `.ds-nav` and `.ds-nav__item[aria-current="page"]`
- `.ds-menu` uses native `<details>` / `<summary>`; menu actions should be real buttons or links.

### Modal
- `.ds-dialog` styles the native HTML `<dialog>` element.
- Open with `showModal()`; close with a form using `method="dialog"` or the dialog's `close()` method.
- Native modal behavior supplies focus containment and Escape handling in supported browsers. Verify focus returns to the trigger after closing in the target browser.

## Accessibility contract

- Every control needs a visible or programmatic name.
- Use native button, input, select, textarea, details and dialog semantics.
- Preserve visible keyboard focus.
- Keep disabled controls truly disabled where possible; `aria-disabled` alone does not suppress interaction.
- Do not communicate status by color alone.
- Test keyboard-only operation, VoiceOver on iOS and reduced-motion preferences.
- Check text and component contrast in both Light and Dark themes.

## Responsive and material rules

- Controls should fit a 320px viewport without horizontal page overflow.
- Dialog becomes a bottom sheet on narrow screens.
- Glass is limited to menus, floating navigation and transient surfaces. Content cards remain opaque.
- Provide non-blurred surfaces when reduced transparency is requested or backdrop filtering is unavailable.

## Preview

The isolated preview at `tests/design-system/index.html` demonstrates both themes, buttons, cards, fields, select, textarea, checkbox, radio, segmented control, switch, badges, alerts, details menu and native dialog.

## Validation status

The preview markup and stylesheet references were checked in the repository after commit. This is not a substitute for browser rendering, VoiceOver, keyboard and contrast testing on actual iOS Safari and desktop browsers. Do not claim full WCAG conformance until those checks are completed.
