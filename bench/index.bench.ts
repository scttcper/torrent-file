import fs from 'node:fs/promises';
import { URL } from 'node:url';

import { bench, describe } from 'vitest';

import { decode, encode } from '../src/bencode/index.js';
import { files, hash, hashV2, hashes, info } from '../src/index.js';

const ubuntuPath = new URL('../test/ubuntu-18.04.2-live-server-amd64.iso.torrent', import.meta.url);
const v2Path = new URL('../test/bittorrent-v2-test.torrent', import.meta.url);
const hybridPath = new URL('../test/bittorrent-v2-hybrid-test.torrent', import.meta.url);

const ubuntuFile = await fs.readFile(ubuntuPath);
const v2File = await fs.readFile(v2Path);
const hybridFile = await fs.readFile(hybridPath);

describe('bencode', () => {
  const decoded = decode(ubuntuFile);

  bench('decode (ubuntu)', () => {
    decode(ubuntuFile);
  });

  bench('encode (ubuntu)', () => {
    encode(decoded);
  });

  bench('decode (v2)', () => {
    decode(v2File);
  });

  bench('decode (hybrid)', () => {
    decode(hybridFile);
  });
});

describe('torrentFile', () => {
  bench('hash (ubuntu)', () => {
    hash(ubuntuFile);
  });

  bench('info (ubuntu)', () => {
    info(ubuntuFile);
  });

  bench('files (ubuntu)', () => {
    files(ubuntuFile);
  });

  bench('hash (v2)', () => {
    hashV2(v2File);
  });

  bench('hashes (hybrid)', () => {
    hashes(hybridFile);
  });

  bench('info (v2)', () => {
    info(v2File);
  });

  bench('files (v2)', () => {
    files(v2File);
  });

  bench('info (hybrid)', () => {
    info(hybridFile);
  });

  bench('files (hybrid)', () => {
    files(hybridFile);
  });
});
