import test from 'ava';

import { decode, encode } from '../../src/bencode/index.js';

test('should be able to decode an integer', t => {
  t.is(decode('i123e', 'utf8'), 123);
  t.is(decode('i-123e', 'utf8'), -123);
});
// test('should throw an error when trying to decode a broken integer', () => {
//   expect(() => decode('i12+3e', 'utf8')).toThrowError(/not a number/);
//   expect(() => decode('i-1+23e', 'utf8')).toThrowError(/not a number/);
// });
test('should be able to decode a float (as int)', t => {
  t.is(decode('i12.3e', 'utf8'), 12);
  t.is(decode('i-12.3e', 'utf8'), -12);
});
// test('should throw an error when trying to decode a broken float', () => {
//   expect(() => decode('i1+2.3e', 'utf8')).toThrowError(/not a number/);
//   expect(() => decode('i-1+2.3e', 'utf8')).toThrowError(/not a number/);
// });
test('should be able to decode a string', t => {
  t.is(decode('5:asdfe', 'utf8'), 'asdfe');
});
test('should be able to decode a dictionary', t => {
  t.deepEqual(decode('d3:cow3:moo4:spam4:eggse', 'utf8'), {
    cow: 'moo',
    spam: 'eggs',
  });
  t.deepEqual(decode('d4:spaml1:a1:bee', 'utf8'), { spam: ['a', 'b'] });
  t.deepEqual(
    decode(
      'd9:publisher3:bob17:publisher-webpage15:www.example.com18:publisher.location4:homee',
      'utf8',
    ),
    {
      publisher: 'bob',
      'publisher-webpage': 'www.example.com',
      'publisher.location': 'home',
    },
  );
});

test('should be able to decode a list', t => {
  t.deepEqual(decode('l4:spam4:eggse', 'utf8'), ['spam', 'eggs']);
});
test('should return the correct type', t => {
  t.is(typeof decode('4:öö', 'utf8'), 'string');
});

test('should be able to decode stuff in dicts (issue #12)', t => {
  const someData = {
    string: 'Hello World',
    integer: 12345,
    dict: {
      key: 'This is a string within a dictionary',
    },
    list: [1, 2, 3, 4, 'string', 5, {}],
  };
  const result = encode(someData);
  const dat: any = decode(result, 'utf8');
  t.is(dat.integer, 12345);
  t.deepEqual(dat.string, 'Hello World');
  t.deepEqual(dat.dict.key, 'This is a string within a dictionary');
  t.deepEqual(dat.list, [1, 2, 3, 4, 'string', 5, {}]);
});
