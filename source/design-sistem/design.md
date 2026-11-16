# Raymondovich Design System

**Version:** 1.0.0  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose

This directory owns the complete visual language and presentation layer of Raymondovich.

All design tokens, themes, typography, layout primitives, reusable UI components, responsive rules, visual states, and presentation animations must be implemented under `source/design-sistem/`.

## 2. Visual direction

The interface takes interaction and usability cues from the Telegram mobile client:

- Clear, compact information hierarchy.
- Familiar, predictable navigation patterns.
- Carefully balanced density and whitespace.
- Smooth transitions and immediate interaction feedback.
- Consistent behavior across screens and components.

Raymondovich must retain a distinct visual identity and must not copy Telegram branding or reproduce its interface literally.

### Brand palette

The core brand colors are:

- Black — structural contrast, dark surfaces, and strong visual emphasis.
- Orange — primary brand accent and selected/high-priority actions.
- White — contrast, light surfaces, and clear content presentation.

Use semantic color tokens throughout the interface. Exact palette values, tonal scales, and gradient recipes must be established centrally in the design tokens rather than scattered across components.

### Gradients

Create a recognizable Raymondovich gradient language based on the brand palette.

Gradients may be used for selected emphasis, branded surfaces, highlights, and subtle depth. They must remain restrained and must not reduce text contrast or compete with primary content.

## 3. Themes

Light and dark themes are both first-class design modes.

- Design both themes deliberately; dark mode must not be a simple inversion of light mode.
- Preserve readable contrast, clear boundaries, and consistent semantic meaning.
- Use the same brand identity across both themes.
- Verify cards, menus, overlays, forms, navigation, and interactive states in both themes.

## 4. Motion and interaction

Motion should feel smooth, responsive, and consistent with the quality of a modern mobile client.

- Use transitions to explain navigation, hierarchy, and state changes.
- Prefer short, natural easing and restrained movement.
- Provide immediate pressed, selected, focused, loading, and disabled feedback.
- Avoid animation that delays user actions or distracts from content.
- Respect `prefers-reduced-motion`.
- Do not animate every element merely for decoration.

## 5. Supported presentation environments

Every interface must be designed and developed in parallel for all three environments:

1. Desktop Web.
2. Mobile Web.
3. Telegram Mini App.

These are presentation environments of one product, not separate websites.

- Share one visual language, component system, and application behavior.
- Adapt composition and navigation to the available screen space.
- Desktop may use wider workspaces, side navigation, and multi-column layouts.
- Mobile may use compact navigation, vertically composed content, and touch-first controls.
- Telegram Mini App must account for host viewport constraints, safe areas, and Telegram-specific integration boundaries.
- Do not merely scale desktop layouts down to mobile dimensions.

A screen is not considered visually complete until its Desktop, Mobile, and Telegram Mini App presentations have been reviewed.

## 6. Responsive design

Use content-driven responsive layouts rather than designing for only a few fixed device sizes.

At minimum, review layouts around these viewport widths:

- 320–375 px — compact mobile.
- 390–430 px — standard mobile.
- 768–1024 px — tablet and compact workspace.
- 1280 px — laptop.
- 1440–1920 px — desktop displays.

Prevent horizontal overflow, preserve readable line lengths, and keep touch targets usable.

## 7. Accessibility and quality

- Use semantic HTML and accessible control names.
- Support keyboard navigation and visible focus on Desktop.
- Maintain sufficient contrast in both themes.
- Do not communicate state through color alone.
- Respect reduced-motion preferences.
- Account for mobile safe areas and browser viewport behavior.
- Check loading, empty, error, success, selected, disabled, and focused states where applicable.

## 8. Architecture boundaries

- All CSS must live inside this directory.
- Do not use inline `<style>` blocks, HTML `style` attributes, `element.style`, or CSS strings in JavaScript.
- Colors must use semantic design tokens.
- Visual components must not contain domain business rules or application workflows.
- Do not import domain implementations or call domain services directly.
- Emit explicit UI events for application actions; application modules own workflow execution.
- Use vanilla JavaScript and native browser capabilities. Do not add frameworks, bundlers, external fonts, or dependencies without approval.

## 9. Design and implementation sequence

For each screen:

1. Establish information hierarchy and composition.
2. Define Desktop, Mobile, and Telegram Mini App layouts together.
3. Identify reusable components and required visual states.
4. Apply light and dark themes.
5. Define purposeful transitions and interaction feedback.
6. Implement within the design system.
7. Review responsive behavior, accessibility, and both themes.

Do not mark a screen complete while one of the supported presentation environments remains unreviewed.
