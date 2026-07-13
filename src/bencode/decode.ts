import type { bencodeValue } from './encode.js';
import { markRawDictionaryKeys } from './utils.js';

// Byte constants
const COLON = 0x3a; // ':'
const CHAR_d = 0x64; // 'd'
const CHAR_e = 0x65; // 'e'
const CHAR_i = 0x69; // 'i'
const CHAR_l = 0x6c; // 'l'
const CHAR_0 = 0x30; // '0'
const CHAR_9 = 0x39; // '9'
const CHAR_MINUS = 0x2d; // '-'

const te = new TextEncoder();

class Decoder {
  idx = 0;
  buf: Uint8Array;
  captureInfoEncoding: boolean;
  dictionaryDepth = 0;
  infoEncoding?: Uint8Array;
  lastKeyNeedsRawEncoding = false;

  constructor(buf: Uint8Array, captureInfoEncoding = false) {
    this.buf = buf;
    this.captureInfoEncoding = captureInfoEncoding;
  }

  next(): bencodeValue {
    const byte = this.buf[this.idx];
    if (byte === undefined) {
      throw new Error(`Unexpected end of bencoded data`);
    }

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
        if (byte < CHAR_0 || byte > CHAR_9) {
          throw new Error(`Invalid bencode prefix at byte ${this.idx}`);
        }

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
    const firstByte = this.buf[this.idx];
    if (firstByte === undefined || firstByte < CHAR_0 || firstByte > CHAR_9) {
      throw new Error(`Invalid byte string length at byte ${this.idx}`);
    }

    for (;;) {
      const byte = this.buf[this.idx++];
      if (byte === undefined) {
        throw new Error(`Unexpected end of byte string length`);
      }

      if (byte === COLON) {
        if (n > this.buf.length - this.idx) {
          throw new Error(`Byte string extends beyond the end of the payload`);
        }

        return n;
      }

      if (byte < CHAR_0 || byte > CHAR_9) {
        throw new Error(`Invalid byte string length at byte ${this.idx - 1}`);
      }

      if (firstByte === CHAR_0 && this.buf[this.idx] !== COLON) {
        throw new Error(`Byte string length has a leading zero`);
      }

      n = n * 10 + (byte - CHAR_0);
      if (!Number.isSafeInteger(n)) {
        throw new TypeError(`Byte string length exceeds JavaScript's safe integer range`);
      }
    }
  }

  nextNumber(): number {
    this.idx++; // skip 'i'
    let negative = false;
    if (this.buf[this.idx] === CHAR_MINUS) {
      negative = true;
      this.idx++;
    }

    const firstByte = this.buf[this.idx];
    if (firstByte === undefined || firstByte < CHAR_0 || firstByte > CHAR_9) {
      throw new Error(`Invalid bencoded integer at byte ${this.idx}`);
    }

    let n = 0;
    for (;;) {
      const byte = this.buf[this.idx++];
      if (byte === undefined) {
        throw new Error(`Unexpected end of bencoded integer`);
      }

      if (byte === CHAR_e) {
        if (negative && n === 0) {
          throw new Error(`Negative zero is not valid bencoding`);
        }

        if (!Number.isSafeInteger(n)) {
          throw new TypeError(`Bencoded integer exceeds JavaScript's safe integer range`);
        }

        return negative ? -n : n;
      }

      if (byte < CHAR_0 || byte > CHAR_9) {
        throw new Error(`Invalid bencoded integer at byte ${this.idx - 1}`);
      }

      if (firstByte === CHAR_0 && this.buf[this.idx] !== CHAR_e) {
        throw new Error(`Bencoded integer has a leading zero`);
      }

      n = n * 10 + (byte - CHAR_0);
    }
  }

  nextList(): bencodeValue[] {
    this.idx++; // skip 'l'
    const result = [];
    while (this.buf[this.idx] !== CHAR_e) {
      if (this.idx >= this.buf.length) {
        throw new Error(`Unexpected end of bencoded list`);
      }

      result.push(this.next());
    }

    this.idx++; // skip 'e'
    return result;
  }

  // Bencode keys are arbitrary bytes, not necessarily UTF-8. Store one byte per
  // JS code point so BEP 52's raw SHA-256 piece-layer keys remain lossless.
  // https://www.bittorrent.org/beps/bep_0052.html#bencoding
  nextKeyLatin1(): string {
    const length = this.readLength();
    const start = this.idx;
    this.idx += length;
    let key = '';
    this.lastKeyNeedsRawEncoding = false;
    for (let i = start; i < this.idx; i++) {
      const byte = this.buf[i]!;
      this.lastKeyNeedsRawEncoding ||= byte > 0x7f;
      key += String.fromCharCode(byte);
    }

    return key;
  }

  nextDictionary(): Record<string, bencodeValue> {
    this.idx++; // skip 'd'
    const isRoot = this.dictionaryDepth === 0;
    this.dictionaryDepth++;
    // Bencoded dictionaries are data records, not JavaScript objects. A null
    // prototype makes every byte-string key ordinary data, including
    // `__proto__`, `constructor`, and `toString`.
    const result = Object.create(null) as Record<string, bencodeValue>;
    let previousKey: string | undefined;
    let usesRawKeys = false;
    // Keep the common decoder loop free of info-span bookkeeping. Hashing opts
    // into the slightly heavier root-dictionary path below.
    if (!isRoot || !this.captureInfoEncoding) {
      while (this.buf[this.idx] !== CHAR_e) {
        if (this.idx >= this.buf.length) {
          throw new Error(`Unexpected end of bencoded dictionary`);
        }

        const key = this.nextKeyLatin1();
        usesRawKeys ||= this.lastKeyNeedsRawEncoding;
        this.assertKeyOrder(previousKey, key);
        previousKey = key;
        result[key] = this.next();
      }

      this.idx++; // skip 'e'
      this.dictionaryDepth--;
      return usesRawKeys ? markRawDictionaryKeys(result) : result;
    }

    while (this.buf[this.idx] !== CHAR_e) {
      if (this.idx >= this.buf.length) {
        throw new Error(`Unexpected end of bencoded dictionary`);
      }

      const key = this.nextKeyLatin1();
      usesRawKeys ||= this.lastKeyNeedsRawEncoding;
      this.assertKeyOrder(previousKey, key);
      previousKey = key;
      const valueStart = this.idx;
      result[key] = this.next();
      if (isRoot && key === 'info') {
        this.infoEncoding = this.buf.subarray(valueStart, this.idx);
      }
    }

    this.idx++; // skip 'e'
    this.dictionaryDepth--;
    return usesRawKeys ? markRawDictionaryKeys(result) : result;
  }

  assertKeyOrder(previousKey: string | undefined, key: string): void {
    if (previousKey !== undefined && previousKey >= key) {
      throw new Error(`Bencoded dictionary keys are not in strictly increasing order`);
    }
  }
}

const toUint8Array = (payload: ArrayBufferView | ArrayBuffer | string): Uint8Array => {
  if (typeof payload === 'string') {
    return te.encode(payload);
  }

  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }

  if (ArrayBuffer.isView(payload)) {
    // Always create a plain view so Uint8Array subclass behavior does not leak
    // into decoded byte strings.
    return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  }

  throw new Error(`invalid payload type`);
};

export const decode = (payload: ArrayBufferView | ArrayBuffer | string): bencodeValue => {
  const buf = toUint8Array(payload);
  const decoder = new Decoder(buf);
  const value = decoder.next();
  if (decoder.idx !== buf.length) {
    throw new Error(`Unexpected trailing bencoded data`);
  }

  return value;
};

export const decodeWithInfoEncoding = (
  payload: ArrayBufferView | ArrayBuffer | string,
): { value: bencodeValue; infoEncoding?: Uint8Array } => {
  // The higher-level hash functions need the original info dictionary span.
  // BEP 3 and BEP 52 explicitly define the hash over those encoded bytes.
  const decoder = new Decoder(toUint8Array(payload), true);
  const value = decoder.next();
  if (decoder.idx !== decoder.buf.length) {
    throw new Error(`Unexpected trailing bencoded data`);
  }

  return { value, infoEncoding: decoder.infoEncoding };
};
