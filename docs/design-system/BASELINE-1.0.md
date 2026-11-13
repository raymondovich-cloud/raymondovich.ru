# Raymondovich Design System — Approved Baseline 1.0

**Status:** approved by project owner  
**Approval date:** 2026-11-13  
**Reference showcase:** `tests/design-system/showcase.html`

## Decision

The owner has approved the current Raymondovich visual direction and the implementation demonstrated by Design System Showcase 0.4. This is the visual baseline for future Raymondovich.ru interface work.

## What is fixed

- Brand palette: black, white and orange, including the current semantic mappings.
- Light and Dark themes as equal first-class themes.
- Typography hierarchy and system font stack.
- Spacing scale, radii, control dimensions and general layout rhythm.
- Surface hierarchy: opaque working surfaces and restrained Liquid Glass for navigation, floating and transient UI.
- Component appearance, variants and interaction states represented in the shared component stylesheet and showcase.
- Motion character, timing scale and reduced-motion behavior.
- Responsive visual direction across mobile, tablet and desktop.

## Change control

1. Do not independently redesign, restyle, replace, or reinterpret approved tokens, components, themes, or materials during product implementation.
2. Product screens must compose the shared design-system primitives. Do not fork component CSS or create local visual variants that conflict with the baseline.
3. A visual change requires an explicit owner request or approval before implementation.
4. Approved visual changes must be documented, reflected in the shared source files and showcase, and assigned a new design-system version.
5. Technical fixes, browser compatibility adjustments and accessibility corrections may be made when they preserve the approved visual result. If a correction changes the visual result, treat it as a design change and obtain approval.
6. Do not claim WCAG conformance or completed device validation until the relevant tests have actually been performed and recorded.

## Implementation source of truth

- Tokens: `source/design-system/tokens/tokens.css`
- Themes: `source/design-system/themes/themes.css`
- Foundations: `source/design-system/foundations/foundations.css`
- Motion: `source/design-system/foundations/motion.css`
- Components: `source/design-system/components/components.css`
- Visual reference: `tests/design-system/showcase.html`

The showcase is a reference and test surface, not a source of production CSS. Product interfaces must import the shared design-system files.

## Validation status

Owner approval confirms the chosen visual direction. It does not certify every component for production or replace the outstanding iOS Safari rendering, VoiceOver, keyboard, reduced-transparency and contrast checks. Those checks remain required before claiming accessibility or cross-browser conformance.

## Scope boundary

This approval fixes the design language. It does not authorize changes to the public landing page, product modules, authentication, permissions, database schema or backend behavior.
