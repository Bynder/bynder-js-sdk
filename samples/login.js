const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

const bynder = new Bynder(configs);

bynder.userLogin(configs.login)
    .then((data) => {
        console.log('login', data, '\n\n');
    })
    .catch((error) => {
        console.log(error);
    });
