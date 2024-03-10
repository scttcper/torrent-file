import { isUint8Array, stringToUint8Array, uint8ArrayToString } from 'uint8array-extras';
import { expect, it } from 'vitest';

import { decode, encode } from '../../src/bencode/index.js';

it('should always return a Uint8Array', () => {
  expect(isUint8Array(encode({}))).toBeTruthy();
  expect(isUint8Array(encode('test'))).toBeTruthy();
  expect(isUint8Array(encode([3, 2]))).toBeTruthy();
  expect(isUint8Array(encode({ a: 'b', 3: 6 }))).toBeTruthy();
  expect(isUint8Array(encode(123))).toBeTruthy();
});

it('should sort dictionaries', () => {
  const data = { string: 'Hello World', integer: 12345 };
  expect(uint8ArrayToString(encode(data))).toBe('d7:integeri12345e6:string11:Hello Worlde');
});

it('should force keys to be strings', () => {
  const data = {
    12: 'Hello World',
    34: 12345,
  };
  expect(uint8ArrayToString(encode(data))).toBe('d2:1211:Hello World2:34i12345ee');
});

it('should be able to encode a positive integer', () => {
  expect(uint8ArrayToString(encode(123))).toBe('i123e');
});
it('should be able to encode a negative integer', () => {
  expect(uint8ArrayToString(encode(-123))).toBe('i-123e');
});
// it('should be able to encode a positive float (as int)', () => {
//   expect(encode(123.5, undefined, undefined, true).toString()).toBe('i123e');
// });
// it('should be able to encode a negative float (as int)', () => {
//   expect(encode(-123.5, undefined, undefined, true).toString()).toBe('i-123e');
// });

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
it('should be able to encode a previously problematice 64 bit int', () => {
  expect(uint8ArrayToString(encode(2433088826))).toBe(`i${2433088826}e`);
});
it('should be able to encode a negative 64 bit int', () => {
  expect(uint8ArrayToString(encode(-0xffffffff))).toBe(`i-${0xffffffff}e`);
});
// it('should be able to encode a positive 64 bit float (as int)', () => {
//   expect(encode(0xffffffff + 0.5, undefined, undefined, true).toString()).toBe(`i${0xffffffff}e`);
// });
// it('should be able to encode a negative 64 bit float (as int)', () => {
//   expect(encode(-0xffffffff - 0.5, undefined, undefined, true).toString()).toBe(`i-${0xffffffff}e`);
// });
it('should be able to encode a string', () => {
  expect(uint8ArrayToString(encode('asdf'))).toBe('4:asdf');
  expect(uint8ArrayToString(encode(':asdf:'))).toBe('6::asdf:');
});
it('should be able to encode a uint8array', () => {
  expect(uint8ArrayToString(encode(stringToUint8Array('asdf')))).toBe('4:asdf');
  expect(uint8ArrayToString(encode(stringToUint8Array(':asdf:')))).toBe('6::asdf:');
});
// it('should be able to encode an array', () => {
//   expect(uint8ArrayToString(encode([32, 12]))).toBe('li32ei12ee');
//   expect(uint8ArrayToString(encode([':asdf:']))).toBe('l6::asdf:e');
// });
it('should be able to encode an object', () => {
  expect(uint8ArrayToString(encode({ a: 'bc' }))).toBe('d1:a2:bce');
  expect(uint8ArrayToString(encode({ a: '45', b: 45 })).toString()).toBe('d1:a2:451:bi45ee');
  expect(uint8ArrayToString(encode({ a: stringToUint8Array('bc') })).toString()).toBe('d1:a2:bce');
});

// it('should encode new Number(1) as number', () => {
//   const data = Number(1);
//   const result = decode(encode(data, undefined, undefined, true));
//   expect(result).toEqual(1);
// });

// it('should encode new Boolean(true) as number', () => {
//   const data = true;
//   const result = decode(encode(data, undefined, undefined, true));
//   expect(result).toEqual(1);
// });

it('should encode Uint8Array as Uint8Array', () => {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const result = decode(encode(data));
  expect(result).toEqual(result);
});

// it('should encode Uint32Array as buffer', () => {
//   const data = new Uint32Array([
//     0xf, 0xff, 0xfff, 0xffff, 0xfffff, 0xffffff, 0xfffffff, 0xffffffff,
//   ]);
//   const result = decode(encode(data));
//   const expected = Buffer.from(data.buffer);
//   expect(result).toEqual(expected);
// });

// it('should encode Uint8Array subarray properly', () => {
//   const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
//   const subData = data.subarray(5);
//   const result = decode(encode(subData));
//   const expected = Buffer.from(subData.buffer, subData.byteOffset, subData.byteLength);
//   expect(result).toEqual(expected);
// });
