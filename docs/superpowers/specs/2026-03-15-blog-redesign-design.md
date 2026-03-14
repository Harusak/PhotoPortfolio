# Blog Section Redesign — Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Scope:** `index.html` — blog section only

---

## Background

The blog section was recently redesigned with a complex layered card system (shadow / base / edge / shine layers), SVG clip-path filters, `preserve-3d` 3D transforms, and random card sizing. This combination causes rendering bugs (broken glassmorphism, clip-path failures, 3D/backdrop-filter conflicts). The goal is to rebuild the blog UI as a simpler, stable foundation while preserving the core UX (horizontal scroll, card layout, glassmorphism aesthetic).

---

## Requirements

- Maintain horizontal scroll with snap points
- Maintain card-based layout
- Flat single-element cards (no multi-layer structure)
- Glassmorphism via `backdrop-filter: blur()` only — no `preserve-3d`
- Photo background retained, with a lighter overlay (~0.2 opacity)
- Card content: title, date, description, Read More link
- Uniform card size (no random sizing)
- Light/dark mode support
- Minimal JavaScript — remove all blog-specific JS except `addHorizontalScroll`

---

## HTML Structure

Replace the current nested multi-layer card structure with a single `<article>` element per post:

```html
<section class="blog" id="blog" style="display: none;">
  <div class="blog-background"></div>
  {% for post in site.posts %}
    <article class="blog-card">
      <time class="blog-card-date">{{ post.date | date: "%Y.%m.%d" }}</time>
      <h2 class="blog-card-title">{{ post.title }}</h2>
      <p class="blog-card-desc">{{ post.description }}</p>
      <a href="{{ post.url | relative_url }}" class="blog-card-link">Read More →</a>
    </article>
  {% endfor %}
</section>
```

**Removed elements:** `.card-layers`, `.card-layer` (shadow/base/edge), `.card-grain`, `.card-shine`

**Empty post list:** If `site.posts` is empty, `<section class="blog">` renders with only the background div and no cards. No placeholder message is required — this is out of scope.

**Interactivity note:** The card (`<article>`) is not itself a link. Only the inner `.blog-card-link` anchor handles navigation. The card does not need `cursor: pointer` or `text-decoration: none`. Hover styling on the card is purely visual.

---

## CSS Design

### `.blog` (container)
No changes — retains existing horizontal scroll, snap, padding, gap. `addHorizontalScroll` is called with `sections['blog']` (the `<section class="blog">` element), which is unchanged. `.blog-card` elements are direct children of this container, so the scroll function targets the correct element.

### `.blog-background`
Retain Flickr background image. `::before` holds the color gradient animation (unchanged). `::after` holds the dark overlay — lighten it from `rgba(0,0,0,0.35)` to `rgba(0,0,0,0.2)` and remove the `filter: url(#card-grain)` reference. Also update `body.dark .blog-background::after` from `rgba(0,0,0,0.55)` to `rgba(0,0,0,0.35)`.

### `.blog-card`

```css
.blog-card {
  flex: 0 0 340px;
  height: fit-content;
  min-height: 280px;
  scroll-snap-align: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.blog-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
}

body.dark .blog-card {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.15);
}
```

**Dark mode note:** All card internals (date, title, desc, link) inherit `color: white` from `.blog-card`. No additional `body.dark` rules are needed for child elements — the inherited white text is intentional and readable against both light and dark card backgrounds.

### Card internals

```css
.blog-card-date {
  font-size: 0.8rem;
  opacity: 0.7;
  letter-spacing: 0.05em;
}

.blog-card-title {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
}

.blog-card-desc {
  font-size: 0.95rem;
  line-height: 1.6;
  opacity: 0.9;
  flex-grow: 1;
  margin: 0;
}

.blog-card-link {
  display: inline-block;
  margin-top: 0.5rem;
  color: white;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  opacity: 0.85;
  transition: opacity 0.2s ease;
}

.blog-card-link:hover {
  opacity: 1;
}
```

### Mobile (≤768px)

```css
@media (max-width: 768px) {
  .blog-card {
    flex: 0 0 80vw;
    padding: 1.5rem;
    min-height: 240px;
  }
}
```

All other card properties (`gap`, `border-radius`, `backdrop-filter`, etc.) are intentionally unchanged on mobile.

### CSS to remove

- `.blog .card` and all size variants (`.size-small`, `.size-large`)
- `.blog .card-layers`
- `.blog .card-layer.*` (layer-shadow, layer-base, layer-edge)
- `.blog .card-grain`
- `.blog .card-shine`
- `.blog .card-content` and children
- `.blog .card-link`
- `@keyframes cardExpand`
- `@keyframes shadowExpand`
- `@keyframes edgeFlow`

---

## JavaScript Changes

### Remove
- `getWeightedRandomSize()` function and related constants (`sizeClasses`, `sizeWeights`)
- Random size assignment loop (`blogCards.forEach` for size assignment)
- Shine mouse-tracking loop (`blogCards.forEach` for mousemove)
- Card click morphing animation loop (`blogCards.forEach` for transitioning class)
- `const blogCards = document.querySelectorAll('.blog .card')` — no longer needed

### Retain
- `addHorizontalScroll(sections['blog'])` — called with `sections['blog']` unchanged, targeting the same `<section class="blog">` element

Navigation on card click is handled directly by the `<a href>` on `.blog-card-link`, requiring no JS intervention.

---

## What Is NOT Changing

- `.blog` container layout (flex, overflow-x, snap, padding, gap)
- `.blog-background` image URL
- Dark/light mode toggle mechanism
- Blog post Liquid template loop (`{% for post in site.posts %}`)
- Post URL generation (`{{ post.url | relative_url }}`)
- `addHorizontalScroll` function

---

## Success Criteria

- Blog cards render without visual bugs in Chrome, Safari, and Firefox (no invisible cards, no clipped content, no broken blur)
- `backdrop-filter: blur(20px)` is applied — verifiable via DevTools computed styles
- Horizontal scroll functions and cards snap to center (`scroll-snap-align: center` in effect)
- `body.dark` toggle changes `.blog-card` background from `rgba(255,255,255,0.15)` to `rgba(0,0,0,0.25)` — verifiable via DevTools
- All blog posts display title, formatted date (YYYY.MM.DD), description, and a working Read More link
- No JavaScript errors in DevTools console on page load
