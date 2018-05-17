import 'isomorphic-form-data';
import OAuth from 'oauth-1.0a';
import axios from 'axios';
import util from './util';

const defaultAssetsNumberPerPage = 50;

/**
 * Rejects the request.
 * @return {Promise} error - Returns a Promise with the details for wrong base URL.
 */
function rejectURL() {
    return Promise.reject({
        status: 0,
        message: 'The base URL provided is not valid'
    });
}

/**
 * Rejects the request.
 * @return {Promise} error - Returns a Promise with the details for the wrong request.
 */
function rejectValidation(module, param) {
    return Promise.reject({
        status: 0,
        message: `The ${module} ${param} is not valid or it was not specified properly`
    });
}

/**
 * @classdesc Represents an API call.
 * @class
 * @abstract
 */
class APICall {
    /**
     * Create a APICall.
     * @constructor
     * @param {string} baseURL - A string with the base URL for account.
     * @param {string} url - A string with the name of the API method.
     * @param {string} method - A string with the method of the API call.
     * @param {Object} consumerToken - An object with both the public and secret consumer keys.
     * @param {Object} accessToken - An object with both the public and secret access keys.
     * @param {Object} [data={}] - An object containing the query parameters.
     */
    constructor(baseURL, url, method, consumerToken, accessToken, data = {}) {
        this.requestData = {};
        this.callURL = this.requestData.url = baseURL + url;
        this.method = this.requestData.method = method;
        this.consumerToken = consumerToken;
        this.accessToken = accessToken;
        this.data = data;
    }

    /**
     * Creates the Authorization header.
     * @return {Object} header - Returns an object with the Authorization header and its signed content.
     */
    createAuthHeader() {
        const oauth = new OAuth({
            consumer: {
                public: this.consumerToken.public,
                secret: this.consumerToken.secret
            }
        });
        return oauth.toHeader(oauth.authorize(this.requestData, this.accessToken));
    }

    /**
     * Encode the data object to URI.
     * @return {string} - Returns the URI string equivalent to the data object of the request.
     */
    urlEncodeData() {
        let requestBody = '';
        for (const key of Object.keys(this.data)) {
            const value = this.data[key];
            if (value === undefined) {
                delete this.data[key];
            } else {
                requestBody += `${encodeURI(key)}=${encodeURI(value)}&`;
            }
        }
        requestBody = requestBody.slice(0, -1);
        return requestBody;
    }

    /**
     * Fetch the information from the API.
     * @return {Promise} - Returns a Promise that, when fulfilled, will either return an JSON Object with the requested
     * data or an Error with the problem.
     */
    send() {
        const paramEncoded = this.urlEncodeData();
        this.requestData.data = this.data;
        const headers = this.createAuthHeader();
        let body = '';
        if (this.method === 'POST') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            body = paramEncoded;
        } else if (Object.keys(this.data).length && this.data.constructor === Object) {
            this.callURL += '?';
            this.callURL += paramEncoded;
        }

        return axios(this.callURL, {
            method: this.method,
            data: body,
            headers
        })
        .then((response) => {
            if (response.status >= 400) { // check for 4XX, 5XX, wtv
                return Promise.reject({
                    status: response.status,
                    message: response.statusText
                });
            }
            if (response.status >= 200 && response.status <= 202) {
                return response.data;
            }
            return {};
        });
    }
}

/**
 * @classdesc Represents the Bynder SDK. It allows the user to make every call to the API with a single function.
 * @class
 */
export default class Bynder {
    /**
     * Create Bynder SDK.
     * @constructor
     * @param {String} options.consumer.public - The public consumer key.
     * @param {String} options.consumer.secret - The consumer secret.
     * @param {String} options.accessToken.public - The access token.
     * @param {String} options.accessToken.secret - The access token secret.
     * @param {String} options.baseURL - The URL with the account domain.
     * @param {Object} options - An object containing the consumer keys, access keys and the base URL.
     */
    constructor(options) {
        this.consumerToken = options.consumer;
        this.accessToken = options.accessToken;
        this.baseURL = options.baseURL;
    }

    /**
     * Check if the API URL is valid.
     * @return {Boolean} - Returns a boolean corresponding the URL correctness.
     */
    validURL() {
        return this.baseURL;
    }

    /**
     * Get all the categories.
     * @see {@link http://docs.bynder.apiary.io/#reference/categories/retrieve-categories/retrieve-categories|API Call}
     * @return {Promise} Categories - Returns a Promise that, when fulfilled, will either return an Array with the
     * categories or an Error with the problem.
     */
    getCategories() {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/categories/',
            'GET',
            this.consumerToken,
            this.accessToken
        );
        return request.send();
    }

    /**
     * Login to retrieve OAuth credentials.
     * @see {@link http://docs.bynder.apiary.io/#reference/users/-deprecated-login-a-user-retrieve-coupled-oauth-credentials/login-a-user|API Call}
     * @param {Object} queryObject={} - An object containing the credentials with which the user intends to login.
     * @param {String} queryObject.username - The username of the user.
     * @param {String} queryObject.password - The password of the user.
     * @param {String} queryObject.consumerId - The consumerId of the user.
     * @return {Promise} Credentials - Returns a Promise that, when fulfilled, will either return an Object with the
     * OAuth credentials for login or an Error with the problem.
     */
    userLogin(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!queryObject.username || !queryObject.password || !queryObject.consumerId) {
            return rejectValidation('authentication', 'username, password or consumerId');
        }
        const request = new APICall(
            this.baseURL,
            'v4/users/login/',
            'POST',
            this.consumerToken,
            this.accessToken,
            queryObject
        );
        return request.send();
    }

    /**
     * Get the request token and secret.
     * @see {@link http://docs.bynder.apiary.io/#reference/consumers-and-access-tokens/1-obtain-a-request-token-pair/obtain-a-request-token-pair|API Call}
     * @return {Promise} Credentials - Returns a Promise that, when fulfilled, will either return an string with the
     * couple of consumer token/secret or an Error with the problem.
     */
    getRequestToken() {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/oauth/request_token/',
            'POST',
            this.consumerToken,
            {
                public: null,
                secret: null
            }
        );
        return request.send();
    }

    /**
     * Get the URL to authorise the token.
     * @see {@link http://docs.bynder.apiary.io/#reference/consumers-and-access-tokens/2-authorise-authenticate/authorise-&-authenticate|API Call}
     * @param {String} token - The token to be authorised.
     * @param {String} [callback] - The callback to which the page will be redirected after authenticating the token.
     * @return {String} URL - Returns a String with the URL to the token authorisation page.
     */
    getAuthorisedURL(token, callback = undefined) {
        if (!this.validURL()) {
            return this.baseURL;
        }
        let authoriseToken = `${this.baseURL}v4/oauth/authorise/?oauth_token=${token}`;
        if (callback) {
            authoriseToken += `&callback=${callback}`;
        }
        return authoriseToken;
    }

    /**
     * Get the access token and secret.
     * @see {@link http://docs.bynder.apiary.io/#reference/consumers-and-access-tokens/3-exchange-the-request-token-pair-for-an-access-token-pair/exchange-the-request-token-pair-for-an-access-token-pair|API Call}
     * @param {string} token - A string containing the authorised token provided by the API.
     * @param {string} secret - A string containing the authorised secret provided by the API.
     * @return {Promise} Credentials - Returns a Promise that, when fulfilled, will either return an Object with the
     * OAuth credentials for login or an Error with the problem.
     */
    getAccessToken(token, secret) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/oauth/access_token/',
            'POST',
            this.consumerToken,
            {
                public: token,
                secret
            }
        );
        return request.send();
    }

    /**
     * Get the assets according to the parameters provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
     * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
     * @return {Promise} Assets - Returns a Promise that, when fulfilled, will either return an Array with the assets or
     * an Error with the problem.
     */
    getMediaList(queryObject = {}) {
        const parametersObject = queryObject;
        if (!this.validURL()) {
            return rejectURL();
        }
        parametersObject.count = false; // The API will return a different response format in case this is true
        if (Array.isArray(parametersObject.propertyOptionId)) {
            parametersObject.propertyOptionId = parametersObject.propertyOptionId.join();
        }
        const request = new APICall(
            this.baseURL,
            'v4/media/',
            'GET',
            this.consumerToken,
            this.accessToken,
            parametersObject
        );
        return request.send();
    }

    /**
     * Get the assets information according to the id provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/assets/specific-asset-operations/retrieve-specific-asset|API Call}
     * @param {Object} queryObject - An object containing the id and the version of the desired asset.
     * @param {String} queryObject.id - The id of the desired asset.
     * @param {Number} [queryObject.version] - The version of the desired asset.
     * @return {Promise} Asset - Returns a Promise that, when fulfilled, will either return an Object with the asset or
     * an Error with the problem.
     */
    getMediaInfo(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!queryObject.id) {
            return rejectValidation('media', 'id');
        }
        const request = new APICall(
            this.baseURL,
            `v4/media/${queryObject.id}/`,
            'GET',
            this.consumerToken,
            this.accessToken,
            { versions: queryObject.versions }
        );
        return request.send();
    }

    /**
     * Get all the assets starting from the page provided (1 by default) and incrementing according to the offset given.
     * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
     * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
     * @return {Promise} Assets - Returns a Promise that, when fulfilled, will either return an Array with all the
     * assets or an Error with the problem.
     */
    getAllMediaItems(queryObject = {}) {
        const recursiveGetAssets = (queryObject, assets) => {
            let queryAssets = assets;
            const passingProperties = queryObject;
            passingProperties.page = !passingProperties.page ? 1 : passingProperties.page;
            passingProperties.limit = !passingProperties.limit ? defaultAssetsNumberPerPage : passingProperties.limit;

            return this.getMediaList(passingProperties)
            .then((data) => {
                queryAssets = assets.concat(data);
                if (data && data.length === passingProperties.limit) { // If the results page is full it means another one might exist
                    passingProperties.page += 1;
                    return recursiveGetAssets(passingProperties, queryAssets);
                }
                return queryAssets;
            })
            .catch((error) => {
                return error;
            });
        };

        return recursiveGetAssets(queryObject, []);
    }

    /**
     * Get the assets total according to the parameters provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
     * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
     * @return {Promise} Number - Returns a Promise that, when fulfilled, will either return the number of assets
     * fitting the query or an Error with the problem.
     */
    getMediaTotal(queryObject = {}) {
        const parametersObject = queryObject;
        if (!this.validURL()) {
            return rejectURL();
        }
        parametersObject.count = true;
        if (Array.isArray(parametersObject.propertyOptionId)) {
            parametersObject.propertyOptionId = parametersObject.propertyOptionId.join();
        }
        const request = new APICall(
            this.baseURL,
            'v4/media/',
            'GET',
            this.consumerToken,
            this.accessToken,
            parametersObject
        );
        return request.send()
            .then((data) => {
                return data.count.total;
            });
    }

    /**
     * Edit an existing asset with the information provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/assets/specific-asset-operations/modify-asset|API Call}
     * @param {Object} object={} - An object containing the parameters accepted by the API to change in the asset.
     * @param {String} object.id - The id of the desired asset.
     * @return {Promise} Object - Returns a Promise that, when fulfilled, will either return an empty Object in
     * case it's successful or an Error with the problem.
     */
    editMedia(object) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!object.id) {
            return rejectValidation('media', 'id');
        }
        const request = new APICall(
            this.baseURL,
            'v4/media/',
            'POST',
            this.consumerToken,
            this.accessToken,
            object
        );
        return request.send();
    }

    /**
     * Get all the metaproperties
     * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/retrieve-metaproperties|API Call}
     * @param {Object} queryObject={} - An object containing the parameters accepted by the API to narrow the query.
     * @return {Promise} Metaproperties - Returns a Promise that, when fulfilled, will either return an Array with the
     * metaproperties or an Error with the problem.
     */
    getMetaproperties(queryObject = {}) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/metaproperties/',
            'GET',
            this.consumerToken,
            this.accessToken,
            queryObject
        );
        return request.send()
            .then((data) => {
                return Object.keys(data).map((metaproperty) => {
                    return data[metaproperty];
                });
            });
    }

    /**
     * Get the metaproperty information according to the id provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/specific-metaproperty-operations/retrieve-specific-metaproperty|API Call}
     * @param {Object} queryObject={} - An object containing the id of the desired metaproperty.
     * @param {String} queryObject.id - The id of the desired metaproperty.
     * @return {Promise} Metaproperty - Returns a Promise that, when fulfilled, will either return an Object with the
     * metaproperty or an Error with the problem.
     */
    getMetaproperty(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!queryObject.id) {
            return rejectValidation('metaproperty', 'id');
        }
        const request = new APICall(
            this.baseURL,
            `v4/metaproperties/${queryObject.id}/`,
            'GET',
            this.consumerToken,
            this.accessToken
        );
        return request.send();
    }

    /**
     * Save a new metaproperty in the information provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/metaproperty-operations/create-metaproperty|API Call}
     * @param {Object} object={} - An object containing the data of the new metaproperty.
     * @return {Promise} Object - Returns a Promise that, when fulfilled, will either return an empty Object in
     * case it's successful or an Error with the problem.
     */
    saveNewMetaproperty(object) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/metaproperties/',
            'POST',
            this.consumerToken,
            this.accessToken,
            { data: JSON.stringify(object) } // The API requires an object with the query content stringified inside
        );
        return request.send();
    }

    /**
     * Modify new metaproperty with the information provided.
     * @see {@link https://bynder.docs.apiary.io/#reference/metaproperties/specific-metaproperty-operations/modify-metaproperty|API Call}
     * @param {Object} object={} - An object containing the data of the metaproperty.
     * @param {String} queryObject.id - The id of the desired metaproperty.
     * @return {Promise} Object - Returns a Promise that, when fulfilled, will either return an empty Object in
     * case it's successful or an Error with the problem.
     */
    editMetaproperty(object) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!object.id) {
            return rejectValidation('metaproperty', 'id');
        }
        const request = new APICall(
            this.baseURL,
            `v4/metaproperties/${object.id}/`,
            'POST',
            this.consumerToken,
            this.accessToken,
            { data: JSON.stringify(object) } // The API requires an object with the query content stringified inside
        );
        return request.send();
    }

    /**
     * Delete the metaproperty with the provided id.
     * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/delete-metaproperty|API Call}
     * @param {Object} object={} - An object containing the id of the metaproperty to be deleted.
     * @param {String} object.id - The id of the metaproperty.
     * @return {Promise} Object - Returns a Promise that, when fulfilled, will either return an empty Object in
     * case it's successful or an Error with the problem.
     */
    deleteMetaproperty(object) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!object.id) {
            return rejectValidation('metaproperty', 'id');
        }
        const request = new APICall(
            this.baseURL,
            `v4/metaproperties/${object.id}/`,
            'DELETE',
            this.consumerToken,
            this.accessToken
        );
        return request.send();
    }

    /**
     * Get all the tags
     * @see {@link http://docs.bynder.apiary.io/#reference/tags/tags-access/retrieve-entry-point|API Call}
     * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
     * @return {Promise} Tags - Returns a Promise that, when fulfilled, will either return an Array with the
     * tags or an Error with the problem.
     */
    getTags(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/tags/',
            'GET',
            this.consumerToken,
            this.accessToken,
            queryObject
        );
        return request.send();
    }

    /**
     * Get collections according to the parameters provided
     * @see {@link http://docs.bynder.apiary.io/#reference/collections/collection-operations/retrieve-collections|API Call}
     * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
     * @return {Promise} Collections - Returns a Promise that, when fulfilled, will either return an Array with the
     * collections or an Error with the problem.
     */
    getCollections(queryObject = {}) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/collections/',
            'GET',
            this.consumerToken,
            this.accessToken,
            queryObject
        );
        return request.send();
    }

    /**
     * Get the collection information according to the id provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/retrieve-specific-collection|API Call}
     * @param {Object} queryObject={} - An object containing the id of the desired collection.
     * @param {String} queryObject.id - The id of the desired collection.
     * @return {Promise} Collection - Returns a Promise that, when fulfilled, will either return an Object with the
     * collection or an Error with the problem.
     */
    getCollection(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!queryObject.id) {
            return rejectValidation('collection', 'id');
        }
        const request = new APICall(
            this.baseURL,
            `v4/collections/${queryObject.id}/`,
            'GET',
            this.consumerToken,
            this.accessToken
        );
        return request.send();
    }

    /**
     * Get a list of brands and subbrands
     * @see {@link https://bynder.docs.apiary.io/#reference/security-roles/specific-security-profile/retrieve-brands-and-subbrands}
     * @return {Promise}
     */
    getBrands() {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/brands/',
            'GET',
            this.consumerToken,
            this.accessToken
        );
        return request.send();
    }

    /**
     * Gets the closest Amazon S3 bucket location to upload to.
     * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/1-get-closest-amazons3-upload-endpoint/get-closest-amazons3-upload-endpoint}
     * @return {Promise} Amazon S3 location url string.
     */
    getClosestUploadEndpoint() {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'upload/endpoint',
            'GET',
            this.consumerToken,
            this.accessToken
        );
        return request.send();
    }

    /**
     * Starts the upload process. Registers a file upload with Bynder and returns authorisation information to allow
     * uploading to the Amazon S3 bucket-endpoint.
     * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/2-initialise-upload/initialise-upload}
     * @param {String} filename - filename
     * @return {Promise} Relevant S3 file information, necessary for the file upload.
     */
    initUpload(filename) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!filename || filename.length === 0) {
            return rejectValidation('upload', 'filename');
        }
        const request = new APICall(
            this.baseURL,
            'upload/init',
            'POST',
            this.consumerToken,
            this.accessToken,
            { filename },
        );
        return request.send();
    }

    /**
     * Registers a temporary chunk in Bynder.
     * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/3-upload-file-in-chunks-and-register-every-uploaded-chunk/register-uploaded-chunk}
     * @param {Object} init - result from init upload
     * @param {Number} chunk - chunk id
     * @return {Promise}
     */
    registerChunk(init, chunk) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const { s3file, s3_filename: filename } = init;
        const { uploadid, targetid } = s3file;
        const request = new APICall(
            this.baseURL,
            'v4/upload/',
            'POST',
            this.consumerToken,
            this.accessToken,
            {
                id: uploadid,
                targetid,
                filename: `${filename}/p${chunk}`,
                chunkNumber: chunk
            }
        );
        return request.send();
    }

    /**
     * Finalises the file upload when all chunks finished uploading and registers it in Bynder.
     * @param {Object} init - result from init upload
     * @param {Number} chunk - chunk id
     * @return {Promise}
     */
    finalizeUpload(init, filename, chunks) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const { s3file, s3_filename: s3filename } = init;
        const { uploadid, targetid } = s3file;
        const request = new APICall(
            this.baseURL,
            `v4/upload/${uploadid}/`,
            'POST',
            this.consumerToken,
            this.accessToken,
            {
                targetid,
                s3_filename: `${s3filename}/p${chunks}`,
                original_filename: filename,
                chunks
            }
        );
        return request.send();
    }

    /**
     * Checks if the files have finished uploading.
     * @param {String[]} importIds - The import IDs of the files to be checked.
     * @return {Promise}
     */
    pollUploadStatus(importIds) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const request = new APICall(
            this.baseURL,
            'v4/upload/poll/',
            'GET',
            this.consumerToken,
            this.accessToken,
            { items: importIds.join(',') }
        );
        return request.send();
    }

    /**
     * Saves a media asset in Bynder. If media id is specified in the data a new version of the asset will be saved.
     * Otherwise a new asset will be saved.
     * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets/4-finalise-a-completely-uploaded-file/save-as-a-new-asset}
     * @param {Object} data - Asset data
     * @return {Promise}
     */
    saveAsset(data) {
        if (!this.validURL()) {
            return rejectURL();
        }
        const { brandId, mediaId } = data;
        if (!brandId || brandId === '') {
            return rejectValidation('upload', 'brandId');
        }
        const saveURL = mediaId ? `v4/media/${mediaId}/save/` : 'v4/media/save/';
        const request = new APICall(
            this.baseURL,
            saveURL,
            'POST',
            this.consumerToken,
            this.accessToken,
            data
        );
        return request.send();
    }

    /**
     * Uploads an arbitrarily sized buffer or stream file and returns the uploaded asset information
     * @see {@link https://bynder.docs.apiary.io/#reference/upload-assets}
     * @param {Object} file={} - An object containing the id of the desired collection.
     * @param {String} file.filename - The file name of the file to be saved
     * @param {Buffer|Readable} file.body - The file to be uploaded. Can be either buffer or a read stream.
     * @param {Number} file.length - The length of the file to be uploaded
     * @param {Object} file.data={} - An object containing the assets' attributes
     * @return {Promise} The information of the uploaded file, including IDs and all final file urls.
     */
    uploadFile(file) {
        const { body, filename, data } = file;
        const { brandId } = data;
        const isBuffer = Buffer.isBuffer(body);
        const isStream = typeof body.read === 'function';
        const length = isBuffer ? body.length : file.length;

        if (!this.validURL()) {
            return rejectURL();
        }
        if (!brandId || brandId === '') {
            return rejectValidation('upload', 'brandId');
        }
        if (!filename || filename === '') {
            return rejectValidation('upload', 'filename');
        }
        if (!body || (!isStream && !isBuffer)) {
            return rejectValidation('upload', 'body');
        }
        if (!length || typeof length !== 'number') {
            return rejectValidation('upload', 'length');
        }

        const getClosestUploadEndpoint = this.getClosestUploadEndpoint.bind(this);
        const initUpload = this.initUpload.bind(this);
        const registerChunk = this.registerChunk.bind(this);
        const finalizeUpload = this.finalizeUpload.bind(this);
        const pollUploadStatus = this.pollUploadStatus.bind(this);
        const saveAsset = this.saveAsset.bind(this);

        return Promise.all([
            getClosestUploadEndpoint(),
            initUpload(filename)
        ])
        .then((res) => {
            const [endpoint, init] = res;
            const uploadPath = init.multipart_params.key;

            // count number of chunks
            const CHUNK_SIZE = 1024 * 1024 * 5;
            const chunks = Math.ceil(length / CHUNK_SIZE);

            const uploadChunkToS3 = (chunkData, chunk) => {
                const form = new FormData();
                const params = Object.assign(init.multipart_params, {
                    name: `${util.basename(uploadPath)}/p${chunk}`,
                    chunk,
                    chunks,
                    Filename: `${uploadPath}/p${chunk}`,
                    key: `${uploadPath}/p${chunk}`
                });
                Object.keys(params).forEach((key) => {
                    form.append(key, params[key]);
                });
                form.append('file', chunkData);
                const headers = Object.assign(form.getHeaders(), {
                    'content-length': form.getLengthSync()
                });
                return axios.post(endpoint, form, { headers });
            };

            // sequentially upload chunks to AWS, then register them
            let chunk = 0;
            if (isBuffer) {
                // buffer input
                return new Promise((resolve, reject) => {
                    (function nextChunk() {
                        if (chunk < chunks) {
                            const start = chunk * CHUNK_SIZE;
                            const end = Math.min(start + CHUNK_SIZE, length);
                            const chunkData = body.slice(start, end);
                            uploadChunkToS3(chunkData, ++chunk)
                                .then(() => {
                                    return registerChunk(init, chunk);
                                })
                                .then(nextChunk)
                                .catch(reject);
                        } else {
                            // pass init and chunk number to finalize
                            resolve({ init, chunk });
                        }
                    }());
                });
            }

            // readable stream input
            return new Promise((resolve, reject) => {
                (function nextChunk() {
                    if (chunk < chunks) {
                        const chunkData = body.read(CHUNK_SIZE);
                        if (chunkData !== null) {
                            uploadChunkToS3(chunkData, ++chunk)
                                .then(() => {
                                    return registerChunk(init, chunk);
                                })
                                .then(nextChunk)
                                .catch(reject);
                        } else {
                            // our read stream is not done yet reading
                            // let's wait for a while...
                            setTimeout(nextChunk, 50);
                        }
                    } else {
                        // pass init and chunk number to finalize
                        resolve({ init, chunk });
                    }
                }());
            });
        })
        .then((uploadResponse) => {
            const { init, chunk } = uploadResponse;
            return finalizeUpload(init, filename, chunk);
        })
        .then((finalizeResponse) => {
            const { importId } = finalizeResponse;
            return new Promise((resolve, reject) => {
                const POLLING_INTERVAL = 2000;
                const MAX_POLLING_ATTEMPTS = 60;
                let attempt = 0;
                (function checkStatus() {
                    pollUploadStatus([importId]).then((pollStatus) => {
                        if (pollStatus !== null) {
                            const { itemsDone, itemsFailed } = pollStatus;
                            if (itemsDone.length > 0) {
                                // done !
                                return resolve({ itemsDone });
                            }
                            if (itemsFailed.length > 0) {
                                // failed
                                return reject({ itemsFailed });
                            }
                        }
                        if (++attempt > MAX_POLLING_ATTEMPTS) {
                            // timed oddut
                            return reject(new Error(`Stopped polling after ${attempt} attempts`));
                        }
                        return setTimeout(checkStatus, POLLING_INTERVAL);
                    }).catch(reject);
                }());
            });
        })
        .then((doneResponse) => {
            const { itemsDone } = doneResponse;
            const importId = itemsDone[0];
            return saveAsset(Object.assign(data, { importId }));
        });
    }
}
