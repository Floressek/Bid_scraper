const { scrapeTenders } = require('./scrapers/puppeteer/tender-scraper');
const {createLogger} = require('./utils/logger/logger');
const logger = createLogger(__filename);
const path = require('path');
const fs = require('fs');

logger.info('Starting application...');

async function main() {
    try {
        logger.info('Entering main function...');
        logger.info('Starting tender scraping...');
        const tenders = await scrapeTenders();

        const outputPath = path.join(__dirname, '../data/raw/tenders.json');
        fs.writeFileSync(outputPath, JSON.stringify(tenders, null, 2));

        logger.info(`Scraped ${tenders?.length || 0} tenders successfully`);
    } catch (error) {
        logger.error('Error:', error);
        logger.error('Main execution failed:', error);
    }
}

main();