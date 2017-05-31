/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

describe('Categories', () => {
    let bynder;
    let categories;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getCategories()
            .then((data) => {
                categories = data;
                done();
            })
            .catch((error) => {
                categories = error;
                done();
            });
    });

    it('Get all categories', () => {
        expect(Array.isArray(categories)).toEqual(true);
        if (categories && categories.length) {
            const randomIndex = Math.floor(Math.random() * categories.length);
            const randomCategory = Object.keys(categories[randomIndex]);
            expect(randomCategory).toContain('name');
            expect(randomCategory).toContain('id');
            expect(randomCategory).toContain('description');
        }
    });
});
