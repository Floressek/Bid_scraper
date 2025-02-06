const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const BaseScraper = require('../base/base-scraper');
const {getRandomUserAgent} = require('../../utils/helpers/browser-helpers');
const config = require('../../utils/config/config');
const {createLogger} = require('../../utils/logger/logger');

const logger = createLogger(__filename);

class PuppeteerListingsScraper extends BaseScraper {
    constructor() {
        super('PUPPETEER'); // This is the source of the scraper
        puppeteer.use(StealthPlugin());
    }

    // This is the main function that will be called from the main file
    // async scrape(keyword = 'microsoft') {
    //     await this.initialize(); // db connection
    //     // New version for both demo or production with browserless
    //     const browser = await puppeteer.launch(config.puppeteer.launch);
    //     const page = await browser.newPage();
    //
    //     try {
    //         // Error handling
    //         page.on('error', err => logger.error('Page error:', err));
    //         page.on('console', msg => logger.info('Browser console:', msg.text()));
    //         page.on('pageerror', err => logger.error('Page error:', err));
    //
    //         // Set headers before navigation
    //         await page.setExtraHTTPHeaders({
    //             'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    //             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //             'Accept-Encoding': 'gzip, deflate, br',
    //             'Connection': 'keep-alive',
    //             'Cache-Control': 'max-age=0',
    //         });
    //
    //         // Single navigation
    //         logger.info('Navigating to page...');
    //         await page.goto(config.baseUrl, {
    //             waitUntil: ['networkidle0', 'domcontentloaded'],
    //             timeout: 30000
    //         });
    //
    //         if (keyword) {
    //             logger.info(`Searching for tenders with keyword: ${keyword}`);
    //             await page.waitForSelector(config.selectors.searchInput);
    //             await page.type(config.selectors.searchInput, keyword);
    //             await page.waitForTimeout(2000);
    //             await page.waitForSelector('lib-table', {timeout: 10000});
    //             logger.info('Filter applied, waiting for results...');
    //         }
    //
    //         await page.waitForSelector('.pagination-container');
    //
    //         const allTenders = [];
    //         let hasNextPage = true;
    //         let pageNumber = 1;
    //
    //         while (hasNextPage && pageNumber <= 1000) { //FIXME: This is just a temporary limit for testing
    //             logger.info(`Scraping page ${pageNumber}`);
    //
    //             await new Promise(resolve => setTimeout(resolve, 2000));
    //             const pageTenders = await page.evaluate(() => {
    //                 const rows = Array.from(document.querySelectorAll('tbody tr'));
    //                 return rows.map(row => {
    //                     const cells = Array.from(row.querySelectorAll('td')); // Get all cells in the row, td => table data
    //                     return { // Return an object with the data we need
    //                         title: cells[0]?.textContent?.trim(),
    //                         number: cells[1]?.textContent?.trim(),
    //                         status: cells[2]?.textContent?.trim(),
    //                         publicationDate: cells[3]?.textContent?.trim(),
    //                         link: row.querySelector('a')?.href
    //                     };
    //                 });
    //             });
    //             await this.saveListings(pageTenders); // to the database SAVED
    //
    //             allTenders.push(...pageTenders);
    //             logger.info(`Found and saved ${pageTenders.length} tenders on page ${pageNumber}`);
    //
    //             // Check if there is a next page
    //             const hasNext = await page.evaluate(() => {
    //                 const nextButton = document.querySelector('.btn.btn-sm.btn-outline-secondary.append-arrow'); // Get the next button
    //                 return !nextButton.classList.contains('disabled'); // Check if the button is disabled - MAY INDICATE NO MORE PAGES
    //             });
    //
    //             if (hasNext) {
    //                 await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow'); // Click the next button
    //                 pageNumber++;
    //             } else {
    //                 hasNextPage = false;
    //             }
    //         }
    //         logger.info(`Total tenders scraped and saved: ${allTenders.length}`);
    //         return allTenders;
    //     } catch (error) {
    //         logger.error('Failed to load page:', error);
    //         return [];
    //     } finally {
    //         await browser.close();
    //         await this.db.disconnect();
    //     }
    // }
    async scrape(keyword = 'microsoft') {
        await this.initialize();
        let browser = null;
        let page = null;

        try {
            logger.info('Launching browser...');
            browser = await puppeteer.launch({
                ...config.puppeteer.launch,
                args: [
                    ...config.puppeteer.launch.args,
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            });

            logger.info('Creating new page...');
            page = await browser.newPage();

            // Error handling
            page.on('error', err => logger.error('Page error:', JSON.stringify(err, null, 2)));
            page.on('console', msg => logger.info('Browser console:', msg.text()));
            page.on('pageerror', err => logger.error('Page error:', JSON.stringify(err, null, 2)));

            // Set viewport
            logger.info('Setting viewport...');
            await page.setViewport({
                width: 1920,
                height: 1080
            });

            // Set headers
            logger.info('Setting headers...');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
            });

            // Set user agent
            const userAgent = getRandomUserAgent();
            logger.info(`Setting user agent: ${userAgent}`);
            await page.setUserAgent(userAgent);

            // Navigate to page
            logger.info(`Navigating to ${config.baseUrl}`);
            const response = await page.goto(config.baseUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            if (!response.ok()) {
                throw new Error(`Page load failed with status: ${response.status()}`);
            }

            logger.info('Page loaded successfully');

            if (keyword) {
                logger.info(`Searching for tenders with keyword: ${keyword}`);

                logger.info('Waiting for search input...');
                const inputElement = await page.waitForSelector(config.selectors.searchInput, {
                    timeout: 30000,
                    visible: true
                });

                if (!inputElement) {
                    throw new Error('Search input not found');
                }

                logger.info('Typing keyword...');
                await inputElement.type(keyword, {delay: 100});

            logger.info('Waiting for results...');
            // Zamiast waitForTimeout używamy Promise + setTimeout
            await new Promise(resolve => setTimeout(resolve, 2000));

            logger.info('Waiting for table...');
            await page.waitForSelector('lib-table', {
                timeout: 30000,
                visible: true
            });

                logger.info('Filter applied successfully');
            }

            logger.info('Waiting for pagination...');
            await page.waitForSelector('.pagination-container', {
                timeout: 30000,
                visible: true
            });

            logger.info('Checking for results...');
            const resultInfo = await page.evaluate(() => {
                const rows = document.querySelectorAll('tbody tr');
                return {
                    count: rows.length,
                    hasResults: rows.length > 0
                };
            });

            logger.info(`Found ${resultInfo.count} rows in table`);
            if (!resultInfo.hasResults) {
                logger.info('No results found in the table');
                return [];
            }

            const allTenders = [];
            let hasNextPage = true;
            let pageNumber = 1;

            logger.info('Starting pagination loop...');
            while (hasNextPage && pageNumber <= 1000) {
                logger.info(`Scraping page ${pageNumber}`);

                await new Promise(resolve => setTimeout(resolve, 2000));

                // Sprawdźmy czy tabela jest widoczna
                await page.waitForSelector('tbody tr', {
                    timeout: 30000,
                    visible: true
                });

                logger.info('Extracting data from current page...');
                const pageTenders = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('tbody tr'));
                    // Nie używamy logger tutaj, zwracamy tylko dane
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        return {
                            title: cells[0]?.textContent?.trim(),
                            number: cells[1]?.textContent?.trim(),
                            status: cells[2]?.textContent?.trim(),
                            publicationDate: cells[3]?.textContent?.trim(),
                            link: row.querySelector('a')?.href
                        };
                    });
                });

                logger.info(`Found ${pageTenders.length} tenders on current page`);
                if (pageTenders.length > 0) {
                    await this.saveListings(pageTenders);
                    allTenders.push(...pageTenders);
                    logger.info(`Total tenders collected so far: ${allTenders.length}`);
                } else {
                    logger.warn('No tenders found on current page');
                    break;
                }

                logger.info('Checking for next page...');
                const nextPageInfo = await page.evaluate(() => {
                    const nextButton = document.querySelector('.btn.btn-sm.btn-outline-secondary.append-arrow');
                    return {
                        exists: !!nextButton,
                        isDisabled: nextButton ? nextButton.classList.contains('disabled') : true,
                        text: nextButton ? nextButton.textContent : null
                    };
                });

                logger.info(`Next page button info: ${JSON.stringify(nextPageInfo)}`);

                if (nextPageInfo.exists && !nextPageInfo.isDisabled) {
                    logger.info('Clicking next page button...');
                    await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
                    pageNumber++;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    logger.info('No more pages available');
                    hasNextPage = false;
                }
            }

            logger.info(`Scraping completed. Total tenders found: ${allTenders.length}`);
            return allTenders;
        } finally {
            logger.info('Cleaning up...');
            if (page && !page.isClosed()) {
                await page.close();
            }
            if (browser) {
                await browser.close();
            }
            await this.db.disconnect();
            logger.info('Cleanup completed');
        }
    }
}

module.exports = new PuppeteerListingsScraper();