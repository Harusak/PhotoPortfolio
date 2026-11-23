---
# ============================================================
#  記事テンプレート
#  使い方：
#   1. このファイルを _posts/YYYY-MM-DD-slug.md にコピーする
#      （slug は半角英数とハイフン。URL の末尾になる）
#   2. 下の front matter を埋め、不要な任意項目は行ごと消す
#   3. 本文を書き換える（書き方の例は本文側にある）
#   4. 新しい Flickr の写真を貼ったら node scripts/fetch-flickr.mjs を一度実行する（またはピッカーでコピーする）
#      → _data/flickr_photos.json に画像 URL が入り、写真ページ URL が写真として表示される
#   5. bundle exec jekyll serve で確認 → http://127.0.0.1:4000/PhotoPortfolio/#/journal
#   6. git add _posts/… _data/flickr_photos.json でコミットする
# ============================================================

layout: post                       # 必須・変更しない
title: "台南、路地の午後"            # 必須。一覧と記事ページの見出し
date: 2026-10-04                   # 必須。表示（2026.10.04）と一覧の年グループに使う

# カテゴリ：travel / gear / news のいずれか。
# 一覧のフィルタと表示（Travel / Gear / News）に使う。無いと All にだけ出る。
# ※ URL にも入る（/travel/2026/10/04/slug.html）。公開後に変えるとリンクが切れる
category: travel

# カバー写真（記事ページのステージ 01、一覧のヒーロー）。Flickr の写真ページの URL を推奨
# ブラウザで Flickr の写真ページを開き、アドレスバーの URL をそのままコピーする（/in/… が付いていてもよい）
# 大サイズ・中サイズ・View on Flickr のリンクは fetch-flickr.mjs が調べて自動で決まる
# （画像 URL（live.staticflickr.com）や /assets/… も書ける。fetch 前の写真ページ URL は image にフォールバック）
cover: "https://www.flickr.com/photos/XXXXXXXX@N00/XXXXXXXXXXX/"
# thumb: "https://live.staticflickr.com/65535/XXXXXXXXXXX_xxxxxxxxxx_c.jpg"        # 任意。通常は不要（自動で決まる）。一覧カード用の中サイズを変えたいときだけ
# cover_thumb: "https://live.staticflickr.com/65535/XXXXXXXXXXX_xxxxxxxxxx_c.jpg"  # 任意。通常は不要（自動で決まる）。記事ページのモバイル用
# cover_page: "https://www.flickr.com/photos/XXXXXXXX@N00/XXXXXXXXXXX/"           # 任意。通常は不要（自動で決まる）。ポップアップの View on Flickr
cover_caption: 西門路から一本入った路地。                                        # 任意。ステージとポップアップのキャプション

# リード（タイトル下の一文）。任意。無ければ description → 本文の冒頭の順で使う
lead: 観光地の裏側、生活の音が残る路地を一日かけて歩いた記録。
description: 観光地の裏側、生活の音が残る路地を一日かけて歩いた記録。   # 任意。<meta name="description"> にも使われる

# 機材・アルバム行（任意。camera / lens / album がすべて無ければ行ごと出ない）
camera: X-T5
lens: XF35mm F1.4
album:
  name: 台南 2026
  url: https://www.flickr.com/photos/XXXXXXXX@N00/albums/XXXXXXXXXXXXXXXXX
---
台南に着いたのは昼過ぎだった。段落は空行で区切る。1 段落は 3〜5 行くらいが読みやすい。

写真は本文の好きな位置に置ける。記事ページでは写真の位置で本文が「シーン」に区切られる（シーン = 写真 1 枚＋その写真から次の写真の直前までの文章。タイトル〜最初の写真の前まではカバーのシーン）。1 回スクロールすると 1 シーンずつ進み、写真そのものは右側（モバイルでは上）のステージに出る。本文には「— 02」のような番号だけが残る。写真の番号は出現順に自動で振られる（カバーが 01）。

1 シーンの文章は、デスクトップで約 700 字、モバイルで約 260 字が目安（文章欄に収まる長さ）。超えても読めるが「長いシーン」になり、欄の中をスクロールして読み進める（左に進み具合の線が出る）。写真が続くと文章の無いシーンになる。

{% include photo.html flickr="https://www.flickr.com/photos/XXXXXXXX@N00/XXXXXXXXXXX/" caption="神農街の手前、昼下がりの路地。" %}

上の include が写真の推奨の書き方。手順：

1. Flickr の写真ページを開き、その URL をコピーして flickr="…" に貼る（caption はキャプション。Flickr のタイトルは自動では使わない）
2. 新しい写真を貼ったら node scripts/fetch-flickr.mjs を一度実行する（またはピッカーでコピーする）。それから bundle exec jekyll serve で確認する

大サイズ（ポップアップとデスクトップ用）、中サイズ（モバイル用）、View on Flickr のリンク先は自動で決まる。fetch 前の（データに無い）写真ページ URL は写真にならず、「Flickr で見る ↗」のリンクだけが出る。src="画像 URL"・thumb・page を直接書く従来の書き方も使え、明示した thumb / page は自動の値より優先される。include の前後には空行を入れる。

## 小見出しは ## で書く

見出しは ## を使う（# はタイトルと重なるので本文では使わない）。小さめの見出しが欲しいときは ### にする。

![廟の前で昼寝をする犬。](https://live.staticflickr.com/65535/XXXXXXXXXXX_yyyyyyyyyy_b.jpg)

Markdown の画像記法でも写真になる。[ ] の中がキャプションになる。ただし、この形は段落に画像 1 枚だけを置いたときに限る。Markdown の画像記法では Flickr の写真ページ URL は使えない（画像の URL が必要）。Flickr の _b や _c の URL なら、モバイル用の中サイズを自動で作る。_k の URL だと中サイズを作れずモバイルでも大サイズを読み込むので、通常は include（flickr=）を使うほうがよい。

### 図・スクリーンショット（リポジトリ内の画像）

Flickr に上げない画像（技術説明の図、スクリーンショットなど）は assets/posts/YYYY-MM-DD-slug/ に置き、写真と同じ書き方で使える。ステージに写真と同じように出る（View on Flickr ボタンは出ない）。

{% include photo.html
   src="/assets/posts/2026-10-04-tainan/route.webp"
   caption="歩いたルート。" %}

include の src / thumb（と front matter の cover / thumb / cover_thumb）は /assets/… と書けば baseurl（/PhotoPortfolio）が自動で付く。Markdown 記法で書くときは自動では付かないので、URL を {% raw %}{{ '…' | relative_url }}{% endraw %} で囲む：

![歩いたルート。]({{ '/assets/posts/2026-10-04-tainan/route.webp' | relative_url }})

画像は WebP / PNG / SVG にし、1 枚数百 KB 程度に収める（長辺 2000px 前後で十分）。SVG は width / height 属性を付けておく（無いと小さく表示されることがある）。

その他の書き方：**強調**、[リンク](https://www.flickr.com/)、`コード`。

> 引用は > で始める。

- 箇条書きは - で始める
- 番号付きは 1. 2. で始める

---

区切り線は --- を 1 行で書く。写真の無い記事（News など）は本文を文章だけにすればよく、その場合ステージにはカバーが 1 枚だけ出る。
