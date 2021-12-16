import test from 'ava';

import { decode } from '../../src/bencode/index.js';

test('should be able to decode an integer', t => {
  t.is(decode('i123e'), 123);
  t.is(decode('i-123e'), -123);
});
// test('should be throw an error when trying to decode a broken integer', () => {
//   expect(() => decode('i12+3e')).toThrow(/not a number/);
//   expect(() => decode('i-1+23e')).toThrow(/not a number/);
// });
test('should be able to decode a float (as int)', t => {
  t.is(decode('i12.3e'), 12);
  t.is(decode('i-12.3e'), -12);
});
// test('should be throw an error when trying to decode a broken float', () => {
//   expect(() => decode('i1+2.3e')).toThrow(/not a number/);
//   expect(() => decode('i-1+2.3e')).toThrow(/not a number/);
// });

test('should be able to decode a dictionary', t => {
  t.deepEqual(decode('d3:cow3:moo4:spam4:eggse'), {
    cow: Buffer.from('moo'),
    spam: Buffer.from('eggs'),
  });
  t.deepEqual(decode('d4:spaml1:a1:bee'), { spam: [Buffer.from('a'), Buffer.from('b')] });
  t.deepEqual(
    decode('d9:publisher3:bob17:publisher-webpage15:www.example.com18:publisher.location4:homee'),
    {
      publisher: Buffer.from('bob'),
      'publisher-webpage': Buffer.from('www.example.com'),
      'publisher.location': Buffer.from('home'),
    },
  );
});

test('should be able to decode a list', t => {
  t.deepEqual(decode('l4:spam4:eggse'), [Buffer.from('spam'), Buffer.from('eggs')]);
});
test('should return the correct type', t => {
  t.truthy(Buffer.isBuffer(decode('4:öö')));
});
