# Motion Primitives 0.2

**Status:** implemented in `main`  
**Date:** 2026-11-13

## Purpose

Provide a small shared motion vocabulary for interface transitions. The layer is CSS-only and presentation-only: callers own state and toggle the documented data attributes or classes.

## Stylesheet

`source/design-system/foundations/motion.css`

Load it after `foundations.css` and before component or product styles that consume the primitives.

## Available primitives

| Class / state | Behavior |
|---|---|
| `.ds-motion-enter` | Enters with opacity, slight upward translation and subtle scale. |
| `.ds-motion-enter--subtle` | Shorter, smaller entrance. |
| `.ds-motion-press` | Press feedback; intended for interactive controls. |
| `.ds-motion-expand[data-open="true"]` | Expands a grid wrapper from zero to one row. |
| `.ds-motion-expand__inner` | Inner wrapper; required to clip the expanding content. |
| `.ds-motion-fade[data-hidden="true"]` | Fades content and disables pointer interaction. |

## Usage

```html
<section class="ds-motion-enter">...</section>

<div class="ds-motion-expand" data-open="true">
  <div class="ds-motion-expand__inner">
    ...
  </div>
</div>
```

For press feedback, apply `.ds-motion-press` to a button or another actual interactive element. Do not use it on non-interactive containers.

## Rules

- Prefer transform and opacity; do not animate dimensions or positional layout properties unless the component requires it.
- Motion should communicate state, not delay task completion.
- Respect `prefers-reduced-motion`; the stylesheet disables its own entrance and transition effects for that preference.
- Keep durations within the shared motion tokens in `tokens.css`.
- Do not add JavaScript animation libraries for these basic transitions.
- Avoid stacking multiple entrance animations on the same element.

## Validation

The stylesheet is loaded by `tests/design-system/index.html`. Check it in Safari on iOS and desktop browsers, with normal and reduced-motion settings. This layer does not yet claim a complete motion audit across every product screen.
