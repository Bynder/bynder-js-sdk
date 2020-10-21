/* global jest */

const axios = require('axios');
const pkg = require("../package.json");
const Bynder = require("../src/bynder-js-sdk.js");

const configs = {
    "baseURL": "https://portal.getbynder.com/api/",
    "clientId": "test-client-id",
    "clientSecret": "test-client-secret",
    "redirectUri": "https://test-redirect-uri.com"
};

jest.mock('axios');

let bynder;

describe("Make authorization URL", () => {
  bynder = new Bynder(configs);
  const authorizationUrl = bynder.makeAuthorizationURL(
    "state example",
    "offline"
  );

  test("should return correct authorization URL", () => {
    // Security token is random token so we compare without this
    expect(authorizationUrl).toMatchSnapshot();
  });
});

describe("Make API call without token", () => {
  beforeEach(done => {
    const configWithoutToken = {
      baseURL: configs.baseURL,
      clientId: configs.clientId,
      clientSecret: configs.clientSecret,
      redirectUri: configs.redirectUri
    };
    bynder = new Bynder(configWithoutToken);
    bynder
      .getMediaList()
      .then(data => {
        result = data;
        done();
      })
      .catch(error => {
        result = error;
        done();
      });
  });

  test("should return an Error", () => {
    expect(result.message).toEqual("No token found");
  });
});

describe("Make API call with invalid token", () => {
  test("should return an Error", () => {
    const invalidTokenConfig = {
      baseURL: configs.baseURL,
      clientId: configs.clientId,
      clientSecret: configs.clientSecret,
      redirectUri: configs.redirectUri,
      token: { access_token: 2345 }
    };

    expect(() => new Bynder(invalidTokenConfig)).toThrow(Error);
  });
});

describe("Initialize Bynder with permanent token", () => {
  test("should pass", () => {
    const bynder = new Bynder({...configs, permanentToken: "test"});

    expect(bynder.api.permanentToken).toEqual("test");
  });
});


describe("API call headers", () => {
  describe("with permanent token", () => {
    beforeEach(() => {
      bynder = new Bynder(configs);
      axios.mockResolvedValue({});
      bynder.api.permanentToken = "token";
    });

    afterEach(() => {
      axios.mockRestore();
      bynder = null;
    });

    it("returns headers with Content-Type if is a POST", () => {
      const expectedHeaders = {
        "User-Agent": "bynder-js-sdk/" + pkg.version,
        "Authorization": "Bearer token",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      bynder.editMedia({ id: "dummy-id" });

      expect(axios).toHaveBeenNthCalledWith(1, "https://portal.getbynder.com/api/v4/media/", {
        method: "POST",
        data: "id=dummy-id",
        headers: expectedHeaders
      });
    });

    it("returns headers with Content-Type if is not a POST", () => {
      const expectedHeaders = {
        "User-Agent": `bynder-js-sdk/${pkg.version}`,
        "Authorization": "Bearer token"
      };
      bynder.getMediaInfo({ id: "dummy-id" });

      expect(axios).toHaveBeenNthCalledWith(1, "https://portal.getbynder.com/api/v4/media/dummy-id/", {
        method: "GET",
        data: "",
        headers: expectedHeaders
      });
    });
  });
});
