import { createHash } from 'node:crypto';
import { sep } from 'node:path';

import { decodeWithInfoEncoding } from './bencode/decode.js';
import { decode, encode } from './bencode/index.js';
import { markRawDictionaryKeys } from './bencode/utils.js';

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

// BEP 52 identifies v2 metadata with `meta version: 2`; a file tree by itself
// is not enough. A hybrid must independently contain all required v1 fields.
// https://www.bittorrent.org/beps/bep_0052.html#info-dictionary
function detectVersion(infoDict: any): { version: TorrentVersion; hasV1: boolean; hasV2: boolean } {
  if (!infoDict || typeof infoDict !== 'object' || Array.isArray(infoDict)) {
    throw new TypeError(`Torrent info must be a dictionary`);
  }

  const metaVersion = infoDict['meta version'];
  if (metaVersion !== undefined && metaVersion !== 2) {
    throw new Error(`Unsupported BitTorrent meta version: ${metaVersion}`);
  }

  const hasV1Pieces = infoDict.pieces instanceof Uint8Array;
  const hasV1Files = Array.isArray(infoDict.files);
  const hasV1Length = typeof infoDict.length === 'number';
  if (hasV1Pieces && hasV1Files === hasV1Length) {
    throw new Error(`BitTorrent v1 metadata must contain exactly one of files or length`);
  }

  const hasV1 = hasV1Pieces && (hasV1Files || hasV1Length);
  const fileTree = infoDict['file tree'];
  const hasV2 =
    metaVersion === 2 && fileTree && typeof fileTree === 'object' && !Array.isArray(fileTree);
  if (metaVersion === 2 && !hasV2) {
    throw new Error(`BitTorrent v2 metadata is missing its file tree`);
  }

  if (hasV2) {
    const pieceLength = infoDict['piece length'];
    if (
      !Number.isSafeInteger(pieceLength) ||
      pieceLength < 16_384 ||
      !Number.isInteger(Math.log2(pieceLength))
    ) {
      throw new Error(`BitTorrent v2 piece length must be a power of two of at least 16 KiB`);
    }
  }

  if (!hasV1 && !hasV2) {
    throw new Error(`Torrent is missing required v1 or v2 file information`);
  }

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

// BEP 52 file tree: directories are nested dictionaries and an empty key marks
// the properties of the file at the composed path. File order is significant.
// https://www.bittorrent.org/beps/bep_0052.html#file-tree-layout
function flattenFileTree(
  tree: any,
  currentPath: string[],
): Array<{ length: number; path: string[]; 'pieces root'?: Uint8Array }> {
  const result: Array<{ length: number; path: string[]; 'pieces root'?: Uint8Array }> = [];
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
    throw new TypeError(`BitTorrent v2 file tree nodes must be dictionaries`);
  }

  // Object.keys() reorders integer-like file names, but BEP-52 file order is
  // the raw byte order of the bencoded dictionary and determines piece offsets.
  const keys = Object.keys(tree).sort();
  if (keys.includes('') && (keys.length !== 1 || currentPath.length === 0)) {
    throw new Error(`BitTorrent v2 file entries cannot have sibling entries or be the tree root`);
  }

  for (const key of keys) {
    const node = tree[key];
    if (key === '') {
      // This is a file entry
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        throw new TypeError(`BitTorrent v2 file properties must be a dictionary`);
      }

      if (!Number.isSafeInteger(node.length) || node.length < 0) {
        throw new Error(`BitTorrent v2 file length must be a non-negative safe integer`);
      }

      const piecesRoot = node['pieces root'];
      if (node.length > 0 && (!(piecesRoot instanceof Uint8Array) || piecesRoot.length !== 32)) {
        throw new Error(`Non-empty BitTorrent v2 files must have a 32-byte pieces root`);
      }

      if (piecesRoot !== undefined && piecesRoot.length !== 32) {
        throw new Error(`BitTorrent v2 pieces roots must be 32 bytes`);
      }

      result.push({
        length: node.length,
        path: currentPath,
        'pieces root': piecesRoot,
      });
    } else {
      // This is a directory, recurse
      result.push(...flattenFileTree(node, [...currentPath, latin1KeyToString(key)]));
    }
  }

  return result;
}

/** Decode the lossless one-code-point-per-byte dictionary key as BEP 52 UTF-8 path text. */
function latin1KeyToString(key: string): string {
  const bytes = new Uint8Array(key.length);
  for (let i = 0; i < key.length; i++) {
    bytes[i] = key.charCodeAt(i);
  }

  return td.decode(bytes);
}

function splitPieces(buf: Uint8Array, chunkSize: number): string[] {
  if (buf.length % chunkSize !== 0) {
    throw new Error(`Piece hash data length must be a multiple of ${chunkSize} bytes`);
  }

  const count = buf.length / chunkSize;
  const pieces: string[] = new Array(count); // eslint-disable-line unicorn/no-new-array
  for (let i = 0; i < count; i++) {
    let hex = '';
    const end = (i + 1) * chunkSize;
    for (let j = i * chunkSize; j < end; j++) {
      hex += hexLookup[buf[j]!]!;
    }

    pieces[i] = hex;
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
 * SHA-1 of the exact encoded info dictionary for a v1 or hybrid torrent.
 * @see https://www.bittorrent.org/beps/bep_0003.html#trackers
 */
export function hash(file: Uint8Array): string {
  const { torrent, infoEncoding } = decodeTorrent(file);
  const { hasV1 } = detectVersion(torrent.info);
  if (!hasV1) {
    throw new Error(`Torrent does not contain BitTorrent v1 metadata`);
  }

  return sha1(infoEncoding);
}

/**
 * SHA-256 of the exact encoded info dictionary for a v2 or hybrid torrent.
 * @see https://www.bittorrent.org/beps/bep_0052.html#infohash
 */
export function hashV2(file: Uint8Array): string {
  const { torrent, infoEncoding } = decodeTorrent(file);
  const { hasV2 } = detectVersion(torrent.info);
  if (!hasV2) {
    throw new Error(`Torrent does not contain BitTorrent v2 metadata`);
  }

  return sha256(infoEncoding);
}

/**
 * Returns both v1 and v2 info hashes along with the detected torrent version.
 */
export function hashes(file: Uint8Array): {
  infoHash?: string;
  infoHashV2?: string;
  version: TorrentVersion;
} {
  const { torrent, infoEncoding } = decodeTorrent(file);
  const { version, hasV1, hasV2 } = detectVersion(torrent.info);
  const result: { infoHash?: string; infoHashV2?: string; version: TorrentVersion } = { version };

  if (hasV1) {
    result.infoHash = sha1(infoEncoding);
  }

  if (hasV2) {
    result.infoHashV2 = sha256(infoEncoding);
  }

  return result;
}

function decodeTorrent(file: Uint8Array): { torrent: any; infoEncoding: Uint8Array } {
  // Hashing a re-encoded object is only equivalent after full canonical
  // validation. Retaining this span is both exact and avoids an extra encode.
  const { value: torrent, infoEncoding } = decodeWithInfoEncoding(file);
  if (!infoEncoding || !torrent || typeof torrent !== 'object' || Array.isArray(torrent)) {
    throw new Error(`Torrent is missing its info dictionary`);
  }

  return { torrent, infoEncoding };
}

export interface TorrentFileData {
  /** Sum of file lengths; excludes implicit BEP 52 alignment gaps. */
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
    /** Byte offset in the protocol piece space, including v2 alignment gaps. */
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
  /** Length of the final logical piece. */
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
      // Unlike v1 concatenation, BEP 52 maps every non-empty file to the next
      // piece boundary. Empty files do not consume or align piece space.
      if (f.length > 0) {
        const remainder = offset % result.pieceLength;
        if (remainder > 0) {
          offset += result.pieceLength - remainder;
        }
      }

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

  // BEP 52 stores raw 32-byte pieces roots as dictionary keys and concatenated
  // 32-byte hashes as values. The public result uses hex for JSON-safe output.
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

  if (torrent['creation date'] !== undefined) {
    result.created = new Date(torrent['creation date'] * 1000);
  }

  if (torrent['created by']) {
    result.createdBy = toString(torrent['created by']);
  }

  if (torrent.comment) {
    result.comment = toString(torrent.comment);
  }

  // announce and announce-list will be missing if metadata fetched via ut_metadata
  if (Array.isArray(torrent['announce-list']) && torrent['announce-list'].length > 0) {
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

  // Some clients encode a single web seed as a byte string and some encode an
  // empty byte string. Normalize it without mutating the decoded metainfo.
  const encodedUrlList = torrent['url-list'];
  const urlList =
    encodedUrlList instanceof Uint8Array
      ? encodedUrlList.length > 0
        ? [encodedUrlList]
        : []
      : encodedUrlList || [];
  result.urlList = urlList.map((url: any) => toString(url));
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
  /**
   * BEP 52 piece layers keyed by a lossless one-code-point-per-byte pieces root.
   * These keys are raw binary data, not hexadecimal text.
   */
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

  // Preserve the raw binary dictionary keys required by BEP 52. A normal
  // JavaScript dictionary would encode non-ASCII keys as UTF-8 text instead.
  if (parsed.pieceLayers && Object.keys(parsed.pieceLayers).length > 0) {
    torrent['piece layers'] = markRawDictionaryKeys({ ...parsed.pieceLayers });
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
