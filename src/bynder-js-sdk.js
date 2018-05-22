import OAuth from 'oauth-1.0a';
import axios from 'axios';

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
     * Create the collection information according to the name provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/create-collection|API Call}
     * @param {Object} queryObject={} - An object containing the id of the desired collection.
     * @param {String} queryObject.name - The name of the desired collection.
     * @param {String} queryObject.description - The description of the desired collection.
     * @return {Promise} Collection - Returns a Promise that, when fulfilled, will either return an Object with the
     * collection or an Error with the problem.
     */
    createCollection(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!queryObject.name) {
            return rejectValidation('collection', 'name');
        }
        const request = new APICall(
            this.baseURL,
            'v4/collections/',
            'POST',
            this.consumerToken,
            this.accessToken,
            queryObject,
        );
        return request.send();
    }

    /**
     * Share the collection to the recipients provided.
     * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/share-collection|API Call}
     * @param {Object} queryObject={} - An object containing the id of the desired collection.
     * @param {String} queryObject.id - The id of the shared collection.
     * @param {String} queryObject.recipients - The email addressed of the recipients.
     * @param {String} queryObject.collectionOptions - The recipent right of the shared collection: view, edit
     * @return {Promise} Collection - Returns a Promise that, when fulfilled, will either return an Object with the
     * collection or an Error with the problem.
     */
    shareCollection(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!queryObject.id || !queryObject.recipients || !queryObject.collectionOptions) {
            return rejectValidation('collection', 'id, recipients or collectionOptions');
        }
        const request = new APICall(
            this.baseURL,
            `v4/collections/${queryObject.id}/share/`,
            'POST',
            this.consumerToken,
            this.accessToken,
            queryObject,
        );
        return request.send();
    }

    /**
     * Add assets to the desired collection.
     * @see {@link http://docs.bynder.apiary.io/#reference/collections/specific-collection-operations/add-asset-to-a-collection|API Call}
     * @param {Object} queryObject={} - An object containing the id of the desired collection.
     * @param {String} queryObject.id - The id of the shared collection.
     * @param {String} queryObject.data - JSON-serialised list of asset ids to add.
     * @return {Promise} Collection - Returns a Promise that, when fulfilled, will either return an Object with the
     * collection or an Error with the problem.
     */
    addMediaToCollection(queryObject) {
        if (!this.validURL()) {
            return rejectURL();
        }
        if (!queryObject.id || !queryObject.data || queryObject.data.length === 0) {
            return rejectValidation('collection', 'data');
        }
        const request = new APICall(
            this.baseURL,
            `v4/collections/${queryObject.id}/media/`,
            'POST',
            this.consumerToken,
            this.accessToken,
            { data: JSON.stringify(queryObject.data) }, // The API requires JSON-serialised list
        );
        return request.send();
    }
}
