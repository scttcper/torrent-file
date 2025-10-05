// str1 > str2: 1
// str1 === str2: 0
// str1 < str2: -1
export const cmpRawString = (str1: string, str2: string): number => {
  const te = new TextEncoder();
  const v1 = te.encode(str1);
  const v2 = te.encode(str2);

  for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
    if (v1[i]! < v2[i]!) {
      return -1;
    }

    if (v1[i]! > v2[i]!) {
      return 1;
    }
  }

  if (v1.length === v2.length) {
    return 0;
  }

  return v1.length < v2.length ? -1 : 1;
};
