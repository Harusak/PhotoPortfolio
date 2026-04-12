# Filter Icon Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overlay `.filter-nav` panel (which obscures photos) with a compact icon toggle button at top-right that opens a minimal popover.

**Architecture:** The `<nav class="filter-nav">` block is removed from HTML. A `<button class="filter-toggle">` (funnel icon) and `<div class="filter-popover">` are added in its place. The popover holds the same Liquid-generated filter buttons in a flat list (no group labels). JS toggles `.open` on the popover, applies `data-filter` logic, and closes on outside click.

**Note:** The current JS is broken — it references `.category-filter-toggle` which no longer exists in HTML. This plan replaces it entirely.

**Tech Stack:** Jekyll (Liquid), vanilla JS, inline CSS in `index.html`

---

## File Map

| File | Change |
|------|--------|
| `index.html` L1145–1168 | Replace `<nav class="filter-nav">` with toggle button + popover |
| `index.html` L435–505 | Replace `.filter-nav` CSS block with `.filter-toggle` + `.filter-popover` CSS |
| `index.html` L1039–1049 | Remove `.filter-nav` responsive rules (768px breakpoint) |
| `index.html` L1108–1116 | Remove `.filter-nav` responsive rules (480px breakpoint) |
| `index.html` L1573–1621 | Replace broken filter JS with new toggle + popover logic |

---

## Task 1: Replace filter nav HTML

**Files:**
- Modify: `index.html` L1145–1168

- [ ] **Step 1: Replace the filter nav HTML block**

Find this block (L1145–1168):
```html
    <!-- カテゴリー切り替えナビ -->
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
        {% assign unique_tags = all_tags | uniq | sort %}
        {% for tag in unique_tags %}
          <button data-filter="{{ tag }}">{{ tag }}</button>
        {% endfor %}
      </div>
    </nav>
```

Replace with:
```html
    <!-- フィルタートグル -->
    <button class="filter-toggle" aria-label="フィルター">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
      <span class="filter-dot"></span>
    </button>
    <div class="filter-popover">
      <button data-filter="all" class="active">All</button>
      {% assign years = site.data.photos | map: "year" | uniq | sort %}
      {% for year in years %}
        <button data-filter="{{ year }}">{{ year }}</button>
      {% endfor %}
      {% assign all_tags = "" | split: "" %}
      {% for photo in site.data.photos %}
        {% assign all_tags = all_tags | concat: photo.tags %}
      {% endfor %}
      {% assign unique_tags = all_tags | uniq | sort %}
      {% for tag in unique_tags %}
        <button data-filter="{{ tag }}">{{ tag }}</button>
      {% endfor %}
    </div>
```

- [ ] **Step 2: Build and verify**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Expected: build succeeds. Then verify the popover buttons are rendered:
```bash
grep 'data-filter' _site/index.html
```
Expected: lines for `all`, `2023`, `2024`, `abstract`, `landscape`, `monochrome`, `portrait`, `travel`. Verify `filter-nav` is gone:
```bash
grep 'filter-nav' _site/index.html
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: replace filter-nav with icon toggle + popover HTML"
```

---

## Task 2: Replace filter CSS

**Files:**
- Modify: `index.html` CSS section (three locations)

- [ ] **Step 1: Replace the main `.filter-nav` CSS block (L435–505)**

Find this entire block:
```css
    /* フィルターナビゲーション */
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

Replace with:
```css
    /* フィルタートグル */
    .filter-toggle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 50;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      color: inherit;
      transition: background 0.2s ease;
    }

    body.dark .filter-toggle {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .filter-toggle:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    body.dark .filter-toggle:hover {
      background: rgba(0, 0, 0, 0.5);
    }

    .filter-dot {
      display: none;
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
    }

    .filter-toggle.filtered .filter-dot {
      display: block;
    }

    .filter-popover {
      display: none;
      position: absolute;
      top: calc(1rem + 44px);
      right: 1rem;
      z-index: 50;
      flex-wrap: wrap;
      gap: 0.4rem;
      max-width: 280px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.6rem 0.75rem;
      border-radius: 1rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .filter-popover.open {
      display: flex;
    }

    body.dark .filter-popover {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .filter-popover button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      color: inherit;
      transition: background 0.2s ease;
      white-space: nowrap;
    }

    .filter-popover button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    body.dark .filter-popover button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-popover button.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    body.dark .filter-popover button.active {
      background: linear-gradient(135deg, #a8b5ff 0%, #c49dff 100%);
    }
```

- [ ] **Step 2: Remove `.filter-nav` responsive CSS at 768px breakpoint**

Find this block (inside `@media (max-width: 768px)`):
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

Delete these lines entirely. Leave a blank line between the surrounding rules for readability.

- [ ] **Step 3: Remove `.filter-nav` responsive CSS at 480px breakpoint**

Find and delete this block (inside `@media (max-width: 480px)`):
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

Delete these lines entirely. Leave a blank line between the surrounding rules for readability.

- [ ] **Step 4: Build and verify no CSS errors**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Expected: success, no errors. Also verify the old CSS is gone:
```bash
grep 'filter-nav' _site/index.html
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "style: replace filter-nav CSS with filter-toggle and filter-popover styles"
```

---

## Task 3: Replace filter JavaScript

**Files:**
- Modify: `index.html` L1573–1621 (JS section)

- [ ] **Step 1: Replace the filter JS block**

Find this entire block (L1573–1621):
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
    // フィルタートグル
    const filterToggleBtn = document.querySelector('.filter-toggle');
    const filterPopover = document.querySelector('.filter-popover');
    const popoverButtons = document.querySelectorAll('.filter-popover button');
    const photoElements = document.querySelectorAll('.portfolio .photo');

    // アイコンクリックでポップオーバーを開閉
    filterToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterPopover.classList.toggle('open');
    });

    // フィルターボタンのクリック
    popoverButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        popoverButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;

        // ドット表示（all以外のとき）
        if (filter === 'all') {
          filterToggleBtn.classList.remove('filtered');
        } else {
          filterToggleBtn.classList.add('filtered');
        }

        // 写真の表示切り替え
        photoElements.forEach(photo => {
          if (filter === 'all') {
            photo.style.display = 'flex';
            return;
          }
          const year = photo.dataset.year;
          const tags = (photo.dataset.tags || '').split(' ');
          photo.style.display = (year === String(filter) || tags.includes(filter)) ? 'flex' : 'none';
        });

        // ポップオーバーを閉じる
        filterPopover.classList.remove('open');

        // 最初の表示要素にスクロール
        const first = document.querySelector('.portfolio .photo:not([style*="display: none"])');
        if (first) first.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      });
    });

    // ポップオーバー外クリックで閉じる
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-toggle') && !e.target.closest('.filter-popover')) {
        filterPopover.classList.remove('open');
      }
    });
```

- [ ] **Step 2: Build and verify**

Run: `bundle exec jekyll build 2>&1 | tail -5`

Expected: success.

- [ ] **Step 3: Smoke test in browser**

Run: `bundle exec jekyll serve`

Open `http://localhost:4000/PhotoPortfolio/` and verify:
- 右上に小さい円形のフィルターアイコンが表示される
- アイコンをクリックするとポップオーバーが開く（All / 2023 / 2024 / abstract / landscape / monochrome / portrait / travel のボタン）
- 写真エリアにパネルが重なっていない
- フィルターボタンをクリックすると写真が絞り込まれ、ポップオーバーが閉じる
- `all` 以外を選択するとアイコンに紫のドットが表示される
- `All` を選択するとドットが消える
- ポップオーバー外クリックで閉じる

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: replace filter JS with icon toggle and popover logic"
```
