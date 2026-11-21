# Journal 一覧 2026-11 改訂（フォーカス操作・DoF 常時 On）設計

## 意図
Journal 一覧（`index.html` の `#/journal`）を、デザイン引き継ぎ `docs/superpowers/specs/2026-11-journal-redesign/design_handoff_journal/`（`README.md`・`FOCUS.md`）の 2026-11 改訂版に合わせる。
10 月版では「ピントを合わせる」体験がマウスのホバーに限られ、タッチ端末ではボケのない普通の一覧だった。今回は入力（マウス／タッチ）ごとに「どのカードにピントを合わせるか」を定義し、両方で同じ AF ブラケットを見せることで、どの端末でも被写界深度の一覧として成立させる。被写界深度は常に On とし、切替 UI はなくす。

正となる仕様は引き継ぎの `README.md` と `FOCUS.md`（値はすべて確定値）。本書はそれを既存コードにどう載せるか、および引き継ぎで未定だった点の決定を記す。

## ゴール
- Depth of field の Off / On 切替を Journal 一覧から削除し、常に On。
- 記事ページ（`_layouts/post.html`）の dof 処理も削除し、常に On（ユーザー決定）。
- マウス方式：OS カーソルを消し、AF ブラケットのカーソルを描く。カード上で写真の外周へ広がりロック（`FOCUS.md`「マウス方式」）。
- タッチ方式：合焦ライン（非表示）でピント、相対的な列切替、タッチ時のみ AF ブラケット、ピント送りの補間、ブリージング、視差（`FOCUS.md`「タッチ方式」）。
- 入力方式は `html[data-input]` で保持し、Pointer Events の `pointerType` で随時切り替える（画面幅では判定しない）。
- キーボード：`:focus-visible` のカードにブラケットを付け、`focusKey` にする（`FOCUS.md`「キーボード（推奨）」）。
- `prefers-reduced-motion` 対応（`FOCUS.md`「動きを減らす設定」）。
- タッチ方式・2 列時のレイアウト値（`FOCUS.md`「レイアウト（タッチ方式・2 列のとき）」）のうち、ヘッダー以外を反映。

## 非ゴール
- モバイルのメニューボタン（2 本線）と sticky ヘッダー。**ヘッダーは今の共通ヘッダー（fixed、Journal / About / テーマ）のまま**（ユーザー決定 A）。
- Lens モード、マウス方式のブリージング、プロトタイプの Tweaks の不採用値、検証用表示（画面下の読み取り表示、「記事を開く →」の帯、合焦ラインのガイド、旧案の AF 点）、PC でのドラッグによるタッチ模擬。
- Gallery の Albums 一覧への展開（引き継ぎで「使える」とされているが今回は対象外）。
- 記事ページ「シーン送り」自体の変更（dof 削除以外）。

## アンチゴール（動いても失敗とみなすもの）
- タップ／クリックが 1 回でリンクを開かない（2 回タップが必要になる、列切替のジェスチャーでリンクが開いてしまう、など）。
- タップ後の疑似マウスイベントでマウス方式に切り替わり、タッチ端末でカーソルが消える。
- 縦スクロール中の自然な横ぶれで列が行き来する。
- Journal 以外のビュー（トップ・アルバム・About）でカーソルが消える、または rAF が回り続ける。
- 縦スクロールが重くなる（スクロールハンドラ内で毎回レイアウトを強制する、rAF を常時回す等）。
- JS なしで一覧が見られなくなる（今の Liquid のグリッド表示は維持）。

## 制約
- Jekyll + Liquid + 素の CSS / JS。依存追加なし。`baseurl` のため URL は `relative_url`。
- 既存の書き方：`index.html` のインライン CSS とボトムの IIFE、純粋計算は `post-scenes.js` と同じく `window.X` ＋ `module.exports` の UMD で `node --test scripts/test/*.test.cjs`。
- コメントは日本語。
- ばね・補間の係数は 60fps の rAF 1 フレームあたりの値（`FOCUS.md`）。フレーム時間による補正はしない（プロトタイプどおり）。

## アプローチ
検討した 3 案：
1. **純粋計算を `assets/js/journal-focus.js` に分け、DOM・イベント・rAF は `index.html` の IIFE に足す**（採用）。タッチ側は数値仕様が多く実機確認がしにくいので、計算をテストで押さえられる。記事ページの `post-scenes.js` と同じ形で、既存の作り方から外れない。ファイルが 1 つ増えるのが代償。
2. すべて `index.html` 内に書く。ファイルは増えないが、ばね・ヒステリシス・列切替がテストできず、1800 行の `index.html` がさらに数百行増える。
3. Journal の JS をまるごと `assets/js/journal.js` に移す。整理としては最良だが、動いている部分まで移すことになり今回の目的に対して差分が大きい。

ユーザーは案 1 を選択。

## 設計

### ファイル
| ファイル | 変更 |
|---|---|
| `assets/js/journal-focus.js`（新規） | 純粋計算。`window.JournalFocus` ／ `module.exports` |
| `scripts/test/journal-focus.test.cjs`（新規） | 上のユニットテスト |
| `index.html` | DoF 切替の削除、入力方式、AF ブラケットのオーバーレイ、マウス／タッチのフォーカス、rAF ループ、2 列時レイアウト、Journal のフッター、`<script src=journal-focus.js>` |
| `_layouts/post.html` | `journal-dof` の読み取り、`data-dof` 属性、`html[data-dof="off"]` の CSS を削除 |
| `assets/js/post.js` | dof の参照があれば削除（現状なし） |
| `CLAUDE.md` | Journal の記述を更新（DoF 切替削除、フォーカス操作、`journal-focus.js`、spec のパス） |

`localStorage["journal-dof"]` は読まない・書かない。既存の値は放置する（害がないため削除処理も入れない。builder の判断で `removeItem` してもよい）。

### `journal-focus.js` に入れる純粋関数（目安）
DOM に触れず、数値・矩形（`{left, top, width, height}` 相当のプレーンオブジェクト）だけを受け取る。
- 既存から移す：`stepFor(N)`、`distAt(t)`（文字列）、`blurAt(dz, N)`、`gcd`。`index.html` 側の定義は削除してこちらを使う。
- `heroLook(idx, hf)` / `archiveLook(z, zf, N, mx, my, px)` 相当：blur・opacity・transform 値（README の式。タッチ方式では `zf` に補間値 `zv` を渡す）。ヒーローのタッチ方式の opacity は `1 − 0.3·min(1, dz/2)`（プロトタイプどおり、Archive と同じ式で N=3）、マウス方式は README の `.75`。
- `focusLineY(scrollTop, scrollHeight, h)`：`h × (0.4 + 0.42·t)`。
- `pickFocus(cards, lineY, colX, current)`：得点 `d×1000 + (dx>0 ? 200000 + dx×1000 : 0) + |中心y − lineY|` の最小、ヒステリシス 16px（今のカードが選択中の列にあり、ラインとの距離 ≤ 16px なら維持）。全幅のヒーローのメインは「どの列にも属する」＝ `dx` を 0 として扱う。
- `columnCenter(col, n, width)`：`(col + 0.5) / n × width`。
- `swipeStep(state, x, T, nCols)`：相対列切替。しきい値 12px、越えた後は `±T/2` まで保持、3 列以上は越えるたびに `x0`・`c0` を置き直す。戻り値は新しい `{ x0, c0, shift, col }`。
- `spring(cur, v, target)`：`v = (v + (target − cur) × 0.2) × 0.64; cur += v`。
- `approach(cur, target, k, eps)`：`cur += (target − cur) × k`、差が eps 未満で target に揃える（zv、ラベル opacity、ブラケット opacity、ブリージング中心に使う）。
- `inflate(rect, px)`、`isLocked(cur, target)`（幅・x とも 6px 未満）。
- `breathScale(zv, den)`：`1 + 0.02 × (1 − zv/den)`。
- `parallaxFromOrigin(ox, oy, w, h)`：`mx, my ∈ [−1,1]` にクランプ。

### 入力方式
- 初期値：`matchMedia("(hover: hover) and (pointer: fine)")` → `mouse` / `touch` を `document.documentElement.dataset.input` に。
- `pointerdown` / `pointermove`（`window`、capture、passive）で `pointerType` を見て切替。`mouse` → mouse、`touch` / `pen` → touch。
- ホバー系は Pointer Events で `pointerType === "mouse"` のときだけ。既存 Journal の `pointerenter` 等も同様（既にそうなっている）。
- カーソル非表示は CSS `html[data-input="mouse"] .view-journal, html[data-input="mouse"] .view-journal * { cursor: none }`。共通ヘッダーは `.view-journal` の外なので通常カーソルのまま（ヘッダー上ではブラケットも出さない＝ポインタがヘッダー上なら非表示扱い。builder の判断でよい）。
- 切替時に `focusKey` とピント面は引き継ぐ。ブラケットはマウスならポインタ位置、タッチなら指の位置から 22×22 で出直す。

### フォーカスの状態（両方式共通）
- グループ：ヒーロー（`hero`、N=3、z = idx）と年グループ（`buildArchive()` が作る `jx.groups`、z = `c._jz`）。
- `focusKey`：ピントの合ったカード要素。`activeGroup`：その所属グループ（マウス方式で何も乗っていなければ、ポインタの下のグループ。ヒーローは既存どおり「ホバーなしは 0 番にピント」）。
- グループごとの `zf`（既存 `jx.tg`）と表示値 `zv`（タッチのみ補間、マウスと reduced-motion では `zv = zf`）。
- フィルタ切替（`buildArchive()`）でアクティブ年を解除。`focusKey` が非表示になったカードなら解除し、タッチ方式では次の判定で選び直す。
- Archive 見出し右のステータスは README どおり（アクティブ年ありなら `{YYYY} · focus {距離} · plane …`、なしは `focus —`）。タッチ方式でヒーローがアクティブの間は `focus —`。

### マウス方式
- 見た目・挙動は `FOCUS.md`「マウス方式」と `design/JournalCursor.dc.html` のとおり。
- 毎フレーム `document.elementFromPoint(x, y).closest("[data-card]")` でカードを決める（ホイールでのスクロールに追従するため）。今の `pointerenter` ベースのカード／年グループ判定はこれに置き換えてよい。視差の基準はグループ内のポインタ位置（今どおり）。
- ボケ・opacity・視差は CSS transition のまま（今の `renderJHero()` / `renderArchive()` を流用）。ブリージングなし。
- ポインタがウィンドウ外に出たら（`pointerout` で `relatedTarget == null`）ブラケットを消す。

### タッチ方式
- `FOCUS.md`「タッチ方式」と `design/JournalTouch.dc.html`（採用値のみ）のとおり。
- 合焦ライン判定は `scroll` を rAF で間引き。カードの矩形は判定時に `getBoundingClientRect()` で取る（カード数は数十件なので許容）。
- `touchstart` / `touchmove` / `touchend` は `passive: true`（縦スクロールは止めない。横方向の `preventDefault` もしない）。
- アクティブでないグループ（ヒーローを含む）は `blur(1.8px)`・opacity 0.78。カードの `filter` は transition なし、`opacity .3s`、`transform .8s cubic-bezier(.2,.7,.2,1)`。方式ごとの transition の違いは `html[data-input]` のセレクタで切り替える。
- ブリージング：アクティブなグループのコンテナ（ヒーローは `#j-hero`、年グループは `.j-cols`）に `position:relative` と `scale(...)`・`transform-origin`。中心は毎フレーム × 0.2 で寄せ、グループが替わったら即置き換え。マウス方式へ替わったら scale を外す。
- タップは通常のリンク遷移。ただし **その指の操作中に列切替（`shift ≠ 0`）が起きた場合だけ**、指を離した直後の `click` を `#view-journal` の capture で `preventDefault` して取り消す（アンチゴール「列切替のジェスチャーでリンクが開く」への対策。私の判断）。動かさないタップ・縦スクロールには何もしない。iOS Safari / Android Chrome の実機で確認する。
- **既知の制約（ユーザー了承・デザイン班へ確認中）**：幅 680px 以上のタッチ方式では、ヒーローが「メイン＋右に 2 枚縦積み」のままなので、右上のカードは合焦ライン（最上部で `0.4h`）より常に上にあり、ピントが合わない（ボケたまま。タップでは開ける）。引き継ぎの仕様どおりに実装し、特別扱いはしない。デザイン班の回答によって後で修正する。

### AF ブラケット
- `index.html` の `#view-journal` 内（または直後）に固定オーバーレイ 1 つ：`position:fixed; inset:0; pointer-events:none; z-index:120; aria-hidden="true"`。四隅 11×11px、`1.5px solid currentColor`、色 `--ink`、ラベル `● AF  {距離}`（IBM Plex Mono 10px、0.14em、uppercase）。
- 位置・大きさは `spring()`、表示は `approach()`。描画は `transform: translate()` と `width/height`（または四隅を個別に translate）で行う。
- Journal ビューが非表示（`viewJournal.hidden`）の間はオーバーレイを隠し、rAF を止める。

### rAF ループ
- 常時は回さない。入力（ポインタ移動・スクロール・タッチ・フォーカス）で `kick()` して開始し、ばね・補間・opacity がすべて収束し、かつ最後の操作から 900ms＋フェード時間が過ぎたら止める。
- 1 フレームの処理：入力方式に応じたフォーカス判定 → `zv`・中心の補間 → カードのスタイル反映 → ブラケットの更新。

### キーボード
- カードの `focusin` で `:focus-visible` を確認し、そのカードを `focusKey` に、ブラケットをそのカードへ（ポインタ位置は使わない）。ブラケット表示中はそのカードの `outline` を消し、ブラケットが消えたら戻す。

### 動きを減らす設定
- ばねを使わず目標へ即配置、opacity は `.2s` の CSS transition。ブリージング・視差なし。`zv = zf`。既存の `reduceMotion` の `change` リスナーで切り替える。

### レイアウト（2 列のとき＝`max-width: 679px`）
`FOCUS.md`「レイアウト（タッチ方式・2 列のとき）」のうちヘッダー以外を反映。条件は画面幅のメディアクエリ（カラム数と同じく方式とは独立）。
- ヒーロー：`padding:0 20px`、縦 gap 22px。メイン 4/5、テキスト 20px、メタ 10px、タイトル 28px / 1.25。サイド 2 枚は 2 列グリッド gap 14px、画像 1/1、カード内 gap 8px、タイトル 16px / 1.4。
- Archive：`padding:48px 20px 40px`、見出し 40px（`padding-bottom:10px`）。フィルタは横スクロール（スクロールバー非表示）、タブ gap 22px、`min-height:44px`。年グループ `padding-top:32px`、gap 20px、年 30px。カラムは 2 列 gap 14px、カード縦 gap 26px、カード内 gap 8px、タイトル 15px / 1.45。
- 既存の `@media (max-width: 679px)` の Journal 部分（サイド画像 3/2 縦積み）はこれで置き換える。

### Journal のフッター
今の Journal ビューにはフッターがない。プロトタイプに合わせ、`#view-journal` の末尾に `site-footer`（`© Hal Sakaguchi` / `Journal`）を足す。2 列時は `padding:28px 20px 80px`、10px。（私の判断）

## 決定事項の出所
- ユーザー決定：ヘッダーは現状維持（メニューボタンなし）／記事ページの dof も削除／アプローチ 1／幅 680px 以上のタッチでヒーロー右上に合焦しない点は当面そのまま（デザイン班へ確認）。
- 引き継ぎで確定：ボケ・視差・ばね・合焦ライン・列切替などの数値すべて。
- 私の判断（レビュー時に確認してほしい点）：Journal にフッターを追加／`journal-dof` は消さず放置／共通ヘッダー上ではブラケットを出さない／rAF の開始・停止の条件／マウス方式のカード判定を `elementFromPoint` に統一。

## builder に任せる点
- `journal-focus.js` の関数の粒度・名前・引数の形。
- ブラケットの DOM 構造（四隅を 4 要素にするか疑似要素にするか）と描画方法。
- 既存 `renderJHero()` / `renderArchive()` を新しい描画にどう統合するか（マウス方式の見た目は今と同じであること）。
- 入力方式の切替時やビュー切替時の細かな後始末。
