# Bynder JavaScript SDK
This SDK aims to help the development of integrations with [Bynder](https://www.bynder.com/en/) that use JavaScript, providing an easy interface to communicate with [Bynder's REST API](https://developer-docs.bynder.com/API/) and request the information required.
For that purpose, many ES2015 features were used, as well as Promises notation to help dealing with asynchronous code.

## Requirements
In order to use this SDK, you'll need the following tools:

* [Node.js **v6.3.0 or above**](https://nodejs.org/)
* [Yarn](https://yarnpkg.com/)

Node installation will include [NPM](https://www.npmjs.com/), which is responsible for the dependencies management.

## Installation

### Node.js

`npm install @bynder/bynder-js-sdk`

`import Bynder from '@bynder/bynder-js-sdk';`

### Browser

1. Checkout the repository `git clone git@github.com:Bynder/bynder-js-sdk.git`.
2. Go to the `bynder-js-sdk` directory.
3. Run `yarn install`.
4. Run `gulp build`.
5. Use the `bundle.js` file generated in `dist` folder to use the SDK in the browser.
6. Include it in your page like this: `<script src="path/to/bynder-js-sdk.js"></script>` .
7. Define the constructor like this: `const Bynder = Bynder.default;`

## Usage
As said before, this SDK relies heavily on [Promises](https://developers.google.com/web/fundamentals/getting-started/primers/promises), making it easier to handle the asynchronous requests made to the API.
Besides that, it provides a `Bynder` object containing several methods corresponding to the calls to be performed, which accept the parameters exactly according [Bynder's API documentation](http://docs.bynder.apiary.io/).

This is a generic example of how to use the SDK, if you need specific details for a specific module, refer to [samples folder](https://github.com/Bynder/bynder-js-sdk/tree/master/samples).

Before executing any request, you need to call the constructor passing your credentials as parameters, making it possible to authorize the calls to the API:

```js
const bynder = new Bynder({
    consumer: {
        public: "<public_consumer_key>",
        secret: "<secret_consumer_key>"
    },
    accessToken: {
        public: "<public_access_key>",
        secret: "<secret_access_key>"
    },
    baseURL: "http://api-url.bynder.io/api/"
});
```

From this point on, you just need to call the methods made available to call the API and retrieve the data you're looking for. Following the Promises notation, you should use `.then()`/`.catch()` to handle respectively the successful and failed requests.

Except for some special cases, most of the calls only take an object as parameter. After that, you'll need to refer to the API to tune the query as intended.

```js
bynder.getMediaList({
    type: 'image',
    limit: 9,
    page: 1
})
.then((data) => {
    // TODO stuff
})
.catch((error) => {
    // TODO Handle the error
});
```

## Methods available
Here's a list of all the methods available, separated by module:

### Authentication
* `userLogin()`
* `getRequestToken()`
* `getAuthorisedURL(token, callback)`
* `getAccessToken(token, secret)`

### Media items
* `getMediaList(queryObject)`
* `getMediaInfo(queryObject)`
* `getAllMediaItems(queryObject)`
* `getMediaTotal(queryObject)`
* `editMedia(object)`

### Metaproperties
* `getMetaproperties(queryObject)`
* `getMetaproperty(queryObject)`
* `saveNewMetaproperty(object)`
* `editMetaproperty(object)`
* `deleteMetaproperty(object)`

### Collections
* `getCollections(queryObject)`
* `getCollection(queryObject)`
* `createCollection(queryObject)`

### Tags
* `getTags(queryObject)`

### Categories
* `getCategories(queryObject)`
* `getCategory(queryObject)`

## Contribute to the SDK
If you wish to contribute to this repository and further extend the API coverage of the SDK, here are the steps necessary to prepare your environment:

1. Clone the repository
2. In the root folder, run `npm install` to install all the dependencies.
3. Create the file named `secret.json` to provide API tokens following this structure:
```json
{   
    "consumer": {
        "public": "<public_consumer_key>",
        "secret": "<secret_consumer_key>"
    },
    "accessToken": {
        "public": "<public_access_key>",
        "secret": "<secret_access_key>"
    },
    "baseURL": "http://api-url.bynder.com/api/"
}
```
4. Use any of these gulp tasks to:
  1. `gulp lint` - Run ESlint and check the code.
  2. `gulp build` - Run webpack to bundle the code in order to run in a browser.
  3. `gulp babel` - Run Babel to create a folder 'dist' with ES2015 compatible code.
  4. `gulp jasmine` - Run Jasmine for all the spec files inside 'tests'.
  5. `gulp doc` - Run JSDoc to create a 'doc' folder with automatically generated documentation for the source code.
  6. `gulp webserver` - Deploy a web server from the root folder at `localhost:8080` to run the html samples (in order to avoid CORS problems). 
