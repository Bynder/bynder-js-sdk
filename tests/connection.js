/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

let bynder;
let brands;
let fail;
let error;

function getBrandsTest(done, misconfigs) {
    bynder = new Bynder(misconfigs);

    bynder.getBrands()
        .then((data) => {
            brands = data;
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
        return getBrandsTest(done, misconfigs);
    });

    it('should produce unauthorized response', () => {
        expect(error).not.toBeUndefined();
        expect(error.response.status).toEqual(401);
        expect(brands).toBeUndefined();
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
        return getBrandsTest(done, misconfigs);
    });

    it('should produce unauthorized response', () => {
        expect(error).not.toBeUndefined();
        expect(error.response.status).toEqual(401);
        expect(brands).toBeUndefined();
        expect(fail).toBe(true);
    });
});

describe('Empty string base URL', () => {
    fail = false;
    const misconfigs = JSON.parse(JSON.stringify(configs));
    misconfigs.baseURL = '';

    beforeEach((done) => {
        return getBrandsTest(done, misconfigs);
    });

    it('server cannot be reached', () => {
        expect(error).not.toBeUndefined();
        expect(error.status).toEqual(0);
        expect(fail).toBe(true);
    });
});

describe('Null URL', () => {
    fail = false;
    const misconfigs = JSON.parse(JSON.stringify(configs));
    misconfigs.baseURL = null;

    beforeEach((done) => {
        return getBrandsTest(done, misconfigs);
    });

    it('server cannot be reached', () => {
        expect(error).not.toBeUndefined();
        expect(error.status).toEqual(0);
        expect(fail).toBe(true);
    });
});

describe('Wrong URL', () => {
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

    it('should produce unauthorized response', () => {
        expect(assets).toBeUndefined();
        expect(error).not.toBeUndefined();
        expect(error.response.status).not.toBeLessThan(400);
        expect(fail).toBe(true);
    });
});
