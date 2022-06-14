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
it('should be able to decode a float (as int)', () => {
  expect(decode('i12.3e')).toBe(12);
  expect(decode('i-12.3e')).toBe(-12);
});
// it('should be throw an error when trying to decode a broken float', () => {
//   expect(() => decode('i1+2.3e')).toThrow(/not a number/);
//   expect(() => decode('i-1+2.3e')).toThrow(/not a number/);
// });

it('should be able to decode a dictionary', () => {
  expect(decode('d3:cow3:moo4:spam4:eggse')).toEqual({
    cow: Buffer.from('moo'),
    spam: Buffer.from('eggs'),
  });
  expect(decode('d4:spaml1:a1:bee')).toEqual({ spam: [Buffer.from('a'), Buffer.from('b')] });
  expect(
    decode('d9:publisher3:bob17:publisher-webpage15:www.example.com18:publisher.location4:homee'),
  ).toEqual({
    publisher: Buffer.from('bob'),
    'publisher-webpage': Buffer.from('www.example.com'),
    'publisher.location': Buffer.from('home'),
  });
});

it('should be able to decode a list', () => {
  expect(decode('l4:spam4:eggse')).toEqual([Buffer.from('spam'), Buffer.from('eggs')]);
});
it('should return the correct type', () => {
  expect(Buffer.isBuffer(decode('4:öö'))).toBeTruthy();
});
