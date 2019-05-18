import { sha1 } from 'crypto-hash';

import { decode, encode } from './bencode';

export class TorrentFile {
  private _fileDataCache: any;

  constructor(private file: Buffer) {}

  hash() {
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


