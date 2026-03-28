---
title: Photo Data Management & Filter Enhancement
date: 2026-03-29
status: approved
---

# Photo Data Management & Filter Enhancement

## Overview

Replace hardcoded photo entries in `index.html` with a Jekyll data file (`_data/photos.yml`).
Add grouped pill-style filter UI with dynamic generation from the data file.

## Goals

- Manage all photo metadata in a single YAML file (no HTML editing for new photos)
- Support multiple tags per photo (genre, style, mood, location, etc.)
- Filter buttons auto-update when photos are added
- Single-selection filter within each group (Year / Genre)
- GitHub Pages compatible (static build only, no server-side logic)

## Out of Scope

- Multi-select / AND/OR filter combinations
- Pagination or lazy loading
- Camera/lens/location metadata fields (can be added later as extra tags)

---

## Data Structure

**New file: `_data/photos.yml`**

```yaml
- src: "https://live.staticflickr.com/..."
  alt: "Photo title"
  year: 2023
  tags: [abstract, monochrome]
```

| Field  | Type         | Description                                 |
|--------|--------------|---------------------------------------------|
| `src`  | string       | Flickr direct image URL                     |
| `alt`  | string       | Alt text / photo title                      |
| `year` | integer      | Shooting year (used for Year filter group)  |
| `tags` | string array | Genre, style, mood, or any free-form labels |

All existing 5 photos are migrated from `index.html` to this file.

---

## Template Changes (`index.html`)

### Filter Navigation

Replace the hardcoded `<nav class="filter-nav">` with Liquid-generated buttons.
Buttons are grouped into **Year** and **Genre** sections with a group label above each.

```html
<nav class="filter-nav">
  <button data-filter="all" class="active">All</button>

  <div class="filter-group">
    <span class="filter-group-label">Year</span>
    {% assign years = site.data.photos | map: "year" | uniq | sort %}
    {% for year in years %}
      <button data-filter="{{ year }}">{{ year }}</button>
    {% endfor %}
  </div>

  <div class="filter-group">
    <span class="filter-group-label">Genre</span>
    {% assign all_tags = "" | split: "" %}
    {% for photo in site.data.photos %}
      {% assign all_tags = all_tags | concat: photo.tags %}
    {% endfor %}
    {% for tag in all_tags | uniq | sort %}
      <button data-filter="{{ tag }}">{{ tag }}</button>
    {% endfor %}
  </div>
</nav>
```

### Portfolio Section

Replace hardcoded `.photo` divs with a Liquid loop.
Photo data attributes change from `data-year` / `data-genre` to `data-year` / `data-tags`.

```html
<section class="portfolio" id="portfolio">
  {% for photo in site.data.photos %}
  <div class="photo"
       data-year="{{ photo.year }}"
       data-tags="{{ photo.tags | join: ' ' }}">
    <img src="{{ photo.src }}" alt="{{ photo.alt }}">
  </div>
  {% endfor %}
</section>
```

---

## JavaScript Filter Logic

### Data Attribute Schema

| Attribute    | Example value       | Used for         |
|--------------|---------------------|------------------|
| `data-year`  | `"2023"`            | Year group match |
| `data-tags`  | `"abstract monochrome"` | Genre group match (space-separated) |
| `data-filter`| `"2023"` / `"travel"` | On filter buttons |

### Filter Function

```js
function applyFilter(value) {
  const photos = document.querySelectorAll('.photo');
  photos.forEach(photo => {
    if (value === 'all') {
      photo.style.display = '';
      return;
    }
    const year = photo.dataset.year;
    const tags = (photo.dataset.tags || '').split(' ');
    const match = year === String(value) || tags.includes(value);
    photo.style.display = match ? '' : 'none';
  });
}
```

### Active State Management

- **All** button: deactivates all group buttons, shows all photos.
- **Year group**: selecting a year deactivates any active Genre button (and vice versa).
- Only one button is active at a time across all groups.

---

## CSS Changes

Add styles for the new filter group structure:

```css
.filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.filter-group-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-right: 2px;
}
```

Existing pill button styles (`.filter-nav button`) remain unchanged.

---

## Migration

1. Create `_data/photos.yml` with all 5 existing photos.
2. Update `index.html`:
   - Replace filter nav with Liquid version.
   - Replace portfolio section with Liquid loop.
   - Update JS filter function.
   - Add CSS for `.filter-group` and `.filter-group-label`.
3. Remove old `data-genre` references from JS.

## Adding a Photo (After Implementation)

Edit `_data/photos.yml` only:

```yaml
- src: "https://live.staticflickr.com/..."
  alt: "New photo"
  year: 2025
  tags: [street, tokyo]
```

No changes to `index.html` required. Filter buttons update automatically on next build.
