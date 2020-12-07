import {v4 as uuid} from 'uuid';
import * as helpers from '../../helpers';
import ApiCall from '../../../src/api';
import pkg from '../../../package.json';

const baseURL = 'https://portal.getbynder.com/api/';
let api;

it('throws an exception when no base URL is set', () => {
  expect(() => {
    new ApiCall();
  }).toThrow('The base URL provided is not valid');
});

describe('#_headers', () => {
  describe('with permanent token', () => {
    beforeAll(() => {
      api = new ApiCall(baseURL);
      api.permanentToken = 'token';
    });

    afterAll(() => {
      api = null;
    });

    it('returns headers with Content-Type if is a POST', async () => {
      const expectedHeaders = {
        'User-Agent': `bynder-js-sdk/${pkg.version}`,
        'Authorization': 'Bearer token'
      };
      const headers = await api._headers('POST');

      expect(headers).toEqual(expectedHeaders);
    });

    it('returns headers with Content-Type if is not a POST', async () => {
      const expectedHeaders = {
        'User-Agent': `bynder-js-sdk/${pkg.version}`,
        'Authorization': 'Bearer token'
      };
      const headers = await api._headers('GET');

      expect(headers).toEqual(expectedHeaders);
    });
  });

  describe('with an OAuth token', () => {
    beforeAll(() => {
      const oauthMock = {
        expired() {
          return Promise.resolve(false);
        },
        refresh() {
          return Promise.resolve(this);
        },
        token: {
          access_token: 'oauth-access-token'
        }
      };
      api = new ApiCall(baseURL, null, null, oauthMock);
    });

    afterAll(() => {
      api = null;
    });

    it('returns headers with Content-Type if is a POST', async () => {
      const expectedHeaders = {
        'User-Agent': `bynder-js-sdk/${pkg.version}`,
        'Authorization': 'Bearer oauth-access-token'
      };
      const headers = await api._headers('POST');

      expect(headers).toEqual(expectedHeaders);
    });

    it('returns headers with Content-Type if is not a POST', async () => {
      const expectedHeaders = {
        'User-Agent': `bynder-js-sdk/${pkg.version}`,
        'Authorization': 'Bearer oauth-access-token'
      };
      const headers = await api._headers('GET');

      expect(headers).toEqual(expectedHeaders);
    });
  });

  describe('with addional headers', () => {
    beforeAll(() => {
      api = new ApiCall(baseURL);
      api.permanentToken = 'token';
    });

    afterAll(() => {
      api = null;
    });

    it('returns them', async () => {
      const headers = await api._headers('GET', {
        'content-sha256': 'abcd'
      });

      expect(headers).toEqual({
        'User-Agent': `bynder-js-sdk/${pkg.version}`,
        'Authorization': 'Bearer token',
        'content-sha256': 'abcd'
      });
    });
  });
});

describe('#send', () => {
  it('throws an error when no tokens are set', () => {
    api = new ApiCall(baseURL);

    api.send().catch(error => {
      expect(error.message).toEqual('No token found');
    });
    api = null;
  });

  describe('on POST request', () => {
    const correlationId = uuid();

    beforeAll(() => {
      api = new ApiCall(baseURL);
      api.permanentToken = 'token';

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
      const response = await api.send('POST', '/', {
        chunk: 0,
        size: 100
      });

      expect(response).toEqual(expectedResponse);
      expect(api.axios.request).toHaveBeenNthCalledWith(1, {
        url: '/',
        method: 'POST',
        data: 'chunk=0&size=100',
        headers: {
          'User-Agent': `bynder-js-sdk/${pkg.version}`,
          'Authorization': 'Bearer token',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpAgent: undefined,
        httpsAgent: undefined,
        params: null
      });
    });
  });

  describe('on GET request', () => {
    const correlationId = uuid();

    beforeAll(() => {
      api = new ApiCall(baseURL);
      api.permanentToken = 'token';

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
          'Authorization': 'Bearer token'
        },
        httpAgent: undefined,
        httpsAgent: undefined
      });
    });
  });

  describe('on request error', () => {
    const correlationId = uuid();

    beforeAll(() => {
      api = new ApiCall(baseURL);
      api.permanentToken = 'token';

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
      api = new ApiCall(baseURL);
      api.permanentToken = 'token';

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

  describe('with additional headers', () => {
    beforeAll(() => {
      api = new ApiCall(baseURL);
      api.permanentToken = 'token';

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
      await api.send('POST', '/', {
        chunk: 0,
        size: 100,
        additionalHeaders: {
          'content-sha256': 'abcd'
        }
      });

      expect(api.axios.request).toHaveBeenNthCalledWith(1, {
        url: '/',
        method: 'POST',
        data: 'chunk=0&size=100',
        params: null,
        httpAgent: undefined,
        httpsAgent: undefined,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `bynder-js-sdk/${pkg.version}`,
          'Authorization': 'Bearer token',
          'content-sha256': 'abcd'
        }
      });
    });
  });
});
