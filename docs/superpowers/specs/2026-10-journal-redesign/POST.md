# Handoff: 記事ページ（_layouts/post.html）

> Journal 一覧（`README.md`）の続きです。配置・`docs/` の `exclude`・トークン・フォント・ヘッダーの前提は README と同じです。この文書にも Liquid と紛らわしい `{% %}` `{{ }}` が出てくるため、`docs/` 配下に置いてください。

## Overview
Journal のカードから遷移する記事ページです。デスクトップは「ピント送りの 2 カラム」、モバイルは「上に固定する」。

- 左：本文（文章主体）。本文中の写真は **番号マーカー（`— 01`）だけ** を残し、写真そのものは右（モバイルは上）の固定ステージに出す
- 読み進めてマーカーが基準線を越えると、ステージの写真が入れ替わる。今の写真にピントが合い、次の写真はボケて奥で待ち、前の写真は手前へ抜けて消える
- 写真クリック／マーカークリック → ギャラリーと同じポップアップ（傾き＋ホログラム＋グレア、View on Flickr）
- 記事末尾は「← Journal」のみ
- Depth of field の Off 時はボケ 0（入れ替えのみ）。`localStorage["journal-dof"]` を一覧と共有
- テーマは `localStorage.theme` を共有

**実験的な要素はステージの「ピント送り」だけ**に絞っています。本文は普通に流れ、JS が無くても読めます（後述のフォールバック）。

## Design Files
- `design/Post.dc.html` — デザインリファレンス。Tweaks：`article`（travel / gear のサンプル切替）、`layout`（auto / desktop / mobile）、`bodyFont`（mincho / gothic。採用は mincho）、`dof`
- 本番は Jekyll + Liquid + 素の CSS / JS で作り直してください

## Fidelity
High-fidelity。値はすべて確定。ブレークポイントは **760px**（未満がモバイル）。

---

## デスクトップ（≥760px）

ページ：`max-width:1600px; margin:0 auto; padding:0 48px; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); gap:56px`

### 左カラム（本文）
- ヘッダー（高さ 80px）：サイト名＋縦罫＋`Journal`（一覧と同じ書式、`Journal` は一覧へのリンク）。nav は右カラム上端に置く
- 記事頭（`max-width:620px; padding-top:64px`、縦 gap 22px）
  - メタ：`{Category} — {YYYY.MM.DD}`、11px、0.16em、uppercase、`--sub`
  - タイトル：Shippori Mincho 500、`clamp(32px,3.2vw,44px)`、line-height 1.3、`text-wrap:pretty`
  - リード（`lead`）：Shippori Mincho 18px、line-height 1.9、`--sub`
  - 機材・アルバム行：上下 1px `--rule`、`padding:14px 0`、10px、0.14em、uppercase、`--sub`。左 `{camera} · {lens}`、右 `Album — {album.name} ↗`（`album` があるときのみ）
- 本文（`max-width:620px; padding-top:48px`）
  - 書体：**Shippori Mincho 400、17px / line-height 2.05**（確定）
  - 段落：`margin:0 0 1.4em; text-align:justify`
  - h2：Shippori Mincho 500、22px、line-height 1.5、`margin:2em 0 .9em`
  - 写真マーカー：28px × 1px の罫（`--line`）＋2 桁番号、IBM Plex Mono 10px、0.14em、`--sub`、gap 12px、`margin:.4em 0 1.8em`。`<button>` でクリック → その写真のポップアップ
- 末尾：上罫 1px、`padding:28px 0 140px`。左 `← Journal`（`min-height:44px; padding:0 18px`、1px `--line` 枠、11px、0.16em、uppercase）、右 `{date} · {Category}`（10px、`--sub`）

### 右カラム（ステージ）
- `position:sticky; top:0; height:100vh; min-height:560px; padding-bottom:32px`、縦 gap 18px
- nav（高さ 80px、右寄せ）：一覧と同じ。現在ページ `Journal` を `--ink`
- ステージ（残り高さ）：写真を全部重ねて置く。各写真は `position:absolute; inset:0` の中で `max-width/max-height:100%` に収める（トリミングしない）、`box-shadow:0 40px 80px -30px var(--shadow)`
- 下段：`grid-template-columns:auto 1fr auto; gap:16px`
  - `{現在番号2桁} / {総数2桁}`（10px、0.14em、`--sub`）
  - キャプション（Shippori Mincho 14px、`--sub`、1 行・省略記号）
  - 進捗：写真ごとに 20×1px の罫（gap 8px、`--ink`、現在 1 / 他 .25、`transition:opacity .6s`）

## モバイル（<760px）
- ヘッダー：`padding:20px`。サイト名 20px。nav は `Gallery / About` ＋テーマの丸（ラベルなし、タップ領域 32×44px）、gap 18px
- 記事頭：`padding:12px 20px 24px`、gap 16px。メタ 10px／タイトル 30px・line-height 1.35／リード 16px
- ステージ：`position:sticky; top:0; z-index:3; height:clamp(240px,40vh,360px); padding:12px 20px; background:var(--bg); border-bottom:1px solid var(--rule)`。下段は同構成で キャプション 12px、進捗罫 12px・gap 6px。写真は中サイズ（`_c`）
- 機材・アルバム行：ステージの直下（`padding:20px 20px 0`、下罫のみ、`Album ↗`）
- 本文：`padding:28px 20px 0`、Shippori Mincho 16px / 2.05、h2 20px、マーカー罫 20px
- 末尾：`margin:32px 20px 0; padding:20px 0 96px`

---

## Interactions

### アクティブ写真の決定
- 写真 0 = `cover`。本文中の写真は出現順に 1, 2, 3…
- `act` = 本文中のマーカーのうち、**上端が基準線より上にあるものの最大番号**（なければ 0）
- 基準線：デスクトップ `innerHeight × 0.55`、モバイル `innerHeight × 0.72`（ステージに隠れる分だけ下げる）
- `scroll` / `resize` を rAF で間引いて再計算。値が変わったときだけ DOM を更新

### ステージの重なり（`d = i - act`）
| d | transform | blur（On） | opacity | z-index |
|---|---|---|---|---|
| 0（現在） | none | 0 | 1 | 5 |
| 1（次） | `translate(5%,-4%) scale(.9)` | 7px | .3 | 4 |
| ≥2（先） | `translate(8%,-6%) scale(.84)` | 10px | 0 | 3 |
| <0（通過済） | `translate(-3%,4%) scale(1.05)` | 10px | 0 | 6 |

- transition：`filter .9s ease, opacity .9s ease, transform 1s cubic-bezier(.2,.7,.2,1)`（一覧の Hero と同じ）
- 現在の写真だけ `pointer-events:auto`（クリックでポップアップ）
- Depth of field Off：blur 0、現在のみ opacity 1・他 0。transform は残す
- `prefers-reduced-motion: reduce`：transform を none にし、opacity のみ切替
- 画像の読み込み：`|d| ≤ 1` は eager、他は lazy（総数が多い Travel 記事向け）

### ポップアップ
- ギャラリー（`design_handoff_gallery_redesign/README.md`）のポップアップ仕様をそのまま流用：背景 `rgba(20,19,17,.9)`＋`backdrop-filter:blur(20px)`、画像は大サイズ（`_k`）、マウス位置で ±15° の傾き、ホログラム（soft-light）、グレア
- 画像 `max-width:min(92vw,1600px); max-height:78vh`
- 下部：キャプション（Shippori Mincho 17px、`#e4e1db`）、`View on Flickr ↗`（写真ページ URL）、`ESC で閉じる`（デスクトップのみ）
- 閉じる：背景クリック／× ボタン（44×44）／Esc
- モバイルは傾きなし（`transform:none`）

---

## Jekyll

### front matter
```yaml
title: 台南、路地の午後
date: 2026-10-04
category: travel            # travel / gear / news
cover: https://live.staticflickr.com/65535/..._k.jpg
cover_caption: 西門路から一本入った路地。   # 任意（ステージ 01 とポップアップのキャプション。無ければ空）
lead: 観光地の裏側、生活の音が残る路地を一日かけて歩いた記録。   # 任意（一覧の抜粋にも使える）
camera: X-T5                # 任意
lens: XF35mm F1.4           # 任意
album:                      # 任意。Flickr アルバムまたはギャラリーの該当アルバム
  name: 台南 2026
  url: https://www.flickr.com/photos/.../albums/...
```
- `lead` が無ければ `page.excerpt` を strip_html して使う
- `camera` `lens` が両方無ければ機材行の左側は出さない。`album` も無ければ行ごと出さない
- 一覧（Journal）のヒーロー／カードで `cover` は `_c`／`_k` に置換して使う前提（既存どおり）

### 本文中の写真
推奨は include：
```liquid
{% include photo.html src="https://live.staticflickr.com/65535/55572761309_xxxx_k.jpg"
   thumb="https://live.staticflickr.com/65535/55572761309_xxxx_c.jpg"
   page="https://www.flickr.com/photo.gne?id=55572761309"
   caption="神農街の手前、昼下がりの路地。" %}
```
`_includes/photo.html` の出力（JS 無しでも読める普通の figure）：
```html
<figure class="post-photo" data-full="{{ include.src }}" data-thumb="{{ include.thumb | default: include.src }}"
        data-page="{{ include.page }}" data-caption="{{ include.caption }}">
  <img src="{{ include.thumb | default: include.src }}" alt="{{ include.caption }}" loading="lazy">
  <figcaption>{{ include.caption }}</figcaption>
</figure>
```
- Markdown の画像記法 `![キャプション](URL)` も許容：JS が `.post-body p > img:only-child` を拾い、`alt` をキャプション、`src` を大／中両方として扱う（Flickr URL なら末尾の `_k`/`_c` を置換して中サイズを作れる）
- `thumb` / `page` を省略した場合：`page` が無ければポップアップの `View on Flickr` を出さない

### JS の処理（`assets/js/post.js` を推奨）
1. `.post-body` 内の写真（`figure.post-photo` と画像だけの段落）を出現順に集め、`cover` を先頭に足して配列化
2. 各写真の位置に番号マーカー `<button class="photo-mark" data-mk="n">` を差し込み、元の figure は非表示（`hidden`）
3. ステージ（デスクトップ右／モバイル上。同じ DOM を CSS で配置替えしてよい）に写真を重ねて生成
4. scroll で `act` を計算し、各写真に `data-d`（-1 / 0 / 1 / 2）を付与 → 見た目は CSS の属性セレクタで定義
5. Depth of field は `html[data-dof="off"]` で blur を 0 に
- **フォールバック**：JS が無い／写真が 0 枚（cover のみの News 等）のときも成立するように、初期 HTML は「本文に figure がそのまま流れる 1 カラム」にし、JS 起動時に `html.has-stage` を付けて 2 カラムに切り替える
- cover しか無い記事（Gear・News に多い）は、ステージに cover 1 枚が固定で出るだけになる（`design/Post.dc.html` の `article: gear` を参照）

### レイアウトファイル
- `_layouts/post.html`：ヘッダー、記事頭、`<div class="post-body">{{ content }}</div>`、末尾、ステージの空コンテナ、ポップアップの空コンテナ
- フォントの追加は不要（本文は既存の Shippori Mincho）

## State
| 変数 | 内容 | 永続化 |
|---|---|---|
| `theme` | light / dark | `localStorage.theme` |
| `dof` | on / off | `localStorage["journal-dof"]`（一覧と共有） |
| `act` | 現在の写真 index | なし |
| `pop` | ポップアップ表示中の写真 | なし |
| `tilt` | ポップアップ内のマウス位置（-1〜1） | なし |

## Design Tokens
一覧（README.md）と同一。フォントも同じ 3 書体のみ（本文 = Shippori Mincho）。
