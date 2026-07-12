import { stringToUint8Array, uint8ArrayToString } from 'uint8array-extras';
import { expect, it } from 'vitest';

import { decode, encode } from '../../src/bencode/index.js';

it('should always return a Uint8Array', () => {
  expect(encode({}).constructor).toBe(Uint8Array);
  expect(encode('test').constructor).toBe(Uint8Array);
  expect(encode([3, 2]).constructor).toBe(Uint8Array);
  expect(encode({ a: 'b', 3: 6 }).constructor).toBe(Uint8Array);
  expect(encode(123).constructor).toBe(Uint8Array);
});

it('should sort dictionaries', () => {
  const data = { string: 'Hello World', integer: 12_345 };
  expect(uint8ArrayToString(encode(data))).toBe('d7:integeri12345e6:string11:Hello Worlde');
});

it('should force keys to be strings', () => {
  const data = {
    12: 'Hello World',
    34: 12_345,
  };
  expect(uint8ArrayToString(encode(data))).toBe('d2:1211:Hello World2:34i12345ee');
});

it('should be able to encode a positive integer', () => {
  expect(uint8ArrayToString(encode(123))).toBe('i123e');
});
it('should be able to encode a negative integer', () => {
  expect(uint8ArrayToString(encode(-123))).toBe('i-123e');
});
it('should reject numbers that bencode cannot represent safely', () => {
  expect(() => encode(1.5)).toThrow(/safe integers/);
  expect(() => encode(Number.NaN)).toThrow(/safe integers/);
  expect(() => encode(Number.POSITIVE_INFINITY)).toThrow(/safe integers/);
  expect(() => encode(Number.MAX_SAFE_INTEGER + 1)).toThrow(/safe integers/);
});

it('should be able to safely encode numbers between -/+ 2 ^ 53 (as ints)', () => {
  const JAVASCRIPT_INT_BITS = 53;

  expect(uint8ArrayToString(encode(0))).toBe(`i${0}e`);

  for (let exp = 1; exp < JAVASCRIPT_INT_BITS; ++exp) {
    const val = 2 ** exp;
    // try the positive and negative
    expect(uint8ArrayToString(encode(val))).toBe(`i${val}e`);
    expect(uint8ArrayToString(encode(-val))).toBe(`i-${val}e`);

    // try the value, one above and one below, both positive and negative
    const above = val + 1;
    const below = val - 1;

    expect(uint8ArrayToString(encode(above))).toBe(`i${above}e`);
    expect(uint8ArrayToString(encode(-above))).toBe(`i-${above}e`);

    expect(uint8ArrayToString(encode(below))).toBe(`i${below}e`);
    expect(uint8ArrayToString(encode(-below))).toBe(`i-${below}e`);
  }

  expect(uint8ArrayToString(encode(Number.MAX_SAFE_INTEGER))).toBe(`i${Number.MAX_SAFE_INTEGER}e`);
  expect(uint8ArrayToString(encode(-Number.MAX_SAFE_INTEGER))).toBe(
    `i-${Number.MAX_SAFE_INTEGER}e`,
  );
});
it('should be able to encode a previously problematic 64 bit int', () => {
  expect(uint8ArrayToString(encode(2_433_088_826))).toBe(`i${2_433_088_826}e`);
});
it('should be able to encode a negative 64 bit int', () => {
  expect(uint8ArrayToString(encode(-0xff_ff_ff_ff))).toBe(`i-${0xff_ff_ff_ff}e`);
});
it('should be able to encode a string', () => {
  expect(uint8ArrayToString(encode('asdf'))).toBe('4:asdf');
  expect(uint8ArrayToString(encode(':asdf:'))).toBe('6::asdf:');
});
it('should be able to encode a uint8array', () => {
  expect(uint8ArrayToString(encode(stringToUint8Array('asdf')))).toBe('4:asdf');
  expect(uint8ArrayToString(encode(stringToUint8Array(':asdf:')))).toBe('6::asdf:');
});
it('should be able to encode an object', () => {
  expect(uint8ArrayToString(encode({ a: 'bc' }))).toBe('d1:a2:bce');
  expect(uint8ArrayToString(encode({ a: '45', b: 45 })).toString()).toBe('d1:a2:451:bi45ee');
  expect(uint8ArrayToString(encode({ a: stringToUint8Array('bc') })).toString()).toBe('d1:a2:bce');
});

it('should encode textual dictionary keys as UTF-8', () => {
  expect(uint8ArrayToString(encode({ café: 1 }))).toBe('d5:caféi1ee');
});

it('should preserve raw dictionary keys when re-encoding decoded data', () => {
  const encoded = encode({ café: 1 });
  expect(encode(decode(encoded))).toEqual(encoded);
});

it('should encode Uint8Array as Uint8Array', () => {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const result = decode(encode(data));
  expect(result).toEqual(data);
  expect(result?.constructor).toBe(Uint8Array);
});
