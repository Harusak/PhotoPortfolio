# Handoff: 記事ページ（_layouts/post.html）— シーン送り

> Journal 一覧（`README.md`）の続きです。配置・`docs/` の `exclude`・トークン・フォント・ヘッダーの前提は README と同じです。この文書にも Liquid と紛らわしい `{% %}` `{{ }}` が出てくるため、`docs/` 配下に置いてください。
>
> **2026-11 改訂**：旧仕様（本文が普通に流れ、マーカーが基準線を越えると写真が替わる「ピント送りの 2 カラム」）を、**1 スクロール = 写真 1 枚＋その文章（シーン）** の「シーン送り」に置き換えました。旧仕様で文章が短いとすぐ次の写真に替わってしまう問題への対応です。旧版のリファレンス `design/Post.dc.html` は参考として残しますが、実装は本書と `design/PostScene*.dc.html` に従ってください。

## Overview
Journal のカードから遷移する記事ページです。

- 本文を **シーン** に区切る。シーン = 写真 1 枚 ＋ その写真から次の写真の直前までの文章。冒頭のタイトル・リード・最初の段落は表紙（`cover`）のシーン
- 1 回のスクロール（ホイール、トラックパッド、スワイプ、キー）で **1 シーンずつ** 進む。勢いのあるスクロールでもシーンを飛ばさない
- いま読んでいるシーンは文章欄の中央でピントが合い、前後のシーンはボケて上下に覗く（続きがあることを示す）。間隔は通常の段落と同じ組版のまま
- 写真はデスクトップ右（モバイル上）のステージに 1 枚ずつ出し、シーンに合わせて「ピント送り」で入れ替える
- 文章欄に収まらない **長いシーン** は欄の中で読み進め、左の細い線で進み具合を示す。末尾で必ずいったん止まる
- 写真の下の線（スクラバー）で写真だけを先に見て、離す／クリックするとそのシーンへ移動
- 冒頭だけ、下スクロールを促す山形の矢印を出す
- 写真クリック → ギャラリーと同じポップアップ（傾き＋ホログラム＋グレア、View on Flickr）
- URL はシーンごとに変えない（ブラウザの「戻る」で一覧へ戻る）
- テーマは `localStorage.theme`、Depth of field は `localStorage["journal-dof"]` を一覧と共有

## Design Files
- `design/PostScene.dc.html` — デスクトップ（1280×880 の画面で作成）
- `design/PostSceneMobile.dc.html` — モバイル（390×844）
- いずれも同じフォルダの `support.js` と一緒にブラウザで開くと操作できます。Tweaks：`dark`、`dof`、`bodyFont`（採用は **mincho**）、`cue`（スクロール案内の比較用。**採用は `chevron` のみ**、他は実装不要）
- 長いシーンの挙動や案内の比較は、デザイン「Post — シーン送り」のテスト画面（2 段目・3 段目）で確認できます
- 本番は Jekyll + Liquid + 素の CSS / JS で作り直してください。プロトタイプの記事データはダミーです

## Fidelity
High-fidelity。値はすべて確定。ブレークポイントは **760px**（未満がモバイル）。

---

## 画面構成

ページは **ビューポート固定**：`html,body{height:100%}`、ルートは `height:100dvh; min-height:560px; overflow:hidden`。スクロールするのは **文章欄だけ** です（ページ全体はスクロールしない）。

### デスクトップ（≥760px）
ルート：`max-width:1600px; margin:0 auto; padding:0 48px; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); gap:56px; height:100dvh`

**左カラム**（`display:flex; flex-direction:column; min-height:0; padding-bottom:24px`）
- ヘッダー（高さ 80px）：サイト名＋縦罫＋`Journal`（一覧と同じ書式、`Journal` は一覧へのリンク）
- 文章欄ラッパー（`position:relative; flex:1; min-height:0`）。中に以下の 3 つを重ねる
  - **文章欄**（スクロールコンテナ）：後述
  - **進み具合の線**：後述
  - **スクロール案内**：後述
- 文章の最大幅：`max-width:620px`（文章欄の中で左寄せ）

**右カラム**（`height:100%; display:flex; flex-direction:column; gap:18px; padding-bottom:32px`）
- nav（高さ 80px、右寄せ）：一覧と同じ。現在ページ `Journal` を `--ink`
- ステージ（`position:relative; flex:1; min-height:0`）：写真を全部重ねる。各写真は `<button>`（`position:absolute; inset:0`、中央寄せ、背景・枠なし、`cursor:zoom-in`）の中の `<img>`（`max-width/max-height:100%`、トリミングしない、`box-shadow:0 40px 80px -30px var(--shadow)`）。大サイズ（`_k`）
- 下段：`grid-template-columns:auto minmax(0,1fr) auto; gap:16px; align-items:center`
  - `{表示中の番号2桁} / {総数2桁}`（IBM Plex Mono 10px、0.14em、`--sub`）
  - キャプション（Shippori Mincho 14px、`--sub`、1 行・省略記号）
  - **スクラバー**（後述）：写真ごとに幅 28px（左右 padding 4px、線は 20px）、高さ 44px（`margin:-14px 0` で行の高さは変えない）

### モバイル（<760px）
ルート：`display:flex; flex-direction:column; height:100dvh`
- ヘッダー：`padding:20px`。サイト名 20px。nav は `About` ＋テーマの丸（ラベルなし、タップ領域 44×44px）
- 写真欄：`flex:none; height:clamp(260px,41vh,380px); padding:0 20px 4px; border-bottom:1px solid var(--rule)`、縦 gap 10px
  - ステージ（`flex:1`）：中サイズ（`_c`）、`box-shadow:0 24px 48px -24px var(--shadow)`
  - 番号＋キャプション行：`grid-template-columns:auto minmax(0,1fr); gap:12px`。キャプション 12px
  - **スクラバー**：横幅いっぱい、高さ 40px（`margin:-4px -3px 0`）。各写真 `flex:1`、左右 padding 3px
- 文章欄ラッパー：`position:relative; flex:1; min-height:0`。文章欄は `padding:0 20px`
- 機材・アルバム行はモバイルでは省略（タイトルシーンにはメタ・タイトル・リードのみ）

---

## 文章欄（スクロールコンテナ）

```css
.scenes{
  position:absolute; inset:0; overflow-y:auto; overflow-x:hidden;
  overscroll-behavior:contain; scroll-snap-type:y mandatory;
  scrollbar-width:none;                                   /* + ::-webkit-scrollbar{display:none} */
  mask-image:linear-gradient(transparent 0%,#000 13%,#000 87%,transparent 100%); /* モバイルは 11% / 89% */
}
```
- 書体：**Shippori Mincho 400、17px / line-height 2.05**（デスクトップ・モバイル共通）
- 先頭と末尾に **スペーサー**（高さ = 文章欄の高さの 1/2。JS で `clientHeight/2` を設定し、`resize` で更新）。最初と最後のシーンも中央に来られるようにするため
- スクロール位置の調整はブラウザ標準のスクロールスナップに任せる（ホイールを JS で横取りしない）。キーボード（↑↓、PageUp/Down、Space）もそのまま効く

### シーンの中身
各シーン `<section class="scene" data-scene="n">`（`padding:0`）。シーン間の空きは段落の下マージン（1.4em）だけ。
- **シーン 0（タイトル）**：記事頭 → 最初の写真より前の本文
  - 記事頭（縦 gap 22px、`margin-bottom:36px`。モバイルは gap 14px・24px）
    - メタ：`{Category} — {YYYY.MM.DD}`、IBM Plex Mono 11px（モバイル 10px）、0.16em、uppercase、`--sub`
    - タイトル：Shippori Mincho 500、42px（モバイル 28px）、line-height 1.3（モバイル 1.35）、`text-wrap:pretty`
    - リード：Shippori Mincho 18px（モバイル 15px）、line-height 1.9、`--sub`
    - 機材・アルバム行（デスクトップのみ）：上下 1px `--rule`、`padding:14px 0`、10px、0.14em、uppercase、`--sub`。左 `{camera} · {lens}`、右 `Album — {album.name} ↗`
- **シーン 1〜**：写真番号ラベル → その写真から次の写真の直前までの本文
  - 写真番号ラベル：28px（モバイル 20px）× 1px の罫（`--line`）＋2 桁番号（表紙が 01、本文中の写真が 02, 03…）、IBM Plex Mono 10px、0.14em、`--sub`、gap 12px、`margin-bottom:1.2em`
  - 段落：`margin:0 0 1.4em; text-align:justify; text-wrap:pretty`
  - h2：Shippori Mincho 500、22px（モバイル 20px）、line-height 1.5、`margin:0 0 .9em`（シーン内で使う。シーン先頭に来てよい）
- **最後のシーン（記事末尾）**：上罫 1px、`padding-top:28px`。左 `← Journal`（`min-height:44px; padding:0 18px`、1px `--line` 枠、11px、0.16em、uppercase）、右 `{date} · {Category}`（10px、`--sub`）。ステージの写真は最後の写真のまま

### スナップ
| シーン | `scroll-snap-align` | `scroll-margin` | `scroll-snap-stop` |
|---|---|---|---|
| 通常（文章欄に収まる） | `center` | 0 | `always` |
| 長い（収まらない） | `start` | 上下 `edge` | `always` |
| 長いシーンの末尾マーカー | `end`（高さ 1px、`margin-top:-1px`、`aria-hidden`） | 下 `edge + 16px` | `always` |

- `edge` = 文章欄の高さ × **0.14**（モバイル **0.12**）。上下のフェードにかからない位置で止めるための余白
- **長い** の判定：シーンの高さ > 文章欄の高さ − 2 × `edge`。読み込み後・フォント読み込み後（`document.fonts.ready`）・`resize` で判定し直す
- 長いシーンは、上から入ると冒頭（上端のフェードのすぐ内側）、下から戻ると末尾が見える位置で止まる。読み進める間は欄の中を自由にスクロールでき、勢いよく払っても **末尾マーカーで必ず止まる**（次のスクロールで次のシーンへ）

### アクティブなシーン（`act`）
- 文章欄の中央の水平線を含むシーン。どれも含まなければ中央にいちばん近いシーン
- `scroll` を rAF で間引いて計算し、変わったときだけ DOM を更新（`data-d` 属性など）

### ピント（`d = |i - act|`）
| d | blur（Depth of field On） | opacity |
|---|---|---|
| 0 | 0 | 1 |
| 1 | 3px | .4 |
| 2 | 6px | .18 |
| ≥3 | 6px | 0 |
- transition：`filter .6s ease, opacity .6s ease`
- Depth of field Off：blur 0（opacity は表のまま）

### 進み具合の線（長いシーンを読んでいる間だけ）
- 文章欄ラッパーの左：デスクトップ `left:-24px`、モバイル `left:8px`。`top:14%; bottom:14%; width:1px; background:var(--rule)`、`aria-hidden`、`pointer-events:none`
- 中の塗り：`width:1px; height:{progress}%; background:var(--ink); transition:height .12s linear`
- 下端の丸：直径 7px、1px `--ink` 枠、`left:-3px; bottom:-9px`。progress 100% で `--ink` に塗る（それ以外は `--bg`）
- 表示：アクティブが長いシーンのとき opacity 1、それ以外 0（`transition:opacity .4s ease`）
- progress = `(scrollTop − 開始位置) / (終了位置 − 開始位置)` を 0〜1 に丸めた値
  - 開始位置 = `scene.offsetTop − edge`
  - 終了位置 = `scene.offsetTop + scene.offsetHeight − 文章欄の高さ + edge + 16`

### スクロール案内（冒頭のみ）
- 山形の矢印のみ（文字なし）：
  ```html
  <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" stroke-width="1.2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 2l9 8 9-8"/></svg>
  ```
  色 `--sub`。文章欄ラッパーの下端中央（`bottom:14px`）、`pointer-events:none`
- 動き：`@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}`、`1.6s ease-in-out infinite`
- 表示条件：読み込みから **1 秒後** に表示。`act === 0` の間だけ。一度でも `act > 0` になったらそのページ表示中は二度と出さない
- 出入り：`opacity` 0↔1（`.5s ease`）と `translateY(8px)`↔`0`（`.6s cubic-bezier(.2,.7,.2,1)`）

---

## ステージ（写真）

### 重なり（`d = i - shown`）
`shown` = スクラバーで見ている写真 → スクラバーで移動中の行き先 → アクティブなシーンの写真、の順に優先。

| d | transform | blur（On） | opacity | z-index |
|---|---|---|---|---|
| 0（現在） | none | 0 | 1 | 5 |
| 1（次） | `translate(5%,-4%) scale(.9)` | 7px | .3 | 4 |
| ≥2（先） | `translate(8%,-6%) scale(.84)` | 10px | 0 | 3 |
| <0（通過済） | `translate(-3%,4%) scale(1.05)` | 10px | 0 | 6 |

- transition：通常は `filter .9s ease, opacity .9s ease, transform .9s cubic-bezier(.2,.7,.2,1)`。スクラバーで写真を見ている間は `.3s`
- 現在の写真だけ `pointer-events:auto` / `tabindex=0`（クリックでポップアップ）。他は `pointer-events:none` / `tabindex=-1`
- Depth of field Off：blur 0。opacity・transform は表のまま
- 画像の読み込み：`|d| ≤ 1` は eager、他は lazy

### スクラバー（写真の下の線）
- 写真ごとに `<button aria-label="写真 {nn}「{caption}」のシーンへ">`、中に線（`display:block; width:100%; background:var(--ink)`）
  - 線の太さ：通常 1px、スクラバーで見ている写真は 3px（`transition:height .2s`）
  - opacity：表示中の写真 1、アクティブなシーンの写真 .55、他 .22（`transition:opacity .25s`）
- 親要素に Pointer Events をまとめて付ける（`touch-action:none; user-select:none`）
  - **マウス**：ホバー中は、ポインタ位置の写真をステージに出す（写真だけ切り替わる。文章は動かない）。外れたら元に戻す。クリックでその写真のシーンへ移動
  - **タッチ**：押してから左右になぞる間は、ポインタ位置の写真をステージに出す（`setPointerCapture`）。離した位置の写真のシーンへ移動
  - ポインタ位置 → 写真番号：`floor((clientX − left) / width × 写真数)`
  - **キーボード**：各 button にフォーカスして Enter / Space で移動
  - ポインタで移動した直後 400ms は button の `click` を無視する（二重発火の防止）
- 移動：その写真を持つ最初のシーンへ `scrollTo({behavior:"smooth"})`（長いシーンは冒頭から）。移動中はステージを行き先の写真に固定し、`act` がそのシーンに着いたら（または 1.8 秒で）解除する
- `prefers-reduced-motion: reduce` のときは `behavior:"auto"`

### ポップアップ
- ギャラリー（`design_handoff_gallery_redesign/README.md`）のポップアップ仕様をそのまま流用：背景 `rgba(20,19,17,.9)`＋`backdrop-filter:blur(20px)`、画像は大サイズ（`_k`）、マウス位置で ±15° の傾き、ホログラム（soft-light）、グレア
- 画像 `max-width:min(92vw,1600px); max-height:78vh`
- 下部：キャプション（Shippori Mincho 18px、`#e4e1db`）、`View on Flickr ↗`（写真ページ URL）、`ESC で閉じる`（デスクトップのみ）
- 閉じる：背景（全面の透明 `<button aria-label="拡大表示を閉じる">`）クリック／× ボタン（44×44）／Esc
- モバイルは傾きなし
- ポップアップ表示中は文章欄のスクロールを受け付けない

### 動きを減らす設定
`@media (prefers-reduced-motion: reduce)`：スクロール案内の bob を止める、ステージの transform を none（opacity のみ切替）、`scrollTo` は `behavior:"auto"`。

---

## Jekyll

### front matter（変更なし）
```yaml
title: 台南、路地の午後
date: 2026-10-04
category: travel            # travel / gear / news
cover: https://live.staticflickr.com/65535/..._k.jpg
cover_caption: 西門路から一本入った路地。   # 任意（写真 01 のキャプション）
lead: 観光地の裏側、生活の音が残る路地を一日かけて歩いた記録。   # 任意
camera: X-T5                # 任意
lens: XF35mm F1.4           # 任意
album:                      # 任意
  name: 台南 2026
  url: https://www.flickr.com/photos/.../albums/...
```
- `lead` が無ければ `page.excerpt` を strip_html して使う
- `camera` `lens` が両方無ければ機材行の左側は出さない。`album` も無ければ行ごと出さない

### 本文中の写真（変更なし）
```liquid
{% include photo.html src="https://live.staticflickr.com/65535/55572761309_xxxx_k.jpg"
   thumb="https://live.staticflickr.com/65535/55572761309_xxxx_c.jpg"
   page="https://www.flickr.com/photo.gne?id=55572761309"
   caption="神農街の手前、昼下がりの路地。" %}
```
`_includes/photo.html` は旧仕様と同じ `figure.post-photo`（`data-full` `data-thumb` `data-page` `data-caption`）。Markdown の `![キャプション](URL)` だけの段落も写真として扱う。

**運用の目安**：1 シーンの文章は文章欄に収まる長さを推奨（デスクトップ約 700 字、モバイル約 260 字）。超えても読めるが、モバイルでは長いシーンになりやすい。

### JS の処理（`assets/js/post.js`）
1. `.post-body` の子要素を先頭から走査し、写真（`figure.post-photo` または画像だけの段落）が現れるたびに新しいシーンを始める。写真の前の要素はシーン 0（記事頭の後ろ）に入れる。写真要素そのものはステージ用に取り出して本文からは除く
2. 各シーンを `<section class="scene" data-scene="n">` で包み、写真番号ラベルを先頭に差し込む。最後に末尾シーン（`← Journal`）を足す
3. ステージ・スクラバー・進み具合の線・スクロール案内を生成
4. スペーサーの高さ、`edge`、長いシーンの判定を計算し、長いシーンに `data-long` と末尾マーカーを付ける（スナップの値は CSS の属性セレクタで）
5. `scroll`（rAF）で `act` と progress を計算し、各シーン・各写真に `data-d` を付ける。見た目は CSS で定義
6. 初期表示：シーン 0 を中央に（`scrollTo` を `behavior:"auto"` で）
- **フォールバック**：JS が無いときは、初期 HTML のまま「本文に figure がそのまま流れる 1 カラムの普通の記事」として読める（ページ全体がスクロールする）。JS 起動時に `html.has-scenes` を付けて、ビューポート固定・文章欄スクロールに切り替える
- 写真が cover だけの記事（Gear・News に多い）は、シーンが「タイトル＋本文全体」と末尾の 2 つになる。本文が長ければ長いシーンとして扱われる

### レイアウトファイル
- `_layouts/post.html`：ヘッダー、記事頭、`<div class="post-body">{{ content }}</div>`、末尾、ステージ・スクラバー・ポップアップの空コンテナ
- フォントの追加は不要

## State
| 変数 | 内容 | 永続化 |
|---|---|---|
| `theme` | light / dark | `localStorage.theme` |
| `dof` | on / off | `localStorage["journal-dof"]`（一覧と共有） |
| `act` | アクティブなシーン index | なし |
| `long` / `edge` | 長いシーンの集合、フェード分の余白（px） | なし（計算値） |
| `progress` | 長いシーンの進み具合（0〜100） | なし |
| `peek` | スクラバーで見ている写真 index | なし |
| `target` | スクラバーで移動中の行き先の写真 index | なし |
| `cueSeen` | スクロール案内を出し終えたか | なし（ページ表示中のみ） |
| `pop` / `tilt` | ポップアップの写真、傾き | なし |

URL（ハッシュ）は変更しない。

## Design Tokens
一覧（README.md）と同一。フォントも同じ 3 書体のみ（本文 = Shippori Mincho）。
