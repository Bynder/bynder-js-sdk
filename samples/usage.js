const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const bynder = new Bynder(configs);

const ASSET_ID = 'D9D467C2-DD45-4E69-9600B3CFD48D18BF';

bynder.saveNewAssetUsage({
    id: ASSET_ID,
    integration_id: 'b242c16d-70f4-4101-8df5-87b35bbe56f0',
    timestamp: "2017-04-19T11:36:36.799508+00:00",   
    uri: '/test',
    additional: 'Testing 123',
})
    .then(() => {
        console.log('Successfully saved asset usage');

        return bynder.getAssetUsage({id: ASSET_ID})
    })
   .then((data) => {
        console.log(data);

        return bynder.deleteAssetUsage({
            id: ASSET_ID,
            integration_id: 'b242c16d-70f4-4101-8df5-87b35bbe56f0',
            uri: '/test',
        })
    })
    .then(() => {
        console.log('Successfully deleted asset usage');
    })
    .catch((error) => {
        console.error(error);
    });