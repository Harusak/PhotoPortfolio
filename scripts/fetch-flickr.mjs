#!/usr/bin/env node
// Flickr → _data/gallery.json   Node 20+ / 依存なし
// env: FLICKR_API_KEY, FLICKR_USER_ID(NSID)   config: flickr.config.json
// ローカルではリポジトリ直下の .env からも読む（既に設定済みの環境変数が優先）
// 失敗時は既存の _data/gallery.json を残してビルドを続行する
import { readFile, writeFile } from "node:fs/promises";

try { process.loadEnvFile(".env"); } catch {} // .env が無い（Actions など）ときは何もしない

const KEY = process.env.FLICKR_API_KEY;
const USER = process.env.FLICKR_USER_ID;
const OUT = "_data/gallery.json";
const cfg = JSON.parse(await readFile("flickr.config.json", "utf8").catch(() => "{}"));
const FEATURED_TAG = String(cfg.featuredTag || "featured").toLowerCase();
const ALBUM_MARKER = String(cfg.albumMarker || "#featured");
const MAX_ALBUMS = +cfg.maxAlbums || 5;
const hasMarker = s => text(s.description).toLowerCase().includes(ALBUM_MARKER.toLowerCase());
const stripMarker = d => d.split(new RegExp(ALBUM_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig")).join("").trim();
const EXTRAS = "url_c,url_l,url_h,url_k,date_taken,description,tags,media";

async function call(method, params = {}) {
  const u = new URL("https://api.flickr.com/services/rest/");
  u.search = new URLSearchParams({ method, api_key: KEY, format: "json", nojsoncallback: "1", ...params });
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${method}: HTTP ${r.status}`);
  const j = await r.json();
  if (j.stat !== "ok") throw new Error(`${method}: ${j.code} ${j.message}`);
  return j;
}
const text = v => (v && typeof v === "object" ? v._content : v) || "";
const size = (p, keys) => {
  for (const k of keys) if (p[`url_${k}`]) return { src: p[`url_${k}`], w: +p[`width_${k}`], h: +p[`height_${k}`] };
  return null;
};

async function paged(method, params, key) {
  const out = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const j = await call(method, { ...params, per_page: "500", page: String(page) });
    out.push(...j[key][key === "photosets" ? "photoset" : "photo"]);
    pages = +j[key].pages || 1;
  }
  return out;
}

async function main() {
  if (!KEY || !USER) throw new Error("FLICKR_API_KEY / FLICKR_USER_ID が未設定");
  const sets = await paged("flickr.photosets.getList", { user_id: USER }, "photosets");
  // 説明文に #featured を含むアルバムを Flickr の並び順で最大 5 件。0 件なら先頭 5 件
  const marked = sets.filter(hasMarker);
  const chosen = (marked.length ? marked : sets).slice(0, MAX_ALBUMS);
  if (marked.length > MAX_ALBUMS) console.warn(`${marked.length} albums marked ${ALBUM_MARKER}; using first ${MAX_ALBUMS}`);
  const albums = [], featured = new Map();

  for (const s of chosen) {
    const id = s.id;
    const raw = await paged("flickr.photosets.getPhotos", { photoset_id: id, user_id: USER, extras: EXTRAS, privacy_filter: "1" }, "photoset");
    const photos = raw.filter(p => p.media !== "video").map(p => {
      const full = size(p, ["k", "h", "l", "c"]);
      if (!full) return null;
      const thumb = size(p, ["c", "l"]) || full;
      const tags = String(p.tags || "").split(" ").filter(Boolean);
      const item = {
        id: p.id, title: p.title || "", description: text(p.description), taken: p.datetaken || null, tags,
        src: full.src, w: full.w, h: full.h, thumb: thumb.src,
        page: `https://www.flickr.com/photos/${USER}/${p.id}/in/album-${id}`
      };
      if (tags.includes(FEATURED_TAG) && !featured.has(p.id)) featured.set(p.id, item);
      return item;
    }).filter(Boolean);
    if (!photos.length) continue;
    const cover = photos.find(p => p.id === s.primary) || photos[0];
    albums.push({
      id, title: text(s.title), description: stripMarker(text(s.description)), count: photos.length,
      cover: { src: cover.thumb, full: cover.src, w: cover.w, h: cover.h }, photos
    });
  }
  if (!albums.length) throw new Error("取得できたアルバムが 0 件");

  const data = { generatedAt: new Date().toISOString(), albums, featured: [...featured.values()] };
  await writeFile(OUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote ${OUT}: ${albums.length} albums, ${data.featured.length} featured`);
}

main().catch(e => console.warn(`[fetch-flickr] ${e.message} — 既存の ${OUT} を使用します`));
