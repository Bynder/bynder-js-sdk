import {v4 as uuid} from 'uuid';
import Bynder from '../../src/index.js';

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

describe('Auth', () => {
  describe('Make authorization URL', () => {
    const _bynder = new Bynder(config);
    const authorizationUrl = _bynder.makeAuthorizationURL('state example', 'offline');

    it('returns correct authorization URL', () => {
      // Security token is random token so we compare without this
      expect(authorizationUrl).toMatchSnapshot();
    });
  });

  describe('Make API call without token', () => {
    it('returns an Error', async () => {
      try {
        const _bynder = new Bynder(config);
        await _bynder.getMediaList();
      } catch (error) {
        expect(error.message).toEqual('No token found');
      }
    });
  });

  describe('Make API call with invalid token', () => {
    it('returns an Error', () => {
      const invalidTokenConfig = {
        baseURL: config.baseURL,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        token: { access_token: 2345 }
      };

      expect(() => new Bynder(invalidTokenConfig)).toThrow(Error);
    });
  });

  describe('Initialize Bynder with permanent token', () => {
    it('does not returns an error', () => {
      expect(bynder.api.permanentToken).toEqual('test');
    });
  });
});

describe('#uploadFile', () => {
  describe('#uploadFileInChunks', () => {
    const chunks = 1;

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

      expect(bynder.uploadFileInChunks).toHaveBeenNthCalledWith(1, file, fileId);
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
