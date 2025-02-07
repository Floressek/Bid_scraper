const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const BaseScraper = require('../base/base-scraper');
const {getRandomUserAgent} = require('../../utils/helpers/browser-helpers');
const config = require('../../utils/config/config');
const {createLogger} = require('../../utils/logger/logger');

const logger = createLogger(__filename);

/**
 * Scraper implementation using Puppeteer for web scraping tenders
 */
class PuppeteerListingsScraper extends BaseScraper {
    constructor() {
        super('PUPPETEER');
        puppeteer.use(StealthPlugin());
    }

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

            page = await browser.newPage();

            // Set up browser configurations
            await this.setupBrowser(page);

            // Navigate and handle keyword search
            await this.navigateAndSearch(page, keyword);

            // Process pagination and scrape data
            const tenders = await this.processPagination(page);

            logger.info(`Scraping completed. Total tenders found: ${tenders.length}`);
            return tenders;

        } finally {
            await this.cleanup(browser, page);
        }
    }

    /**
     * Configure browser settings
     * @param {Page} page - Puppeteer page instance
     */
    async setupBrowser(page) {
        page.on('error', err => logger.error('Page error:', JSON.stringify(err, null, 2)));

        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
        });

        const userAgent = getRandomUserAgent();
        await page.setUserAgent(userAgent);
    }

    /**
     * Navigate to page and perform search
     * @param {Page} page - Puppeteer page instance
     * @param {string} keyword - Search keyword
     */
    async navigateAndSearch(page, keyword) {
        const response = await page.goto(config.baseUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        if (!response.ok()) {
            throw new Error(`Page load failed with status: ${response.status()}`);
        }

        if (keyword) {
            const inputElement = await page.waitForSelector(config.selectors.searchInput, {
                timeout: 30000,
                visible: true
            });

            await inputElement.type(keyword, {delay: 100});
            // Wait for and click search button
            logger.info('Clicking search button...');
            await page.waitForSelector('.app-button.btn.btn-secondary.btn-block', {
                visible: true,
                timeout: 30000
            });
            await page.click('.app-button.btn.btn-secondary.btn-block');

            // Wait for results to load
            logger.info('Waiting for search results...');
            await page.waitForSelector('lib-table', {
                timeout: 30000,
                visible: true
            });

            // Add extra wait for table to fully update
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.waitForSelector('lib-table', { timeout: 30000, visible: true });
        }
    }

    /**
     * Process pagination and scrape tender data
     * @param {Page} page - Puppeteer page instance
     * @returns {Promise<Array>} - Array of scraped tenders
     */
    async processPagination(page) {
        await page.waitForSelector('.pagination-container', { timeout: 30000 });

        // Add visual feedback for page scanning
        await page.addStyleTag({
            content: `
        .page-scanning {
            border: 2px solid #4CAF50 !important;
            position: relative;
        }
        .page-scanning::before {
            content: "Scanning...";
            position: fixed;
            top: 0;
            right: 0;
            background: #4CAF50;
            color: white;
            padding: 5px 10px;
            border-radius: 0 0 0 5px;
            z-index: 1000;
        }`
        });

        const resultInfo = await page.evaluate(() => ({
            count: document.querySelectorAll('tbody tr').length,
            hasResults: document.querySelectorAll('tbody tr').length > 0
        }));

        if (!resultInfo.hasResults) {
            return [];
        }

        const allTenders = [];
        let hasNextPage = true;
        let pageNumber = 1;

        while (hasNextPage && pageNumber <= 1000) {
            logger.info(`======= Scanning Page ${pageNumber} =======`);

            // Add visual indicator for current page
            await page.evaluate(() => {
                document.querySelector('lib-table').classList.add('page-scanning');
            });

            const pageTenders = await this.scrapeCurrentPage(page);

            // Remove page scanning indicator
            await page.evaluate(() => {
                document.querySelector('lib-table').classList.remove('page-scanning');
            });

            if (pageTenders.length > 0) {
                await this.saveListings(pageTenders);
                allTenders.push(...pageTenders);
                logger.info(`✓ Page ${pageNumber} completed - Found ${pageTenders.length} tenders`);
                logger.info(`Total tenders collected: ${allTenders.length}`);
            }

            const nextPageInfo = await this.checkNextPage(page);
            if (nextPageInfo.exists && !nextPageInfo.isDisabled) {
                logger.info('Moving to next page...');
                await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
                pageNumber++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                hasNextPage = false;
            }
        }

        return allTenders;
    }


    /**
     * Scrape data from current page
     * @param {Page} page - Puppeteer page instance
     * @returns {Promise<Array>} - Array of tenders from current page
     */
    async scrapeCurrentPage(page) {
        await page.waitForSelector('tbody tr', { timeout: 30000, visible: true });

        // Add styles for highlighting
        await page.addStyleTag({
            content: `
        .scanning {
            background-color: #f0f8ff !important;
            transition: background-color 0.3s ease-in-out;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }`
        });

        const tenders = [];
        const rows = await page.$$('tbody tr');

        // Scan each row with visual effect
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Highlight current row
            await page.evaluate((row) => {
                row.classList.add('scanning');
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, row);

            // Extract data from current row
            const tender = await page.evaluate(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                    title: cells[0]?.textContent?.trim(),
                    number: cells[1]?.textContent?.trim(),
                    status: cells[2]?.textContent?.trim(),
                    publicationDate: cells[3]?.textContent?.trim(),
                    link: row.querySelector('a')?.href
                };
            }, row);

            tenders.push(tender);

            // Log scanning progress
            logger.info(`Scanning tender: ${tender.title.substring(0, 50)}...`);

            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 300));

            // Remove highlight
            await page.evaluate((row) => {
                row.classList.remove('scanning');
            }, row);
        }

        return tenders;
    }

    /**
     * Check next page button status
     * @param {Page} page - Puppeteer page instance
     * @returns {Promise<Object>} - Next page button info
     */
    async checkNextPage(page) {
        return page.evaluate(() => {
            const nextButton = document.querySelector('.btn.btn-sm.btn-outline-secondary.append-arrow');
            return {
                exists: !!nextButton,
                isDisabled: nextButton ? nextButton.classList.contains('disabled') : true
            };
        });
    }

    /**
     * Cleanup resources
     * @param {Browser} browser - Puppeteer browser instance
     * @param {Page} page - Puppeteer page instance
     */
    async cleanup(browser, page) {
        try {
            if (page && !page.isClosed()) {
                await page.close().catch(e =>
                    logger.error('Error closing page:', e));
            }

            if (browser) {
                try {
                    const processes = browser.process();
                    if (processes) {
                        process.kill(processes.pid, 'SIGKILL');
                    }
                } catch (e) {
                    logger.error('Error killing browser process:', e);
                }

                await browser.close().catch(e =>
                    logger.error('Error closing browser:', e));
            }
        } catch (error) {
            logger.error('Error in cleanup:', error);
        } finally {
            if (this.db) {
                await this.db.disconnect().catch(e =>
                    logger.error('Error disconnecting DB:', e));
            }
        }
    }
}

module.exports = new PuppeteerListingsScraper();