'use strict';

import queryString from 'query-string';
import joinUrl from 'proper-url-join';
import isUrl from 'is-url';
import axios from 'axios';

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

    this.baseURL = baseURL;
    this.httpsAgent = httpsAgent;
    this.httpAgent = httpAgent;
    this.token = token;
  }

  /**
   * Fetch the information from the API.
   * @return {Promise} - Returns a Promise that, when fulfilled, will either return an JSON Object with the requested
   * data or an Error with the problem.
   */
  async send(method, url, data = {}) {
    let callURL = joinUrl(this.baseURL, url, { trailingSlash: true });

    const headers = {};

    if (!this.token && !this.permanentToken) {
      throw new Error('No token found');
    }

    if (this.permanentToken) {
      headers['Authorization'] = `Bearer ${this.permanentToken}`;
    } else {
      this.token = await (this.token.expired()
        ? this.token.refresh()
        : Promise.resolve(this.token));

      headers['Authorization'] = `Bearer ${this.token.token.access_token}`;
    }

    let body = '';

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';

      body = queryString.stringify(data);
    } else if (Object.keys(data).length && data.constructor === Object) {
      callURL = joinUrl(callURL, { trailingSlash: true, query: data });
    }

    return axios(callURL, {
      httpsAgent: this.httpsAgent,
      httpAgent: this.httpAgent,
      method,
      data: body,
      headers
    }).then(response => {
      const {headers} = response;

      if (response.status >= 400) {
        // check for 4XX, 5XX, wtv
        return Promise.reject({
          headers,
          status: response.status,
          message: response.statusText,
          body: response.data
        });
      }
      if (response.status >= 200 && response.status <= 202) {
        return { ...response.data, headers };
      }
      return {};
    });
  }
}
