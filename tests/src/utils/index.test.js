import fs from 'fs';
import * as utils from '../../../src/utils';

describe('#rejectValidation', () => {
  it('returns a rejection for the specified module and param', () => {
    utils.rejectValidation('upload', 'intent')
      .catch(error => {
        expect(error).toEqual({
          status: 0,
          message: 'The upload intent is not valid or it was not specified properly'
        });
      });
  });
});

describe('bodyType#get', () => {
  it('returns a buffer when file is a buffer', () => {
    const body = Buffer.from('a-file', 'utf-8');
    const result = utils.bodyTypes.get(body);

    expect(result).toBe('BUFFER');
  });

  it('returns a stream when the file is a stream', () => {
    const body = fs.createReadStream('./samples/testasset.png');
    const result = utils.bodyTypes.get(body);

    expect(result).toBe('STREAM');
  });

  it('returns null when the body type is not known', () => {
    const body = {};
    const result = utils.bodyTypes.get(body);

    expect(result).toBe(null);
  });
});

describe('#getLength', () => {
  it('returns the body length of buffer files', () => {
    const file = {
      body: Buffer.from('a-file', 'utf-8'),
      filename: 'a.jpg',
      data: {
        brandId: 'Bynder'
      }
    };
    const size = utils.getLength(file);

    expect(size).toBe(6);
  });

  it('returns the file length of unknown file types', () => {
    const file = {
      body: {},
      length: 4,
      filename: 'a.jpg',
      data: {
        brandId: 'Bynder'
      }
    };
    const size = utils.getLength(file);

    expect(size).toBe(4);
  });
});

describe('#create256HexHash', () => {
  it('generates a HMAC-SHA256 Hex string', () => {
    const body = Buffer.from('a-file', 'utf-8');
    const hex = utils.create256HexHash(body);

    expect(hex).toBe('1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d');
  });
});
