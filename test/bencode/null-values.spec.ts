import test from 'ava';

import { decode, encode } from '../../src/bencode/index.js';

test('should return an empty value when encoding either null or undefined', t => {
  t.deepEqual(encode(null as any), Buffer.allocUnsafe(0));
  t.deepEqual(encode(undefined as any), Buffer.allocUnsafe(0));
});

test('should return null when decoding an empty value', t => {
  t.deepEqual(decode(Buffer.allocUnsafe(0)), null);
  t.deepEqual(decode(''), null);
});

test('should omit null values when encoding', t => {
  const data: any[] = [{ empty: null }, { notset: undefined }, null, undefined, 0];
  const result = decode(encode(data));
  const expected = [{}, {}, 0];
  t.deepEqual(result, expected);
});
