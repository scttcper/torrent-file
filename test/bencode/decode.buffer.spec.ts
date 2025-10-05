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
    cow: new Uint8Array([109, 111, 111]), // 'moo'
    spam: new Uint8Array([101, 103, 103, 115]), // 'eggs'
  });
  expect(decode('d4:spaml1:a1:bee')).toEqual({
    spam: [new Uint8Array([97]), new Uint8Array([98])], // ['a', 'b']
  });
  expect(
    decode('d9:publisher3:bob17:publisher-webpage15:www.example.com18:publisher.location4:homee'),
  ).toEqual({
    publisher: new Uint8Array([98, 111, 98]), // 'bob'
    'publisher-webpage': new Uint8Array([
      119, 119, 119, 46, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109,
    ]), // 'www.example.com'
    'publisher.location': new Uint8Array([104, 111, 109, 101]), // 'home'
  });
});

it('should be able to decode a list', () => {
  expect(decode('l4:spam4:eggse')).toEqual([
    new Uint8Array([115, 112, 97, 109]), // 'spam'
    new Uint8Array([101, 103, 103, 115]), // 'eggs'
  ]);
});
