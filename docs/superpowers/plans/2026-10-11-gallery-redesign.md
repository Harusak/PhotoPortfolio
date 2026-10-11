# Gallery Redesign（被写界深度）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.html` のギャラリーを引き継ぎ資料（`docs/superpowers/specs/2026-10-gallery-redesign/README.md`）どおりの「被写界深度」デザインに置き換え、写真データを Flickr からビルド時に自動取得する。

**Architecture:** Jekyll + 素の CSS / JS の単一ページ（`index.html`）を維持。データは `_data/gallery.json`（Actions 上で `scripts/fetch-flickr.mjs` が生成、失敗時はコミット済みのフォールバック）を Liquid で `<script type="application/json">` に埋め込み、JS がヒーロー／アルバムビュー／ポップアップを組み立てる。アルバムカードは Liquid で出力し、JS は配置・ぼけ・視差だけを付ける。画面状態はハッシュ（`#/album/<id>`, `#/journal`, `#/about`）と同期。

**Tech Stack:** Jekyll 4.3, Liquid, vanilla JS/CSS, Node 20+（取得スクリプト）, GitHub Actions（Pages デプロイ）

数値・挙動の正は README（以下「spec」）。各タスクは spec の該当節を参照する。

---

### Task 1: ビルド設定とデータパイプライン（spec §1）

**Files:**
- Modify: `_config.yml`（`exclude` を `docs` に修正し、`scripts` / `flickr.config.json` / `node_modules` / `error-*.md` を追加）
- Modify: `.gitignore`（`Gemfile.lock` を外す）
- Create: `scripts/fetch-flickr.mjs`（`reference/fetch-flickr.mjs` をコピー）
- Create: `flickr.config.json`（`reference/flickr.config.json` をコピー）
- Create: `.github/workflows/pages.yml`（`reference/pages.yml` をコピーし、action のメジャー版を確認）
- Create: `_data/gallery.json`（`reference/gallery.sample.json` をコピー）

- [ ] `node scripts/fetch-flickr.mjs` を環境変数なしで実行 → 警告を出して `_data/gallery.json` を上書きしないこと
- [ ] `bundle exec jekyll build` が成功し、`_site/docs` が生成されないこと
- [ ] Commit

### Task 2: テーマトークンとフォント、ヘッダー（spec §2.0, §4）

**Files:** Modify: `index.html`

- [ ] `<head>` のインラインスクリプトで `localStorage.theme` を `<html data-theme>` と `color-scheme` に描画前に適用
- [ ] `:root` / `html[data-theme="dark"]` にトークン定義、Google Fonts（Instrument Serif / IBM Plex Mono / Shippori Mincho）
- [ ] 旧ヘッダー・下部ガラスナビ・blob 背景・フィルター UI を削除し、新ヘッダー（ロゴ、`| Albums` サフィックス、Gallery/Journal/About/IG/テーマ切替）に置換
- [ ] テーマ切替時は `body.light/.dark` も同期（Journal / About / `post.html` 互換）

### Task 3: ヒーロー「ピント送り」（spec §2.1）

- [ ] ステージとスロット配置（wide / narrow）、featured→表紙→アルバム写真の順で 3 枚を補完、向きでスロット割当
- [ ] 3400ms 自動送り（トップ以外・ポップアップ中は停止）、クリックでピント移動／ポップアップ
- [ ] 下部の行（IN FOCUS＋タイトル、`ALBUMS ↓`、3 本のバー）

### Task 4: アルバム一覧「散在する被写界」＋フッター（spec §2.2, §2.3）

- [ ] Liquid でカード（`<a href="#/album/<id>"><img><span>…`）を出力。JS 無しでも並んで表示される既定スタイル
- [ ] `genField`（モード別キャッシュ、n = アルバム数、FALLBACK）、ホバーでピント、desktop の視差、`FOCUS {距離} M`
- [ ] `| Albums` サフィックス表示と h2 フェード（scroll, passive）、共通の「アルバム一覧へ」スクロール（-104px）

### Task 5: アルバムビュー「揺らぐ水平線」（spec §2.4, §3）

- [ ] ハッシュルーティング（`#/album/<id>` / `#/journal` / `#/about` / トップ）。戻るボタン対応、ルーティングは冪等
- [ ] `genOffsets`（開くたびに再生成）、transform / blur / opacity 計算、`pos ± 2` の遅延読み込み
- [ ] ホイール（累積 40・650ms ロック）、←/→、スワイプ（40px）、両隣クリック、Esc

### Task 6: ホログラムポップアップ（spec §2.5）

- [ ] 新配色のオーバーレイ（どこをクリックしても閉じる）、傾き（画面幅・高さ×.35 で正規化）、ホロ層＋グレア
- [ ] タイトル、`VIEW ON FLICKR ↗`（`stopPropagation`、`page` が空なら `photo.gne?id=`）、`ESC で閉じる`、× ボタン
- [ ] タッチ：`touchmove`（passive: false）で傾き、タップは閉じる

### Task 7: Journal / About の受け皿と後片付け

- [ ] 既存 blog / about セクションを新ヘッダーの下に表示（既存の見た目を維持）
- [ ] `_data/photos.yml` を削除、`CLAUDE.md` を新構成に更新
- [ ] `bundle exec jekyll build` 成功、ブラウザで desktop / mobile 幅・両テーマを確認
- [ ] Commit
