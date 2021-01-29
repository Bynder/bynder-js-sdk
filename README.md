# Bynder JavaScript SDK

![Tests](https://github.com/Bynder/bynder-js-sdk/workflows/Tests/badge.svg)
![Publish](https://github.com/Bynder/bynder-js-sdk/workflows/Publish/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/Bynder/bynder-js-sdk/badge.svg?branch=master)](https://coveralls.io/github/Bynder/bynder-js-sdk?branch=master)

This SDK aims to help the development of integrations with
[Bynder](https://www.bynder.com/en/) that use JavaScript, providing an easy
interface to communicate with
[Bynder's REST API](https://developer-docs.bynder.com/API/).

## Requirements

To use this SDK, you will need:

- [Node.js **v12 or above**](https://nodejs.org/)

Node installation will include [NPM](https://www.npmjs.com/), which is
responsible for dependency management.

## Installation

### Node.js

`npm install @bynder/bynder-js-sdk`

`import Bynder from '@bynder/bynder-js-sdk';`

## Usage

This SDK relies heavily on [Promises](https://developers.google.com/web/fundamentals/getting-started/primers/promises),
making it easier to handle the asynchronous requests made to the API. The SDK
provides a `Bynder` object containing several methods which map to the
calls and parameters described in
[Bynder's API documentation](http://docs.bynder.apiary.io/).

The following snippet is a generic example of how to use the SDK. If you need
details for a specific module, refer to the
[samples folder](https://github.com/Bynder/bynder-js-sdk/tree/master/samples).

Before executing any request, you need to authorize the calls to the API:

#### Using OAuth2

1. Call the constructor with your configuration

```js
const bynder = new Bynder({
  baseURL: "https://portal.getbynder.com/",
  clientId: "<your OAuth2 client id>",
  clientSecret: "<your OAuth2 client secret>",
  // A redirect URI is required for authorization codes, not client credentials
  redirectUri: "<url where user will be redirected after authenticating>",
});
```

  > Make sure the `baseURL` **does not** have the `/api` namespace at the end. The SDK will take care of it for you.
  > Permanent tokens are no longer supported. Please request either an authorization code or client credentials.

2. Create an authorization URL, login and get one-time authorization code

```js
const authorizationURL = bynder.makeAuthorizationURL();
```

3. Exchange code for an access token

```js
bynder.getToken(code);
```

If you already have an access token, you can also initialize Bynder with the token directly:

```js
const bynder = new Bynder({
  baseURL: "http://api-url.bynder.io/",
  clientId: "<your OAuth2 client id>",
  clientSecret: "<your OAuth2 client secret>",
  redirectUri: "<url where user will be redirected after authenticating>",
  token: {
    access_token: "<OAuth2 access token>"
  }
});
```

#### Making requests

You can now use the various methods from the SDK to fetch media, metaproperties
and other data. All methods return a promise, so you should use
`.then()`/`.catch()` to handle the successful and failed requests,
respectively.

Most of the calls take an object as the only parameter but please refer to the
API documentation to tune the query as intended.

```js
bynder
  .getMediaList({
    type: "image",
    limit: 9,
    page: 1
  })
  .then(data => {
    // TODO Handle data
  })
  .catch(error => {
    // TODO Handle the error
  });
```

## Available methods

### Authentication

- `makeAuthorizationURL()`
- `getToken()`
- `userLogin(queryObject)`

### Media

- `getMediaList(queryObject)`
- `getMediaInfo(queryObject)`
- `getAllMediaItems(queryObject)`
- `getMediaTotal(queryObject)`
- `editMedia(object)`
- `deleteMedia(id)`
- `getMediaDownloadUrl(queryObject)`

### Media usage

- `getAssetUsage(queryObject)`
- `saveNewAssetUsage(queryObject)`
- `deleteAssetUsage(queryObject)`

### Metaproperties

- `getMetaproperties(queryObject)`
- `getMetaproperty(queryObject)`
- `saveNewMetaproperty(object)`
- `editMetaproperty(object)`
- `deleteMetaproperty(object)`
- `saveNewMetapropertyOption(object)`
- `editMetapropertyOption(object)`
- `deleteMetapropertyOption(object)`
- `getMetapropertyOptions(queryObject)`

### Collections

- `getCollections(queryObject)`
- `getCollection(queryObject)`
- `saveNewCollection(queryObject)`
- `shareCollection(queryObject)`
- `addMediaToCollection(queryObject)`
- `deleteMediaFromCollection(queryObject)`

### Tags

- `getTags(queryObject)`

### Smartfilters

- `getSmartfilters(queryObject)`

### Brands

- `getBrands()`

### Upload

- `uploadFile(fileObject)`

## Contribute to the SDK

If you wish to contribute to this repository and further extend the API coverage in the SDK, here
are the steps necessary to prepare your environment:

1. Clone the repository
2. In the root folder, run `npm install` to install all of the dependencies.
3. Create a `secret.json` file with the following structure:

```json
{
  "baseURL": "http://api-url.bynder.io/",
  "clientId": "<your OAuth2 client id>",
  "clientSecret": "<your OAuth2 client secret>",
  "redirectUri": "<url where user will be redirected after authenticating>"
}
```

4. The following gulp tasks are available:

- `npm run lint` - Run ESlint and check the code.
- `npm run build` - Run webpack to bundle the code in order to run in a browser.
- `npm run doc` - Run JSDoc to create a 'doc' folder with automatically generated documentation for the source code.
- `npm run dev` - Starts a builder in watch mode for development
