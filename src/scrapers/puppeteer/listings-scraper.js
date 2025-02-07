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

        await page.setViewport({width: 1920, height: 1080});
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
            await page.waitForSelector('lib-table', {timeout: 30000, visible: true});
        }
    }

    /**
     * Process pagination and scrape tender data
     * @param {Page} page - Puppeteer page instance
     * @returns {Promise<Array>} - Array of scraped tenders
     */
    // async processPagination(page) {
    //     await page.waitForSelector('.pagination-container', { timeout: 30000 });
    //
    //     // Add visual feedback for page scanning
    //     await page.addStyleTag({
    //         content: `
    //     .page-scanning {
    //         border: 2px solid #4CAF50 !important;
    //         position: relative;
    //     }
    //     .page-scanning::before {
    //         content: "Scanning...";
    //         position: fixed;
    //         top: 0;
    //         right: 0;
    //         background: #4CAF50;
    //         color: white;
    //         padding: 5px 10px;
    //         border-radius: 0 0 0 5px;
    //         z-index: 1000;
    //     }`
    //     });
    //
    //     const resultInfo = await page.evaluate(() => ({
    //         count: document.querySelectorAll('tbody tr').length,
    //         hasResults: document.querySelectorAll('tbody tr').length > 0
    //     }));
    //
    //     if (!resultInfo.hasResults) {
    //         return [];
    //     }
    //
    //     const allTenders = [];
    //     let hasNextPage = true;
    //     let pageNumber = 1;
    //
    //     while (hasNextPage && pageNumber <= 1000) {
    //         logger.info(`======= Scanning Page ${pageNumber} =======`);
    //
    //         // Add visual indicator for current page
    //         await page.evaluate(() => {
    //             document.querySelector('lib-table').classList.add('page-scanning');
    //         });
    //
    //         const pageTenders = await this.scrapeCurrentPage(page);
    //
    //         // Remove page scanning indicator
    //         await page.evaluate(() => {
    //             document.querySelector('lib-table').classList.remove('page-scanning');
    //         });
    //
    //         if (pageTenders.length > 0) {
    //             await this.saveListings(pageTenders);
    //             allTenders.push(...pageTenders);
    //             logger.info(`✓ Page ${pageNumber} completed - Found ${pageTenders.length} tenders`);
    //             logger.info(`Total tenders collected: ${allTenders.length}`);
    //         }
    //
    //         const nextPageInfo = await this.checkNextPage(page);
    //         if (nextPageInfo.exists && !nextPageInfo.isDisabled) {
    //             logger.info('Moving to next page...');
    //             await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
    //             pageNumber++;
    //             await new Promise(resolve => setTimeout(resolve, 1000));
    //         } else {
    //             hasNextPage = false;
    //         }
    //     }
    //
    //     return allTenders;
    // }
    // async processPagination(page) {
    //     await page.waitForSelector('.pagination-container', { timeout: 30000 });
    //
    //     // Keep the visual styles for feedback
    //     await page.addStyleTag({
    //         content: `
    //     .page-scanning {
    //         border: 2px solid #4CAF50 !important;
    //         position: relative;
    //     }
    //     .page-scanning::before {
    //         content: "Scanning...";
    //         position: fixed;
    //         top: 0;
    //         right: 0;
    //         background: #4CAF50;
    //         color: white;
    //         padding: 5px 10px;
    //         border-radius: 0 0 0 5px;
    //         z-index: 1000;
    //     }`
    //     });
    //
    //     const allTenders = [];
    //     let pageNumber = 1;
    //
    //     while (pageNumber <= 1000) {
    //         try {
    //             logger.info(`======= Scanning Page ${pageNumber} =======`);
    //
    //             // Add visual feedback
    //             await page.evaluate(() => {
    //                 const table = document.querySelector('lib-table');
    //                 if (table) table.classList.add('page-scanning');
    //             }).catch(() => {});
    //
    //             // Scan current page
    //             const pageTenders = await this.scrapeCurrentPage(page);
    //
    //             // Remove visual feedback
    //             await page.evaluate(() => {
    //                 const table = document.querySelector('lib-table');
    //                 if (table) table.classList.remove('page-scanning');
    //             }).catch(() => {});
    //
    //             // Save results if we found any
    //             if (pageTenders.length > 0) {
    //                 await this.saveListings(pageTenders);
    //                 allTenders.push(...pageTenders);
    //                 logger.info(`✓ Page ${pageNumber} completed - Found ${pageTenders.length} tenders`);
    //                 logger.info(`Total tenders collected: ${allTenders.length}`);
    //             }
    //
    //             // Check if we can move to next page
    //             const nextPageInfo = await this.checkNextPage(page);
    //             if (!nextPageInfo.exists || nextPageInfo.isDisabled) {
    //                 break;
    //             }
    //
    //             // Navigation sequence with retry mechanism
    //             let navigationSuccess = false;
    //             for (let attempt = 0; attempt < 3 && !navigationSuccess; attempt++) {
    //                 try {
    //                     // Click the next button
    //                     await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
    //
    //                     // Give Angular time to update the DOM
    //                     await new Promise(r => setTimeout(r, 2000));
    //
    //                     // Verify the page content changed
    //                     const hasRows = await page.evaluate(() => {
    //                         const rows = document.querySelectorAll('tbody tr');
    //                         return rows.length > 0;
    //                     });
    //
    //                     if (hasRows) {
    //                         navigationSuccess = true;
    //                         pageNumber++;
    //                         break;
    //                     }
    //                 } catch (navError) {
    //                     logger.warn(`Navigation attempt ${attempt + 1} failed, retrying...`);
    //                     await new Promise(r => setTimeout(r, 1000));
    //                 }
    //             }
    //
    //             if (!navigationSuccess) {
    //                 logger.error('Navigation failed after retries');
    //                 break;
    //             }
    //
    //         } catch (error) {
    //             // If we hit an error, try to save what we have
    //             logger.error(`Error on page ${pageNumber}:`, error);
    //             break;
    //         }
    //     }
    //
    //     return allTenders;
    // }
//ASSS//
    // async processPagination(page) {
    //     await page.waitForSelector('.pagination-container', {timeout: 30000});
    //     await page.addStyleTag({content: ".page-scanning { border: 2px solid #4CAF50 !important; position: relative; } .page-scanning::before { content: \"Scanning...\"; position: fixed; top: 0; right: 0; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 0 0 0 5px; z-index: 1000; }"});
    //     const allTenders = [];
    //     let pageNumber = 1;
    //     while (pageNumber <= 1000) {
    //         try {
    //             await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0, {timeout: 10000});
    //             logger.info(`======= Scanning Page ${pageNumber} =======`);
    //             try {
    //                 await page.evaluate(() => document.querySelector('lib-table')?.classList.add('page-scanning'));
    //                 const pageTenders = await this.scrapeCurrentPage(page);
    //                 await page.evaluate(() => document.querySelector('lib-table')?.classList.remove('page-scanning'));
    //                 if (pageTenders.length > 0) {
    //                     await this.saveListings(pageTenders);
    //                     allTenders.push(...pageTenders);
    //                     logger.info(`✓ Page ${pageNumber} completed - Found ${pageTenders.length} tenders`);
    //                     logger.info(`Total tenders collected: ${allTenders.length}`);
    //                 }
    //             } catch (scanError) {
    //                 if (scanError.name === 'TargetCloseError') {
    //                     logger.error(`TargetCloseError on page ${pageNumber}. Aborting pagination.`);
    //                     break;
    //                 }
    //                 logger.error(`Error scanning page ${pageNumber}:`, scanError);
    //             }
    //             const nextPageInfo = await this.checkNextPage(page);
    //             if (!nextPageInfo.exists || nextPageInfo.isDisabled) break;
    //             const currentPageContent = await page.evaluate(() => document.querySelector('tbody')?.innerHTML || '');
    //             logger.info('Moving to next page...');
    //             await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
    //             await page.waitForFunction(
    //                 oldContent => {
    //                     const newContent = document.querySelector('tbody')?.innerHTML || '';
    //                     return newContent !== oldContent && document.querySelectorAll('tbody tr').length > 0;
    //                 },
    //                 {timeout: 5000},
    //                 currentPageContent
    //             );
    //             await new Promise(r => setTimeout(r, 1000));
    //             pageNumber++;
    //         } catch (error) {
    //             if (error.name === 'TargetCloseError') {
    //                 logger.error(`Page closed during navigation on page ${pageNumber}. Aborting pagination.`);
    //                 break;
    //             }
    //             try {
    //                 await page.reload({waitUntil: 'networkidle0'});
    //                 await new Promise(r => setTimeout(r, 2000));
    //                 continue;
    //             } catch (recoveryError) {
    //                 logger.error('Failed to recover from error:', error);
    //                 break;
    //             }
    //         }
    //     }
    //     return allTenders;
    // }
    async processPagination(page) {
        await page.waitForSelector('.pagination-container', { timeout: 30000 });
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
        const allTenders = [];
        let pageNumber = 1;

        while (pageNumber <= 1000) {
            let retryCount = 0;
            const maxRetries = 3;
            let success = false;

            while (retryCount < maxRetries && !success) {
                try {
                    await page.waitForFunction(
                        () => document.querySelectorAll('tbody tr').length > 0,
                        { timeout: 10000 }
                    );
                    logger.info(`======= Scanning Page ${pageNumber} =======`);

                    // Add visual cue
                    await page.evaluate(() => {
                        document.querySelector('lib-table')?.classList.add('page-scanning');
                    });
                    const pageTenders = await this.scrapeCurrentPage(page);
                    await page.evaluate(() => {
                        document.querySelector('lib-table')?.classList.remove('page-scanning');
                    });

                    if (pageTenders.length > 0) {
                        await this.saveListings(pageTenders);
                        allTenders.push(...pageTenders);
                        logger.info(`✓ Page ${pageNumber} completed - Found ${pageTenders.length} tenders`);
                        logger.info(`Total tenders collected: ${allTenders.length}`);
                    }
                    success = true; // Page scanned successfully
                } catch (error) {
                    if (error.name === 'TargetCloseError') {
                        retryCount++;
                        logger.warn(`TargetCloseError on page ${pageNumber}. Retry attempt ${retryCount}/${maxRetries}...`);
                        try {
                            await page.reload({ waitUntil: 'networkidle0' });
                            await new Promise(r => setTimeout(r, 1000));
                        } catch (reloadError) {
                            logger.error(`Reload failed on retry attempt ${retryCount} for page ${pageNumber}:`, reloadError);
                        }
                    } else {
                        logger.error(`Error scanning page ${pageNumber}:`, error);
                        break;
                    }
                }
            }

            // If still unsuccessful after retries, abort pagination.
            if (!success) {
                logger.error(`Failed to recover from TargetCloseError on page ${pageNumber} after ${maxRetries} attempts. Aborting pagination.`);
                break;
            }

            // Proceed to navigate to the next page.
            const nextPageInfo = await this.checkNextPage(page);
            if (!nextPageInfo.exists || nextPageInfo.isDisabled) break;

            // Capture current page content to detect change after clicking.
            const currentPageContent = await page.evaluate(
                () => document.querySelector('tbody')?.innerHTML || ''
            );
            logger.info('Moving to next page...');
            await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
            try {
                await page.waitForFunction(
                    oldContent => {
                        const newContent = document.querySelector('tbody')?.innerHTML || '';
                        return newContent !== oldContent && document.querySelectorAll('tbody tr').length > 0;
                    },
                    { timeout: 5000 },
                    currentPageContent
                );
            } catch (navError) {
                logger.error(`Error during navigation on page ${pageNumber}:`, navError);
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
            pageNumber++;
        }
        return allTenders;
    }



    /**
     * Scrape data from current page
     * @param {Page} page - Puppeteer page instance
     * @returns {Promise<Array>} - Array of tenders from current page
     */
    async scrapeCurrentPage(page) {
        await page.waitForSelector('tbody tr', {timeout: 30000, visible: true});

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
                row.scrollIntoView({behavior: 'smooth', block: 'center'});
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
    // async checkNextPage(page) {
    //     return page.evaluate(() => {
    //         const nextButton = document.querySelector('.btn.btn-sm.btn-outline-secondary.append-arrow');
    //         return {
    //             exists: !!nextButton,
    //             isDisabled: nextButton ? nextButton.classList.contains('disabled') : true
    //         };
    //     });
    // }
    async checkNextPage(page) {
        const selector = '.btn.btn-sm.btn-outline-secondary.append-arrow';
        const nextButton = await page.$(selector);

        if (!nextButton) return {exists: false};

        const buttonText = await page.evaluate(btn => btn.textContent.trim(), nextButton);
        const isDisabled = await page.evaluate(btn =>
                btn.classList.contains('disabled') ||
                btn.hasAttribute('disabled'),
            nextButton
        );

        return {
            exists: buttonText.includes('Następna'),
            isDisabled
        };
    }

    /**
     * Cleanup resources
     * @param {Browser} browser - Puppeteer browser instance
     * @param {Page} page - Puppeteer page instance
     */
    // async cleanup(browser, page) {
    //     try {
    //         if (page && !page.isClosed()) {
    //             await page.close().catch(e =>
    //                 logger.error('Error closing page:', e));
    //         }
    //
    //         if (browser) {
    //             try {
    //                 const processes = browser.process();
    //                 if (processes) {
    //                     process.kill(processes.pid, 'SIGKILL');
    //                 }
    //             } catch (e) {
    //                 logger.error('Error killing browser process:', e);
    //             }
    //
    //             await browser.close().catch(e =>
    //                 logger.error('Error closing browser:', e));
    //         }
    //     } catch (error) {
    //         logger.error('Error in cleanup:', error);
    //     } finally {
    //         if (this.db) {
    //             await this.db.disconnect().catch(e =>
    //                 logger.error('Error disconnecting DB:', e));
    //         }
    //     }
    // }
    async cleanup(browser, page) {
        // Close the page if it's still open
        if (page && !page.isClosed()) {
            try {
                await page.close();
            } catch (error) {
                logger.error('Error closing page:', error);
            }
        }

        // Close the browser gracefully
        if (browser) {
            try {
                await browser.close();
            } catch (error) {
                logger.error('Error closing browser:', error);
            }
        }

        // Disconnect the database if applicable
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