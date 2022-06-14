import fs from 'node:fs';
import { URL } from 'node:url';

import parseTorrent from 'parse-torrent';
import { expect, it } from 'vitest';

import { files, hash, info } from '../src/index.js';

const file = new URL('./ubuntu-18.04.2-live-server-amd64.iso.torrent', import.meta.url);

it('should have the same hash as parse-torrent', async () => {
  expect(await hash(fs.readFileSync(file))).toBe(parseTorrent(fs.readFileSync(file)).infoHash);
});
it('should have the same name as parse-torrent', () => {
  expect(info(fs.readFileSync(file)).name).toEqual(parseTorrent(fs.readFileSync(file)).name);
});
it('should parse files', () => {
  expect(files(fs.readFileSync(file)).files[0]).toEqual({
    length: 874512384,
    name: 'ubuntu-18.04.2-live-server-amd64.iso',
    offset: 0,
    path: 'ubuntu-18.04.2-live-server-amd64.iso',
  });
});
it('should parse file pieces', () => {
  expect(files(fs.readFileSync(file)).pieces).toHaveLength(1668);
});
