const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const smartFiltersSample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 

    bynder.getSmartfilters()
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error(error);
      });
}

smartFiltersSample();
