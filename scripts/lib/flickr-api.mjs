// Flickr API クライアント（依存なし）。fetch-flickr.mjs とローカルのピッカーから使う。
import { readFile } from "node:fs/promises";

// .env を読み（既に設定済みの環境変数が優先）、キーとユーザー ID を返す
export function loadEnv() {
  try { process.loadEnvFile(".env"); } catch {} // .env が無い（Actions など）ときは何もしない
  return { key: process.env.FLICKR_API_KEY, user: process.env.FLICKR_USER_ID };
}

export async function call(method, params = {}) {
  const { key } = loadEnv();
  const u = new URL("https://api.flickr.com/services/rest/");
  u.search = new URLSearchParams({ method, api_key: key, format: "json", nojsoncallback: "1", ...params });
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${method}: HTTP ${r.status}`);
  const j = await r.json();
  if (j.stat !== "ok") throw new Error(`${method}: ${j.code} ${j.message}`);
  return j;
}

export async function paged(method, params, key) {
  const out = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const j = await call(method, { ...params, per_page: "500", page: String(page) });
    out.push(...j[key][key === "photosets" ? "photoset" : "photo"]);
    pages = +j[key].pages || 1;
  }
  return out;
}

export async function loadConfig() {
  return JSON.parse(await readFile("flickr.config.json", "utf8").catch(() => "{}"));
}
