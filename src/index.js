// const {createLogger} = require('./utils/logger/logger');
// const config = require('./utils/config/config'); // Import config early to override values
// const puppeteerScraper = require('./scrapers/puppeteer/listings-scraper');
// const apiScraper = require('./scrapers/api/api-scraper');
// const officialApiScraper = require('./scrapers/api/official-api-scraper');
// const detailsScraper = require('./scrapers/puppeteer/details-scraper');
// const SCRAPER_TYPES = require('./scrapers/base/scraper-types');
// const correctionProcessor = require('./scrapers/puppeteer/correction-processor');
//
//
// const logger = createLogger(__filename);
//
// // Override configuration based on command-line flag
// if (process.argv.includes('--presentation')) {
//     logger.info('Running in PRESENTATION mode.');
//     // Presentation mode: non-headless, scanning off (no extra delays/visuals)
//     config.puppeteer.launch.headless = false;
//     // config.scanning = false;
// } else if (process.argv.includes('--server')) {
//     logger.info('Running in SERVER mode.');
//     // Server mode: headless, scanning on (default production configuration)
//     config.puppeteer.launch.headless = true;
//     // config.scanning = true;
// } else {
//     logger.info('No mode flag provided; using default configuration.');
// }
//
// async function startDetailsScraperWithDelay(delay = 30000) {
//     logger.info(`Details scraper will start in ${delay / 1000} seconds...`);
//     return new Promise((resolve, reject) => {
//         setTimeout(async () => {
//             try {
//                 logger.info('Starting details scraper...');
//                 await detailsScraper.startProcessing();
//                 logger.info('Details scraper finished successfully');
//                 resolve();
//             } catch (error) {
//                 logger.error('Error in details scraper:', {
//                     message: error.message,
//                     stack: error.stack
//                 });
//                 reject(error);
//             }
//         }, delay);
//     });
// }
//
// async function main() {
//     logger.info('Starting application...');
//
//     const scraperType = process.argv[2] || 'normal';
//     const shouldProcessDetails = process.argv[3] === '--with-details';
//     const onlyDetails = process.argv[3] === '--only-details';
//     const withCorrection = process.argv[3] === '--correction';
//
//     try {
//         if (withCorrection) {
//             logger.info('Starting correction processor...');
//             await correctionProcessor.initialize();
//             await correctionProcessor.processDetails();
//             await correctionProcessor.cleanup();
//             logger.info('Correction processing completed');
//             process.exit(0);
//         }
//         switch (scraperType.toLowerCase()) {
//             case 'normal':
//                 logger.info('Starting application with puppeteer scraper');
//                 if (onlyDetails) {
//                     logger.info('Running only details scraper');
//                     await detailsScraper.startProcessing();
//                 } else if (shouldProcessDetails) {
//                     logger.info('Details processing enabled');
//                     const results = await Promise.allSettled([
//                         puppeteerScraper.scrape(),
//                         startDetailsScraperWithDelay(30000)
//                     ]);
//
//                     // Log results of both operations
//                     results.forEach((result, index) => {
//                         const operationName = index === 0 ? 'Listings Scraper' : 'Details Scraper';
//                         if (result.status === 'fulfilled') {
//                             logger.info(`${operationName} completed successfully`);
//                         } else {
//                             logger.error(`${operationName} failed:`, {
//                                 message: result.reason.message,
//                                 stack: result.reason.stack
//                             });
//                         }
//                     });
//
//                     // If main scraper failed, throw error
//                     if (results[0].status === 'rejected') {
//                         throw results[0].reason;
//                     }
//                 } else {
//                     logger.info('Running listings scraper only');
//                     await puppeteerScraper.scrape();
//                 }
//                 break;
//
//             case 'xhr':
//                 logger.info('Starting application with xhr scraper');
//                 if (onlyDetails) {
//                     logger.info('Running only details scraper');
//                     await detailsScraper.startProcessing();
//                 } else if (shouldProcessDetails) {
//                     logger.info('Details processing enabled for XHR scraper');
//
//                     const results = await Promise.allSettled([
//                         apiScraper.scrape(),
//                         startDetailsScraperWithDelay(30000)
//                     ]);
//
//                     results.forEach((result, index) => {
//                         const operationName = index === 0 ? 'XHR Scraper' : 'Details Scraper';
//                         if (result.status === 'fulfilled') {
//                             logger.info(`${operationName} completed successfully`);
//                         } else {
//                             logger.error(`${operationName} failed:`, {
//                                 message: result.reason.message,
//                                 stack: result.reason.stack
//                             });
//                         }
//                     });
//
//                     if (results[0].status === 'rejected') {
//                         throw results[0].reason;
//                     }
//                 } else {
//                     await apiScraper.scrape();
//                 }
//                 break;
//
//             case 'api':
//                 logger.info('Starting application with official API scraper');
//                 if (onlyDetails) {
//                     logger.info('Running only details scraper');
//                     await detailsScraper.startProcessing();
//                 } else if (shouldProcessDetails) {
//                     logger.info('Details processing enabled for Official API scraper');
//
//                     const results = await Promise.allSettled([
//                         officialApiScraper.scrape(),
//                         startDetailsScraperWithDelay(30000)
//                     ]);
//
//                     results.forEach((result, index) => {
//                         const operationName = index === 0 ? 'Official API Scraper' : 'Details Scraper';
//                         if (result.status === 'fulfilled') {
//                             logger.info(`${operationName} completed successfully`);
//                         } else {
//                             logger.error(`${operationName} failed:`, {
//                                 message: result.reason.message,
//                                 stack: result.reason.stack
//                             });
//                         }
//                     });
//
//                     if (results[0].status === 'rejected') {
//                         throw results[0].reason;
//                     }
//                 } else {
//                     await officialApiScraper.scrape();
//                 }
//                 break;
//
//             case 'details': // Standalone details scraper
//                 logger.info('Running details scraper standalone');
//                 await detailsScraper.startProcessing();
//                 break;
//
//             default:
//                 logger.error('Invalid scraper type. Use: normal, xhr, api, or details');
//                 process.exit(1);
//         }
//
//         logger.info('Application finished successfully');
//         process.exit(0);
//
//     } catch (error) {
//         logger.error('Application failed:', {
//             name: error.name,
//             message: error.message,
//             stack: error.stack
//         });
//         process.exit(1);
//     }
// }
//
// // Handle unhandled promise rejections
// process.on('unhandledRejection', (error) => {
//     logger.error('Unhandled promise rejection:', {
//         name: error.name,
//         message: error.message,
//         stack: error.stack
//     });
//     process.exit(1);
// });
//
// main().catch(error => {
//     logger.error('Application failed:', {
//         name: error.name,
//         message: error.message,
//         stack: error.stack
//     });
//     process.exit(1);
// });

const {createLogger} = require('./utils/logger/logger');

// const logger = createLogger(__filename);
//
// logger.group('Zadanie importu');
// logger.info('Rozpoczynam import');
//
// logger.time('całość');
//
// logger.progress(0, 100, 'Import:');
//
// logger.group('Walidacja danych');
// logger.info('Sprawdzam strukturę');
// logger.table([
//     { field: 'id', valid: true, errors: [] },
//     { field: 'name', valid: false, errors: ['missing'] }
// ]);
// logger.groupEnd();
//
// logger.separator();
//
// try {
//     throw new Error('Test error');
// } catch (error) {
//     logger.error('Błąd importu', error);
// }
//
// logger.progress(100, 100, 'Import:');
// logger.timeEnd('całość', 'Import zakończony w:');
// logger.groupEnd();

const logger = createLogger(__filename);

logger.group('🚀 Nowe zadanie');

// Box informacyjny
logger.box('Ważne informacje o zadaniu\nDodatkowe szczegóły', 'INFO');

// Status z ikonami
logger.success('Połączenie ustanowione');
logger.warning('Znaleziono duplikaty');

// Spinner podczas operacji
logger.progressWithSpinner('Przetwarzanie danych...');
setTimeout(() => {
    logger.progressWithSpinner('Dane przetworzone!', true);
}, 2000);

// Różne separatory
logger.separator('double', 'Sekcja 1');
logger.info('Jakaś informacja');
logger.separator('dashed');

// Lepszy progress bar
logger.progress(75, 100, 'Import:', {
    width: 40,
    colored: true,
    showPercentage: true,
    showFraction: true
});

logger.groupEnd();