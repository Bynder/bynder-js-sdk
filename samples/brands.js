const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

const bynder = new Bynder(configs);

bynder.getBrands()
    .then((data) => {
        console.log(data);
    })
    .catch((error) => {
        console.error(error);
    });
