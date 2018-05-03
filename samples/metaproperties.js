const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

const bynder = new Bynder(configs);

const byndertestproperty = 'byndertestproperty';
let metaId;

bynder.saveNewMetaproperty({
    name: byndertestproperty,
    label: 'byndertestlabel',
    type: 'select'
})
    .then((data) => {
        console.log('saveMetaproperty', data, '\n\n');
        return bynder.getMetaproperties();
    })
    .then((data) => {
        console.log('getMetaproperties', data, '\n\n');
        data.forEach((metaproperty) => {
            if (metaproperty.name === byndertestproperty) {
                metaId = metaproperty.id;
            }
        });
        return bynder.getMetaproperty({
            id: metaId
        });
    })
    .then((data) => {
        console.log('getMetaproperty', data, '\n\n');
        return bynder.editMetaproperty({ id: metaId, label: 'byndertestlabel_mod' });
    })
    .then((data) => {
        console.log('editMetaproperty', data, '\n\n');
        return bynder.getMetaproperty({
            id: metaId
        });
    })
    .then((data) => {
        console.log('getMetaproperty', data, '\n\n');
        return bynder.deleteMetaproperty({
            id: metaId
        });
    })
    .then((data) => {
        console.log('deleteMetaproperty', data, '\n\n');
    })
    .catch((error) => {
        console.log(error);
    });
