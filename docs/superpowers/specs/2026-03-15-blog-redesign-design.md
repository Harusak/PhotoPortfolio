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

---

## CSS Design

### `.blog` (container)
No changes — retains existing horizontal scroll, snap, padding, gap.

### `.blog-background`
Retain Flickr background image. Lighten the `::before` overlay from `rgba(0,0,0,0.35)` to `rgba(0,0,0,0.2)` to let the photo show through more.

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
  cursor: pointer;
  text-decoration: none;
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
  }
}
```

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

### Retain
- `addHorizontalScroll(sections['blog'])` — unchanged

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

- Blog cards render without visual bugs in Chrome, Safari, and Firefox
- Glassmorphism (blur + semi-transparent) is visible over the photo background
- Horizontal scroll and snap work as before
- Dark mode switches card appearance correctly
- All blog posts display with title, date, description, and working link
