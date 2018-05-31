/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

let randomCollectionId;

describe('Get all collections', () => {
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

    it('should get all the collections', () => {
        expect(Array.isArray(collections)).toEqual(true);
        expect(randomCollectionId).not.toBeUndefined();
    });
});

describe('Get one collection', () => {
    let bynder;
    let collection;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getCollection({
            id: randomCollectionId
        })
        .then((data) => {
            collection = data;
            done();
        })
        .catch((error) => {
            collection = error;
            done();
        });
    });

    it('should get one specific collection', () => {
        expect(collection.constructor).toEqual(Object);
        const collectionKeys = Object.keys(collection);
        expect(collectionKeys).toContain('name');
        expect(collectionKeys).toContain('link');
        expect(collectionKeys).toContain('views');
        expect(collectionKeys).toContain('datecreated');
    });
});

describe('Create collection', () => {
    let bynder;
    let result;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.saveNewCollection({
            name: 'test'
        })
        .then((data) => {
            result = data;
            done();
        })
        .catch((error) => {
            result = error;
            done();
        });
    });

    it('should create one collection', () => {
        expect(result.constructor).toEqual(Object);
        const collectionKeys = Object.keys(result);
        expect(collectionKeys).toContain('message');
        expect(collectionKeys).toContain('statuscode');
        expect(result.message).toBe('Created');
        expect(result.statuscode).toBe(201);
    });
});
