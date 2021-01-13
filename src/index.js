'use strict';

import simpleOAuth2 from 'simple-oauth2';
import url from 'url';
import ApiWrapper from './api';
import {rejectValidation, bodyTypes, getLength, create256HexHash} from './utils';
import {DEFAULT_ASSETS_NUMBER_PER_PAGE, FILE_CHUNK_SIZE, FORM_ENCODED_HEADER} from './constants';

/** Represents the Bynder SDK. It allows the user to make every call to the API with a single function */
class Bynder {
  /**
   * Create Bynder SDK.
   * @constructor
   * @param {Object} options An object containing the consumer keys, access keys and the base URL.
   * @param {String} options.baseURL The URL with the account domain
   * @param {String} options.clientId OAuth2 client id
   * @param {String} options.clientSecret OAuth2 client secret
   * @param {String} options.redirectUri Redirection URI
   * @param {String} options.token.access_token Optional access token
   * @param {String} options.httpsAgent Optional https agent
   * @param {String} options.httpAgent Optional http agent
   */
  constructor({baseURL, redirectUri, clientId, clientSecret, ...options}) {
    if (options.permanentToken) {
      throw new Error('Permanent tokens are no longer supported. Please use OAuth 2 authorization code or client credentials');
    }

    this.baseURL = baseURL;
    this.redirectUri = redirectUri;
    this.options = options;
    this.api = new ApiWrapper(baseURL, options.httpsAgent, options.httpAgent);

    const oauthBaseUrl = url.resolve(baseURL, '/v6/authentication/');

    this.oauth2 = simpleOAuth2.create({
      client: {
        id: clientId,
        secret: clientSecret
      },
      auth: {
        tokenHost: oauthBaseUrl,
        tokenPath: 'oauth2/token',
        revokePath: 'oauth2/revoke',
        authorizeHost: oauthBaseUrl,
        authorizePath: 'oauth2/auth'
      }
    });

    if (!options.token) {
      return;
    }

    if (typeof options.token.access_token !== 'string') {
      throw new Error(`Invalid token format: ${JSON.stringify(options.token, null, 2)}`);
    }

    this.api.token = this.oauth2.accessToken.create(options.token);
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
   * @param {String|Array<string>} scope List of scopes
   * @return {Promise<string>} access token
   */
  getToken(code, scope) {
    const tokenConfig = this.redirectUri ? {
      code,
      redirect_uri: this.redirectUri
    } : { scope };
    // If we're provided with client credentials,
    // then we need to use the correct object
    // to get the token.
    const authMechanism = this.redirectUri ? this.oauth2.authorizationCode : this.oauth2.clientCredentials;

    return authMechanism.getToken(tokenConfig).then(result => {
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
    return this.api.send('GET', 'api/v4/smartfilters/');
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

    return this.api.send('POST', 'api/v4/users/login/', params);
  }

  /**
   * Get the assets according to the parameters provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Assets Returns a Promise that, when fulfilled, will either return an Array with the assets or
   * an Error with the problem.
   */
  getMediaList(params = {}) {
    const payload = { ...params, count: false };

    if (Array.isArray(payload.propertyOptionId)) {
      payload.propertyOptionId = payload.propertyOptionId.join();
    }

    return this.api.send('GET', 'api/v4/media/', payload);
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

    return this.api.send('GET', `api/v4/media/${id}/`, options);
  }

  /**
   * Get all the assets starting from the page provided (1 by default) and incrementing according to the offset given.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Assets Returns a Promise that, when fulfilled, will either return an Array with all the
   * assets or an Error with the problem.
   */
  getAllMediaItems(params = {}) {
    const recursiveGetAssets = (_params, assets = []) => {
      let queryAssets = assets;
      const __params = { ..._params };
      __params.page = __params.page || 1;
      __params.limit = __params.limit || DEFAULT_ASSETS_NUMBER_PER_PAGE;

      return this.getMediaList(__params)
        .then(data => {
          queryAssets = assets.concat(data);

          if (data && data.length === __params.limit) {
            // If the results page is full it means another one might exist
            __params.page += 1;
            return recursiveGetAssets(__params, queryAssets);
          }

          return queryAssets;
        });
    };

    return recursiveGetAssets(params);
  }

  /**
   * Get the assets total according to the parameters provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Number Returns a Promise that, when fulfilled, will either return the number of assets
   * fitting the query or an Error with the problem.
   */
  getMediaTotal(params = {}) {
    const parametersObject = { ...params, count: true };
    if (Array.isArray(parametersObject.propertyOptionId)) {
      parametersObject.propertyOptionId = parametersObject.propertyOptionId.join();
    }
    return this.api.send('GET', 'api/v4/media/', parametersObject).then(({count}) => count.total);
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
      return rejectValidation('editMedia', 'id');
    }
    return this.api.send('POST', 'api/v4/media/', params);
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
      return rejectValidation('deleteMedia', 'id');
    }
    return this.api.send('DELETE', `api/v4/media/${id}/`);
  }

  /**
   * Get all the metaproperties
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/retrieve-metaproperties|API Call}
   * @param {Object} params An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Metaproperties Returns a Promise that, when fulfilled, will either return an Array with the
   * metaproperties or an Error with the problem.
   */
  getMetaproperties(params = {}) {
    return this.api.send('GET', 'api/v4/metaproperties/', params).then(response => Object.keys(response).map(metaproperty => response[metaproperty]));
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
    return this.api.send('GET', `api/v4/metaproperties/${id}/`);
  }

  /**
   * Save a new metaproperty in the information provided.
   * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/metaproperty-operations/create-metaproperty|API Call}
   * @param {Object} object An object containing the data of the new metaproperty.
   * @return {Promise} Object Returns a Promise that, when fulfilled, will either return an empty Object in
   * case it's successful or an Error with the problem.
   */
  saveNewMetaproperty(params = {}) {
    return this.api.send('POST', 'api/v4/metaproperties/', {
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
    return this.api.send('POST', `api/v4/metaproperties/${id}/`, {
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
    return this.api.send('DELETE', `api/v4/metaproperties/${id}/`);
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

    return this.api.send('POST', `api/v4/metaproperties/${id}/options/`, {
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
      `api/v4/metaproperties/${id}/options/${params.optionId}/`,
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
      `api/v4/metaproperties/${id}/options/${optionId}/`
    );
  }

  /**
   * Get the assets usage information according to the id provided.
   * @see {@link https://bynder.docs.apiary.io/#reference/asset-usage/asset-usage-operations/retrieve-asset-usage|API Call}
   * @param {Object} params An object containing the id of the desired asset.
   * @param {String} params.id The id of the desired asset to retrieve usage for.
   * @return {Promise} Asset Usage Returns a Promise that, when fulfilled, will either return an Object with
   * the asset usage or an Error with the problem.
   */
  getAssetUsage({id}) {
    if (!id) {
      return rejectValidation('asset usage', 'id');
    }

    return this.api.send('GET', 'api/media/usage/', { asset_id: id });
  }

  /**
   * Create a usage for an asset according to the provided query object.
   * @see {@link https://bynder.docs.apiary.io/#reference/asset-usage/asset-usage-operations/create-asset-usage|API Call}
   * @param {Object} params An object containing the properties for the desired asset usage.
   * @param {String} params.id The id of the desired asset to create a usage for.
   * @param {String} params.integration_id The id of the desired integration to add.
   * @param {String} params.timestamp Datetime. ISO8601 format: yyyy-mm-ddThh:mm:ssZ.
   * @param {String} params.uri Location. Example: /hippo/first_post.
   * @param {String} query`Object.a`dditional Additional information. Example: Usage description.
   * @return {Promise} Asset usage Returns a Promise that, when fulfilled, will either return an Object with
   * the asset usage or an Error with the problem.
   */
  saveNewAssetUsage(params) {
    if (!params.id) {
      return rejectValidation('asset usage', 'id');
    }

    if (!params.integration_id) {
      return rejectValidation('asset usage', 'integration_id');
    }

    return this.api.send('POST', 'api/media/usage/', {
      asset_id: params.id,
      integration_id: params.integration_id,
      timestamp: params.timestamp || null,
      uri: params.uri || null,
      additional: params.additional || null
    });
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

    return this.api.send('DELETE', 'api/media/usage/', {
      integration_id,
      asset_id: id,
      uri: uri || null
    });
  }

  /**
   * Get all the tags
   * @see {@link http://docs.bynder.apiary.io/#reference/tags/tags-access/retrieve-entry-point|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Tags Returns a Promise that, when fulfilled, will either return an Array with the
   * tags or an Error with the problem.
   */
  getTags(params = {}) {
    return this.api.send('GET', 'api/v4/tags/', params);
  }

  /**
   * Get collections according to the parameters provided
   * @see {@link http://docs.bynder.apiary.io/#reference/collections/collection-operations/retrieve-collections|API Call}
   * @param {Object} [params={}] An object containing the parameters accepted by the API to narrow the query.
   * @return {Promise} Collections Returns a Promise that, when fulfilled, will either return an Array with the
   * collections or an Error with the problem.
   */
  getCollections(params = {}) {
    return this.api.send('GET', 'api/v4/collections/', params);
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
    return this.api.send('GET', `api/v4/collections/${id}/`);
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
    return this.api.send('POST', 'api/v4/collections/', params);
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
    return this.api.send('POST', `api/v4/collections/${id}/media/`, {
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
    return this.api.send('DELETE', `api/v4/collections/${id}/media/`, {
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

    return this.api.send('POST', `api/v4/collections/${id}/share/`, params);
  }

  /**
   * Get a list of brands and subbrands
   * @see {@link https://bynder.docs.apiary.io/#reference/security-roles/specific-security-profile/retrieve-brands-and-subbrands}
   * @return {Promise}
   */
  getBrands() {
    return this.api.send('GET', 'api/v4/brands/');
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

    return this.api.send('GET', `api/v4/metaproperties/${id}/options/`, params);
  }

  /**
   * Get the download url of original file.
   * @see {@link https://bynder.docs.apiary.io/#reference/download/download-operations/retrieve-asset-download-location|API Call}
   * @param {Object} params - An object containing the parameters accepted by the API to change in the asset.
   * @param {String} params.id - The id of the desired asset.
   * @returns {Promise}
   */
  getMediaDownloadUrl({ id, ...params } = {}) {
    if (!id) {
      return rejectValidation('media', 'id');
    }

    return this.api.send('GET', `api/v4/media/${id}/download`, { ...params });
  }

  /**
   * Finalises the file upload when all chunks finished uploading and registers it in Bynder.
   * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/4-finalise-a-completely-uploaded-file/finalise-a-completely-uploaded-file}
   * @access private
   * @param {String} fileId Unique file identifier
   * @param {String} fileName Original file name
   * @param {Number} chunksCount Number of chunks
   * @param {Number} fileSize File byte size
   * @return {Promise<object>} Object containing the correlation ID (`correlationId`) and file ID (`fileId`) of the upload
   */
  _finaliseUpload(fileId, fileName, chunksCount, fileSize) {
    return this.api.send('POST', `v7/file_cmds/upload/${fileId}/finalise_api`, {
      chunksCount, fileName, fileSize,
      sha256: this._sha256
    }, {
      additionalHeaders: {
        'Content-Type': FORM_ENCODED_HEADER
      }
    })
      .then(response => response.headers['x-api-correlation-id']);
  }

  /**
   * Prepares the remote env to upload a new file
   * @access private
   * @return {Promise<string>} Unique file identificator
   */
  _prepareUpload() {
    return this.api.send('POST', 'v7/file_cmds/upload/prepare')
      .then(response => response.file_id);
  }

  /**
   * Saves a media asset in Bynder. If media id is specified in the data a new version of the asset will be saved.
   * Otherwise a new asset will be saved.
   * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/4-finalise-a-completely-uploaded-file/save-as-a-new-asset}
   * @access private
   * @param {Object} data Asset data
   * @param {String} data.fileId File ID
   * @param {String} data.mediaId Media ID
   * @param {String} data.name Asset name
   * @return {Promise<object>}
   */
  _saveAsset(data) {
    const { fileId, mediaId } = data;
    let url = mediaId ? `api/v4/media/${mediaId}/save/` : 'api/v4/media/save/';

    if (fileId) {
      url += `${fileId}/`;
    }

    return this.api.send('POST', url, data);
  }

  /**
   * Uploads a file chunk to the FS. It will try to upload again
   * (up to 4 times) if it fails.
   *
   * @access private
   * @param {Object} chunk Chunk to be uploaded
   * @param {Number} chunkNumber Chunk number
   * @param {String} fileId File ID
   * @param {String} sha256 Chunk SHA256
   * @param {Number} attempt Upload attempt
   * @returns {Promise<object>}
   */
  _uploadChunk(chunk, chunkNumber, fileId, sha256, attempt = 1) {
    return this.api.send('POST', `v7/file_cmds/upload/${fileId}/chunk/${chunkNumber}`, chunk, {
      additionalHeaders: {
        'Content-SHA256': sha256
      }
    }).catch(error => {
      // TODO: Evaluate the response error so we can filter
      // upload errors from communication errors
      if (attempt > 4) {
        /* istanbul ignore next */
        return Promise.reject(error);
      }

      attempt++;
      // If the upload fails, we'll call the method again
      return this._uploadChunk(chunk, chunkNumber, fileId, sha256, attempt);
    });
  }

  /**
   * Cycles through an in-memory buffered file in order to upload it to FS.
   *
   * @async
   * @access private
   * @param {Object} body File body
   * @param {String} fileId File ID
   * @param {Number} size File size
   * @returns {Promise<number>}
   */
  async _uploadBufferFile(body, fileId, size) {
    // Developers can use this to track file upload progress
    this._chunks = Math.ceil(size / FILE_CHUNK_SIZE);
    this._chunkNumber = 0;

    // Iterate over the chunks and send them
    while (this._chunkNumber <= (this._chunks - 1)) {
      const start = this._chunkNumber * FILE_CHUNK_SIZE;
      const end = Math.min(start + FILE_CHUNK_SIZE, size);
      const chunk = body.slice(start, end);
      const sha256 = create256HexHash(chunk);

      await this._uploadChunk(chunk, this._chunkNumber, fileId, sha256);

      this._chunkNumber++;
    }

    return this._chunks;
  }

  /**
   * Reads a file stream and uploads it to the FS
   *
   * @access private
   * @param {Object} stream File stream
   * @param {String} fileId File ID
   * @returns {Promise<number>}
   */
  _uploadStreamFile(stream, fileId) {
    // We need to force our chunk size on the stream
    stream._readableState.highWaterMark = FILE_CHUNK_SIZE;
    // Developers can use this to track file upload progress
    this._chunkNumber = 0;

    return new Promise((resolve, reject) => {
      stream.on('data', async chunk => {
        // Hol' up!
        stream.pause();
        const sha256 = create256HexHash(chunk);

        await this._uploadChunk(chunk, this._chunkNumber, fileId, sha256)
          /* istanbul ignore next */
          .catch(error => {
            stream.destroy();
            return reject(error);
          });

        this._chunkNumber++;
        // Continue!
        stream.resume();
      });

      /* istanbul ignore next */
      stream.on('error', (error) => {
        stream.destroy();
        return reject(error);
      });

      stream.on('end', () => resolve(this._chunkNumber));
    });
  }

  /**
   * Uploads arbirtrarily sized buffer or stream file to our file service in chunks.
   * Resolves the passed init result and final chunk number.
   * @async
   * @access private
   * @param {Object} file An object containing the id of the desired collection.
   * @param {String} file.filename The file name of the file to be saved
   * @param {Buffer|Readable} file.body The file to be uploaded. Can be either buffer or a read stream.
   * @param {Number} file.length The length of the file to be uploaded
   * @param {String} fileId Unique file identifier
   * @param {Number} size File byte size
   * @return {Promisee<number>} Total number of chunks uploaded to the upload payload
   */
  async _uploadFileInChunks(file, fileId, size, bodyType) {
    const { body } = file;

    switch (bodyType) {
    case bodyTypes.BUFFER:
      await this._uploadBufferFile(body, fileId, size);
      break;

    case bodyTypes.STREAM:
      this._chunks = await this._uploadStreamFile(body, fileId);
      break;

    default:
      return rejectValidation('uploadFile', 'bodyType');
    }

    return this._chunks;
  }

  /**
   * Uploads an arbitrarily sized buffer or stream file and returns the uploaded asset information
   * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets}
   * @async
   * @param {Object} file An object containing the id of the desired collection.
   * @param {String} file.filename The file name of the file to be saved
   * @param {Buffer|Readable} file.body The file to be uploaded. Can be either buffer or a readable stream.
   * @param {Number} file.length The length of the file to be uploaded
   * @param {Object} file.data An object containing the assets' attributes
   * @param {String} fileId Optional file UUID.V4 identifier
   * @return {Promise<object>} The information of the uploaded file, including IDs and all final file urls.
   */
  async uploadFile(file) {
    const { body, filename, data } = file;
    const bodyType = bodyTypes.get(body);
    const size = getLength(file);

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
    this._sha256 = create256HexHash(file.body);

    try {
      const fileId = await this._prepareUpload();
      const chunks = await this._uploadFileInChunks(file, fileId, size, bodyType);
      const correlationId = await this._finaliseUpload(fileId, filename, chunks, size);
      const asset = await this._saveAsset({...data, fileId});

      this.sha256 = undefined;

      return { fileId, correlationId, ...asset };
    } catch (error) {
      return Promise.reject({
        status: error.status || 0,
        message: error.message || `File not uploaded: ${filename}`
      });
    }
  }
}

export default Bynder;
