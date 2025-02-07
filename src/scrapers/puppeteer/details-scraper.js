const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const BaseScraper = require('../base/base-scraper');
const config = require('../../utils/config/config');
const {createLogger} = require('../../utils/logger/logger');
const SCRAPER_TYPES = require('../../scrapers/base/scraper-types');

const logger = createLogger(__filename);

class DetailedScraperWorker extends BaseScraper {
    constructor() {
        super(SCRAPER_TYPES.DETAILED);
        // puppeteer.use(StealthPlugin());
        this.db = null;
    }

    async initialize() {
        // Upewnij się, że baza jest zainicjalizowana
        if (!this.db) {
            const db = require('../../utils/database/mongo');
            await db.connect();
            this.db = db;
            logger.info('DetailedScraperWorker database initialized');
        }
    }

    /**
     * Filter tender content based on keywords
     * @param {string} content
     * @returns {boolean}
     */
    isRelevantContent(content) {
        const relevantKeywords = [
            'licencj',  // złapie "licencja", "licencje", "licencyjny" itp.
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
            const excluded = excludedKeywords.filter(keyword =>
                lowerContent.includes(keyword.toLowerCase())
            );
            logger.info('Excluded keyword found in content:', excluded);
            return {isRelevant: false, foundKeywords: [], excludedKeywords: excluded};
        }

        const foundKeywords = relevantKeywords.filter(keyword =>
            lowerContent.includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
            logger.info('Relevant keyword found in content:', foundKeywords);
            return {isRelevant: true, foundKeywords, excludedKeywords: []};
        }

        return {isRelevant: false, foundKeywords: [], excludedKeywords: []};
    }

    async processTenderDetails(tender) {
        let browser = null;
        let page = null;

        try {
            logger.info(`Processing tender details for: ${tender.number}`);

            browser = await puppeteer.launch({
                headless: false,
                defaultViewport: null,
                args: [
                    '--start-maximized',
                    '--no-sandbox'
                ]
            });

            // Czekamy na ustabilizowanie przeglądarki
            await new Promise(resolve => setTimeout(resolve, 1000));
            page = await browser.newPage();

            // Dodaj style dla wizualizacji
            await page.addStyleTag({
                content: `
                .scanning {
                    background: rgba(255, 255, 0, 0.2) !important;
                    border: 2px solid #4CAF50 !important;
                    transition: all 0.3s ease-in-out;
                }
                .found-keyword {
                    background: rgba(0, 255, 0, 0.2) !important;
                    border: 2px solid #4CAF50 !important;
                }
                .scanning-indicator {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: #4CAF50;
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    z-index: 9999;
                }
            `
            });

            await page.goto(tender.link, {
                waitUntil: 'networkidle2',
                timeout: 80000
            });

            await page.waitForSelector('body', {visible: true});

            // Znajdź sekcje i oznacz je dla wizualizacji
            const sections = await page.evaluate(() => {
                const indicator = document.createElement('div');
                indicator.className = 'scanning-indicator';
                indicator.textContent = 'Scanning for Microsoft licensing keywords...';
                document.body.appendChild(indicator);

                return Array.from(document.querySelectorAll('p, div, section'))
                    .filter(el => {
                        const hasText = el.textContent.trim().length > 5;
                        if (hasText) {
                            // Dodaj atrybut dla identyfikacji
                            el.setAttribute('data-scannable', 'true');
                        }
                        return hasText;
                    })
                    .map((el, index) => ({
                        text: el.textContent,
                        html: el.innerHTML,
                        tag: el.tagName,
                        index
                    }));
            });

            logger.info(`Found ${sections.length} sections to scan`);

            // Skanuj każdą sekcję
            let foundAnyKeywords = false;
            let allFoundKeywords = new Set();

            for (const section of sections) {
                // Podświetl aktualnie skanowaną sekcję
                await page.evaluate((index) => {
                    const elements = document.querySelectorAll('[data-scannable="true"]');
                    const element = elements[index];
                    if (element) {
                        element.classList.add('scanning');
                        element.scrollIntoView({behavior: 'smooth', block: 'center'});

                        // Aktualizuj wskaźnik
                        const indicator = document.querySelector('.scanning-indicator');
                        if (indicator) {
                            indicator.textContent = `Scanning section ${index + 1} of ${elements.length}...`;
                        }
                    }
                }, section.index);

                await new Promise(resolve => setTimeout(resolve, 500));

                const {isRelevant, foundKeywords} = this.isRelevantContent(section.text);

                if (isRelevant) {
                    foundAnyKeywords = true;
                    foundKeywords.forEach(k => allFoundKeywords.add(k));

                    // Podświetl znalezione słowa kluczowe
                    await page.evaluate((index, keywords) => {
                        const elements = document.querySelectorAll('[data-scannable="true"]');
                        const element = elements[index];
                        if (element) {
                            element.classList.add('found-keyword');

                            const indicator = document.querySelector('.scanning-indicator');
                            if (indicator) {
                                indicator.style.background = '#4CAF50';
                                indicator.textContent = `Found keywords: ${keywords.join(', ')}`;
                            }
                        }
                    }, section.index, foundKeywords);
                }

                // Usuń podświetlenie skanowania
                await page.evaluate((index) => {
                    const elements = document.querySelectorAll('[data-scannable="true"]');
                    const element = elements[index];
                    if (element) {
                        element.classList.remove('scanning');
                    }
                }, section.index);
            }

            // Pokaż końcowy rezultat
            if (foundAnyKeywords) {
                await this.db.saveTenderDetails({
                    tenderId: tender.number,
                    keywords: Array.from(allFoundKeywords),
                    originalTender: tender,
                    fullContent: sections.map(s => s.text).join('\n')
                }, SCRAPER_TYPES.DETAILED);

                await page.evaluate((keywords) => {
                    const indicator = document.querySelector('.scanning-indicator');
                    if (indicator) {
                        indicator.style.background = '#4CAF50';
                        indicator.textContent = `✓ Saved with keywords: ${keywords.join(', ')}`;
                    }
                }, Array.from(allFoundKeywords));

                logger.info(`✓ Saved tender ${tender.number} with keywords: ${Array.from(allFoundKeywords).join(', ')}`);
            } else {
                await page.evaluate(() => {
                    const indicator = document.querySelector('.scanning-indicator');
                    if (indicator) {
                        indicator.style.background = '#666';
                        indicator.textContent = '✗ No relevant keywords found';
                    }
                });

                logger.info(`✗ No relevant keywords found in tender ${tender.number}`);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            logger.error(`Error processing tender ${tender.number}:`, {
                message: error.message,
                stack: error.stack
            });
        } finally {
            if (page && !page.isClosed()) {
                await page.close().catch(e => logger.error('Error closing page:', e));
            }
            if (browser) {
                await browser.close().catch(e => logger.error('Error closing browser:', e));
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
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
            const unprocessedTenders = await this.db.findUnprocessedListings();
            logger.info(`Found ${unprocessedTenders.length} unprocessed tenders`);

            for (const tender of unprocessedTenders) {
                try {
                    await this.processTenderDetails(tender);
                    // Mark tender as processed only if processing succeeded
                    await this.db.markListingAsProcessed(tender._id);
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (tenderError) {
                    logger.error(`Failed to process tender ${tender.number}:`, {
                        message: tenderError.message,
                        stack: tenderError.stack
                    });
                }
            }
        } catch (error) {
            logger.error('Critical error in startProcessing:', {
                message: error.message,
                stack: error.stack
            });
            throw error;  // Rzucamy błąd dalej
        } finally {
            try {
                await this.db.disconnect();
                logger.info('Database disconnected in details scraper');
            } catch (dbError) {
                logger.error('Error disconnecting from database:', dbError);
            }
        }
    }
}

module.exports = new DetailedScraperWorker();
