// picker/snippets.mjs の単体テスト
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBody, buildCover } from '../picker/snippets.mjs';

const A = { id: '1', url: 'https://www.flickr.com/photos/u/1/' };
const B = { id: '2', url: 'https://www.flickr.com/photos/u/2/' };
test('buildBody：選んだ順、空行区切り、cover は除く', () => {
  assert.equal(buildBody([A, B], null),
    '{% include photo.html flickr="https://www.flickr.com/photos/u/1/" caption="" %}\n\n{% include photo.html flickr="https://www.flickr.com/photos/u/2/" caption="" %}');
  assert.equal(buildBody([A, B], '1'), '{% include photo.html flickr="https://www.flickr.com/photos/u/2/" caption="" %}');
  assert.equal(buildBody([], null), '');
});
test('buildCover', () => {
  assert.equal(buildCover([A, B], '2'), 'cover: "https://www.flickr.com/photos/u/2/"');
  assert.equal(buildCover([A, B], null), '');
});
