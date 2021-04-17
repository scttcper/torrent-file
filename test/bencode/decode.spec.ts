import { describe, it, expect } from '@jest/globals';

import { decode, encode } from '../../src/bencode';

describe('bencode decode', () => {
  it('should be able to decode an integer', () => {
    expect(decode('i123e', 'utf8')).toBe(123);
    expect(decode('i-123e', 'utf8')).toBe(-123);
  });
  // it('should throw an error when trying to decode a broken integer', () => {
  //   expect(() => decode('i12+3e', 'utf8')).toThrowError(/not a number/);
  //   expect(() => decode('i-1+23e', 'utf8')).toThrowError(/not a number/);
  // });
  it('should be able to decode a float (as int)', () => {
    expect(decode('i12.3e', 'utf8')).toBe(12);
    expect(decode('i-12.3e', 'utf8')).toBe(-12);
  });
  // it('should throw an error when trying to decode a broken float', () => {
  //   expect(() => decode('i1+2.3e', 'utf8')).toThrowError(/not a number/);
  //   expect(() => decode('i-1+2.3e', 'utf8')).toThrowError(/not a number/);
  // });
  it('should be able to decode a string', () => {
    expect(decode('5:asdfe', 'utf8')).toBe('asdfe');
  });
  it('should be able to decode a dictionary', () => {
    expect(decode('d3:cow3:moo4:spam4:eggse', 'utf8')).toEqual({
      cow: 'moo',
      spam: 'eggs',
    });
    expect(decode('d4:spaml1:a1:bee', 'utf8')).toEqual({ spam: ['a', 'b'] });
    expect(
      decode(
        'd9:publisher3:bob17:publisher-webpage15:www.example.com18:publisher.location4:homee',
        'utf8',
      ),
    ).toEqual({
      publisher: 'bob',
      'publisher-webpage': 'www.example.com',
      'publisher.location': 'home',
    });
  });

  it('should be able to decode a list', () => {
    expect(decode('l4:spam4:eggse', 'utf8')).toEqual(['spam', 'eggs']);
  });
  it('should return the correct type', () => {
    expect(typeof decode('4:öö', 'utf8')).toBe('string');
  });

  it('should be able to decode stuff in dicts (issue #12)', () => {
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
    expect(dat.integer).toBe(12345);
    expect(dat.string).toEqual('Hello World');
    expect(dat.dict.key).toEqual('This is a string within a dictionary');
    expect(dat.list).toEqual([1, 2, 3, 4, 'string', 5, {}]);
  });
});
