const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');


const getBynderClient = async() => {
    const bynderClient = new Bynder(configs);
    const token = await bynderClient.getTokenClientCredentials();
    return bynderClient;
}


const getBrands = async (bynder) => {
    await bynder.getBrands()
        .then((data) => {
            console.log(data);
        })
        .catch((error) => {
            console.error(error);
        });
}

const getMedia = async(bynder) => {
    await bynder.getMediaList({
        limit: 5,
        page: 1
    })
    .then((data) => {
        console.log('getAssets: ', data, '\n\n');
        return bynder.getMediaList();
    })

    .catch((error) => {
        console.error(error)
    });
}

const runClientCredentialsSample = async () => {
    const bynder = await getBynderClient();
    getBrands(bynder);

    setTimeout(() =>{
        getMedia(bynder);
    }, 2000)
}

runClientCredentialsSample();
