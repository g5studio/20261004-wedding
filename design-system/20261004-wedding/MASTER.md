# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** 20261004 Wedding  
**Generated:** 2026-07-25  
**Category:** Wedding / Immersive Invitation  
**Design Dials:** Variance 4/10 | Motion 8/10 | Density 3/10 (Spacious)

Source of truth files:

- `docs/brand-guidelines.md`
- `assets/design-tokens.json`
- `assets/design-tokens.css`

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#2A4A3A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#B8926A` | `--color-secondary` |
| Accent/CTA | `#8A6840` | `--color-accent` |
| Background | `#F7F9F7` | `--color-background` |
| Foreground | `#1A2A22` | `--color-foreground` |
| Muted | `#EEF3EF` | `--color-muted` |
| Border | `#C5D2C9` | `--color-border` |
| Progress | `#0B100E` | `--color-progress` |

**Color Notes:** Botanical ink + warm gold. Avoid pink/purple AI-default wedding palettes.

### Typography

- **Script:** Great Vibes（拉丁裝飾）
- **Heading:** Noto Serif TC
- **Body:** Noto Sans TC

```css
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;600;700&display=swap');
```

### Spacing (Density 3 — Spacious)

| Token | Value |
|-------|-------|
| `--space-xs` / `--primitive-spacing-1` | `0.25rem` |
| `--space-sm` / `--primitive-spacing-2` | `0.5rem` |
| `--space-md` / `--primitive-spacing-6` | `1.5rem` |
| `--space-lg` / `--primitive-spacing-8` | `2rem` |
| `--space-xl` / `--primitive-spacing-12` | `3rem` |
| `--space-2xl` / `--primitive-spacing-16` | `4rem` |
| `--space-3xl` / `--primitive-spacing-24` | `6rem` |

---

## Style Guidelines

**Style:** Parallax Storytelling  
**Pattern:** Horizontal Scroll Journey

### Section Order

1. Intro (Vertical)
2. The Journey (Horizontal track on desktop; stacked on mobile)
3. Detail Reveal
4. Vertical Footer

### Key Effects

- scroll-driven transforms
- sticky progress
- max 1 pinned scrub section
- `prefers-reduced-motion` respected

---

## Anti-Patterns

- ❌ Generic pink wedding templates
- ❌ Cards in hero
- ❌ Emojis as icons
- ❌ Hardcoded hex in components (use tokens)
- ❌ More than 1–2 pinned sections
- ❌ Missing focus / hover transitions (150–300ms)

---

## Pre-Delivery Checklist

- [ ] Tokens only — no raw hex in components
- [ ] `cursor-pointer` on clickables
- [ ] Contrast ≥ 4.5:1
- [ ] Responsive: 375 / 768 / 1024 / 1440
- [ ] Reduced motion supported
- [ ] No horizontal overflow on mobile
