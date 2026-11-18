# 記事ページ「シーン送り」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `_layouts/post.html` と `assets/js/post.js` を、旧「ピント送りの 2 カラム」から spec の「シーン送り」（1 スクロール = 写真 1 枚＋その文章）に置き換える。

**Architecture:** 初期 HTML は今と同じく JS なしで読める 1 カラムの記事（ページ全体がスクロール）。`post.js` が起動すると `.post-body` を写真の位置でシーン（`section.scene`）に区切り、`html.has-scenes` を付けてビューポート固定・文章欄（`.scenes`）だけスクロールに切り替える。シーンの位置合わせはブラウザ標準の scroll-snap に任せ、JS は計測（スペーサー・`edge`・長いシーン）と `data-d` / `data-long` などの属性付けだけを行い、見た目は CSS の属性セレクタで決める。数値計算は DOM に触れない純粋関数として `assets/js/post-scenes.js` に分け、`node --test` で検証する。

**Tech Stack:** Jekyll 4.3, Liquid, vanilla JS / CSS（依存追加なし）, Node 22（`node:test`、テスト専用）

**Spec:** `docs/superpowers/specs/2026-11-post-redesign/POST.md`（以下 spec。値はすべて確定値）。プロトタイプ `design/PostScene.dc.html`（デスクトップ 1280×880）/ `design/PostSceneMobile.dc.html`（390×844）は同じフォルダの `support.js` と一緒にブラウザで開いて挙動を確認できる。`design/Post.dc.html` は旧案なので実装しない。トークン・フォント・ヘッダー・ポップアップの前提は同フォルダの `README.md`。

## Global Constraints

- ブレークポイント **760px**（`max-width: 759px` がモバイル）。JS 側は既存の `matchMedia('(max-width: 759px)')` を使う
- 本文：Shippori Mincho 400、**17px / line-height 2.05**（デスクトップ・モバイル共通。現行モバイルの 16px は廃止）
- テーマ `localStorage.theme`、Depth of field `localStorage["journal-dof"]`（`<head>` のインラインスクリプトと `html[data-dof]` は現行のまま）
- URL（ハッシュ）はシーンごとに変えない
- front matter・`_includes/photo.html` の出力 HTML（`figure.post-photo` と `data-full` / `data-thumb` / `data-page` / `data-caption`）は変えない。Markdown の画像だけの段落も写真として扱う
- スクロール案内は **chevron のみ**。プロトタイプの `line` / `dot` / `label` / `nudge` / `box` と、テスト画面の prev / next・hint 表示は実装しない
- フォント追加なし、ライブラリ追加なし、`package.json` も作らない
- リンクは `{{ … | relative_url }}`、コメントは日本語、コードの書き方は現行 `post.js` / `post.html` に合わせる
- 作業ツリーにはユーザーの未コミットの記事・設定変更がある。**コミットは各タスクのファイルだけを `git add <path>` で指定**し、`git add -A` / `.` は使わない

## Review Focus

1. **写真が cover だけの記事**（Gear・News に多い。例 `_posts/2026-11-16-sigma_50_2.8_ex_dg_macro.md` 系）：シーンは「タイトル＋本文全体」と末尾の 2 つ。本文が長ければ長いシーンになり、進み具合の線が出て末尾マーカーで止まる。スクラバーは 1 本 → Task 1 `scenePhotos(0, true)`、Task 5 の確認項目
2. **写真が連続する／本文の先頭が写真**：文章の無いシーン（番号ラベルだけ）や、記事頭だけのシーン 0 ができても崩れずにスナップする → Task 1 `splitScenes` のテスト
3. **フォントの遅れ・ブレークポイントをまたぐリサイズ**：`document.fonts.ready` と `resize` でスペーサー・`edge`・長いシーンを計算し直し、今のシーン（`act`）を保ったまま中央に戻す。ステージの画像は `_k` ↔ `_c` に差し替える → Task 3 / Task 4 の確認項目
4. **読み込み直後のキーボード操作**：クリックせずに ↓ / Space / PageDown で 1 シーン進む（文章欄にフォーカスがある）→ Task 3 の確認項目
5. **cover も本文の写真も無い記事**：`has-scenes` を付けず、普通の 1 カラム記事のまま（エラーを出さない）→ Task 1 `scenePhotos(0, false)`、Task 3 の確認項目

---

## File Structure

| ファイル | 役割 |
|---|---|
| `assets/js/post-scenes.js`（新規） | DOM に触れない計算（シーン分割、写真の対応、`edge`、長いシーン判定、アクティブ判定、進み具合、スナップ位置、スクラバー位置、`data-d` の値）。ブラウザでは `window.PostScenes`、Node では `module.exports` |
| `scripts/test/post-scenes.test.cjs`（新規） | 上記の `node:test`。`scripts/` は Jekyll の `exclude` 済み |
| `_layouts/post.html` | マークアップと CSS（JS なしのフォールバック＋ `html.has-scenes` の画面） |
| `assets/js/post.js` | 起動・シーン組み立て・スクロール計測・ステージ・スクラバー・案内・ポップアップ（現行のテーマ切替とポップアップを流用） |
| `_includes/photo.html` | コメントのみ更新 |
| `CLAUDE.md`, `docs/templates/post.md`, `docs/superpowers/specs/2026-11-post-redesign/README.md` | ドキュメント更新 |

---

### Task 1: 計算モジュール `post-scenes.js`

**Files:**
- Create: `assets/js/post-scenes.js`
- Test: `scripts/test/post-scenes.test.cjs`

**Interfaces:**
- Produces（`window.PostScenes` / `module.exports`。すべて純粋関数）：
  - `splitScenes(isPhoto: boolean[]) -> number[][]` — `.post-body` の子要素ごとの「写真か」を受け、写真以外の要素の index をシーンごとにまとめる。長さは `1 + 写真の数`。`[0]` は最初の写真より前、`[k]` は k 枚目の写真の後ろ
  - `scenePhotos(nBodyPhotos: number, hasCover: boolean) -> number[]` — 末尾シーンも含む全シーンについて、ステージに出す写真の index（cover がある場合は cover = 0）
  - `edgeOf(H: number, mobile: boolean) -> number` — `Math.round(H × (mobile ? .12 : .14))`
  - `isLongScene(h: number, H: number, edge: number) -> boolean` — `h > H − 2·edge`
  - `activeScene(rects: {top:number,bottom:number}[], mid: number) -> number` — `mid` を含むシーン。どれも含まなければ上端・下端が `mid` にいちばん近いシーン（同点は先のもの）
  - `snapTop(top: number, h: number, H: number, edge: number, long: boolean, fromBelow: boolean) -> number` — そのシーンを見せるときの `scrollTop`（0 未満は 0）
  - `longProgress(scrollTop: number, top: number, h: number, H: number, edge: number) -> number` — 0〜100 の整数
  - `scrubIndex(x: number, left: number, width: number, n: number) -> number`
  - `sceneDepth(i: number, act: number) -> 0|1|2|3`、`stageDepth(i: number, shown: number) -> -1|0|1|2`
  - `shownPhoto(peek: number|null, target: number|null, actPhoto: number) -> number`

- [ ] **Step 1: 失敗するテストを書く**（`scripts/test/post-scenes.test.cjs`、`const S = require('../../assets/js/post-scenes.js')`）

```js
test('splitScenes', () => {
  assert.deepEqual(S.splitScenes([false, true, false, false, true]), [[0], [2, 3], []]);
  assert.deepEqual(S.splitScenes([true, true, false]), [[], [], [2]]); // 先頭が写真・写真が連続
  assert.deepEqual(S.splitScenes([false, false]), [[0, 1]]);            // cover だけの記事
  assert.deepEqual(S.splitScenes([]), [[]]);
});
test('scenePhotos：表紙 = 01、末尾は最後の写真のまま', () => {
  assert.deepEqual(S.scenePhotos(2, true), [0, 1, 2, 2]);
  assert.deepEqual(S.scenePhotos(0, true), [0, 0]);
  assert.deepEqual(S.scenePhotos(2, false), [0, 0, 1, 1]); // cover なし：シーン 0 は最初の写真を見せる
  assert.deepEqual(S.scenePhotos(0, false), []);           // 写真なし → シーン送りにしない
});
test('edgeOf / isLongScene', () => {
  assert.equal(S.edgeOf(700, false), 98);
  assert.equal(S.edgeOf(500, true), 60);
  assert.equal(S.isLongScene(504, 700, 98), false);
  assert.equal(S.isLongScene(505, 700, 98), true);
});
test('activeScene', () => {
  const r = [{ top: 0, bottom: 100 }, { top: 120, bottom: 300 }, { top: 320, bottom: 400 }];
  assert.equal(S.activeScene(r, 150), 1);
  assert.equal(S.activeScene(r, 110), 0); // 隙間：近い方（同点 10 なら先）
  assert.equal(S.activeScene(r, 318), 2);
});
test('snapTop', () => {
  assert.equal(S.snapTop(400, 200, 700, 98, false, false), 150); // 中央：400 + 100 − 350
  assert.equal(S.snapTop(400, 900, 700, 98, true, false), 302);  // 長い・上から：冒頭
  assert.equal(S.snapTop(400, 900, 700, 98, true, true), 714);   // 長い・下から：400 + 900 − 700 + 98 + 16
  assert.equal(S.snapTop(10, 100, 700, 98, false, false), 0);
});
test('longProgress', () => {
  assert.equal(S.longProgress(302, 400, 900, 700, 98), 0);
  assert.equal(S.longProgress(508, 400, 900, 700, 98), 50);
  assert.equal(S.longProgress(900, 400, 900, 700, 98), 100);
});
test('scrubIndex', () => {
  assert.equal(S.scrubIndex(10, 0, 112, 4), 0);
  assert.equal(S.scrubIndex(56, 0, 112, 4), 2);
  assert.equal(S.scrubIndex(200, 0, 112, 4), 3);
  assert.equal(S.scrubIndex(-5, 0, 112, 4), 0);
});
test('depth / shownPhoto', () => {
  assert.deepEqual([0, 1, 2, 5].map(i => S.sceneDepth(i, 0)), [0, 1, 2, 3]);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => S.stageDepth(i, 1)), [-1, 0, 1, 2, 2]);
  assert.equal(S.shownPhoto(3, 2, 1), 3);
  assert.equal(S.shownPhoto(null, 2, 1), 2);
  assert.equal(S.shownPhoto(null, null, 1), 1);
});
```

- [ ] **Step 2: 失敗を確認** — `node --test scripts/test/*.test.cjs` → `Cannot find module '../../assets/js/post-scenes.js'`
- [ ] **Step 3: `assets/js/post-scenes.js` を実装** — IIFE で関数群を作り、`if (typeof module === 'object' && module.exports) module.exports = api; else window.PostScenes = api;`。式は Interfaces と spec「スナップ」「進み具合の線」の表のとおり
- [ ] **Step 4: 通過を確認** — `node --test scripts/test/*.test.cjs` → `# pass 8` `# fail 0`
- [ ] **Step 5: Commit** — `git add assets/js/post-scenes.js scripts/test/post-scenes.test.cjs && git commit -m "feat(post): add pure scene-step helpers with node tests"`

---

### Task 2: レイアウトのマークアップと JS なしのフォールバック

**Files:** Modify: `_layouts/post.html`（`<body>` 全体と、旧 2 カラム用の CSS）

**Interfaces:**
- Produces（Task 3〜5 が使う id / class）：
  - `#post`（ルート）、`.post-text-col` > `header.post-header`（`.brand`、モバイル用 `.site-nav`）＋ `#scenes-wrap.scenes-wrap` > `#scenes.scenes`（`tabindex="0"`、`aria-label="本文。スクロールで 1 シーンずつ進みます"`）
  - `#scenes` の中（初期状態）：`.post-head`（meta・`h1.post-title`・`.post-lead`・`.post-gear`）、`figure.post-cover-fallback`（cover の `<img>`。JS が外す）、`article#post-body.post-body`、`.post-foot`
  - `#scenes-wrap` の中：`#scene-progress.scene-progress`（`aria-hidden`、中に `.scene-progress-fill` と `.scene-progress-end`）、`#scroll-cue.scroll-cue`（`aria-hidden`、spec の SVG）
  - `aside#stage-col.stage-col[hidden]` > `nav.site-nav.stage-nav` ＋ `#stage.stage`（cover の `data-cover` / `data-cover-thumb` / `data-cover-page` / `data-cover-caption` は現行のまま）＋ `.stage-bar` > `#stage-no` / `#stage-cap` / `#scrubber.scrubber`
  - ポップアップは現行の `#lightbox` 一式に、全面の `<button type="button" class="lb-backdrop" id="lb-backdrop" aria-label="拡大表示を閉じる">` を先頭に追加
  - `<script>` は `post-scenes.js` → `post.js` の順に両方 `defer`
- 機材行は `.post-gear`（現行の Liquid をそのまま移す）。モバイルでは非表示
- ヘッダー nav：デスクトップは右カラムの `.stage-nav`（Gallery / Journal（`is-current`）/ About / IG ＋テーマ `Light`/`Dark`）。モバイルの `.post-header` 内 nav は **About ＋テーマの丸（ラベルなし、44×44）だけ**。JS なしのデスクトップでは `.post-header` 内に全項目を出す（現行の `.wide-only` の使い方を流用）

- [ ] **Step 1: マークアップを上記の構造に組み替え、旧 `.photo-mark` / `.stage-ticks` / 旧 2 カラム（`html.has-stage …`）の CSS を削除する。** フォールバックの CSS は現行の 1 カラム（`.post` 幅 716px、記事頭・本文・末尾）を流用し、本文の書体を Global Constraints の値にする
- [ ] **Step 2: ビルド確認** — `bundle exec jekyll build` → エラーなし。`grep -c 'id="scenes"' _site/2026/11/16/*/index.html` などで生成物に構造が出ていること
- [ ] **Step 3: JS なしの表示確認** — `bundle exec jekyll serve` でブラウザの JavaScript を無効にして任意の記事を開く → ヘッダー、記事頭、cover、本文中の写真（figure）、末尾が 1 カラムで上から流れ、ページ全体がスクロールする。デスクトップ幅・390px 幅の両方
- [ ] **Step 4: Commit** — `git add _layouts/post.html && git commit -m "feat(post): restructure post layout for scene stepping"`

---

### Task 3: シーンの組み立てとスクロール（文章欄）

**Files:** Modify: `assets/js/post.js`, `_layouts/post.html`（`html.has-scenes` の CSS）

**Interfaces:**
- Consumes: Task 1 の `PostScenes.*`、Task 2 の id / class
- Produces（Task 4・5 が使う、`post.js` の IIFE 内の状態と関数）：
  - `photos: {full, thumb, page, caption}[]`（現行の収集処理を流用。cover が先頭）
  - `scenes: HTMLElement[]`（`section.scene[data-scene]`、末尾シーンを含む）、`photoOf: number[]`（= `scenePhotos(...)`）
  - `act: number`、`long: Set<number>`、`edge: number`
  - `goScene(i: number, smooth: boolean, fromBelow: boolean): void` — `snapTop` の位置へ `scenes` 欄を `scrollTo`（`prefers-reduced-motion` では常に `behavior:"auto"`）
  - `onActChange: (() => void)[]` — `act` が変わったときに呼ぶフック（Task 4 のステージ更新用）

- [ ] **Step 1: 組み立て（spec「JS の処理」1・2・4・6）** — `#post-body` の子要素を `splitScenes` で分け、写真要素は本文から外して `photos` に積む。シーン 0 = `.post-head` ＋ `groups[0]`、シーン k = 番号ラベル（`<span class="scene-no">`、中身は `pad(photoOf[k] + 1)`。罫は `::before`）＋ `groups[k]`、最後に `.post-foot` を末尾シーン（`.scene-end`）として包む。`.post-cover-fallback` を外し、先頭・末尾にスペーサー（`.scene-spacer`）を入れる。`scenePhotos` が空なら何もせず return（Review Focus 5）。最後に `html.has-scenes` を付ける
- [ ] **Step 2: 計測 `measure()`** — `H = scenes.clientHeight`、スペーサー高さ `round(H/2)`、`edge = edgeOf(H, mqMobile.matches)`、各シーンに `isLongScene` で `data-long` を付け外しし、長いシーンの末尾に `.scene-end-mark`（`aria-hidden`）を出し入れする。`scroll-margin` は CSS 変数 `--edge`（`#scenes` に px で設定）から算出。実行タイミング：起動時、`document.fonts.ready`、`resize`。実行後は `goScene(act, false, false)` で今のシーンを戻す
- [ ] **Step 3: アクティブ判定** — `scroll` を rAF で間引き、`activeScene`（`mid` = 文章欄の中央）。変わったときだけ各シーンに `data-d = sceneDepth(i, act)` を付け、`onActChange` を呼ぶ。長いシーンのときは `longProgress` で `.scene-progress-fill` の高さと `.scene-progress-end` の塗り（100 で `--ink`）、`#scene-progress` の表示を更新
- [ ] **Step 4: スクロール案内** — 1 秒後に表示可、`act === 0` の間だけ `html.cue-on`（または `#scroll-cue` の属性）。一度でも `act > 0` になったら二度と出さない
- [ ] **Step 5: CSS（`html.has-scenes` 配下）** — spec「画面構成」「文章欄」「シーンの中身」「スナップ」「ピント」「進み具合の線」「スクロール案内」の値をそのまま。ビューポート固定（`html,body{height:100%}`、ルート `height:100dvh; min-height:560px; overflow:hidden`）、デスクトップは 2 カラムの grid、モバイルはヘッダー → 写真欄 → 文章欄の縦 flex。`.scenes` のマスクはモバイル 11% / 89%。スナップは `.scene` / `.scene[data-long]` / `.scene-end-mark` の 3 種を属性セレクタで。`html[data-dof="off"]` で blur 0。`#scenes:focus-visible` のアウトラインは出さない
- [ ] **Step 6: キーボード** — 起動時に `scenes.focus({ preventScroll: true })`（Review Focus 4）
- [ ] **Step 7: ブラウザ確認**（`bundle exec jekyll serve`、1280×880 と 390×844、プロトタイプと並べて）
  - ホイール・トラックパッドを強く払っても 1 シーンずつ進む。前後のシーンが上下にボケて覗く
  - 読み込み直後にクリックせず ↓ / Space / PageDown で進む
  - 長いシーン：冒頭で止まり、欄内を自由に読め、強く払っても末尾で止まる。左の線が伸び、末尾で丸が塗られる。下から戻ると末尾が見える位置で止まる
  - cover だけの記事（Review Focus 1）、写真が連続する記事（Review Focus 2）
  - DevTools で幅を 760px の前後に変える／ページ表示直後にリロードしてフォントが遅れても、今のシーンが中央に戻る（Review Focus 3）
  - Depth of field Off（一覧で切り替え）でボケが消える
- [ ] **Step 8: Commit** — `git add assets/js/post.js _layouts/post.html && git commit -m "feat(post): step through scenes with scroll snap"`

---

### Task 4: ステージとスクラバー

**Files:** Modify: `assets/js/post.js`, `_layouts/post.html`（ステージ・スクラバーの CSS）

**Interfaces:**
- Consumes: Task 3 の `photos` / `photoOf` / `act` / `goScene` / `onActChange`、Task 1 の `stageDepth` / `shownPhoto` / `scrubIndex`
- Produces: `openPop(p)`（現行関数）をステージの写真ボタンから呼ぶ

- [ ] **Step 1: ステージ** — 写真ごとに `<button type="button" class="stage-photo">` ＋ `<img>`。`shown = shownPhoto(peek, target, photoOf[act])`、`data-d = stageDepth(i, shown)`。`data-d="0"` だけ `tabindex=0`、他は `-1`。`src` は `|d| ≤ 1` になったときに初めて入れる（現行の遅延読み込みを維持）、デスクトップ `_k`（`full`）/ モバイル `_c`（`thumb`）、ブレークポイントをまたいだら読み込み済みを差し替え（現行の `mqMobile` の change 処理を流用）。`#stage-no` = `{shown+1 の 2 桁} / {総数 2 桁}`、`#stage-cap` = caption。重なりの表と transition（スクラバーで見ている間は `.3s`：`html.is-peeking` などで切替）は spec「ステージ」の表を CSS 属性セレクタで。Depth of field Off は blur 0 で opacity・transform は表のまま（現行の「Off で d=1 を消す」ルールは削除）
- [ ] **Step 2: スクラバー** — 写真ごとに `<button type="button" aria-label="写真 {nn}「{caption}」のシーンへ">` ＋ 線の `<span>`。線は通常 1px、見ている写真 3px、opacity は表示中 1 / アクティブなシーンの写真 .55 / 他 .22。サイズはデスクトップ 28×44px（`margin:-14px 0`）、モバイルは横幅いっぱい・高さ 40px（`margin:-4px -3px 0`、各 `flex:1`）
- [ ] **Step 3: ポインタ操作** — `#scrubber` に Pointer Events をまとめて付ける（`touch-action:none; user-select:none`）。マウス：ホバー中は `peek = scrubIndex(...)`、離れたら `peek = null`、クリックで移動。タッチ：`pointerdown` で `setPointerCapture`、なぞる間 `peek`、`pointerup` の位置へ移動、`pointercancel` で `peek = null`。ポインタで移動した直後 400ms は button の `click` を無視。キーボード：button の Enter / Space（＝`click`）で移動
- [ ] **Step 4: 移動 `jumpPhoto(i)`** — `photoOf` の中で `i` を持つ最初のシーン（末尾シーンを除く）へ `goScene(k, true, false)`。今の写真と違えば `target = i` にしてステージを固定し、`act` の写真が `target` に着いたら（`onActChange` 内）または 1.8 秒で `target = null`
- [ ] **Step 5: ブラウザ確認**（1280×880 / 390×844）
  - シーンが替わるとピント送りで写真が入れ替わる。番号・キャプションも追従
  - デスクトップ：スクラバーにホバーで写真だけが替わり文章は動かない、外すと戻る、クリックでそのシーンへ滑らかに移動し、途中でステージが行き先から戻らない
  - モバイル（DevTools のタッチ）：なぞる間だけ写真が替わり、離した位置のシーンへ移動。二重に動かない
  - Tab でスクラバーのボタンに移り Enter で移動
  - 760px をまたいで画像サイズが差し替わる（Review Focus 3）
- [ ] **Step 6: Commit** — `git add assets/js/post.js _layouts/post.html && git commit -m "feat(post): add photo stage and scrubber for scenes"`

---

### Task 5: ポップアップの調整と「動きを減らす」設定

**Files:** Modify: `assets/js/post.js`, `_layouts/post.html`

**Interfaces:**
- Consumes: 現行の `openPop` / `closePop` / `setTilt`、Task 4 のステージの写真ボタン

- [ ] **Step 1: ポップアップ** — spec「ポップアップ」との差分だけ直す：全面の `#lb-backdrop` クリックで閉じる（現行の `#lightbox` 全体のクリックで閉じる処理は backdrop と × に置き換え、View on Flickr の `stopPropagation` は維持）、× ボタン（`#lb-close`）に `closePop` を付ける、キャプション 18px、表示中は `html.lb-open .scenes{overflow:hidden}` で文章欄をスクロールさせない、閉じたらフォーカスを開いたステージの写真ボタンに戻す。傾き（デスクトップのみ ±15°）・ホログラム・グレアは現行のまま
- [ ] **Step 2: `prefers-reduced-motion: reduce`** — スクロール案内の bob を止める、ステージの transform を none（opacity のみ切替）、`goScene` の smooth を `auto` に（Task 3 で実装済みか確認）
- [ ] **Step 3: ブラウザ確認**
  - 写真クリック → ポップアップ。背景クリック／× ／Esc で閉じる。表示中にホイールしても文章欄が動かない。閉じたあと ↓ キーでシーンが進む
  - モバイル幅で傾かない
  - macOS の「視差効果を減らす」を On にして、矢印が揺れず、写真がずれずにフェードで替わる
  - cover も本文の写真も無い記事（一時的に front matter から `image` を消した記事でよい。確認後に戻す）で 1 カラムのまま、コンソールにエラーなし（Review Focus 5）
- [ ] **Step 4: Commit** — `git add assets/js/post.js _layouts/post.html && git commit -m "feat(post): adapt lightbox and reduced motion to scene layout"`

---

### Task 6: ドキュメント更新

**Files:**
- Modify: `CLAUDE.md`（Overview の spec パスに `2026-11-post-redesign/POST.md` を追加し、「Blog posts」の節を新しい仕組みに書き換え。Development Commands に `node --test scripts/test/*.test.cjs` を追加）
- Modify: `_includes/photo.html`（冒頭コメント「番号マーカーに置き換わり」→「シーンの区切りになり、写真はステージ側に出る」）
- Modify: `docs/templates/post.md`（執筆ガイドに「写真ごとにシーンが区切られる」「1 シーンの文章はデスクトップ約 700 字、モバイル約 260 字が目安。超えても読めるが長いシーンになる」を追記）
- Modify: `docs/superpowers/specs/2026-11-post-redesign/README.md` 冒頭の「配置について」を、実際の配置（`2026-11-post-redesign/`）に合わせる

- [ ] **Step 1: 上記を更新する。** CLAUDE.md の「Blog posts」は 1 段落＋箇条書き数行の現行の粒度で：`html.has-scenes`、シーン分割、scroll-snap、`data-d` / `data-long`、スクラバー、`post-scenes.js` の役割
- [ ] **Step 2: 最終確認** — `node --test scripts/test/*.test.cjs` → `# fail 0`。`bundle exec jekyll build` → エラーなし、`_site/docs` と `_site/scripts` が無い
- [ ] **Step 3: Commit** — `git add CLAUDE.md _includes/photo.html docs/templates/post.md docs/superpowers/specs/2026-11-post-redesign docs/superpowers/plans/2026-11-19-post-scenes.md && git commit -m "docs: describe scene-stepping post page"`
