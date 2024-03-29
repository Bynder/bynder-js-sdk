const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const bynder = new Bynder(configs);

const byndertestproperty = 'byndertestproperty';
let metaId;
let optionId;

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
        return bynder.saveNewMetapropertyOption({
            id: metaId,
            name: 'optiontest'
        });
    })
    .then((data) => {
        console.log('saveNewMetapropertyOption', data, '\n\n');
        return bynder.getMetaproperty({
            id: metaId
        });
    })
    .then((data) => {
        console.log('getMetaproperty', data, '\n\n');
        optionId = data.options[0].id;
        console.log('Metaproperty option', optionId, '\n\n');
        return bynder.editMetapropertyOption({
            id: metaId,
            optionId,
            label: 'Option Test'
        });
    })
    .then((data) => {
        console.log('editMetapropertyOption', data, '\n\n');
        return bynder.getMetaproperty({
            id: metaId
        });
    })
    .then((data) => {
        console.log('getMetaproperty', data, '\n\n');
        optionId = data.options[0].id;
        console.log('Metaproperty option', optionId, '\n\n');
        return bynder.deleteMetapropertyOption({
            id: metaId,
            optionId
        });
    })
    .then((data) => {
        console.log('deleteMetapropertyOption', data, '\n\n');
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
