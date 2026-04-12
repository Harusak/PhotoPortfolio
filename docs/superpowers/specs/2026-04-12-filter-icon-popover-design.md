# Filter Icon Popover Design

**Date:** 2026-04-12  
**Goal:** Replace the overlay filter nav (which visually interferes with photos) with a compact icon + popover pattern positioned at the top-right.

---

## Problem

The current `.filter-nav` is `position: absolute; top: 1rem; left: 1rem` inside `<main>`. It floats over the portfolio section, obscuring photos in the top-left area and blocking interaction.

---

## Solution Overview

Remove the existing `.filter-nav` entirely. Replace with:

1. A small icon toggle button at top-right (does not overlap photos)
2. A minimal popover that appears below the icon on click

---

## Components

### Toggle Button (`.filter-toggle`)

- Position: `position: absolute; top: 1rem; right: 1rem; z-index: 50`
- Size: 36×36px, circular, glassmorphism style matching the site
- Icon: funnel/filter SVG (single-path, minimal)
- State indicator: when active filter is not `all`, show a small purple dot (8px) at top-right of the button to signal filtering is active
- Dark mode: follows existing `body.dark` pattern

### Popover (`.filter-popover`)

- Position: `position: absolute; top: calc(1rem + 44px); right: 1rem; z-index: 50`
- Layout: single row of pill buttons, `flex-wrap: wrap`, `max-width: 280px`
- Contents: `All` button, then year buttons, then genre buttons — no group labels
- Background: glassmorphism (`rgba(255,255,255,0.1)` + `backdrop-filter: blur(20px)`)
- Hidden by default (`display: none`), toggled to `display: flex` on icon click
- Button active state: purple gradient (matches existing `.filter-nav button.active` style)

### Behavior

- Click toggle button → show/hide popover
- Click a filter button → apply filter, close popover
- Click outside popover/toggle → close popover
- Active filter tracking: when filter is `all`, remove dot indicator; otherwise show dot

---

## Changes

| What | Action |
|------|--------|
| `.filter-nav` CSS (and all sub-rules) | Delete |
| Responsive `.filter-nav` at 768px and 480px breakpoints | Delete |
| `<nav class="filter-nav">` HTML block | Replace with `.filter-toggle` button + `.filter-popover` div |
| Filter JS | Replace with new toggle + popover logic |

---

## What is NOT changed

- Photo rendering (Liquid loop, `data-year`, `data-tags`)
- Horizontal scroll behavior
- Popup viewer / hologram effect
- Blog and About sections
