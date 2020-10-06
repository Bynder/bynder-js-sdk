import axios from 'axios';
import {v4 as uuid} from 'uuid';
import Bynder from '../../src/index.js';

// Axios' Jest mock, so we don't hit the real API
jest.mock('axios');

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

afterAll(() => {
  jest.unmock('axios');
});

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

  describe('Initialize Bynder with permanent token', () => {
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
      jest.clearAllMocks();
      bynder.uploadFileInChunks = jest.fn(() => Promise.resolve(1));
    });

    afterEach(() => {
      bynder.uploadFileInChunks.mockRestore();
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
      jest.clearAllMocks();
      bynder.api.send = jest.fn(() => Promise.resolve({
        headers: {
          'X-API-Correlation-Id': correlationId
        }
      }));
      bynder.uploadFileInChunks = jest.fn(() => Promise.resolve(chunks));
      bynder.finaliseUpload = jest.fn(() => Promise.resolve(correlationId));
    });

    afterEach(() => {
      bynder.uploadFileInChunks.mockRestore();
      bynder.finaliseUpload.mockRestore();
    });

    it('calls the method with the expected payload', async () => {
      const fileId = uuid();
      await bynder.uploadFile(file, fileId);

      expect(bynder.finaliseUpload).toHaveBeenNthCalledWith(1, fileId, file.filename, chunks, file.body.length);
    });
  });
});

describe('#uploadFileInChunks', () => {
  it('calls the FS upload chunk endpoint', async () => {
    const fileId = uuid();
    axios.mockImplementation(() => Promise.resolve({}));

    await bynder.uploadFileInChunks(file, fileId, file.body.length)
          .then(chunks => {
            expect(chunks).toEqual(1);
          })
          .catch(error => {
            expect(error).toBeUndefined();
          });
  });
});
