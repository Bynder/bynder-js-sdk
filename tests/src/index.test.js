import {v4 as uuid} from 'uuid';
import Bynder from '../../src/index.js';
import * as helpers from '../helpers';

const config = {
  baseURL: 'https://portal.getbynder.com/api/',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://test-redirect-uri.com'
};

const bynder = new Bynder({...config, permanentToken: 'test'});
const file = {
  body: Buffer.from('a-file', 'utf-8'),
  filename: 'a.jpg',
  data: {
    brandId: 'Bynder'
  }
};

describe('.oauth2', () => {
  describe('#makeAuthorizationURL', () => {
    const _bynder = new Bynder(config);
    const authorizationUrl = _bynder.makeAuthorizationURL('state example', 'offline');

    it('returns correct authorization URL', () => {
      // Security token is random token so we compare without this
      expect(authorizationUrl).toMatchSnapshot();
    });
  });

  it('returns an Error when makes an API call without token', async () => {
    try {
      const _bynder = new Bynder(config);
      await _bynder.getMediaList();
    } catch (error) {
      expect(error.message).toEqual('No token found');
    }
  });

  it('returns an Error when makes an API call with invalid token', () => {
    const invalidTokenConfig = {
      baseURL: config.baseURL,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      token: { access_token: 2345 }
    };

    expect(() => new Bynder(invalidTokenConfig)).toThrow(/Invalid token format/);
  });

  describe('with permanent token', () => {
    it('does not returns an error', () => {
      expect(bynder.api.permanentToken).toEqual('test');
    });
  });
});

describe('#uploadFile', () => {
  it('throws an error with no brand ID', () => {
    bynder.uploadFile({
      body: file.body,
      filename: file.filename,
      data: {}
    }).catch(error => {
      expect(error).toEqual({
        status: 0,
        message: 'The upload brandId is not valid or it was not specified properly'
      });
    });
  });

  it('throws an error with no filename', () => {
    bynder.uploadFile({
      body: file.body,
      data: file.data
    }).catch(error => {
      expect(error).toEqual({
        status: 0,
        message: 'The upload filename is not valid or it was not specified properly'
      });
    });
  });

  it('throws an error with no body', () => {
    bynder.uploadFile({
      data: file.data,
      filename: file.filename
    }).catch(error => {
      expect(error).toEqual({
        status: 0,
        message: 'The upload body is not valid or it was not specified properly'
      });
    });
  });

  it('throws an error with no body type', () => {
    bynder.uploadFile({
      body: 'A-BODY',
      data: file.data,
      filename: file.filename
    }).catch(error => {
      expect(error).toEqual({
        status: 0,
        message: 'The upload body is not valid or it was not specified properly'
      });
    });
  });

  it('throws an error with no length', () => {
    bynder.uploadFile({
      body: Buffer.from('', 'utf-8'),
      data: file.data,
      filename: file.filename
    }).catch(error => {
      expect(error).toEqual({
        status: 0,
        message: 'The upload length is not valid or it was not specified properly'
      });
    });
  });

  describe('#uploadFileInChunks', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      helpers.mockFunctions(bynder, [{
        name: 'uploadFileInChunks',
        returnedValue: Promise.resolve(1)
      }]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder, [{ name: 'uploadFileInChunks' }]);
    });

    it('calls the method with the expected payload', () => {
      const fileId = uuid();
      bynder.uploadFile(file, fileId);

      expect(bynder.uploadFileInChunks).toHaveBeenNthCalledWith(1, file, fileId, file.body.length);
    });
  });

  describe('#finaliseUpload', () => {
    const chunks = 1;
    const correlationId = uuid();

    beforeEach(() => {
      jest.restoreAllMocks();
      helpers.mockFunctions(bynder, [
        {
          name: 'uploadFileInChunks',
          returnedValue: Promise.resolve(chunks)
        },
        {
          name: 'finaliseUpload',
          returnedValue: Promise.resolve(correlationId)
        }
      ]);
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({
            headers: {
              'X-API-Correlation-Id': correlationId
            }
          })
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder, [{ name: 'uploadFileInChunks' }, { name: 'finaliseUpload' }]);
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('calls the method with the expected payload', async () => {
      const fileId = uuid();
      await bynder.uploadFile(file, fileId);

      expect(bynder.finaliseUpload).toHaveBeenNthCalledWith(1, fileId, file.filename, chunks, file.body.length);
    });
  });
});

describe('#uploadFileInChunks', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    helpers.mockFunctions(bynder.api, [
      {
        name: 'send',
        returnedValue: Promise.resolve()
      }
    ]);
  });

  afterEach(() => {
    helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
  });

  it('calls the FS upload chunk endpoint', async () => {
    const fileId = uuid();
    const expectedChunk = Buffer.from([97, 45, 102, 105, 108, 101]);

    const chunks = await bynder.uploadFileInChunks(file, fileId, file.body.length);
    expect(chunks).toEqual(1);
    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v7/file_cmds/upload/${fileId}/chunk/0`, {
      chunk: expectedChunk
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      helpers.mockFunctions(bynder.api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 400
          })
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api.axios, [{ name: 'request' }]);
    });

    it('throws response error', () => {
      const fileId = uuid();

      bynder.uploadFileInChunks(file, fileId, file.body.length)
        .catch(error => {
          expect(error).toEqual({
            message: 'Chunk 0 not uploaded'
          });
        });
    });
  });
});

describe('#saveAsset', () => {
  describe('with a file Id', () => {
    beforeAll(() => {
      jest.restoreAllMocks();
      helpers.mockFunctions(bynder.api, [{ name: 'send' }]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('calls the save media endpoint', async () => {
      const fileId = uuid();

      await bynder.saveAsset(fileId);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v4/media/${fileId}/save/`);
    });
  });

  describe('with no file Id', () => {
    beforeAll(() => {
      jest.restoreAllMocks();
      helpers.mockFunctions(bynder.api, [{ name: 'send' }]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('calls the save media endpoint', async () => {
      await bynder.saveAsset();
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'v4/media/save/');
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      helpers.mockFunctions(bynder.api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 400,
            statusText: 'There was a problem saving the asset'
          })
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api.axios, [{ name: 'request' }]);
    });

    it('throws response error', () => {
      const fileId = uuid();

      bynder.saveAsset(fileId)
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            statusText: 'There was a problem saving the asset'
          });
        });
    });
  });
});
