/**
 * This class handles downloading data from AWR.
 */

import fs from 'fs';
import axios from 'axios';
import { DownloaderConfig } from "./dto/DownloaderConfig";
import { StatbidMessageLogger } from "./helpers/StatbidMessageLogger";
require('dotenv').config();
export class AWRDownloader {
    private static SERVICE_NAME = 'awr-downloader';
    private logger = new StatbidMessageLogger();
    private config = new DownloaderConfig();
    private formattedStartDate = "";
    private formattedStopDate = "";


    
    async execute(config: DownloaderConfig, project:string) {
        try {
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);

            this.config = config;
            this.formattedStartDate = this.formatDate(startDate);
            this.formattedStopDate = this.formatDate(today);

            const { projects } = config;
            if (!projects || projects.length === 0) {
                this.logger.logError(
                    AWRDownloader.SERVICE_NAME,
                    'AWR downloader',
                    "No projects found in config"
                );
                return;
            }
            
            await this.fetchDataProc(project);
            // await this.deleteFolderIfExists('downloaded');
            // await this.deleteFolderIfExists('extracted');
        } catch (error: any) {
            this.logger.logFatal(
                AWRDownloader.SERVICE_NAME,
                'AWR downloader',
                error.message
            );
        } finally {
            this.logger.logInfo(
                AWRDownloader.SERVICE_NAME,
                'AWR downloader',
                `AWR download complete.`
            )
        }
    }

    private async fetchDataProc(projectName: string): Promise<void> {
        const data = await this.fetchData(projectName);
        if (data && data.details) {
            await this.downloadAndExtractZip(data.details, projectName);
        } else {
            this.logger.logError(
                AWRDownloader.SERVICE_NAME,
                'AWR downloader',
                "No Data Found"
            );
        }
    }

    private async fetchData(projectName: string): Promise<any | null> {
        const { apikey: API_KEY } = this.config;

        try {
            const options = {
                method: 'GET',
                url: `https://api.awrcloud.com/v2/get.php?project=${projectName}&startDate=${this.formattedStartDate}&stopDate=${this.formattedStopDate}&addProjectName=yes&encodeurl=false&format=csv&searchEngineId=-1&keywordGroupId=-1&websiteId=-1&addSearchIntent=false&addTitleLinks=false&token=${API_KEY}&action=export_ranking`,
                headers: { accept: 'application/json' }
            };

            const response = await axios(options);
            if (response.data.response_code == 0 || response.data.response_code == 10) {
                this.logger.logInfo(AWRDownloader.SERVICE_NAME, `AWR_downloader ${projectName}`, 'The data is exist. Downloading')
                return response.data;
            }
            else {
                this.logger.logWarning(AWRDownloader.SERVICE_NAME, "Something went wrong", 'please check your input again and then try again');
                return null;
            }
        } catch (error: any) {
            this.logger.logFatal(
                AWRDownloader.SERVICE_NAME,
                'AWR downloader',
                error.message
            );
            return null;
        }
    }

    private async downloadAndExtractZip(zipFileUrl: string, projectName: string): Promise<void> {
        const downloadFilePath = `downloaded/${projectName}.zip`;

        const downloadDirectory = downloadFilePath.substring(0, downloadFilePath.lastIndexOf('/'));
        if (!fs.existsSync(downloadDirectory)) {
            fs.mkdirSync(downloadDirectory, { recursive: true });
        }

        try {
            const response = await axios({
                method: 'get',
                url: zipFileUrl,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(downloadFilePath);

            await new Promise((resolve, reject) => {
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (error: any) {
            this.logger.logError(
                AWRDownloader.SERVICE_NAME,
                'AWR downloader',
                `Error downloading or extracting zip: ${error.message}`
            );
            throw error;
        }
    }




    private formatDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }


}