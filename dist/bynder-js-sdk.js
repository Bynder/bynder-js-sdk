
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _oauth = require('oauth-1.0a');

var _oauth2 = _interopRequireDefault(_oauth);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultAssetsNumberPerPage = 50;

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
        message: 'The ' + module + ' ' + param + ' is not valid or it was not specified properly'
    });
}

/**
 * @classdesc Represents an API call.
 * @class
 * @abstract
 */

var APICall = function () {
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
    function APICall(baseURL, url, method, consumerToken, accessToken) {
        var data = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};

        _classCallCheck(this, APICall);

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


    _createClass(APICall, [{
        key: 'createAuthHeader',
        value: function createAuthHeader() {
            var oauth = new _oauth2.default({
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

    }, {
        key: 'urlEncodeData',
        value: function urlEncodeData() {
            var requestBody = '';
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = Object.keys(this.data)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var key = _step.value;

                    var value = this.data[key];
                    if (value === undefined) {
                        delete this.data[key];
                    } else {
                        requestBody += encodeURI(key) + '=' + encodeURI(value) + '&';
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
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

    }, {
        key: 'send',
        value: function send() {
            var paramEncoded = this.urlEncodeData();
            this.requestData.data = this.data;
            var headers = this.createAuthHeader();
            var body = '';
            if (this.method === 'POST') {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                body = paramEncoded;
            } else if (Object.keys(this.data).length && this.data.constructor === Object) {
                this.callURL += '?';
                this.callURL += paramEncoded;
            }

            return (0, _axios2.default)(this.callURL, {
                method: this.method,
                data: body,
                headers: headers
            }).then(function (response) {
                if (response.status >= 400) {
                    // check for 4XX, 5XX, wtv
                    return Promise.reject({
                        status: response.status,
                        message: response.statusText
                    });
                }
                if (response.status === 200) {
                    return response.data;
                }
                return {};
            });
        }
    }]);

    return APICall;
}();

/**
 * @classdesc Represents the Bynder SDK. It allows the user to make every call to the API with a single function.
 * @class
 */


var Bynder = function () {
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
    function Bynder(options) {
        _classCallCheck(this, Bynder);

        this.consumerToken = options.consumer;
        this.accessToken = options.accessToken;
        this.baseURL = options.baseURL;
    }

    /**
     * Check if the API URL is valid.
     * @return {Boolean} - Returns a boolean corresponding the URL correctness.
     */


    _createClass(Bynder, [{
        key: 'validURL',
        value: function validURL() {
            return this.baseURL;
        }

        /**
         * Get all the categories.
         * @see {@link http://docs.bynder.apiary.io/#reference/categories/retrieve-categories/retrieve-categories|API Call}
         * @return {Promise} Categories - Returns a Promise that, when fulfilled, will either return an Array with the
         * categories or an Error with the problem.
         */

    }, {
        key: 'getCategories',
        value: function getCategories() {
            if (!this.validURL()) {
                return rejectURL();
            }
            var request = new APICall(this.baseURL, 'v4/categories/', 'GET', this.consumerToken, this.accessToken);
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

    }, {
        key: 'userLogin',
        value: function userLogin(queryObject) {
            if (!this.validURL()) {
                return rejectURL();
            }
            if (!queryObject.username || !queryObject.password || !queryObject.consumerId) {
                return rejectValidation('authentication', 'username, password or consumerId');
            }
            var request = new APICall(this.baseURL, 'v4/users/login/', 'POST', this.consumerToken, this.accessToken, queryObject);
            return request.send();
        }

        /**
         * Get the request token and secret.
         * @see {@link http://docs.bynder.apiary.io/#reference/consumers-and-access-tokens/1-obtain-a-request-token-pair/obtain-a-request-token-pair|API Call}
         * @return {Promise} Credentials - Returns a Promise that, when fulfilled, will either return an string with the
         * couple of consumer token/secret or an Error with the problem.
         */

    }, {
        key: 'getRequestToken',
        value: function getRequestToken() {
            if (!this.validURL()) {
                return rejectURL();
            }
            var request = new APICall(this.baseURL, 'v4/oauth/request_token/', 'POST', this.consumerToken, {
                public: null,
                secret: null
            });
            return request.send();
        }

        /**
         * Get the URL to authorise the token.
         * @see {@link http://docs.bynder.apiary.io/#reference/consumers-and-access-tokens/2-authorise-authenticate/authorise-&-authenticate|API Call}
         * @param {String} token - The token to be authorised.
         * @param {String} [callback] - The callback to which the page will be redirected after authenticating the token.
         * @return {String} URL - Returns a String with the URL to the token authorisation page.
         */

    }, {
        key: 'getAuthorisedURL',
        value: function getAuthorisedURL(token) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

            if (!this.validURL()) {
                return this.baseURL;
            }
            var authoriseToken = this.baseURL + 'v4/oauth/authorise/?oauth_token=' + token;
            if (callback) {
                authoriseToken += '&callback=' + callback;
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

    }, {
        key: 'getAccessToken',
        value: function getAccessToken(token, secret) {
            if (!this.validURL()) {
                return rejectURL();
            }
            var request = new APICall(this.baseURL, 'v4/oauth/access_token/', 'POST', this.consumerToken, {
                public: token,
                secret: secret
            });
            return request.send();
        }

        /**
         * Get the assets according to the parameters provided.
         * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
         * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
         * @return {Promise} Assets - Returns a Promise that, when fulfilled, will either return an Array with the assets or
         * an Error with the problem.
         */

    }, {
        key: 'getMediaList',
        value: function getMediaList() {
            var queryObject = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var parametersObject = queryObject;
            if (!this.validURL()) {
                return rejectURL();
            }
            parametersObject.count = false; // The API will return a different response format in case this is true
            if (Array.isArray(parametersObject.propertyOptionId)) {
                parametersObject.propertyOptionId = parametersObject.propertyOptionId.join();
            }
            var request = new APICall(this.baseURL, 'v4/media/', 'GET', this.consumerToken, this.accessToken, parametersObject);
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

    }, {
        key: 'getMediaInfo',
        value: function getMediaInfo(queryObject) {
            if (!this.validURL()) {
                return rejectURL();
            }
            if (!queryObject.id) {
                return rejectValidation('media', 'id');
            }
            var request = new APICall(this.baseURL, 'v4/media/' + queryObject.id + '/', 'GET', this.consumerToken, this.accessToken, { versions: queryObject.versions });
            return request.send();
        }

        /**
         * Get all the assets starting from the page provided (1 by default) and incrementing according to the offset given.
         * @see {@link http://docs.bynder.apiary.io/#reference/assets/asset-operations/retrieve-assets|API Call}
         * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
         * @return {Promise} Assets - Returns a Promise that, when fulfilled, will either return an Array with all the
         * assets or an Error with the problem.
         */

    }, {
        key: 'getAllMediaItems',
        value: function getAllMediaItems() {
            var _this = this;

            var queryObject = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var recursiveGetAssets = function recursiveGetAssets(queryObject, assets) {
                var queryAssets = assets;
                var passingProperties = queryObject;
                passingProperties.page = !passingProperties.page ? 1 : passingProperties.page;
                passingProperties.limit = !passingProperties.limit ? defaultAssetsNumberPerPage : passingProperties.limit;

                return _this.getMediaList(passingProperties).then(function (data) {
                    queryAssets = assets.concat(data);
                    if (data && data.length === passingProperties.limit) {
                        // If the results page is full it means another one might exist
                        passingProperties.page += 1;
                        return recursiveGetAssets(passingProperties, queryAssets);
                    }
                    return queryAssets;
                }).catch(function (error) {
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

    }, {
        key: 'getMediaTotal',
        value: function getMediaTotal() {
            var queryObject = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var parametersObject = queryObject;
            if (!this.validURL()) {
                return rejectURL();
            }
            parametersObject.count = true;
            if (Array.isArray(parametersObject.propertyOptionId)) {
                parametersObject.propertyOptionId = parametersObject.propertyOptionId.join();
            }
            var request = new APICall(this.baseURL, 'v4/media/', 'GET', this.consumerToken, this.accessToken, parametersObject);
            return request.send().then(function (data) {
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

    }, {
        key: 'editMedia',
        value: function editMedia(object) {
            if (!this.validURL()) {
                return rejectURL();
            }
            if (!object.id) {
                return rejectValidation('media', 'id');
            }
            var request = new APICall(this.baseURL, 'v4/media/', 'POST', this.consumerToken, this.accessToken, object);
            return request.send();
        }

        /**
         * Get all the metaproperties
         * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/retrieve-metaproperties|API Call}
         * @param {Object} queryObject={} - An object containing the parameters accepted by the API to narrow the query.
         * @return {Promise} Metaproperties - Returns a Promise that, when fulfilled, will either return an Array with the
         * metaproperties or an Error with the problem.
         */

    }, {
        key: 'getMetaproperties',
        value: function getMetaproperties() {
            var queryObject = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            if (!this.validURL()) {
                return rejectURL();
            }
            var request = new APICall(this.baseURL, 'v4/metaproperties/', 'GET', this.consumerToken, this.accessToken, queryObject);
            return request.send().then(function (data) {
                return Object.keys(data).map(function (metaproperty) {
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

    }, {
        key: 'getMetaproperty',
        value: function getMetaproperty(queryObject) {
            if (!this.validURL()) {
                return rejectURL();
            }
            if (!queryObject.id) {
                return rejectValidation('metaproperty', 'id');
            }
            var request = new APICall(this.baseURL, 'v4/metaproperties/' + queryObject.id + '/', 'GET', this.consumerToken, this.accessToken);
            return request.send();
        }

        /**
         * Save a new metaproperty in the information provided.
         * @see {@link http://docs.bynder.apiary.io/#reference/metaproperties/metaproperty-operations/create-metaproperty|API Call}
         * @param {Object} object={} - An object containing the data of the new metaproperty.
         * @return {Promise} Object - Returns a Promise that, when fulfilled, will either return an empty Object in
         * case it's successful or an Error with the problem.
         */

    }, {
        key: 'saveNewMetaproperty',
        value: function saveNewMetaproperty(object) {
            if (!this.validURL()) {
                return rejectURL();
            }
            var request = new APICall(this.baseURL, 'v4/metaproperties/', 'POST', this.consumerToken, this.accessToken, { data: JSON.stringify(object) } // The API requires an object with the query content stringified inside
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

    }, {
        key: 'deleteMetaproperty',
        value: function deleteMetaproperty(object) {
            if (!this.validURL()) {
                return rejectURL();
            }
            if (!object.id) {
                return rejectValidation('metaproperty', 'id');
            }
            var request = new APICall(this.baseURL, 'v4/metaproperties/' + object.id + '/', 'DELETE', this.consumerToken, this.accessToken);
            return request.send();
        }

        /**
         * Get all the tags
         * @see {@link http://docs.bynder.apiary.io/#reference/tags/tags-access/retrieve-entry-point|API Call}
         * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
         * @return {Promise} Tags - Returns a Promise that, when fulfilled, will either return an Array with the
         * tags or an Error with the problem.
         */

    }, {
        key: 'getTags',
        value: function getTags(queryObject) {
            if (!this.validURL()) {
                return rejectURL();
            }
            var request = new APICall(this.baseURL, 'v4/tags/', 'GET', this.consumerToken, this.accessToken, queryObject);
            return request.send();
        }

        /**
         * Get collections according to the parameters provided
         * @see {@link http://docs.bynder.apiary.io/#reference/collections/collection-operations/retrieve-collections|API Call}
         * @param {Object} [queryObject={}] - An object containing the parameters accepted by the API to narrow the query.
         * @return {Promise} Collections - Returns a Promise that, when fulfilled, will either return an Array with the
         * collections or an Error with the problem.
         */

    }, {
        key: 'getCollections',
        value: function getCollections() {
            var queryObject = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            if (!this.validURL()) {
                return rejectURL();
            }
            var request = new APICall(this.baseURL, 'v4/collections/', 'GET', this.consumerToken, this.accessToken, queryObject);
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

    }, {
        key: 'getCollection',
        value: function getCollection(queryObject) {
            if (!this.validURL()) {
                return rejectURL();
            }
            if (!queryObject.id) {
                return rejectValidation('collection', 'id');
            }
            var request = new APICall(this.baseURL, 'v4/collections/' + queryObject.id + '/', 'GET', this.consumerToken, this.accessToken);
            return request.send();
        }
    }]);

    return Bynder;
}();

exports.default = Bynder;
