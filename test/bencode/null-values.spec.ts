import { expect, it } from 'vitest';

import { decode, encode } from '../../src/bencode/index.js';

it('should return an empty value when encoding either null or undefined', () => {
  expect(encode(null as any)).toEqual(Buffer.allocUnsafe(0));
  expect(encode(undefined as any)).toEqual(Buffer.allocUnsafe(0));
});

it('should return null when decoding an empty value', () => {
  expect(decode(Buffer.allocUnsafe(0))).toEqual(null);
  expect(decode('')).toEqual(null);
});

it('should omit null values when encoding', () => {
  const data: any[] = [{ empty: null }, { notset: undefined }, null, undefined, 0];
  const result = decode(encode(data));
  const expected = [{}, {}, 0];
  expect(result).toEqual(expected);
});
