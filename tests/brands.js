/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

describe('Brands', () => {
    let bynder;
    let brands;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getBrands()
            .then((data) => {
                brands = data;
                done();
            })
            .catch((error) => {
                brands = error;
                done();
            });
    });

    it('Get all brands', () => {
        expect(Array.isArray(categories)).toEqual(true);
        if (brands && brands.length) {
            const randomIndex = Math.floor(Math.random() * categories.length);
            const randomBrand = Object.keys(brand[randomIndex]);
            expect(randomBrand).toContain('id');
            expect(randomBrand).toContain('name');
            expect(randomBrand).toContain('description');
            expect(randomBrand).toContain('image');
            expect(randomBrand).toContain('subBrands');
        }
    });
});
