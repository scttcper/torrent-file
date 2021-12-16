/* eslint-disable @typescript-eslint/ban-types */

import { isArrayBuffer } from '../isArrayBuffer.js';

/**
 * Encodes data in bencode.
 */
export function encode(
  data: Buffer | string | any[] | ArrayBuffer | number | boolean | Record<string, unknown> | object,
  buffer?: unknown,
  offset?: number,
  disableFloatConversionWarning = false,
): Buffer {
  const buffers: Buffer[] = [];
  const state: any = {
    bytes: -1,
    disableFloatConversionWarning,
  };

  _encode(state, buffers, data);
  const result = Buffer.concat(buffers);
  state.bytes = result.length;

  if (Buffer.isBuffer(buffer)) {
    result.copy(buffer, offset);
    return buffer;
  }

  return result;
}

function getType(
  value:
    | Buffer
    | string
    | any[]
    | ArrayBuffer
    | number
    | boolean
    | Record<string, unknown>
    | object,
): string {
  if (Buffer.isBuffer(value)) {
    return 'buffer';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (ArrayBuffer.isView(value)) {
    return 'arraybufferview';
  }

  if (value instanceof Number) {
    return 'number';
  }

  if (value instanceof Boolean) {
    return 'boolean';
  }

  if (isArrayBuffer(value)) {
    return 'arraybuffer';
  }

  return typeof value;
}

function _encode(state: any, buffers: Buffer[], data: any): void {
  if (data === null) {
    return;
  }

  switch (getType(data)) {
    case 'buffer':
      buffer(buffers, data);
      break;
    case 'object':
      dict(state, buffers, data);
      break;
    case 'array':
      list(state, buffers, data);
      break;
    case 'string':
      string(buffers, data);
      break;
    case 'number':
      number(state, buffers, data);
      break;
    case 'boolean':
      number(state, buffers, data);
      break;
    case 'arraybufferview':
      buffer(buffers, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
      break;
    case 'arraybuffer':
      buffer(buffers, Buffer.from(data));
      break;
    default:
      break;
  }
}

const buffE = Buffer.from('e');
const buffD = Buffer.from('d');
const buffL = Buffer.from('l');

function buffer(buffers: Buffer[], data: Buffer): void {
  buffers.push(Buffer.from(`${data.length}:`), data);
}

function string(buffers: Buffer[], data: string): void {
  buffers.push(Buffer.from(`${Buffer.byteLength(data)}:${data}`));
}

function number(state: any, buffers: Buffer[], data: number): void {
  const maxLo = 0x80000000;
  const hi = (data / maxLo) << 0;
  const lo = data % maxLo << 0;
  const val = hi * maxLo + lo;

  buffers.push(Buffer.from(`i${val}e`));

  if (val !== data && !state.disableFloatConversionWarning) {
    state.disableFloatConversionWarning = true;
    console.warn(
      `WARNING: Possible data corruption detected with value "${data}":`,
      `Bencoding only defines support for integers, value was converted to "${val}"`,
    );
    console.trace();
  }
}

function dict(state: any, buffers: Buffer[], data: Record<string, unknown>): void {
  buffers.push(buffD);

  // sorted dicts
  const keys = Object.keys(data).sort();
  for (const k of keys) {
    // filter out null / undefined elements
    if (data[k] === null || data[k] === undefined) {
      continue;
    }

    string(buffers, k);
    _encode(state, buffers, data[k]);
  }

  buffers.push(buffE);
}

function list(state: any, buffers: Buffer[], data: any[]): void {
  let i = 0;
  const c = data.length;
  buffers.push(buffL);

  for (; i < c; i++) {
    if (data[i] === null) {
      continue;
    }

    _encode(state, buffers, data[i]);
  }

  buffers.push(buffE);
}
