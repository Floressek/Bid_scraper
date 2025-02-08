const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const BaseScraper = require('../base/base-scraper');
const { getRandomUserAgent } = require('../../utils/helpers/browser-helpers');
const config = require('../../utils/config/config');
const { createLogger } = require('../../utils/logger/logger');

const logger = createLogger(__filename);

/**
 * Scraper implementation using Puppeteer for web scraping tenders
 */
class PuppeteerListingsScraper extends BaseScraper {
    constructor() {
        super('PUPPETEER');
        puppeteer.use(StealthPlugin());
        this.browser = null;
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
            this.browser = browser;
            page = await browser.newPage();

            // Set up browser configurations
            await this.setupBrowser(page);

            // Navigate and perform search
            await this.navigateAndSearch(page, keyword);

            // Process pagination and scrape data (with retry logic)
            const tenders = await this.processPagination(page);

            logger.info(`Scraping completed. Total tenders found: ${tenders.length}`);
            return tenders;
        } catch (error) {
            logger.error('Error in scrape:', error);
            throw error;
        } finally {
            await this.cleanup(browser, page);
        }
    }

    /**
     * Configure browser settings.
     * @param {Page} page - Puppeteer page instance.
     */
    async setupBrowser(page) {
        page.on('error', err => logger.error('Page error:', JSON.stringify(err, null, 2)));
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0'
        });
        const userAgent = getRandomUserAgent();
        await page.setUserAgent(userAgent);
    }

    /**
     * Navigate to base URL and perform keyword search.
     * @param {Page} page - Puppeteer page instance.
     * @param {string} keyword - Search keyword.
     */
    async navigateAndSearch(page, keyword) {
        const response = await page.goto(config.baseUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        // Allow 304 (Not Modified) responses as acceptable
        if (response.status() !== 304 && !response.ok()) {
            throw new Error(`Page load failed with status: ${response.status()}`);
        }

        if (keyword) {
            const inputElement = await page.waitForSelector(config.selectors.searchInput, {
                timeout: 30000,
                visible: true
            });
            await inputElement.type(keyword, { delay: 100 });
            logger.info('Clicking search button...');
            await page.waitForSelector('.app-button.btn.btn-secondary.btn-block', {
                visible: true,
                timeout: 30000
            });
            await page.click('.app-button.btn.btn-secondary.btn-block');

            logger.info('Waiting for search results...');
            await page.waitForSelector('lib-table', { timeout: 30000, visible: true });
            // Extra wait for table update if scanning is enabled
            if (config.scanning) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            await page.waitForSelector('lib-table', { timeout: 30000, visible: true });
        }
    }


    /**
     * Process pagination and scrape tender data.
     * Includes retry logic for TargetCloseError and recreates page if needed.
     * @param {Page} page - Puppeteer page instance.
     * @returns {Promise<Array>} - Array of scraped tenders.
     */
    // async processPagination(page) {
    //     await page.waitForSelector('.pagination-container', { timeout: 30000 });
    //     if (config.scanning) {
    //         await page.addStyleTag({
    //             content: `
    //             .page-scanning {
    //                 border: 2px solid #4CAF50 !important;
    //                 position: relative;
    //             }
    //             .page-scanning::before {
    //                 content: "Scanning...";
    //                 position: fixed;
    //                 top: 0;
    //                 right: 0;
    //                 background: #4CAF50;
    //                 color: white;
    //                 padding: 5px 10px;
    //                 border-radius: 0 0 0 5px;
    //                 z-index: 1000;
    //             }
    //         `
    //         });
    //     }
    //     const allTenders = [];
    //     let pageNumber = 1;
    //
    //     while (pageNumber <= 1000) {
    //         try {
    //             // Every 5 pages, completely relaunch browser to prevent memory issues
    //             if (pageNumber % 5 === 0) {
    //                 logger.info('Performing preventive browser relaunch...');
    //
    //                 // Store current browser and page
    //                 const oldBrowser = this.browser;
    //                 const oldPage = page;
    //
    //                 // Launch new browser and page
    //                 this.browser = await puppeteer.launch({
    //                     ...config.puppeteer.launch,
    //                     args: [
    //                         ...config.puppeteer.launch.args,
    //                         '--disable-web-security',
    //                         '--disable-features=IsolateOrigins,site-per-process'
    //                     ]
    //                 });
    //                 page = await this.browser.newPage();
    //                 await this.setupBrowser(page);
    //
    //                 // Navigate back to current page
    //                 await page.goto(config.baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    //                 await this.navigateAndSearch(page, 'microsoft');
    //
    //                 // Navigate to current page number
    //                 for (let i = 1; i < pageNumber; i++) {
    //                     await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
    //                     await new Promise(r => setTimeout(r, 1000));
    //                 }
    //
    //                 // Wait for page to stabilize
    //                 await new Promise(r => setTimeout(r, 2000));
    //
    //                 // Clean up old browser AFTER new one is ready
    //                 await this.cleanup(oldBrowser, oldPage);
    //             }
    //
    //             await page.waitForFunction(
    //                 () => document.querySelectorAll('tbody tr').length > 0,
    //                 { timeout: 10000 }
    //             );
    //             logger.info(`======= Scanning Page ${pageNumber} =======`);
    //
    //             if (config.scanning) {
    //                 await page.evaluate(() => {
    //                     document.querySelector('lib-table')?.classList.add('page-scanning');
    //                 });
    //             }
    //
    //             const pageTenders = await this.scrapeCurrentPage(page);
    //
    //             if (config.scanning) {
    //                 await page.evaluate(() => {
    //                     document.querySelector('lib-table')?.classList.remove('page-scanning');
    //                 });
    //             }
    //
    //             if (pageTenders.length > 0) {
    //                 await this.saveListings(pageTenders);
    //                 allTenders.push(...pageTenders);
    //                 logger.info(`✓ Page ${pageNumber} completed - Found ${pageTenders.length} tenders`);
    //                 logger.info(`Total tenders collected: ${allTenders.length}`);
    //             }
    //
    //             // Check for next page
    //             const nextPageInfo = await this.checkNextPage(page);
    //             if (!nextPageInfo.exists || nextPageInfo.isDisabled) break;
    //
    //             // Navigate to next page
    //             await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
    //             await new Promise(r => setTimeout(r, 1000));
    //             pageNumber++;
    //
    //         } catch (error) {
    //             logger.error(`Error on page ${pageNumber}:`, error);
    //
    //             // If browser crash, relaunch and return to current page
    //             try {
    //                 logger.info('Attempting browser relaunch after error...');
    //
    //                 // Store current browser and page
    //                 const oldBrowser = this.browser;
    //                 const oldPage = page;
    //
    //                 // Launch new browser and page
    //                 this.browser = await puppeteer.launch({
    //                     ...config.puppeteer.launch,
    //                     args: [
    //                         ...config.puppeteer.launch.args,
    //                         '--disable-web-security',
    //                         '--disable-features=IsolateOrigins,site-per-process'
    //                     ]
    //                 });
    //                 page = await this.browser.newPage();
    //                 await this.setupBrowser(page);
    //
    //                 // Navigate back to current page
    //                 await page.goto(config.baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    //                 await this.navigateAndSearch(page, 'microsoft');
    //
    //                 // Navigate to current page number
    //                 for (let i = 1; i < pageNumber; i++) {
    //                     await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
    //                     await new Promise(r => setTimeout(r, 1000));
    //                 }
    //
    //                 // Wait for page to stabilize
    //                 await new Promise(r => setTimeout(r, 2000));
    //
    //                 // Clean up old browser AFTER new one is ready
    //                 await this.cleanup(oldBrowser, oldPage);
    //
    //                 // Continue with the same page number
    //                 continue;
    //             } catch (relanchError) {
    //                 logger.error('Failed to relaunch browser:', relanchError);
    //                 throw relanchError;
    //             }
    //         }
    //     }
    //
    //     return allTenders;
    // }
    async processPagination(page) {
        await page.waitForSelector('.pagination-container', { timeout: 30000 });
        const allTenders = [];
        let pageNumber = 1;

        while (pageNumber <= 1000) {
            try {
                // Every 5 pages, do a preventive relaunch
                if (pageNumber % 5 === 0) {
                    logger.info('Performing preventive browser relaunch...');
                    page = await this.relauncher(pageNumber);
                }

                logger.info(`======= Scanning Page ${pageNumber} =======`);

                // Scrape current page
                const pageTenders = await this.scrapeCurrentPage(page);

                if (pageTenders.length > 0) {
                    await this.saveListings(pageTenders);
                    allTenders.push(...pageTenders);
                    logger.info(`✓ Page ${pageNumber} completed - Found ${pageTenders.length} tenders`);
                    logger.info(`Total tenders collected: ${allTenders.length}`);
                }

                // Check for next page
                const nextPageInfo = await this.checkNextPage(page);
                if (!nextPageInfo.exists || nextPageInfo.isDisabled) break;

                // Navigate to next page
                await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
                await page.waitForFunction(
                    () => document.querySelectorAll('tbody tr').length > 0,
                    { timeout: 10000 }
                );

                pageNumber++;
            } catch (error) {
                logger.error(`Error on page ${pageNumber}:`, error);

                try {
                    // On error, relaunch browser and try the same page again
                    page = await this.relauncher(pageNumber);
                    // Don't increment pageNumber - we'll retry the same page
                } catch (relaunchError) {
                    logger.error('Critical error during browser relaunch:', relaunchError);
                    throw relaunchError; // If we can't relaunch, we need to stop
                }
            }
        }

        return allTenders;
    }
    /**
     * Scrape data from the current page.
     * @param {Page} page - Puppeteer page instance.
     * @returns {Promise<Array>} - Array of tenders from the current page.
     */
    async scrapeCurrentPage(page) {
        await page.waitForSelector('tbody tr', { timeout: 30000, visible: true });
        if (config.scanning) {
            await page.addStyleTag({
                content: `
                    .scanning {
                        background-color: #f0f8ff !important;
                        transition: background-color 0.3s ease-in-out;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                `
            });
        }
        const tenders = [];
        const rows = await page.$$('tbody tr');

        // Use a delay value based on scanning mode
        const delay = config.scanning ? 300 : 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Highlight current row for visual effect if scanning is enabled
            if (config.scanning) {
                await page.evaluate((row) => {
                    row.classList.add('scanning');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, row);
            }

            // Extract data from the row
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
            logger.info(`Scanning tender: ${tender.title.substring(0, 50)}...`);

            // Delay for visual effect (if scanning is on)
            if (delay) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Remove highlight if scanning is enabled
            if (config.scanning) {
                await page.evaluate((row) => {
                    row.classList.remove('scanning');
                }, row);
            }
        }

        return tenders;
    }

    /**
     * Check the status of the "next page" button.
     * @param {Page} page - Puppeteer page instance.
     * @returns {Promise<Object>} - Object with exists and isDisabled properties.
     */
    async checkNextPage(page) {
        const selector = '.btn.btn-sm.btn-outline-secondary.append-arrow';
        const nextButton = await page.$(selector);
        if (!nextButton) return { exists: false };
        const buttonText = await page.evaluate(btn => btn.textContent.trim(), nextButton);
        const isDisabled = await page.evaluate(btn =>
                btn.classList.contains('disabled') || btn.hasAttribute('disabled'),
            nextButton
        );
        return {
            exists: buttonText.includes('Następna'),
            isDisabled
        };
    }

    async cleanupBrowser() {
        try {
            // Force kill any existing browser processes
            if (this.browser) {
                const processes = await this.browser.process().kill('SIGKILL');
                await this.browser.close().catch(() => {});
                this.browser = null;
            }
        } catch (error) {
            logger.warn('Error during browser cleanup:', error);
        }
    }

    async relauncher(currentPage) {
        logger.info('Relaunching browser...');

        // First, clean up old browser
        await this.cleanupBrowser();

        // Wait a moment to ensure cleanup is complete
        await new Promise(r => setTimeout(r, 3000));

        // Launch new browser
        this.browser = await puppeteer.launch({
            ...config.puppeteer.launch,
            args: [
                ...config.puppeteer.launch.args,
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        // Create and set up new page
        const page = await this.browser.newPage();
        await this.setupBrowser(page);

        // Navigate directly to the search results page
        await this.navigateAndSearch(page, 'microsoft');

        // Navigate to target page
        if (currentPage > 1) {
            for (let i = 1; i < currentPage; i++) {
                await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
                // Add a small delay between clicks
                await new Promise(r => setTimeout(r, 500));
            }
            // Wait for last navigation to complete
            await page.waitForFunction(
                () => document.querySelectorAll('tbody tr').length > 0,
                { timeout: 10000 }
            );
        }

        return page;
    }

    /**
     * Cleanup resources.
     * @param {Browser} browser - Puppeteer browser instance.
     * @param {Page} page - Puppeteer page instance.
     */
    async cleanup(browser, page) {
        if (page && !page.isClosed()) {
            try {
                await page.close();
            } catch (error) {
                logger.error('Error closing page:', error);
            }
        }
        if (browser) {
            try {
                await browser.close();
            } catch (error) {
                logger.error('Error closing browser:', error);
            }
        }
        if (this.db) {
            try {
                await this.db.disconnect();
            } catch (error) {
                logger.error('Error disconnecting DB:', error);
            }
        }
    }
}

module.exports = new PuppeteerListingsScraper();
