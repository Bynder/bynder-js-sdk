'use strict';

import 'isomorphic-form-data';
import simpleOAuth2 from 'simple-oauth2';
import url from 'url';
import crypto from 'crypto';
import APICall from './api';
import {rejectValidation, bodyTypes, getLength} from './utils';
import {DEFAULT_ASSETS_NUMBER_PER_PAGE, FILE_CHUNK_SIZE} from './constants';

/**
 * @classdesc Represents the Bynder SDK. It allows the user to make every call to the API with a single function.
 * @class
 */
export default class Bynder {
  /**
   * Create Bynder SDK.
   * @constructor
   * @param {String} options.baseURL The URL with the account domain.
   * @param {String} options.httpsAgent The https agent.
   * @param {String} options.httpAgent The http agent.
   * @param {String} options.clientId OAuth2 client id
   * @param {String} options.clientSecret OAuth2 client secret
   * @param
   * @param {Object} options An object containing the consumer keys, access keys and the base URL.
   */
  constructor(options) {
    this.options = options;
    this.baseURL = options.baseURL;
    this.redirectUri = options.redirectUri;

    this.api = new APICall(
      options.baseURL,
      options.httpsAgent,
      options.httpAgent
    );

    if (typeof options.permanentToken === 'string') {
      this.api.permanentToken = options.permanentToken;
      return;
    }

    const oauthBaseUrl = url.resolve(options.baseURL, '/v6/authentication/');

    this.oauth2 = simpleOAuth2.create({
      client: {
        id: options.clientId,
        secret: options.clientSecret
      },
      auth: {
        tokenHost: oauthBaseUrl,
        tokenPath: 'oauth2/token',
        revokePath: 'oauth2/revoke',
        authorizeHost: oauthBaseUrl,
        authorizePath: 'oauth2/auth'
      }
    });

    if (options.token) {
      if (typeof options.token.access_token !== 'string') {
        throw new Error(`Invalid token format: ${JSON.stringify(options.token, null, 2)}`);
      }
      this.api.token = this.oauth2.accessToken.create(options.token);
    }
  }

  /**
   * Builds OAuth2 authorization URL.
   * @return {String} Authorization URL
   */
  makeAuthorizationURL(state, scope) {
    return this.oauth2.authorizationCode.authorizeURL({
      redirect_uri: this.redirectUri,
      scope,
      state
    });
  }

  /**
   * Gets OAuth2 access token from authorization code
   * @param {String} code One time authorization code
   * @return {Promise<string>} access token
   */
  getToken(code) {
    const tokenConfig = {
      code,
      redirect_uri: this.redirectUri
    };

    return this.oauth2.authorizationCode.getToken(tokenConfig).then(result => {
      const token = this.oauth2.accessToken.create(result);
      this.api.token = token;
      return token;
    });
  }

  /**
   * Get all the smartfilters.
   * @see {@link https://bynder.docs.apiary.io/#reference/smartfilters/smartfilters-operations/retrieve-smartfilters|API Call}
   * @return {Promise} Smartfilters Returns a Promise that, when fulfilled, will either return an Array with the
   * smartfilters or an Error with the problem.
   */
  getSmartfilters() {
    return this.api.send('GET', 'v4/smartfilters/');
  }

  /**
   * Login to retrieve OAuth credentials.
   * @see {@link https://bynder.docs.apiary.io/#reference/users/-deprecated-login-a-user-operations/login-a-user|API Call}
   * @param {Object} params An object containing the credentials with which the user intends to login.
   * @param {String} params.username The username of the user.
   * @param {String} params.password The password of the user.
   * @param {String} params.consumerId The consumerId of the user.
   * @return {Promise} Credentials Returns a Promise that, when fulfilled, will either return an Object with the
   * OAuth credentials for login or an Error with the problem.
   */
  userLogin(params) {
    if (!params.username || !params.password || !params.consumerId) {
      return rejectValidation(
        'authentication',
        'username, password or consumerId'
      );
    }

    return this.api.send('POST', 'v4/users/login/', params);
  }

  /**
   * Get the assets according to the parameters provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Assets Returns a Promise that, when fulfilled, will either return an Array with the assets or
   * an Error with the problem.
   */
  getMediaList(params = {}) {
    return this.api.send('GET', 'v4/media/', {
      ...params,
      count: false,
      ...(Array.isArray(params.propertyOptionId)
        ? params.propertyOptionId.join(',')
        : {})
    });
  }

  /**
   * Get the assets information according to the id provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/specific-asset-operations/retrieve-specific-asset|API Call}
   * @param {Object} params An object containing the id and the version of the desired asset.
   * @param {String} params.id The id of the desired asset.
   * @param {Boolean} [params.versions] Whether to include info about the different asset versions.
   * @return {Promise} Asset Returns a Promise that, when fulfilled, will either return an Object with the asset or
   * an Error with the problem.
   */
  getMediaInfo({ id, ...options } = {}) {
    if (!id) {
      return rejectValidation('media', 'id');
    }

    return this.api.send('GET', `v4/media/${id}/`, options);
  }

  /**
   * Get all the assets starting from the page provided (1 by default) and incrementing according to the offset given.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Assets Returns a Promise that, when fulfilled, will either return an Array with all the
   * assets or an Error with the problem.
   */
  getAllMediaItems(params = {}) {
    const recursiveGetAssets = (_params, assets) => {
      let queryAssets = assets;
      const params = { ..._params };
      params.page = !params.page ? 1 : params.page;
      params.limit = !params.limit ? DEFAULT_ASSETS_NUMBER_PER_PAGE : params.limit;

      return this.getMediaList(params)
        .then(data => {
          queryAssets = assets.concat(data);
          if (data && data.length === params.limit) {
            // If the results page is full it means another one might exist
            params.page += 1;
            return recursiveGetAssets(params, queryAssets);
          }
          return queryAssets;
        })
        .catch(error => error);
    };

    return recursiveGetAssets(params, []);
  }

  /**
   * Get the assets total according to the parameters provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Number Returns a Promise that, when fulfilled, will either return the number of assets
   * fitting the query or an Error with the problem.
   */
  getMediaTotal(params = {}) {
    const parametersObject = Object.assign({}, params, { count: true });
    if (Array.isArray(parametersObject.propertyOptionId)) {
      parametersObject.propertyOptionId = parametersObject.propertyOptionId.join();
    }
    return this.api.send('GET', 'v4/media/', parametersObject).then(({count}) => count.total);
  }

  /**
   * Edit an existing asset with the information provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/specific-asset-operations/modify-asset|API Call}
   * @param {Object} params An object containing the parameters accepted by the API to change in the asset.
   * @param {String} params.id The id of the desired asset.
   * @return {Promise} Object Returns a Promise that, when fulfilled, will either return an empty Object in
   * case it's successful or an Error with the problem.
   */
  editMedia(params = {}) {
    if (!params.id) {
      return rejectValidation('media', 'id');
    }
    return this.api.send('POST', 'v4/media/', params);
  }

  /**
   * Delete an existing asset.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/specific-asset-operations/delete-asset|API Call}
   * @param {Object} params An object containing the id of the asset to be deleted.
   * @param {String} params.id The id of the asset.
   * @return {Promise} Object Returns a Promise that, when fulfilled, will either return an empty Object in
   * case it's successful or an Error with the problem.
   */
  deleteMedia({ id }) {
    if (!id) {
      return rejectValidation('media', 'id');
    }
    return this.api.send('DELETE', `v4/media/${id}/`);
  }

  /**
   * Get all the metaproperties
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/retrieve-metaproperties|API Call}
   * @param {Object} params An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Metaproperties Returns a Promise that, when fulfilled, will either return an Array with the
   * metaproperties or an Error with the problem.
   */
  getMetaproperties(params = {}) {
    return this.api.send('GET', 'v4/metaproperties/', params).then(data => Object.keys(data).map(metaproperty => data[metaproperty]));
  }

  /**
   * Get the metaproperty information according to the id provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/specific-metaproperty-operations/retrieve-specific-metaproperty|API Call}
   * @param {Object} params An object containing the id of the desired metaproperty.
   * @param {String} params.id The id of the desired metaproperty.
   * @return {Promise} Metaproperty Returns a Promise that, when fulfilled, will either return an Object with the
   * metaproperty or an Error with the problem.
   */
  getMetaproperty({ id } = {}) {
    if (!id) {
      return rejectValidation('metaproperty', 'id');
    }
    return this.api.send('GET', `v4/metaproperties/${id}/`);
  }

  /**
   * Save a new metaproperty in the information provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/metaproperty-operations/create-metaproperty|API Call}
   * @param {Object} object An object containing the data of the new metaproperty.
   * @return {Promise} Object Returns a Promise that, when fulfilled, will either return an empty Object in
   * case it's successful or an Error with the problem.
   */
  saveNewMetaproperty(params = {}) {
    return this.api.send('POST', 'v4/metaproperties/', {
      data: JSON.stringify(params)
    });
    // The API requires an object with the query content stringified inside
  }

  /**
   * Modify new metaproperty with the information provided.
   * @see {@link https://bynder.docs.apiary.io/#reference/metaproperties/specific-metaproperty-operations/modify-metaproperty|API Call}
   * @param {Object} object An object containing the data of the metaproperty.
   * @param {String} params.id The id of the desired metaproperty.
   * @return {Promise} Object Returns a Promise that, when fulfilled, will either return an empty Object in
   * case it's successful or an Error with the problem.
   */
  editMetaproperty({ id, ...params } = {}) {
    if (!id) {
      return rejectValidation('metaproperty', 'id');
    }
    return this.api.send('POST', `v4/metaproperties/${id}/`, {
      data: JSON.stringify(params)
    });
    // The API requires an object with the query content stringified inside
  }

  /**
   * Delete the metaproperty with the provided id.
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/delete-metaproperty|API Call}
   * @param {Object} object An object containing the id of the metaproperty to be deleted.
   * @param {String} object.id The id of the metaproperty.
   * @return {Promise} Object Returns a Promise that, when fulfilled, will either return an empty Object in
   * case it's successful or an Error with the problem.
   */
  deleteMetaproperty({ id } = {}) {
    if (!id) {
      return rejectValidation('metaproperty', 'id');
    }
    return this.api.send('DELETE', `v4/metaproperties/${id}/`);
  }

  /**
   * Add an option of metaproperty
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/specific-metaproperty-operations/create-metaproperty-option|API Call}
   * @param {Object} params An object containing the id of the desired metaproperty.
   * @param {String} params.id The id of the desired metaproperty.
   * @param {String} params.name The name of the desired metaproperty.
   * @return {Promise} Response Returns a Promise that, when fulfilled, will either return an Object with the
   * response or an Error with the problem.
   */
  saveNewMetapropertyOption({ id, ...params } = {}) {
    if (!id || !params.name) {
      return rejectValidation('metaproperty option', 'id or name');
    }

    return this.api.send('POST', `v4/metaproperties/${id}/options/`, {
      data: JSON.stringify(params)
    });
  }

  /**
   * modify an option of metaproperty
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/specific-metaproperty-operations/modify-metaproperty-option|API Call}
   * @param {Object} params An object containing the id of the desired metaproperty.
   * @param {String} params.id The id of the desired metaproperty.
   * @param {String} params.optionId The id of the desired option.
   * @param {String} params.name The id of the desired metaproperty.
   * @return {Promise} Response Returns a Promise that, when fulfilled, will either return an Object with the
   * response or an Error with the problem.
   */
  editMetapropertyOption({ id, ...params } = {}) {
    if (!id || !params.optionId) {
      return rejectValidation('metaproperty option', 'id or optionId');
    }

    return this.api.send(
      'POST',
      `v4/metaproperties/${id}/options/${params.optionId}/`,
      { data: JSON.stringify(params) }
    );
  }

  /**
   * delete an option of metaproperty
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/specific-metaproperty-operations/delete-metaproperty-option|API Call}
   * @param {Object} params An object containing the id of the desired metaproperty.
   * @param {String} params.id The id of the desired metaproperty.
   * @param {String} params.optionId The id of the desired option.
   * @param {String} params.name The id of the desired metaproperty.
   * @return {Promise} Response Returns a Promise that, when fulfilled, will either return an Object with the
   * response or an Error with the problem.
   */
  deleteMetapropertyOption({ id, optionId }) {
    if (!id || !optionId) {
      return rejectValidation('metaproperty option', 'id or optionId');
    }
    return this.api.send(
      'DELETE',
      `v4/metaproperties/${id}/options/${optionId}/`
    );
  }

  /**
   * Get the assets usage information according to the id provided.
   * @see {@link https://bynder.docs.apiary.io/#reference/asset-usage/asset-usage-operations/retrieve-asset-usage|API Call}
   * @param {Object} queryObject An object containing the id of the desired asset.
   * @param {String} queryObject.id The id of the desired asset to retrieve usage for.
   * @return {Promise} Asset Usage Returns a Promise that, when fulfilled, will either return an Object with
   * the asset usage or an Error with the problem.
   */
  getAssetUsage({id}) {
    if (!id) {
      return rejectValidation('asset usage', 'id');
    }
    const request = new APICall(
      this.baseURL,
      'media/usage/',
      'GET',
      this.consumerToken,
      this.accessToken,
      { asset_id: id }
    );
    return request.send();
  }

  /**
   * Create a usage for an asset according to the provided query object.
   * @see {@link https://bynder.docs.apiary.io/#reference/asset-usage/asset-usage-operations/create-asset-usage|API Call}
   * @param {Object} queryObject An object containing the properties for the desired asset usage.
   * @param {String} queryObject.id The id of the desired asset to create a usage for.
   * @param {String} queryObject.integration_id The id of the desired integration to add.
   * @param {String} queryObject.timestamp Datetime. ISO8601 format: yyyy-mm-ddThh:mm:ssZ.
   * @param {String} queryObject.uri Location. Example: /hippo/first_post.
   * @param {String} queryObject.additional Additional information. Example: Usage description.
   * @return {Promise} Asset usage Returns a Promise that, when fulfilled, will either return an Object with
   * the asset usage or an Error with the problem.
   */
  saveNewAssetUsage(queryObject) {
    if (!queryObject.id) {
      return rejectValidation('asset usage', 'id');
    }
    if (!queryObject.integration_id) {
      return rejectValidation('asset usage', 'integration_id');
    }
    const request = new APICall(
      this.baseURL,
      'media/usage/',
      'POST',
      this.consumerToken,
      this.accessToken,
      {
        asset_id: queryObject.id,
        integration_id: queryObject.integration_id,
        timestamp: queryObject.timestamp || null,
        uri: queryObject.uri || null,
        additional: queryObject.additional || null
      }
    );
    return request.send();
  }

  /**
   * Deletes an asset usage based on the provided asset and integration ids.
   * @see {@link https://bynder.docs.apiary.io/#reference/asset-usage/asset-usage-operations/delete-asset-usage|API Call}
   * @param {Object} queryObject An object containing the id of the desired asset.
   * @param {String} queryObject.id The id of the desired asset to retrieve usage for.
   * @param {String} queryObject.integration_id The id of the desired integration to delete.
   * @param {String} queryObject.uri Location. Example: /hippo/first_post.
   * @return {Promise} Asset Usage Returns a Promise that, when fulfilled, will either return an Object with
   * the asset usage or an Error with the problem.
   */
  deleteAssetUsage({id, integration_id, uri}) {
    if (!id) {
      return rejectValidation('asset usage', 'id');
    }
    if (!integration_id) {
      return rejectValidation('asset usage', 'integration_id');
    }
    const request = new APICall(
      this.baseURL,
      'media/usage/',
      'DELETE',
      this.consumerToken,
      this.accessToken,
      {
        asset_id: id,
        integration_id,
        uri: uri || null
      }
    );
    return request.send();
  }

  /**
   * Get all the tags
   * @see {@link http://docs.bynder.apiary.io/#reference/tags/tags-access/retrieve-entry-point|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Tags Returns a Promise that, when fulfilled, will either return an Array with the
   * tags or an Error with the problem.
   */
  getTags(params = {}) {
    return this.api.send('GET', 'v4/tags/', params);
  }

  /**
   * Get collections according to the parameters provided
   * @see {@link http://docs.bynder.apiary.io/#reference/collections/collection-operations/retrieve-collections|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Collections Returns a Promise that, when fulfilled, will either return an Array with the
   * collections or an Error with the problem.
   */
  getCollections(params = {}) {
    return this.api.send('GET', 'v4/collections/', params);
  }

  /**
   * Get the collection information according to the id provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/retrieve-specific-collection|API Call}
   * @param {Object} params An object containing the id of the desired collection.
   * @param {String} params.id The id of the desired collection.
   * @return {Promise} Collection Returns a Promise that, when fulfilled, will either return an Object with the
   * collection or an Error with the problem.
   */
  getCollection({ id } = {}) {
    if (!id) {
      return rejectValidation('collection', 'id');
    }
    return this.api.send('GET', `v4/collections/${id}/`);
  }

  /**
   * Create the collection information according to the name provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/create-collection|API Call}
   * @param {Object} params An object containing the id of the desired collection.
   * @param {String} params.name The name of the desired collection.
   * @param {String} params.description The description of the desired collection.
   * @return {Promise} Response Returns a Promise that, when fulfilled, will either return an Object with the
   * response or an Error with the problem.
   */
  saveNewCollection(params = {}) {
    if (!params.name) {
      return rejectValidation('collection', 'name');
    }
    return this.api.send('POST', 'v4/collections/', params);
  }

  /**
   * Add assets to the desired collection.
   * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/add-asset-to-a-collection|API Call}
   * @param {Object} params An object containing the id of the desired collection.
   * @param {String} params.id The id of the shared collection.
   * @param {String} params.data JSON-serialised list of asset ids to add.
   * @return {Promise} Response Returns a Promise that, when fulfilled, will either return an Object with the
   * response or an Error with the problem.
   */
  addMediaToCollection({ id, data } = {}) {
    if (!id) {
      return rejectValidation('collection', 'id');
    }
    if (!data) {
      return rejectValidation('collection', 'data');
    }
    return this.api.send('POST', `v4/collections/${id}/media/`, {
      data: JSON.stringify(data)
    });
  }

  /**
   * Remove assets from desired collection.
   * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/remove-asset-from-a-collection|API Call}
   * @param {Object} params An object containing the id of the desired collection and deleteIds of assets.
   * @param {String} params.id The id of the shared collection.
   * @param {String} params.deleteIds Asset ids to remove from the collection
   * @return {Promise} Response Returns a Promise that, when fulfilled, will either return an Object with the
   * response or an Error with the problem.
   */
  deleteMediaFromCollection({ id, deleteIds } = {}) {
    if (!id) {
      return rejectValidation('collection', 'id');
    }
    if (!deleteIds) {
      return rejectValidation('collection', 'deleteIds');
    }
    return this.api.send('DELETE', `v4/collections/${id}/media/`, {
      deleteIds: Array.isArray(deleteIds) ? deleteIds.join(',') : deleteIds
    });
  }

  /**
   * Share the collection to the recipients provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/share-collection|API Call}
   * @param {Object} params An object containing the id of the desired collection.
   * @param {String} params.id The id of the shared collection.
   * @param {String} params.recipients The email addressed of the recipients.
   * @param {String} params.collectionOptions The recipent right of the shared collection: view, edit
   * @return {Promise} Collection Returns a Promise that, when fulfilled, will either return an Object with the
   * collection or an Error with the problem.
   */
  shareCollection({ id, ...params } = {}) {
    if (!id) {
      return rejectValidation('collection', 'id');
    }
    if (!params.recipients) {
      return rejectValidation('collection', 'recipients');
    }
    if (!params.collectionOptions) {
      return rejectValidation('collection', 'collectionOptions');
    }

    return this.api.send('POST', `v4/collections/${id}/share/`, params);
  }

  /**
   * Get a list of brands and subbrands
   * @see {@link https://bynder.docs.apiary.io/#reference/security-roles/specific-security-profile/retrieve-brands-and-subbrands}
   * @return {Promise}
   */
  getBrands() {
    return this.api.send('GET', 'v4/brands/');
  }

  /**
   * Get options for a metaproperty
   * @see {@link https://bynder.docs.apiary.io/#reference/metaproperties/metaproperty-option-operations/retrieve-metaproperty-options|API Call}
   * @param {Object} params={} - An object containing the id of the desired metaproperty and parameters accepted by the
   * API to narrow the query for options
   * @param {String} params.id - The id of the desired metaproperty.
   * @return {Promise<array>} Response - Returns a Promise that, when fulfilled, will either return an Array with the
   * metaproperties or an Error with the problem.
   */
  getMetapropertyOptions({ id, ...params } = {}) {
    if (!id) {
      return rejectValidation('metapropertyOption', 'id');
    }

    return this.api.send('GET', `v4/metaproperties/${id}/options/`, params).then(data => {
      return Object.keys(data).map(metaproperty => data[metaproperty]);
    });
  }

  /**
   * Get the download url of original file.
   * @see {@link https://bynder.docs.apiary.io/#reference/download/download-operations/retrieve-asset-download-location|API Call}
   * @param {Object} params - An object containing the parameters accepted by the API to change in the asset.
   * @param {String} params.id - The id of the desired asset.
   * @returns {Promise}
   */
  getMediaDownloadUrl({ id, params } = {}) {
    if (!id) {
      return rejectValidation('media', 'id');
    }

    return this.api.send('GET', `v4/media/${id}/download`, { ...params });
  }

  /**
   * Finalises the file upload when all chunks finished uploading and registers it in Bynder.
   * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/4-finalise-a-completely-uploaded-file/finalise-a-completely-uploaded-file}
   * @param {String} fileId Unique file identifier
   * @param {String} fileName Original file name
   * @param {Number} chunksCount Number of chunks
   * @param {Number} fileSize File byte size
   * @return {Promise<object>} Object containing the correlation ID (`correlationId`) and file ID (`fileId`) of the upload
   */
  finaliseUpload(fileId, fileName, chunksCount, fileSize) {
    return this.api.send('POST', `v7/file_cmds/upload/${fileId}/finalise`, {
      chunksCount, fileName, fileSize
    })
      .then(response => response.headers['x-api-correlation-id']);
  }

  /**
   * Prepares the remote env to upload a new file
   * @return {Promise<string>} Unique file identificator
   */
  prepareUpload() {
    return this.api.send('POST', 'v7/file_cmds/upload/prepare')
      .then(response => response.file_id);
  }

  /**
   * Saves a media asset in Bynder. If media id is specified in the data a new version of the asset will be saved.
   * Otherwise a new asset will be saved.
   * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/4-finalise-a-completely-uploaded-file/save-as-a-new-asset}
   * @param {Object} data Asset data
   * @param {String} data.brandId Brand ID
   * @param {String} data.fileId File ID
   * @param {String} data.mediaId Media ID
   * @return {Promise<object>}
   */
  saveAsset(data) {
    if (!data.brandId) {
      return rejectValidation('upload', 'brandId');
    }

    const { fileId, mediaId } = data;
    let url = mediaId ? `v4/media/${mediaId}/save/` : 'v4/media/save/';

    if (fileId) {
      url += `${fileId}/`;
    }

    return this.api.send('POST', url, data);
  }

  /**
   * Uploads arbirtrarily sized buffer or stream file to provided S3 endpoint in chunks and registers each chunk to Bynder.
   * Resolves the passed init result and final chunk number.
   * @async
   * @param {Object} file An object containing the id of the desired collection.
   * @param {String} file.filename The file name of the file to be saved
   * @param {Buffer|Readable} file.body The file to be uploaded. Can be either buffer or a read stream.
   * @param {Number} file.length The length of the file to be uploaded
   * @param {String} fileId Unique file identifier
   * @param {Number} size File byte size
   * @return {Promisee<number>} Total number of chunks uploaded to the upload payload
   */
  async uploadFileInChunks(file, fileId, size) {
    const { body } = file;
    // Developers can use this to track file upload progress
    this._chunks = Math.ceil(size / FILE_CHUNK_SIZE);
    this._chunkNumber = 0;

    // Iterate over the chunks and send them
    while (this._chunkNumber <= (this._chunks - 1)) {
      const start = this._chunkNumber * FILE_CHUNK_SIZE;
      const end = Math.min(start + FILE_CHUNK_SIZE, size);
      const chunk = body.slice(start, end);
      const sha256 = crypto.createHash('sha256')
        .update(chunk)
        .digest('hex');

      await this.api
        .send('POST', `v7/file_cmds/upload/${fileId}/chunk/${this._chunkNumber}`, {
          chunk,
          additionalHeaders: {
            'Content-Sha256': sha256
          }
        })
        .catch(error => {
          throw new Error(`Chunk ${this._chunkNumber} not uploaded`, error);
        });

      this._chunkNumber++;
    }

    return this._chunks;
  }

  /**
   * Uploads an arbitrarily sized buffer or stream file and returns the uploaded asset information
   * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets}
   * @async
   * @param {Object} file An object containing the id of the desired collection.
   * @param {String} file.filename The file name of the file to be saved
   * @param {Buffer|Readable} file.body The file to be uploaded. Can be either buffer or a read stream.
   * @param {Number} file.length The length of the file to be uploaded
   * @param {Object} file.data An object containing the assets' attributes
   * @param {String} fileId Optional file UUID.V4 identifier
   * @return {Promise<object>} The information of the uploaded file, including IDs and all final file urls.
   */
  async uploadFile(file) {
    const { body, filename, data } = file;
    const { brandId } = data;
    const bodyType = bodyTypes.get(body);
    const size = getLength(file);

    if (!brandId) {
      return rejectValidation('upload', 'brandId');
    }

    if (!filename) {
      return rejectValidation('upload', 'filename');
    }

    if (!body || !bodyType) {
      return rejectValidation('upload', 'body');
    }

    if (!size || typeof size !== 'number') {
      return rejectValidation('upload', 'length');
    }

    this._chunks = undefined;
    this._chunkNumber = undefined;

    try {
      const fileId = await this.prepareUpload();
      const chunks = await this.uploadFileInChunks(file, fileId, size);
      const correlationId = await this.finaliseUpload(fileId, filename, chunks, size);
      const asset = await this.saveAsset({...data, fileId});

      return { fileId, correlationId, ...asset };
    } catch (error) {
      return Promise.reject({
        status: error.status || 0,
        message: error.message || `File not uploaded: ${filename}`
      });
    }
  }
}
