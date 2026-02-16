import fs from 'node:fs/promises';
import { URL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { decode, encode } from '../src/bencode/index.js';
import { files, hash, hashV2, hashes, info, toTorrentFile } from '../src/index.js';

const v2Path = new URL('./bittorrent-v2-test.torrent', import.meta.url);
const hybridPath = new URL('./bittorrent-v2-hybrid-test.torrent', import.meta.url);
const v1Path = new URL('./ubuntu-18.04.2-live-server-amd64.iso.torrent', import.meta.url);

describe('v2-only torrent', () => {
  it('should detect version as v2', async () => {
    const file = await fs.readFile(v2Path);
    const i = info(file);
    expect(i.version).toBe('v2');
  });

  it('should compute sha256 info hash', async () => {
    const file = await fs.readFile(v2Path);
    expect(hashV2(file)).toBe('f52498c4ad914be2c8a1d1e96b84a0032a8c28a691c9120d004dcc41a828b2bb');
  });

  it('should return both hashes from hashes()', async () => {
    const file = await fs.readFile(v2Path);
    const h = hashes(file);
    expect(h.version).toBe('v2');
    expect(h.infoHash).toBe('a8d30cc3abf2c04747f23ac29cb09c5824f9e75f');
    expect(h.infoHashV2).toBe('f52498c4ad914be2c8a1d1e96b84a0032a8c28a691c9120d004dcc41a828b2bb');
  });

  it('should parse file tree', async () => {
    const file = await fs.readFile(v2Path);
    const f = files(file);
    expect(f.version).toBe('v2');
    expect(f.files).toHaveLength(1);
    expect(f.files[0]!.name).toBe('test-file.txt');
    expect(f.files[0]!.length).toBe(65_536);
    expect(f.files[0]!.offset).toBe(0);
    expect(f.files[0]!.path).toBe('test-v2-torrent/test-file.txt');
  });

  it('should have piecesRoot on files', async () => {
    const file = await fs.readFile(v2Path);
    const f = files(file);
    expect(f.files[0]!.piecesRoot).toBe(
      'bb33e4383a0ee2f7581969ef27fdd697ac29efbff12855622f58cc4777ddfdcc',
    );
  });

  it('should have undefined pieces for v2-only', async () => {
    const file = await fs.readFile(v2Path);
    const f = files(file);
    expect(f.pieces).toBeUndefined();
  });

  it('should parse piece layers', async () => {
    const file = await fs.readFile(v2Path);
    const f = files(file);
    expect(f.pieceLayers).toBeDefined();
    const rootHex = 'bb33e4383a0ee2f7581969ef27fdd697ac29efbff12855622f58cc4777ddfdcc';
    expect(f.pieceLayers![rootHex]).toHaveLength(2);
    expect(f.pieceLayers![rootHex]![0]).toBe(
      '0384464402f44c57cd80ec60aadfb6221f3f2747c357c5f9292f64c15ac856c2',
    );
    expect(f.pieceLayers![rootHex]![1]).toBe(
      '869c520e1506206e5245d21eec6d95ce6dfc740059963dd66bde3531e76e9825',
    );
  });

  it('should parse name', async () => {
    const file = await fs.readFile(v2Path);
    const i = info(file);
    expect(i.name).toBe('test-v2-torrent');
  });
});

describe('hybrid torrent', () => {
  it('should detect version as hybrid', async () => {
    const file = await fs.readFile(hybridPath);
    const i = info(file);
    expect(i.version).toBe('hybrid');
  });

  it('should return both hashes', async () => {
    const file = await fs.readFile(hybridPath);
    const h = hashes(file);
    expect(h.version).toBe('hybrid');
    expect(h.infoHash).toBe('73421a89fb758387dc0ed4df74632b62a0b46187');
    expect(h.infoHashV2).toBe('303efdf1e033ad6d2200a9e2f4fdf1825a7a77641aff761cde75a332619b58a5');
  });

  it('should have both v1 pieces and v2 piece layers', async () => {
    const file = await fs.readFile(hybridPath);
    const f = files(file);
    expect(f.version).toBe('hybrid');
    expect(f.pieces).toBeDefined();
    expect(f.pieces).toHaveLength(1);
    expect(f.pieces![0]).toBe('b57777419d12a5140bfa2524a66782c3a6017c18');
    expect(f.pieceLayers).toBeDefined();
  });

  it('should attach piecesRoot to files from file tree', async () => {
    const file = await fs.readFile(hybridPath);
    const f = files(file);
    expect(f.files[0]!.piecesRoot).toBe(
      'bb33e4383a0ee2f7581969ef27fdd697ac29efbff12855622f58cc4777ddfdcc',
    );
  });

  it('should parse name', async () => {
    const file = await fs.readFile(hybridPath);
    const i = info(file);
    expect(i.name).toBe('hybrid-file.txt');
  });
});

describe('hybrid torrent with padding files', () => {
  it('should match piecesRoot by path, not index', () => {
    const piecesRootA = new Uint8Array(32).fill(0x11);
    const piecesRootB = new Uint8Array(32).fill(0x22);
    const sha1Pieces = new Uint8Array(60); // 3 files × 20-byte SHA-1

    // v1 file list has a padding file between two real files
    const hybridWithPadding = encode({
      info: {
        'file tree': {
          'a.txt': { '': { length: 1000, 'pieces root': piecesRootA } },
          'b.txt': { '': { length: 2000, 'pieces root': piecesRootB } },
        },
        files: [
          { length: 1000, path: ['a.txt'] },
          { length: 500, path: ['.pad', '500'] }, // padding file
          { length: 2000, path: ['b.txt'] },
        ],
        name: 'myTorrent',
        'piece length': 32_768,
        pieces: sha1Pieces,
      },
    });

    const f = files(hybridWithPadding);
    expect(f.version).toBe('hybrid');
    expect(f.files).toHaveLength(3);
    // Real files get correct piecesRoot despite padding file shifting indices
    expect(f.files[0]!.name).toBe('a.txt');
    expect(f.files[0]!.piecesRoot).toBe('11'.repeat(32));
    expect(f.files[1]!.name).toBe('500');
    expect(f.files[1]!.piecesRoot).toBeUndefined(); // padding file has no piecesRoot
    expect(f.files[2]!.name).toBe('b.txt');
    expect(f.files[2]!.piecesRoot).toBe('22'.repeat(32));
  });
});

describe('v1 backward compatibility', () => {
  it('should detect version as v1', async () => {
    const file = await fs.readFile(v1Path);
    const i = info(file);
    expect(i.version).toBe('v1');
  });

  it('should have no infoHashV2', async () => {
    const file = await fs.readFile(v1Path);
    const h = hashes(file);
    expect(h.version).toBe('v1');
    expect(h.infoHashV2).toBeUndefined();
  });

  it('should still return v1 hash from hash()', async () => {
    const file = await fs.readFile(v1Path);
    const h = hash(file);
    expect(h).toBeTruthy();
    expect(h).toHaveLength(40); // 20 bytes hex
  });

  it('should have pieces defined', async () => {
    const file = await fs.readFile(v1Path);
    const f = files(file);
    expect(f.version).toBe('v1');
    expect(f.pieces).toBeDefined();
    expect(f.pieces!.length).toBeGreaterThan(0);
    expect(f.pieceLayers).toBeUndefined();
  });
});

describe('bencode latin1 round-trip', () => {
  it('should round-trip binary dictionary keys', () => {
    // Create a dict with binary key (all 256 byte values)
    const binaryKey = String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i * 8));
    const obj: Record<string, any> = { [binaryKey]: 42 };
    const encoded = encode(obj);
    const decoded = decode(encoded) as Record<string, any>;
    expect(Object.keys(decoded)).toHaveLength(1);
    expect(Object.keys(decoded)[0]).toBe(binaryKey);
    expect(decoded[binaryKey]).toBe(42);
  });

  it('should round-trip v2 torrent with piece layers', async () => {
    const file = await fs.readFile(v2Path);
    const decoded: any = decode(file);
    const reencoded = encode(decoded);
    const redecoded: any = decode(reencoded);
    expect(Object.keys(redecoded['piece layers'])).toHaveLength(1);
    // Verify the piece layer values survived round-trip
    const key = Object.keys(redecoded['piece layers'])[0]!;
    const value = redecoded['piece layers'][key];
    expect(value).toBeInstanceOf(Uint8Array);
    expect(value.length).toBe(64); // 2 x 32-byte hashes
  });
});

describe('toTorrentFile with piece layers', () => {
  it('should encode piece layers in output', async () => {
    const piecesRoot = new Uint8Array(32);
    piecesRoot.fill(0xab);
    const pieceData = new Uint8Array(64);
    pieceData.fill(0xcd);

    // Convert piecesRoot to latin1 key for the dict
    let latin1Key = '';
    // eslint-disable-next-line typescript-eslint/prefer-for-of
    for (let i = 0; i < piecesRoot.length; i++) {
      latin1Key += String.fromCharCode(piecesRoot[i]!);
    }

    const buf = toTorrentFile({
      info: { name: 'test', 'piece length': 32_768 },
      pieceLayers: { [latin1Key]: pieceData },
    });

    const decoded: any = decode(buf);
    expect(decoded['piece layers']).toBeDefined();
    const keys = Object.keys(decoded['piece layers']);
    expect(keys).toHaveLength(1);
    expect(decoded['piece layers'][keys[0]!]).toBeInstanceOf(Uint8Array);
    expect(decoded['piece layers'][keys[0]!].length).toBe(64);
  });
});
