const fs = require('fs');
const axios = require('axios');
const unzipper = require('unzipper');

async function unzip(props, projectName) {
  return new Promise((resolve, reject) => {
    const zipFileUrl = props;
    const downloadFilePath = `downloaded/${projectName}.zip`;
    const destinationFolder = 'extracted';

    const downloadDirectory = downloadFilePath.substring(0, downloadFilePath.lastIndexOf('/'));
    if (!fs.existsSync(downloadDirectory)) {
      fs.mkdirSync(downloadDirectory, { recursive: true });
    }

    axios({
      method: 'get',
      url: zipFileUrl,
      responseType: 'stream'
    })
      .then(response => {
        const writer = fs.createWriteStream(downloadFilePath);
        response.data.pipe(writer);

        writer.on('finish', () => {
          if (!fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder);
          }

          fs.createReadStream(downloadFilePath)
            .pipe(unzipper.Extract({ path: destinationFolder }))
            .on('close', () => {
              resolve();
            })
            .on('error', err => {
              console.error('Error extracting zip:', err);
              reject(err);
            });
        });

        writer.on('error', err => {
          console.error('Error writing zip file:', err);
          reject(err);
        });
      })
      .catch(error => {
        console.error('Error downloading zip:', error);
        reject(error);
      });
  });
}

module.exports = { unzip };
