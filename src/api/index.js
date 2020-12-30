'use strict';

import queryString from 'query-string';
import isUrl from 'is-url';
import axios from 'axios';
import pkg from '../../package.json';

/**
 * @classdesc Represents an API call.
 * @class
 * @abstract
 */
export default class BynderApi {
  /**
   * Create a APICall.
   * @constructor
   * @param {String} baseURL A string with the base URL for account.
   * @param {Object} httpsAgent A https agent.
   * @param {Object} httpAgent A http agent.
   * @param {String} token Optional OAuth2 access token
   */
  constructor(baseURL, httpsAgent, httpAgent, token) {
    if (!isUrl(baseURL)) throw new Error('The base URL provided is not valid');

    this.httpsAgent = httpsAgent;
    this.httpAgent = httpAgent;
    this.token = token;
    this.axios = axios.create({ baseURL });
  }

  /**
   * Generates the request headers
   * @access private
   * @async
   * @param {Object} additionalHeaders Addional headers for specific endpoints
   * @returns {Promise<object>} ?Request headers to be send
   */
  async _headers(additionalHeaders = {}) {
    const headers = {
      ...additionalHeaders,
      'User-Agent': `bynder-js-sdk/${pkg.version}`
    };

    if (this.permanentToken) {
      headers['Authorization'] = `Bearer ${this.permanentToken}`;
    } else {
      /* istanbul ignore next */
      this.token = await (this.token.expired()
        ? this.token.refresh()
        : Promise.resolve(this.token));

      headers['Authorization'] = `Bearer ${this.token.token.access_token}`;
    }

    return headers;
  }

  /**
   * Fetch the information from the API.
   * @async
   * @param {String} method HTTP method
   * @param {String} url URL to request
   * @param {Object} params Body or querystring params to be sent on the request
   * @param {Object} options Optional elements for the request
   * @param {Object} options.additionalHeaders Additional headers specific to an endpoint
   * @returns {Promise<object>} Object with response data or an Error with the problem.
   */
  async send(method, url, params = {}, options = {}) {

    if (!this.token && !this.permanentToken) {
      throw new Error('No token found');
    }

    const isV6orV7 = (/v[6|7]/).test(url);
    let body = null;

    if (method.toLocaleLowerCase() === 'post') {
      body = params;

      if (!isV6orV7) {
        body = queryString.stringify(params);
        // Some older endpoints require this
        options.additionalHeaders = {
          ...options.additionalHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        };
      }

      // We need to clear the params so they're not sent as QS
      params = null;
    }

    const headers = await this._headers({ ...options.additionalHeaders });

    return this.axios.request({
      url, params, method, headers,
      data: body,
      httpsAgent: this.httpsAgent,
      httpAgent: this.httpAgent
    })
      .then(response => {
        const {headers, status} = response;

        if (status >= 200 && status <= 202) {
          return Array.isArray(response.data) ?
            // Return only the array
            response.data :
            // Return the response object along with the headers
            { ...response.data, headers };
        }

        return {};
      })
      .catch(error => {
        let exception = {};

        if (error.response) {
          const {headers, status, data: body, statusText: message} = error.response;
          exception = { headers, status, body, message };
        } else {
          exception = {
            status: 0,
            message: error.message
          };
        }

        return Promise.reject(exception);
      });
  }
}
