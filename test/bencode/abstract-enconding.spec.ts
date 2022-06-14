import { expect, it } from 'vitest';

import { decode, encode } from '../../src/bencode/index.js';

it('encode into an existing buffer', () => {
  const input = { string: 'Hello World', integer: 12345 };
  const output = Buffer.from('d7:integeri12345e6:string11:Hello Worlde');
  const target = Buffer.allocUnsafe(output.length);
  encode(input, target);
  expect(target).toEqual(output);
});

it('encode into a buffer with an offset', () => {
  const input = { string: 'Hello World', integer: 12345 };
  const output = Buffer.from('d7:integeri12345e6:string11:Hello Worlde');
  const target = Buffer.allocUnsafe(64 + output.length); // Pad with 64 bytes
  const offset = 48;
  encode(input, target, offset);
  expect(target.slice(offset, offset + output.length)).toEqual(output);
});

it('decode from an offset', () => {
  const input = Buffer.from('d7:integeri12345e6:string11:Hello Worlde');
  const output = decode(input, 'utf8');
  expect(output).toEqual({ string: 'Hello World', integer: 12345 });
});
