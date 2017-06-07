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
