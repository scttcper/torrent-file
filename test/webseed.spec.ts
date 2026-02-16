import fs from 'node:fs/promises';
import { URL } from 'node:url';

import { expect, it } from 'vitest';

import { info } from '../src/index.js';

it('should parse url-list for webseed support', async () => {
  const file = await fs.readFile(new URL('./leaves-url-list.torrent', import.meta.url));
  const torrentInfo = info(file);
  expect(torrentInfo.urlList).toEqual([
    'http://www2.hn.psu.edu/faculty/jmanis/whitman/leaves-of-grass6x9.pdf',
  ]);
});

it('should parse empty url-list', async () => {
  const file = await fs.readFile(new URL('./leaves-empty-url-list.torrent', import.meta.url));
  const torrentInfo = info(file);
  expect(torrentInfo.urlList).toEqual([]);
});
