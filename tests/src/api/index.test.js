import {v4 as uuid} from 'uuid';
import * as helpers from '../../helpers';
import ApiWrapper from '../../../src/api';
import pkg from '../../../package.json';

const baseURL = 'https://portal.getbynder.com/api/';
const accessToken = uuid();
const oauthMock = {
  expired() {
    return Promise.resolve(false);
  },
  refresh() {
    return Promise.resolve(this);
  },
  token: {
    access_token: accessToken
  }
};
let api;

it('throws an exception when no base URL is set', () => {
  expect(() => {
    new ApiWrapper();
  }).toThrow('The base URL provided is not valid');
});

describe('#_headers', () => {
  describe('with an OAuth2 token', () => {
    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);
    });

    afterAll(() => {
      api = null;
    });

    it('returns headers with Content-Type', async () => {
      const expectedHeaders = {
        'User-Agent': `bynder-js-sdk/${pkg.version}`,
        'Authorization': `Bearer ${accessToken}`
      };
      const headers = await api._headers();

      expect(headers).toEqual(expectedHeaders);
    });
  });

  describe('with addional headers', () => {
    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);
    });

    afterAll(() => {
      api = null;
    });

    it('returns them', async () => {
      const headers = await api._headers({
        'content-sha256': 'abcd'
      });

      expect(headers).toEqual({
        'User-Agent': `bynder-js-sdk/${pkg.version}`,
        'Authorization': `Bearer ${accessToken}`,
        'content-sha256': 'abcd'
      });
    });
  });
});

describe('#send', () => {
  it('throws an error when no tokens are set', () => {
    api = new ApiWrapper(baseURL);

    api.send().catch(error => {
      expect(error.message).toEqual('No token found');
    });
    api = null;
  });

  describe('on POST request', () => {
    const correlationId = uuid();

    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);

      helpers.mockFunctions(api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            headers: {
              'X-API-Correlation-Id': correlationId
            },
            status: 200,
            data: {
              success: true
            }
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(api.axios, [{ name: 'request' }]);
      api = null;
    });

    it('sends the appropiate headers and body', async () => {
      const expectedResponse = {
        success: true,
        headers: {
          'X-API-Correlation-Id': correlationId
        }
      };
      const response = await api.send('POST', '/api/', {
        chunk: 0,
        size: 100
      });

      expect(response).toEqual(expectedResponse);
      expect(api.axios.request).toHaveBeenNthCalledWith(1, {
        url: '/api/',
        method: 'POST',
        data: 'chunk=0&size=100',
        headers: {
          'User-Agent': `bynder-js-sdk/${pkg.version}`,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpAgent: null,
        httpsAgent: null,
        params: null
      });
    });
  });

  describe('on GET request', () => {
    const correlationId = uuid();

    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);

      helpers.mockFunctions(api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            headers: {
              'X-API-Correlation-Id': correlationId
            },
            status: 200,
            data: {
              success: true
            }
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(api.axios, [{ name: 'request' }]);
      api = null;
    });

    it('sends the appropiate headers and body', async () => {
      const expectedResponse = {
        success: true,
        headers: {
          'X-API-Correlation-Id': correlationId
        }
      };
      const response = await api.send('GET', '/', {
        chunk: 0,
        size: 100
      });

      expect(response).toEqual(expectedResponse);
      expect(api.axios.request).toHaveBeenNthCalledWith(1, {
        url: '/',
        method: 'GET',
        params: {
          chunk: 0,
          size: 100
        },
        data: null,
        headers: {
          'User-Agent': `bynder-js-sdk/${pkg.version}`,
          'Authorization': `Bearer ${accessToken}`
        },
        httpAgent: null,
        httpsAgent: null
      });
    });
  });

  describe('on request error', () => {
    const correlationId = uuid();

    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);

      helpers.mockFunctions(api.axios, [
        {
          name: 'request',
          returnedValue: Promise.reject({
            response: {
              headers: {
                'X-API-Correlation-Id': correlationId
              },
              status: 500,
              statusText: 'There was a server side error',
              data: {
                success: false
              }
            }
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(api.axios, [{ name: 'request' }]);
      api = null;
    });

    it('returns the expected headers and body', () => {
      const expectedResponse = {
        body: {
          success: false
        },
        status: 500,
        message: 'There was a server side error',
        headers: {
          'X-API-Correlation-Id': correlationId
        }
      };
      api.send('POST', '/', {
        chunk: 0,
        size: 100
      }).catch(error => {
        expect(error).toEqual(expectedResponse);
      });
    });
  });

  describe('with an unsupported response status code', () => {
    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);

      helpers.mockFunctions(api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 301
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(api.axios, [{ name: 'request' }]);
      api = null;
    });

    it('returns the expected headers and body', async () => {
      const expectedResponse = {};
      const response = await api.send('POST', '/', {
        chunk: 0,
        size: 100
      });

      expect(response).toEqual(expectedResponse);
    });
  });

  describe('with an array object response', () => {
    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);

      helpers.mockFunctions(api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 200,
            data: [
              {
                name: 'an-asset',
                filename: 'a-file-name',
                size: 100
              },
              {
                name: 'another-asset',
                filename: 'another-file-name',
                size: 200
              }
            ]
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(api.axios, [{ name: 'request' }]);
      api = null;
    });

    it('returns the array', async () => {
      const response = await api.send('POST', '/api/', {
        chunk: 0,
        size: 100
      });

      expect(response).toEqual([
        {
          name: 'an-asset',
          filename: 'a-file-name',
          size: 100
        },
        {
          name: 'another-asset',
          filename: 'another-file-name',
          size: 200
        }
      ]);
    });
  });

  describe('with additional headers', () => {
    beforeAll(() => {
      api = new ApiWrapper(baseURL, null, null, oauthMock);

      helpers.mockFunctions(api.axios, [
        {
          name: 'request',
          returnedValue: Promise.resolve({
            status: 201
          })
        }
      ]);
    });

    afterAll(() => {
      helpers.restoreMockedFunctions(api.axios, [{ name: 'request' }]);
      api = null;
    });

    it('returns the expected headers and body', async () => {
      await api.send('POST', '/api/', {
        chunk: 0,
        size: 100
      }, {
        additionalHeaders: {
          'Content-SHA256': 'abcd'
        }
      });

      expect(api.axios.request).toHaveBeenNthCalledWith(1, {
        url: '/api/',
        method: 'POST',
        data: 'chunk=0&size=100',
        params: null,
        httpAgent: null,
        httpsAgent: null,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `bynder-js-sdk/${pkg.version}`,
          'Authorization': `Bearer ${accessToken}`,
          'Content-SHA256': 'abcd'
        }
      });
    });
  });
});
