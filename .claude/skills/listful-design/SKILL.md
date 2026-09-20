---
name: listful-design
description: "Use when writing or changing any UI in the Listful Angular app: adding a screen or component, editing a template, picking colors, fonts, spacing, radius, or focus styles, or reaching for a Tailwind class. Defines the design tokens in app/src/styles.css and the rules for using them."
---

# Listful design scheme

Warm and friendly: terracotta on cream, flat surfaces, system fonts. Light mode only.

All ten colors are Tailwind v4 theme tokens in `app/src/styles.css`, so each is a normal utility
(`bg-ground`, `text-ink`, `border-line`, `bg-accent`). There is no color anywhere else.

| Token | Value | Use |
|---|---|---|
| `ground` | `#FDF6EE` | the page |
| `surface` | `#FFFDFB` | cards, lists, inputs |
| `line` | `#E7DED3` | borders, dividers |
| `ink` | `#292524` | body text, headings |
| `muted` | `#78716C` | secondary text, placeholders |
| `accent` | `#C2410C` | the one primary action |
| `accent-hover` | `#9A3412` | its hover |
| `accent-soft` | `#FDEEE4` | ghost/text button hover |
| `danger` | `#BE123C` | destructive actions, errors |
| `danger-soft` | `#FFF1F2` | alert backgrounds |

Contrast is AA: white on `accent` 4.9:1, `muted` on `ground` 4.7:1, `danger` on `ground` 6.5:1.
Changing any of these five values means re-checking the ratio.

## The seven rules

1. **Color comes only from tokens.** Never `bg-blue-700`, `text-gray-900`, `border-gray-400`, or any
   other stock Tailwind palette class. If a token doesn't cover it, add a token — don't reach past
   the theme.
2. **One accent, one primary action per screen.** `bg-accent` is for Sign in, Add — the single thing
   the screen is for. Everything else is a text button or a bordered button.
3. **Flat.** The page is `ground`; anything raised is `bg-surface` + `border border-line`. No shadows.
4. **One radius:** `rounded-lg`. Inputs, buttons, cards, alerts. No exceptions.
5. **Four type steps**, system font stack, nothing else:
   `text-2xl font-bold` page title · `text-lg font-semibold` section · `text-base` body ·
   `text-sm font-medium` labels and `text-sm text-muted` meta.
6. **Focus is global.** `styles.css` gives every focusable element an `accent` outline via
   `:focus-visible`. Never add `focus:outline-*` classes to a component. Primary controls are 44px
   tall (`py-2.5` at `text-base`); nothing interactive goes below 36px.
7. **Spacing on Tailwind's 4px scale:** `gap-3` within a group, `mt-6`/`mt-8` between sections,
   `px-4 py-8` page padding.

## Component patterns

Copy these rather than inventing variants.

```html
<!-- primary button (one per screen) -->
<button class="rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover disabled:opacity-60">

<!-- secondary button -->
<button class="rounded-lg border border-line bg-surface px-4 py-2.5 font-medium text-ink hover:bg-accent-soft disabled:opacity-60">

<!-- text button / destructive text button -->
<button class="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-accent-soft">
<button class="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft">

<!-- label + input + field error -->
<label class="block text-sm font-medium text-ink">
<input class="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-muted">
<p class="mt-1 text-sm text-danger">

<!-- alert -->
<p role="alert" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">

<!-- list card -->
<ul class="divide-y divide-line rounded-lg border border-line bg-surface">
```

## Common mistakes

- Reaching for `gray-*` / `blue-*` / `red-*` out of habit. That is what this scheme replaces — the
  app looked like unstyled Tailwind because every component picked its own defaults.
- Adding `focus:outline-2 focus:outline-blue-700` per element. Rule 6: it's global now.
- Making a second button `bg-accent` because it feels important. Rule 2 — demote it.
- Adding `shadow-sm` to lift a card. Rule 3 — the `line` border does that job.
- Introducing a hover color inline (`hover:bg-orange-50`). Use `accent-soft` / `danger-soft`.

## Adding dark mode later

Every color already goes through a token, so dark mode is one `@media (prefers-color-scheme: dark)`
block in `styles.css` redefining the ten values — no component changes. It is deliberately not
implemented yet.
