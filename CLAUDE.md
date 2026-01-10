# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Jekyll-based photo portfolio website for Hal Sakaguchi, hosted on GitHub Pages. The site features a single-page application with three main sections (Portfolio, Blog, About) and includes dark mode support, horizontal scrolling galleries, and an interactive image viewer.

## Development Commands

### Local Development
```bash
# Serve the site locally (Jekyll)
bundle exec jekyll serve

# Serve with live reload and drafts
bundle exec jekyll serve --livereload --drafts

# Build the site
bundle exec jekyll build
```

### Deployment
This site is deployed to GitHub Pages automatically when pushing to the `main` branch. The site is served at the path specified in `_config.yml` (`baseurl: "/PhotoPortfolio"`).

## Architecture

### Site Structure

The site is a hybrid Jekyll + vanilla JavaScript application:

1. **Main Landing Page** ([index.html](index.html))
   - Single-page application with embedded CSS and JavaScript
   - Three sections: Portfolio (photo gallery), Blog (post cards), About (bio)
   - Navigation handled via JavaScript (no page reloads)
   - Features:
     - Horizontal scroll galleries with snap points for Portfolio and Blog sections
     - Category filtering for portfolio photos (by year or genre via `data-year` and `data-genre` attributes)
     - Image popup viewer for full-screen photo viewing
     - Dark/light theme toggle with localStorage persistence
     - Fixed bottom navigation bar with section switching

2. **Blog Post Pages** ([_layouts/post.html](_layouts/post.html))
   - Individual post template with Tailwind CSS
   - Features a hero image that transitions from full-width to pinned thumbnail on scroll
   - Click the image to toggle between expanded/shrinked states
   - Navigation buttons return to the main landing page (not section-aware)

### Key Technical Patterns

#### Liquid/Jekyll Integration
- Blog posts in [_posts/](_posts/) directory follow Jekyll naming convention: `YYYY-MM-DD-title.md`
- Post front matter requires: `layout`, `title`, `date`, `description`, `image`
- Main page uses `{% for post in site.posts %}` to render blog cards dynamically
- Use `{{ post.url | relative_url }}` for links to ensure baseurl is included

#### Image Management
- Portfolio images: Hardcoded Flickr URLs in [index.html](index.html)
- Blog images: Specified in post front matter `image` field
- Each portfolio photo has `data-year` and `data-genre` attributes for filtering

#### Theme System
- Theme preference stored in `localStorage` as `'light'` or `'dark'`
- Both [index.html](index.html) and [post.html](_layouts/post.html) have independent theme implementations
- Theme classes applied to `<body>` element: `body.light` or `body.dark`

#### Navigation State Management
- Main page: JavaScript manages section visibility (Portfolio/Blog/About) without page reloads
- Active section tracked via `activePage` variable
- Bottom nav uses `.active` class for visual feedback
- Post pages: Navigation buttons link back to main page but don't preserve section state

### File Organization

```
/
├── _config.yml          # Jekyll configuration (title, baseurl)
├── index.html           # Main SPA landing page
├── _layouts/
│   ├── default.html     # Minimal layout (currently unused)
│   └── post.html        # Blog post template with scrolling image
├── _includes/
│   └── navigation.html  # Navigation component (currently unused)
└── _posts/              # Blog posts (Jekyll convention)
    └── YYYY-MM-DD-*.md
```

## Adding Content

### Adding a Portfolio Photo
Edit [index.html](index.html) and add a new `.photo` div in the `.portfolio` section:
```html
<div class="photo" data-year="2024" data-genre="landscape">
  <img src="FLICKR_URL" alt="Photo description">
</div>
```

### Adding a Blog Post
1. Create a new file in [_posts/](_posts/) following the naming pattern: `YYYY-MM-DD-title.md`
2. Add front matter:
```yaml
---
layout: post
title: "Post Title"
date: YYYY-MM-DD
description: "Brief description for the card"
image: "https://image-url.jpg"
---
```
3. Write content in Markdown below the front matter

## Important Notes

- **Baseurl Awareness**: All links must use `{{ url | relative_url }}` to work correctly with the `/PhotoPortfolio` baseurl
- **Flickr Images**: Portfolio images are currently hosted on Flickr (live.staticflickr.com). Update these URLs when changing photos
- **No Build Step**: The main page uses inline styles and vanilla JS, no bundler or preprocessor
- **Tailwind CDN**: Blog post layout uses Tailwind via CDN (`https://cdn.tailwindcss.com`)
- **Horizontal Scrolling**: Portfolio and Blog sections intercept mouse wheel events to scroll horizontally
- **Japanese Content**: Site uses `lang="ja"` and contains Japanese text in comments and content
