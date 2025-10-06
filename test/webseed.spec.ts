import fs from 'node:fs/promises';

import { expect, it } from 'vitest';

import { info } from '../src/index.js';

const PT_FIXTURES_DIR = '/Users/scooper/gh/parse-torrent/test/torrents';

it('should parse url-list for webseed support', async () => {
  const file = await fs.readFile(`${PT_FIXTURES_DIR}/leaves-url-list.torrent`);
  const torrentInfo = info(file);
  expect(torrentInfo.urlList).toEqual([
    'http://www2.hn.psu.edu/faculty/jmanis/whitman/leaves-of-grass6x9.pdf',
  ]);
});

it('should parse empty url-list', async () => {
  const file = await fs.readFile(`${PT_FIXTURES_DIR}/leaves-empty-url-list.torrent`);
  const torrentInfo = info(file);
  expect(torrentInfo.urlList).toEqual([]);
});
