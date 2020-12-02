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
export default class APICall {
  /**
   * Create a APICall.
   * @constructor
   * @param {String} baseURL A string with the base URL for account.
   * @param {String} httpsAgent A https agent.
   * @param {String} httpAgent A http agent.
   * @param {String} token Optional OAuth2 access token
   * @param {Object} [data={}] An object containing the query parameters.
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
   * @param {String} method HTTP Verb of the request
   * @returns {Promise<object>} ?Request headers to be send
   */
  async _headers(method) {
    const headers = {
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

    if (method.toLowerCase() === 'post') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    return headers;
  }

  /**
   * Fetch the information from the API.
   * @async
   * @returns {Promise<object>} Object with response data or an Error with the problem.
   */
  async send(method, url, params = {}) {

    if (!this.token && !this.permanentToken) {
      throw new Error('No token found');
    }

    const headers = await this._headers(method);
    let body = null;

    if (method === 'POST') {
      body = queryString.stringify(params);
      // We need to clear the params so they're not sent as QS
      params = null;
    }

    return this.axios.request({
      url, params, method, headers,
      data: body,
      httpsAgent: this.httpsAgent,
      httpAgent: this.httpAgent
    })
      .then(response => {
        const {headers, status} = response;

        if (status >= 200 && status <= 202) {
          return { ...response.data, headers };
        }

        return {};
      })
      .catch(response => {
        const {headers, status, data: body, statusText: message} = response;

        return Promise.reject({ headers, status, body, message });
      });
  }
}
