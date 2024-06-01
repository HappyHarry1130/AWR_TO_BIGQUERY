const axios = require('axios');
const { unzip } = require('./unzip');
const { convert } = require('./convert');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
require('dotenv').config();
const cron = require('node-cron');


const loadConfig = (configFilePath) => {
  try {
      const configFile = fs.readFileSync(configFilePath);
      return JSON.parse(configFile);
  } catch (error) {
      console.error('Error reading config file:', error);
      return null;
  }
};

// Utils Function
async function deleteFolderIfExists(folderPath) {
  try {
    await fsPromises.access(folderPath);
    await fsPromises.rm(folderPath, { recursive: true, force: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
    } else {
      console.error(`Error deleting '${folderPath}' folder:`, err);
    }
  }
}

function readLinesFromFilePromise(filename) {
  return new Promise((resolve, reject) => {
    const lines = [];
    const readline = require('readline');
    const readStream = fs.createReadStream(filename);

    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      lines.push(line);
    });

    rl.on('close', () => {
      resolve(lines);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}


function formatDate(date) {
  var day = String(date.getDate()).padStart(2, '0');
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var year = date.getFullYear();
  var formattedDate = year + '-' + month + '-' + day;

  return formattedDate;
}

// Constants

var today = new Date();
var startdate = new Date;
startdate.setDate(today.getDate() - 7);
var startdate = formatDate(startdate);
var stopdate = formatDate(today);

// Fetch Data from AWR
async function fetchData(projectName) {

  const configFilePath = 'config.json'; 
  const config = loadConfig(configFilePath);
  if (!config) {
      console.error('Failed to load config. Exiting...');
      return;
  }

  const API_KEY = config.apikey;
  try {
    const options = {
      method: 'GET',
      url : `https://api.awrcloud.com/v2/get.php?project=${projectName}&startDate=${startdate}&stopDate=${stopdate}&addProjectName=yes&encodeurl=false&format=csv&searchEngineId=-1&keywordGroupId=-1&websiteId=-1&addSearchIntent=false&addTitleLinks=false&token=${API_KEY}&action=export_ranking`,
      headers: { accept: 'application/json' }
    };

    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return error.message;
  }
}

async function fetchDataProc(projectName) {
  let data;
  data = await fetchData(projectName);
  await unzip(data.details, projectName);
}

// Push To BigQuery
async function CsvToBigquery(projectName) {
  await fetchDataProc(projectName);
  await convert(startdate, stopdate, projectName);
}

async function run() {
  const lines = await readLinesFromFilePromise('project.txt');
  const processingPromises = lines.map(line => {
    if (line) {
      return CsvToBigquery(line);
    }
  });

  await Promise.all(processingPromises);

  await deleteFolderIfExists("downloaded");
  await deleteFolderIfExists("extracted");
}

run();
// Scheduling
// cron.schedule('0 0 * * *', async () => {
//   run();
// });