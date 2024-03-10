import { expect, it } from 'vitest';

import { decode } from '../../src/bencode/index.js';

it('should be able to decode an integer', () => {
  expect(decode('i123e')).toBe(123);
  expect(decode('i-123e')).toBe(-123);
});
// it('should be throw an error when trying to decode a broken integer', () => {
//   expect(() => decode('i12+3e')).toThrow(/not a number/);
//   expect(() => decode('i-1+23e')).toThrow(/not a number/);
// });
// it('should be able to decode a float (as int)', () => {
//   expect(decode('i12.3e')).toBe(12);
//   expect(decode('i-12.3e')).toBe(-12);
// });
// it('should be throw an error when trying to decode a broken float', () => {
//   expect(() => decode('i1+2.3e')).toThrow(/not a number/);
//   expect(() => decode('i-1+2.3e')).toThrow(/not a number/);
// });

it('should be able to decode a dictionary', () => {
  expect(decode('d3:cow3:moo4:spam4:eggse')).toEqual({
    cow: 'moo',
    spam: 'eggs',
  });
  expect(decode('d4:spaml1:a1:bee')).toEqual({ spam: ['a', 'b'] });
  expect(
    decode('d9:publisher3:bob17:publisher-webpage15:www.example.com18:publisher.location4:homee'),
  ).toEqual({
    publisher: 'bob',
    'publisher-webpage': 'www.example.com',
    'publisher.location': 'home',
  });
});

it('should be able to decode a list', () => {
  expect(decode('l4:spam4:eggse')).toEqual(['spam', 'eggs']);
});
it('should return the correct type', () => {
  expect(decode('4:öö')).toBeTruthy();
});

// it('should be able to decode stuff in dicts', () => {
//   const someData = {
//     string: 'Hello World',
//     integer: 12345,
//     dict: {
//       key: 'This is a string within a dictionary',
//     },
//     list: [1, 2, 3, 4, 'string', 5, {}],
//   };
//   const result = encode(someData);
//   const dat: any = decode(result);
//   expect(dat.integer).toBe(12345);
//   expect(dat.string).toEqual('Hello World');
//   expect(dat.dict.key).toEqual('This is a string within a dictionary');
//   expect(dat.list).toEqual([1, 2, 3, 4, 'string', 5, {}]);
// });
