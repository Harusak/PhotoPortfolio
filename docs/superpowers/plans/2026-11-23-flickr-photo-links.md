# Flickr 写真リンクの自動解決と写真ピッカー Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 記事に Flickr の写真ページ URL を書くだけで、大サイズ・モバイル用サイズ・View on Flickr が自動で決まるようにし、Photostream から写真を選んで記事用コードをコピーできるローカル専用ピッカーを作る。

**Architecture:** `scripts/fetch-flickr.mjs` が `_posts/*.md` から Flickr の URL を集め、`getSizes` / `getInfo` の結果を `_data/flickr_photos.json`（コミットするキャッシュ）に書く。テンプレートは新しい include `flickr-resolve.html` でこのデータを引き、`photo.html`・`post.html`・`index.html` が解決後の URL を使う。ピッカーは依存なしの Node サーバーが API を中継し、素の HTML + JS の画面を配信する。

**Tech Stack:** Jekyll 4.3 / Liquid、Node 20.12+（開発環境は 22.11、依存なし、ESM）、`node:test`、vanilla JS。

**Spec:** `docs/superpowers/specs/2026-11-23-flickr-photo-links-design.md`

## Global Constraints

- Node スクリプトは依存なし。`.env` は `process.loadEnvFile(".env")`（既存の環境変数が優先）。Ruby のプラグインは入れない。
- 失敗時は既存のデータファイルを残す。gallery と記事写真の処理は独立させ、どちらかが失敗してももう片方は実行されてファイルを書く。
- すべてのリンクは `relative_url` を通す（`/assets/…` の画像はこれまでどおり動く。http の URL はそのまま）。
- `postSizes` 既定値：`{ "full": ["3k", "k", "h", "b"], "thumb": ["c", "z", "b"] }`。
- Flickr のタイトルをキャプションに自動で使わない。
- ピッカーは `127.0.0.1` にだけ bind、既定ポート `4100`（`PORT` で変更可）。公開サイトには載せない。
- コメントは日本語。
- 作業ツリーには利用者の未コミットの変更（`_posts/` の新規記事、`.gitignore`、`_config.yml`）がある。**コミットは各タスクで挙げたファイルだけを `git add` する**（`git add -A` / `git add .` 禁止）。`CLAUDE.md` は gitignore 対象なので編集のみでコミットしない。
- コミットメッセージの末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける。

## Review Focus

1. **テンプレートの見本文（`XXXXXXXXXXX`）や Flickr 以外の画像（note.com の cover、`/assets/…`）が混ざった記事**：何も解決せず、今と同じ表示のまま。→ Task 1 `extractFlickrRefs` のテスト、Task 3 の確認手順。
2. **同じ写真の URL の書き方の揺れ**（末尾スラッシュなし、`/in/album-…/`、`http://`、ユーザー名エイリアス `/photos/hal_sakaguchi/<ID>/`、`?` 付き、`photo.gne?id=`）：すべて同じ ID になり、書かれた文字列それぞれが `urls` に入る。→ Task 1。
3. **同じ写真を複数の記事・複数の書き方で参照**：写真は 1 件、URL はすべて登録、どれか 1 記事が参照している限り消えない。→ Task 1 `updateCache`。
4. **API が途中で失敗する（削除済み写真の `Photo not found`、ネットワーク断）**：失敗した写真だけ未解決、前回キャッシュにあればそれを残し、ほかは保存される。→ Task 1 `updateCache`、Task 2 `fetchEntries`。
5. **希望サイズが無い写真**（古い写真で `_b` まで、`_3k` が無い）：`postSizes` の次の候補に落ちる。どれも無ければ `getSizes` の最大サイズ。→ Task 1 `pickSize`。

---

### Task 1: URL 抽出とキャッシュ計算の純粋関数

**Files:**
- Create: `scripts/lib/flickr-links.mjs`
- Test: `scripts/test/flickr-links.test.mjs`

**Interfaces:**
- Produces（すべて named export）:
  - `extractFlickrRefs(text: string) -> Array<{ url: string, id: string }>` — 出現順、同じ `url` 文字列は 1 回だけ。
  - `sizesFromApi(getSizesJson) -> { [suffix: string]: { src, w, h } }` — suffix は `source` URL の末尾（`_c` → `"c"`、末尾なし → `""`）。
  - `pickSize(sizes, prefs: string[]) -> { src, w, h } | null` — prefs の先頭から存在するもの。無ければ `w` 最大のもの。`sizes` が空なら `null`。
  - `buildEntry(getSizesJson, getInfoJson, postSizes) -> { page, title, full, thumb, w, h }` — `w`/`h` は full の寸法。`page` は getInfo の `urls.url[type=photopage]._content`。
  - `missingIds(prev, refsByPost, refresh: boolean) -> string[]` — `refsByPost: { [postPath]: Array<{url,id}> }`。
  - `updateCache(prev, refsByPost, fetched: { [id]: entry }, now: string) -> { generatedAt, photos, urls, posts }`
  - `mergePhotos(prev, fetched: { [id]: entry }, extraUrls: { [url]: id }, now: string) -> 同じ形`（ピッカー用。何も削除しない）
  - `DEFAULT_POST_SIZES = { full: ["3k","k","h","b"], thumb: ["c","z","b"] }`

- [ ] **Step 1: 失敗するテストを書く**

`scripts/test/flickr-links.test.mjs`（`import test from 'node:test'`、`assert/strict`）：

```js
test('extractFlickrRefs：書き方の揺れ', () => {
  const t = `
cover: "https://www.flickr.com/photos/194776399@N02/55655753948/in/photostream/"
{% include photo.html flickr="https://www.flickr.com/photos/hal_sakaguchi/55654636627" %}
![x](https://live.staticflickr.com/65535/55608378043_af521b621f_4k.jpg)
http://www.flickr.com/photos/194776399@N02/111/?foo=1
https://www.flickr.com/photo.gne?id=222
`;
  assert.deepEqual(extractFlickrRefs(t).map(r => r.id), ['55655753948', '55654636627', '55608378043', '111', '222']);
  assert.equal(extractFlickrRefs(t)[0].url, 'https://www.flickr.com/photos/194776399@N02/55655753948/in/photostream/');
});

test('extractFlickrRefs：拾わないもの', () => {
  const t = `https://live.staticflickr.com/65535/XXXXXXXXXXX_yyyyyyyyyy_k.jpg
https://www.flickr.com/photos/194776399@N02/albums/72177720312345678
https://www.flickr.com/
https://assets.st-note.com/production/uploads/images/1/a.jpg
https://www.flickr.com/photo.gne?id=XXXXXXXXXXX`;
  assert.deepEqual(extractFlickrRefs(t), []);
});

test('extractFlickrRefs：同じ文字列は 1 回', () => {
  const u = 'https://www.flickr.com/photos/a/1/';
  assert.equal(extractFlickrRefs(`${u} ${u}`).length, 1);
});
```

URL の終わりは空白・`"`・`'`・`)`・`<`・`>`・行末。`/photos/<user>/<id>` の `<id>` は数字のみ（`albums` 等は不一致）。

`sizesFromApi` / `pickSize` / `buildEntry`：調査で得た写真 55655753948 の実データを fixture にする（`getSizes` の `size` 配列は `{label,width,height,source}`。`s q t m n w "" z c b` は secret `5c822c9b38`、`_h` `8a0ff6e906`、`_k` `bf871d9a71`、`_3k` `e18dee666e`（3072×1728）、`_4k` `7c06593c23`、`_o` `8a94f2bb27`）。

```js
test('buildEntry：既定サイズ', () => {
  const e = buildEntry(SIZES_55655753948, INFO_55655753948, DEFAULT_POST_SIZES);
  assert.equal(e.full, 'https://live.staticflickr.com/65535/55655753948_e18dee666e_3k.jpg');
  assert.equal(e.thumb, 'https://live.staticflickr.com/65535/55655753948_5c822c9b38_c.jpg');
  assert.deepEqual([e.w, e.h], [3072, 1728]);
  assert.equal(e.title, 'Timeline 3_00086400');
  assert.equal(e.page, 'https://www.flickr.com/photos/194776399@N02/55655753948/');
});

test('pickSize：候補が無ければ次、全部無ければ最大', () => {
  const s = { b: { src: 'B', w: 1024, h: 768 }, c: { src: 'C', w: 800, h: 600 } };
  assert.equal(pickSize(s, ['3k', 'k', 'h', 'b']).src, 'B');
  assert.equal(pickSize({ o: { src: 'O', w: 4000, h: 3000 }, m: { src: 'M', w: 240, h: 180 } }, ['3k']).src, 'O');
  assert.equal(pickSize({}, ['c']), null);
});
```

`updateCache` / `missingIds` / `mergePhotos`：

```js
const E = id => ({ page: `p${id}`, title: '', full: `f${id}`, thumb: `t${id}`, w: 1, h: 1 });
const refs = {
  '_posts/a.md': [{ url: 'U1', id: '1' }, { url: 'U1b', id: '1' }, { url: 'U2', id: '2' }],
  '_posts/b.md': [{ url: 'U1c', id: '1' }]
};

test('missingIds：キャッシュに無い ID だけ、refresh なら全部', () => {
  const prev = { photos: { 1: E('1') }, urls: {}, posts: {} };
  assert.deepEqual(missingIds(prev, refs, false), ['2']);
  assert.deepEqual(missingIds(prev, refs, true).sort(), ['1', '2']);
  assert.deepEqual(missingIds(null, refs, false).sort(), ['1', '2']);
});

test('updateCache：同じ写真の複数 URL・複数記事、参照されない写真は消す', () => {
  const prev = { photos: { 1: E('1'), 9: E('9') }, urls: { U9: '9' }, posts: {} };
  const next = updateCache(prev, refs, { 2: E('2') }, 'NOW');
  assert.deepEqual(Object.keys(next.photos).sort(), ['1', '2']);
  assert.deepEqual(next.urls, { U1: '1', U1b: '1', U2: '2', U1c: '1' });
  assert.deepEqual(next.posts, { '_posts/a.md': ['1', '2'], '_posts/b.md': ['1'] });
  assert.equal(next.generatedAt, 'NOW');
});

test('updateCache：取得に失敗した写真は未解決（urls / posts に入れない）、前回分は残す', () => {
  const next = updateCache({ photos: { 1: E('1') }, urls: {}, posts: {} }, refs, {}, 'NOW');
  assert.deepEqual(Object.keys(next.photos), ['1']);
  assert.equal(next.urls.U2, undefined);
  assert.deepEqual(next.posts['_posts/a.md'], ['1']);
});

test('mergePhotos：追加だけで削除しない', () => {
  const prev = { photos: { 9: E('9') }, urls: { U9: '9' }, posts: { '_posts/x.md': ['9'] } };
  const next = mergePhotos(prev, { 3: E('3') }, { U3: '3' }, 'NOW');
  assert.deepEqual(Object.keys(next.photos).sort(), ['3', '9']);
  assert.deepEqual(next.urls, { U9: '9', U3: '3' });
  assert.deepEqual(next.posts, prev.posts);
});
```

- [ ] **Step 2: 失敗を確認**

Run: `node --test scripts/test/`
Expected: `flickr-links.test.mjs` が import エラーで FAIL、既存の 2 ファイルは PASS。

- [ ] **Step 3: `scripts/lib/flickr-links.mjs` を実装**

正規表現 3 種（写真ページ `https?://(www\.)?flickr\.com/photos/[^/\s"'<>)]+/(\d+)…`、画像 `https?://live\.staticflickr\.com/\d+/(\d+)_[0-9a-f]+(_[a-z0-9]+)?\.(jpg|png|gif)`、`https?://(www\.)?flickr\.com/photo\.gne\?id=(\d+)`）でテキスト全体を走査し、出現位置順に並べる。

- [ ] **Step 4: 通過を確認**

Run: `node --test scripts/test/`
Expected: 全テスト PASS。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/flickr-links.mjs scripts/test/flickr-links.test.mjs
git commit -m "feat(flickr): pure helpers to extract photo refs and build the post photo cache"
```

---

### Task 2: API クライアントの切り出しと記事写真の取得

**Files:**
- Create: `scripts/lib/flickr-api.mjs`、`scripts/lib/post-photos.mjs`
- Modify: `scripts/fetch-flickr.mjs`（`call` / `paged` / env 読み込みを lib へ移し、gallery と記事写真を独立に実行）、`flickr.config.json`（`postSizes` を追加）
- Create（生成物・コミット）: `_data/flickr_photos.json`

**Interfaces:**
- Consumes: Task 1 の全 export。
- Produces:
  - `flickr-api.mjs`: `loadEnv() -> { key, user }`（`.env` 読み込み込み）、`call(method, params) -> json`（`stat !== "ok"` で throw、メッセージ `${method}: ${code} ${message}`）、`paged(method, params, key) -> any[]`、`loadConfig() -> object`（`flickr.config.json`、無ければ `{}`）。`call` / `paged` は既存実装をそのまま移す。キーは `loadEnv()` の値を使う。
  - `post-photos.mjs`:
    - `CACHE_PATH = "_data/flickr_photos.json"`
    - `readCache() -> cache | null`（無い・壊れている → `null`）
    - `writeCache(cache)`（2 スペース整形 + 末尾改行）
    - `fetchEntries(ids: string[], postSizes) -> { fetched: {[id]: entry}, failed: Array<{id, error}> }` — 1 件ずつ `getSizes` + `getInfo`、並列 4。失敗は `failed` に入れて続行。
    - `scanPosts(dir = "_posts") -> refsByPost` — キーは `_posts/<ファイル名>`（Jekyll の `page.path` と同じ形）。
    - `resolvePostPhotos({ refresh = false } = {}) -> { cache, failed, unresolved: Array<{url, post}> }` — 読み込み → `missingIds` → `fetchEntries` → `updateCache` → `writeCache`。
    - `addPhotos(items: Array<{ id, url }>) -> { resolved: string[], failed: string[] }` — ピッカー用。キャッシュに無い ID だけ取得し `mergePhotos` で書く。

- [ ] **Step 1: lib を作り `fetch-flickr.mjs` を書き換える**

`fetch-flickr.mjs` は `gallery()`（今の `main()` の中身）と `resolvePostPhotos({ refresh: process.argv.includes("--refresh") })` を **別々の try/catch** で順に実行する。それぞれの失敗は今と同じ `console.warn` 形式（`[fetch-flickr] … — 既存の … を使用します`）。キー未設定なら両方ともスキップして警告。記事写真の結果はログに `wrote _data/flickr_photos.json: <写真数> photos (<新規> new, <失敗> failed)`、未解決の URL は 1 件ずつ `[fetch-flickr] 未解決: <URL>（<記事パス>）`。`flickr.config.json` に `"postSizes": { "full": ["3k", "k", "h", "b"], "thumb": ["c", "z", "b"] }` を追加（無いときは `DEFAULT_POST_SIZES`）。

- [ ] **Step 2: 実 API で確認**

Run: `node scripts/fetch-flickr.mjs && node -e 'const d=require("./_data/flickr_photos.json");console.log(d.photos["55655753948"])'`
Expected: gallery の `wrote _data/gallery.json…` と `wrote _data/flickr_photos.json…` の両方が出る。55655753948 の `full` が `…_e18dee666e_3k.jpg`、`thumb` が `…_5c822c9b38_c.jpg`。`git diff --stat _data/gallery.json` は日時など取得結果の差分だけ。

- [ ] **Step 3: 失敗時の独立性を確認**

Run: `FLICKR_USER_ID=0 node scripts/fetch-flickr.mjs`
Expected: gallery は警告で既存を使用。記事写真は（キーは有効なので）成功し `wrote _data/flickr_photos.json` が出る。続けて `FLICKR_API_KEY=bad node scripts/fetch-flickr.mjs` で両方が警告になり、どちらのファイルも変わらない（実行前後で `md5 _data/gallery.json _data/flickr_photos.json` を比べる）。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test scripts/test/`
Expected: 全 PASS。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/flickr-api.mjs scripts/lib/post-photos.mjs scripts/fetch-flickr.mjs flickr.config.json _data/flickr_photos.json _data/gallery.json
git commit -m "feat(flickr): resolve photo URLs used in posts into _data/flickr_photos.json"
```

---

### Task 3: テンプレートで解決する（photo.html / post.html / index.html）

**Files:**
- Create: `_includes/flickr-resolve.html`
- Modify: `_includes/photo.html`、`_layouts/post.html:8-9`（cover の決定）・`:1070-1073`（JS なしの cover）・`:1112`（ステージの data 属性）、`index.html:1240-1241` と `:1291-1292`（Journal カード）、`docs/templates/post.md`（cover と写真の書き方）

**Interfaces:**
- Consumes: Task 2 の `_data/flickr_photos.json`（`photos` / `urls`）。
- Produces: `{% include flickr-resolve.html url=X %}` は次の変数を**呼び出し元に assign する**（Jekyll の include は変数を共有する）。呼び出すたびに全変数を上書きする。
  - `fr_kind`：`""`（url が空）／`"flickr"`（データで解決）／`"missing"`（Flickr の写真ページ URL・`photo.gne` だがデータに無い）／`"plain"`（それ以外。データに無い `live.staticflickr.com` もここ）
  - `fr_full`：写真ページ URL なら `entry.full`、直接の画像 URL なら書かれた URL のまま、plain なら `url | relative_url`、missing なら `""`
  - `fr_thumb`：flickr なら `entry.thumb`、plain なら `fr_full`、missing なら `""`
  - `fr_page`：flickr なら `entry.page`、missing なら書かれた URL、plain なら `""`
  - `fr_title`：flickr なら `entry.title`、それ以外 `""`
  - 判定：`site.data.flickr_photos.urls[url]` で ID を引く。写真ページかどうかは `url contains "flickr.com/photos/"` または `"flickr.com/photo.gne"`。

- [ ] **Step 1: `flickr-resolve.html` を作り、`photo.html` を書き換える**

`photo.html` の引数は `flickr` / `src` / `thumb` / `page` / `caption`。`include.flickr | default: include.src` を解決し、明示の `thumb`（`relative_url` を通す）・`page` はデータより優先。`fr_kind == "missing"` なら figure を出さず `<p class="post-flickr-link"><a href="{{ fr_page | escape }}" target="_blank" rel="noopener">{{ include.caption | default: "Flickr で見る" | escape }} ↗</a></p>`。先頭コメントに `flickr` 引数を追記。

- [ ] **Step 2: `post.html` の cover を書き換える**

`page.cover` を解決し、`fr_kind` が `""` か `"missing"` なら `page.image` を解決し直す。それでも `fr_full` が空なら cover なし。`post_cover = fr_full`、`post_cover_thumb = page.cover_thumb | relative_url`（無ければ `fr_thumb`）、`post_cover_page = page.cover_page`（無ければ `fr_page`）。ステージの `data-cover-page` は `post_cover_page` を使う。cover の解決は `<head>` 先頭の今の位置で 1 回だけ行い、本文の include より前に値を確定させる（include が `fr_*` を上書きするため、`post_*` 変数に移しておく）。

- [ ] **Step 3: `index.html` の Journal カードを書き換える**

2 か所とも同じ手順：`post.cover` → 未解決なら `post.image` を解決。`jcover = fr_full`、`jthumb = post.thumb | relative_url`（無ければ `fr_thumb`、それも無ければ `jcover`）。

- [ ] **Step 4: 確認用の記事でビルドして確かめる**

一時ファイル `_posts/2000-01-01-flickr-fixture.md` を作る（`layout: post`、`title: fixture`、`cover: "https://www.flickr.com/photos/194776399@N02/55655753948/in/photostream/"`、本文に `{% include photo.html flickr="https://www.flickr.com/photos/194776399@N02/55655753948/in/photostream/" caption="A" %}` と、データに無い写真ページ URL `https://www.flickr.com/photos/194776399@N02/1/` の include、`![B](https://live.staticflickr.com/65535/55655753948_e18dee666e_3k.jpg)`）。`node scripts/fetch-flickr.mjs && bundle exec jekyll build` の後：

Run: `grep -o 'data-cover="[^"]*"\|data-cover-thumb="[^"]*"\|data-cover-page="[^"]*"\|data-thumb="[^"]*"\|post-flickr-link' _site/2000/01/01/flickr-fixture.html`
Expected: `data-cover` が `…_e18dee666e_3k.jpg`、`data-cover-thumb` と `data-thumb` が `…_5c822c9b38_c.jpg`、`data-cover-page` が `https://www.flickr.com/photos/194776399@N02/55655753948/`、`post-flickr-link` が 1 件。
Run: `grep -c '5c822c9b38_c.jpg' _site/index.html`
Expected: 1 以上（一覧カードのサムネイル）。
既存記事の確認：`_site` の `2026-10-23-perfectno28`（note.com の cover）と `2024-11-20-blogsample`（`image` だけ）の cover の `src` が変更前と同じ（変更前の `_site` を `cp -R _site <scratchpad>/site-before` で取っておき `diff` で比べる。差分は Flickr 画像の `data-cover-thumb` / `data-thumb` が `_c` になる箇所だけ）。
確認後、fixture 記事を削除して `node scripts/fetch-flickr.mjs` を再実行（fixture の参照を消す）。

- [ ] **Step 5: `docs/templates/post.md` を更新**

cover は写真ページ URL を推奨にし、`thumb` / `cover_thumb` / `cover_page` は「任意。通常は不要（自動で決まる）」に書き換える。写真の推奨例を `{% include photo.html flickr="https://www.flickr.com/photos/…/<ID>/" caption="…" %}` にし、手順として「Flickr の写真ページの URL をコピー」「新しい写真を貼ったら `node scripts/fetch-flickr.mjs` を一度実行（またはピッカーでコピー）してから `jekyll serve`」を書く。Markdown 画像記法では写真ページ URL を使えないことも書く。

- [ ] **Step 6: Commit**

```bash
git add _includes/flickr-resolve.html _includes/photo.html _layouts/post.html index.html docs/templates/post.md _data/flickr_photos.json
git commit -m "feat(post): resolve Flickr photo page URLs in photo.html, cover and Journal cards"
```

---

### Task 4: Markdown 画像のモバイル用サイズ（post.js）

**Files:**
- Modify: `_layouts/post.html`（JSON の埋め込み）、`assets/js/post.js:82-89`（`flickrPage` / `flickrThumb`）

**Interfaces:**
- Consumes: `_data/flickr_photos.json` の `posts[page.path]`・`urls`・`photos`。
- Produces: `<script id="post-flickr" type="application/json">{ "<記事に書かれた URL>": { "thumb": "…", "page": "…" } }</script>` — その記事が参照する写真の URL だけ。`post.js` の `flickrThumb(src)` / `flickrPage(src)` はこのマップを先に引き、無ければ今の処理。

- [ ] **Step 1: `post.html` に JSON を埋め込む**

`site.data.flickr_photos.urls` を走査し、ID が `posts[page.path]` に含まれる URL だけを出す（値は `jsonify`）。`posts[page.path]` が無ければ `{}`。`post.js` の `<script>` より前に置く。

- [ ] **Step 2: `post.js` を書き換える**

起動時に `#post-flickr` を `JSON.parse`（無い・壊れている → `{}`）。`flickrThumb` / `flickrPage` はマップにあればその値を返す。

- [ ] **Step 3: 確認**

`_posts/2026-11-06-i_need_grivmonochrome.md` など `![](…_4k.jpg)` を使っている記事でビルドし、
Run: `grep -o '<script id="post-flickr"[^<]*' _site/2026/11/06/*.html | head -c 400`
Expected: `_4k.jpg` の URL に対して `_c.jpg` の thumb と写真ページの page が入っている。ブラウザ確認は利用者に依頼する（`bundle exec jekyll serve` → 該当記事をモバイル幅で開き、DevTools の Network で `_c.jpg` が読まれる）。

- [ ] **Step 4: Commit**

```bash
git add _layouts/post.html assets/js/post.js
git commit -m "feat(post): use resolved thumbnails for Markdown images on mobile"
```

---

### Task 5: ピッカーのサーバーとコード生成

**Files:**
- Create: `scripts/flickr-picker.mjs`、`scripts/picker/snippets.mjs`
- Test: `scripts/test/picker-snippets.test.mjs`

**Interfaces:**
- Consumes: Task 2 の `loadEnv` / `call` / `addPhotos`。
- Produces:
  - `snippets.mjs`（ブラウザと Node の両方で import する ESM）: `buildBody(items: Array<{ id, url }>, coverId: string | null) -> string`、`buildCover(items, coverId) -> string`
  - HTTP（`127.0.0.1:${PORT || 4100}`）:
    - `GET /` → `scripts/picker/index.html`、`GET /snippets.mjs` → そのファイル（`text/javascript`）。それ以外の静的パスは 404（パスをファイルシステムに渡さない）。
    - `GET /api/photos?page=N` → `flickr.people.getPhotos`（`user_id` = `FLICKR_USER_ID`、`per_page=100`、`extras=url_q,url_z,date_taken,date_upload,path_alias`）を `{ page, pages, photos: [{ id, title, taken, thumb, preview, url }] }` に変換。`url = https://www.flickr.com/photos/${path_alias || owner}/${id}/`。
    - `POST /api/resolve`（JSON `{ items: [{ id, url }] }`）→ `addPhotos(items)` の結果をそのまま JSON で返す。
    - API エラーは `502` + `{ error: message }`。キー未設定なら起動時にエラーメッセージを出して終了。

- [ ] **Step 1: 失敗するテストを書く**

```js
const A = { id: '1', url: 'https://www.flickr.com/photos/u/1/' };
const B = { id: '2', url: 'https://www.flickr.com/photos/u/2/' };
test('buildBody：選んだ順、空行区切り、cover は除く', () => {
  assert.equal(buildBody([A, B], null),
    '{% include photo.html flickr="https://www.flickr.com/photos/u/1/" caption="" %}\n\n{% include photo.html flickr="https://www.flickr.com/photos/u/2/" caption="" %}');
  assert.equal(buildBody([A, B], '1'), '{% include photo.html flickr="https://www.flickr.com/photos/u/2/" caption="" %}');
  assert.equal(buildBody([], null), '');
});
test('buildCover', () => {
  assert.equal(buildCover([A, B], '2'), 'cover: "https://www.flickr.com/photos/u/2/"');
  assert.equal(buildCover([A, B], null), '');
});
```

- [ ] **Step 2: 失敗を確認** — Run: `node --test scripts/test/` / Expected: `picker-snippets.test.mjs` が FAIL。

- [ ] **Step 3: `snippets.mjs` とサーバーを実装**（`node:http` のみ。起動時に `Flickr picker: http://127.0.0.1:4100/` を表示）

- [ ] **Step 4: 確認**

Run: `node --test scripts/test/` → 全 PASS。
Run（バックグラウンドで起動して）: `curl -s 'http://127.0.0.1:4100/api/photos?page=1' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.pages,j.photos.length,j.photos[0])})'`
Expected: `photos.length` が 100（または総数）、先頭が最新の写真で `thumb` が `_q.jpg`、`url` が写真ページ URL。
Run: `curl -s -XPOST -H 'content-type: application/json' -d '{"items":[{"id":"55655753948","url":"https://www.flickr.com/photos/194776399@N02/55655753948/"}]}' http://127.0.0.1:4100/api/resolve`
Expected: `{"resolved":["55655753948"],"failed":[]}`、`_data/flickr_photos.json` の `urls` にその URL がある。
Run: `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4100/../.env` → `404`。
確認後サーバーを止め、`git checkout _data/flickr_photos.json` で確認用の追加を戻す。

- [ ] **Step 5: Commit**

```bash
git add scripts/flickr-picker.mjs scripts/picker/snippets.mjs scripts/test/picker-snippets.test.mjs
git commit -m "feat(picker): local Flickr photostream proxy and snippet builder"
```

---

### Task 6: ピッカーの画面とドキュメント

**Files:**
- Create: `scripts/picker/index.html`（インライン CSS + `<script type="module">`、`./snippets.mjs` を import）
- Modify: `CLAUDE.md`（コミットしない）

**Interfaces:**
- Consumes: Task 5 の HTTP API と `buildBody` / `buildCover`。

画面の要件（設計書「ピッカー」節）：
- テーマは `prefers-color-scheme` に従い、トークン（`--bg` `--ink` `--sub` `--rule` `--line`）はサイトの `index.html` の値を流用。
- 写真グリッド：`thumb`（`_q`、正方形）、タイトルと撮影日（`YYYY.MM.DD`）。ページ下端の番兵を `IntersectionObserver` で見て次ページを読む。`page > pages` で止める。読み込み中・エラー（再試行ボタン）・0 件の表示。
- クリック（と Enter / Space）で選択・解除。選んだ順の番号を写真の角に出す。
- 下部固定のトレイ：選んだ写真を順に並べ、各項目に ↑ ↓ ×、cover 指定（ラジオ、1 枚まで。解除可）。0 枚のときは案内文だけ。
- ボタン「本文用をコピー」（`buildBody`）と「cover 行をコピー」（`buildCover`、cover 未指定なら無効）。クリック時に `navigator.clipboard.writeText`、続けて `POST /api/resolve` に選んだ全写真を送る。結果をトースト表示（「コピーしました・3 枚をデータに追加」／失敗した ID があればその旨）。クリップボードが拒否されたらテキストエリアに出して選択状態にする。
- 選択状態はページ内だけ（再読み込みで消えてよい）。

- [ ] **Step 1: `index.html` を実装**

- [ ] **Step 2: 確認**

サーバーを起動し `curl -s http://127.0.0.1:4100/ | grep -c 'snippets.mjs'` → 1。操作の確認は利用者に依頼する：写真を 3 枚選び、1 枚を cover にして両方コピー → 新規記事に貼り付け → `bundle exec jekyll serve` で cover と本文の写真が表示され、モバイル幅で `_c.jpg` が読まれる。

- [ ] **Step 3: `CLAUDE.md` を更新**

Development Commands に `node scripts/flickr-picker.mjs`（`http://127.0.0.1:4100/`、Photostream から写真を選んで記事用コードをコピー）と `node scripts/fetch-flickr.mjs --refresh` を追加し、テストコマンドを `node --test scripts/test/` にする。Data pipeline に `_data/flickr_photos.json`（スキーマ・走査対象・失敗時の扱い・コミットすること）を、Adding Content の Blog post に「cover と本文の写真は Flickr の写真ページ URL を書く。新しい写真は fetch を一度実行するかピッカーでコピー」を書く。Architecture の Blog posts に `flickr-resolve.html` と `#post-flickr` を追記。

- [ ] **Step 4: Commit**

```bash
git add scripts/picker/index.html
git commit -m "feat(picker): photostream grid, selection tray and copy buttons"
```
