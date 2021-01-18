const fs = require('fs');
const path = require('path');

const Bynder = require('../dist/bynder-js-sdk.cjs');
const configs = require('../secret.example.json');

const bynder = new Bynder(configs);

bynder.getBrands()
  .then((data) => {
    console.log(data)
    const brand = data[0];
    const file = `${__dirname}/testasset.png`;
    return bynder.uploadFile({
      filename: path.basename(file),
      body: fs.readFileSync(file),
      data: {
        brandId: brand.id,
        name: 'test asset'
      }
    });
  })
  .then((data) => {
    console.log(data)
    const file = `${__dirname}/testasset.png`;
    return bynder.uploadFile({
      filename: path.basename(file),
      body: fs.readFileSync(file),
      data: {
        mediaId: data['mediaid']
      }
    });
  })
  .then(printResponse)
  .catch((error) => {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  });

function printResponse(data) {
  console.log(`File uploaded with mediaid ${data['mediaid']}`); // eslint-disable-line no-console
  console.log('Response body: '); // eslint-disable-line no-console
  console.log(data); // eslint-disable-line no-console
  process.exit(0);
}


