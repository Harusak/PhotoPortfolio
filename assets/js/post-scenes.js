// 記事ページ「シーン送り」の計算（DOM に触れない純粋関数）。post.js から window.PostScenes として使う
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 本文の子要素ごとの「写真か」から、写真以外の要素の index をシーンごとにまとめる。
  // [0] は最初の写真より前、[k] は k 枚目の写真の後ろ（次の写真の直前まで）
  function splitScenes(isPhoto) {
    const groups = [[]];
    isPhoto.forEach((photo, i) => {
      if (photo) groups.push([]);
      else groups[groups.length - 1].push(i);
    });
    return groups;
  }

  // 各シーン（末尾シーンを含む）でステージに出す写真の index。cover があれば cover = 0。
  // cover が無ければシーン 0 は最初の写真を見せる。写真が 1 枚も無ければ空（シーン送りにしない）
  function scenePhotos(nBodyPhotos, hasCover) {
    const n = nBodyPhotos + (hasCover ? 1 : 0);
    if (!n) return [];
    const list = [0];
    for (let k = 1; k <= nBodyPhotos; k++) list.push(hasCover ? k : k - 1);
    list.push(n - 1); // 末尾シーンは最後の写真のまま
    return list;
  }

  // 上下のフェードにかからない位置で止めるための余白
  const edgeOf = (H, mobile) => Math.round(H * (mobile ? .12 : .14));

  // フェードの内側に収まらないシーン
  const isLongScene = (h, H, edge) => h > H - 2 * edge;

  // 中央の水平線を含むシーン。どれも含まなければ中央にいちばん近いシーン（同点は先）
  function activeScene(rects, mid) {
    let best = 0, bd = Infinity;
    rects.forEach((r, i) => {
      const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  // シーンを見せるときの scrollTop。通常は中央、長いシーンは上からなら冒頭・下からなら末尾
  function snapTop(top, h, H, edge, long, fromBelow) {
    const y = !long ? top + h / 2 - H / 2 : fromBelow ? top + h - H + edge + 16 : top - edge;
    return Math.max(0, y);
  }

  // 長いシーンの進み具合（0〜100）
  function longProgress(scrollTop, top, h, H, edge) {
    const a = top - edge, z = top + h - H + edge + 16;
    return Math.round(clamp((scrollTop - a) / Math.max(1, z - a), 0, 1) * 100);
  }

  // スクラバー上のポインタ位置 → 写真 index
  const scrubIndex = (x, left, width, n) => clamp(Math.floor((x - left) / Math.max(1, width) * n), 0, n - 1);

  // 文章のピント（0 / 1 / 2 / 3 以上）と、ステージの重なり（-1 通過済 / 0 現在 / 1 次 / 2 先）
  const sceneDepth = (i, act) => Math.min(Math.abs(i - act), 3);
  const stageDepth = (i, shown) => (i < shown ? -1 : Math.min(i - shown, 2));

  // ステージに出す写真：スクラバーで見ている写真 → 移動中の行き先 → アクティブなシーンの写真
  const shownPhoto = (peek, target, actPhoto) => (peek != null ? peek : target != null ? target : actPhoto);

  const api = { splitScenes, scenePhotos, edgeOf, isLongScene, activeScene, snapTop, longProgress, scrubIndex, sceneDepth, stageDepth, shownPhoto };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else window.PostScenes = api;
})();
