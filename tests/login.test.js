import Bynder from "../src/bynder-js-sdk.js";

const configs = {
  "baseURL": "https://portal.getbynder.com/api/",
  "clientId": "test-client-id",
  "clientSecret": "test-client-secret",
  "redirectUri": "https://test-redirect-uri.com"
};

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
  let result;

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
