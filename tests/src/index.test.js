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

  describe('with no errors', () => {
    const fileId = 'night-gathers-and-now-my-watch-begins';
    const correlationId = 'it-shall-not-end-until-my-death';

    beforeEach(() => {
      helpers.mockFunctions(bynder, [
        {
          name: 'prepareUpload',
          returnedValue: Promise.resolve(fileId)
        },
        {
          name: 'uploadFileInChunks',
          returnedValue: Promise.resolve(1)
        },
        {
          name: 'finaliseUpload',
          returnedValue: Promise.resolve(correlationId)
        },
        {
          name: 'saveAsset',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder, [
        { name: 'prepareUpload' },
        { name: 'uploadFileInChunks' },
        { name: 'finaliseUpload' },
        { name: 'saveAsset' }
      ]);
    });

    it('calls each upload method with the expected payload', async () => {
      await bynder.uploadFile(file);

      expect(bynder.prepareUpload).toHaveBeenCalledTimes(1);
      expect(bynder.uploadFileInChunks).toHaveBeenNthCalledWith(1, file, fileId, file.body.length);
      expect(bynder.finaliseUpload).toHaveBeenNthCalledWith(1, fileId, file.filename, 1, file.body.length);
      expect(bynder.saveAsset).toHaveBeenNthCalledWith(1, { ...file.data, fileId });
    });
  });

  describe('with errors', () => {
    const fileId = 'i-shall-take-no-wife-hold-no-lands-father-no-children';

    beforeEach(() => {
      helpers.mockFunctions(bynder, [
        {
          name: 'prepareUpload',
          returnedValue: Promise.resolve(fileId)
        },
        {
          name: 'uploadFileInChunks',
          returnedValue: Promise.resolve(1)
        },
        // The error could be on any module,
        // but we will simulate one on the
        // middle of the workflow.
        {
          name: 'finaliseUpload',
          returnedValue: Promise.reject({
            status: 400,
            message: 'File not processed'
          })
        },
        {
          name: 'saveAsset',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder, [
        { name: 'prepareUpload' },
        { name: 'uploadFileInChunks' },
        { name: 'finaliseUpload' },
        { name: 'saveAsset' }
      ]);
    });

    it('calls each upload method with the expected payload', () => {
      bynder.uploadFile(file)
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            message: 'File not processed'
          });
        });

      expect(bynder.prepareUpload).toHaveBeenCalledTimes(1);
    });
  });
});

describe('#prepareUpload', () => {
  beforeEach(() => {
    helpers.mockFunctions(bynder.api, [
      {
        name: 'send',
        returnedValue: Promise.resolve({
          file_id: 'i-shall-live-and-die-at-my-post'
        })
      }
    ]);
  });

  afterAll(() => {
    helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
  });

  it('calls the FS upload prepare endpoint', async () => {
    const fileId = await bynder.prepareUpload();

    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'v7/file_cmds/upload/prepare');
    expect(fileId).toBeDefined();
  });

  describe('on a request error', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.reject({
            status: 500,
            message: 'There was a problem preparing the upload'
          })
        }
      ]);
    });

    it('throws response error', () => {
      bynder.prepareUpload().catch(error => {
        expect(error).toEqual({
          status: 500,
          message: 'There was a problem preparing the upload'
        });
      });
    });
  });
});

describe('#uploadFileInChunks', () => {
  beforeEach(() => {
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
    const fileId = 'i-am-the-sword-in-the-darkness';
    const expectedChunk = Buffer.from([97, 45, 102, 105, 108, 101]);

    const chunks = await bynder.uploadFileInChunks(file, fileId, file.body.length);
    expect(chunks).toEqual(1);
    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v7/file_cmds/upload/${fileId}/chunk/0`, {
      chunk: expectedChunk
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
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
      const fileId = 'i-am-the-watcher-on-the-walls';

      bynder.uploadFileInChunks(file, fileId, file.body.length)
        .catch(error => {
          expect(error).toEqual({
            message: 'Chunk 0 not uploaded'
          });
        });
    });
  });
});

describe('#finaliseUpload', () => {
  const correlationId = 'i-am-the-shield-that-guards-the-realms-of-men';

  beforeEach(() => {
    helpers.mockFunctions(bynder.api, [
      {
        name: 'send',
        returnedValue: Promise.resolve({
          headers: {
            'x-api-correlation-id': correlationId
          }
        })
      }
    ]);
  });

  afterEach(() => {
    helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
  });

  it('calls the endpoint', async () => {
    const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';

    const correlation = await bynder.finaliseUpload(fileId, file.filename, 1, file.body.length);
    expect(correlation).toBeDefined();
    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v7/file_cmds/upload/${fileId}/finalise`, {
      chunksCount: 1,
      fileName: file.filename,
      fileSize: file.body.length
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 400,
            message: 'Upload not finalized'
          })
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api.axios, [{ name: 'request' }]);
    });

    it('throws response error', () => {
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';

      bynder.finaliseUpload(fileId, file.filename, 1, file.body.length)
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            message: 'Upload not finalized'
          });
        });
    });
  });
});

describe('#saveAsset', () => {
  describe('with a file Id', () => {
    beforeAll(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('calls the save media endpoint', async () => {
      const fileId = 'i-am-the-shield-that-guards-the-realms-of-men';
      const asset = { ...file.data, fileId };

      await bynder.saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v4/media/${fileId}/save/`, asset);
    });
  });

  describe('with no file Id', () => {
    beforeAll(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve()
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('calls the save media endpoint', async () => {
      const asset = { ...file.data };

      await bynder.saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'v4/media/save/', asset);
    });
  });

  describe('with no brand Id', () => {
    it('throws response error', () => {
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';
      const asset = { fileId };

      bynder.saveAsset(asset)
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The upload brandId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
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
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';
      const asset = { ...file.data, fileId };

      bynder.saveAsset(asset)
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            message: 'There was a problem saving the asset'
          });
        });
    });
  });
});

describe('#getBrands', () => {
  describe('on a successful request', () => {
    beforeAll(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve([{}])
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('calls the save media endpoint', async () => {
      await bynder.getBrands();
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'v4/brands/');
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
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
      bynder.getBrands()
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            message: 'There was a problem saving the asset'
          });
        });
    });
  });
});
