const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const loadConfig = (configFilePath) => {
    try {
        const configFile = fs.readFileSync(configFilePath);
        return JSON.parse(configFile);
    } catch (error) {
        console.error('Error reading config file:', error);
        return null;
    }
  };

async function convert(startDate, stopDate, projectName) {
    const configFilePath = 'config.json'; 
    const config = loadConfig(configFilePath);
    if (!config) {
        console.error('Failed to load config. Exiting...');
        return;
    }
    const name = projectName.replace(/\s/g, '+');
    const credentialsPath = config.credentialsPath;
    const datasetId = 'AWR';
    const tableId = "Advanced Web Ranking"
    const csvFilePath = `extracted/${name}-ranking-export-${startDate}-${stopDate}.csv`;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    const bigquery = new BigQuery();

    async function createTableFromCSV() {
        try {
            await bigquery.dataset(datasetId).table(tableId).load(csvFilePath, {
                sourceFormat: 'CSV',
                autodetect: true,
                skipLeadingRows: 1,
                writeDisposition: 'WRITE_APPEND',
            });

            console.log(`Data was appended at ${stopDate}.`);
        } catch (error) {
            console.error('Error creating table:', error);
        }
    }

    await createTableFromCSV();
}

module.exports = { convert };