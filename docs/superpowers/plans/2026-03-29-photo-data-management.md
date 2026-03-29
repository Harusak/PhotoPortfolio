# Photo Data Management & Filter Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded photo entries in `index.html` with `_data/photos.yml`, and upgrade the filter UI to a grouped pill design that auto-generates buttons from data.

**Architecture:** Photo metadata moves to `_data/photos.yml` (year + tags[]). Jekyll renders the portfolio and filter buttons via Liquid loops at build time. The JS filter reads `data-year` and `data-tags` (space-separated) on each `.photo` div instead of the old `data-year` / `data-genre`.

**Tech Stack:** Jekyll (Liquid templating), `_data/` YAML, vanilla JS, GitHub Pages

---

## File Map

| File | Change |
|------|--------|
| `_data/photos.yml` | **Create** — all photo metadata |
| `index.html` L1197–1210 | **Modify** — replace filter wrapper HTML |
| `index.html` L1212–1228 | **Modify** — replace portfolio section HTML |
| `index.html` L436–548 | **Modify** — replace category-filter CSS with filter-nav CSS |
| `index.html` L1082–1100 | **Modify** — update responsive CSS (768px breakpoint) |
| `index.html` L1159–1167 | **Modify** — update responsive CSS (480px breakpoint) |
| `index.html` L1624–1671 | **Modify** — replace JS filter logic |

---

## Task 1: Create `_data/photos.yml`

**Files:**
- Create: `_data/photos.yml`

- [ ] **Step 1: Create the data file**

```yaml
- src: "https://live.staticflickr.com/65535/53098018469_eb8b162a71_k.jpg"
  alt: "残影"
  year: 2023
  tags: [abstract, monochrome]

- src: "https://live.staticflickr.com/65535/54988921054_6c0a617fb4_b.jpg"
  alt: "タイトル1"
  year: 2024
  tags: [portrait]

- src: "https://live.staticflickr.com/65535/53324907283_21ad32570c_h.jpg"
  alt: "タイトル2"
  year: 2024
  tags: [travel]

- src: "https://live.staticflickr.com/65535/53325019104_ccc4d609a1_h.jpg"
  alt: "タイトル3"
  year: 2023
  tags: [travel]

- src: "https://live.staticflickr.com/65535/52901207351_ce67bc5509_k.jpg"
  alt: "タイトル4"
  year: 2023
  tags: [landscape]
```

- [ ] **Step 2: Verify Jekyll can read it**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Expected: build completes without error (no "YAML Exception" or "Liquid Exception")

- [ ] **Step 3: Commit**

```bash
git add _data/photos.yml
git commit -m "feat: add _data/photos.yml for photo metadata management"
```

---

## Task 2: Replace portfolio section with Liquid loop

**Files:**
- Modify: `index.html` L1212–1228

- [ ] **Step 1: Replace the hardcoded `.photo` divs**

Find this block (L1212–1228):
```html
    <!-- ポートフォリオセクション -->
    <section class="portfolio" id="portfolio">
      <div class="photo" data-year="2023" data-genre="abstract">
        <img src="https://live.staticflickr.com/65535/53098018469_eb8b162a71_k.jpg" alt="残影">
      </div>
      <div class="photo" data-year="2024" data-genre="portrait">
        <img src="https://live.staticflickr.com/65535/54988921054_6c0a617fb4_b.jpg" alt="タイトル1">
      </div>
      <div class="photo" data-year="2024" data-genre="travel">
        <img src="https://live.staticflickr.com/65535/53324907283_21ad32570c_h.jpg" alt="タイトル2">
      </div>
      <div class="photo" data-year="2023" data-genre="travel">
        <img src="https://live.staticflickr.com/65535/53325019104_ccc4d609a1_h.jpg" alt="タイトル3">
      </div>
      <div class="photo" data-year="2023" data-genre="landscape">
        <img src="https://live.staticflickr.com/65535/52901207351_ce67bc5509_k.jpg" alt="タイトル4">
      </div>
    </section>
```

Replace with:
```html
    <!-- ポートフォリオセクション -->
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

- [ ] **Step 2: Build and verify rendered output**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Expected: success. Then check:
```bash
grep -c 'class="photo"' _site/index.html
```
Expected output: `5`

Also verify `data-tags` appears and `data-genre` is gone:
```bash
grep 'data-tags' _site/index.html | head -3
grep 'data-genre' _site/index.html
```
Expected: `data-tags` lines present, `data-genre` produces no output.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: render portfolio photos from _data/photos.yml"
```

---

## Task 3: Replace filter nav HTML with grouped pill structure

**Files:**
- Modify: `index.html` L1197–1210

- [ ] **Step 1: Replace the filter wrapper HTML**

Find this block (L1197–1210):
```html
    <div class="category-filter-wrapper">
      <button class="category-filter-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h18M3 12h18M3 20h18"/>
        </svg>
        <span id="current-filter">All</span>
      </button>
      <nav class="category-nav">
        <button data-category="all" class="active">All</button>
        <button data-category="2023">2023</button>
        <button data-category="2024">2024</button>
        <button data-category="travel">Travel</button>
      </nav>
    </div>
```

Replace with:
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

- [ ] **Step 2: Build and verify filter buttons rendered**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Then:
```bash
grep 'data-filter' _site/index.html
```

Expected: lines for `all`, `2023`, `2024`, `abstract`, `landscape`, `monochrome`, `portrait`, `travel` (sorted alphabetically within genre group).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: replace filter nav with Liquid-generated grouped pill structure"
```

---

## Task 4: Update CSS — replace category-filter styles with filter-nav styles

**Files:**
- Modify: `index.html` CSS section

- [ ] **Step 1: Replace the old category-filter and category-nav CSS block**

Find this entire block (L436–548):
```css
    .category-filter-wrapper {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 50;
    }

    .category-filter-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.75rem 1rem;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.875rem;
      font-weight: 500;
      color: inherit;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    body.dark .category-filter-toggle {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .category-filter-toggle:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }

    body.dark .category-filter-toggle:hover {
      background: rgba(0, 0, 0, 0.3);
    }

    .category-filter-toggle svg {
      width: 18px;
      height: 18px;
      transition: transform 0.3s ease;
    }

    .category-filter-toggle.open svg {
      transform: rotate(180deg);
    }

    .category-nav {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      padding: 0.5rem;
      border-radius: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      opacity: 0;
      pointer-events: none;
      transform: translateY(-10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 150px;
    }

    .category-nav.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    body.dark .category-nav {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .category-nav button {
      background: transparent;
      border: none;
      padding: 0.6rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      color: inherit;
      transition: all 0.2s ease;
      text-align: left;
      white-space: nowrap;
    }

    .category-nav button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    body.dark .category-nav button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .category-nav button.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    body.dark .category-nav button.active {
      background: linear-gradient(135deg, #a8b5ff 0%, #c49dff 100%);
    }
```

Replace with:
```css
    .filter-nav {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 50;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      max-width: calc(100% - 2rem);
    }

    body.dark .filter-nav {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .filter-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }

    .filter-group-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-right: 2px;
    }

    .filter-nav button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      color: inherit;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .filter-nav button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    body.dark .filter-nav button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-nav button.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    body.dark .filter-nav button.active {
      background: linear-gradient(135deg, #a8b5ff 0%, #c49dff 100%);
    }
```

- [ ] **Step 2: Update responsive CSS at 768px breakpoint**

Find this block (inside `@media (max-width: 768px)`):
```css
      .category-filter-wrapper {
        top: 0.75rem;
        left: 0.75rem;
      }

      .category-filter-toggle {
        padding: 0.6rem 0.85rem;
        font-size: 0.8rem;
      }

      .category-filter-toggle svg {
        width: 16px;
        height: 16px;
      }

      .category-nav button {
        padding: 0.5rem 0.85rem;
        font-size: 0.8rem;
      }
```

Replace with:
```css
      .filter-nav {
        top: 0.75rem;
        left: 0.75rem;
        padding: 0.6rem 0.85rem;
        gap: 0.4rem;
      }

      .filter-nav button {
        padding: 0.35rem 0.75rem;
        font-size: 0.75rem;
      }
```

- [ ] **Step 3: Update responsive CSS at 480px breakpoint**

Find this block (inside `@media (max-width: 480px)`):
```css
      .category-filter-toggle {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
      }

      .category-nav button {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
      }
```

Replace with:
```css
      .filter-nav {
        padding: 0.5rem 0.75rem;
        gap: 0.35rem;
      }

      .filter-nav button {
        padding: 0.3rem 0.65rem;
        font-size: 0.7rem;
      }
```

- [ ] **Step 4: Build and verify no CSS errors**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Expected: success, no errors.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "style: replace category-filter CSS with filter-nav grouped pill styles"
```

---

## Task 5: Update JavaScript filter logic

**Files:**
- Modify: `index.html` L1624–1671 (JS section)

- [ ] **Step 1: Replace the filter JS block**

Find this entire block (L1624–1671):
```js
    // カテゴリーフィルタリング機能
    const filterToggle = document.querySelector('.category-filter-toggle');
    const categoryNav = document.querySelector('.category-nav');
    const currentFilterText = document.getElementById('current-filter');
    const navButtons = document.querySelectorAll('.category-nav button');
    const photoElements = document.querySelectorAll('.portfolio .photo');

    // トグルボタンでドロップダウンを開閉
    filterToggle.addEventListener('click', () => {
      filterToggle.classList.toggle('open');
      categoryNav.classList.toggle('open');
    });

    // 各カテゴリーボタンのクリックイベント
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.category;
        const categoryLabel = btn.textContent;

        // 現在のフィルターテキストを更新
        currentFilterText.textContent = categoryLabel;

        // フィルタリング
        photoElements.forEach(photo => {
          const matches = cat === 'all'
            || photo.dataset.year === cat
            || photo.dataset.genre === cat;
          photo.style.display = matches ? 'flex' : 'none';
        });

        // ドロップダウンを自動で閉じる
        filterToggle.classList.remove('open');
        categoryNav.classList.remove('open');

        // 最初の表示要素にスクロール
        const first = document.querySelector('.portfolio .photo[style*="display: flex"]');
        if (first) first.scrollIntoView({behavior:'smooth', inline:'center'});
      });
    });

    // ドロップダウン外をクリックしたら閉じる
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.category-filter-wrapper')) {
        filterToggle.classList.remove('open');
        categoryNav.classList.remove('open');
      }
    });
```

Replace with:
```js
    // フィルタリング機能
    const filterButtons = document.querySelectorAll('.filter-nav button');
    const photoElements = document.querySelectorAll('.portfolio .photo');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // 全ボタンの active を外してクリックされたボタンに付ける
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;

        // 各写真の表示・非表示を切り替える
        photoElements.forEach(photo => {
          if (filter === 'all') {
            photo.style.display = 'flex';
            return;
          }
          const year = photo.dataset.year;
          const tags = (photo.dataset.tags || '').split(' ');
          const match = year === String(filter) || tags.includes(filter);
          photo.style.display = match ? 'flex' : 'none';
        });

        // 最初の表示要素にスクロール
        const first = document.querySelector('.portfolio .photo:not([style*="display: none"])');
        if (first) first.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      });
    });
```

- [ ] **Step 2: Build and verify**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Expected: success.

- [ ] **Step 3: Smoke test in browser**

Run: `bundle exec jekyll serve`

Open `http://localhost:4000/PhotoPortfolio/` and verify:
- All 5 photos visible on load with "All" button active
- Clicking "2023" shows 3 photos (残影, タイトル3, タイトル4); "2024" shows 2 photos
- Clicking "travel" shows 2 photos (タイトル2, タイトル3)
- Clicking "All" again shows all 5
- Active button highlights in purple gradient
- Year/Genre group labels visible

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: update filter JS to use data-filter and data-tags attributes"
```
