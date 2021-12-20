import test from 'ava';

import { decode, encode } from '../../src/bencode/index.js';

test('encode into an existing buffer', t => {
  const input = { string: 'Hello World', integer: 12345 };
  const output = Buffer.from('d7:integeri12345e6:string11:Hello Worlde');
  const target = Buffer.allocUnsafe(output.length);
  encode(input, target);
  t.deepEqual(target, output);
});

test('encode into a buffer with an offset', t => {
  const input = { string: 'Hello World', integer: 12345 };
  const output = Buffer.from('d7:integeri12345e6:string11:Hello Worlde');
  const target = Buffer.allocUnsafe(64 + output.length); // Pad with 64 bytes
  const offset = 48;
  encode(input, target, offset);
  t.deepEqual(target.slice(offset, offset + output.length), output);
});

test('decode from an offset', t => {
  const input = Buffer.from('d7:integeri12345e6:string11:Hello Worlde');
  const output = decode(input, 'utf8');
  t.deepEqual(output, { string: 'Hello World', integer: 12345 });
});
