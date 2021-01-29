const Bynder = require('../dist/bynder-js-sdk.cjs');

const bynder = new Bynder({
  baseURL: 'https://portal.getbynder.com/api/',
  clientId: '<your OAuth2 client id>',
  clientSecret: '<your OAuth2 client secret>',
  redirectUri: '<url where user will be redirected after authenticating>'
});

// Authorization URL
bynder.makeAuthorizationURL();

// Authorization token
bynder.getToken('code');

bynder
  .getMediaList({
    type: 'image',
    limit: 9,
    page: 1
  })
  .then(data => { // eslint-disable-line no-unused-vars
    // TODO Handle data
  })
  .catch(error => { // eslint-disable-line no-unused-vars
    // TODO Handle the error
  });
