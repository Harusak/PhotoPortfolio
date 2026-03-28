# Blog Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the complex multi-layer blog card system with a simple single-element glassmorphism card, eliminating rendering bugs caused by preserve-3d + backdrop-filter + SVG clip-path conflicts.

**Architecture:** All changes are in a single file (`index.html`). Edits are grouped into four independent tasks: HTML markup, CSS (add new + remove old), SVG cleanup, and JavaScript cleanup. Each task is committed separately.

**Tech Stack:** Vanilla HTML/CSS/JS, Jekyll (Liquid templates), GitHub Pages

---

## Chunk 1: HTML and CSS

### Task 1: Replace blog section HTML

**Files:**
- Modify: `index.html:1450-1485`

- [ ] **Step 1: Open `index.html` and locate the blog section**

  Find this block (around line 1450):
  ```html
  <!-- ブログセクション -->
  <section class="blog" id="blog" style="display: none;">
    <!-- 背景レイヤー -->
    <div class="blog-background"></div>

    <!-- ブログカード -->
    {% for post in site.posts %}
      <div class="card" data-post-id="{{ post.id }}">
        <div class="card-layers">
          <!-- 影レイヤー -->
          <div class="card-layer layer-shadow"></div>

          <!-- ベースレイヤー -->
          <div class="card-layer layer-base">
            <!-- ノイズテクスチャ -->
            <div class="card-grain"></div>

            <!-- コンテンツ -->
            <div class="card-content">
              <h2>{{ post.title }}</h2>
              <p>{{ post.description }}</p>
              <a href="{{ post.url | relative_url }}" class="card-link">
                <span class="read-more">Read More →</span>
              </a>
            </div>
          </div>

          <!-- エッジレイヤー -->
          <div class="card-layer layer-edge"></div>

          <!-- 光沢エフェクト -->
          <div class="card-shine"></div>
        </div>
      </div>
    {% endfor %}
  </section>
  ```

- [ ] **Step 2: Replace with the new simplified HTML**

  Replace the entire block above with:
  ```html
  <!-- ブログセクション -->
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

- [ ] **Step 3: Commit**

  ```bash
  git add index.html
  git commit -m "refactor(blog): replace multi-layer card HTML with single article element"
  ```

---

### Task 2: Add new `.blog-card` CSS

**Files:**
- Modify: `index.html` — CSS section (around line 290, after `.blog::-webkit-scrollbar` block)

- [ ] **Step 1: Locate the insertion point**

  Find this line (around line 292):
  ```css
  .blog::-webkit-scrollbar {
    display: none;
  }
  ```
  Insert the new CSS block immediately after the closing `}` of `.blog::-webkit-scrollbar`.

- [ ] **Step 2: Insert the new `.blog-card` CSS**

  ```css
  /* ブログカード - シンプルグラスモーフィズム */
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

- [ ] **Step 3: Commit**

  ```bash
  git add index.html
  git commit -m "feat(blog): add new blog-card glassmorphism CSS"
  ```

---

### Task 3: Lighten the blog background overlay

**Files:**
- Modify: `index.html` — `.blog-background::after` CSS (around line 339)

- [ ] **Step 1: Locate `.blog-background::after`**

  Find this block (around line 339):
  ```css
  .blog-background::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    filter: url(#card-grain);
  }
  ```

- [ ] **Step 2: Update `::after` — lighten it and remove the grain filter**

  Note: `::before` has the color gradient animation; `::after` is the dark overlay with grain. We modify `::after`.

  Replace the `::after` block with:
  ```css
  .blog-background::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
  }
  ```

- [ ] **Step 3: Also update the dark mode `::after` override**

  Find the block immediately after (around line 347):
  ```css
  body.dark .blog-background::after {
    background: rgba(0, 0, 0, 0.55);
  }
  ```

  Replace with:
  ```css
  body.dark .blog-background::after {
    background: rgba(0, 0, 0, 0.35);
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add index.html
  git commit -m "fix(blog): lighten background overlay, remove grain filter reference"
  ```

---

### Task 4: Add mobile CSS for `.blog-card`

**Files:**
- Modify: `index.html` — `@media (max-width: 768px)` block

- [ ] **Step 1: Locate the mobile blog section**

  Find this block inside the media query (around line 1317):
  ```css
  /* ブログカード - モバイル */
  .blog {
    padding: 1.5rem 3vw;
    gap: 1.5rem;
  }

  .blog .card {
    flex: 0 0 85vw;
    height: 65vh;
    max-width: none;
    min-height: 350px;
  }

  .blog .card.size-small {
    flex: 0 0 75vw;
    height: 55vh;
  }

  .blog .card.size-large {
    flex: 0 0 90vw;
    height: 72vh;
  }

  .blog .card-content {
    padding: 2rem 1.5rem;
  }

  .blog .card-content h2 {
    font-size: 1.5rem;
  }

  .blog .card-content p {
    font-size: 0.9rem;
  }

  .blog .card-link {
    font-size: 0.85rem;
    padding: 0.65rem 1.25rem;
  }
  ```

- [ ] **Step 2: Replace with new mobile rules**

  Replace the entire block above with:
  ```css
  /* ブログカード - モバイル */
  .blog {
    padding: 1.5rem 3vw;
    gap: 1.5rem;
  }

  .blog-card {
    flex: 0 0 80vw;
    padding: 1.5rem;
    min-height: 240px;
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add index.html
  git commit -m "feat(blog): add mobile CSS for blog-card"
  ```

---

### Task 5: Remove old blog CSS (desktop)

**Files:**
- Modify: `index.html` — CSS section, lines ~352–606

- [ ] **Step 1: Remove all old blog card CSS rules**

  Find the start of this block (the comment, around line 351):
  ```css
  /* カードコンテナ */
  .blog .card {
  ```

  Delete from that comment through the closing `}` of `@keyframes shadowExpand`, which ends with:
  ```css
    @keyframes shadowExpand {
      0% {
        opacity: 0.6;
        transform: translateZ(-40px) translateY(15px);
      }
      100% {
        opacity: 0;
        transform: translateZ(-80px) translateY(50px) scale(1.2);
      }
    }
  ```

  Everything between these two anchors (inclusive) is deleted. The next surviving CSS rule after deletion should be `/* Aboutセクション */`.

- [ ] **Step 2: Verify no remaining references to deleted classes**

  Search for any remaining uses of the old class names:
  ```bash
  grep -n "card-layers\|layer-shadow\|layer-base\|layer-edge\|card-grain\|card-shine\|card-content\|card-link\|size-small\|size-large\|cardExpand\|shadowExpand\|edgeFlow" index.html
  ```
  Expected: no output (zero matches).

- [ ] **Step 3: Commit**

  ```bash
  git add index.html
  git commit -m "refactor(blog): remove old multi-layer card CSS"
  ```

---

### Task 5b: Intermediate smoke test (Chunk 1)

**Files:** None — verification only

- [ ] **Step 1: Start Jekyll dev server**

  ```bash
  bundle exec jekyll serve
  ```
  Open `http://localhost:4000/PhotoPortfolio/`

- [ ] **Step 2: Confirm blog section is visible and renders cards**

  Click the Blog button. Confirm:
  - Cards appear over the photo background
  - Each card shows title, date, description, and Read More link
  - No broken/invisible cards or layout collapse
  - No JavaScript errors in DevTools → Console

  Stop the server (`Ctrl+C`) before continuing.

---

## Chunk 2: SVG and JavaScript Cleanup

### Task 6: Remove unused SVG filters and clipPaths

**Files:**
- Modify: `index.html` — inline SVG `<defs>` block (around lines 1634–1687)

- [ ] **Step 1: Verify the filters are no longer referenced**

  ```bash
  grep -n "card-grain\|torn-edge" index.html
  ```
  Expected: only the SVG definition lines themselves (no CSS or JS references remain after Tasks 3 and 5).

- [ ] **Step 2: Remove the `#card-grain` filter block**

  Find and delete this block (around lines 1634–1642):
  ```html
  <!-- ブログカード用の強烈なノイズテクスチャ -->
  <filter id="card-grain">
    <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="5" seed="42" />
    <feColorMatrix type="saturate" values="0" />
    <feComponentTransfer>
      <feFuncA type="discrete" tableValues="0 0.08 0.15 0.22" />
    </feComponentTransfer>
    <feBlend mode="multiply" in="SourceGraphic" />
  </filter>
  ```

- [ ] **Step 3: Remove the three `torn-edge` clipPath blocks**

  Find and delete from the first comment through the last closing tag (around lines 1650–1687).
  The block to delete starts with:
  ```html
  <!-- 粗いエッジパターン1（破れた紙） -->
  <clipPath id="torn-edge-1" clipPathUnits="objectBoundingBox">
  ```
  And ends with the closing tag of torn-edge-3:
  ```html
  </clipPath>

    </defs>
  ```
  Stop the deletion before `</defs>` — delete only the three `<clipPath>` blocks and their comments, not the `</defs>` line itself.

- [ ] **Step 4: Verify cleanup**

  ```bash
  grep -n "card-grain\|torn-edge" index.html
  ```
  Expected: no output.

- [ ] **Step 5: Commit**

  ```bash
  git add index.html
  git commit -m "chore(blog): remove unused SVG card-grain filter and torn-edge clipPaths"
  ```

---

### Task 7: Remove blog card JavaScript

**Files:**
- Modify: `index.html` — JS section (around lines 1965–2049)

- [ ] **Step 1: Locate the blog card JS block**

  Find this comment (around line 1965):
  ```js
  // ========================================
  // ブログカード機能
  // ========================================
  ```

- [ ] **Step 2: Delete the entire blog card JS block**

  Delete from the comment above through the end of the last `blogCards.forEach` block (around line 2049). The block to remove contains:

  - `const blogCards = document.querySelectorAll('.blog .card');`
  - `const sizeClasses`, `const sizeWeights`
  - `function getWeightedRandomSize() { ... }`
  - First `blogCards.forEach(...)` — random size + clipPath assignment
  - Second `blogCards.forEach(...)` — shine mouse tracking
  - Third `blogCards.forEach(...)` — click morphing animation

  The line `addHorizontalScroll(sections['blog']);` (around line 1785) must **not** be deleted — it should remain in place.

- [ ] **Step 3: Verify `addHorizontalScroll` is still present**

  ```bash
  grep -n "addHorizontalScroll" index.html
  ```
  Expected: two lines — the function definition and `addHorizontalScroll(sections['blog'])`.

- [ ] **Step 4: Verify no remaining references to old blog JS**

  ```bash
  grep -n "blogCards\|sizeClasses\|sizeWeights\|getWeightedRandom\|card-shine\|transitioning\|cardExpand" index.html
  ```
  Expected: no output.

- [ ] **Step 5: Commit**

  ```bash
  git add index.html
  git commit -m "refactor(blog): remove blog card JS (size, shine, morphing animation)"
  ```

---

## Chunk 3: Verification

### Task 8: End-to-end browser verification

**Files:** None — verification only

- [ ] **Step 1: Start Jekyll dev server**

  ```bash
  bundle exec jekyll serve --livereload
  ```
  Open `http://localhost:4000/PhotoPortfolio/`

- [ ] **Step 2: Verify blog section renders correctly**

  Click the Blog button in the bottom nav. Check:
  - Cards appear with glassmorphism blur effect over the photo background
  - Each card shows date (YYYY.MM.DD format), title, description, Read More link
  - All cards are the same width
  - Horizontal scroll works and cards snap to center

- [ ] **Step 3: Verify glassmorphism via DevTools**

  Open DevTools → Elements → select `.blog-card`. In Computed styles, confirm:
  - `backdrop-filter: blur(20px)` is applied
  - `background` is `rgba(255, 255, 255, 0.15)` (light mode)

- [ ] **Step 4: Verify dark mode**

  Toggle dark mode on the site. Confirm:
  - `.blog-card` background changes to `rgba(0, 0, 0, 0.25)`
  - `border-color` changes to `rgba(255, 255, 255, 0.15)`
  - Text remains white and readable

- [ ] **Step 5: Verify hover effect**

  Hover over a card. Confirm:
  - Card lifts with `translateY(-6px)`
  - No 3D rotation or shine effects

- [ ] **Step 6: Verify Read More links work**

  Click a Read More link. Confirm it navigates to the blog post page.

- [ ] **Step 7: Verify no console errors**

  Open DevTools → Console. Confirm no JavaScript errors on page load or blog section navigation.

- [ ] **Step 8: Verify mobile layout**

  Open DevTools → Toggle device toolbar → set width to 375px.
  - Cards should be `80vw` wide
  - Content (title, date, desc, link) should fit without overflow

- [ ] **Step 9: Final commit if any tweaks were made during verification**

  ```bash
  git add index.html
  git commit -m "fix(blog): post-verification tweaks"
  ```
  Skip this step if no changes were needed.
