import { join, sep } from 'node:path';

import { sha1 } from 'crypto-hash';

import { decode, encode } from './bencode/index.js';

/**
 * sha1 of torrent file info. This hash is commenly used by torrent clients as the ID of the torrent.
 */
export async function hash(file: Buffer): Promise<string> {
  const torrent: any = decode(file);
  return sha1(encode(torrent.info));
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
  }>;
  /**
   * number of bytes in each piece
   */
  pieceLength: number;
  lastPieceLength: number;
  pieces: string[];
}

/**
 * data about the files the torrent contains
 */
export function files(file: Buffer): TorrentFileData {
  const torrent: any = decode(file);
  const result: TorrentFileData = {
    files: [],
    length: 0,
    lastPieceLength: 0,
    pieceLength: torrent.info['piece length'],
    pieces: [],
  };

  const files: string[] = torrent.info.files || [torrent.info];
  const name: string = (torrent.info['name.utf-8'] || torrent.info.name).toString();
  result.files = files.map((file: any, i) => {
    const parts: string[] = [name, ...(file['path.utf-8'] || file.path || [])].map(p =>
      p.toString(),
    );
    return {
      path: join(sep, ...parts).slice(1),
      name: parts[parts.length - 1]!,
      length: file.length,
      offset: files.slice(0, i).reduce(sumLength, 0),
    };
  });

  result.length = files.reduce(sumLength, 0);

  const lastFile = result.files[result.files.length - 1];

  result.lastPieceLength =
    (lastFile && (lastFile.offset + lastFile.length) % result.pieceLength) || result.pieceLength;
  result.pieces = splitPieces(torrent.info.pieces);
  return result;
}

function sumLength(sum: number, file: string): number {
  return sum + file.length;
}

function splitPieces(buf: Buffer): string[] {
  const pieces: string[] = [];
  for (let i = 0; i < buf.length; i += 20) {
    pieces.push(buf.slice(i, i + 20).toString('hex'));
  }

  return pieces;
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
}

/**
 * torrent file info
 */
export function info(file: Buffer): TorrentInfo {
  const torrent: any = decode(file);
  const result: TorrentInfo = {
    name: (torrent.info['name.utf-8'] || torrent.info.name).toString(),
    announce: [],
    urlList: [],
  };

  if (torrent.info.private !== undefined) {
    result.private = Boolean(torrent.info.private);
  }

  if (torrent['creation date']) {
    result.created = new Date(torrent['creation date'] * 1000);
  }

  if (torrent['created by']) {
    result.createdBy = torrent['created by'].toString();
  }

  if (Buffer.isBuffer(torrent.comment)) {
    result.comment = torrent.comment.toString();
  }

  // announce and announce-list will be missing if metadata fetched via ut_metadata
  if (
    Array.isArray(torrent['announce-list']) &&
    torrent['announce-list'] &&
    torrent['announce-list'].length > 0
  ) {
    torrent['announce-list'].forEach((urls: any) => {
      urls.forEach((url: any) => {
        result.announce.push(url.toString());
      });
    });
  } else if (torrent.announce) {
    result.announce.push(torrent.announce.toString());
  }

  if (result.announce.length) {
    result.announce = Array.from(new Set(result.announce));
  }

  // web seeds
  if (Buffer.isBuffer(torrent['url-list'])) {
    // some clients set url-list to empty string
    torrent['url-list'] = torrent['url-list'].length > 0 ? [torrent['url-list']] : [];
  }

  result.urlList = (torrent['url-list'] || []).map((url: any) => url.toString());
  if (result.urlList.length) {
    result.urlList = Array.from(new Set(result.urlList));
  }

  return result;
}
