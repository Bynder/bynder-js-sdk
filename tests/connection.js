/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

let bynder;
let categories;
let fail;
let error;

function getCategoriesTest(done, misconfigs) {
    bynder = new Bynder(misconfigs);

    bynder.getCategories()
        .then((data) => {
            categories = data;
            done();
        })
        .catch((err) => {
            fail = true;
            error = err;
            done();
        });
}

describe('Wrong tokens', () => {
    fail = false;
    const misconfigs = JSON.parse(JSON.stringify(configs));
    misconfigs.consumer.public = 'foobar';

    beforeEach((done) => {
        return getCategoriesTest(done, misconfigs);
    });

    it('Produces unauthorized response', () => {
        expect(error).not.toBeUndefined();
        expect(error.response.status).toEqual(401);
        expect(categories).toBeUndefined();
        expect(fail).toBe(true);
    });
});

describe('Null tokens', () => {
    fail = false;
    const misconfigs = JSON.parse(JSON.stringify(configs));
    misconfigs.consumer.public = null;
    misconfigs.consumer.secret = null;
    misconfigs.accessToken.public = null;
    misconfigs.accessToken.secret = null;

    beforeEach((done) => {
        return getCategoriesTest(done, misconfigs);
    });

    it('Produces unauthorized response', () => {
        expect(error).not.toBeUndefined();
        expect(error.response.status).toEqual(401);
        expect(categories).toBeUndefined();
        expect(fail).toBe(true);
    });
});

describe('Empty string base url', () => {
    fail = false;
    const misconfigs = JSON.parse(JSON.stringify(configs));
    misconfigs.baseURL = '';

    beforeEach((done) => {
        return getCategoriesTest(done, misconfigs);
    });

    it('Server cannot be reached', () => {
        expect(error).not.toBeUndefined();
        expect(error.status).toEqual(0);
        expect(fail).toBe(true);
    });
});

describe('Null url', () => {
    fail = false;
    const misconfigs = JSON.parse(JSON.stringify(configs));
    misconfigs.baseURL = null;

    beforeEach((done) => {
        return getCategoriesTest(done, misconfigs);
    });

    it('Server cannot be reached', () => {
        expect(error).not.toBeUndefined();
        expect(error.status).toEqual(0);
        expect(fail).toBe(true);
    });
});

describe('Wrong url', () => {
    fail = false;
    const misconfigs = JSON.parse(JSON.stringify(configs));
    let assets;

    function getRandomURL(length) {
        let fakeURL = '';
        for (let i = 0; i < length; i++) {
            fakeURL += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
        }
        return `https://bynder.com/${fakeURL}/`;
    }
    misconfigs.baseURL = getRandomURL(10);

    beforeEach((done) => {
        bynder = new Bynder(misconfigs);

        bynder.getMediaList()
            .then((data) => {
                assets = data;
                done();
            })
            .catch((err) => {
                fail = true;
                error = err;
                done();
            });
    });

    it('Produces unauthorized response', () => {
        expect(assets).toBeUndefined();
        expect(error).not.toBeUndefined();
        expect(error.response.status).not.toBeLessThan(400);
        expect(fail).toBe(true);
    });
});
