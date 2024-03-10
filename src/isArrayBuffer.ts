const hasArrayBuffer = typeof ArrayBuffer === 'function';

/**
 * Check if the given value is an ArrayBuffer.
 * @param value - The value to check.
 * @returns `true` if the given value is an ArrayBuffer, else `false`.
 * @example
 * isArrayBuffer(new ArrayBuffer())
 * // => true
 * isArrayBuffer([])
 * // => false
 */
export function isArrayBuffer(value: unknown): boolean {
  return (
    hasArrayBuffer &&
    (value instanceof ArrayBuffer || Object.toString.call(value) === '[object ArrayBuffer]')
  );
}
