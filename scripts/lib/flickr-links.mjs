// 記事中の Flickr 参照の抽出と、記事写真キャッシュ（_data/post-photos.json）の計算。
// すべて副作用のない純粋関数（ネットワーク・ファイルアクセスなし）。

// 記事写真の既定サイズ候補（先頭から探す）
export const DEFAULT_POST_SIZES = { full: ['3k', 'k', 'h', 'b'], thumb: ['c', 'z', 'b'] };

// URL の終端：空白・" ' ) < >・行末
const END = `[^\\s"'<>)]*`;
const PATTERNS = [
  // 写真ページ（/photos/<user>/<数字 id>…）
  new RegExp(`https?://(?:www\\.)?flickr\\.com/photos/[^/\\s"'<>)]+/(\\d+)(?![^/?#\\s"'<>)])${END}`, 'g'),
  // 画像 URL（live.staticflickr.com/<server>/<id>_<secret>[_<suffix>].<ext>）
  /https?:\/\/live\.staticflickr\.com\/\d+\/(\d+)_[0-9a-f]+(?:_[a-z0-9]+)?\.(?:jpg|png|gif)/g,
  // photo.gne?id=<id>
  /https?:\/\/(?:www\.)?flickr\.com\/photo\.gne\?id=(\d+)/g
];

// テキスト中の Flickr 写真参照を出現順に返す（同じ url 文字列は 1 回）
export function extractFlickrRefs(text) {
  const found = [];
  for (const re of PATTERNS) {
    for (const m of String(text).matchAll(re)) found.push({ at: m.index, url: m[0], id: m[1] });
  }
  found.sort((a, b) => a.at - b.at);
  const seen = new Set();
  const out = [];
  for (const { url, id } of found) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, id });
  }
  return out;
}

// getSizes の応答 → { [suffix]: { src, w, h } }（suffix は source の末尾、無ければ ""）
export function sizesFromApi(getSizesJson) {
  const list = getSizesJson?.sizes?.size ?? [];
  const out = {};
  for (const s of list) {
    const m = /^.*\/\d+_[0-9a-f]+(?:_([a-z0-9]+))?\.[a-z]+$/i.exec(s.source ?? '');
    if (!m) continue;
    out[m[1] ?? ''] = { src: s.source, w: Number(s.width), h: Number(s.height) };
  }
  return out;
}

// prefs の先頭から存在するサイズを返す。無ければ w 最大。空なら null
export function pickSize(sizes, prefs) {
  for (const p of prefs) if (sizes[p]) return sizes[p];
  let best = null;
  for (const v of Object.values(sizes)) if (!best || v.w > best.w) best = v;
  return best;
}

// 1 枚分のキャッシュ項目を作る（w / h は full の寸法）
export function buildEntry(getSizesJson, getInfoJson, postSizes) {
  const sizes = sizesFromApi(getSizesJson);
  const full = pickSize(sizes, postSizes.full);
  const thumb = pickSize(sizes, postSizes.thumb);
  const photo = getInfoJson?.photo ?? {};
  const page = (photo.urls?.url ?? []).find(u => u.type === 'photopage')?._content ?? '';
  return {
    page,
    title: photo.title?._content ?? '',
    full: full?.src ?? '',
    thumb: thumb?.src ?? full?.src ?? '',
    w: full?.w ?? 0,
    h: full?.h ?? 0
  };
}

// 記事群が参照する ID のうち取得が必要なもの（refresh なら全部）
export function missingIds(prev, refsByPost, refresh) {
  const ids = new Set();
  for (const refs of Object.values(refsByPost)) for (const r of refs) ids.add(r.id);
  const have = prev?.photos ?? {};
  return [...ids].filter(id => refresh || !have[id]);
}

// 参照から再構築する。参照されない写真は消し、取得できていない写真は urls / posts に入れない
export function updateCache(prev, refsByPost, fetched, now) {
  const known = { ...(prev?.photos ?? {}), ...fetched };
  const photos = {};
  const urls = {};
  const posts = {};
  for (const [path, refs] of Object.entries(refsByPost)) {
    const ids = [];
    for (const { url, id } of refs) {
      if (!known[id]) continue;
      photos[id] = known[id];
      urls[url] = id;
      if (!ids.includes(id)) ids.push(id);
    }
    posts[path] = ids;
  }
  return { generatedAt: now, photos, urls, posts };
}

// ピッカー用：追加のみ（何も削除しない）
export function mergePhotos(prev, fetched, extraUrls, now) {
  return {
    generatedAt: now,
    photos: { ...(prev?.photos ?? {}), ...fetched },
    urls: { ...(prev?.urls ?? {}), ...extraUrls },
    posts: { ...(prev?.posts ?? {}) }
  };
}
