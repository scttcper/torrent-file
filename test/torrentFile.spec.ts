import fs from 'node:fs/promises';
import { URL } from 'node:url';

// @ts-expect-error types are outdated
import parseTorrent from 'parse-torrent';
import { expect, it } from 'vitest';

import { files, hash, info } from '../src/index.js';

const filepath = new URL('./ubuntu-18.04.2-live-server-amd64.iso.torrent', import.meta.url);
const duplicateTrackerFilepath = new URL('./leaves-duplicate-tracker.torrent', import.meta.url);
const emptyAnnounceListFilepath = new URL('./leaves-empty-announce-list.torrent', import.meta.url);

it('should have the same hash as parse-torrent', async () => {
  const file = await fs.readFile(filepath);
  expect(hash(file)).toBe((await parseTorrent(file)).infoHash);
});
it('should have the same name as parse-torrent', async () => {
  const file = await fs.readFile(filepath);
  expect(info(file).name).toEqual((await parseTorrent(file)).name);
});
it('should parse files', async () => {
  const file = await fs.readFile(filepath);
  expect(files(file).files[0]).toEqual({
    length: 874512384,
    name: 'ubuntu-18.04.2-live-server-amd64.iso',
    offset: 0,
    path: 'ubuntu-18.04.2-live-server-amd64.iso',
  });
});
it('should parse file pieces', async () => {
  const file = await fs.readFile(filepath);
  expect(files(file).pieces).toHaveLength(1668);
});

it('should dedupe announce list', async () => {
  const file = await fs.readFile(duplicateTrackerFilepath);
  const torrentInfo = info(file);

  expect(torrentInfo.announce).toEqual(['http://tracker.example.com/announce']);
});

it('should handle empty announce list', async () => {
  const file = await fs.readFile(emptyAnnounceListFilepath);
  const torrentInfo = info(file);

  expect(torrentInfo.announce).toEqual(['udp://tracker.publicbt.com:80/announce']);
});
