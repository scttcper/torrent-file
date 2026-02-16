export type bencodeValue =
  | string
  | Uint8Array
  | number
  | { [key: string]: bencodeValue }
  | bencodeValue[];

const te = new TextEncoder();
const COLON = 0x3a;
const BYTE_d = new Uint8Array([0x64]);
const BYTE_e = new Uint8Array([0x65]);
const BYTE_l = new Uint8Array([0x6c]);

function concat(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.byteLength;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.byteLength;
  }

  return result;
}

const encodeString = (str: string): Uint8Array => {
  const content = te.encode(str);
  const lengthStr = content.byteLength.toString();
  const result = new Uint8Array(lengthStr.length + 1 + content.byteLength);
  te.encodeInto(lengthStr, result);
  result[lengthStr.length] = COLON;
  result.set(content, lengthStr.length + 1);
  return result;
};

const encodeBuf = (buf: Uint8Array): Uint8Array => {
  const lengthStr = buf.byteLength.toString();
  const result = new Uint8Array(lengthStr.length + 1 + buf.byteLength);
  te.encodeInto(lengthStr, result);
  result[lengthStr.length] = COLON;
  result.set(buf, lengthStr.length + 1);
  return result;
};

const encodeNumber = (num: number): Uint8Array => {
  const int = Math.floor(num);
  if (int !== num) {
    throw new Error(`bencode only support integers, got ${num}`);
  }

  return te.encode(`i${int}e`);
};

// Inverse of Decoder.nextKeyLatin1 — see decode.ts for rationale.
const encodeKeyLatin1 = (key: string): Uint8Array => {
  const lengthStr = key.length.toString();
  const result = new Uint8Array(lengthStr.length + 1 + key.length);
  te.encodeInto(lengthStr, result);
  result[lengthStr.length] = COLON;
  const offset = lengthStr.length + 1;
  for (let i = 0; i < key.length; i++) {
    result[offset + i] = key.charCodeAt(i) & 0xff; // eslint-disable-line no-bitwise
  }

  return result;
};

const encodeDictionary = (obj: Record<string, bencodeValue>): Uint8Array => {
  const keys = Object.keys(obj).sort();
  const parts: Uint8Array[] = new Array(keys.length * 2 + 2); // eslint-disable-line unicorn/no-new-array
  parts[0] = BYTE_d;
  let i = 1;
  for (const key of keys) {
    parts[i++] = encodeKeyLatin1(key);
    parts[i++] = encode(obj[key]!);
  }

  parts[i] = BYTE_e;
  return concat(parts);
};

const encodeArray = (arr: bencodeValue[]): Uint8Array => {
  const parts: Uint8Array[] = new Array(arr.length + 2); // eslint-disable-line unicorn/no-new-array
  parts[0] = BYTE_l;
  for (let i = 0; i < arr.length; i++) {
    parts[i + 1] = encode(arr[i]!);
  }

  parts[arr.length + 1] = BYTE_e;
  return concat(parts);
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
