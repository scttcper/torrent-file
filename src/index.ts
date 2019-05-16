
import path from 'path';
import fs from 'fs';
import { sha1 } from 'crypto-hash';
import parseTorrent from 'parse-torrent';
import { decode } from './bencode/decode';
import { encode } from './bencode/encode';

export class TorrentFile {
  private _fileDataCache: any;

  constructor(private file: Buffer) {}

  hash() {
    console.log(this.fileData.info);
    return sha1(encode(this.fileData.info));
  }

  get fileData() {
    if (this._fileDataCache) {
      return this._fileDataCache;
    }

    this._fileDataCache = decode(this.file);
    return this._fileDataCache;
  }
}

const tf = new TorrentFile(fs.readFileSync(path.join(__dirname, 'ubuntu-18.04.2-live-server-amd64.iso.torrent')));
(async () => {
  console.log(await tf.hash());
  console.log(parseTorrent(fs.readFileSync(path.join(__dirname, 'ubuntu-18.04.2-live-server-amd64.iso.torrent'))).infoHash);
})();
