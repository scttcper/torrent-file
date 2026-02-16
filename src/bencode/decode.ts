import type { bencodeValue } from './encode.js';

// Byte constants
const COLON = 0x3a; // ':'
const CHAR_d = 0x64; // 'd'
const CHAR_e = 0x65; // 'e'
const CHAR_i = 0x69; // 'i'
const CHAR_l = 0x6c; // 'l'
const CHAR_0 = 0x30; // '0'
const CHAR_MINUS = 0x2d; // '-'

const te = new TextEncoder();

class Decoder {
  idx = 0;
  buf: Uint8Array;

  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  next(): bencodeValue {
    const byte = this.buf[this.idx]!;
    switch (byte) {
      case CHAR_d: {
        return this.nextDictionary();
      }
      case CHAR_l: {
        return this.nextList();
      }
      case CHAR_i: {
        return this.nextNumber();
      }
      default: {
        return this.nextBufOrString();
      }
    }
  }

  nextBufOrString(): Uint8Array {
    const length = this.readLength();
    const result = this.buf.subarray(this.idx, this.idx + length);
    this.idx += length;
    return result;
  }

  // Read a length prefix including the trailing colon: "123:"
  readLength(): number {
    let n = 0;
    for (;;) {
      const byte = this.buf[this.idx++]!;
      if (byte === COLON) {
        return n;
      }
      n = n * 10 + (byte - CHAR_0);
    }
  }

  nextNumber(): number {
    this.idx++; // skip 'i'
    let negative = false;
    if (this.buf[this.idx] === CHAR_MINUS) {
      negative = true;
      this.idx++;
    }

    let n = 0;
    for (;;) {
      const byte = this.buf[this.idx++]!;
      if (byte === CHAR_e) {
        return negative ? -n : n;
      }
      n = n * 10 + (byte - CHAR_0);
    }
  }

  nextList(): bencodeValue[] {
    this.idx++; // skip 'l'
    const result = [];
    while (this.buf[this.idx] !== CHAR_e) {
      result.push(this.next());
    }

    this.idx++; // skip 'e'
    return result;
  }

  // Latin1 (1 byte → 1 code point) is lossless for arbitrary binary keys.
  // BEP-52 piece layers uses raw SHA-256 hashes as dict keys, which
  // would be corrupted by UTF-8 decoding.
  nextKeyLatin1(): string {
    const length = this.readLength();
    const start = this.idx;
    this.idx += length;
    let key = '';
    for (let i = start; i < this.idx; i++) {
      key += String.fromCharCode(this.buf[i]!);
    }

    return key;
  }

  nextDictionary(): Record<string, bencodeValue> {
    this.idx++; // skip 'd'
    const result: Record<string, bencodeValue> = {};
    while (this.buf[this.idx] !== CHAR_e) {
      result[this.nextKeyLatin1()] = this.next();
    }

    this.idx++; // skip 'e'
    return result;
  }
}

export const decode = (payload: ArrayBufferView | ArrayBuffer | string): bencodeValue => {
  let buf: Uint8Array;
  if (typeof payload === 'string') {
    buf = te.encode(payload);
  } else if (payload instanceof ArrayBuffer) {
    buf = new Uint8Array(payload);
  } else if (payload instanceof Uint8Array) {
    buf =
      payload.constructor === Uint8Array
        ? payload
        : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  } else if ('buffer' in payload) {
    buf = new Uint8Array(payload.buffer);
  } else {
    throw new Error(`invalid payload type`);
  }

  const decoder = new Decoder(buf);
  return decoder.next();
};
