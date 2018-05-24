/* eslint-env jasmine */

const Bynder = require('../dist/bynder-js-sdk.js').default;
const configs = require('../secret.json');

const byndertestproperty = 'byndertestproperty';
const label = 'label';
const type = 'select';
let metaId;
let optionId;

describe('Save metaproperty', () => {
    let bynder;
    let saveDataResponse;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.saveNewMetaproperty({
            name: byndertestproperty,
            label: label,
            type: type
        })
        .then((data) => {
            saveDataResponse = data;
            done();
        })
        .catch(() => {
            done();
        });
    });

    it('Save one metaproperty', () => {
        expect(saveDataResponse).not.toBeUndefined();
    });
});

describe('Get metaproperties', () => {
    let bynder;
    let metaproperties;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getMetaproperties()
            .then((data) => {
                metaproperties = data;
                metaproperties.forEach((metaproperty) => {
                    if (metaproperty.name === byndertestproperty) {
                        metaId = metaproperty.id;
                    }
                });
                done();
            })
            .catch((error) => {
                metaproperties = error;
                done();
            });
    });

    it('Get all metaproperties', () => {
        expect(Array.isArray(metaproperties)).toEqual(true);
        expect(metaId).not.toBeUndefined();
    });
});

describe('Get metaproperty', () => {
    let bynder;
    let metaproperty;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getMetaproperty({
            id: metaId
        }).then((data) => {
            metaproperty = data;
            done();
        })
        .catch((error) => {
            metaproperty = error;
            done();
        });
    });

    it('Get one metaproperty', () => {
        expect(metaproperty.constructor).toEqual(Object);
        const metapropertyKeys = Object.keys(metaproperty);
        expect(metapropertyKeys).toContain('name');
        expect(metapropertyKeys).toContain('id');
        expect(metapropertyKeys).toContain('options');
        expect(metapropertyKeys).toContain('zindex');
        expect(metapropertyKeys).toContain('isFilterable');
    });
});

describe('Edit metaproperty', () => {
    let bynder;
    let response;
    let metaproperty;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.editMetaproperty({
            id: metaId,
            label: `${label}_mod`
        }).then((data) => {
            response = data;
            return bynder.getMetaproperty({ id: metaId });
        }).then((data) => {
            metaproperty = data;
            done();
        })
        .catch((error) => {
            metaproperty = error;
            done();
        });
    });

    it('Edit one metaproperty', () => {
        expect(response.statuscode).toEqual(201);
        expect(response.message).toEqual('Created');
        expect(metaproperty.constructor).toEqual(Object);
        expect(metaproperty.label).toEqual(`${label}_mod`);
        const metapropertyKeys = Object.keys(metaproperty);
        expect(metapropertyKeys).toContain('name');
        expect(metapropertyKeys).toContain('id');
        expect(metapropertyKeys).toContain('options');
        expect(metapropertyKeys).toContain('zindex');
        expect(metapropertyKeys).toContain('isFilterable');
    });
});

describe('Create an option to metaproperty', () => {
    let bynder;
    let result;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.createMetapropertyOption({
            id: metaId,
            name: 'optiontest'
        }).then((data) => {
            result = data;
            done();
        })
        .catch((error) => {
            result = error;
            done();
        });
    });

    it('Get options from metaproperty', () => {
        expect(result.constructor).toEqual(Object);
        const metapropertyKeys = Object.keys(result);
        expect(metapropertyKeys).toContain('statuscode');
        expect(metapropertyKeys).toContain('message');
        expect(result.statuscode).toBe(201);
        expect(result.message).toBe('Created');
    });
});

describe('Modify an option of metaproperty', () => {
    let bynder;
    let result;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getMetaproperty({
            id: metaId
        })
        .then((data) => {
            optionId = data.options[0].id;
        })
        .then(() => {
            return bynder.editMetapropertyOption({
                id: metaId,
                optionId,
                lable: 'Option Test'
            });
        }).then((data) => {
            result = data;
            done();
        })
        .catch((error) => {
            result = error;
            done();
        });
    });

    it('Modify an option of metaproperty', () => {
        expect(result.constructor).toEqual(Object);
        const metapropertyKeys = Object.keys(result);
        expect(metapropertyKeys).toContain('statuscode');
        expect(metapropertyKeys).toContain('message');
        expect(result.statuscode).toBe(201);
        expect(result.message).toBe('Created');
    });
});

describe('Delete an option of metaproperty', () => {
    let bynder;
    let result;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.getMetaproperty({
            id: metaId
        })
        .then((data) => {
            optionId = data.options[0].id;
        })
        .then(() => {
            return bynder.deleteMetapropertyOption({
                id: metaId,
                optionId
            });
        }).then((data) => {
            result = data;
            done();
        })
        .catch((error) => {
            result = error;
            done();
        });
    });

    it('Modify an option of metaproperty', () => {
        expect(result).not.toBeUndefined();
        expect(result.constructor).toEqual(Object);
        const metapropertyKeys = Object.keys(result);
        expect(metapropertyKeys.length).toBe(0);
    });
});

describe('Delete metaproperty', () => {
    let bynder;
    let deleteMetapropertyResponse;

    beforeEach((done) => {
        bynder = new Bynder(configs);

        bynder.deleteMetaproperty({
            id: metaId
        }).then((data) => {
            deleteMetapropertyResponse = data;
            done();
        })
        .catch(() => {
            done();
        });
    });

    it('Get all metaproperties', () => {
        expect(deleteMetapropertyResponse).not.toBeUndefined();
    });
});
