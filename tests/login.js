/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

let bynder;

describe('Old style login', () => {
    bynder = new Bynder(configs);
    let loginData;
    let error;

    beforeEach((done) => {
        bynder.userLogin(configs.login)
            .then((data) => {
                loginData = data;
                done();
            })
            .catch((err) => {
                error = err;
                done();
            });
    });

    it('Returns the oauth credentials', () => {
        expect(error).toBeUndefined();
        expect(Object.keys(loginData)).toContain('tokenSecret');
        expect(Object.keys(loginData)).toContain('userId');
        expect(Object.keys(loginData)).toContain('access');
        expect(Object.keys(loginData)).toContain('tokenKey');
    });
});

describe('Get request tokens', () => {
    bynder = new Bynder(configs);
    let requestTokens;
    let error;

    beforeEach((done) => {
        bynder.getRequestToken()
            .then((data) => {
                requestTokens = data;
                done();
            })
            .catch((err) => {
                error = err;
                done();
            });
    });

    it('Returns the request token and secret', () => {
        const requestArray = requestTokens.split('&');
        expect(error).toBeUndefined();
        expect(requestArray.length).toEqual(2);
    });
});

describe('Get authorised URL', () => {
    bynder = new Bynder(configs);
    let error;
    const token = 'totally-obvious-fake-token';

    const authorisedURL = bynder.getAuthorisedURL(token);

    it('Returns the URL to authorise the requested token', () => {
        expect(error).toBeUndefined();
        expect(authorisedURL).toEqual(`${bynder.baseURL}v4/oauth/authorise/?oauth_token=${token}`);
    });
});
