const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');


const metapropertySample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 

    bynder.getMetaproperties()
    .then((data) => {
        console.log('getMetaproperties', data, '\n\n');
    })
}

metapropertySample();
