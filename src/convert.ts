import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

interface Config {
    credentialsPath: string;
    Bigquery: {
        DatasetID: string;
        TableID: string;
    };
}

const loadConfig = (configFilePath: string): Config | null => {
    try {
        const configFile = fs.readFileSync(configFilePath, 'utf-8');
        return JSON.parse(configFile) as Config;
    } catch (error) {
        console.error('Error reading config file:', error);
        return null;
    }
};

async function convert(startDate: string, stopDate: string, projectName: string): Promise<void> {
    const configFilePath = '/home/devops/AWR_TO_BIGQUERY/config.json';
    const config = loadConfig(configFilePath);
    if (!config) {
        console.error('Failed to load config. Exiting...');
        return;
    }
    const name = projectName.replace(/\s/g, '+');
    const credentialsPath = config.credentialsPath;
    const datasetId = config.Bigquery.DatasetID;
    const tableId = config.Bigquery.TableID;
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

export { convert };
