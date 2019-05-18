import fs from 'fs';
import parseTorrent from 'parse-torrent';
import path from 'path';

import { TorrentFile } from '../src/torrentFile';

const file = path.join(__dirname, 'ubuntu-18.04.2-live-server-amd64.iso.torrent');

describe('TorrentFile', () => {
  it('should have the same hash as parse-torrent', () => {
    expect(new TorrentFile(fs.readFileSync(file)).hash()).toBe(parseTorrent(fs.readFileSync(file)).infoHash);
  });
});
