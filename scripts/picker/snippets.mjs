// 記事に貼るコードの生成（ブラウザと Node の両方から import する）

// 本文用：選んだ順に photo.html の include を空行区切りで並べる（cover に選んだ写真は除く）
export function buildBody(items, coverId) {
  return items
    .filter(i => i.id !== coverId)
    .map(i => `{% include photo.html flickr="${i.url}" caption="" %}`)
    .join("\n\n");
}

// front matter 用：cover の 1 行（未選択なら空文字）
export function buildCover(items, coverId) {
  const c = coverId == null ? null : items.find(i => i.id === coverId);
  return c ? `cover: "${c.url}"` : "";
}
