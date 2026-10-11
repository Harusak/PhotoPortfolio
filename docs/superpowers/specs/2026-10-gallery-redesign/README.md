# Handoff: Gallery Redesign（被写界深度）＋ Flickr 自動取得

> **配置について**：このフォルダはリポジトリの `docs/superpowers/specs/2026-10-gallery-redesign/` などに置いてください（`.gitignore` が `docs/` 以外の `*.md` を無視するため）。
> このドキュメントには Liquid 記法（`{{ }}` / `{% %}`）が含まれます。`error-202603290746.md` のログを見ると、`_config.yml` の `exclude: - docs/` が効かず `docs/` 内の md がレンダリングされてビルドが落ちています。**先に `exclude` を `- docs`（末尾スラッシュなし）に修正**してください。

## Overview
Harusak/PhotoPortfolio（Jekyll / GitHub Pages）のギャラリーを、「被写界深度」をテーマにした新デザインに置き換えます。同時に、写真データの手書き管理（`_data/photos.yml` に Flickr の直リンクを書く）をやめ、**Flickr のアルバムをビルド時に自動取得**する仕組みにします。

- トップ：注目写真3枚の「ピント送り」ヒーロー
- アルバム一覧：奥行きをランダム生成した「散在する被写界」
- アルバム内：両隣の写真が不揃いな高さで待つ横送り（「揺らぐ水平線」）
- 写真をクリック：既存の3Dホログラムポップアップ（現行のまま）＋「View on Flickr ↗」ボタン
- ライト／ダークの2テーマ（現行の `localStorage.theme` を引き継ぐ）

## About the Design Files
`design/Gallery.dc.html` は **HTML で作ったデザインリファレンス**です。見た目と挙動を示すプロトタイプで、そのまま本番に載せるコードではありません（独自ランタイム `support.js` に依存しています。同じフォルダに置けばブラウザで開いて操作できます）。
このリポジトリの既存の作り方（Jekyll + Liquid + 素の CSS / JS、`index.html` 単一ページ）で作り直してください。React などの導入は不要です。

## Fidelity
**High-fidelity。** 色・タイポ・余白・モーション・乱数生成のパラメータはすべて確定値です。下記の数値どおりに再現してください。

---

## 1. データパイプライン（Flickr 自動取得）

### 方針
GitHub Pages のクラシックビルド（`github-pages` gem）では任意のスクリプトを実行できません。そこで、Pages のデプロイ方式を **GitHub Actions** に切り替えます。

```
[Actions: push / 毎日 cron / 手動実行]
  └ node scripts/fetch-flickr.mjs   … Flickr API → _data/gallery.json
  └ bundle exec jekyll build         … Liquid が site.data.gallery を読む
  └ deploy-pages
```

- API キーは Actions の Secret に置くので、ブラウザには出ません。
- Flickr にアルバムや写真を追加しても、リポジトリを編集する必要はありません。翌日の定時実行か、手動実行で反映されます。
- 補足：Jekyll は `_data/` 内の `.csv` / `.tsv` / `.json` もネイティブに読めます（クラシックビルドでも可能）。今回は API が JSON を返すので JSON を使います。

### 実装タスク
1. `reference/fetch-flickr.mjs` → `scripts/fetch-flickr.mjs`（Node 20 以上、依存なし）
2. `reference/flickr.config.json` → リポジトリ直下の `flickr.config.json`
3. `reference/pages.yml` → `.github/workflows/pages.yml`
4. `reference/gallery.sample.json` → `_data/gallery.json` としてコミット（取得に失敗したときのフォールバック。スクリプトは**成功したときだけ**このファイルを上書きします）
5. `_config.yml` の `exclude` に `scripts`、`flickr.config.json`、`node_modules` を追加
6. GitHub 上の設定：
   - Settings → Pages → Source を **GitHub Actions** にする
   - Settings → Secrets and variables → Actions：Secret `FLICKR_API_KEY`、Variable `FLICKR_USER_ID`（NSID。例 `12345678@N05`）を登録
7. `Gemfile.lock` をコミット対象にする（`.gitignore` から外す）。Actions 側は `jekyll ~> 4.3` でビルドされ、ローカル環境と揃います（現状はクラシックビルドの Jekyll 3.10）。
8. ログに出ている Node 20 の非推奨警告への対応として、各 action は Node 24 対応のメジャー版を使います（`pages.yml` の版は記述時点のもの。最新を確認すること）。

> Flickr API キーは https://www.flickr.com/services/apps/create で発行します（非商用）。発行条件は変わることがあるので、実装時に Flickr の最新規約を確認してください。

### 使う API
| メソッド | 用途 | 主なパラメータ |
|---|---|---|
| `flickr.photosets.getList` | アルバム一覧（説明文で絞り込み） | `user_id`, `per_page=500`, `page` |
| `flickr.photosets.getPhotos` | アルバム内の写真 | `photoset_id`, `user_id`, `extras=url_c,url_l,url_h,url_k,date_taken,description,tags,media`, `privacy_filter=1`, `per_page=500`, `page` |

すべて `format=json&nojsoncallback=1` で呼びます。

### 運用ルール（Flickr 側でやること）
- **表示するアルバム（最大 5 件）**：Flickr のアルバムの**説明文に `#featured` を含める**と表示対象になります（Flickr のアルバムにはタグを付けられないため、説明文を目印にします）。
  - 並び順は Flickr 上のアルバムの並び順です（Flickr の Organizr で並べ替えると反映）。
  - 6 件以上に `#featured` があれば先頭 5 件だけを使います。1 件もなければ公開アルバムの先頭 5 件を使います。
  - 目印の文字列は `flickr.config.json` の `albumMarker`、件数は `maxAlbums` で変えられます。目印は取得時に説明文から取り除きます。
- **アルバムの表紙**：Flickr のアルバムで設定した表紙（primary）を使います。
- **注目写真（ヒーロー）**：Flickr で写真にタグ `featured` を付けます（タグ名は `featuredTag` で変更可）。
- **タイトル・説明**：Flickr の写真タイトル・説明がそのまま使われます。
- 動画は除外します。

### `_data/gallery.json` のスキーマ
```jsonc
{
  "generatedAt": "2026-10-11T03:00:00.000Z",
  "albums": [{
    "id": "72177720300000000",
    "title": "残影",
    "description": "",            // #featured を除いた説明文
    "count": 12,
    "cover": { "src": "<url_c 800px>", "full": "<url_k/h>", "w": 2048, "h": 1365 },
    "photos": [{
      "id": "53098018469",
      "title": "残影",
      "description": "",
      "taken": "2023-05-02 18:22:10",
      "tags": ["featured", "monochrome"],
      "src": "<url_k → h → l → c の順で最初にあるもの>", "w": 2048, "h": 1365,
      "thumb": "<url_c → l>",
      "page": "https://www.flickr.com/photos/<NSID>/<id>/in/album-<albumId>"
    }]
  }],
  "featured": [ /* photos と同じ形。タグ featured の写真（重複なし） */ ]
}
```

### `index.html` への受け渡し
```html
<script id="gallery-data" type="application/json">{{ site.data.gallery | jsonify }}</script>
```
アルバムカードの `<a><img><span>` は Liquid で書き出し、位置・ぼけ・視差だけを JS で付けます。こうすると JS が動かなくても一覧は表示されます。アルバム内ビューとヒーローの中身は JSON から JS で組み立てます。

### 旧データの扱い
`_data/photos.yml` と、年・タグのフィルター UI（`.filter-toggle` / `.filter-popover`）は廃止します（アルバムで代替）。移行が終わったら削除してください。

---

## 2. 画面仕様

デザインの基準幅は **1200 × 760**。画面幅 **760px 未満**ではモバイル用の配置に切り替えます（`matchMedia('(max-width: 759px)')`。幅が変わったら毎回判定し直す）。

### 2.0 共通ヘッダー（現行のアイコンナビを置き換え）
- `position: fixed; top:0; left:0; right:0; z-index:50`、`align-items:center`
- padding `24px clamp(20px,4vw,48px)`、背景 `linear-gradient(var(--bg) 45%, var(--bg0))`
- 左：`Hal Sakaguchi`（Instrument Serif、`clamp(20px,2.2vw,26px)`、line-height 1、nowrap）。クリックでトップへ
- **現在地サフィックス `| Albums`**：ロゴの右（gap 12px）。`1px × 0.85em` の縦線（`--line`）＋ `Albums`（ロゴと同じ書体・サイズ、`--sub`）
  - 表示条件：トップ表示中で、アルバム一覧の見出し `h2` の下端がビューポート上端から 80px より上に出たとき（scroll リスナー、passive）
  - 表示時：opacity 1 / `translateX(0)`。非表示時：opacity 0 / `translateX(-8px)` / `pointer-events:none` / `aria-hidden`
  - transition：opacity `.45s ease`、transform `.6s cubic-bezier(.2,.7,.2,1)`
  - 同時に、ページ内の見出し `Albums`（h2）を opacity 0 にします（transition .45s）。**見出しがヘッダーに吸い込まれる**ように見せ、ロゴとの重なりを防ぎます
  - クリックでアルバム一覧の先頭へスクロール
- 右 nav：`Gallery` / `Journal` / `About` / `IG` / テーマ切替
  - IBM Plex Mono 11px、letter-spacing .16em、大文字、`--sub`、`align-items:center`
  - 現在地は `--ink`、gap `clamp(14px,2.4vw,32px)`
  - Journal / About は既存の blog / about セクションへ切り替え（既存の切り替えロジックを流用）。IG は既存の Instagram URL
  - モバイル（<760px）では `Gallery` と `IG` を隠します（ロゴでトップへ戻れるため）
- **テーマ切替**：直径 9px の丸（`1px solid currentColor`。ライトは中抜き、ダークは塗り）＋現在のテーマ名 `Light` / `Dark`
  - モバイルは丸だけ
  - タップ領域は上下 padding 14px（margin -14px で行の高さは変えない）
- hover：opacity .65

### 2.1 トップ / ヒーロー「ピント送り」
- セクション：`height:100vh; min-height:560px`、padding `96px clamp(16px,4vw,48px) 108px`（下は下部の行の分）、中央寄せ
- ステージ：aspect-ratio `1200/760`（モバイルは `400/620`）、width `min(100%, calc((100vh - 204px) * AR))`
- 3枚の写真を重ねて配置（`object-fit: cover`）。座標はステージに対する % で指定：

| slot | 推奨の向き | desktop x,y,w,h（/1200×760） | mobile x,y,w,h（/400×620） |
|---|---|---|---|
| 0 | 横長 | 330,130,540,380 | 20,70,360,250 |
| 1 | 縦長 | 800,60,300,390 | 210,300,170,220 |
| 2 | 横長 | 110,420,300,230 | 10,380,190,140 |

- 写真の割り当て：`featured` から 3 枚。4 枚以上あれば読み込みごとにランダムに 3 枚選び、向き（w>h）でスロットに振り分けます。3 枚に満たなければアルバムの表紙で補います。
- ピント：
  - 合っている 1 枚：`blur(0)` / opacity 1 / `scale(1)` / z-index 5
  - それ以外：`blur(8px)` / opacity .7 / `scale(.95)` / z-index `3 - slot`
  - transition：filter・opacity `1.4s ease`、transform `1.4s cubic-bezier(.2,.7,.2,1)`
- 自動送り：**3400ms** ごとに `focus = (focus+1) % 3`。トップ以外にいるとき、またはポップアップを開いているときは止めます。初期値はランダム（0–2）。
- クリック：ぼけている写真ならそこにピントを移し、タイマーをリセット。合っている写真ならホログラムポップアップを開きます。
- 影：`0 40px 80px -30px rgba(40,35,30,.45)`
- 下部の行（bottom 28px、左右 padding はヘッダーと同じ）：`grid 1fr auto 1fr`、`align-items:center`、gap 16px
  - 左：`IN FOCUS`（11px、.16em、`--sub`。モバイルでは隠す）＋写真タイトル（Instrument Serif 20px、`--ink`、はみ出しは省略記号）
  - 中央：**`ALBUMS ↓` ボタン**
    - min-height 44px、padding 0 18px、`1px solid var(--line)`、文字 `--ink`、11px .16em 大文字、gap 10px
    - hover：背景 `--ink`、文字 `--bg`（transition .25s）
    - クリックでアルバム一覧へスムーススクロール
  - 右：28×1px のバー 3 本（gap 8px、`--ink`）。合っている写真のバーは opacity 1、他は .25、transition .6s

**「アルバム一覧へ」の共通処理**（ヒーローのボタン、ヘッダーの `| Albums`、アルバムビューの `← ALBUMS` で共通）：一覧フィールドの上端がビューポート上端から 104px の位置に来るように `window.scrollTo` します（トップ表示中は smooth）。アルバムビューから戻るときは、トップを描画したあと即座にこの位置へ移動します。

### 2.2 トップ / アルバム一覧「散在する被写界」
- セクション padding `64px clamp(16px,4vw,48px) 96px`、gap 24px
- 見出し行：下線 `1px solid rgba(28,27,25,.14)`、padding-bottom 14px
  - 左：`Albums`（h2、Instrument Serif、`clamp(34px,4vw,48px)`、line-height 1）
  - 右：`FOCUS {距離} M`（11px、.16em）。距離は層 z に応じて `["0.8","1.2","2","3.5","6"]`
- フィールド：`position:relative; width:100%`、aspect-ratio `1200/760`（モバイル `400/1300`）。カードは % で絶対配置
- **配置の生成**（ページ読み込みごと・モード別に1回。同じセッション内で幅を行き来しても、作り直さず再利用）：

```js
const FIELD = { wide: { W:1200, H:760, base:290, step:42 }, narrow: { W:400, H:1300, base:230, step:26 } };
const rnd = (a,b) => a + Math.random()*(b-a);
function genField(mode, n = 5) {
  const F = FIELD[mode];
  for (let tries = 0; tries < 80; tries++) {
    const zs = [...Array(n).keys()].sort(() => Math.random() - .5); // 奥行きは全カード別々（重複なし）
    const out = [];
    for (const z of zs) {
      const w = Math.round(F.base - z*F.step + rnd(-8, 8)), h = w*1.25 + 38; // 4:5 画像 + ラベル 38px
      let ok = null;
      for (let k = 0; k < 300 && !ok; k++) {
        const x = Math.round(rnd(0, F.W - w)), y = Math.round(rnd(0, F.H - h));
        if (out.every(o => x+w+32 < o.x || o.x+o.w+32 < x || y+h+28 < o.y || o.y+o.h+28 < y)) ok = { x, y, w, h, z };
      }
      if (!ok) break;
      out.push(ok);
    }
    if (out.length === n) return out;
  }
  return FALLBACK[mode]; // 固定配置（下記）
}
```
  - 固定配置（`z = index`、`w = base - z*step`）：
    - wide：x `[40,420,760,260,980]`、y `[40,260,60,520,400]`
    - narrow：x `[0,200,20,220,60]`、y `[0,420,560,900,1080]`
  - 表示するアルバムは**最大 5 件**（1. の運用ルール参照）。5 件未満なら `n` を件数にして、奥行きは `0..n-1` を重複なしで割り当てます（DIST ラベルは先頭 n 個）。
- 各カード
  - 幅 `w/W`%、z-index `10 - z`
  - 画像：aspect-ratio 4/5、cover、影 `0 30px 60px -30px var(--shadow)`
  - ラベル（gap 12、baseline 揃え）：通し番号 `01`（10px、.12em、`--sub`）、タイトル（Instrument Serif 18px）、右端に枚数 `12`（10px）
  - 画像とラベルの間は 10px
- ピント：基準の層 `fz` は、ホバー中のカードの z（ホバーなしなら 0）。`dz = |z - fz|`
  - `filter: blur(dz*2.8px)`、opacity `1 - dz*.09`
- 視差（desktop のみ）：カーソル位置をフィールドに対して `mx,my ∈ [-1,1]` に正規化し、`k = (4 - z)*6` として `translate(-mx*k px, -my*k*.6 px)`。カーソルが出たら中央（0,0）に戻す
- transition：filter・opacity `.7s ease`、transform `1s cubic-bezier(.2,.7,.2,1)`
- クリック：そのアルバムのビューへ（URL は `#/album/<id>` などハッシュで。戻るボタンが効くようにする。プロトタイプには未実装）

### 2.3 フッター
padding `32px clamp(20px,4vw,48px)`、上線 rule、両端揃え：`© Hal Sakaguchi` / `Photographs`（11px、.12em、`--sub`）

### 2.4 アルバムビュー「揺らぐ水平線」
- `position:fixed; inset:0; overflow:hidden; background:var(--bg)`（ヘッダーは上に重ねたまま）
- 上部バー（top 76px）：`grid 1fr auto 1fr`、左右 padding はヘッダーと同じ
  - 左：`← ALBUMS` ボタン（トップの**アルバム一覧の位置**へ戻る）
  - 中央：アルバム名（Instrument Serif 26px）
  - 右：`01 / 12`（11px、.16em）
- 写真（全枚を絶対配置）
  - `left:50%; top:calc(50% + 10px)`
  - `max-height: min(62vh, calc(100vh - 260px))`、`max-width: 52vw`（モバイルは `min(52vh, …)`・`78vw`）
  - width/height は auto（枠を画像にぴったり合わせ、影を画像の輪郭に付ける）
  - `d = i - pos`、`ad = |d|`、`cl = min(ad,3)`
  - `transform: translate(-50%,-50%) translate(d*GAP vw, Y vh) scale(1 - min(ad,2)*.2)`
    - GAP：desktop 40、mobile 82
    - Y：`ad === 0 ? 0 : offs[i]*11`
  - `blur(cl*6px)`、opacity `max(0, 1 - cl*.3)`、z-index `10 - ad`
  - transition：transform `.9s cubic-bezier(.2,.7,.2,1)`、filter・opacity `.9s ease`
  - cursor：中央は `zoom-in`、両隣は `pointer`
  - 影はヒーローと同じ
- **待機の高さ**（アルバムを開くたびに生成し直す）：
```js
function genOffsets(n) {
  const o = [];
  for (let i = 0; i < n; i++) {
    let v, k = 0;
    do { v = rnd(-1, 1); } while (i > 0 && Math.abs(v - o[i-1]) < .55 && ++k < 50); // 隣と揃って見えないよう差を確保
    o.push(v);
  }
  return o;
}
```
- 下部（bottom 28px、中央）：`←`、写真タイトル（Instrument Serif 18px、min-width 120、中央揃え）、`→`
  - gap 32px。ボタンは padding 12px 14px（44px のタップ領域）
  - 端まで来たらそちらの矢印を opacity .25 に
- 操作
  - ホイール：`preventDefault`。deltaX と deltaY のうち大きい方を累積し、|累積| > 40 で 1 枚送り、その後 650ms ロック
  - ←/→ キー
  - スワイプ：|dx| > 40px
  - 両隣の写真をクリック → その写真へ。中央の写真をクリック → ポップアップ
  - Esc：ポップアップが開いていれば閉じる。開いていなければトップ（ページ先頭）へ戻る
- パフォーマンス：`pos ± 2` の範囲の画像だけ `src` を入れ、それ以外は遅延読み込み。`decoding="async"`

### 2.5 ホログラムポップアップ（現行ロジックを維持し、配色だけ変える）
- オーバーレイ：`rgba(20,19,17,.9)` + `backdrop-filter: blur(20px)`、z-index 200、`cursor: zoom-out`。どこをクリックしても閉じる
- 画像（ポップアップの配色はテーマによらず固定）
  - 中央配置、margin-top -28px
  - `max-width:90vw; max-height:calc(100vh - 156px)`
  - **画像そのものはリンクにしない**
  - 影 `0 40px 100px rgba(0,0,0,.5)`
- 傾き：`perspective(1000px) rotateX(-ny*15deg) rotateY(nx*15deg)`
  - nx、ny はカーソルの中心からのずれを、画面の幅・高さ × .35 で割って ±1 に収めた値
  - transition `.1s`
- ホロ層（`mix-blend-mode: soft-light`）
  - `linear-gradient(115deg, transparent 0%, rgba(0,231,255,.10) 20%, rgba(102,126,234,.15) 40%, rgba(235,139,255,.15) 60%, rgba(0,231,255,.10) 80%, transparent 100%)`
  - グレア：`radial-gradient(circle at {(nx+1)/2*100}% {(ny+1)/2*100}%, rgba(255,255,255,.25) 0%, rgba(255,255,255,.15) 20%, transparent 50%)`
- 下部の行（bottom 24px、左右 padding はヘッダーと同じ）：中央揃え、flex-wrap、gap `12px 28px`、11px .16em 大文字、`#a9a49b`
  - タイトル（Instrument Serif 20px、`#e4e1db`）
  - **`VIEW ON FLICKR ↗` ボタン**（`<a target="_blank" rel="noopener">`、href は写真の `page`）
    - min-height 40px、padding 0 16px、`1px solid rgba(228,225,219,.35)`、文字 `#e4e1db`、gap 10px
    - hover：背景 `#e4e1db`、文字 `#1c1b19`（transition .25s）
    - クリックが下のオーバーレイに伝わってポップアップが閉じないよう、`stopPropagation` する
  - `ESC で閉じる`（モバイルでは隠す）
- 閉じるボタン：右上 20px、44×44、`1px solid rgba(228,225,219,.3)`、文字 `#e4e1db`、`×`

---

## 3. State
```
view: 'top' | 'album'        // ハッシュと同期
theme: 'light' | 'dark'      // localStorage 'theme'（現行と同じキー）
inAlbums: boolean            // ヘッダーの | Albums 表示と h2 のフェード
heroFocus: 0..2              // 自動送り（3400ms）
fields: { wide?, narrow? }   // genField の結果をモード別にキャッシュ
hoverAlbum: index | -1
mouse: {x,y} 0..1            // 視差
album: id, pos: number, offs: number[]
lightbox: photo | null, tilt: {nx, ny}
```

## 4. Design Tokens
### テーマ（CSS カスタムプロパティ。`<html>` に設定して切り替え）
| 変数 | Light | Dark | 用途 |
|---|---|---|---|
| `--bg` | `#e1dfda` | `#161513` | 背景 |
| `--bg0` | `rgba(225,223,218,0)` | `rgba(22,21,19,0)` | ヘッダーのグラデーション終端 |
| `--ink` | `#1c1b19` | `#e4e1db` | 文字・バー |
| `--sub` | `#5f5b55` | `#948f86` | 補助文字 |
| `--rule` | `rgba(28,27,25,.14)` | `rgba(228,225,219,.14)` | 罫線 |
| `--line` | `rgba(28,27,25,.35)` | `rgba(228,225,219,.35)` | ボタンの枠・縦線 |
| `--shadow` | `rgba(40,35,30,.45)` | `rgba(0,0,0,.7)` | 写真の影の色 |

- 実装メモ
  - `html[data-theme="dark"]` で上書きする形を推奨します
  - 読み込み時のちらつきを防ぐため、`<head>` 内の小さなインラインスクリプトで、`localStorage.theme` を描画前に `<html>` へ適用します
  - `color-scheme` も合わせて設定します
  - 背景・文字色の切り替えは transition `.5s ease`
  - ぼけ・不透明度・モーションの数値は両テーマ共通
  - 既存の `body.dark` クラスは Journal / About（`_layouts/post.html` を含む）が使っているので、同じキーで同期を保ちます
- ポップアップ（テーマ共通）：背景 `rgba(20,19,17,.9)`、文字 `#e4e1db`、補助文字 `#a9a49b`
- フォント（Google Fonts）
  - **Instrument Serif** 400：見出し・タイトル（和文フォールバック **Shippori Mincho** 400/500）
  - **IBM Plex Mono** 400/500：UI ラベル
  - `font-family: 'Instrument Serif','Shippori Mincho',serif` / `'IBM Plex Mono',monospace`
- ラベルの型：11px / letter-spacing .16em / uppercase。小さいもの：10px / .12em
- イージング：`cubic-bezier(.2,.7,.2,1)`（移動）、`ease`（ぼけ・透明度）
- 角丸：なし（0）

## 5. 対象外（今回は扱わない）
- Journal / About の再デザイン（新ヘッダーからリンクし、テーマの同期だけ行う）
- `#featured` が付いていないアルバムを見せる「すべてのアルバム」ページ

## Files
- `design/Gallery.dc.html` ＋ `design/support.js`：完成版プロトタイプ（2 つを同じフォルダに置いてブラウザで開く）
- `reference/fetch-flickr.mjs`：Flickr → `_data/gallery.json` の取得スクリプト（参考実装）
- `reference/pages.yml`：GitHub Actions のビルド・デプロイ設定（参考実装）
- `reference/flickr.config.json`：表示するアルバムとタグの設定
- `reference/gallery.sample.json`：フォールバック用の初期データ（現行の 5 枚）
