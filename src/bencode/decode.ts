const INTEGER_START = 0x69; // 'i'
const STRING_DELIM = 0x3a; // ':'
const DICTIONARY_START = 0x64; // 'd'
const LIST_START = 0x6c; // 'l'
const END_OF_TYPE = 0x65; // 'e'

/**
 * Replaces parseInt(buffer.toString('ascii', start, end)).
 * For strings with less then ~30 charachters, this is actually a lot faster.
 */
function getIntFromBuffer(buffer: Buffer, start: number, end: number): number {
  let sum = 0;
  let sign = 1;

  for (let i = start; i < end; i++) {
    const num = buffer[i];

    if (typeof num === 'undefined') {
      continue;
    }

    if (num < 58 && num >= 48) {
      // eslint-disable-next-line no-mixed-operators
      sum = sum * 10 + (num - 48);
      continue;
    }

    if (i === start && num === 43) {
      // +
      continue;
    }

    if (i === start && num === 45) {
      // -
      sign = -1;
      continue;
    }

    if (num === 46) {
      // .
      // its a float. break here.
      break;
    }

    throw new Error(`not a number: buffer['${i}'] = ${num}`);
  }

  return sum * sign;
}

interface State {
  position: number;
  bytes: number;
  data: any;
  encoding: string | null;
}

/**
 * Decodes bencoded data
 */
export function decode(
  data: Buffer | string | null,
  encoding: string | null = null,
): Record<string, unknown> | any[] | Buffer | string | number | null {
  const state: State = {
    bytes: 0,
    position: 0,
    data: null,
    encoding,
  };

  if (data === null || data.length === 0) {
    return null;
  }

  state.data = Buffer.isBuffer(data) ? data : Buffer.from(data);
  state.bytes = state.data.length;

  return next(state);
}

function next(state: State): any {
  switch (state.data[state.position]) {
    case DICTIONARY_START:
      return dictionary(state);
    case LIST_START:
      return list(state);
    case INTEGER_START:
      return integer(state);
    default:
      return buffer(state);
  }
}

function find(state: State, chr: number): number {
  let i = state.position;
  const c = state.data.length;
  const d = state.data;

  while (i < c) {
    if (d[i] === chr) {
      return i;
    }

    i++;
  }

  throw new Error(
    'Invalid data: Missing delimiter "' +
      String.fromCharCode(chr) +
      '" [0x' +
      chr.toString(16) +
      ']',
  );
}

function dictionary(state: State): any {
  state.position++;

  const dict: any = {};

  while (state.data[state.position] !== END_OF_TYPE) {
    dict[buffer(state)] = next(state);
  }

  state.position++;

  return dict;
}

function list(state: State): any[] {
  state.position++;

  const lst: any[] = [];

  while (state.data[state.position] !== END_OF_TYPE) {
    lst.push(next(state));
  }

  state.position++;

  return lst;
}

function integer(state: State): number {
  const end = find(state, END_OF_TYPE);
  const number = getIntFromBuffer(state.data, state.position + 1, end);

  state.position += end + 1 - state.position;

  return number;
}

function buffer(state: State): any {
  let sep = find(state, STRING_DELIM);
  const length = getIntFromBuffer(state.data, state.position, sep);
  const end = ++sep + length;

  state.position = end;

  return state.encoding
    ? state.data.toString(state.encoding, sep, end)
    : state.data.slice(sep, end);
}
