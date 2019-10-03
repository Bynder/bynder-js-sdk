const Bynder = require("../src/bynder-js-sdk.js");
const configs = require("../secret.json");

describe("Brands", () => {
  let bynder;
  let brands;

  beforeEach(done => {
    bynder = new Bynder(configs);

    bynder
      .getBrands()
      .then(data => {
        brands = data;
        done();
      })
      .catch(error => {
        brands = error;
        done();
      });
  });

  test("should get all the brands", () => {
    expect(Array.isArray(brands)).toEqual(true);
    if (brands && brands.length) {
      const randomIndex = Math.floor(Math.random() * brands.length);
      const randomBrand = Object.keys(brands[randomIndex]);
      expect(randomBrand).toContain("id");
      expect(randomBrand).toContain("name");
      expect(randomBrand).toContain("description");
      expect(randomBrand).toContain("image");
      expect(randomBrand).toContain("subBrands");
    }
  });
});
