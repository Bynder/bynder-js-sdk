/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

describe('Tags', () => {
    let bynder;
    let tags;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getTags()
            .then((data) => {
                tags = data;
                done();
            })
            .catch((error) => {
                tags = error;
                done();
            });
    });

    it('Get all tags', () => {
        expect(Array.isArray(tags)).toEqual(true);
        if (tags && tags.length) {
            const randomIndex = Math.floor(Math.random() * tags.length);
            const randomCategory = Object.keys(tags[randomIndex]);
            expect(randomCategory).toContain('id');
            expect(randomCategory).toContain('tag');
            expect(randomCategory).toContain('mediaCount');
        }
    });
});
