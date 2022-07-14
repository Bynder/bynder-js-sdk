const fs = require('fs');
const path = require('path');
const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const bynder = new Bynder(configs);

bynder.getBrands()
    .then((data) => {
        const brand = data[0];
        const file = `${__dirname}/testasset.png`;
        return bynder.uploadFile({
          filename: path.basename(file),
          body: fs.readFileSync(file),
          data: {
            brandId: brand.id,
            name: 'test asset'
          }
        }, console.log);
    })
    .then(console.log)
    .catch((error) => {
        console.error(error);
    });
