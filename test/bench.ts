import path from 'path';
import fs from 'fs';
import Benchmark from 'benchmark';
import parseTorrent from 'parse-torrent';

import { TorrentFile } from '../src/torrentFile';

const file = path.join(__dirname, 'ubuntu-18.04.2-live-server-amd64.iso.torrent');

// add tests
new Benchmark.Suite()
  .add('parseTorrent', () => {
    parseTorrent(fs.readFileSync(file)).infoHash;
  })
  .add('TorrentFile', () => {
    new TorrentFile(fs.readFileSync(file)).hash();
  })
  .on('cycle', event => {
    console.log(String(event.target));
  })
  .run({ });
