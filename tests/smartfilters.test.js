const Bynder = require("../src/bynder-js-sdk.js");
const configs = require("../secret.json");

describe("Smartfilters", () => {
  let bynder;
  let smartfilters;

  beforeEach(done => {
    bynder = new Bynder(configs);

    bynder
      .getSmartfilters()
      .then(data => {
        smartfilters = data;
        done();
      })
      .catch(error => {
        smartfilters = error;
        done();
      });
  });

  test("should get all the smartfilters", () => {
    expect(Array.isArray(smartfilters)).toEqual(true);
    if (smartfilters && smartfilters.length) {
      const randomIndex = Math.floor(Math.random() * smartfilters.length);
      const randomSmartfilter = Object.keys(smartfilters[randomIndex]);
      expect(randomSmartfilter).toContain("icon");
      expect(randomSmartfilter).toContain("labels");
      expect(randomSmartfilter).toContain("zindex");
      expect(randomSmartfilter).toContain("id");
      expect(randomSmartfilter).toContain("metaproperties");
    }
  });
});
