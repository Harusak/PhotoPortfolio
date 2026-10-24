---
# ============================================================
#  記事テンプレート
#  使い方：
#   1. このファイルを _posts/YYYY-MM-DD-slug.md にコピーする
#      （slug は半角英数とハイフン。URL の末尾になる）
#   2. 下の front matter を埋め、不要な任意項目は行ごと消す
#   3. 本文を書き換える（書き方の例は本文側にある）
#   4. bundle exec jekyll serve で確認 → http://127.0.0.1:4000/PhotoPortfolio/#/journal
#   5. git add _posts/… でコミットする
# ============================================================

layout: post                       # 必須・変更しない
title: "台南、路地の午後"            # 必須。一覧と記事ページの見出し
date: 2026-10-04                   # 必須。表示（2026.10.04）と一覧の年グループに使う

# カテゴリ：travel / gear / news のいずれか。
# 一覧のフィルタと表示（Travel / Gear / News）に使う。無いと All にだけ出る。
# ※ URL にも入る（/travel/2026/10/04/slug.html）。公開後に変えるとリンクが切れる
category: travel

# カバー写真（記事ページのステージ 01、一覧のヒーロー）。Flickr の大サイズ（_k）を推奨
# Flickr の写真ページ → ダウンロードアイコン → 「すべてのサイズを表示」→ 各サイズの画像 URL をコピー
cover: "https://live.staticflickr.com/65535/XXXXXXXXXXX_xxxxxxxxxx_k.jpg"
thumb: "https://live.staticflickr.com/65535/XXXXXXXXXXX_xxxxxxxxxx_c.jpg"        # 任意。一覧カード・モバイル用の中サイズ（_c）。無ければ cover
cover_thumb: "https://live.staticflickr.com/65535/XXXXXXXXXXX_xxxxxxxxxx_c.jpg"  # 任意。記事ページのモバイル用。_k の URL からは自動で作れないので指定推奨
cover_page: "https://www.flickr.com/photo.gne?id=XXXXXXXXXXX"                   # 任意。ポップアップの View on Flickr。Flickr の URL なら省略しても自動で作る
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

写真は本文の好きな位置に置ける。ページ上では写真の代わりに「— 01」の番号だけが残り、写真そのものは右側（モバイルでは上）のステージに出る。読み進めて番号が画面の中ほどを越えると、ステージの写真が切り替わる。写真の番号は出現順に自動で振られる（カバーが 01 の前の写真になる）。

{% include photo.html
   src="https://live.staticflickr.com/65535/XXXXXXXXXXX_yyyyyyyyyy_k.jpg"
   thumb="https://live.staticflickr.com/65535/XXXXXXXXXXX_zzzzzzzzzz_c.jpg"
   page="https://www.flickr.com/photo.gne?id=XXXXXXXXXXX"
   caption="神農街の手前、昼下がりの路地。" %}

上の include が写真の推奨の書き方。src は大サイズ（_k、ポップアップとデスクトップ用）、thumb は中サイズ（_c、モバイル用）、page は View on Flickr のリンク先（省略するとボタンが出ない）、caption はキャプション。include の前後には空行を入れる。

## 小見出しは ## で書く

見出しは ## を使う（# はタイトルと重なるので本文では使わない）。小さめの見出しが欲しいときは ### にする。

![廟の前で昼寝をする犬。](https://live.staticflickr.com/65535/XXXXXXXXXXX_yyyyyyyyyy_b.jpg)

Markdown の画像記法でも写真になる。[ ] の中がキャプションになる。ただし、この形は段落に画像 1 枚だけを置いたときに限る。Flickr の _b や _c の URL なら、モバイル用の中サイズを自動で作る。_k の URL だと中サイズを作れずモバイルでも大サイズを読み込むので、通常は include を使うほうがよい。

その他の書き方：**強調**、[リンク](https://www.flickr.com/)、`コード`。

> 引用は > で始める。

- 箇条書きは - で始める
- 番号付きは 1. 2. で始める

---

区切り線は --- を 1 行で書く。写真の無い記事（News など）は本文を文章だけにすればよく、その場合ステージにはカバーが 1 枚だけ出る。
