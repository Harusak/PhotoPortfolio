# Handoff: Journal 一覧（被写界深度）

> **配置について**：`docs/superpowers/specs/2026-10-journal-redesign/` などに置いてください（`.gitignore` が `docs/` 以外の `*.md` を無視するため）。`_config.yml` の `exclude` は `- docs`（末尾スラッシュなし）になっていることを確認してください。ギャラリーの引き継ぎ（`design_handoff_gallery_redesign/`）と同じ前提です。

## Overview
Harusak/PhotoPortfolio（Jekyll / GitHub Pages）のブログ一覧を、ギャラリーと同じ「被写界深度」テーマの Journal ページに置き換えます。

- ヒーロー：最新 3 記事。ホバーした記事にピントが合い、他はボケる（ピント送り）
- Archive：年ごとのグループ × 石垣（masonry）カラム。年グループにカーソルを入れると、記事ごとに割り当てた「奥行き」に応じてボケと視差がかかる
- カテゴリフィルタ（All / Travel / Gear / News）
- Depth of field の Off / On 切替（`localStorage` に保存）
- ライト／ダーク（既存の `localStorage.theme` を共有）

**記事ページ**（`_layouts/post.html`）の仕様は `POST.md` にあります。

**対象外**：デザイン検討中にあった「Lens」モード（SVG フィルタによる色収差・周辺減光・フォーカスブリージング）は今回実装しません。

## About the Design Files
`design/Journal.dc.html` は **HTML で作ったデザインリファレンス**です。見た目と挙動を示すプロトタイプで、本番コードではありません（独自ランタイム `support.js` に依存。同じフォルダに置けばブラウザで開いて操作できます）。
リポジトリの既存の作り方（Jekyll + Liquid + 素の CSS / JS）で作り直してください。React などの導入は不要です。記事データはプロトタイプ内にダミーで埋め込んでいますが、本番では `site.posts` から生成します。

## Fidelity
**High-fidelity。** 色・タイポ・余白・モーション・ボケ量の計算式はすべて確定値です。

---

## レイアウト

ページ全体：`min-height:100vh`、背景 `--bg`、`overflow-x:hidden`。背景色は `background-color .5s ease` でテーマ切替時にフェード。

### 1. Header
- `display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding:24px 48px`
- 左：サイト名 `Hal Sakaguchi`（リンク）＋縦罫（幅 1px・高さ 0.85em・`--line`）＋ `Journal`（`--sub`）。`Instrument Serif` → `Shippori Mincho` フォールバック、26px、line-height 1、要素間 gap 12px、`nowrap`
- 右 nav：`Gallery / Journal / About / IG` ＋テーマボタン。IBM Plex Mono 11px、letter-spacing 0.16em、uppercase、色 `--sub`、gap 32px。現在ページ（Journal）のみ `--ink`
- テーマボタン：9px の丸（1px `currentColor` 枠、ダーク時は塗り `currentColor`）＋ラベル `Light` / `Dark`、gap 8px

### 2. Hero（最新 3 記事）
- `height:min(720px,58vw); min-height:420px; padding:8px 48px 24px`
- `display:grid; grid-template-columns:minmax(0,1.75fr) minmax(0,1fr); gap:24px`
- **メイン（最新記事）**：画像を全面 `object-fit:cover`。下から `linear-gradient(to top, rgba(12,11,10,.7) 0%, rgba(12,11,10,0) 55%)`。テキストは `left/right:36px; bottom:32px`、縦 gap 12px、色 `#f2efe9`
  - メタ：`Latest — {Category} — {YYYY.MM.DD}`、11px、0.16em、uppercase
  - タイトル：Shippori Mincho、`clamp(28px,3.4vw,48px)`、line-height 1.2、`text-wrap:pretty`
- **サイド（2・3 番目）**：縦に 2 枚、gap 20px、各 `flex:1`。中は 画像（`flex:1` で残り高さを埋める、cover）→ メタ → タイトル、gap 10px
  - メタ：`{YYYY.MM.DD} · {Category}`、10px、0.14em、uppercase、`--sub`
  - タイトル：Shippori Mincho 20px、line-height 1.35

### 3. Archive（4 件目以降）
- セクション：`padding:56px 48px 96px`、縦 gap 8px
- 見出し行：`Archive`（Instrument Serif 48px、weight 400、line-height 1）／右にステータス表示（11px、0.16em、uppercase、`--sub`。後述）。`padding-bottom:12px`
- ツールバー：下罫 1px `--rule`。`flex-wrap:wrap; gap:12px 24px`
  - 左：ラベル `Filter`（10px、0.16em、uppercase、`--sub`、opacity .7）＋タブ（gap 28px）
    - タブ：`{Label} {件数2桁}`（ラベル 11px / 件数 10px、gap 8px）、`padding:14px 0`、下罫 1px（選択中 `--ink`、他 transparent、`margin-bottom:-1px` で罫線に重ねる）。色 選択中 `--ink` / 他 `--sub`
    - 件数は Archive 対象（ヒーロー 3 件を除く）内での数
  - 右：ラベル `Depth of field`（同スタイル、`margin-right:10px`）＋ `Off` / `On` のセグメント（gap 6px）
    - ボタン：`min-height:32px; padding:0 14px`、1px `--line` 枠、11px、0.08em。選択中は 背景 `--ink`・文字 `--bg`、他は透明・文字 `--ink`。`transition: background .25s, color .25s`
- 年グループ（降順）：`padding-top:40px`、縦 gap 24px
  - 年見出し行：年（Instrument Serif 36px、line-height 1）＋伸びる 1px 罫（`--rule`）＋ `{件数2桁} entries`（10px、0.14em、`--sub`）、gap 16px、`align-items:baseline`
  - 別の年グループにカーソルがある間、他グループの年は `--sub` に（`transition: color .4s`）
  - カラム：`display:flex; gap:24px; align-items:flex-start`。各カラム `flex:1; min-width:0`、カード縦 gap 32px
  - カード：画像 → メタ → タイトル、gap 10px
    - 画像：幅 100%、`aspect-ratio` は下記、cover、プレースホルダ背景 `--rule`、`box-shadow:0 24px 48px -30px var(--shadow)`、`loading="lazy"`
    - メタ：`{YYYY.MM.DD} · {Category}`、10px、0.14em、uppercase、`--sub`
    - タイトル：Shippori Mincho 18px、line-height 1.45、`text-wrap:pretty`

### Masonry の割り付け
- カラム数：Archive コンテナ幅で決定（ResizeObserver）。`≥1000px → 4`、`≥680px → 3`、それ未満 `2`
- 画像比率：`ARS = ["4/5","3/2","1/1","3/4","4/3","2/3"]`、記事の通し番号 `i`（新しい順 0 始まり、ヒーロー含む）で `ARS[(i*7) % 6]`。本番で記事にカバー画像の実寸があればそれを使って構いません
- 各カードを「現在いちばん低いカラム」に追加。高さは `h/w + 0.3`（キャプション分）で積算
- 年グループごとにカラムをリセット

---

## Interactions & Behavior

### 共通
- カード `<a>` の transition：Archive は `filter .5s ease, opacity .5s ease, transform .8s cubic-bezier(.2,.7,.2,1)`、Hero は `filter .9s, opacity .9s, transform 1s`（同 easing）
- `a:hover { opacity:.65 }`
- Depth of field = **Off** のとき：ボケ 0、opacity 1。視差（transform）は残る

### Hero：ピント送り
- フォーカス対象 `hf`：ホバー中のカード index（0=メイン,1,2）、ホバーなしは 0
- 各カード `idx`：
  - `blur = |idx - hf| × 4 × 0.53` px（On 時）
  - `opacity = idx === hf ? 1 : 0.75`（On 時）
  - 視差：Hero 領域内のマウス位置 `mx,my ∈ [0,1]`、`k = (3 - idx) × 6` として `translate(-(2mx-1)·k px, -(2my-1)·k·0.6 px)`。領域外では中央（0,0）
- Hero から出たらフォーカス・マウス位置をリセット

### Archive：奥行きとピント
- 年グループ内の記事数 `N`、記事の並び順 `j`（0 始まり）に対し奥行き面 `z = (j × step) mod N`
  - `step`：`N<3` なら 1。それ以外は `max(2, round(N×0.38))` から始めて `gcd(step,N)=1` になるまで +1（隣り合うカードが離れた奥行きになる）
- カードにホバー → その年のピント面 `zf = z`（年ごとに保持。初期値 0）
- **アクティブな年グループ（カーソルが中にある年）だけ**効果をかける。他の年は blur 0 / opacity 1 / transform none
  - `dz = |z - zf|`、`den = max(1, N-1)`、`t = z / den`
  - `blur = dz<=0.001 ? 0 : 4 × (0.2·min(1,dz) + 0.8·max(0,dz-1)/max(1,N-2))` px
  - `opacity = 1 - 0.3·min(1, dz/den)`（小数 2 桁）
  - 視差：グループ内マウス位置 `mx,my ∈ [-1,1]`、`k = 6 + 14·(1-t)` → `translate(-mx·k px, -my·k·0.5 px) scale(1 - 0.06·t)`（手前ほど大きく動き、奥ほど小さく縮む）
- グループから出たらアクティブ解除・マウス位置を中央に戻す
- ステータス表示（Archive 見出し右）：
  - On・アクティブ年あり：`{YYYY} · focus {距離} · plane {zf+1 2桁} / {N 2桁}`
  - 距離：`d = 0.8 × 15^(zf/den)` m。10 未満は小数 1 桁（`0.8 m`）、以上は整数（`12 m`）
  - On・アクティブなし：`focus —`
  - Off：`depth of field off`

### フィルタ
- タブクリックで Archive の対象を絞り込み、アクティブ年を解除。ヒーローは常に最新 3 件（フィルタの影響なし）
- 絞り込み後に該当のない年は表示しない

### 視差の無効化
- プロトタイプの `parallax` プロパティ（既定 true）を false にすると、Hero・Archive とも translate/scale が 0。本番では `prefers-reduced-motion: reduce` のとき視差を無効にしてください

### レスポンシブ
- Hero のグリッドは全幅で 1.75fr / 1fr のまま（狭幅の扱いはプロトタイプで未定義。`<680px` ではメイン 1 枚＋サイド 2 枚を縦積みにするのを推奨）
- タッチ端末ではホバーが無いため、Depth of field の効果は実質かからない（ボケ 0 の通常一覧として見える）

---

## State
| 変数 | 内容 | 永続化 |
|---|---|---|
| `theme` | `light` / `dark` | `localStorage.theme`（既存と共有） |
| `mode` | `on` / `off`（既定 on） | `localStorage["journal-dof"]`。旧値 `lens` は `on` として扱う |
| `filter` | `all` / `T` / `G` / `N` | なし |
| `heroFocus`, `heroMouse` | Hero のホバー index とマウス位置 | なし |
| `activeYear` | カーソルがある年 | なし |
| `focusByYear` | 年ごとのピント面 `zf` | なし |
| `groupMouse` | アクティブ年内のマウス位置 | なし |
| `columns` | 2 / 3 / 4 | なし |

テーマ適用は `document.documentElement` に CSS 変数を設定し、`color-scheme` も切り替えます。

## データ（Jekyll）
- `site.posts`（新しい順）を使用。先頭 3 件をヒーロー、残りを Archive
- 各記事に必要な front matter：
  - `title`
  - `date` → `YYYY.MM.DD` 表示、年でグループ化
  - `category`：`travel` / `gear` / `news`（表示は `Travel` / `Gear` / `News`。既存のカテゴリ名に合わせて対応表を作ってください）
  - `cover`：カバー画像 URL（Archive は中サイズ、メインヒーローは大サイズ。Flickr なら `_c` / `_k` など）
- リンク先は `post.url`
- フィルタ・ピント計算はクライアント JS。Liquid では `data-year` `data-category` `data-index` などを各カードに出力し、JS でカラム割り付けと効果を行う形を推奨
- 注意：この README には Liquid と紛らわしい `{ }` 記法が出てきます。`docs/` が `exclude` されていることを必ず確認してください

## Design Tokens
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#e1dfda` | `#161513` |
| `--ink` | `#1c1b19` | `#e4e1db` |
| `--sub` | `#5f5b55` | `#948f86` |
| `--rule` | `rgba(28,27,25,0.14)` | `rgba(228,225,219,0.14)` |
| `--line` | `rgba(28,27,25,0.35)` | `rgba(228,225,219,0.35)` |
| `--shadow` | `rgba(40,35,30,0.45)` | `rgba(0,0,0,0.7)` |

- ヒーロー上の文字：`#f2efe9`、グラデーション `rgba(12,11,10,…)`
- フォント（Google Fonts）：`Instrument Serif`（400, italic）、`IBM Plex Mono`（400, 500）、`Shippori Mincho`（400, 500）
  - 欧文見出し：Instrument Serif／和文タイトル：Shippori Mincho／UI・メタ：IBM Plex Mono
- 本文ベース：IBM Plex Mono、`-webkit-font-smoothing:antialiased`
- 余白：ページ左右 48px。主な gap 6 / 8 / 10 / 12 / 16 / 20 / 24 / 28 / 32 / 40px
- 角丸なし（テーマボタンの丸のみ 50%）

## Assets
- 画像はすべて Flickr（`live.staticflickr.com`）のダミー。本番は記事の `cover` を使用
- アイコンなし

## Files
- `design/Journal.dc.html` — デザインリファレンス（Lens モードを除いた版）
- `POST.md` / `design/Post.dc.html` — 記事ページの仕様とデザインリファレンス
- `design/support.js` — プレビュー用ランタイム（実装には不要）
