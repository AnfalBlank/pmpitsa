---
name: ui-ux-review
description: Audit UI/UX implementation for design consistency, accessibility, and adherence to established patterns. Use when reviewing existing UI code for consistency/accessibility gaps, not when designing new UI from scratch.
version: 1.0.0
---

# UI/UX Review Skill

Manually audit the user interface for design consistency, component quality, responsive design, and accessibility compliance.

## When to Use (and When NOT to)

| Use this skill for | Use a simpler approach for |
|---|---|
| Auditing existing UI code for design-system drift and a11y gaps | Building new UI from scratch — use `design-taste-frontend` or `frontend-design` for aesthetic direction instead |
| A full multi-area sweep (components/styles/responsive/a11y) | Checking one component's accessibility quickly — read the checklist at the end of this file inline, no full report needed |
| Producing a findings report for the team to act on | Fixing one already-known bug — just fix it, no audit needed |
| A pre-launch or pre-merge design-consistency check | Comparing against a live Figma design |
| Reviewing React, Vue, Blade, or Next.js UI code | Reviewing copy/content quality only |

## Review Checklist

### Design System
- [ ] Colors defined and consistently used (no rainbow palette, strict corporate 2-3 primary colors + 1 accent)
- [ ] Typography scale established
- [ ] Spacing system documented
- [ ] Component variants cataloged
- [ ] Header and navigation bar visually aligned and matching

### Component Quality
- [ ] Buttons have all states (default, hover, focus, active, disabled)
- [ ] Forms have consistent styling
- [ ] Cards use uniform structure and padding
- [ ] Navigation shows active states cleanly

### Responsive Design
- [ ] Mobile breakpoints defined and used
- [ ] Touch targets meet 44x44px minimum (48px for mobile bottom nav)
- [ ] Typography scales for small screens
- [ ] Navigation adapts to mobile with zero overlap

### Accessibility
- [ ] Semantic HTML used throughout
- [ ] ARIA labels on icon buttons
- [ ] Keyboard navigation supported
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA (4.5:1)

