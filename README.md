# torrent-file [![npm](https://badgen.net/npm/v/@ctrl/torrent-file)](https://www.npmjs.com/package/@ctrl/torrent-file) [![coverage](https://badgen.net/codecov/c/github/scttcper/torrent-file)](https://codecov.io/gh/scttcper/torrent-file) [![bundlesize](https://badgen.net/bundlephobia/min/@ctrl/torrent-file)](https://bundlephobia.com/result?p=@ctrl/torrent-file)

> Parse a torrent file and read encoded data. 

This project is based on [parse-torrent](https://www.npmjs.com/package/parse-torrent) and [node-bencode](https://github.com/themasch/node-bencode) to parse the data of a torrent file. This library implements its own [bencode](http://www.bittorrent.org/beps/bep_0003.html) encoder and decoder that does not use `Buffer`.

### Install
```console
npm install @ctrl/torrent-file
```

### API

##### info
The content of the metainfo file.
```ts
import fs from 'fs';
import { info } from '@ctrl/torrent-file';

const torrentInfo = info(fs.readFileSync('myfile'));
console.log({ torrentInfo });
```

##### files
data about the files described in the torrent file, includes hashes of the pieces
```ts
import fs from 'fs';
import { files } from '@ctrl/torrent-file';

const torrentFiles = files(fs.readFileSync('myfile'));
console.log({ torrentFiles });
```

##### hash
sha1 of torrent file info. This hash is commenly used by torrent clients as the ID of the torrent. It is async and sha1 encoding is handled by [crypto-hash](https://github.com/sindresorhus/crypto-hash)
```ts
import fs from 'fs';
import { hash } from '@ctrl/torrent-file';

(async () => {
  const torrentHash = await hash(fs.readFileSync('myfile'));
  console.log({ torrentHash });
})()
```


### See Also
[parse-torrent](https://www.npmjs.com/package/parse-torrent) - "@ctrl/torrent-file" torrent parsing based very heavily off this project  
[node-bencode](https://github.com/themasch/node-bencode) - bencoder built into this project heavily based off this project   
