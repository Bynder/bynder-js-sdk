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
   * @param {string} baseURL - A string with the base URL for account.
   * @param {string} httpsAgent - A https agent.
   * @param {string} httpAgent - A http agent.
   * @param {string} token - Optional OAuth2 access token
   * @param {Object} [data={}] - An object containing the query parameters.
   */
  constructor(baseURL, httpsAgent, httpAgent, token) {
    if (!isUrl(baseURL)) throw new Error('The base URL provided is not valid');

    this.httpsAgent = httpsAgent;
    this.httpAgent = httpAgent;
    this.token = token;
    this.axios = axios.create({ baseURL });
  }

  async _headers(method) {
    const headers = {
      'User-Agent': `${pkg.name}/${pkg.version}`
    };

    if (this.permanentToken) {
      headers['Authorization'] = `Bearer ${this.permanentToken}`;
    } else {
      this.token = await (this.token.expired()
        ? this.token.refresh()
        : Promise.resolve(this.token));

      headers['Authorization'] = `Bearer ${this.token.token.access_token}`;
    }

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    return headers;
  }

  /**
   * Fetch the information from the API.
   * @return {Promise} - Returns a Promise that, when fulfilled, will either return an JSON Object with the requested
   * data or an Error with the problem.
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
    }).then(response => {
      const {headers, status} = response;

      if (status >= 400) {
        // check for 4XX, 5XX, wtv
        return Promise.reject({
          headers, status,
          message: response.statusText,
          body: response.data
        });
      }
      if (status >= 200 && status <= 202) {
        return { ...response.data, headers };
      }
      return {};
    });
  }
}
