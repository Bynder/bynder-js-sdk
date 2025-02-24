const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');


const mediaSample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 

    bynder.getMediaList({
        type: 'image',
        limit: 9,
        page: 1
    })
    .then((data) => {
        console.log('getAssets with parameters', data, '\n\n');
        return bynder.getMediaList();
    })
    .then((data) => {
        console.log('getAssetsTotal', data, '\n\n');
        return bynder.getMediaList({
            page: 1,
            limit: 9
        });
    })
}

mediaSample();

