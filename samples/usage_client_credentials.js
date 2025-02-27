const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const usageSample = async () => {
    const bynder = new Bynder(configs);
    try {
        const token = await bynder.getTokenClientCredentials();

        const ASSET_ID = 'B3A6E924-E6F4-47AD-96D68F4C32B745D0';

        await bynder.saveNewAssetUsage({
            id: ASSET_ID,
            integration_id: 'b242c16d-70f4-4101-8df5-87b35bbe56f0',
            timestamp: "2017-04-19T11:36:36.799508+00:00",
            uri: '/test',
            additional: 'Testing 123',
        });
        console.log('Successfully saved asset usage');

        const assetUsage = await bynder.getAssetUsage({ id: ASSET_ID });
        console.log(assetUsage);

        await bynder.deleteAssetUsage({
            id: ASSET_ID,
            integration_id: 'b242c16d-70f4-4101-8df5-87b35bbe56f0',
            uri: '/test',
        });
        console.log('Successfully deleted asset usage');
    } catch (error) {
        console.error('Error:', error);
    }
};

usageSample();