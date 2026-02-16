import { stringToUint8Array, uint8ArrayToString } from 'uint8array-extras';

import type { bencodeValue } from './encode.js';

const td = new TextDecoder();

class Decoder {
  idx = 0;
  buf: Uint8Array;

  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  readByte(): string | null {
    if (this.idx >= this.buf.length) {
      return null;
    }

    return String.fromCharCode(this.buf[this.idx++]!);
  }

  readBytes(length: number): Uint8Array {
    if (this.idx + length > this.buf.length) {
      throw new Error(`could not read ${length} bytes, insufficient content`);
    }

    const result = this.buf.slice(this.idx, this.idx + length);
    this.idx += length;
    return result;
  }

  readUntil(char: string): Uint8Array {
    const targetIdx = this.buf.indexOf(char.charCodeAt(0), this.idx);
    if (targetIdx === -1) {
      throw new Error(`could not find terminated char: ${char}`);
    }

    const result = this.buf.slice(this.idx, targetIdx);
    this.idx = targetIdx;
    return result;
  }

  readNumber(): number {
    const buf = this.readUntil(':');
    return Number.parseInt(uint8ArrayToString(buf), 10);
  }

  peekByte(): string {
    if (this.idx >= this.buf.length) {
      return '';
    }

    const result = this.readByte();
    if (result === null) {
      return '';
    }

    this.idx--;
    return result;
  }

  assertByte(expected: string) {
    const b = this.readByte();
    if (b !== expected) {
      throw new Error(`expecte ${expected}, got ${b}`);
    }
  }

  next(): bencodeValue {
    switch (this.peekByte()) {
      case 'd': {
        return this.nextDictionary();
      }

      case 'l': {
        return this.nextList();
      }

      case 'i': {
        return this.nextNumber();
      }

      default: {
        return this.nextBufOrString();
      }
    }
  }

  nextBufOrString(): Uint8Array {
    const length = this.readNumber();
    this.assertByte(':');
    return this.readBytes(length);
  }

  nextString(): string {
    const length = this.readNumber();
    this.assertByte(':');
    return td.decode(this.readBytes(length));
  }

  nextNumber(): number {
    this.assertByte('i');
    const content = td.decode(this.readUntil('e'));
    this.assertByte('e');
    const result = Number(content);

    if (Number.isNaN(result)) {
      throw new TypeError(`not a number: ${content}`);
    }

    return result;
  }

  nextList(): bencodeValue[] {
    this.assertByte('l');
    const result = [];

    while (this.peekByte() !== 'e') {
      result.push(this.next());
    }

    this.assertByte('e');
    return result;
  }

  nextDictionary(): Record<string, bencodeValue> {
    this.assertByte('d');
    const result: Record<string, bencodeValue> = {};

    while (this.peekByte() !== 'e') {
      result[this.nextString()] = this.next();
    }

    this.assertByte('e');

    return result;
  }
}

export const decode = (payload: ArrayBufferView | ArrayBuffer | string): bencodeValue => {
  let buf;
  if (typeof payload === 'string') {
    buf = stringToUint8Array(payload);
  } else if (payload instanceof ArrayBuffer) {
    buf = new Uint8Array(payload);
  } else if ('buffer' in payload) {
    buf = new Uint8Array(payload.buffer);
  } else {
    throw new Error(`invalid payload type`);
  }

  const decoder = new Decoder(buf);
  return decoder.next();
};
