const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const bynder = new Bynder(configs);

bynder.getSmartfilters()
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.error(error);
  });
