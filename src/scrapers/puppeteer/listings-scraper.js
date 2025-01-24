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
    async scrape() {
        await this.initialize(); // db connection

        const browser = await puppeteer.connect({
            browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
            args: [`--user-agent=${getRandomUserAgent()}`]
        });

        const page = await browser.newPage();

        // Helpful for debugging
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
        });

        try {
            await page.goto(config.baseUrl, {
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000
            });
            // Wait for the page to load
            await page.waitForSelector('lib-table');
            await page.waitForSelector('.pagination-container');

            // Get the total number of pages
            const allTenders = [];
            let hasNextPage = true;
            let pageNumber = 1;

            while (hasNextPage && pageNumber <= 50) { //FIXME: This is just a temporary limit for testing
                logger.info(`Scraping page ${pageNumber}`);

                await new Promise(resolve => setTimeout(resolve, 2000));
                const pageTenders = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('tbody tr'));
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('td')); // Get all cells in the row, td => table data
                        return { // Return an object with the data we need
                            title: cells[0]?.textContent?.trim(),
                            number: cells[1]?.textContent?.trim(),
                            status: cells[2]?.textContent?.trim(),
                            publicationDate: cells[3]?.textContent?.trim(),
                            link: row.querySelector('a')?.href
                        };
                    });
                });
                await this.saveListings(pageTenders); // to the database SAVED

                allTenders.push(...pageTenders);
                logger.info(`Found and saved ${pageTenders.length} tenders on page ${pageNumber}`);

                // Check if there is a next page
                const hasNext = await page.evaluate(() => {
                    const nextButton = document.querySelector('.btn.btn-sm.btn-outline-secondary.append-arrow'); // Get the next button
                    return !nextButton.classList.contains('disabled'); // Check if the button is disabled - MAY INDICATE NO MORE PAGES
                });

                if (hasNext) {
                    await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow'); // Click the next button
                    pageNumber++;
                } else {
                    hasNextPage = false;
                }
            }
            logger.info(`Total tenders scraped and saved: ${allTenders.length}`);
            return allTenders;
        } catch (error) {
            logger.error('Failed to load page:', error);
            return [];
        } finally {
            await browser.close();
            await this.db.disconnect();
        }
    }
}

module.exports = new PuppeteerListingsScraper();