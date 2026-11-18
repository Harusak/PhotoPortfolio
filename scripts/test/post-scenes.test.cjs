// assets/js/post-scenes.js（記事ページ「シーン送り」の計算）のテスト
// 実行：node --test scripts/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../assets/js/post-scenes.js');

test('splitScenes', () => {
  assert.deepEqual(S.splitScenes([false, true, false, false, true]), [[0], [2, 3], []]);
  assert.deepEqual(S.splitScenes([true, true, false]), [[], [], [2]]); // 先頭が写真・写真が連続
  assert.deepEqual(S.splitScenes([false, false]), [[0, 1]]);            // cover だけの記事
  assert.deepEqual(S.splitScenes([]), [[]]);
});

test('scenePhotos：表紙 = 01、末尾は最後の写真のまま', () => {
  assert.deepEqual(S.scenePhotos(2, true), [0, 1, 2, 2]);
  assert.deepEqual(S.scenePhotos(0, true), [0, 0]);
  assert.deepEqual(S.scenePhotos(2, false), [0, 0, 1, 1]); // cover なし：シーン 0 は最初の写真を見せる
  assert.deepEqual(S.scenePhotos(0, false), []);           // 写真なし → シーン送りにしない
});

test('edgeOf / isLongScene', () => {
  assert.equal(S.edgeOf(700, false), 98);
  assert.equal(S.edgeOf(500, true), 60);
  assert.equal(S.isLongScene(504, 700, 98), false);
  assert.equal(S.isLongScene(505, 700, 98), true);
});

test('activeScene', () => {
  const r = [{ top: 0, bottom: 100 }, { top: 120, bottom: 300 }, { top: 320, bottom: 400 }];
  assert.equal(S.activeScene(r, 150), 1);
  assert.equal(S.activeScene(r, 110), 0); // 隙間：近い方（同点 10 なら先）
  assert.equal(S.activeScene(r, 318), 2);
});

test('snapTop', () => {
  assert.equal(S.snapTop(400, 200, 700, 98, false, false), 150); // 中央：400 + 100 − 350
  assert.equal(S.snapTop(400, 900, 700, 98, true, false), 302);  // 長い・上から：冒頭
  assert.equal(S.snapTop(400, 900, 700, 98, true, true), 714);   // 長い・下から：400 + 900 − 700 + 98 + 16
  assert.equal(S.snapTop(10, 100, 700, 98, false, false), 0);
});

test('longProgress', () => {
  assert.equal(S.longProgress(302, 400, 900, 700, 98), 0);
  assert.equal(S.longProgress(508, 400, 900, 700, 98), 50);
  assert.equal(S.longProgress(900, 400, 900, 700, 98), 100);
});

test('scrubIndex', () => {
  assert.equal(S.scrubIndex(10, 0, 112, 4), 0);
  assert.equal(S.scrubIndex(56, 0, 112, 4), 2);
  assert.equal(S.scrubIndex(200, 0, 112, 4), 3);
  assert.equal(S.scrubIndex(-5, 0, 112, 4), 0);
});

test('depth / shownPhoto', () => {
  assert.deepEqual([0, 1, 2, 5].map(i => S.sceneDepth(i, 0)), [0, 1, 2, 3]);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => S.stageDepth(i, 1)), [-1, 0, 1, 2, 2]);
  assert.equal(S.shownPhoto(3, 2, 1), 3);
  assert.equal(S.shownPhoto(null, 2, 1), 2);
  assert.equal(S.shownPhoto(null, null, 1), 1);
});

test('progressTop：計測し直したあと、長いシーンの読んでいた位置に戻す', () => {
  assert.equal(S.progressTop(50, 400, 900, 700, 98), 508);  // longProgress の逆
  assert.equal(S.progressTop(0, 400, 900, 700, 98), 302);
  assert.equal(S.progressTop(100, 400, 900, 700, 98), 714);
  assert.equal(S.progressTop(50, 400, 1200, 800, 112), 608); // 幅が変わって高さも変わったとき：a = 288, z = 928
});
