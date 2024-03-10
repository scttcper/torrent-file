import fs from 'node:fs/promises';
import { URL } from 'node:url';

import { expect, it } from 'vitest';

import { decode } from '../../src/bencode/index.js';

// @see http://www.bittorrent.org/beps/bep_0023.html
it('should be able to handle an compacted peer announce', async () => {
  const announce = await fs.readFile(new URL('./announce-compacted-peers.bin', import.meta.url));
  const data = decode(announce);

  expect(data).toEqual({
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

it('should be able to handle an compacted peer announce when decoding strings', async () => {
  const announce = await fs.readFile(new URL('./announce-compacted-peers.bin', import.meta.url));
  const data = decode(announce, 'utf8');

  expect(data).toEqual({
    complete: 4,
    incomplete: 3,
    interval: 1800,
    'min interval': 1800,
    peers: expect.any(Uint8Array),
  });
});
