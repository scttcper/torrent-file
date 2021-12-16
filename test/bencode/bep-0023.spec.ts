import fs from 'node:fs/promises';
import { URL } from 'node:url';

import test from 'ava';

import { decode } from '../../src/bencode/index.js';

// @see http://www.bittorrent.org/beps/bep_0023.html
test('should be able to handle an compacted peer announce', async t => {
  const announce = await fs.readFile(new URL('./announce-compacted-peers.bin', import.meta.url));
  const data = decode(announce);

  t.deepEqual(data, {
    complete: 4,
    incomplete: 3,
    interval: 1800,
    'min interval': 1800,
    peers: Buffer.from(
      '2ebd1b641a1f51d54c0546cc342190401a1f626ee9c6c8d5cb0d92131a1fac4e689a3c6b180f3d5746db',
      'hex',
    ),
  });
});

test('should be able to handle an compacted peer announce when decoding strings', async t => {
  const announce = await fs.readFile(new URL('./announce-compacted-peers.bin', import.meta.url));
  const data = decode(announce, 'utf8');

  t.deepEqual(data, {
    complete: 4,
    incomplete: 3,
    interval: 1800,
    'min interval': 1800,
    peers:
      '.�\u001bd\u001a\u001fQ�L\u0005F�4!�@\u001a\u001fbn�����\r�\u0013\u001a\u001f�Nh�<k\u0018\u000f=WF�',
  });
});
