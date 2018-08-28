/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

const defaultAssetsNumberReturnedByApi = 50;

let getAllAssetsResponse;
let getAssetsResponse;
let getAssetsTotal;
let getAssetResponse;
let testAssetRandomIndex;
let testAssetId;
let testAssetDescriptionBackup;
const testDescriptionString = 'byndertestdescription';

describe('Get assets', () => {
    let bynder;
    let assets;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getMediaList()
            .then((data) => {
                assets = data;
                done();
            })
            .catch((error) => {
                assets = error;
                done();
            });
    });

    it('should get all the assets', () => {
        expect(Array.isArray(assets)).toEqual(true);
        if (assets && assets.length) {
            const randomIndex = Math.floor(Math.random() * assets.length);
            const randomObjectKeys = Object.keys(assets[randomIndex]);
            expect(randomObjectKeys).toContain('name');
            expect(randomObjectKeys).toContain('id');
            expect(randomObjectKeys).toContain('type');
            expect(randomObjectKeys).toContain('thumbnails');
        }
    });
});

describe('Wrong properties', () => {
    let bynder;
    let assets;
    let fail1 = false;
    let asset;
    let fail2 = false;

    beforeAll((done) => {
        bynder = new Bynder(configs);
        const p1 = bynder.getMediaList({
            propertyOptionIds: ['00000000-0000-0000-0000000000000000']
        })
        .then((data) => {
            assets = data;
        })
        .catch((error) => {
            fail1 = true;
            assets = error;
        });

        const p2 = bynder.getMediaInfo({
            idx: '00000000-0000-0000-0000000000000000'
        })
        .then((data) => {
            asset = data;
        })
        .catch((error) => {
            fail2 = true;
            asset = error;
        });

        Promise.all([p1, p2]).then(() => {
            done();
        });
    });

    it('Wrong property in getAssets()', () => {
        expect(fail1).toBe(false);
        expect(Array.isArray(assets)).toEqual(true);
        if (assets && assets.length) {
            const randomIndex = Math.floor(Math.random() * assets.length);
            const randomObjectKeys = Object.keys(assets[randomIndex]);
            expect(randomObjectKeys).toContain('name');
            expect(randomObjectKeys).toContain('id');
            expect(randomObjectKeys).toContain('type');
            expect(randomObjectKeys).toContain('thumbnails');
        }
    });

    it('Wrong property in getAsset()', () => {
        expect(asset).not.toBeUndefined();
        expect(fail2).toBe(true);
        expect(asset.status).toEqual(0);
    });
});

describe('Unwanted parameters in query object', () => {
    let bynder;
    let assets;
    let fail = false;

    beforeAll((done) => {
        bynder = new Bynder(configs);
        bynder.getMediaList({
            count: 1
        })
        .then((data) => {
            assets = data;
            done();
        })
        .catch((error) => {
            fail = true;
            assets = error;
            done();
        });
    });

    it('Passing count in getAssets()', () => {
        expect(fail).toBe(false);
        expect(Array.isArray(assets)).toEqual(true);
        if (assets && assets.length) {
            const randomIndex = Math.floor(Math.random() * assets.length);
            const randomObjectKeys = Object.keys(assets[randomIndex]);
            expect(randomObjectKeys).toContain('name');
            expect(randomObjectKeys).toContain('id');
            expect(randomObjectKeys).toContain('type');
            expect(randomObjectKeys).toContain('thumbnails');
        }
    });
});

describe('Send special characters', () => {
    let bynder;
    let assets1;
    let fail1 = false;
    let assets2;
    let fail2 = false;

    beforeAll((done) => {
        bynder = new Bynder(configs);
        const p1 = bynder.getMediaList({
            ' ̋Þ́̌̇́ ̰‸̆̇&/%//!': 1 // The finest and most curated collection of chars in the attempt to break Bynder
        })
        .then((data) => {
            assets1 = data;
        })
        .catch((error) => {
            fail1 = true;
            assets1 = error;
        });
        const p2 = bynder.getMediaList({
            type: 'image',
            page: '1&limit=5',
            limit: 1
        })
        .then((data) => {
            assets2 = data;
        })
        .catch((error) => {
            fail2 = true;
            assets2 = error;
        });
        Promise.all([p1, p2]).then(() => {
            done();
        });
    });

    it('Passing illegal characters as parameters', () => {
        expect(assets1).not.toBeUndefined();
        expect(assets1.response.status).toEqual(401);
        expect(fail1).toBe(true);
    });

    it('Passing illegal characters as values', () => {
        expect(assets2).not.toBeUndefined();
        expect(assets2.response.status).toEqual(400);
        expect(fail2).toBe(true);
    });
});

describe('Media batch testing 1', () => {
    let bynder;
    let editMediaResult;

    beforeAll((done) => {
        bynder = new Bynder(configs);
        bynder
            .getAllMediaItems()
            .then((data) => {
                getAllAssetsResponse = data;
                return bynder.getMediaList();
            })
            .then((data) => {
                getAssetsResponse = data;
                return bynder.getMediaTotal();
            })
            .then((data) => {
                getAssetsTotal = data;
                testAssetRandomIndex = 2;// Math.floor(Math.random() * getAllAssetsResponse.length);
                testAssetId = getAllAssetsResponse[testAssetRandomIndex].id;
                testAssetDescriptionBackup = getAllAssetsResponse[testAssetRandomIndex].description;
                return bynder.editMedia({
                    id: testAssetId,
                    description: testDescriptionString
                });
            })
            .then((data) => {
                editMediaResult = data;
                done();
            });
    });

    it('The variable getAllAssets should be defined', () => {
        expect(Array.isArray(getAllAssetsResponse)).toEqual(true);
    });

    it('The variable getAssets should be defined', () => {
        expect(Array.isArray(getAssetsResponse)).toEqual(true);
    });

    it('If the getAllAssets size is smaller than the API max limit, they should be the same', () => {
        if (getAllAssetsResponse.length <= defaultAssetsNumberReturnedByApi) {
            expect(getAssetsResponse.length).toEqual(getAllAssetsResponse.length);
        }
    });

    it('Edit media request worked', () => {
        expect(editMediaResult).not.toBeUndefined();
    });
});

describe('Media batch testing 2', () => {
    let bynder;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    beforeEach((done) => {
        setTimeout(() => {
            bynder = new Bynder(configs);
            bynder.getMediaInfo({
                id: testAssetId
            })
                .then((data) => {
                    getAssetResponse = data;
                    done();
                });
        }, 5000); // Sometimes the API returns the old value if the query call is made immediately after the edit call
    });

    it('Description was edited successfully', () => {
        expect(getAssetResponse.description).toEqual(testDescriptionString);
    });
});

describe('Media batch testing 3', () => {
    let bynder;
    let restoreDescription;
    let checkDescription;

    beforeEach((done) => {
        bynder = new Bynder(configs);
        bynder.editMedia({
            id: testAssetId,
            description: testAssetDescriptionBackup
        })
            .then((data) => {
                restoreDescription = data;
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const fun = () => {
                            return bynder.getMediaInfo({
                                id: testAssetId
                            });
                        };
                        return resolve(fun());
                    }, 5000);
                });
            })
            .then((data) => {
                checkDescription = data;
                done();
            });
    });

    it('Description was edited successfully', () => {
        expect(restoreDescription).not.toBeUndefined();
        expect(checkDescription.description).toEqual(testAssetDescriptionBackup);
    });
});
