/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

describe('Smartfilters', () => {
    let bynder;
    let smartfilters;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getSmartfilters()
          .then((data) => {
              smartfilters = data;
              done();
          })
          .catch((error) => {
              smartfilters = error;
              done();
          });
    });

    it('should get all the smartfilters', () => {
        expect(Array.isArray(smartfilters)).toEqual(true);
        if (smartfilters && smartfilters.length) {
            const randomIndex = Math.floor(Math.random() * smartfilters.length);
            const randomCategory = Object.keys(smartfilters[randomIndex]);
            expect(randomCategory).toContain('icon');
            expect(randomCategory).toContain('labels');
            expect(randomCategory).toContain('zindex');
            expect(randomCategory).toContain('id');
            expect(randomCategory).toContain('metaproperties');
        }
    });
});
