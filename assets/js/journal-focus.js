// Journal 一覧のフォーカス操作の計算（DOM に触れない純粋関数）。index.html から window.JournalFocus として使う
// 仕様：docs/superpowers/specs/2026-11-journal-redesign/design_handoff_journal/README.md・FOCUS.md
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round2 = v => Math.round(v * 100) / 100;

  const MAXB = 4; // 最大ボケ（px）
  const ARS = ['4/5', '3/2', '1/1', '3/4', '4/3', '2/3']; // Archive の画像比率

  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // 奥行き面の刻み：N と互いに素にして、隣り合うカードが離れた面に来るようにする
  function stepFor(N) {
    if (N < 3) return 1;
    let st = Math.max(2, Math.round(N * .38));
    while (gcd(st, N) !== 1) st++;
    return st;
  }

  // ピント面 t（0〜1）→ 距離表示
  function distAt(t) {
    const m = .8 * Math.pow(15, t);
    return m < 10 ? m.toFixed(1) + ' m' : Math.round(m) + ' m';
  }

  const blurAt = (dz, N) => (dz <= .001 ? 0 : MAXB * (.2 * Math.min(1, dz) + .8 * Math.max(0, dz - 1) / Math.max(1, N - 2)));
  const heroBlur = dz => dz * MAXB * .53;
  // ヒーロー：マウスはホバー中以外 .75、タッチは補間値に合わせて Archive と同じ式（N = 3）
  const heroOpacity = (dz, input) => (input === 'touch' ? round2(1 - .3 * Math.min(1, dz / 2)) : dz < .001 ? 1 : .75);
  const archiveOpacity = (dz, den) => round2(1 - .3 * Math.min(1, dz / den));

  // 視差（mx, my ∈ [-1, 1]、px = 0 で無効）
  function heroShift(idx, mx, my, px) {
    const k = (3 - idx) * 6 * px;
    return { x: -mx * k, y: -my * k * .6 };
  }
  function archiveShift(t, mx, my, px) {
    const k = (6 + 14 * (1 - t)) * px;
    return { x: -mx * k, y: -my * k * .5, s: 1 - .06 * t * px };
  }

  // 合焦ライン（ビューポート内の y）。最後の 0.7 画面分で下へ滑り、最後のカードにも届く
  function focusLineY(scrollTop, scrollHeight, h) {
    const max = scrollHeight - h, tail = h * .7;
    const t = clamp((scrollTop - (max - tail)) / tail, 0, 1);
    return Math.round(h * (.4 + .42 * t));
  }

  const columnCenter = (col, n, left, width) => left + (col + .5) / n * width;
  const clampCol = (col, n) => clamp(col, 0, n - 1);

  // 合焦ラインと選択中の列からカードを選ぶ（index、無ければ -1）
  function pickFocus(cards, lineY, colX, current) {
    const gap = (v, a, b) => (v < a ? a - v : v > b ? v - b : 0);
    let best = -1, bs = Infinity, keep = false;
    cards.forEach((c, i) => {
      const d = gap(lineY, c.top, c.bottom), dx = c.anyColumn ? 0 : gap(colX, c.left, c.right);
      const s = d * 1000 + (dx > 0 ? 200000 + dx * 1000 : 0) + Math.abs((c.top + c.bottom) / 2 - lineY);
      if (s < bs) { bs = s; best = i; }
      // ヒステリシス：視差でカードが少し動くので、列内でラインから 16px 以内なら今のカードのまま
      if (i === current && dx === 0 && d < 16) keep = true;
    });
    return keep ? current : best;
  }

  // 相対的な列切替：指を置いた位置から T px ずらすと 1 列。越えた後は T/2 まで保持
  function swipeStep(g, x, T, n) {
    const dx = x - g.x0;
    let shift = dx > T || (g.shift === 1 && dx > T / 2) ? 1
      : dx < -T || (g.shift === -1 && dx < -T / 2) ? -1 : 0;
    const col = clampCol(g.c0 + shift, n), lean = shift === 0 ? clamp(dx, -T, T) * .7 : 0;
    let x0 = g.x0, c0 = g.c0;
    // 3 列以上：越えるたびに基準を置き直して 1 列ずつ進める
    if (n >= 3 && shift !== 0 && g.shift === 0) { x0 = x; c0 = col; shift = 0; }
    return { x0, c0, shift, col, lean };
  }

  // ばね（少し行き過ぎてから止まる＝ロックの手応え）
  function springStep(cur, vel, target) {
    const v = (vel + (target - cur) * .2) * .64;
    return [cur + v, v];
  }
  function approach(cur, target, k, eps) {
    const n = cur + (target - cur) * k;
    return Math.abs(target - n) < eps ? target : n;
  }

  const inflate = (r, p) => ({ x: r.left - p, y: r.top - p, w: r.width + p * 2, h: r.height + p * 2 });
  const isLocked = (cur, target) => Math.abs(cur.w - target.w) < 6 && Math.abs(cur.x - target.x) < 6;
  const breathScale = (zv, den) => 1 + .02 * (1 - zv / den);
  const originToMouse = (ox, oy, w, h) => ({ mx: clamp(ox / w * 2 - 1, -1, 1), my: clamp(oy / h * 2 - 1, -1, 1) });

  // ブラケットの表示：操作中は 1、最後の操作から 900ms 後に 450ms かけて 0
  function bracketLive(now, last, holding) {
    if (holding) return 1;
    if (!last) return 0;
    const dt = now - last;
    return dt < 900 ? 1 : Math.max(0, 1 - (dt - 900) / 450);
  }

  const inputFromPointerType = type => (type === 'mouse' ? 'mouse' : type === 'touch' || type === 'pen' ? 'touch' : null);

  const api = {
    MAXB, ARS, stepFor, distAt, blurAt, heroBlur, heroOpacity, archiveOpacity, heroShift, archiveShift,
    focusLineY, columnCenter, clampCol, pickFocus, swipeStep, springStep, approach, inflate, isLocked,
    breathScale, originToMouse, bracketLive, inputFromPointerType
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else window.JournalFocus = api;
})();
