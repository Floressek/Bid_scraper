const { PuppeteerListingsScraper  } = require('./scrapers/puppeteer/listings-scraper');
const db = require('./utils/database/mongo');
const path = require('path');
const fs = require('fs');

const {createLogger} = require('./utils/logger/logger');
const logger = createLogger(__filename);
logger.info('Starting application...');

async function main() {
    try {
        await db.connect();
        logger.info('Starting tender scraping...');

        logger.info('Entering main function...');
        logger.info('Starting tender scraping...');
        const scraper = new PuppeteerListingsScraper();
        const tenders = await scraper.scrape();

        await db.saveListings(tenders, 'PUPPETEER');
        logger.info(`Scraped ${tenders?.length || 0} tenders successfully`);

        await db.disconnect();
    } catch (error) {
        logger.error('Main execution failed:', error);
        await db.disconnect();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}