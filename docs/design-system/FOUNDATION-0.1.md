# Raymondovich Design System — Foundation 0.1

**Status:** implemented in `main`  
**Date:** 2026-11-13  
**Scope:** web foundation; no product screens or business workflows changed.

## 1. Product direction

The visual language combines:
- Apple's iOS 26 interface principles: layered surfaces, material depth, contextual translucency, clear hierarchy and direct manipulation.
- Telegram's interaction character: short, calm transitions, responsive feedback and restrained motion.
- Raymondovich brand identity: black, white and orange.

This is an original implementation inspired by those principles, not a pixel-for-pixel copy of iOS or Telegram.

## 2. Theme model

Dark and Light are two first-class themes. They must have equal component coverage, contrast review and interaction-state coverage. Neither theme is a fallback-quality version.

Set the theme on the document root:

```html
<html lang="ru" data-theme="dark">
```

Allowed values:
- `dark`
- `light`

The application layer owns persistence and theme selection. CSS only maps semantic tokens; it does not read storage or contain business state. Theme changes should update the root attribute without reloading the page.

## 3. Token architecture

The dependency direction is:

1. **Primitive tokens** — raw brand, neutral and status ramps; spacing, type scale, geometry and motion values.
2. **Semantic theme tokens** — background, text, border, surface, accent, state and elevation roles mapped independently for Light and Dark.
3. **Component tokens / styles** — components consume semantic tokens and must not hardcode theme-specific colors.
4. **Product patterns** — page and workflow composition. Patterns may compose components but must not redefine the foundations.

Files in this revision:
- `source/design-system/tokens/tokens.css`
- `source/design-system/themes/themes.css`
- `source/design-system/foundations/foundations.css`
- `source/design-system/components/components.css`

No CSS-in-JS. No runtime styling dependency. No new JavaScript package.

## 4. Brand and color rules

- Orange is an action and emphasis color, not a general-purpose background.
- Black and white define the brand contrast; semantic neutral ramps preserve readability.
- Status colors are reserved for status communication and are not brand accents.
- Do not use color alone to communicate success, error, selection or disabled state.
- Text, controls and focus indicators must remain distinguishable in both themes.

The visual direction and current orange semantic values are approved by the owner as the Raymondovich Design System 1.0 baseline. Changes to brand palette, semantic color mapping, typography, spacing, geometry, materials or motion require an explicit owner decision and a documented versioned change. Technical corrections that do not alter the approved visual result may proceed without changing the baseline.

## 5. Materials and depth

Glass is reserved for transient or floating UI: navigation, compact toolbars, popovers and overlays. Primary content surfaces remain opaque or nearly opaque for legibility.

A glass surface requires:
- a readable fallback when backdrop filtering is unavailable;
- a visible edge and sufficient foreground contrast;
- reduced-transparency support;
- no use as the default treatment for every card or content block.

## 6. Typography and layout

- Use the native system font stack; do not redistribute proprietary SF font files.
- Use a consistent 4px spacing base.
- Use a restrained type scale with tight display headings and comfortable body line-height.
- Respect iOS safe-area insets in mobile layouts.
- Do not set fixed content widths that prevent narrow-screen use.

## 7. Motion specification

| Interaction | Target duration |
|---|---:|
| Press feedback | 100–150 ms |
| Hover/focus feedback | 150 ms |
| Small state transition | 150–240 ms |
| Panel / sheet transition | 240–360 ms |
| Emphasis / spring-like settle | up to 360 ms |

Use transform and opacity for movement where possible. Avoid animating layout-heavy properties. Motion must clarify state changes, never delay access to content. Honor `prefers-reduced-motion`.

## 8. Component contract

Components in this layer are presentation-only:
- no Supabase, network, persistence or authentication access;
- no business rules;
- no product-specific data assumptions;
- semantic state is exposed through attributes such as `aria-pressed`, `aria-checked` and `aria-current`;
- keyboard focus remains visible.

The first primitive set includes cards, buttons, fields, segmented controls, switches, dividers and floating navigation.

## 9. Validation required before adoption

- Verify both themes at 320px, 390px, 768px and desktop widths.
- Check text and control contrast for both themes.
- Check keyboard navigation and visible focus.
- Check reduced motion and reduced transparency.
- Check Safari on iOS, including safe areas and backdrop-filter fallback.
- Confirm existing public and authenticated screens are not visually regressed before integration.

## 10. Explicit non-goals of 0.1

- No redesign of existing product pages.
- No changes to authentication, permissions, data models or backend.
- No migration of existing page styles in this revision.
- No native SwiftUI implementation yet; future iOS components will map to the same semantic token contract rather than reuse web CSS.
