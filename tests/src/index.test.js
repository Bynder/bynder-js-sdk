import Bynder from '../../src/index.js';
import * as utils from '../../src/utils';
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

      const [prepareRequest, uploadChunkRequest, finaliseRequest, saveAssetRequest] = spy.mock.calls;

      expect(prepareRequest).toEqual(['POST', 'v7/file_cmds/upload/prepare']);
      expect(uploadChunkRequest).toEqual(['POST', 'v7/file_cmds/upload/night-gathers-and-now-my-watch-begins/chunk/0', {
        chunk: file.body,
        additionalHeaders: {
          'Content-Sha256': '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d'
        }
      }]);
      expect(finaliseRequest).toEqual(['POST', 'v7/file_cmds/upload/night-gathers-and-now-my-watch-begins/finalise', {
        chunksCount: 1,
        fileName: file.filename,
        fileSize: 6,
        intent: 'upload_main_uploader_asset',
        sha256: utils.create256HexHash(file.body)
      }]);
      expect(saveAssetRequest).toEqual(['POST', 'v4/media/save/night-gathers-and-now-my-watch-begins/', {
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
      chunk: expectedChunk,
      additionalHeaders: {
        'Content-Sha256': '1758358dac0e14837cf8065c306092935b546f72ed2660b0d1f6d0ea55e22b2d'
      }
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
      fileSize: file.body.length,
      intent: 'upload_main_uploader_asset',
      sha256: utils.create256HexHash(file.body)
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

      await bynder.saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', `v4/media/${mediaId}/save/`, asset);
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

      await bynder.saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'v4/media/save/', asset);
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

      await bynder.saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'v4/media/save/i-am-the-shield-that-guards-the-realms-of-men/', asset);
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

      await bynder.saveAsset(asset);
      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'v4/media/i-pledge-my-life-and-honor-to-the-night-s-watch-for-this-night-and-all-the-nights-to-come/save/i-am-the-shield-that-guards-the-realms-of-men/', asset);
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

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'POST', 'v4/users/login/', payload);
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

  it('sends the request to the expected endpoint', async () => {
    const params = {
      param1: 'jorah',
      propertyOptionId: [1, 2, 3]
    };

    await bynder.getMediaList(params);
    expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'v4/media/', params);
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

    it('returns a rejection with an error message', () => {
      bynder.getMediaInfo({
        id: 'abc',
        count: 1
      })
        .catch(error => {
          expect(error).not.toBeDefined();
        });

      expect(bynder.api.send).toHaveBeenNthCalledWith(1, 'GET', 'v4/media/abc/', {
        count: 1
      });
    });
  });
});

describe.skip('#getMediaTotal', () => {
  // Add more test cases
});

describe.skip('#editMedia', () => {
  // Add more test cases
});

describe.skip('#deleteMedia', () => {
  // Add more test cases
});

describe.skip('#getMediaDownloadUrl', () => {
  // Add more test cases
});

describe.skip('#getAssetUsage', () => {
  // Add more test cases
});

describe.skip('#saveNewAssetUsage', () => {
  // Add more test cases
});

describe.skip('#deleteAssetUsage', () => {
  // Add more test cases
});

describe.skip('#getMetaproperties', () => {
  // Add more test cases
});

describe.skip('#getMetaproperty', () => {
  // Add more test cases
});

describe.skip('#saveNewMetaproperty', () => {
  // Add more test cases
});

describe.skip('#editMetaproperty', () => {
  // Add more test cases
});

describe.skip('#deleteMetaproperty', () => {
  // Add more test cases
});

describe.skip('#saveNewMetapropertyOption', () => {
  // Add more test cases
});

describe.skip('#editMetapropertyOption', () => {
  // Add more test cases
});

describe.skip('#deleteMetapropertyOption', () => {
  // Add more test cases
});

describe.skip('#getMetapropertyOptions', () => {
  // Add more test cases
});

describe.skip('#getCollections', () => {
  // Add more test cases
});

describe.skip('#getCollection', () => {
  // Add more test cases
});

describe.skip('#saveNewCollection', () => {
  // Add more test cases
});

describe.skip('#shareCollection', () => {
  // Add more test cases
});

describe.skip('#addMediaToCollection', () => {
  // Add more test cases
});

describe.skip('#deleteMediaFromCollection', () => {
  // Add more test cases
});

describe.skip('#getTags', () => {
  // Add more test cases
});

describe.skip('#getSmartfilters', () => {
  // Add more test cases
});

describe.skip('#getBrands', () => {
  // Add more test cases
});
