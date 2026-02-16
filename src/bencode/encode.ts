import { concatUint8Arrays, stringToUint8Array } from 'uint8array-extras';

export type bencodeValue =
  | string
  | Uint8Array
  | number
  | { [key: string]: bencodeValue }
  | bencodeValue[];

const te = new TextEncoder();

const encodeString = (str: string): Uint8Array => {
  const content = te.encode(str);
  const lengthBytes = te.encode(content.byteLength.toString());

  const result = new Uint8Array(lengthBytes.byteLength + 1 + content.byteLength);
  result.set(lengthBytes);
  result.set(te.encode(':'), lengthBytes.byteLength);
  result.set(content, lengthBytes.byteLength + 1);

  return result;
};

const encodeBuf = (buf: Uint8Array): Uint8Array => {
  const lengthBytes = te.encode(buf.byteLength.toString());

  const result = new Uint8Array(lengthBytes.byteLength + 1 + buf.byteLength);
  result.set(lengthBytes);
  result.set(te.encode(':'), lengthBytes.byteLength);
  result.set(buf, lengthBytes.byteLength + 1);
  return result;
};

const encodeNumber = (num: number): Uint8Array => {
  // NOTE: only support integers
  const int = Math.floor(num);
  if (int !== num) {
    throw new Error(`bencode only support integers, got ${num}`);
  }

  return concatUint8Arrays([
    stringToUint8Array('i'),
    stringToUint8Array(int.toString()),
    stringToUint8Array('e'),
  ]);
};

// Inverse of Decoder.nextKeyLatin1 — see decode.ts for rationale.
const encodeKeyLatin1 = (key: string): Uint8Array => {
  const bytes = new Uint8Array(key.length);
  for (let i = 0; i < key.length; i++) {
    bytes[i] = key.charCodeAt(i) & 0xff; // eslint-disable-line no-bitwise
  }

  const lengthBytes = te.encode(bytes.byteLength.toString());
  const result = new Uint8Array(lengthBytes.byteLength + 1 + bytes.byteLength);
  result.set(lengthBytes);
  result.set(te.encode(':'), lengthBytes.byteLength);
  result.set(bytes, lengthBytes.byteLength + 1);
  return result;
};

const encodeDictionary = (obj: Record<string, bencodeValue>): Uint8Array => {
  const results: Uint8Array[] = [];

  Object.keys(obj)
    .sort()
    .forEach(key => {
      results.push(encodeKeyLatin1(key));
      results.push(new Uint8Array(encode(obj[key]!)));
    });

  const d = stringToUint8Array('d');
  const e = stringToUint8Array('e');
  return concatUint8Arrays([d, ...results, e]);
};

const encodeArray = (arr: bencodeValue[]): Uint8Array => {
  const prefix = te.encode('l');
  const suffix = te.encode('e');
  const encodedElements = arr.map(encode);
  return concatUint8Arrays([prefix, ...encodedElements.flat(), suffix]);
};

export const encode = (data: bencodeValue | bencodeValue[]): Uint8Array => {
  if (Array.isArray(data)) {
    return encodeArray(data);
  }

  switch (typeof data) {
    case 'string': {
      return encodeString(data);
    }

    case 'number': {
      return encodeNumber(data);
    }

    case 'object': {
      if (data instanceof Uint8Array) {
        return encodeBuf(data);
      }

      return encodeDictionary(data);
    }

    default: {
      throw new Error(`unsupport data type: ${typeof data}`);
    }
  }
};
