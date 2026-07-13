import { expect, it } from 'vitest';

import { decode } from '../../src/bencode/index.js';

it('should only decode bytes inside an ArrayBuffer view', () => {
  const bytes = new TextEncoder().encode('xxi123eyy');
  const view = new DataView(bytes.buffer, 2, 5);

  expect(decode(view)).toBe(123);
});

it('should normalize Uint8Array subclasses to plain Uint8Array values', () => {
  class ByteArraySubclass extends Uint8Array {}

  const payload = new ByteArraySubclass(new TextEncoder().encode('4:test'));
  const decoded = decode(payload);

  expect(decoded).toEqual(new TextEncoder().encode('test'));
  expect(decoded).toBeInstanceOf(Uint8Array);
  expect(decoded?.constructor).toBe(Uint8Array);
});
