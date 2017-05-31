const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

const bynder = new Bynder(configs);

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
        console.log('getAssets without parameters', data, '\n\n');
        return bynder.getMediaInfo({
            id: '00000000-0000-0000-0000000000000000',
            versions: 0
        });
    })
    .then((data) => {
        console.log('getAsset', data, '\n\n');
        return bynder.getMediaTotal({
            propertyOptionId: ['00000000-0000-0000-0000000000000000', '00000000-0000-0000-0000000000000000']
        });
    })
    .then((data) => {
        console.log('getAssetsTotal', data, '\n\n');
        return bynder.getMediaList({
            page: 1,
            limit: 9,
            propertyOptionId: ['00000000-0000-0000-0000000000000000']
        });
    })
    .then((data) => {
        console.log('getAssets', data, '\n\n');
        return bynder.editMedia({
            id: '00000000-0000-0000-0000000000000000',
            description: '',
            'metaproperty.00000000-0000-0000-0000000000000000': '00000000-0000-0000-0000000000000000'
        });
    })
    .then((data) => {
        console.log('editMedia', data, '\n\n');
        return bynder.getAllMediaItems();
    })
    .then((data) => {
        console.log('getAllAssets', data.length, '\n\n');
    })
    .catch((error) => {
        console.log(error);
    });
