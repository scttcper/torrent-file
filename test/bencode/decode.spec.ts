import { expect, it } from 'vitest';

import { decode, encode } from '../../src/bencode/index.js';

it('should be able to decode an integer', () => {
  expect(decode('i123e')).toBe(123);
  expect(decode('i-123e')).toBe(-123);
});

it('should reject invalid integer encodings', () => {
  expect(() => decode('i03e')).toThrow(/leading zero/);
  expect(() => decode('i00e')).toThrow(/leading zero/);
  expect(() => decode('i-0e')).toThrow(/Negative zero/);
  expect(() => decode('i12+3e')).toThrow(/Invalid bencoded integer/);
  expect(() => decode('i9007199254740992e')).toThrow(/safe integer range/);
});

it('should reject invalid or incomplete payloads', () => {
  expect(() => decode('4:abc')).toThrow(/extends beyond/);
  expect(() => decode('li1e')).toThrow(/Unexpected end of bencoded list/);
  expect(() => decode('i1ei2e')).toThrow(/trailing/);
  expect(() => decode('d1:bi1e1:ai2ee')).toThrow(/keys are not in strictly increasing order/);
});

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

it('should treat Object prototype property names as ordinary dictionary keys', () => {
  const encoded = new TextEncoder().encode(
    'd9:__proto__d8:pollutedi1ee11:constructori2e8:toStringi3ee',
  );
  const decoded = decode(encoded) as Record<string, unknown>;
  const protoValue = decoded['__proto__'] as Record<string, unknown>;

  expect(Object.getPrototypeOf(decoded)).toBeNull();
  expect(Object.hasOwn(decoded, '__proto__')).toBe(true);
  expect(Object.hasOwn(decoded, 'constructor')).toBe(true);
  expect(Object.hasOwn(decoded, 'toString')).toBe(true);
  expect(Object.getPrototypeOf(protoValue)).toBeNull();
  expect(protoValue['polluted']).toBe(1);
  expect(decoded.constructor).toBe(2);
  expect(decoded.toString).toBe(3);
  expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  expect(encode(decoded as any)).toEqual(encoded);
});

it('should be able to decode a list', () => {
  expect(decode('l4:spam4:eggse')).toEqual([
    new Uint8Array([115, 112, 97, 109]), // 'spam'
    new Uint8Array([101, 103, 103, 115]), // 'eggs'
  ]);
});
it('should return the correct type', () => {
  expect(decode('4:öö')).toBeTruthy();
});
