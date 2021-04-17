import fs from 'fs';
import parseTorrent from 'parse-torrent';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

import { hash, info, files } from '../src/torrentFile';

const file = path.join(__dirname, 'ubuntu-18.04.2-live-server-amd64.iso.torrent');

describe('TorrentFile', () => {
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
});
