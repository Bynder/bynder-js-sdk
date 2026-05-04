const fs = require('fs');
const path = require('path');
const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const uploadVersionSample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 
    
    // Replace this with the actual asset ID you want to add a new version to
    const EXISTING_ASSET_ID = '56710C26-FDC0-4F42-B45D70FCC630D02A';
    
    const brands = await bynder.getBrands();
    const brand = brands[0];
    const file = `${__dirname}/testasset_newversion.bmp`;
    
    try {
        const result = await bynder.uploadFile({
            filename: path.basename(file),
            body: fs.readFileSync(file),
            data: {
                mediaId: EXISTING_ASSET_ID, // Using mediaId uploads as a new version
                brandId: brand.id,
                name: 'test asset - new version'
            }
        }, console.log);
        
        console.log('New version uploaded successfully:', result);
    } catch (error) {
        console.error('Error uploading new version:', error);
    }
}

uploadVersionSample()
