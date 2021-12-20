import fs from 'node:fs/promises';
import { URL } from 'node:url';

import test from 'ava';
import parseTorrent from 'parse-torrent';

import { files, hash, info } from '../src/index.js';

const file = new URL('./ubuntu-18.04.2-live-server-amd64.iso.torrent', import.meta.url);

test('should have the same hash as parse-torrent', async t => {
  t.is(await hash(await fs.readFile(file)), parseTorrent(await fs.readFile(file)).infoHash!);
});
test('should have the same name as parse-torrent', async t => {
  t.is(info(await fs.readFile(file)).name, parseTorrent(await fs.readFile(file)).name as string);
});
test('should parse files', async t => {
  t.deepEqual(files(await fs.readFile(file)).files[0], {
    length: 874512384,
    name: 'ubuntu-18.04.2-live-server-amd64.iso',
    offset: 0,
    path: 'ubuntu-18.04.2-live-server-amd64.iso',
  });
});
test('should parse file pieces', async t => {
  t.is(files(await fs.readFile(file)).pieces.length, 1668);
});
