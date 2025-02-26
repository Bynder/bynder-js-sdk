const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');


const brandsSample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 

    bynder.getBrands()
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error(error);
        });
}

brandsSample();
