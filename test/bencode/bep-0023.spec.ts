import path from 'path';
import fs from 'fs';

import { decode } from '../../src/bencode';

// @see http://www.bittorrent.org/beps/bep_0023.html
describe('BEP 0023', () => {
  it('should be able to handle an compacted peer announce', () => {
    const announce = fs.readFileSync(path.join(__dirname, 'announce-compacted-peers.bin'));
    const data = decode(announce);

    expect(data).toEqual({
      complete: 4,
      incomplete: 3,
      interval: 1800,
      'min interval': 1800,
      peers: Buffer.from(
        '2ebd1b641a1f51d54c0546cc342190401a1f626ee9c6c8d5cb0d92131a1fac4e689a3c6b180f3d5746db',
        'hex',
      ),
    });
  });

  it('should be able to handle an compacted peer announce when decoding strings', () => {
    const announce = fs.readFileSync(path.join(__dirname, 'announce-compacted-peers.bin'));
    const data = decode(announce, 'utf8');

    expect(data).toEqual({
      complete: 4,
      incomplete: 3,
      interval: 1800,
      'min interval': 1800,
      peers:
        '.�\u001bd\u001a\u001fQ�L\u0005F�4!�@\u001a\u001fbn�����\r�\u0013\u001a\u001f�Nh�<k\u0018\u000f=WF�',
    });
  });
});
