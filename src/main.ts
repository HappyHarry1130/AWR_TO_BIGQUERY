import { ConfigHelper } from "./helpers/ConfigHelper";
import { AWRDownloader } from "./AWRDownloader";

async function main(project: string) {
    try {
        const configHelper = new ConfigHelper();
        const config = await configHelper.getConfig();

        if (config) {
            const awrDownloader = new AWRDownloader();
            await awrDownloader.execute(config, project);
        }
    } catch (err) {
        process.stderr.write(err + '\n');
    } finally {
        process.stderr.write('Done.\n');
    }
}

const project = process.argv[2];

if (project) {
    main(project);
} else {
    process.stderr.write('Error: No project specified.\n');
    process.exit(1);
}
