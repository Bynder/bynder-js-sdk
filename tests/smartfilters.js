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
            const randomSmartfilter = Object.keys(smartfilters[randomIndex]);
            expect(randomSmartfilter).toContain('icon');
            expect(randomSmartfilter).toContain('labels');
            expect(randomSmartfilter).toContain('zindex');
            expect(randomSmartfilter).toContain('id');
            expect(randomSmartfilter).toContain('metaproperties');
        }
    });
});
