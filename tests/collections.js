/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

let randomCollectionId;

describe('Get collections', () => {
    let bynder;
    let collections;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getCollections()
            .then((data) => {
                collections = data;
                const randomIndex = Math.floor(Math.random() * collections.length);
                randomCollectionId = collections[randomIndex].id;
                done();
            })
            .catch((error) => {
                collections = error;
                done();
            });
    });

    it('Get all the collections', () => {
        expect(Array.isArray(collections)).toEqual(true);
        expect(randomCollectionId).not.toBeUndefined();
    });
});

describe('Get collection', () => {
    let bynder;
    let collection;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getCollection({
            id: randomCollectionId
        }).then((data) => {
            collection = data;
            done();
        })
            .catch((error) => {
                collection = error;
                done();
            });
    });

    it('Get one collection', () => {
        expect(collection.constructor).toEqual(Object);
        const collectionKeys = Object.keys(collection);
        expect(collectionKeys).toContain('name');
        expect(collectionKeys).toContain('link');
        expect(collectionKeys).toContain('views');
        expect(collectionKeys).toContain('datecreated');
    });
});

describe('Create one new collection', () => {
    let bynder;
    let result;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.createCollection({
            name: 'test'
        }).then((data) => {
            result = data;
            done();
        })
            .catch((error) => {
                result = error;
                done();
            });
    });

    it('Get one collection', () => {
        expect(result.constructor).toEqual(Object);
        const collectionKeys = Object.keys(result);
        expect(collectionKeys).toContain('message');
        expect(collectionKeys).toContain('statuscode');
        expect(result.message).toBe('Created');
        expect(result.statuscode).toBe(201);
    });
});

describe('Share one collection', () => {
    let bynder;
    let result;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.shareCollection({
            id: randomCollectionId,
            recipients: 'user1@bynder.com', // change to vaild email
            collectionOptions: 'view'
        }).then((data) => {
            result = data;
            done();
        })
            .catch((error) => {
                result = error;
                done();
            });
    });

    it('Share one collection', () => {
        expect(result.constructor).toEqual(Object);
        const collectionKeys = Object.keys(result);
        expect(collectionKeys).toContain('message');
        expect(collectionKeys).toContain('statuscode');
        expect(result.message).toBe('Created');
        expect(result.statuscode).toBe(201);
    });
});

describe('Add media to one collection', () => {
    let bynder;
    let result;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.addMediaToCollection({
            id: randomCollectionId,
            data: ['000000-0000-0000-0000000000000000'] // // change to vaild media ID
        }).then((data) => {
            result = data;
            done();
        })
            .catch((error) => {
                result = error;
                done();
            });
    });

    it('Add media to one collection', () => {
        expect(result.constructor).toEqual(Object);
        const collectionKeys = Object.keys(result);
        expect(collectionKeys).toContain('message');
        expect(collectionKeys).toContain('statuscode');
        expect(result.message).toBe('Accepted');
        expect(result.statuscode).toBe(202);
    });
});
