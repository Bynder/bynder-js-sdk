const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const tagSample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 

    bynder.getTags()
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.log(error);
        });
}

tagSample();

