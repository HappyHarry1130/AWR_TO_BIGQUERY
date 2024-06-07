import { ConfigHelper } from "./helpers/ConfigHelper";
import { AWRDownloader } from "./AWRDownloader";

// Main function accepting project as an argument
async function main(project: string) {
    try {
        const configHelper = new ConfigHelper();
        const config = await configHelper.getConfig();

        if (config) {
            const awrDownloader = new AWRDownloader();
            const result = await awrDownloader.execute(config, project);
            // You can handle the result here if needed
        }
    } catch (err) {
        process.stderr.write(err + '\n');
    } finally {
        process.stderr.write('Done.\n');
    }
}

// Get the project parameter from command-line arguments
const project = process.argv[2];
if (project) {
    main(project);
} else {
    process.stderr.write('Error: No project specified.\n');
    process.exit(1);
}
