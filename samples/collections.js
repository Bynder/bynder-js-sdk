const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

const bynder = new Bynder(configs);

bynder.getCollections({
    type: 'image',
    limit: 9,
    page: 1
})
    .then((data) => {
        console.log('getCollections', data, '\n\n');
        const collectionId = data[0].id || '';
        return bynder.getCollection({
            id: collectionId
        });
    })
    .then((data) => {
        console.log('getCollection', data, '\n\n');
        return bynder.createCollection({
            name: 'test',
            description: 'for API test'
        });
    })
    .then((data) => {
        console.log('createCollection', data, '\n\n');
    })
    .catch((error) => {
        console.log(error);
    });
