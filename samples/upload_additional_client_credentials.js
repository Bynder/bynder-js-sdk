const fs = require('fs');
const path = require('path');
const Bynder = require('../dist/bynder-js-sdk.js');
const configs = require('../secret.json');

const uploadAdditionalSample = async () => {
    const bynder = new Bynder(configs);
    const token = await bynder.getTokenClientCredentials(); 
    
    // Replace this with the actual asset ID you want to add additional files to
    const EXISTING_ASSET_ID = '56710C26-FDC0-4F42-B45D70FCC630D02A';
    
    const brands = await bynder.getBrands();
    const brand = brands[0];
    const file = `${__dirname}/testasset_newversion.bmp`;
    
    try {
        const result = await bynder.uploadFile({
            filename: path.basename(file),
            body: fs.readFileSync(file),
            additional: true, // This indicates we're adding an additional file
            data: {
                id: EXISTING_ASSET_ID, // The asset ID to add the additional file to
                brandId: brand.id,
                name: 'test asset - additional file'
            }
        }, console.log);
        
        console.log('Additional file uploaded successfully:', result);
    } catch (error) {
        console.error('Error uploading additional file:', error);
    }
}

uploadAdditionalSample()
