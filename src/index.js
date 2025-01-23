const { scrapeTenders } = require('./scrapers/puppeteer/tender-scraper');
const logger = require('./utils/logger/logger');
const path = require('path');
const fs = require('fs');

console.log('Starting application...');

async function main() {
    try {
        console.log('Entering main function...');
        logger.info('Starting tender scraping...');
        const tenders = await scrapeTenders();

        const outputPath = path.join(__dirname, '../data/raw/tenders.json');
        fs.writeFileSync(outputPath, JSON.stringify(tenders, null, 2));

        logger.info(`Scraped ${tenders?.length || 0} tenders successfully`);
    } catch (error) {
        console.error('Error:', error);
        logger.error('Main execution failed:', error);
    }
}

main();