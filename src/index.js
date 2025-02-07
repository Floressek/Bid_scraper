// const PuppeteerListingsScraper = require('./scrapers/puppeteer/listings-scraper');
// const ApiListingsScraper = require('./scrapers/api/api-scraper');
// const db = require('./utils/database/mongo');
// const {createLogger} = require('./utils/logger/logger');
// const logger = createLogger(__filename);
// logger.info('Starting application...');
//
// async function main() {
//     const args = process.argv.slice(2);
//     const scraperType = args[0]?.toLowerCase() || 'normal';
//     const keyword = args[1] || '';
//
//     logger.info(`Starting application with ${scraperType} scraper${keyword ? ` and keyword: ${keyword}` : ''}`);
//     try {
//         await db.connect();
//         logger.info('Starting tender scraping...');
//
//         logger.info('Entering main function...');
//         const scraper = scraperType === 'xhr'
//             ? ApiListingsScraper
//             : PuppeteerListingsScraper;
//
//         logger.info('Starting tender scraping...');
//         const tenders = await scraper.scrape(keyword);
//         logger.info(`Scraped ${tenders?.length || 0} tenders successfully`);
//
//         await db.disconnect();
//     } catch (error) {
//         logger.error('Main execution failed:', error.message); // dodajmy .message
//         await db.disconnect();
//         process.exit(1);
//     }
// }
//
// if (require.main === module) {
//     main();
// }

const { createLogger } = require('./utils/logger/logger');
const puppeteerScraper = require('./scrapers/puppeteer/listings-scraper');
const apiScraper = require('./scrapers/api/api-scraper');
const officialApiScraper = require('./scrapers/api/official-api-scraper');
const detailsScraper = require('./scrapers/puppeteer/details-scraper');

const logger = createLogger(__filename);

async function startDetailsScraperWithDelay(delay = 30000) {
    logger.info(`Details scraper will start in ${delay/1000} seconds...`);
    return new Promise((resolve) => {
        setTimeout(async () => {
            try {
                logger.info('Starting details scraper...');
                await detailsScraper.startProcessing();
                resolve();
            } catch (error) {
                logger.error('Error starting details scraper:', error);
                resolve();
            }
        }, delay); // 30 seconds delay
    })
}

// async function main() {
//     logger.info('Starting application...');
//
//     const scraperType = process.argv[2] || 'normal';
//     const shouldProcessDetails = process.argv[3] === '--with-details';
//
//     switch(scraperType.toLowerCase()) {
//         case 'normal':
//             logger.info('Starting application with puppeteer scraper');
//             await puppeteerScraper.scrape();
//             break;
//         case 'xhr':
//             logger.info('Starting application with xhr scraper');
//             await apiScraper.scrape();
//             break;
//         case 'api':
//             logger.info('Starting application with official API scraper');
//             await officialApiScraper.scrape();
//             break;
//         default:
//             logger.error('Invalid scraper type. Use: normal, xhr, or api');
//             process.exit(1);
//     }
//
//     logger.info('Application finished');
//     process.exit(0);
// }

async function main() {
    logger.info('Starting application...');

    const scraperType = process.argv[2] || 'normal';
    const shouldProcessDetails = process.argv[3] === '--with-details';

    try {
        switch(scraperType.toLowerCase()) {
            case 'normal':
                logger.info('Starting application with puppeteer scraper');
                // Start both scrapers if details processing is requested
                if (shouldProcessDetails) {
                    // Start details scraper in background
                    const detailsPromise = startDetailsScraperWithDelay();
                    // Run main scraper
                    await puppeteerScraper.scrape();
                    // Wait for details scraper to finish
                    await detailsPromise;
                } else {
                    await puppeteerScraper.scrape();
                }
                break;

            case 'xhr':
                logger.info('Starting application with xhr scraper');
                if (shouldProcessDetails) {
                    const detailsPromise = startDetailsScraperWithDelay();
                    await apiScraper.scrape();
                    await detailsPromise;
                } else {
                    await apiScraper.scrape();
                }
                break;

            case 'api':
                logger.info('Starting application with official API scraper');
                if (shouldProcessDetails) {
                    const detailsPromise = startDetailsScraperWithDelay();
                    await officialApiScraper.scrape();
                    await detailsPromise;
                } else {
                    await officialApiScraper.scrape();
                }
                break;

            default:
                logger.error('Invalid scraper type. Use: normal, xhr, or api');
                process.exit(1);
        }

        logger.info('Application finished');
        process.exit(0);
    } catch (error) {
        logger.error('Application failed:', error);
        process.exit(1);
    }
}

main().catch(error => {
    logger.error('Application failed:', error);
    process.exit(1);
});