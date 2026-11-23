// ローカル専用の写真ピッカー用サーバー（依存なし）。Flickr API を中継する。
// 使い方: node scripts/flickr-picker.mjs（リポジトリのルートで実行される）
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { call, loadEnv } from "./lib/flickr-api.mjs";
import { addPhotos } from "./lib/post-photos.mjs";

// addPhotos やデータのパスは cwd 相対なので、どこから起動してもリポジトリのルートに揃える
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const { key, user } = loadEnv();
if (!key || !user) {
  console.error("FLICKR_API_KEY / FLICKR_USER_ID が未設定です（.env か環境変数で指定してください）");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 4100;
const MAX_BODY = 64 * 1024;
const STATIC = {
  "/": ["picker/index.html", "text/html; charset=utf-8"],
  "/snippets.mjs": ["picker/snippets.mjs", "text/javascript; charset=utf-8"]
};

const send = (res, status, body, type = "application/json; charset=utf-8") => {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

async function photos(page) {
  const j = await call("flickr.people.getPhotos", {
    user_id: user, per_page: "100", page: String(page),
    extras: "url_q,url_z,date_taken,date_upload,path_alias"
  });
  return {
    page: +j.photos.page, pages: +j.photos.pages,
    photos: j.photos.photo.map(p => ({
      id: p.id, title: p.title, taken: p.datetaken,
      thumb: p.url_q, preview: p.url_z || p.url_q,
      url: `https://www.flickr.com/photos/${p.pathalias || p.path_alias || p.owner}/${p.id}/`
    }))
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > MAX_BODY) { chunks.length = 0; return reject(Object.assign(new Error("too large"), { status: 413 })); } // 残りは読み捨てて 413 を返す
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const validItems = v => Array.isArray(v?.items) && v.items.every(i =>
  i && typeof i.id === "string" && /^\d+$/.test(i.id) && typeof i.url === "string");

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://127.0.0.1");
    if (req.method === "GET" && STATIC[u.pathname]) {
      const [file, type] = STATIC[u.pathname];
      let body;
      try { body = await readFile(new URL(file, import.meta.url)); }
      catch { return send(res, 404, "Not Found", "text/plain; charset=utf-8"); }
      return send(res, 200, body, type);
    }
    if (req.method === "GET" && u.pathname === "/api/photos") {
      const page = Math.max(1, parseInt(u.searchParams.get("page"), 10) || 1);
      try { return send(res, 200, await photos(page)); }
      catch (e) { return send(res, 502, { error: e.message }); }
    }
    if (req.method === "POST" && u.pathname === "/api/resolve") {
      let data;
      try { data = JSON.parse(await readBody(req)); }
      catch (e) { return send(res, e.status || 400, { error: e.status === 413 ? "body too large" : "invalid JSON" }); }
      if (!validItems(data)) return send(res, 400, { error: "items must be [{id, url}]" });
      try { return send(res, 200, await addPhotos(data.items)); }
      catch (e) { return send(res, 502, { error: e.message }); }
    }
    send(res, 404, "Not Found", "text/plain; charset=utf-8");
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Flickr picker: http://127.0.0.1:${PORT}/`));
