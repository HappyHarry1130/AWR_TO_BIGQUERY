import axios from 'axios';
import { unzip } from './unzip';
import { convert } from './convert';
import fs from 'fs';
import fsPromises from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

interface Config {
  apikey: string;
  apiUrl: string;
  projects: string[];
}

interface ApiResponse {
  details: string; 
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

// Utils Function
async function deleteFolderIfExists(folderPath: string): Promise<void> {
  try {
    await fsPromises.access(folderPath);
    await fsPromises.rm(folderPath, { recursive: true, force: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    } else {
      console.error(`Error deleting '${folderPath}' folder:`, err);
    }
  }
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

// Constants
const today = new Date();
const startDate = new Date(today);
startDate.setDate(today.getDate() - 7);
const formattedStartDate = formatDate(startDate);
const formattedStopDate = formatDate(today);

// Fetch Data from AWR
async function fetchData(projectName: string): Promise<ApiResponse | null> {
  const configFilePath = './config.json';
  const config = loadConfig(configFilePath);
  if (!config) {
    console.error('Failed to load config. Exiting...');
    return null;
  }

  const { apikey: API_KEY, apiUrl, projects } = config;
  if (!projects.includes(projectName)) {
    console.error(`Project '${projectName}' not found in config. Exiting...`);
    return null;
  }

  try {
    const options = {
      method: 'GET',
      url: `${apiUrl}?project=${projectName}&startDate=${formattedStartDate}&stopDate=${formattedStopDate}&addProjectName=yes&encodeurl=false&format=csv&searchEngineId=-1&keywordGroupId=-1&websiteId=-1&addSearchIntent=false&addTitleLinks=false&token=${API_KEY}&action=export_ranking`,
      headers: { accept: 'application/json' }
    };

    const response = await axios(options);
    return response.data as ApiResponse;
  } catch (error) {
    console.error('Error fetching data:', (error as Error).message);
    return null;
  }
}

async function fetchDataProc(projectName: string): Promise<void> {
  const data = await fetchData(projectName);
  if (data && data.details) {
    await unzip(data.details, projectName);
  } else {
    console.error('No details found in the response');
  }
}

// Push To BigQuery
async function CsvToBigquery(projectName: string): Promise<void> {
  await fetchDataProc(projectName);
  await convert(formattedStartDate, formattedStopDate, projectName)
  .then(() => console.log('Conversion completed successfully.'))
  .catch((error) => console.error('Error during conversion:', error));
}

async function run(): Promise<void> {
  const configFilePath = './config.json';
  const config = loadConfig(configFilePath);
  if (!config) {
    console.error('Failed to load config. Exiting...');
    return;
  }

  const { projects } = config;
  if (!projects || projects.length === 0) {
    console.error('No projects found in config. Exiting...');
    return;
  }

  const processingPromises = projects.map((projectName) => {
    if (projectName) {
      return CsvToBigquery(projectName);
    }
  });

  await Promise.all(processingPromises);

  await deleteFolderIfExists('downloaded');
  await deleteFolderIfExists('extracted');
}

run().catch(console.error);
