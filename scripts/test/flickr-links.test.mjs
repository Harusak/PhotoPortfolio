// flickr-links.mjs の単体テスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractFlickrRefs, sizesFromApi, pickSize, buildEntry,
  missingIds, updateCache, mergePhotos, DEFAULT_POST_SIZES
} from '../lib/flickr-links.mjs';

const P = 'https://live.staticflickr.com/65535/55655753948_';
const sz = (label, width, height, file) => ({ label, width, height, source: P + file });
const SIZES_55655753948 = {
  sizes: {
    size: [
      sz('Square', 75, 75, '5c822c9b38_s.jpg'),
      sz('Large Square', 150, 150, '5c822c9b38_q.jpg'),
      sz('Thumbnail', 100, 56, '5c822c9b38_t.jpg'),
      sz('Small', 240, 135, '5c822c9b38_m.jpg'),
      sz('Small 320', 320, 180, '5c822c9b38_n.jpg'),
      sz('Small 400', 400, 225, '5c822c9b38_w.jpg'),
      { label: 'Medium', width: '500', height: '281', source: 'https://live.staticflickr.com/65535/55655753948_5c822c9b38.jpg' },
      sz('Medium 640', 640, 360, '5c822c9b38_z.jpg'),
      sz('Medium 800', 800, 450, '5c822c9b38_c.jpg'),
      sz('Large', 1024, 576, '5c822c9b38_b.jpg'),
      sz('Large 1600', 1600, 900, '8a0ff6e906_h.jpg'),
      sz('Large 2048', 2048, 1152, 'bf871d9a71_k.jpg'),
      sz('X-Large 3K', '3072', '1728', 'e18dee666e_3k.jpg'),
      sz('X-Large 4K', 3840, 2160, '7c06593c23_4k.jpg'),
      sz('Original', 3840, 2160, '8a94f2bb27_o.jpg')
    ]
  }
};
const INFO_55655753948 = {
  photo: {
    id: '55655753948',
    title: { _content: 'Timeline 3_00086400' },
    urls: { url: [{ type: 'photopage', _content: 'https://www.flickr.com/photos/194776399@N02/55655753948/' }] }
  }
};

test('extractFlickrRefs：書き方の揺れ', () => {
  const t = `
cover: "https://www.flickr.com/photos/194776399@N02/55655753948/in/photostream/"
{% include photo.html flickr="https://www.flickr.com/photos/hal_sakaguchi/55654636627" %}
![x](https://live.staticflickr.com/65535/55608378043_af521b621f_4k.jpg)
http://www.flickr.com/photos/194776399@N02/111/?foo=1
https://www.flickr.com/photo.gne?id=222
`;
  assert.deepEqual(extractFlickrRefs(t).map(r => r.id), ['55655753948', '55654636627', '55608378043', '111', '222']);
  assert.equal(extractFlickrRefs(t)[0].url, 'https://www.flickr.com/photos/194776399@N02/55655753948/in/photostream/');
});

test('extractFlickrRefs：拾わないもの', () => {
  const t = `https://live.staticflickr.com/65535/XXXXXXXXXXX_yyyyyyyyyy_k.jpg
https://www.flickr.com/photos/194776399@N02/albums/72177720312345678
https://www.flickr.com/
https://assets.st-note.com/production/uploads/images/1/a.jpg
https://www.flickr.com/photo.gne?id=XXXXXXXXXXX`;
  assert.deepEqual(extractFlickrRefs(t), []);
});

test('extractFlickrRefs：同じ文字列は 1 回', () => {
  const u = 'https://www.flickr.com/photos/a/1/';
  assert.equal(extractFlickrRefs(`${u} ${u}`).length, 1);
});

test('sizesFromApi：suffix をキーにする', () => {
  const s = sizesFromApi(SIZES_55655753948);
  assert.equal(s[''].src, 'https://live.staticflickr.com/65535/55655753948_5c822c9b38.jpg');
  assert.deepEqual([s[''].w, s[''].h], [500, 281]);
  assert.deepEqual([s['3k'].w, s['3k'].h], [3072, 1728]);
  assert.equal(s.c.src, P + '5c822c9b38_c.jpg');
});

test('buildEntry：既定サイズ', () => {
  const e = buildEntry(SIZES_55655753948, INFO_55655753948, DEFAULT_POST_SIZES);
  assert.equal(e.full, 'https://live.staticflickr.com/65535/55655753948_e18dee666e_3k.jpg');
  assert.equal(e.thumb, 'https://live.staticflickr.com/65535/55655753948_5c822c9b38_c.jpg');
  assert.deepEqual([e.w, e.h], [3072, 1728]);
  assert.equal(e.title, 'Timeline 3_00086400');
  assert.equal(e.page, 'https://www.flickr.com/photos/194776399@N02/55655753948/');
});

test('pickSize：候補が無ければ次、全部無ければ最大', () => {
  const s = { b: { src: 'B', w: 1024, h: 768 }, c: { src: 'C', w: 800, h: 600 } };
  assert.equal(pickSize(s, ['3k', 'k', 'h', 'b']).src, 'B');
  assert.equal(pickSize({ o: { src: 'O', w: 4000, h: 3000 }, m: { src: 'M', w: 240, h: 180 } }, ['3k']).src, 'O');
  assert.equal(pickSize({}, ['c']), null);
});

const E = id => ({ page: `p${id}`, title: '', full: `f${id}`, thumb: `t${id}`, w: 1, h: 1 });
const refs = {
  '_posts/a.md': [{ url: 'U1', id: '1' }, { url: 'U1b', id: '1' }, { url: 'U2', id: '2' }],
  '_posts/b.md': [{ url: 'U1c', id: '1' }]
};

test('missingIds：キャッシュに無い ID だけ、refresh なら全部', () => {
  const prev = { photos: { 1: E('1') }, urls: {}, posts: {} };
  assert.deepEqual(missingIds(prev, refs, false), ['2']);
  assert.deepEqual(missingIds(prev, refs, true).sort(), ['1', '2']);
  assert.deepEqual(missingIds(null, refs, false).sort(), ['1', '2']);
});

test('updateCache：同じ写真の複数 URL・複数記事、参照されない写真は消す', () => {
  const prev = { photos: { 1: E('1'), 9: E('9') }, urls: { U9: '9' }, posts: {} };
  const next = updateCache(prev, refs, { 2: E('2') }, 'NOW');
  assert.deepEqual(Object.keys(next.photos).sort(), ['1', '2']);
  assert.deepEqual(next.urls, { U1: '1', U1b: '1', U2: '2', U1c: '1' });
  assert.deepEqual(next.posts, { '_posts/a.md': ['1', '2'], '_posts/b.md': ['1'] });
  assert.equal(next.generatedAt, 'NOW');
});

test('updateCache：取得に失敗した写真は未解決（urls / posts に入れない）、前回分は残す', () => {
  const next = updateCache({ photos: { 1: E('1') }, urls: {}, posts: {} }, refs, {}, 'NOW');
  assert.deepEqual(Object.keys(next.photos), ['1']);
  assert.equal(next.urls.U2, undefined);
  assert.deepEqual(next.posts['_posts/a.md'], ['1']);
});

test('mergePhotos：追加だけで削除しない', () => {
  const prev = { photos: { 9: E('9') }, urls: { U9: '9' }, posts: { '_posts/x.md': ['9'] } };
  const next = mergePhotos(prev, { 3: E('3') }, { U3: '3' }, 'NOW');
  assert.deepEqual(Object.keys(next.photos).sort(), ['3', '9']);
  assert.deepEqual(next.urls, { U9: '9', U3: '3' });
  assert.deepEqual(next.posts, prev.posts);
});
