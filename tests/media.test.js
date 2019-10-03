const Bynder = require("../src/bynder-js-sdk.js");
const configs = require("../secret.json");

const defaultAssetsNumberReturnedByApi = 50;

let getAllAssetsResponse;
let getAssetsResponse;
let getAssetsTotal;
let getAssetResponse;
let testAssetRandomIndex;
let testAssetId;
let testAssetDescriptionBackup;
const testDescriptionString = "byndertestdescription";

describe("Get assets", () => {
  let bynder;
  let assets;

  beforeEach(done => {
    bynder = new Bynder(configs);

    bynder
      .getMediaList()
      .then(data => {
        assets = data;
        done();
      })
      .catch(error => {
        assets = error;
        done();
      });
  });

  test("should get all the assets", () => {
    expect(Array.isArray(assets)).toEqual(true);
    if (assets && assets.length) {
      const randomIndex = Math.floor(Math.random() * assets.length);
      const randomObjectKeys = Object.keys(assets[randomIndex]);
      expect(randomObjectKeys).toContain("name");
      expect(randomObjectKeys).toContain("id");
      expect(randomObjectKeys).toContain("type");
      expect(randomObjectKeys).toContain("thumbnails");
    }
  });
});

describe("Wrong properties", () => {
  let bynder;
  let assets;
  let fail1 = false;
  let asset;
  let fail2 = false;

  beforeAll(done => {
    bynder = new Bynder(configs);
    const p1 = bynder
      .getMediaList({
        propertyOptionIds: ["00000000-0000-0000-0000000000000000"]
      })
      .then(data => {
        assets = data;
      })
      .catch(error => {
        fail1 = true;
        assets = error;
      });

    const p2 = bynder
      .getMediaInfo({
        idx: "00000000-0000-0000-0000000000000000"
      })
      .then(data => {
        asset = data;
      })
      .catch(error => {
        fail2 = true;
        asset = error;
      });

    Promise.all([p1, p2]).then(() => {
      done();
    });
  });

  test("Wrong property in getAssets()", () => {
    expect(fail1).toBe(false);
    expect(Array.isArray(assets)).toEqual(true);
    if (assets && assets.length) {
      const randomIndex = Math.floor(Math.random() * assets.length);
      const randomObjectKeys = Object.keys(assets[randomIndex]);
      expect(randomObjectKeys).toContain("name");
      expect(randomObjectKeys).toContain("id");
      expect(randomObjectKeys).toContain("type");
      expect(randomObjectKeys).toContain("thumbnails");
    }
  });

  test("Wrong property in getAsset()", () => {
    expect(asset).not.toBeUndefined();
    expect(fail2).toBe(true);
    expect(asset.status).toEqual(0);
  });
});

describe("Unwanted parameters in query object", () => {
  let bynder;
  let assets;
  let fail = false;

  beforeAll(done => {
    bynder = new Bynder(configs);
    bynder
      .getMediaList({
        count: 1
      })
      .then(data => {
        assets = data;
        done();
      })
      .catch(error => {
        fail = true;
        assets = error;
        done();
      });
  });

  test("Passing count in getAssets()", () => {
    expect(fail).toBe(false);
    expect(Array.isArray(assets)).toEqual(true);
    if (assets && assets.length) {
      const randomIndex = Math.floor(Math.random() * assets.length);
      const randomObjectKeys = Object.keys(assets[randomIndex]);
      expect(randomObjectKeys).toContain("name");
      expect(randomObjectKeys).toContain("id");
      expect(randomObjectKeys).toContain("type");
      expect(randomObjectKeys).toContain("thumbnails");
    }
  });
});

describe("Send special characters", () => {
  let bynder;
  let assets1;
  let fail1 = false;
  let assets2;
  let fail2 = false;

  beforeAll(done => {
    bynder = new Bynder(configs);
    const p1 = bynder
      .getMediaList({
        type: "image",
        page: "abc",
        limit: 1
      })
      .then(data => {
        assets1 = data;
      })
      .catch(error => {
        fail1 = true;
        assets1 = error;
      });
    Promise.resolve(p1).then(() => {
      done();
    });
  });

  test("Passing illegal characters as values", () => {
    expect(assets1).not.toBeUndefined();
    expect(assets1.response.status).toEqual(400);
    expect(fail1).toBe(true);
  });
});
