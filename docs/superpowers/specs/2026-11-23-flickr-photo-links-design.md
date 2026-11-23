# Flickr 写真リンクの自動解決と写真ピッカー 設計

2026-11-23。提案ページ（https://claude.ai/artifact/KPrkFcDvGqhszZpDtdgdDj）の案 A と案 C を実装する。

## 目的

Journal 記事に Flickr の写真を貼るときの手作業を 2 つなくす。

1. 埋め込みコードから画像 URL（`live.staticflickr.com/…_3k.jpg`）を抜き出す作業。
2. モバイル用の中サイズ URL（`_c`）を別に探して貼る作業。

`_b`（1024px）より大きいサイズはサイズごとに secret が違うため、URL 末尾の置換ではモバイル用の URL を作れない（写真 55655753948 で確認。`_3k` の secret を `_c` に流用すると 410）。そのため写真 ID から `flickr.photos.getSizes` で全サイズを取得する。

書き手は **Flickr の写真ページ URL だけを書く**。記事を書くとき、写真は Flickr の Photostream から新しい順に探している。

## ゴール

- 本文の `{% include photo.html flickr="<写真ページ URL>" caption="…" %}` が、大サイズとモバイル用のサイズ、View on Flickr のリンクに自動で展開される。
- front matter の `cover` / `image` にも写真ページ URL を書ける。記事ページのステージ、JS なしの cover、Journal 一覧のカード（ヒーローの大きい画像、サイドとアーカイブのサムネイル）がすべて解決後の URL を使う。`thumb` / `cover_thumb` / `cover_page` は書かなくてよくなる。
- 既存記事の直接の画像 URL（`live.staticflickr.com/…_3k.jpg` など。include の `src`、front matter、Markdown の `![](…)`）も、URL から写真 ID を取り出してモバイル用の `_c` を補う。書いた URL 自体はそのまま大サイズとして使う。
- ローカル専用の写真ピッカー（`node scripts/flickr-picker.mjs`）。Photostream を新しい順に並べて写真を選び、記事用のコードをまとめてコピーできる。

## やらないこと

- Markdown の画像記法 `![](写真ページ URL)` への対応（Jekyll プラグインが必要になるため。本文で写真ページ URL を使うときは `photo.html`）。
- 公開サイトの JS から実行時に Flickr API を呼ぶこと（CORS が無く、API キーも公開したくない）。
- ピッカーの公開・デプロイ。Chrome 拡張（提案ページの案 B）。
- 非公開写真の扱い（キーだけの API 呼び出しでは取得できない）。
- Flickr のタイトルをキャプションに自動で使うこと（タイトルが `Timeline 3_00086400` のような書き出し名のことがあるため）。

## 失敗とみなすもの

- 記事に写真ページ URL を書いたのに、本番で画像が出ない。
- API が落ちたり未設定だったりしたときにビルドが止まる、または既存の解決結果が消える。
- 既存記事の表示が今より悪くなる（今出ている画像が出なくなる）。

## 制約

- GitHub Pages を GitHub Actions でビルドしている。`pages.yml` は `node scripts/fetch-flickr.mjs` → `jekyll build` の順で動き、キーは Secret `FLICKR_API_KEY`、ユーザーは Variable `FLICKR_USER_ID`。ローカルは `.env`。
- Node スクリプトは依存なし（Node 20.12+、`process.loadEnvFile`）。Ruby のプラグインは入れない。
- 失敗時は既存のデータファイルを残す（今の `gallery.json` と同じ方針）。
- すべてのリンクは `relative_url` を通す（`/assets/…` の画像もこれまでどおり動くこと）。
- `scripts/` と `docs/` は Jekyll のビルド対象外。
- 日本語のコメント。

## 検討した作り方

**A：写真ページ URL を画像 URL に置き換える方法**

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| **A-1 Liquid + データ（採用）** | Node が記事を走査して全サイズを `_data/flickr_photos.json` に保存し、テンプレートが Liquid で引く | 今の仕組み（Liquid + `_data`）のまま。依存が増えない | Markdown 画像記法では写真ページ URL を使えない |
| A-2 Jekyll プラグイン | ビルド時に front matter と本文の写真ページ URL を書き換える | Markdown 画像記法でも写真ページ URL を使える | Ruby のコードが新しく入り、保守する言語が増える |
| A-3 記事ファイルを書き換える | スクリプトが .md の URL を置換する | 最も単純 | 記事に長い URL が戻り、目的に反する |

**C：ピッカー**

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| **C-1 Node のローカルサーバー（採用）** | `node scripts/flickr-picker.mjs` → localhost。Node が `.env` のキーで API を中継する | キーがブラウザに出ない。A と API 呼び出し部分を共有できる | 使うたびに起動が要る |
| C-2 静的 HTML + JSONP | ブラウザから Flickr API を直接呼ぶ | サーバー不要 | キーをブラウザに保存する。JSONP という古い方式に依存する |

利用者が A-1 と C-1 を選んだ。

## 決まっていること

### データファイル `_data/flickr_photos.json`

```json
{
  "generatedAt": "2026-11-23T…Z",
  "photos": {
    "55655753948": {
      "page": "https://www.flickr.com/photos/194776399@N02/55655753948/",
      "title": "Timeline 3_00086400",
      "full": "https://live.staticflickr.com/65535/55655753948_e18dee666e_3k.jpg",
      "thumb": "https://live.staticflickr.com/65535/55655753948_5c822c9b38_c.jpg",
      "w": 3072, "h": 1728
    }
  },
  "urls": {
    "https://www.flickr.com/photos/194776399@N02/55655753948/in/photostream/": "55655753948",
    "https://live.staticflickr.com/65535/55655753948_e18dee666e_3k.jpg": "55655753948"
  },
  "posts": {
    "_posts/2026-11-23-sigma_50_2.8_ex_dg_macro.md": ["55655753948"]
  }
}
```

- `urls` は**記事に書かれた文字列そのまま**を写真 ID に対応づける。Liquid 側で URL を解析しなくて済む（`site.data.flickr_photos.urls[url]` で引ける）。
- `posts` は記事ファイルのパス（Jekyll の `page.path`）ごとの写真 ID の一覧。記事ページに、その記事の分だけ埋め込むために使う。
- `full` / `thumb` は `flickr.config.json` の新しいキー `postSizes` で選ぶ。既定は `{ "full": ["3k", "k", "h", "b"], "thumb": ["c", "z", "b"] }`。先頭から存在するサイズを使う。`w` / `h` は `full` の寸法。

### 走査と取得（`scripts/fetch-flickr.mjs` に追加）

- `_posts/*.md` 全文（front matter と本文）から Flickr の URL を拾う。
  - 写真ページ：`https://www.flickr.com/photos/<user>/<数字 ID>/…`
  - 画像：`https://live.staticflickr.com/<server>/<数字 ID>_<secret>[_<size>].<ext>`
  - `https://www.flickr.com/photo.gne?id=<数字 ID>`
  - ID が数字でないもの（テンプレートの `XXXXXXXXXXX`）は無視する。
- キャッシュにない ID だけ `flickr.photos.getSizes` と `flickr.photos.getInfo`（タイトル、写真ページ URL 用）を呼ぶ。サイズ名は `source` URL の末尾（`_c`、`_3k`。末尾なしは `""`）から決める。
- どの記事からも参照されなくなった ID は消す。`--refresh` を付けたときは全 ID を取り直す。
- 1 件の取得に失敗しても、ほかの写真は保存する。前回のキャッシュにある写真は残す。ファイル全体を書けなかったときは既存ファイルを残す。gallery.json の処理とは独立させ、片方が失敗してももう片方は進める。
- 未解決の URL があれば `[fetch-flickr] 未解決: <URL>（<記事パス>）` と警告する。

### テンプレート

URL の解決は 1 つの include（例：`_includes/flickr-photo.html`）にまとめ、`photo.html`・`post.html`・`index.html` から使う。入力の URL に対して `full` / `thumb` / `page` / `title` を返す。

- **写真ページ URL**：`full`・`thumb`・`page` すべてをデータから取る。
- **直接の画像 URL**：`full` は書かれた URL のまま。`thumb` と `page` をデータから補う。
- **データにない URL・`/assets/…`・他サイトの画像**：今と同じ扱い（`relative_url` を通し、`thumb` は `full` と同じ）。
- 写真ページ URL なのに未解決のときは画像を出さない。本文は「Flickr で見る」リンクだけの段落にし（写真として扱わない＝シーンを作らない）、cover は無いものとして扱う。

`photo.html` の引数は `flickr`（新規）、`src`、`thumb`、`page`、`caption`。明示した `thumb` / `page` はデータより優先する。

front matter は `cover` → `image` の順で解決する。`thumb` / `cover_thumb` / `cover_page` は明示があれば優先し、無ければ解決結果を使う。Journal 一覧のヒーローの大きい画像は `full`、サイドとアーカイブのカードは `thumb`。

### `post.js`

Markdown の `![](live.staticflickr.com/…)` は Liquid で触れないため、`post.html` がその記事の写真の `{ 画像 URL: thumb }` を `<script type="application/json">` で埋め込む（`posts[page.path]` から作る）。`post.js` の `flickrThumb()` はこれを先に引き、無ければ今の置換に戻る。

### ピッカー（`scripts/flickr-picker.mjs` + `scripts/picker/`）

- `node scripts/flickr-picker.mjs` で `http://127.0.0.1:4100/` を開く（ポートは `PORT` で変更可、127.0.0.1 にだけ bind）。キーは `.env`。
- API 呼び出し（`call` / `paged`・`.env` の読み込み・サイズの選び方）は `scripts/lib/flickr.mjs` に切り出し、`fetch-flickr.mjs` と共有する。
- 中継する API：`/api/photos?page=N` → `flickr.people.getPhotos`（`user_id` = `FLICKR_USER_ID`、新しい順、1 ページ 100 枚、extras に `url_q`、`url_z`、`date_taken`、`date_upload`）。
- 画面（素の HTML + JS、サイトのテーマトークンに合わせる）：
  - 写真グリッド（`_q` / `_z` のサムネイル、タイトルと撮影日）。下までスクロールすると次のページを読む。
  - クリックで選択・解除。選んだ順に番号が付く。
  - 下部のトレイに選んだ写真を並べる。順番の入れ替え、削除、どれか 1 枚を cover に指定できる。
  - 「本文用をコピー」：選んだ順に `{% include photo.html flickr="<写真ページ URL>" caption="" %}` を空行区切りで出力する。cover に指定した写真は本文から外す。
  - 「cover 行をコピー」：`cover: "<写真ページ URL>"`。
  - 出力する写真ページ URL は `https://www.flickr.com/photos/<user>/<id>/` の形。
- コピーしたとき、選んだ写真をサーバー側で取得して `_data/flickr_photos.json` に追加する（`urls` にもピッカーが出力した URL を登録する）。これで記事に貼ってすぐ `jekyll serve` で確認できる。`posts` は次に `fetch-flickr.mjs` を実行したときに作られる。

### テストとドキュメント

- 純粋な関数（URL からの ID 抽出、サイズの選択、キャッシュの更新・削除）を `node --test` でテストする。
- `docs/templates/post.md`（cover まわりと写真の書き方）、`CLAUDE.md`（データの流れ、コマンド、Adding Content）を更新する。

### 設計者の判断で決めたこと（レビューで出た点）

- `_data/flickr_photos.json` は `gallery.json` と同じくコミットする。CI は書き戻さないので、コミット済みのファイルが API 停止時のキャッシュになる。ピッカーで追加した分も記事と一緒にコミットする。
- `cover` が未解決の写真ページ URL なら、`image` を試してから「cover なし」にする。
- ピッカーが出力する写真ページ URL の `<user>` 部分は、`getInfo` が返す写真ページ URL（エイリアスがあればそれ）をそのまま使い、同じ文字列を `urls` に登録する。
- `post.js` 用に埋め込むマップには `thumb` に加えて `page` も入れる（Markdown 画像でも View on Flickr が正しいページを指すように）。
- 走査ではアルバム URL（`/albums/…`）や `https://www.flickr.com/` だけのリンクを無視する。
- 今の `fetch-flickr.mjs` は gallery の処理が失敗すると終了する。gallery と記事写真の処理は、どちらかが失敗してももう片方が実行されてファイルを書くようにする。

## 実装者に任せること（設計者の判断として記載）

- include の具体的な作り（`capture` で値を返すか、複数の値をどう渡すか）。Jekyll の include は呼び出し元と変数を共有するので、変数名の衝突に注意する。
- ピッカーの見た目の細部、並べ替えの操作方法（ドラッグか ↑↓ ボタンか）。
- API 呼び出しの並列数（数件ずつで十分）。
- テストファイルを `.mjs` にするか、テスト実行コマンドの glob をどう広げるか。
