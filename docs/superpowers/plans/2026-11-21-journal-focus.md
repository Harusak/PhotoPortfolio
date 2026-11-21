# Journal 一覧 2026-11 改訂（フォーカス操作・DoF 常時 On）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.html` の Journal 一覧から Depth of field 切替を外して常時 On にし、マウス方式（AF ブラケットのカーソル）とタッチ方式（合焦ライン＋相対列切替＋ブリージング）のフォーカス操作を入力に応じて切り替えて載せる。記事ページの dof も外す。

**Architecture:** DOM に触れない計算（ボケ・視差・合焦ライン・カード選択・列切替・ばね・補間）を `assets/js/journal-focus.js`（`window.JournalFocus` / `module.exports`）に分けて `node --test` で押さえる。DOM・イベント・rAF ループ・AF ブラケットのオーバーレイは今の Journal と同じく `index.html` のボトム IIFE に足す。マウス方式のボケ・視差は今の CSS transition 方式をそのまま使い、タッチ方式だけ rAF で `zv` を補間して毎フレーム描く。

**Tech Stack:** Jekyll 4.3, Liquid, vanilla JS / CSS（依存追加なし）, Node 22（`node:test`、テスト専用）

**Spec:** `docs/superpowers/specs/2026-11-21-journal-focus-design.md`（以下 design）。正となる値は引き継ぎ `docs/superpowers/specs/2026-11-journal-redesign/design_handoff_journal/README.md` と `FOCUS.md`（以下 README / FOCUS）。プロトタイプ `design/JournalCursor.dc.html`（マウス）・`design/JournalTouch.dc.html`（タッチ、採用値のみ）は同フォルダの `support.js` と一緒にブラウザで開ける。

## Global Constraints

- 被写界深度は常に On。`localStorage["journal-dof"]` は読まない・書かない（既存値は放置）
- ヘッダーは今の共通ヘッダー（fixed）のまま。メニューボタン・sticky ヘッダーは作らない
- 入力方式は `document.documentElement.dataset.input = "mouse" | "touch"`。初期値 `matchMedia("(hover: hover) and (pointer: fine)")`、以後 `pointerdown` / `pointermove` の `pointerType`（`mouse` → mouse、`touch` / `pen` → touch）。ホバー系は `pointerType === "mouse"` のときだけ動かす（`mouseenter` / `mousemove` を新たに使わない）
- カーソル非表示は `html[data-input="mouse"] .view-journal, html[data-input="mouse"] .view-journal * { cursor: none }` のみ（メディアクエリで判定しない）
- カラム数は Archive の幅で決める（`≥1000 → 4`、`≥680 → 3`、他 `2`）。入力方式とは独立。2 列時レイアウトは `@media (max-width: 679px)`
- ばね・補間の係数は rAF 1 フレームあたり（フレーム時間補正なし）：ばね `v = (v + (target − cur) × 0.2) × 0.64`
- 幅 680px 以上のタッチでヒーロー右上に合焦しない点は仕様どおり（**特別扱いしない**。ヒーローのメインは常に「どの列にも属する」扱い）
- リンクは `{{ … | relative_url }}`、コメントは日本語、書き方は今の `index.html` / `post-scenes.js` に合わせる
- 作業ツリーにはユーザーの未コミットの記事・設定（`_posts/…`、`assets/2026-11-06-…`、`.gitignore`、`_config.yml`）がある。**コミットは各タスクのファイルだけを `git add <path>` で指定**し、`git add -A` / `.` は使わない

## Review Focus

1. **タップ直後の疑似マウスイベント**：タッチ端末でカードをタップ／スクロールした後、ブラウザが疑似 `mousemove` を送っても `data-input` は `touch` のまま（カーソルが消えない）。`pointerType` だけで判定する → Task 1 `inputFromPointerType` のテスト、Task 3 の確認項目
2. **フィルタ切替で `focusKey` のカードが消える**：消えたカードにブラケットが残ったり例外が出たりしない。タッチでは次の判定で選び直す → Task 4 の確認項目
3. **Journal から他のビューへ移動**：トップ・アルバム・About でカーソルが戻り、ブラケットが消え、rAF が止まる → Task 3 の確認項目
4. **記事が 3 件以下（Archive なし）／1 件だけ**：`jField` が無くてもヒーローだけで両方式が動く。列数は 2 として扱う → Task 1 `pickFocus([])` のテスト、Task 4 の確認項目
5. **指を置いたまま回転・リサイズで列数が減る**：選択中の列が `列数 − 1` に丸められる → Task 1 `swipeStep` / `clampCol` のテスト

---

## File Structure

| ファイル | 役割 |
|---|---|
| `assets/js/journal-focus.js`（新規） | 純粋計算。ブラウザ `window.JournalFocus`、Node `module.exports` |
| `scripts/test/journal-focus.test.cjs`（新規） | 上の `node:test` |
| `index.html` | DoF 切替削除、`data-card` 付与、Journal フッター、入力方式、AF ブラケット、マウス／タッチのフォーカス、rAF ループ、キーボード、2 列時レイアウト、`journal-focus.js` 読み込み |
| `_layouts/post.html` | `journal-dof` / `data-dof` / `html[data-dof="off"]` の削除 |
| `CLAUDE.md` | Journal の記述更新 |

---

### Task 1: `journal-focus.js`（純粋計算）とテスト

**Files:**
- Create: `assets/js/journal-focus.js`
- Test: `scripts/test/journal-focus.test.cjs`

**Interfaces:**
- Produces（`window.JournalFocus` / `module.exports`、すべて副作用なし。矩形は `{left, top, right, bottom}` か `{x, y, w, h}` のプレーンオブジェクト）：
  - `MAXB = 4`、`ARS = ['4/5','3/2','1/1','3/4','4/3','2/3']`
  - `stepFor(N: number): number` / `distAt(t: number): string` / `blurAt(dz: number, N: number): number` — 今の `index.html` から移す（式は変えない）
  - `heroBlur(dz): number` = `dz × 4 × 0.53`
  - `heroOpacity(dz, input: 'mouse'|'touch'): number` — mouse: `dz < 0.001 ? 1 : 0.75`／touch: `1 − 0.3·min(1, dz/2)`（小数 2 桁）
  - `archiveOpacity(dz, den): number` = `1 − 0.3·min(1, dz/den)`（小数 2 桁）
  - `heroShift(idx, mx, my, px): {x, y}` — `k = (3 − idx)·6·px`、`x = −mx·k`、`y = −my·k·0.6`（`mx, my ∈ [−1, 1]`）
  - `archiveShift(t, mx, my, px): {x, y, s}` — `k = (6 + 14(1−t))·px`、`x = −mx·k`、`y = −my·k·0.5`、`s = 1 − 0.06·t·px`
  - `focusLineY(scrollTop, scrollHeight, h): number` — `max = scrollHeight − h`、`t = clamp((scrollTop − (max − 0.7h)) / 0.7h, 0, 1)`、`Math.round(h × (0.4 + 0.42t))`
  - `columnCenter(col, n, left, width): number` = `left + (col + 0.5) / n × width`
  - `clampCol(col, n): number` = `clamp(col, 0, n − 1)`
  - `pickFocus(cards: Array<{top, bottom, left, right, anyColumn?: boolean}>, lineY, colX, current: number): number` — 最小得点の index（空なら −1）。`d` = ラインから矩形までの縦距離（中なら 0）、`dx` = `anyColumn` なら 0、他は `colX` から矩形までの横距離（中なら 0）、`score = d·1000 + (dx > 0 ? 200000 + dx·1000 : 0) + |(top+bottom)/2 − lineY|`。ヒステリシス：`current ≥ 0` でそのカードの `dx === 0` かつ `d < 16` なら `current` を返す
  - `swipeStep(g: {x0, c0, shift}, x, T, n): {x0, c0, shift, col, lean}` — 下記アルゴリズム
  - `springStep(cur, vel, target): [cur, vel]` — `vel = (vel + (target − cur)·0.2)·0.64; cur += vel`
  - `approach(cur, target, k, eps): number` — `cur + (target − cur)·k`、`|target − 結果| < eps` なら `target`
  - `inflate(r: {left, top, width, height}, p): {x, y, w, h}`
  - `isLocked(cur: {x, w}, target: {x, w}): boolean` — `|w差| < 6 && |x差| < 6`
  - `breathScale(zv, den): number` = `1 + 0.02·(1 − zv/den)`
  - `originToMouse(ox, oy, w, h): {mx, my}` — `clamp(ox/w·2 − 1, −1, 1)`、y も同様
  - `bracketLive(now, last, holding: boolean): number` — `holding` → 1。`last` が 0 → 0。`dt = now − last`、`dt < 900 ? 1 : max(0, 1 − (dt − 900)/450)`
  - `inputFromPointerType(type: string): 'mouse'|'touch'|null` — `mouse` → `'mouse'`、`touch` / `pen` → `'touch'`、他 `null`

`swipeStep` のアルゴリズム（FOCUS「列の切替（相対）」。テストが形を決めきれないので明記）：

```js
const dx = x - g.x0;
let shift = dx > T || (g.shift === 1 && dx > T / 2) ? 1
          : dx < -T || (g.shift === -1 && dx < -T / 2) ? -1 : 0;
let col = clampCol(g.c0 + shift, n), x0 = g.x0, c0 = g.c0;
const lean = shift === 0 ? clamp(dx, -T, T) * 0.7 : 0;
// 3 列以上：越えるたびに基準を置き直して 1 列ずつ進める
if (n >= 3 && shift !== 0 && g.shift === 0) { x0 = x; c0 = col; shift = 0; }
return { x0, c0, shift, col, lean };
```

- [ ] **Step 1: テストを書く** — `scripts/test/journal-focus.test.cjs`（書き方は `post-scenes.test.cjs` と同じ。`const F = require('../../assets/js/journal-focus.js')`）。最低限のアサーション：

```js
test('stepFor / distAt / blurAt（今の index.html と同じ値）', () => {
  assert.equal(F.stepFor(2), 1); assert.equal(F.stepFor(8), 3); assert.equal(F.stepFor(10), 7); // 4→gcd2,5→gcd5,6→gcd2,7
  assert.equal(F.distAt(0), '0.8 m'); assert.equal(F.distAt(1), '12 m');
  assert.equal(F.blurAt(0, 5), 0); assert.equal(F.blurAt(1, 5), 0.8); assert.equal(F.blurAt(4, 5), 4);
});
test('heroOpacity：マウスは .75、タッチは N=3 の式', () => {
  assert.equal(F.heroOpacity(0, 'mouse'), 1); assert.equal(F.heroOpacity(1, 'mouse'), 0.75);
  assert.equal(F.heroOpacity(1, 'touch'), 0.85); assert.equal(F.heroOpacity(2, 'touch'), 0.7);
});
test('archiveShift / heroShift', () => {
  assert.deepEqual(F.archiveShift(0, 1, 1, 1), { x: -20, y: -10, s: 1 });
  assert.deepEqual(F.archiveShift(1, 0, 0, 0), { x: -0, y: -0, s: 1 }); // px=0 で視差なし（-0 を許すなら Object.is を避けて個別に assert.equal）
  assert.deepEqual(F.heroShift(0, 1, 0, 1), { x: -18, y: -0 });
});
test('focusLineY：0.4h から最後の 0.7 画面で 0.82h へ', () => {
  assert.equal(F.focusLineY(0, 3000, 1000), 400);
  assert.equal(F.focusLineY(2000, 3000, 1000), 820);
  assert.equal(F.focusLineY(1650, 3000, 1000), 610);
  assert.equal(F.focusLineY(0, 800, 1000), 820); // ページが画面より短い
});
test('pickFocus：ライン上・選択列優先・200px 規則・ヒステリシス・空', () => {
  const A = { top: 0, bottom: 300, left: 0, right: 100 }, B = { top: 0, bottom: 300, left: 120, right: 220 };
  assert.equal(F.pickFocus([A, B], 150, 170, -1), 1);              // 列にある方
  const C = { top: 400, bottom: 600, left: 0, right: 100 };
  assert.equal(F.pickFocus([C, { ...B, top: 0, bottom: 100 }], 300, 170, -1), 1); // 列内が 200px 以内で遠い → 列優先
  assert.equal(F.pickFocus([{ ...A, anyColumn: true }, B], 150, 170, -1), 0);     // メインはどの列にも属する（中心が同じなら index の若い方）
  assert.equal(F.pickFocus([A, { top: 160, bottom: 400, left: 0, right: 100 }], 310, 50, 0), 0); // 今のカードから 10px → 維持
  assert.equal(F.pickFocus([], 100, 0, -1), -1);
});
test('swipeStep：12px で 1 列、T/2 まで保持、端で止まる、3 列は 1 列ずつ', () => {
  let g = { x0: 100, c0: 0, shift: 0 };
  assert.equal(F.swipeStep(g, 111, 12, 2).col, 0);
  assert.equal(F.swipeStep(g, 111, 12, 2).lean.toFixed(1), '7.7');
  g = F.swipeStep(g, 113, 12, 2); assert.equal(g.col, 1); assert.equal(g.lean, 0);
  assert.equal(F.swipeStep(g, 107, 12, 2).col, 1);   // 戻しても +6 まで保持
  assert.equal(F.swipeStep(g, 105, 12, 2).col, 0);
  assert.equal(F.swipeStep({ x0: 100, c0: 1, shift: 0 }, 130, 12, 2).col, 1); // 端
  let h = F.swipeStep({ x0: 100, c0: 0, shift: 0 }, 113, 12, 3);
  assert.deepEqual([h.col, h.c0, h.x0, h.shift], [1, 1, 113, 0]);
  h = F.swipeStep(h, 126, 12, 3); assert.equal(h.col, 2);
  assert.equal(F.clampCol(3, 2), 1); assert.equal(F.clampCol(-1, 2), 0);
});
test('springStep / approach / isLocked / inflate / breathScale / originToMouse', () => {
  assert.deepEqual(F.springStep(0, 0, 100), [12.8, 12.8]);
  assert.equal(F.approach(0, 1, 0.2, 0.01), 0.2); assert.equal(F.approach(0.995, 1, 0.2, 0.01), 1);
  assert.equal(F.isLocked({ x: 0, w: 100 }, { x: 5, w: 105 }), true);
  assert.equal(F.isLocked({ x: 0, w: 100 }, { x: 6, w: 100 }), false);
  assert.deepEqual(F.inflate({ left: 10, top: 20, width: 100, height: 50 }, 10), { x: 0, y: 10, w: 120, h: 70 });
  assert.equal(F.breathScale(0, 4), 1.02); assert.equal(F.breathScale(4, 4), 1);
  assert.deepEqual(F.originToMouse(400, 0, 200, 100), { mx: 1, my: -1 });
});
test('bracketLive / inputFromPointerType', () => {
  assert.equal(F.bracketLive(5000, 0, false), 0); assert.equal(F.bracketLive(5000, 4500, false), 1);
  assert.equal(F.bracketLive(5000, 3875, false), 0.5); assert.equal(F.bracketLive(5000, 0, true), 1);
  assert.equal(F.inputFromPointerType('mouse'), 'mouse'); assert.equal(F.inputFromPointerType('pen'), 'touch');
  assert.equal(F.inputFromPointerType('touch'), 'touch'); assert.equal(F.inputFromPointerType(''), null);
});
```

テストの数値が浮動小数で一致しない箇所は `Math.abs(a − b) < 1e-9` で比べてよい（値は変えない）。

- [ ] **Step 2: 失敗を確認** — Run: `node --test scripts/test/` → Expected: `journal-focus.test.cjs` が `Cannot find module` で FAIL、`post-scenes` は PASS

- [ ] **Step 3: `assets/js/journal-focus.js` を実装** — `post-scenes.js` と同じ IIFE ＋ UMD の形。先頭コメント「Journal 一覧のフォーカス操作の計算（DOM に触れない純粋関数）。index.html から window.JournalFocus として使う」

- [ ] **Step 4: 通過を確認** — Run: `node --test scripts/test/` → Expected: 全テスト PASS

- [ ] **Step 5: Commit**

```bash
git add assets/js/journal-focus.js scripts/test/journal-focus.test.cjs
git commit -m "feat(journal): add pure focus maths for mouse and touch modes"
```

---

### Task 2: DoF 切替の削除・計算の差し替え・フッター（記事ページの dof も削除）

**Files:**
- Modify: `index.html`（`.j-dof` の CSS、`.j-dof` のマークアップ、Journal JS の `jDofBtns` / `jx.dof` / `canHover` / `stepFor` / `distAt` / `blurAt` / `J_ARS` / `J_MAXB`、`<script>` の読み込み、Journal の末尾）
- Modify: `_layouts/post.html:17-27`（head のインラインスクリプト）、`:467-469`、`:677-681`

**Interfaces:**
- Consumes: Task 1 の `JournalFocus`（`stepFor`, `distAt`, `blurAt`, `ARS`, `MAXB`, `heroBlur`, `heroOpacity`, `archiveOpacity`, `heroShift`, `archiveShift`）
- Produces: ヒーローのカードと `.j-card` に `data-card` 属性（Task 3・4 が `closest('[data-card]')` で使う）。`const JF = window.JournalFocus`（IIFE 内）

- [ ] **Step 1: `index.html` の DoF 切替を削除** — `.j-dof` の CSS 一式とマークアップ（`<div class="j-dof">…</div>`）、`jDofBtns`、`jx.dof`、`localStorage` の `journal-dof` 読み書き、`renderJControls()` 内の dof 行を削除。ステータスは README どおり `focus —` / `{YYYY} · focus …`（`depth of field off` の分岐を削除）。`canHover` とそれによるヒーローのボケ抑止も削除（タッチでもボケは Task 4 で付く）

- [ ] **Step 2: 計算を `JournalFocus` に差し替え** — IIFE 内のローカル定義 `J_ARS` / `J_MAXB` / `gcd` / `stepFor` / `distAt` / `blurAt` を削除して `JF.*` を使う。`renderJHero()` / `renderArchive()` の式を `JF.heroBlur` / `JF.heroOpacity(dz, 'mouse')` / `JF.archiveOpacity` / `JF.heroShift` / `JF.archiveShift` に置き換える（見た目は変えない。`heroShift` は `mx = hm.x·2 − 1` を渡す）。`index.html` の `<script id="gallery-data">` の直前に `<script src="{{ '/assets/js/journal-focus.js' | relative_url }}"></script>`（`defer` なし。ボトム IIFE より先に評価されるため）

- [ ] **Step 3: `data-card` とフッター** — Liquid のヒーロー 2 種のカードと `.j-card` に `data-card` を付ける。`#view-journal` の末尾（`</main>` 直前）に `<footer class="site-footer"><span>© Hal Sakaguchi</span><span>Journal</span></footer>`

- [ ] **Step 4: `_layouts/post.html` の dof を削除** — head スクリプトから `d` / `journal-dof` / `data-dof` を除き（コメントも「テーマを適用」に）、`html[data-dof="off"] .scene` と `html[data-dof="off"] .stage-photo` の 2 ルール（直前のコメント含む）を削除。`grep -n "dof" _layouts/post.html assets/js/post.js` が空になること

- [ ] **Step 5: 検証** — Run: `node --test scripts/test/ && bundle exec jekyll build` → Expected: テスト PASS、build がエラーなし。`grep -c "journal-dof" _site/index.html _site/**/*.html` が全て 0。`bundle exec jekyll serve` で `#/journal` を開き、マウスでヒーローのホバー・Archive のピント・視差・フィルタ・ステータス表示が改訂前と同じに動くこと、Depth of field の切替が無いこと、フッターが出ること、記事ページのボケが出ることを確認

- [ ] **Step 6: Commit**

```bash
git add index.html _layouts/post.html
git commit -m "feat(journal): always-on depth of field; drop the dof toggle on list and post"
```

---

### Task 3: 入力方式・AF ブラケット・マウス方式・rAF ループ

**Files:**
- Modify: `index.html`（CSS：ブラケット、`cursor:none`、ブラケット表示中のフォーカスリング／マークアップ：オーバーレイ／JS：Journal の節）

**Interfaces:**
- Consumes: Task 1 の `springStep`, `approach`, `inflate`, `isLocked`, `bracketLive`, `inputFromPointerType`, `distAt`；Task 2 の `data-card`、`renderJHero()`、`renderArchive()`、`jx`
- Produces（Task 4 が使う IIFE 内の名前）：
  - `jInput(): 'mouse'|'touch'`（`html.dataset.input` を返す）、`setInput(v)`
  - `jBr = { x, y, w, h, xv, yv, wv, hv, a, la, last, holding, from: {x, y}|null, lean }`（ブラケットの状態。`last` = 最後の操作時刻、`holding` = 指／ボタンを押している）
  - `jFocus = { card: Element|null, group: object|null }`（`focusKey` とそのグループ。グループは `{ key: 'hero' | year, el, items, N }`、ヒーローも同じ形で `jHeroGroup` として持つ）
  - `kick()`：rAF ループを開始（動作中なら何もしない）
  - `tick()` 内で入力方式ごとの `tickMouse()` / `tickTouch()`（Task 4）を呼び、最後に `drawBracket(target, label)` を呼ぶ
  - `setJournalActive(on: boolean)`：`render()` から呼ぶ。off でブラケットを隠し、ループを止め、`jFocus` を保持したまま停止

- [ ] **Step 1: オーバーレイと CSS** — `#view-journal` の直後に `<div class="af" id="af" aria-hidden="true"><span class="af-c tl"></span><span class="af-c tr"></span><span class="af-c bl"></span><span class="af-c br"></span><span class="af-label"><span class="af-dot"></span>AF<span id="af-dist"></span></span></div>` と `<span class="af-pt" id="af-pt"></span>`（マウスの 4px 点）。CSS は FOCUS「AF ブラケット（共通の見た目）」の値：`position:fixed; left:0; top:0; z-index:120; pointer-events:none; color:var(--ink); opacity:0`、四隅 11×11px・`1.5px solid currentColor`、ラベル `bottom:calc(100% + 8px)`（`max-width:679px` で 7px）、`gap:14px`（同 12px）、IBM Plex Mono 10px／0.14em／uppercase、丸 6px。描画は `transform: translate(x, y)`＋`width/height`。`html[data-input="mouse"] .view-journal, html[data-input="mouse"] .view-journal * { cursor: none }`

- [ ] **Step 2: 入力方式** — 初期化時に `setInput(matchMedia('(hover: hover) and (pointer: fine)').matches ? 'mouse' : 'touch')`。`window` に `pointerdown` / `pointermove`（capture・passive）で `inputFromPointerType(e.pointerType)` が非 null かつ現在と違えば `setInput`。切替時は `jBr.a = 0`（次の操作で出直す）、`jBr.from` = ポインタ位置。`jFocus` とピント面はそのまま

- [ ] **Step 3: マウス方式** — `pointermove`（mouse のみ）でポインタ位置・`jBr.last` を更新して `kick()`。`pointerdown` / `pointerup`（mouse）で `holding`。`scroll` で（ポインタがあれば）`last` 更新と `kick()`。`document` の `pointerout` で `relatedTarget == null` ならポインタを「外」に。`tickMouse()`：`document.elementFromPoint` → `closest('[data-card]')` でカードを決め、カードが変わったら今の `pointerenter` 相当の処理（ヒーロー：`jx.hh = idx`／Archive：`jx.ay = year; jx.tg[year] = c._jz`）を行い `renderJHero()` / `renderArchive()`。カードが無くても年グループ内ならその年をアクティブ、どこでもなければ今の `pointerleave` 相当。ヒーロー・年グループ内の視差用マウス位置も同じ位置から計算する（今の `pointerenter` / `pointermove` / `pointerleave` のリスナーはこの処理に置き換えて削除してよい）。ブラケット目標：カード上なら `inflate(img の矩形, holding ? 3 : 10)`（`img` が無ければカードの矩形）、外なら `22×22`（押下中 `14×14`）をポインタ中心に。点はカード外のときだけ `opacity = jBr.a`。ラベルはカード上で opacity 1（CSS `transition: opacity .25s`）、距離はそのカードの面（ヒーロー `distAt(idx/2)`、Archive `distAt(z/den)`）。`jBr.a = approach(jBr.a, bracketLive(now, last, false), 0.18, 0.001)`、ポインタが外なら目標 0。ポインタが `.view-journal` の外（共通ヘッダー上など）なら目標 0

- [ ] **Step 4: rAF ループ** — `kick()` で開始、各フレーム `tick()`。ばね（`springStep` を x, y, w, h に）・opacity・（Task 4 の）`zv` / 中心がすべて収束（各差 < 0.5px / 0.001）し、かつ `bracketLive(...) === 0` かつ `jBr.a < 0.001` ならループを止める。`render()` 内で `viewJournal.hidden` を決めた直後に `setJournalActive(route.view === 'journal')`

- [ ] **Step 5: キーボード** — `viewJournal` の `focusin`：`e.target.closest('[data-card]')` が `:focus-visible` なら `jFocus.card` に、ブラケット目標をそのカード（ポインタ位置は使わない）、`last = now`、`kick()`。マウス方式ではそのカードを Step 3 のホバーと同じ扱いでピントを合わせる。ブラケットの opacity が 0.03 以上の間はそのカードに `.af-on`（`outline: none`）、下回ったら外す

- [ ] **Step 6: 動きを減らす設定** — `reduceMotion.matches` のときはばねを使わず `cur = target, vel = 0`、opacity は CSS `transition: opacity .2s` に任せて目標値を直接入れる

- [ ] **Step 7: 検証** — Run: `node --test scripts/test/ && bundle exec jekyll build` → PASS／エラーなし。`bundle exec jekyll serve` で `#/journal` をマウスで：
  - OS カーソルが消え、22×22 の枠＋4px の点が追従。カードに乗ると写真の 10px 外まで少し行き過ぎてから止まり、`● AF 2.4 m` 形式のラベルが出る。押すと 3px に縮む
  - ポインタを止めたまま ホイールでスクロールすると、下に来たカードへ枠が移りピントも移る
  - 900ms 止めると 450ms かけて消える。ウィンドウ外に出すと消える
  - ヘッダー上では通常カーソル、ブラケットは消える
  - `#/about`・トップ・アルバムでは通常カーソルでブラケットなし（DevTools Performance で rAF が止まっている）
  - Tab キーでカードに移るとブラケットがそのカードに付き、リングは消え、900ms 後に枠が消えるとリングが戻る
  - DevTools のデバイスモード（タッチ）でタップしても `html[data-input]` が `touch` のまま（疑似マウスで `mouse` に戻らない）

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat(journal): AF-bracket cursor for mouse input with input-mode switching"
```

---

### Task 4: タッチ方式（合焦ライン・列切替・ピント送り・ブリージング・視差）

**Files:**
- Modify: `index.html`（CSS：タッチ方式の transition、ブリージング用の `position:relative`／JS：Journal の節）

**Interfaces:**
- Consumes: Task 1 の `focusLineY`, `pickFocus`, `columnCenter`, `clampCol`, `swipeStep`, `approach`, `breathScale`, `originToMouse`, `heroBlur`, `heroOpacity(dz,'touch')`, `blurAt`, `archiveOpacity`, `heroShift`, `archiveShift`, `inflate`, `isLocked`, `bracketLive`；Task 3 の `jInput()`, `jBr`, `jFocus`, `jHeroGroup`, `kick()`, `drawBracket()`, `tick()` の `tickTouch()` 呼び出し口
- Produces: `jCol`（選択中の列、初期 0、ページ表示中保持）、`jSwipe`（`{x0, c0, shift}`、指を置いている間のみ）、`jZv`（グループキー → 表示用ピント面）、`jOrigin`（`{x, y, tx, ty, w, h, key}`）

- [ ] **Step 1: CSS** — `#j-hero` と `.j-cols` に `position: relative`（ブリージングの中心をグループ座標で取るため）。`html[data-input="touch"] .j-hero-card, html[data-input="touch"] .j-card { transition: opacity .3s ease, transform .8s var(--ease-move) }`（`filter` は transition なし）。`html[data-input="touch"] #j-hero, html[data-input="touch"] .j-cols` は transform の transition なし（毎フレーム JS）

- [ ] **Step 2: 合焦ラインとカード選択** — `scroll`（passive）を rAF で間引いて `pickTouch()`：`lineY = focusLineY(scrollY, document.documentElement.scrollHeight, innerHeight)`。候補は表示中のヒーローカード（メインは `anyColumn: true`）＋表示中の `.j-card`（`getBoundingClientRect()`）。`n = jx.nc || 2`、`jCol = clampCol(jCol, n)`、`colX = columnCenter(jCol, n, 基準.left, 基準.width)`（基準 = `jField` の矩形、無ければ `{left: 0, width: innerWidth}`）。`pickFocus(…, current = 今のカードの index)` の結果が変わったら `jFocus` を更新し、グループの `zf` を設定（ヒーロー：idx／Archive：`jx.tg[year] = c._jz`、`jx.ay = year`）。グループが替わったら `jOrigin` を新カードの中心へ即座に、同じグループ内なら目標だけ更新。`jBr.last = now`、`kick()`。Journal 表示直後と `buildArchive()` の後にも `pickTouch()` を呼ぶ（`focusKey` のカードがフィルタで消えていればここで選び直す）

- [ ] **Step 3: 列切替とクリック取り消し** — `viewJournal` に `touchstart` / `touchmove` / `touchend`（すべて passive）。`touchstart`：`jSwipe = { x0, c0: jCol, shift: 0 }`、`jBr.holding = true`、`jBr.from = 指の位置`（ブラケットが opacity 0.03 未満のときの出現位置）、`jSwiped = false`、`last = now`、`kick()`。`touchmove`：`r = swipeStep(jSwipe, x, 12, n)`、`jBr.lean = r.lean`、`r.col !== jCol` なら `jCol = r.col; jSwiped = true; pickTouch()`。`touchend` / `touchcancel`：`holding = false`、`lean = 0`、`jSwipe = null`。`viewJournal` に capture の `click`：`jSwiped` なら `preventDefault()` と `stopPropagation()` をして `jSwiped = false`（動かさないタップは何もしない）

- [ ] **Step 4: ピント送り・描画（`tickTouch()`）** — 各グループ `jZv[key] = reduceMotion ? zf : approach(jZv[key] ?? zf, zf, 0.2, 0.01)`。中心 `jOrigin.x/y = approach(…, tx/ty, 0.2, 0.5)`（reduced motion は即値）。カードのスタイル（タッチ時は `renderJHero()` / `renderArchive()` の代わりにここで書く）：
  - アクティブでないグループ（ヒーロー含む）：`blur(1.8px)`、opacity 0.78、transform `none`
  - アクティブなヒーロー：`dz = |idx − zv|`、`blur(heroBlur(dz))`、`heroOpacity(dz, 'touch')`、`{mx, my} = originToMouse(jOrigin.x, jOrigin.y, w, h)`、`heroShift(idx, mx, my, px)`
  - アクティブな年：`dz = |z − zv|`、`blur(blurAt(dz, N))`、`archiveOpacity(dz, den)`、`archiveShift(z/den, mx, my, px)`
  - ブリージング：アクティブなグループのコンテナ（`#j-hero` か その年の `.j-cols`）に `scale(breathScale(zv, den))`（`px = 0` なら `none`）と `transform-origin: ${jOrigin.x}px ${jOrigin.y}px`。他のコンテナは `transform: none`
  - ステータス表示は README どおり（アクティブ年あり：`{year} · focus {distAt(zf/den)} · plane …`、ヒーローがアクティブ：`focus —`）
  - `jOrigin` の中心は `offsetLeft + offsetWidth/2`, `offsetTop + offsetHeight/2`（コンテナ座標）、`w/h` はコンテナの `offsetWidth/offsetHeight`
- 方式がマウスに替わったら、コンテナの transform を外し、`renderJHero()` / `renderArchive()` で今のマウス用スタイルに戻す。タッチに替わったら `pickTouch()`

- [ ] **Step 5: ブラケット（タッチ）** — 目標 = `inflate(focus カードの img 矩形, holding ? 6 : 10)`、x に `jBr.lean` を足す。`jBr.a < 0.03` で `bracketLive > 0` になった瞬間、枠を `jBr.from`（無ければカード中心）に 22×22 で置き、速度 0 から。opacity は `approach(a, live, live > a ? 0.35 : 0.18, 0.001)`、`live = bracketLive(now, last, holding)`。ラベル opacity は `approach(la, isLocked(cur, target) ? 1 : 0, 0.2, 0.001)`、距離 `distAt(zv/den)`（ヒーローは `den = 2`）。点（`#af-pt`）は出さない

- [ ] **Step 6: 検証** — Run: `node --test scripts/test/ && bundle exec jekyll build` → PASS／エラーなし。Chrome DevTools のデバイスモード（iPhone 12 Pro 390×844、タッチ）で `#/journal`：
  - スクロールだけで画面の 4 割あたりのカードにピントが合い、ボケが 0.2 係数で滑らかに移る。最下部までスクロールすると最後のカードにも合う
  - 指を置いて右へ 12px 以上ずらすと右列へ移り、6px 以内に戻しても右列のまま。ずらした後に指を離してもリンクが開かない。動かさないタップは 1 回で開く
  - 枠が指先の 22×22 から広がってカードにロックし、ラベルが出る。離すと 900ms 後に消える
  - アクティブでない年・ヒーローは少しボケて薄い。ピントの合ったカードを中心にグループがわずかに拡大する
  - フィルタを切り替えても例外が出ず、ブラケットが表示中のカードへ移る
  - `_posts` を一時的に 3 件以下にした build（または DevTools で `#j-archive` を削除してスクロール）でヒーローだけで動く
  - 「動きを減らす」をエミュレートすると視差・ブリージングが消え、ピントと枠は即座に移る
  - 実機（iOS Safari・Android Chrome）で同じ項目を確認できるなら確認する（できなければ、未確認であることを報告）

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(journal): focus line, relative column switch and breathing for touch input"
```

---

### Task 5: 2 列時レイアウトとドキュメント

**Files:**
- Modify: `index.html`（`@media (max-width: 679px)` の Journal 部分）
- Modify: `CLAUDE.md`（Overview の spec 一覧、Development Commands のテスト行、Main page の `#/journal` 節）

**Interfaces:**
- Consumes: なし（CSS とドキュメントのみ）

- [ ] **Step 1: 2 列時レイアウト** — 今の `/* Journal：狭幅ではヒーローを縦積み */` ブロックを FOCUS「レイアウト（タッチ方式・2 列のとき）」のヘッダー以外の値で置き換える：
  - `.j-hero`：`padding:0 20px`、縦 gap 22px（メインの下にサイド 2 枚の `display:grid; grid-template-columns:1fr 1fr; gap:14px`）。メイン `aspect-ratio:4/5`、テキスト `left/right/bottom:20px`、gap 10px、メタ 10px、タイトル 28px / 1.25。サイドの画像 `aspect-ratio:1/1`、カード内 gap 8px、タイトル 16px / 1.4
  - `.j-archive`：`padding:48px 20px 40px`、見出し 40px・`padding-bottom:10px`。`.j-tabs` は `flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none`（`::-webkit-scrollbar{display:none}`）、gap 22px、`.j-tab` は `min-height:44px`
  - `.j-year`：`padding-top:32px`、gap 20px、年 30px。`.j-cols.is-masonry` と `.j-col`：列 gap 14px、カード縦 gap 26px、カード内 gap 8px、`.j-card-title` 15px / 1.45
  - Journal のフッター：上罫 1px、`padding:28px 20px 80px`、10px
  - サイドの 2 枚を `.j-side` のまま 2 列グリッドにするため、`.j-side` に `display:grid; grid-template-columns:1fr 1fr; gap:14px`

- [ ] **Step 2: 検証** — Run: `bundle exec jekyll build` → エラーなし。390×844 のデバイスモードでプロトタイプ `design/JournalTouch.dc.html` と並べ、ヒーロー・Archive・フィルタ（横スクロール）・年見出し・カード・フッターの寸法が一致すること（ヘッダーは今のまま）。680px 以上の幅で変化がないこと

- [ ] **Step 3: `CLAUDE.md` 更新** — `#/journal` の説明を「filter tabs と Depth of field Off/On（`localStorage["journal-dof"]`）」から「filter tabs（被写界深度は常に On）」に。フォーカス操作の要点を 2〜3 行で追加：`html[data-input]`（mouse / touch、`pointerType` で切替）、マウス＝AF ブラケットのカーソル、タッチ＝合焦ライン＋相対列切替＋ブリージング、計算は `assets/js/journal-focus.js`（`window.JournalFocus`）でテストあり。「Blur is off on devices without hover」を削除。記事ページの節から `html[data-dof="off"]` の行を削除。Overview の spec 一覧に `docs/superpowers/specs/2026-11-journal-redesign/design_handoff_journal/`（README・FOCUS）と `docs/superpowers/specs/2026-11-21-journal-focus-design.md` を追加。Development Commands のテスト行を「unit tests for the post page and Journal focus maths」に

- [ ] **Step 4: Commit**

```bash
git add index.html CLAUDE.md
git commit -m "feat(journal): two-column layout values from the touch spec; update docs"
```
