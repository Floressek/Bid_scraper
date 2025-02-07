const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const BaseScraper = require('../base/base-scraper');
const config = require('../../utils/config/config');
const {createLogger} = require('../../utils/logger/logger');

const logger = createLogger(__filename);

class DetailedScraperWorker extends BaseScraper {
    constructor() {
        super('DETAILED_SCRAPER'); // używamy stałej z scraper-types.js
        puppeteer.use(StealthPlugin());
        this.initialized = false;
    }

    /**
     * Filter tender content based on keywords
     * @param {string} content
     * @returns {boolean}
     */
    isRelevantContent(content) {
        const relevantKeywords = [
            'licencj',  // złapie "licencja", "licencje", "licencyjny" itp.
            'microsoft',
            'ms office',
            'office 365',
            'm365',
            'windows server',
            'windows cal',
            'microsoft 365',
            'azure',
            'software assurance',
            'enterprise agreement',
            'open value',
            'cloud solution provider',
            'microsoft volume licensing'
        ];

        const excludedKeywords = [
            'microsoft edge',
            'edge browser',
            'surface',
            'xbox',
            'hardware',
            'sprzęt'
        ];

        const lowerContent = content.toLowerCase();

        if (excludedKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
            logger.info('Excluded keyword found in content:',
                excludedKeywords.filter(keyword => lowerContent.includes(keyword.toLowerCase())));
            return false;
        }

        const foundKeywords = relevantKeywords.filter(keyword =>
            lowerContent.includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
            logger.info('Relevant keyword found in content:', foundKeywords);
            return true;
        }

        return false;
    }

    async processTenderDetails(tender) {
        const browser = await puppeteer.launch(config.puppeteer.launch);
        const page = await browser.newPage();

        try {
            logger.info(`Processing tender details for: ${tender.number}`);

            await page.goto(tender.link, {
                waitUntil: 'networkidle2', // Wait until there are no more than 2 network connections for at least 500ms
                timeout: 60000
            });

            // Extract tender details
            const content = await page.evaluate(() => {
                return document.body.innerText;
            });

            if (this.isRelevantContent(content)) {
                // Extract structured details
                const details = await page.evaluate(() => {
                    return {
                        fullDescription: document.body.innerText,
                        documents: Array.from(document.querySelectorAll('a[href*=".pdf"], a[href*=".doc"]'))
                            .map(a => ({
                                name: a.textContent.trim(),
                                url: a.href,
                                type: a.href.split('.').pop()
                            }))
                    };
                });

                await this.db.collection('tender_details').updateOne(
                    {tenderId: tender.number},
                    {
                        $set: {
                            ...details, // Add all details
                            scrapedAt: new Date(),
                            keywords: ['microsoft'], // FIXME: Change to the actual parameters
                            originalTender: tender // Add original tender data
                        }
                    },
                    {upsert: true} // Insert if not exists
                );

                logger.info(`Saved relevant details for tender: ${tender.number}`);
            } else {
                logger.info(`Tender ${tender.number} not relevant - skipping`);
            }
        } catch (error) {
            logger.error(`Error processing tender ${tender.number}: ${error.message}`);
        } finally {
            await browser.close();
        }
    }

    /**
     * Start processing unprocessed tenders
     */
    async startProcessing() {
        try {
            await this.initialize(); // Start DB connection

            logger.info('Checking database connection...');
            if (!this.db) {
                throw new Error('Database connection not established');
            }

            // Get unprocessed tenders
            const unprocessedTenders = await this.db.collection('tender_listings')
                .find({
                    processed: false,
                    scraperType: 'PUPPETEER'
                })
                .toArray();

            logger.info(`Found ${unprocessedTenders.length} unprocessed tenders`);
            // Process each tender
            for (const tender of unprocessedTenders) {
                await this.processTenderDetails(tender);

                // Mark tender as processed
                await this.db.collection('tender_listings').updateOne(
                    {_id: tender._id},
                    {
                        $set: {
                            processed: true
                        }
                    }
                );
                // Small delay for visual effect
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } finally {
            await this.db.disconnect();
        }
    }
}

module.exports = new DetailedScraperWorker();
