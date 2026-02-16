import { createHash } from 'node:crypto';
import { sep } from 'node:path';

import { decode, encode } from './bencode/index.js';

const td = new TextDecoder();

const hexLookup: string[] = new Array(256); // eslint-disable-line unicorn/no-new-array
for (let i = 0; i < 256; i++) {
  hexLookup[i] = (i < 16 ? '0' : '') + i.toString(16);
}

function toHex(buf: Uint8Array): string {
  let hex = '';
  // eslint-disable-next-line typescript-eslint/prefer-for-of
  for (let i = 0; i < buf.length; i++) {
    hex += hexLookup[buf[i]!]!;
  }

  return hex;
}

const toString = (value: any): string => {
  if (value instanceof Uint8Array) {
    return td.decode(value);
  }

  return value.toString();
};

export const sha1 = (input: Uint8Array): string => {
  const hash = createHash('sha1');
  hash.update(input);
  return hash.digest('hex');
};

export const sha256 = (input: Uint8Array): string => {
  const hash = createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
};

export type TorrentVersion = 'v1' | 'v2' | 'hybrid';

function detectVersion(infoDict: any): { version: TorrentVersion; hasV1: boolean; hasV2: boolean } {
  const hasV1 = !!(infoDict.pieces || infoDict.files || typeof infoDict.length === 'number');
  const hasV2 = !!infoDict['file tree'];
  let version: TorrentVersion;
  if (hasV1 && hasV2) {
    version = 'hybrid';
  } else if (hasV2) {
    version = 'v2';
  } else {
    version = 'v1';
  }

  return { version, hasV1, hasV2 };
}

// BEP-52 file tree: directories are nested dicts, files are identified
// by an empty-string '' key whose value contains { length, 'pieces root' }.
function flattenFileTree(
  tree: any,
  currentPath: string[],
): Array<{ length: number; path: string[]; 'pieces root'?: Uint8Array }> {
  const result: Array<{ length: number; path: string[]; 'pieces root'?: Uint8Array }> = [];

  for (const key of Object.keys(tree)) {
    const node = tree[key];
    if (key === '') {
      // This is a file entry
      result.push({
        length: node.length,
        path: currentPath,
        'pieces root': node['pieces root'],
      });
    } else {
      // This is a directory, recurse
      result.push(...flattenFileTree(node, [...currentPath, key]));
    }
  }

  return result;
}

function splitPieces(buf: Uint8Array, chunkSize: number): string[] {
  const hex = toHex(buf);
  const hexChunkSize = chunkSize * 2;
  const count = Math.ceil(hex.length / hexChunkSize);
  const pieces: string[] = new Array(count); // eslint-disable-line unicorn/no-new-array
  for (let i = 0; i < count; i++) {
    pieces[i] = hex.slice(i * hexChunkSize, (i + 1) * hexChunkSize);
  }

  return pieces;
}

/**
 * Convert a latin1-encoded string key to hex.
 */
function latin1KeyToHex(key: string): string {
  let hex = '';
  for (let i = 0; i < key.length; i++) {
    hex += hexLookup[key.charCodeAt(i) & 0xff]!; // eslint-disable-line no-bitwise
  }

  return hex;
}

/**
 * sha1 of torrent file info. This hash is commonly used by torrent clients as the ID of the torrent.
 */
export function hash(file: Uint8Array): string {
  const torrent: any = decode(file);
  return sha1(encode(torrent.info));
}

/**
 * sha256 of torrent file info dict. Used as the info hash for v2/hybrid torrents.
 */
export function hashV2(file: Uint8Array): string {
  const torrent: any = decode(file);
  return sha256(encode(torrent.info));
}

/**
 * Returns both v1 and v2 info hashes along with the detected torrent version.
 */
export function hashes(file: Uint8Array): {
  infoHash: string;
  infoHashV2?: string;
  version: TorrentVersion;
} {
  const torrent: any = decode(file);
  const { version, hasV2 } = detectVersion(torrent.info);
  const encodedInfo = encode(torrent.info);
  const result: { infoHash: string; infoHashV2?: string; version: TorrentVersion } = {
    infoHash: sha1(encodedInfo),
    version,
  };

  if (hasV2) {
    result.infoHashV2 = sha256(encodedInfo);
  }

  return result;
}

export interface TorrentFileData {
  length: number;
  files: Array<{
    path: string;
    /**
     * filename
     */
    name: string;
    /**
     * length of the file in bytes
     */
    length: number;
    offset: number;
    /**
     * hex-encoded SHA-256 pieces root for this file (v2/hybrid only)
     */
    piecesRoot?: string;
  }>;
  /**
   * number of bytes in each piece
   */
  pieceLength: number;
  lastPieceLength: number;
  /**
   * hex-encoded SHA-1 piece hashes (v1/hybrid). Undefined for v2-only torrents.
   */
  pieces?: string[];
  /**
   * Maps hex-encoded pieces root to array of hex-encoded SHA-256 piece hashes (v2/hybrid only).
   */
  pieceLayers?: Record<string, string[]>;
  version: TorrentVersion;
}

/**
 * data about the files the torrent contains
 */
export function files(file: Uint8Array): TorrentFileData {
  const torrent: any = decode(file);
  const { version, hasV1, hasV2 } = detectVersion(torrent.info);
  const result: TorrentFileData = {
    files: [],
    length: 0,
    lastPieceLength: 0,
    pieceLength: torrent.info['piece length'],
    version,
  };

  const name: string = toString(torrent.info['name.utf-8'] || torrent.info.name);

  if (hasV2 && !hasV1) {
    // v2-only: file tree is the only source of file info
    const flatFiles = flattenFileTree(torrent.info['file tree'], []);
    let offset = 0;
    result.files = flatFiles.map(f => {
      const parts = [name, ...f.path];
      const entry = {
        path: parts.join(sep),
        name: parts[parts.length - 1]!,
        length: f.length,
        offset,
        piecesRoot: f['pieces root'] ? toHex(f['pieces root']) : undefined,
      };
      offset += f.length;
      return entry;
    });
  } else {
    // v1 or hybrid: use traditional file list
    const fileList: any[] = torrent.info.files || [torrent.info];
    let offset = 0;
    result.files = fileList.map((f: any) => {
      const parts: string[] = [name, ...(f['path.utf-8'] || f.path || [])].map(p => toString(p));
      const entry: TorrentFileData['files'][number] = {
        path: parts.join(sep),
        name: parts[parts.length - 1]!,
        length: f.length,
        offset,
      };
      offset += f.length;
      return entry;
    });

    // For hybrid: attach piecesRoot from the file tree, matched by path.
    // Can't match by index because v1 may contain padding files that v2 doesn't.
    if (hasV2 && torrent.info['file tree']) {
      const flatFiles = flattenFileTree(torrent.info['file tree'], []);
      const v2ByPath = new Map<string, Uint8Array>();
      for (const ff of flatFiles) {
        if (ff['pieces root']) {
          v2ByPath.set(ff.path.join(sep), ff['pieces root']);
        }
      }

      const prefix = name + sep;
      for (const file of result.files) {
        // v1 paths include the torrent name prefix; v2 file tree paths don't
        const relativePath = file.path.startsWith(prefix)
          ? file.path.slice(prefix.length)
          : file.path;
        const root = v2ByPath.get(relativePath);
        if (root) {
          file.piecesRoot = toHex(root);
        }
      }
    }

    result.pieces = splitPieces(torrent.info.pieces, 20);
  }

  result.length = result.files.reduce(sumLength, 0);

  const lastFile = result.files[result.files.length - 1];
  result.lastPieceLength =
    (lastFile && (lastFile.offset + lastFile.length) % result.pieceLength) || result.pieceLength;

  // Parse piece layers (v2/hybrid)
  if (hasV2 && torrent['piece layers']) {
    const pieceLayers: Record<string, string[]> = {};
    for (const key of Object.keys(torrent['piece layers'])) {
      const hexKey = latin1KeyToHex(key);
      const value = torrent['piece layers'][key];
      if (value instanceof Uint8Array) {
        pieceLayers[hexKey] = splitPieces(value, 32);
      }
    }

    result.pieceLayers = pieceLayers;
  }

  return result;
}

function sumLength(sum: number, file: { length: number }): number {
  return sum + file.length;
}

export interface TorrentInfo {
  name: string;
  /**
   * The announce URL of the trackers
   */
  announce: string[];
  /**
   * free-form textual comments of the author
   */
  comment?: string;
  /**
   * if false the client may obtain peer from other means, e.g. PEX peer exchange, dht. Here, "private" may be read as "no external peer source".
   */
  private?: boolean;
  created?: Date;
  /**
   * name and version of the program used to create the .torrent (string)
   */
  createdBy?: string;
  /**
   * weburls to download torrent files
   */
  urlList: string[];
  version: TorrentVersion;
}

/**
 * torrent file info
 */
export function info(file: Uint8Array): TorrentInfo {
  const torrent: any = decode(file);
  const { version } = detectVersion(torrent.info);
  const result: TorrentInfo = {
    name: toString(torrent.info['name.utf-8'] || torrent.info.name),
    announce: [],
    urlList: [],
    version,
  };

  if (torrent.info.private !== undefined) {
    result.private = Boolean(torrent.info.private);
  }

  if (torrent['creation date']) {
    result.created = new Date(torrent['creation date'] * 1000);
  }

  if (torrent['created by']) {
    result.createdBy = toString(torrent['created by']);
  }

  if (torrent.comment) {
    result.comment = toString(torrent.comment);
  }

  // announce and announce-list will be missing if metadata fetched via ut_metadata
  if (
    Array.isArray(torrent['announce-list']) &&
    torrent['announce-list'] &&
    torrent['announce-list'].length > 0
  ) {
    torrent['announce-list'].forEach((urls: any) => {
      urls.forEach((url: any) => {
        result.announce.push(toString(url));
      });
    });
  } else if (torrent.announce) {
    result.announce.push(toString(torrent.announce));
  }

  if (result.announce.length > 0) {
    result.announce = [...new Set(result.announce)];
  }

  // web seeds
  if (torrent['url-list'] instanceof Uint8Array) {
    // some clients set url-list to empty string
    torrent['url-list'] = torrent['url-list'].length > 0 ? [torrent['url-list']] : [];
  }

  result.urlList = (torrent['url-list'] || []).map((url: any) => toString(url));
  if (result.urlList.length > 0) {
    result.urlList = [...new Set(result.urlList)];
  }

  return result;
}

export interface TorrentFileEncodeInput {
  info: any;
  announce?: string[];
  urlList?: string[];
  private?: boolean;
  created?: Date;
  createdBy?: string;
  comment?: string;
  pieceLayers?: Record<string, Uint8Array>;
}

/**
 * Convert a parsed torrent object back into a .torrent file buffer.
 */
export function toTorrentFile(parsed: TorrentFileEncodeInput): Uint8Array {
  const torrent: {
    info: any;
    'announce-list'?: string[][];
    announce?: string;
    'piece layers'?: Record<string, Uint8Array>;
    'url-list'?: string[] | string;
    'creation date'?: number;
    'created by'?: string;
    comment?: string;
  } = {
    info: parsed.info,
  };

  // announce list (BEP-12)
  const announce = parsed.announce || [];
  if (announce.length > 0) {
    torrent['announce-list'] = announce.map(url => {
      if (!torrent.announce) {
        torrent.announce = url;
      }
      return [url];
    });
  }

  // piece layers (BEP-52)
  if (parsed.pieceLayers && Object.keys(parsed.pieceLayers).length > 0) {
    torrent['piece layers'] = parsed.pieceLayers;
  }

  // url-list (BEP-19 / web seeds)
  if (parsed.urlList && parsed.urlList.length > 0) {
    torrent['url-list'] = [...parsed.urlList];
  }

  // Private flag lives inside info dict
  if (parsed.private !== undefined) {
    torrent.info = { ...torrent.info, private: Number(parsed.private) };
  }

  if (parsed.created) {
    torrent['creation date'] = Math.floor(parsed.created.getTime() / 1000);
  }

  if (parsed.createdBy) {
    torrent['created by'] = parsed.createdBy;
  }

  if (parsed.comment) {
    torrent.comment = parsed.comment;
  }

  return encode(torrent);
}
