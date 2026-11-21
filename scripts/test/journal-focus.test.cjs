// assets/js/journal-focus.js（Journal 一覧のフォーカス操作の計算）のテスト
// 実行：node --test scripts/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../../assets/js/journal-focus.js');

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);

test('stepFor / distAt / blurAt（今の index.html と同じ値）', () => {
  assert.equal(F.stepFor(2), 1);
  assert.equal(F.stepFor(8), 3);
  assert.equal(F.stepFor(10), 7); // 4→gcd2, 5→gcd5, 6→gcd2, 7
  assert.equal(F.distAt(0), '0.8 m');
  assert.equal(F.distAt(1), '12 m');
  assert.equal(F.blurAt(0, 5), 0);
  near(F.blurAt(1, 5), 0.8);
  near(F.blurAt(4, 5), 4);
  assert.equal(F.MAXB, 4);
  assert.deepEqual(F.ARS, ['4/5', '3/2', '1/1', '3/4', '4/3', '2/3']);
});

test('heroBlur / heroOpacity：マウスは .75、タッチは N=3 の式', () => {
  near(F.heroBlur(1), 2.12);
  assert.equal(F.heroOpacity(0, 'mouse'), 1);
  assert.equal(F.heroOpacity(1, 'mouse'), 0.75);
  assert.equal(F.heroOpacity(1, 'touch'), 0.85);
  assert.equal(F.heroOpacity(2, 'touch'), 0.7);
});

test('archiveOpacity：小数 2 桁', () => {
  assert.equal(F.archiveOpacity(0, 4), 1);
  assert.equal(F.archiveOpacity(1, 3), 0.9);
  assert.equal(F.archiveOpacity(9, 3), 0.7);
});

test('archiveShift / heroShift', () => {
  const a = F.archiveShift(0, 1, 1, 1);
  near(a.x, -20); near(a.y, -10); near(a.s, 1);
  const b = F.archiveShift(1, 1, 1, 0); // px=0 で視差なし
  near(b.x, 0); near(b.y, 0); near(b.s, 1);
  const c = F.archiveShift(1, 0, 0, 1);
  near(c.s, 0.94);
  const h = F.heroShift(0, 1, 0, 1);
  near(h.x, -18); near(h.y, 0);
  near(F.heroShift(2, 0, -1, 1).y, 3.6);
});

test('focusLineY：0.4h から最後の 0.7 画面で 0.82h へ', () => {
  assert.equal(F.focusLineY(0, 3000, 1000), 400);
  assert.equal(F.focusLineY(2000, 3000, 1000), 820);
  assert.equal(F.focusLineY(1650, 3000, 1000), 610);
  assert.equal(F.focusLineY(0, 800, 1000), 820); // ページが画面より短い
});

test('columnCenter / clampCol', () => {
  assert.equal(F.columnCenter(0, 2, 20, 400), 120);
  assert.equal(F.columnCenter(1, 2, 20, 400), 320);
  assert.equal(F.clampCol(3, 2), 1);
  assert.equal(F.clampCol(-1, 2), 0);
});

test('pickFocus：ライン上・選択列優先・200px 規則・全列・ヒステリシス・空', () => {
  const A = { top: 0, bottom: 300, left: 0, right: 100 }, B = { top: 0, bottom: 300, left: 120, right: 220 };
  assert.equal(F.pickFocus([A, B], 150, 170, -1), 1);              // 列にある方
  const C = { top: 400, bottom: 600, left: 0, right: 100 };
  assert.equal(F.pickFocus([C, { ...B, top: 0, bottom: 100 }], 300, 170, -1), 1); // 列内が 200px 以内 → 列優先
  assert.equal(F.pickFocus([{ ...A, anyColumn: true }, B], 150, 170, -1), 0);     // メインはどの列にも属する
  const D = { top: 160, bottom: 400, left: 0, right: 100 };
  assert.equal(F.pickFocus([A, D], 310, 50, -1), 1);               // 判定だけなら D
  assert.equal(F.pickFocus([A, D], 310, 50, 0), 0);                // 今のカードから 10px → 維持
  assert.equal(F.pickFocus([A, D], 320, 50, 0), 1);                // 20px 離れたら移る
  assert.equal(F.pickFocus([A, { ...D, left: 120, right: 220 }], 310, 170, 0), 1); // 今のカードが列外なら維持しない
  assert.equal(F.pickFocus([], 100, 0, -1), -1);
});

test('swipeStep：12px で 1 列、T/2 まで保持、端で止まる、3 列は 1 列ずつ', () => {
  let g = { x0: 100, c0: 0, shift: 0 };
  assert.equal(F.swipeStep(g, 111, 12, 2).col, 0);
  near(F.swipeStep(g, 111, 12, 2).lean, 7.7);
  near(F.swipeStep(g, 88, 12, 2).lean, -8.4);   // ちょうどしきい値（越えていない）
  g = F.swipeStep(g, 113, 12, 2);
  assert.equal(g.col, 1);
  assert.equal(g.lean, 0);
  assert.equal(F.swipeStep(g, 107, 12, 2).col, 1); // 戻しても +6 まで保持
  assert.equal(F.swipeStep(g, 105, 12, 2).col, 0);
  assert.equal(F.swipeStep({ x0: 100, c0: 1, shift: 0 }, 130, 12, 2).col, 1); // 端
  assert.equal(F.swipeStep({ x0: 100, c0: 3, shift: 0 }, 100, 12, 2).col, 1); // 列数が減った
  let h = F.swipeStep({ x0: 100, c0: 0, shift: 0 }, 113, 12, 3);
  assert.deepEqual([h.col, h.c0, h.x0, h.shift], [1, 1, 113, 0]);
  h = F.swipeStep(h, 126, 12, 3);
  assert.equal(h.col, 2);
});

test('springStep / approach / isLocked / inflate / breathScale / originToMouse', () => {
  const [c, v] = F.springStep(0, 0, 100);
  near(c, 12.8); near(v, 12.8);
  near(F.approach(0, 1, 0.2, 0.01), 0.2);
  assert.equal(F.approach(0.995, 1, 0.2, 0.01), 1);
  assert.equal(F.isLocked({ x: 0, w: 100 }, { x: 5, w: 105 }), true);
  assert.equal(F.isLocked({ x: 0, w: 100 }, { x: 6, w: 100 }), false);
  assert.deepEqual(F.inflate({ left: 10, top: 20, width: 100, height: 50 }, 10), { x: 0, y: 10, w: 120, h: 70 });
  near(F.breathScale(0, 4), 1.02);
  assert.equal(F.breathScale(4, 4), 1);
  assert.deepEqual(F.originToMouse(400, 0, 200, 100), { mx: 1, my: -1 });
  assert.deepEqual(F.originToMouse(100, 50, 200, 100), { mx: 0, my: 0 });
});

test('bracketLive / inputFromPointerType', () => {
  assert.equal(F.bracketLive(5000, 0, false), 0);
  assert.equal(F.bracketLive(5000, 4500, false), 1);
  near(F.bracketLive(5000, 3875, false), 0.5);
  assert.equal(F.bracketLive(5000, 1000, false), 0);
  assert.equal(F.bracketLive(5000, 0, true), 1);
  assert.equal(F.inputFromPointerType('mouse'), 'mouse');
  assert.equal(F.inputFromPointerType('pen'), 'touch');
  assert.equal(F.inputFromPointerType('touch'), 'touch');
  assert.equal(F.inputFromPointerType(''), null);
});
