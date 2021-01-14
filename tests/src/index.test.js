'use strict';

import { createReadStream, readFileSync } from 'fs';
import Bynder from '../../src';
import * as utils from '../../src/utils';
import pkg from '../../package.json';
import * as helpers from '../helpers';
import * as constants from '../../src/constants';

const config = {
  baseURL: 'https://portal.getbynder.com/',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://test-redirect-uri.com'
};

const bynder = new Bynder({...config,
  token: {
    access_token: 'test'
  }
});
const file = {
  body: Buffer.from('a-file', 'utf-8'),
  filename: 'a.jpg',
  data: {
    brandId: 'Bynder'
  }
};

it('throws an exception if a permanent token is used', () => {
  expect(() => {
    new Bynder({
      permanentToken: 'a-token'
    });
  }).toThrow('Permanent tokens are no longer supported. Please use OAuth 2 authorization code or client credentials');
});

describe('.oauth2', () => {
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
});

describe('#makeAuthorizationURL', () => {
  const _bynder = new Bynder(config);
  const authorizationUrl = _bynder.makeAuthorizationURL('state example', 'offline');

  it('returns correct authorization URL', () => {
    // Security token is random token so we compare without this
    expect(authorizationUrl).toMatchSnapshot();
  });
});

describe('#getToken', () => {
  const _bynder = new Bynder(config);

  describe('with authorization code', () => {
    beforeAll(() => {
      helpers.mockFunctions(_bynder.oauth2.authorizationCode, [
        {
          name: 'getToken',
          returnedValue: Promise.resolve({
            access_token: 'i-shall-live-and-die-at-my-post',
            expires_in: 3600,
            scope: 'scope'
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(_bynder.oauth2.authorizationCode, [{ name: 'getToken' }]);
    });

    it('sets the access token', async () => {
      const token = await _bynder.getToken('abc');
      expect(_bynder.api.token).toEqual(token);
      expect(_bynder.oauth2.authorizationCode.getToken).toHaveBeenNthCalledWith(1, {
        code: 'abc',
        redirect_uri: 'https://test-redirect-uri.com'
      });
    });
  });

  describe('with client credentials', () => {
    beforeAll(() => {
      _bynder.redirectUri = undefined;
      helpers.mockFunctions(_bynder.oauth2.clientCredentials, [
        {
          name: 'getToken',
          returnedValue: Promise.resolve({
            access_token: 'i-shall-live-and-die-at-my-post',
            expires_in: 3600,
            scope: 'scope'
          })
        }
      ]);
    });

    afterAll(() => {
      _bynder.redirectUri = config.redirectUri;
      helpers.restoreMockedFunctions(_bynder.oauth2.clientCredentials, [{ name: 'getToken' }]);
    });

    it('calls the client credentials object', async () => {
      const token = await _bynder.getToken(undefined, ['offline', 'read:assets']);
      expect(_bynder.api.token).toEqual(token);
      expect(_bynder.oauth2.clientCredentials.getToken).toHaveBeenNthCalledWith(1, {
        scope: ['offline', 'read:assets']
      });
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
    let spy;

    beforeEach(() => {
      // We mock the API responses
      spy = jest.spyOn(bynder.api, 'send')
        .mockImplementationOnce(() => Promise.resolve({
          file_id: fileId
        }))
        .mockImplementationOnce(() => Promise.resolve({}))
        .mockImplementationOnce(() => Promise.resolve({
          headers: {
            'x-api-correlation-id': correlationId
          }
        }))
        .mockImplementationOnce(() => Promise.resolve({}));
    });

    afterEach(() => {
      spy.mockRestore();
    });

    it('calls each upload method with the expected payload', async () => {
      await bynder.uploadFile(file);

      const [prepareRequest, uploadChunkRequest, finaliseRequest, _saveAssetRequest] = spy.mock.calls;

      expect(prepareRequest).toEqual(['POST', 'v7/file_cmds/upload/prepare']);
      expect(uploadChunkRequest).toEqual(['POST', 'v7/file_cmds/upload/night-gathers-and-now-my-watch-begins/chunk/0', file.body, {
        additionalHeaders: {
          'Content-SHA256': '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d'
        }
      }]);
      expect(finaliseRequest).toEqual(['POST', 'v7/file_cmds/upload/night-gathers-and-now-my-watch-begins/finalise_api', {
        chunksCount: 1,
        fileName: file.filename,
        fileSize: 6,
        sha256: utils.create256HexHash(file.body)
      }, {
        additionalHeaders: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }]);
      expect(_saveAssetRequest).toEqual(['POST', 'api/v4/media/save/night-gathers-and-now-my-watch-begins/', {
        fileId,
        brandId: 'Bynder'
      }]);
    });
  });

  describe('with errors', () => {
    const fileId = 'i-shall-take-no-wife-hold-no-lands-father-no-children';

    beforeEach(() => {
      helpers.mockFunctions(bynder, [
        {
          name: '_prepareUpload',
          returnedValue: Promise.resolve(fileId)
        },
        {
          name: '_uploadFileInChunks',
          returnedValue: Promise.resolve(1)
        },
        // The error could be on any module,
        // but we will simulate one on the
        // middle of the workflow.
        {
          name: '_finaliseUpload',
          returnedValue: Promise.reject({
            status: 400,
            message: 'File not processed'
          })
        },
        {
          name: '_saveAsset',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder, [
        { name: '_prepareUpload' },
        { name: '_uploadFileInChunks' },
        { name: '_finaliseUpload' },
        { name: '_saveAsset' }
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

      expect(bynder._prepareUpload).toHaveBeenCalledTimes(1);
    });
  });
});

describe('#_prepareUpload', () => {
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
    const fileId = await bynder._prepareUpload();

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
      bynder._prepareUpload().catch(error => {
        expect(error).toEqual({
          status: 500,
          message: 'There was a problem preparing the upload'
        });
      });
    });
  });
});

describe('#_uploadFileInChunks', () => {
  describe('with a non-supported body type', () => {
    it('throws a rejection', () => {
      bynder._uploadFileInChunks({}, 'abc', 0, null)
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The uploadFile bodyType is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with a buffer file', () => {
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

    it('calls the FS upload chunk endpoint', async () => {
      const fileId = 'i-am-the-sword-in-the-darkness';
      const expectedChunk = Buffer.from([97, 45, 102, 105, 108, 101]);

      const chunks = await bynder._uploadFileInChunks(file, fileId, file.body.length, 'BUFFER');
      expect(chunks).toEqual(1);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v7/file_cmds/upload/${fileId}/chunk/0`, expectedChunk, {
        additionalHeaders: {
          'Content-SHA256': '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d'
        }
      });
    });
  });

  describe('with a stream file', () => {
    const stream = createReadStream('./samples/testasset.png');

    beforeAll(() => {
      helpers.mockFunctions(bynder, [
        {
          name: '_uploadStreamFile',
          returnedValue: Promise.resolve(1)
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder, [{ name: '_uploadStreamFile' }]);
    });

    it('calls the FS upload chunk endpoint', async () => {
      const fileId = 'i-am-the-sword-in-the-darkness';

      const chunks = await bynder._uploadFileInChunks({ body: stream }, fileId, file.body.length, 'STREAM');
      expect(chunks).toEqual(1);
      expect(bynder._uploadStreamFile).toHaveBeenNthCalledWith(1, stream, fileId);
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder, [
        {
          name: '_uploadChunk',
          returnedValue: Promise.reject({
            message: 'Chunk 0 not uploaded',
            status: 400
          })
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder, [{ name: '_uploadChunk' }]);
    });

    it('throws response error', () => {
      const fileId = 'i-am-the-watcher-on-the-walls';

      bynder._uploadFileInChunks(file, fileId, file.body.length, 'BUFFER')
        .catch(error => {
          expect(error).toEqual({
            message: 'Chunk 0 not uploaded',
            status: 400
          });
        });
    });
  });
});

describe('#_uploadBufferFile', () => {
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

    const chunks = await bynder._uploadBufferFile(file.body, fileId, file.body.length);
    expect(chunks).toEqual(1);
    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v7/file_cmds/upload/${fileId}/chunk/0`, expectedChunk, {
      additionalHeaders: {
        'Content-SHA256': '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d'
      }
    });
  });

  describe('on a request error', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder, [
        {
          name: '_uploadChunk',
          returnedValue: Promise.reject({
            message: 'Chunk 0 not uploaded',
            status: 400
          })
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder, [{ name: '_uploadChunk' }]);
    });

    it('throws response error', () => {
      const fileId = 'i-am-the-watcher-on-the-walls';

      bynder._uploadBufferFile(file.body, fileId, file.body.length)
        .catch(error => {
          expect(error).toEqual({
            message: 'Chunk 0 not uploaded',
            status: 400
          });
        });
    });
  });
});

describe('#_uploadStreamFile', () => {
  describe('with no errors', () => {
    const stream = createReadStream('./samples/testasset.png');

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
      stream.destroy();
    });

    it('calls the FS upload chunk endpoint', async () => {
      const fileId = 'i-am-the-sword-in-the-darknesss';
      const expectedChunk = readFileSync('./samples/testasset.png');

      const chunks = await bynder._uploadStreamFile(stream, fileId);
      expect(chunks).toEqual(1);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v7/file_cmds/upload/${fileId}/chunk/0`, expectedChunk, {
        additionalHeaders: {
          'Content-SHA256': 'ece6c2b6d1fc140c52ec6427646252f8cb55d64af73d6766af7df2debd7cd9e8'
        }
      });
    });
  });

  describe('on a request error', () => {
    const stream = createReadStream('./samples/bynder.jpg');

    beforeAll(() => {
      helpers.clearMockedFunctions();
      helpers.mockFunctions(bynder, [
        {
          name: '_uploadChunk',
          returnedValue: Promise.reject({
            message: 'Chunk 0 not uploaded',
            status: 400
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder, [{ name: '_uploadChunk' }]);
    });

    it('throws response error', async () => {
      const fileId = 'i-am-the-watcher-on-the-walls';

      try {
        await bynder._uploadStreamFile(stream, fileId);
      } catch (error) {
        expect(error).toEqual({
          message: 'Chunk 0 not uploaded',
          status: 400
        });
      }
    });
  });
});

describe('#_uploadChunk', () => {
  describe('the request', () => {
    beforeAll(() => {
      helpers.mockFunctions(bynder.api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 200
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder.api.axios, [{ name: 'request' }]);
    });

    it('sends the expected body', async () => {
      const sha256 = '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d';
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';
      const chunk = Buffer.from([97, 45, 102, 105, 108, 101]);
      const chunkNumber = 0;

      await bynder._uploadChunk(chunk, chunkNumber, fileId, sha256);
      expect(bynder.api.axios.request).toHaveBeenNthCalledWith(1, {
        data: chunk,
        headers: {
          Authorization: 'Bearer test',
          'Content-SHA256': sha256,
          'User-Agent': `bynder-js-sdk/${pkg.version}`
        },
        httpAgent: undefined,
        httpsAgent: undefined,
        method: 'POST',
        params: null,
        url: `v7/file_cmds/upload/${fileId}/chunk/${chunkNumber}`
      });
    });
  });

  describe('on an error', () => {
    let spy;

    beforeEach(() => {
      spy = jest.spyOn(bynder.api, 'send')
        .mockImplementationOnce(() => Promise.reject(400))
        .mockImplementationOnce(() => Promise.reject(400))
        .mockImplementationOnce(() => Promise.reject(400))
        .mockImplementationOnce(() => Promise.reject(400));
    });

    afterEach(() => {
      spy.mockRestore();
    });

    it('reattemps to upload the failed chunk 4 times', () => {
      const sha256 = '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d';
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';
      const chunk = Buffer.from([97, 45, 102, 105, 108, 101]);
      const chunkNumber = 0;

      bynder._uploadChunk(chunk, chunkNumber, fileId, sha256)
        .catch(error => {
          expect(error.status).toBe(400);
          const { calls } = spy.mock.calls;

          for (let call of calls) {
            expect(call).toHaveBeenNthCalledWith(1, 'POST', `v7/file_cmds/upload/${fileId}/chunk/${chunkNumber}`, chunk, {
              additionalHeaders: {
                'Content-SHA256': sha256
              }
            });
          }
        });
    });
  });
});

describe('#_finaliseUpload', () => {
  describe('with no error', () => {
    const correlationId = 'i-am-the-shield-that-guards-the-realms-of-men';

    beforeAll(() => {
      bynder._sha256 = '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d';
      helpers.mockFunctions(bynder.api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 200,
            headers: {
              'x-api-correlation-id': correlationId
            }
          })
        }
      ]);
    });

    afterAll(() => {
      bynder._sha256 = undefined;
      helpers.restoreMockedFunctions(bynder.api.axios, [{ name: 'request' }]);
    });

    it('calls the endpoint', async () => {
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';

      const correlation = await bynder._finaliseUpload(fileId, file.filename, 1, file.body.length);
      expect(correlation).toBeDefined();
      expect(bynder.api.axios.request).toHaveBeenNthCalledWith(1, {
        data: 'chunksCount=1&fileName=a.jpg&fileSize=6&sha256=1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d',
        headers: {
          Authorization: 'Bearer test',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `bynder-js-sdk/${pkg.version}`
        },
        httpAgent: undefined,
        httpsAgent: undefined,
        method: 'POST',
        params: null,
        url: `v7/file_cmds/upload/${fileId}/finalise_api`
      });
    });
  });

  describe('on a request error', () => {
    beforeAll(() => {
      helpers.mockFunctions(bynder.api.axios, [
        {
          name: 'request',
          returnedValue: Promise.reject({
            status: 400,
            message: 'Upload not finalized'
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(bynder.api.axios, [{ name: 'request' }]);
    });

    it('throws response error', () => {
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';

      bynder._finaliseUpload(fileId, file.filename, 1, file.body.length)
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'Upload not finalized'
          });
        });
    });
  });
});

describe('#_saveAsset', () => {
  describe('with a media Id', () => {
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
      const mediaId = 'i-am-the-shield-that-guards-the-realms-of-men';
      const asset = { ...file.data, mediaId };

      await bynder._saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `api/v4/media/${mediaId}/save/`, asset);
    });
  });

  describe('with no media Id', () => {
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

      await bynder._saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/media/save/', asset);
    });
  });

  describe('with a file ID', () => {
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

    it('calls the save media endpoint with a media ID', async () => {
      const asset = {
        ...file.data,
        fileId: 'i-am-the-shield-that-guards-the-realms-of-men'
      };

      await bynder._saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/media/save/i-am-the-shield-that-guards-the-realms-of-men/', asset);
    });
  });

  describe('with a file ID and media ID', () => {
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

    it('calls the save media endpoint with a media ID', async () => {
      const asset = {
        ...file.data,
        fileId: 'i-am-the-shield-that-guards-the-realms-of-men',
        mediaId: 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come'
      };

      await bynder._saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/media/i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come/save/i-am-the-shield-that-guards-the-realms-of-men/', asset);
    });
  });

  describe('with no brand Id', () => {
    it('throws response error', () => {
      const fileId = 'i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come';
      const asset = { fileId };

      bynder._saveAsset(asset)
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

      bynder._saveAsset(asset)
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
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/brands/');
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

describe('#userLogin', () => {
  describe('when username is missing', () => {
    it('returns an exception', () => {
      const payload = {
        password: 'abc',
        consumerId: 'imjonsnow'
      };

      bynder.userLogin(payload)
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The authentication username, password or consumerId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('when password is missing', () => {
    it('returns an exception', () => {
      const payload = {
        username: 'imjonsnow',
        consumerId: 'imjonsnow'
      };

      bynder.userLogin(payload)
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The authentication username, password or consumerId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('when consumerId is missing', () => {
    it('returns an exception', () => {
      const payload = {
        password: 'abc',
        username: 'imjonsnow'
      };

      bynder.userLogin(payload)
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The authentication username, password or consumerId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with all required params', () => {
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

    it('makes a request to the endpoint', async () => {
      const payload = {
        password: 'abc',
        username: 'imjonsnow',
        consumerId: 'imjonsnow'
      };

      await bynder.userLogin(payload);

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/users/login/', payload);
    });
  });
});

describe('#getMediaList', () => {
  beforeEach(() => {
    helpers.mockFunctions(bynder.api, [
      {
        name: 'send',
        returnedValue: Promise.resolve({})
      }
    ]);
  });

  afterEach(() => {
    helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
  });

  describe('with no property option IDs', () => {
    it('sends the expected payload', async () => {
      await bynder.getMediaList();

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/media/', {
        count: false
      });
    });
  });

  describe('with property option IDs', () => {
    it('sends the expected payload', async () => {
      const payload = {
        propertyOptionId: ['a', 'b', 'c']
      };
      await bynder.getMediaList(payload);

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/media/', {
        count: false,
        propertyOptionId: 'a,b,c'
      });
    });
  });
});

describe('#getMediaInfo', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.getMediaInfo({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The media id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.getMediaInfo({
        id: 'abc',
        count: 1
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/media/abc/', {
        count: 1
      });
    });
  });
});

describe('#getAllMediaItems', () => {
  describe('by default', () => {
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

    it('sends the expected payload', async () => {
      await bynder.getAllMediaItems();

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/media/', {
        count: false,
        limit: 50,
        page: 1
      });
    });
  });

  describe('with more than one page', () => {
    let spy;

    beforeAll(() => {
      spy = jest.spyOn(bynder, 'getMediaList')
        .mockImplementationOnce(() => Promise.resolve(Array(constants.DEFAULT_ASSETS_NUMBER_PER_PAGE).fill({
          name: 'an-asset'
        })))
        .mockImplementationOnce(() => Promise.resolve([]));
    });

    afterAll(() => {
      spy.mockRestore();
    });

    it('calls the #getMediaList method multiple times', async () => {
      await bynder.getAllMediaItems();
      const {calls} = spy.mock;
      const [firstCall, secondCall] = calls;

      expect(calls.length).toBe(2);
      expect(firstCall).toEqual([{
        limit: 50,
        page: 2
      }]);
      expect(secondCall).toEqual([{
        limit: 50,
        page: 2
      }]);
    });
  });
});

describe('#getMediaTotal', () => {
  beforeEach(() => {
    helpers.mockFunctions(bynder.api, [
      {
        name: 'send',
        returnedValue: Promise.resolve({
          count: {
            total: 25
          }
        })
      }
    ]);
  });

  afterEach(() => {
    helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
  });

  describe('with no property option IDs', () => {
    it('returns the total count', async () => {
      const total = await bynder.getMediaTotal();

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/media/', {
        count: true
      });
      expect(total).toBe(25);
    });
  });

  describe('with property option IDs', () => {
    it('returns the total count', async () => {
      const payload = {
        propertyOptionId: ['a', 'b', 'c']
      };
      const total = await bynder.getMediaTotal(payload);

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/media/', {
        count: true,
        propertyOptionId: 'a,b,c'
      });
      expect(total).toBe(25);
    });
  });
});

describe('#editMedia', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.editMedia({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The editMedia id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.editMedia({
        id: 'abc'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/media/', {
        id: 'abc'
      });
    });
  });
});

describe('#deleteMedia', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteMedia({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The deleteMedia id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.deleteMedia({
        id: 'abc'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'DELETE', 'api/v4/media/abc/');
    });
  });
});

describe('#getMetaproperties', () => {
  const payload = {
    Colours: {
      isMultiselect: 0,
      isMultifilter: 0,
      isRequired: 0,
      isMainfilter: 1,
      isFilterable: 1,
      isApiField: 1,
      isDisplayField: 0,
      isDrilldown: 0,
      isSearchable: 1,
      isEditable: 1,
      name: 'colours',
      label: 'Colours',
      zindex: 16,
      id: '00000000-0000-0000-0000000000000000',
      type: 'sidebar',
      showInListView: 1,
      showInGridView: 0,
      showInDuplicateView: 1,
      useDependencies: 0
    },
    Bob_button: {
      isMultiselect: 0,
      isMultifilter: 0,
      isRequired: 0,
      isMainfilter: 1,
      isFilterable: 1,
      isApiField: 1,
      isDisplayField: 0,
      isDrilldown: 0,
      isSearchable: 1,
      isEditable: 1,
      name: 'Bob_button',
      label: 'Bob_button',
      zindex: 2,
      id: '00000000-0000-0000-0000000000000001',
      type: 'button',
      showInListView: 1,
      showInGridView: 0,
      showInDuplicateView: 1,
      useDependencies: 0,
      options: []
    }
  };

  beforeAll(() => {
    helpers.mockFunctions(bynder.api, [
      {
        name: 'send',
        returnedValue: Promise.resolve(payload)
      }
    ]);
  });

  afterAll(() => {
    helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
  });

  it('returns an array of metaproperties', async () => {
    const metaproperties = await bynder.getMetaproperties();

    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/metaproperties/', {});
    expect(metaproperties).toEqual([
      {
        isMultiselect: 0,
        isMultifilter: 0,
        isRequired: 0,
        isMainfilter: 1,
        isFilterable: 1,
        isApiField: 1,
        isDisplayField: 0,
        isDrilldown: 0,
        isSearchable: 1,
        isEditable: 1,
        name: 'colours',
        label: 'Colours',
        zindex: 16,
        id: '00000000-0000-0000-0000000000000000',
        type: 'sidebar',
        showInListView: 1,
        showInGridView: 0,
        showInDuplicateView: 1,
        useDependencies: 0
      },
      {
        isMultiselect: 0,
        isMultifilter: 0,
        isRequired: 0,
        isMainfilter: 1,
        isFilterable: 1,
        isApiField: 1,
        isDisplayField: 0,
        isDrilldown: 0,
        isSearchable: 1,
        isEditable: 1,
        name: 'Bob_button',
        label: 'Bob_button',
        zindex: 2,
        id: '00000000-0000-0000-0000000000000001',
        type: 'button',
        showInListView: 1,
        showInGridView: 0,
        showInDuplicateView: 1,
        useDependencies: 0,
        options: []
      }
    ]);
  });
});

describe('#getMetaproperty', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.getMetaproperty({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.getMetaproperty({
        id: 'abc'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/metaproperties/abc/');
    });
  });
});

describe('#getMetapropertyOptions', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.getMetapropertyOptions({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metapropertyOption id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve([])
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.getMetapropertyOptions({
        id: 'abc',
        param1: 'param1'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/metaproperties/abc/options/', {
        param1: 'param1'
      });
    });
  });
});

describe('#getMediaDownloadUrl', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.getMediaDownloadUrl({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The media id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve([])
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.getMediaDownloadUrl({
        id: 'abc',
        param1: 'param1'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/media/abc/download', {
        param1: 'param1'
      });
    });
  });
});

describe('#getAssetUsage', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.getAssetUsage({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The asset usage id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.getAssetUsage({
        id: 'abc'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/media/usage/', { asset_id: 'abc' });
    });
  });
});

describe('#saveNewAssetUsage', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.saveNewAssetUsage({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The asset usage id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no integration_id param', () => {
    it('returns a rejection with an error message', () => {
      bynder.saveNewAssetUsage({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The asset usage integration_id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID and integration_id params', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      const payload = {
        id: 'abc',
        integration_id: 'nightwatch',
        timestamp: '2020-12-04T15:08:44.881Z',
        uri: '/hippo/first_post',
        additional: 'some-thing'
      };

      bynder.saveNewAssetUsage(payload)
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/media/usage/', {
        asset_id: 'abc',
        integration_id: 'nightwatch',
        timestamp: '2020-12-04T15:08:44.881Z',
        uri: '/hippo/first_post',
        additional: 'some-thing'
      });
    });
  });
});

describe('#deleteAssetUsage', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteAssetUsage({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The asset usage id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no integration_id param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteAssetUsage({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The asset usage integration_id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID and integration_id params', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      const payload = {
        id: 'abc',
        integration_id: 'nightwatch',
        uri: '/hippo/first_post'
      };

      bynder.deleteAssetUsage(payload)
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'DELETE', 'api/media/usage/', {
        asset_id: 'abc',
        integration_id: 'nightwatch',
        uri: '/hippo/first_post'
      });
    });
  });
});

describe('#saveNewMetaproperty', () => {
  beforeEach(() => {
    helpers.mockFunctions(bynder.api, [
      {
        name: 'send',
        returnedValue: Promise.resolve({})
      }
    ]);
  });

  afterEach(() => {
    helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
  });

  it('calls the endpoint with the expected payload', () => {
    bynder.saveNewMetaproperty({
      param1: 'param1',
      param2: 'param2',
      param3: 'param3'
    });

    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/metaproperties/', {
      data: JSON.stringify({
        param1: 'param1',
        param2: 'param2',
        param3: 'param3'
      })
    });
  });
});

describe('#editMetaproperty', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.editMetaproperty({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.editMetaproperty({
        id: 'abc',
        param1: 'param1',
        param2: 'param2',
        param3: 'param3'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/metaproperties/abc/', {
        data: JSON.stringify({
          param1: 'param1',
          param2: 'param2',
          param3: 'param3'
        })
      });
    });
  });
});

describe('#deleteMetaproperty', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteMetaproperty({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.deleteMetaproperty({
        id: 'abc'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'DELETE', 'api/v4/metaproperties/abc/');
    });
  });
});

describe('#saveNewMetapropertyOption', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.saveNewMetapropertyOption({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty option id or name is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no name param', () => {
    it('returns a rejection with an error message', () => {
      bynder.saveNewMetapropertyOption({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty option id or name is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID and name param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.saveNewMetapropertyOption({
        id: 'abc',
        name: 'sirjamey',
        param1: 'param1',
        param2: 'param2',
        param3: 'param3'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/metaproperties/abc/options/', {
        data: JSON.stringify({
          name: 'sirjamey',
          param1: 'param1',
          param2: 'param2',
          param3: 'param3'
        })
      });
    });
  });
});

describe('#editMetapropertyOption', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.editMetapropertyOption({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty option id or optionId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no optionId param', () => {
    it('returns a rejection with an error message', () => {
      bynder.editMetapropertyOption({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty option id or optionId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID and name param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.editMetapropertyOption({
        id: 'abc',
        optionId: 'sirjamey',
        param1: 'param1',
        param2: 'param2',
        param3: 'param3'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/metaproperties/abc/options/sirjamey/', {
        data: JSON.stringify({
          optionId: 'sirjamey',
          param1: 'param1',
          param2: 'param2',
          param3: 'param3'
        })
      });
    });
  });
});

describe('#deleteMetapropertyOption', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteMetapropertyOption({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty option id or optionId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no optionId param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteMetapropertyOption({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The metaproperty option id or optionId is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID and name param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.deleteMetapropertyOption({
        id: 'abc',
        optionId: 'sirjamey',
        param1: 'param1',
        param2: 'param2',
        param3: 'param3'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'DELETE', 'api/v4/metaproperties/abc/options/sirjamey/');
    });
  });
});

describe('#getCollections', () => {
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
      await bynder.getCollections();
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/collections/', {});
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
      bynder.getCollections()
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            message: 'There was a problem saving the asset'
          });
        });
    });
  });
});

describe('#getCollection', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.getCollection({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.getCollection({
        id: 'abc'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/collections/abc/');
    });
  });
});

describe('#saveNewCollection', () => {
  describe('with no name param', () => {
    it('returns a rejection with an error message', () => {
      bynder.saveNewCollection({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection name is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with a name param', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      bynder.saveNewCollection({
        name: 'abc'
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/collections/', {
        name: 'abc'
      });
    });
  });
});

describe('#shareCollection', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.shareCollection({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no recipients param', () => {
    it('returns a rejection with an error message', () => {
      bynder.shareCollection({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection recipients is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no collectionOptions param', () => {
    it('returns a rejection with an error message', () => {
      bynder.shareCollection({
        id: 'abc',
        recipients: 'jon@snow.fam,daenerys@targerye.fam'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection collectionOptions is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with all required params', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      const payload = {
        id: 'abc',
        recipients: 'jon@snow.fam,daenerys@targerye.fam',
        collectionOptions: [1, 2, 3]
      };

      bynder.shareCollection(payload)
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/collections/abc/share/', {
        recipients: 'jon@snow.fam,daenerys@targerye.fam',
        collectionOptions: [1, 2, 3]
      });
    });
  });
});

describe('#addMediaToCollection', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.addMediaToCollection({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no data param', () => {
    it('returns a rejection with an error message', () => {
      bynder.addMediaToCollection({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection data is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID and data params', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      const payload = {
        id: 'abc',
        data: {
          param1: 'param1'
        }
      };

      bynder.addMediaToCollection(payload)
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'api/v4/collections/abc/media/', {
        data: JSON.stringify({
          param1: 'param1'
        })
      });
    });
  });
});

describe('#deleteMediaFromCollection', () => {
  describe('with no ID param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteMediaFromCollection({})
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection id is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with no deleteIds param', () => {
    it('returns a rejection with an error message', () => {
      bynder.deleteMediaFromCollection({
        id: 'abc'
      })
        .catch(error => {
          expect(error).toEqual({
            status: 0,
            message: 'The collection deleteIds is not valid or it was not specified properly'
          });
        });
    });
  });

  describe('with an ID and deleteIds params', () => {
    beforeEach(() => {
      helpers.mockFunctions(bynder.api, [
        {
          name: 'send',
          returnedValue: Promise.resolve({})
        }
      ]);
    });

    afterEach(() => {
      helpers.restoreMockedFunctions(bynder.api, [{ name: 'send' }]);
    });

    it('sends the request to the endpoint with the expected payload', () => {
      const payload = {
        id: 'abc',
        deleteIds: ['def', 'ghi']
      };

      bynder.deleteMediaFromCollection(payload)
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'DELETE', 'api/v4/collections/abc/media/', {
        deleteIds:'def,ghi'
      });
    });
  });
});

describe('#getTags', () => {
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
      await bynder.getTags();
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/tags/', {});
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
      bynder.getTags()
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            message: 'There was a problem saving the asset'
          });
        });
    });
  });
});

describe('#getSmartfilters', () => {
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
      await bynder.getSmartfilters();
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'api/v4/smartfilters/');
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
      bynder.getSmartfilters()
        .catch(error => {
          expect(error).toEqual({
            status: 400,
            message: 'There was a problem saving the asset'
          });
        });
    });
  });
});
