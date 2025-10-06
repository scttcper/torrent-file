import fs from 'node:fs/promises';
import { URL } from 'node:url';

// @ts-expect-error types are outdated
import parseTorrent from 'parse-torrent';
import { expect, it } from 'vitest';

import { toTorrentFile } from '../src/index.js';

const leavesPath = new URL('./leaves-duplicate-tracker.torrent', import.meta.url);

it('toTorrentFile round-trips announce/url-list and fields', async () => {
  const file = await fs.readFile(leavesPath);
  const parsed = await parseTorrent(file);
  const buf = toTorrentFile({
    info: parsed.info,
    announce: parsed.announce,
    urlList: parsed.urlList,
    private: parsed.private,
    created: parsed.created,
    createdBy: parsed.createdBy,
    comment: parsed.comment,
  });
  const reparsed = await parseTorrent(buf);

  expect(reparsed.announce).toEqual(parsed.announce || []);
  expect(reparsed.urlList).toEqual(parsed.urlList || []);
  expect(reparsed.private).toBe(parsed.private);
  expect(reparsed.created?.getTime()).toBe(parsed.created?.getTime());
  expect(reparsed.createdBy).toBe(parsed.createdBy);
  expect(reparsed.comment).toBe(parsed.comment);
});
