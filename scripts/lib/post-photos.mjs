// 記事中の Flickr 写真を解決して _data/flickr_photos.json に保存する。
// パスはリポジトリ直下からの相対（リポジトリ直下で実行する前提）。
import { readFile, writeFile, readdir } from "node:fs/promises";
import { call } from "./flickr-api.mjs";
import {
  extractFlickrRefs, buildEntry, missingIds, updateCache, mergePhotos, DEFAULT_POST_SIZES
} from "./flickr-links.mjs";

export const CACHE_PATH = "_data/flickr_photos.json";
const CONCURRENCY = 4;

export async function readCache() {
  try { return JSON.parse(await readFile(CACHE_PATH, "utf8")); } catch { return null; }
}

export async function writeCache(cache) {
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
}

// 1 件ずつ getSizes + getInfo、並列 4。失敗は failed に入れて続行
export async function fetchEntries(ids, postSizes = DEFAULT_POST_SIZES) {
  const fetched = {};
  const failed = [];
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const [sizes, info] = await Promise.all([
          call("flickr.photos.getSizes", { photo_id: id }),
          call("flickr.photos.getInfo", { photo_id: id })
        ]);
        const entry = buildEntry(sizes, info, postSizes);
        if (!entry.full) throw new Error("サイズを取得できません");
        fetched[id] = entry;
      } catch (e) {
        failed.push({ id, error: e.message });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  return { fetched, failed };
}

// _posts 内の Flickr 参照 → { "_posts/<ファイル名>": refs }（Jekyll の page.path と同じ形）
export async function scanPosts(dir = "_posts") {
  const out = {};
  for (const name of (await readdir(dir)).sort()) {
    if (!/\.(md|markdown|html)$/i.test(name)) continue;
    const refs = extractFlickrRefs(await readFile(`${dir}/${name}`, "utf8"));
    out[`${dir}/${name}`] = refs;
  }
  return out;
}

export async function resolvePostPhotos({ refresh = false, postSizes = DEFAULT_POST_SIZES } = {}) {
  const prev = await readCache();
  const refsByPost = await scanPosts();
  const ids = missingIds(prev, refsByPost, refresh);
  const { fetched, failed } = await fetchEntries(ids, postSizes);
  let cache = updateCache(prev, refsByPost, fetched, new Date().toISOString());
  // 内容が変わらないときは書き直さない（generatedAt だけの差分を避ける）
  const body = c => JSON.stringify([c?.photos, c?.urls, c?.posts]);
  if (prev && body(prev) === body(cache)) cache = prev;
  else await writeCache(cache);
  const unresolved = [];
  for (const [post, refs] of Object.entries(refsByPost)) {
    for (const { url, id } of refs) if (!cache.photos[id]) unresolved.push({ url, post });
  }
  return { cache, failed, unresolved, fetchedCount: Object.keys(fetched).length };
}

// ピッカー用：キャッシュに無い ID だけ取得して追加する（何も削除しない）
export async function addPhotos(items, postSizes = DEFAULT_POST_SIZES) {
  const prev = await readCache();
  const have = prev?.photos ?? {};
  const need = [...new Set(items.map(i => i.id))].filter(id => !have[id]);
  const { fetched, failed } = await fetchEntries(need, postSizes);
  const extraUrls = {};
  for (const { id, url } of items) if (have[id] || fetched[id]) extraUrls[url] = id;
  await writeCache(mergePhotos(prev, fetched, extraUrls, new Date().toISOString()));
  const failedIds = new Set(failed.map(f => f.id));
  return {
    resolved: [...new Set(items.map(i => i.id))].filter(id => !failedIds.has(id)),
    failed: [...failedIds]
  };
}
