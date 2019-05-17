import { encode } from '../../src/bencode/encode';
import { decode } from '../../src/bencode/decode';

describe('bencode#encode()', () => {
  // prevent the warning showing up in the test
  // encode._floatConversionDetected = true;

  it('should always return a Buffer', () => {
    expect(Buffer.isBuffer(encode({}))).toBeTruthy();
    expect(Buffer.isBuffer(encode('test'))).toBeTruthy();
    expect(Buffer.isBuffer(encode([3, 2]))).toBeTruthy();
    expect(Buffer.isBuffer(encode({ a: 'b', 3: 6 }))).toBeTruthy();
    expect(Buffer.isBuffer(encode(123))).toBeTruthy();
  });

  it('should sort dictionaries', () => {
    const data = { string: 'Hello World', integer: 12345 };
    expect(encode(data).toString()).toBe('d7:integeri12345e6:string11:Hello Worlde');
  });

  it('should force keys to be strings', () => {
    const data = {
      12: 'Hello World',
      34: 12345,
    };
    expect(encode(data).toString()).toBe('d2:1211:Hello World2:34i12345ee');
  });

  it('should be able to encode a positive integer', () => {
    expect(encode(123).toString()).toBe('i123e');
  });
  it('should be able to encode a negative integer', () => {
    expect(encode(-123).toString()).toBe('i-123e');
  });
  it('should be able to encode a positive float (as int)', () => {
    expect(encode(123.5, undefined, undefined, true).toString()).toBe('i123e');
  });
  it('should be able to encode a negative float (as int)', () => {
    expect(encode(-123.5, undefined, undefined, true).toString()).toBe('i-123e');
  });

  it('should be able to safely encode numbers between -/+ 2 ^ 53 (as ints)', () => {
    const JAVASCRIPT_INT_BITS = 53;

    expect(encode(0).toString()).toBe('i' + 0 + 'e');

    for (let exp = 1; exp < JAVASCRIPT_INT_BITS; ++exp) {
      const val = Math.pow(2, exp);
      // try the positive and negative
      expect(encode(val).toString()).toBe('i' + val + 'e');
      expect(encode(-val).toString()).toBe('i-' + val + 'e');

      // try the value, one above and one below, both positive and negative
      const above = val + 1;
      const below = val - 1;

      expect(encode(above).toString()).toBe('i' + above + 'e');
      expect(encode(-above).toString()).toBe('i-' + above + 'e');

      expect(encode(below).toString()).toBe('i' + below + 'e');
      expect(encode(-below).toString()).toBe('i-' + below + 'e');
    }

    expect(encode(Number.MAX_SAFE_INTEGER).toString()).toBe('i' + Number.MAX_SAFE_INTEGER + 'e');
    expect(encode(-Number.MAX_SAFE_INTEGER).toString()).toBe('i-' + Number.MAX_SAFE_INTEGER + 'e');
  });
  it('should be able to encode a previously problematice 64 bit int', () => {
    expect(encode(2433088826).toString()).toBe('i' + 2433088826 + 'e');
  });
  it('should be able to encode a negative 64 bit int', () => {
    expect(encode(-0xffffffff).toString()).toBe('i-' + 0xffffffff + 'e');
  });
  it('should be able to encode a positive 64 bit float (as int)', () => {
    expect(encode(0xffffffff + 0.5, undefined, undefined, true).toString()).toBe('i' + 0xffffffff + 'e');
  });
  it('should be able to encode a negative 64 bit float (as int)', () => {
    expect(encode(-0xffffffff - 0.5, undefined, undefined, true).toString()).toBe('i-' + 0xffffffff + 'e');
  });
  it('should be able to encode a string', () => {
    expect(encode('asdf').toString()).toBe('4:asdf');
    expect(encode(':asdf:').toString()).toBe('6::asdf:');
  });
  it('should be able to encode a buffer', () => {
    expect(encode(Buffer.from('asdf')).toString()).toBe('4:asdf');
    expect(encode(Buffer.from(':asdf:')).toString()).toBe('6::asdf:');
  });
  it('should be able to encode an array', () => {
    expect(encode([32, 12]).toString()).toBe('li32ei12ee');
    expect(encode([':asdf:']).toString()).toBe('l6::asdf:e');
  });
  it('should be able to encode an object', () => {
    expect(encode({ a: 'bc' }).toString()).toBe('d1:a2:bce');
    expect(encode({ a: '45', b: 45 }).toString()).toBe('d1:a2:451:bi45ee');
    expect(encode({ a: Buffer.from('bc') }).toString()).toBe('d1:a2:bce');
  });

  it('should encode new Number(1) as number', () => {
    // eslint-disable-next-line no-new-wrappers
    const data = new Number(1);
    const result = decode(encode(data, undefined, undefined, true));
    const expected = 1;
    expect(result).toEqual(expected);
  });

  it('should encode new Boolean(true) as number', () => {
    // eslint-disable-next-line no-new-wrappers
    const data = new Boolean(true);
    const result = decode(encode(data, undefined, undefined, true));
    const expected = 1;
    expect(result).toEqual(expected);
  });

  it('should encode Uint8Array as buffer', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const result = decode(encode(data));
    const expected = Buffer.from(data.buffer);
    expect(result).toEqual(expected);
  });

  it('should encode Uint32Array as buffer', () => {
    const data = new Uint32Array([0xF, 0xFF, 0xFFF, 0xFFFF, 0xFFFFF, 0xFFFFFF, 0xFFFFFFF, 0xFFFFFFFF]);
    const result = decode(encode(data));
    const expected = Buffer.from(data.buffer);
    expect(result).toEqual(expected);
  });

  it('should encode ArrayBuffer as buffer', () => {
    const data = new Uint32Array([0xF, 0xFF, 0xFFF, 0xFFFF, 0xFFFFF, 0xFFFFFF, 0xFFFFFFF, 0xFFFFFFFF]);
    const result = decode(encode(data.buffer));
    const expected = Buffer.from(data.buffer);
    expect(result).toEqual(expected);
  });

  it('should encode Float32Array as buffer', () => {
    const data = new Float32Array([1.2, 2.3, 3.4, 4.5, 5.6, 6.7, 7.8, 8.9, 9.0]);
    const result = decode(encode(data));
    const expected = Buffer.from(data.buffer);
    expect(result).toEqual(expected);
  });

  it('should encode DataView as buffer', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const view = new DataView(data.buffer);
    const result = decode(encode(view));
    const expected = Buffer.from(data.buffer);
    expect(result).toEqual(expected);
  });

  it('should encode Uint8Array subarray properly', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const subData = data.subarray(5);
    const result = decode(encode(subData));
    const expected = Buffer.from(subData.buffer, subData.byteOffset, subData.byteLength);
    expect(result).toEqual(expected);
  });
});
