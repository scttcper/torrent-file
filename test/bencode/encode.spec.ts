import test from 'ava';

import { decode, encode } from '../../src/bencode/index.js';

// prevent the warning showing up in the test
// encode._floatConversionDetected = true;

test('should always return a Buffer', t => {
  t.truthy(Buffer.isBuffer(encode({})));
  t.truthy(Buffer.isBuffer(encode('test')));
  t.truthy(Buffer.isBuffer(encode([3, 2])));
  t.truthy(Buffer.isBuffer(encode({ a: 'b', 3: 6 })));
  t.truthy(Buffer.isBuffer(encode(123)));
});

test('should sort dictionaries', t => {
  const data = { string: 'Hello World', integer: 12345 };
  t.is(encode(data).toString(), 'd7:integeri12345e6:string11:Hello Worlde');
});

test('should force keys to be strings', t => {
  const data = {
    12: 'Hello World',
    34: 12345,
  };
  t.is(encode(data).toString(), 'd2:1211:Hello World2:34i12345ee');
});

test('should be able to encode a positive integer', t => {
  t.is(encode(123).toString(), 'i123e');
});
test('should be able to encode a negative integer', t => {
  t.is(encode(-123).toString(), 'i-123e');
});
test('should be able to encode a positive float (as int)', t => {
  t.is(encode(123.5, undefined, undefined, true).toString(), 'i123e');
});
test('should be able to encode a negative float (as int)', t => {
  t.is(encode(-123.5, undefined, undefined, true).toString(), 'i-123e');
});

test('should be able to safely encode numbers between -/+ 2 ^ 53 (as ints)', t => {
  const JAVASCRIPT_INT_BITS = 53;

  t.is(encode(0).toString(), `i${0}e`);

  for (let exp = 1; exp < JAVASCRIPT_INT_BITS; ++exp) {
    const val = 2 ** exp;
    // try the positive and negative
    t.is(encode(val).toString(), `i${val}e`);
    t.is(encode(-val).toString(), `i-${val}e`);

    // try the value, one above and one below, both positive and negative
    const above = val + 1;
    const below = val - 1;

    t.is(encode(above).toString(), `i${above}e`);
    t.is(encode(-above).toString(), `i-${above}e`);

    t.is(encode(below).toString(), `i${below}e`);
    t.is(encode(-below).toString(), `i-${below}e`);
  }

  t.is(encode(Number.MAX_SAFE_INTEGER).toString(), `i${Number.MAX_SAFE_INTEGER}e`);
  t.is(encode(-Number.MAX_SAFE_INTEGER).toString(), `i-${Number.MAX_SAFE_INTEGER}e`);
});
test('should be able to encode a previously problematice 64 bit int', t => {
  t.is(encode(2433088826).toString(), `i${2433088826}e`);
});
test('should be able to encode a negative 64 bit int', t => {
  t.is(encode(-0xffffffff).toString(), `i-${0xffffffff}e`);
});
test('should be able to encode a positive 64 bit float (as int)', t => {
  t.is(encode(0xffffffff + 0.5, undefined, undefined, true).toString(), `i${0xffffffff}e`);
});
test('should be able to encode a negative 64 bit float (as int)', t => {
  t.is(encode(-0xffffffff - 0.5, undefined, undefined, true).toString(), `i-${0xffffffff}e`);
});
test('should be able to encode a string', t => {
  t.is(encode('asdf').toString(), '4:asdf');
  t.is(encode(':asdf:').toString(), '6::asdf:');
});
test('should be able to encode a buffer', t => {
  t.is(encode(Buffer.from('asdf')).toString(), '4:asdf');
  t.is(encode(Buffer.from(':asdf:')).toString(), '6::asdf:');
});
test('should be able to encode an array', t => {
  t.is(encode([32, 12]).toString(), 'li32ei12ee');
  t.is(encode([':asdf:']).toString(), 'l6::asdf:e');
});
test('should be able to encode an object', t => {
  t.is(encode({ a: 'bc' }).toString(), 'd1:a2:bce');
  t.is(encode({ a: '45', b: 45 }).toString(), 'd1:a2:451:bi45ee');
  t.is(encode({ a: Buffer.from('bc') }).toString(), 'd1:a2:bce');
});

test('should encode new Number(1) as number', t => {
  const data = Number(1);
  const result = decode(encode(data, undefined, undefined, true));
  t.is(result, 1);
});

test('should encode new Boolean(true) as number', t => {
  const data = true;
  const result = decode(encode(data, undefined, undefined, true));
  t.is(result, 1);
});

test('should encode Uint8Array as buffer', t => {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const result = decode(encode(data));
  const expected = Buffer.from(data.buffer);
  t.deepEqual(result, expected);
});

test('should encode Uint32Array as buffer', t => {
  const data = new Uint32Array([
    0xf, 0xff, 0xfff, 0xffff, 0xfffff, 0xffffff, 0xfffffff, 0xffffffff,
  ]);
  const result = decode(encode(data));
  const expected = Buffer.from(data.buffer);
  t.deepEqual(result, expected);
});

test('should encode ArrayBuffer as buffer', t => {
  const data = new Uint32Array([
    0xf, 0xff, 0xfff, 0xffff, 0xfffff, 0xffffff, 0xfffffff, 0xffffffff,
  ]);
  const result = decode(encode(data.buffer));
  const expected = Buffer.from(data.buffer);
  t.deepEqual(result, expected);
});

test('should encode Float32Array as buffer', t => {
  const data = new Float32Array([1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0]);
  const result = decode(encode(data));
  const expected = Buffer.from(data.buffer);
  t.deepEqual(result, expected);
});

test('should encode DataView as buffer', t => {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const view = new DataView(data.buffer);
  const result = decode(encode(view));
  const expected = Buffer.from(data.buffer);
  t.deepEqual(result, expected);
});

test('should encode Uint8Array subarray properly', t => {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const subData = data.subarray(5);
  const result = decode(encode(subData));
  const expected = Buffer.from(subData.buffer, subData.byteOffset, subData.byteLength);
  t.deepEqual(result, expected);
});
