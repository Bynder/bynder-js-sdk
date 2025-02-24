const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');


const collectionsSample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 

    bynder.getCollections()
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error(error);
        });
}

collectionsSample();
