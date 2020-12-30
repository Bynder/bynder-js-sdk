const fs = require('fs');
const path = require('path')
const yargs = require('yargs');

const Bynder = require('../dist/bynder-js-sdk.cjs');


let argv = yargs
  .alias('b', 'base-url')
  .alias('p', 'permanent-token')
  .alias('f', 'file')
  .usage('Usage: $0 [options]')
  .example('$0 -b https://portal.getbynder.com/ -p permanenttoken')
  .example('$0 -b https://portal.getbynder.com/ -p permanenttoken -f /path/to/my/file.jpg')
  .describe('b', 'Base url of the portal')
  .describe('p', 'Permanent token')
  .describe('f', 'Path of the file to upload - optional')
  .help('h')
  .alias('h', 'help')
  .argv;

const bynder = new Bynder({
  baseURL: argv['base-url'],
  permanentToken: argv['permanent-token'],
});

bynder.getBrands()
  .then((data) => {
    const brand = data[0];
    const file = argv['file'] || `${__dirname}/testasset.png`;
    return bynder.uploadFile({
      filename: path.basename(file),
      body: fs.readFileSync(file),
      data: {
        brandId: brand.id,
        name: 'test asset'
      }
    });
  })
  .then(printResponse)
  .catch((error) => {
    console.error(error);
  });

  function printResponse(data) {
    console.log(`File uploaded with mediaid ${data['mediaid']}`);
    console.log('Response body: ');
    console.log(data);
  } ;
  