const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const BaseScraper = require('../base/base-scraper');
const config = require('../../utils/config/config');
const {createLogger} = require('../../utils/logger/logger');
const SCRAPER_TYPES = require('../../scrapers/base/scraper-types');
const OpenAI = require('openai');

const logger = createLogger(__filename);

class DetailedScraperWorker extends BaseScraper {
    constructor() {
        super(SCRAPER_TYPES.DETAILED);
        this.db = null;
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        if (!this.db) {
            const db = require('../../utils/database/mongo');
            await db.connect();
            this.db = db;
            logger.info('DetailedScraperWorker database initialized');
        }
    }

    async initBrowser() {
        if (this.browser) {
            await this.cleanup();
        }

        puppeteer.use(StealthPlugin());
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: {
                width: 1920,
                height: 1080
            },
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await this.page.setViewport({width: 1920, height: 1080});
    }

    async cleanup() {
        if (this.page && !this.page.isClosed()) {
            await this.page.close().catch(() => {
            });
        }
        if (this.browser) {
            const pages = await this.browser.pages().catch(() => []);
            await Promise.all(pages.map(p => p.close().catch(() => {
            })));
            await this.browser.close().catch(() => {
            });
        }
        this.page = null;
        this.browser = null;
    }

    async injectStyles() {
        await this.page.addStyleTag({
            content: `
                .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 999999;
                }
                .analysis-container {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
                    z-index: 1000000;
                    width: 70%;
                    max-width: 800px;
                    font-family: Arial, sans-serif;
                }
                .progress-container {
                    background: #f0f0f0;
                    border-radius: 10px;
                    overflow: hidden;
                    margin: 20px 0;
                }
                .progress-bar {
                    height: 25px;
                    background: linear-gradient(90deg, #4CAF50, #45a049);
                    width: 0%;
                    transition: width 0.5s;
                    text-align: center;
                    line-height: 25px;
                    color: white;
                    font-weight: bold;
                }
                .status-text {
                    text-align: center;
                    margin: 15px 0;
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                }
                .stats-panel {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                    font-size: 14px;
                }
                .keywords-list {
                    margin-top: 15px;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }
                .keyword-tag {
                    display: inline-block;
                    margin: 5px;
                    padding: 5px 10px;
                    background: #e3f2fd;
                    border-radius: 15px;
                    font-size: 13px;
                }
                .tender-header {
                    margin-bottom: 15px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #eee;
                }
            `
        });
    }

    async setupAnalysisUI(tender) {
        await this.page.evaluate(({title, number}) => {
            document.body.style.visibility = 'hidden';

            const overlay = document.createElement('div');
            overlay.className = 'overlay';

            const container = document.createElement('div');
            container.className = 'analysis-container';
            container.innerHTML = `
                <div class="tender-header">
                    <h3 style="margin: 0 0 10px 0;">Analyzing Tender</h3>
                    <div style="font-size: 14px; color: #666;">
                        <div>Number: ${number}</div>
                        <div>Title: ${title}</div>
                    </div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">0%</div>
                </div>
                <div class="status-text">Initializing...</div>
                <div class="stats-panel"></div>
                <div class="keywords-list"></div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(container);
            document.body.style.visibility = 'visible';
        }, {
            title: tender.title,
            number: tender.number
        });
    }

    async analyzeContent(content) {
        const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

        await this.updateProgress(25, 'Preparing content...');

        const inputTokens = Math.ceil(content.length / 4);
        const estimatedCost = (inputTokens * 0.00001) + (100 * 0.00003);

        await this.updateProgress(50, 'Analyzing...', {
            input: inputTokens,
            output: 0,
            cost: estimatedCost
        });

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "Analyze tender content for Microsoft-related keywords. Required: at least 2 keywords from (licencj, ms office, office 365, m365, windows server, windows cal, microsoft 365, azure, software assurance, enterprise agreement, open value, cloud solution provider, microsoft volume licensing). Exclude if contains: microsoft edge, edge browser, surface, xbox. Return JSON with save (bool), message (string), foundKeywords (array), exactMatches (object)."
                    },
                    {role: "user", content}
                ],
                temperature: 0
            });

            const result = this.parseResponse(response);
            await this.updateProgress(100, 'Analysis complete', {
                input: response.usage.prompt_tokens,
                output: response.usage.completion_tokens,
                cost: (response.usage.prompt_tokens * 0.00001) + (response.usage.completion_tokens * 0.00003)
            });

            return result;
        } catch (error) {
            await this.updateProgress(100, 'Analysis failed');
            return {
                save: false,
                message: "API error",
                foundKeywords: [],
                exactMatches: {}
            };
        }
    }

    parseResponse(response) {
        try {
            const text = response.choices[0].message.content;
            const clean = text.replace(/```json\n|\n```/g, '').trim();
            const result = JSON.parse(clean);
            return {
                save: result.save || false,
                message: result.message || "No message",
                foundKeywords: result.foundKeywords || [],
                exactMatches: result.exactMatches || {}
            };
        } catch (e) {
            return {
                save: false,
                message: "Failed to parse response",
                foundKeywords: [],
                exactMatches: {}
            };
        }
    }

    async updateProgress(percentage, status, stats = null) {
        await this.page.evaluate(({perc, stat, tokenStats}) => {
            const bar = document.querySelector('.progress-bar');
            const status = document.querySelector('.status-text');
            const statsPanel = document.querySelector('.stats-panel');

            if (bar) {
                bar.style.width = perc + '%';
                bar.innerText = perc + '%';
            }
            if (status) {
                status.innerText = stat;
            }
            if (tokenStats && statsPanel) {
                statsPanel.innerHTML = `
                    <div>Input tokens: ${tokenStats.input}</div>
                    <div>Output tokens: ${tokenStats.output}</div>
                    <div>Total cost: $${tokenStats.cost.toFixed(4)}</div>
                `;
            }
        }, {perc: percentage, stat: status, tokenStats: stats});
    }

    async updateResults(result) {
        await this.page.evaluate((data) => {
            const container = document.querySelector('.analysis-container');
            const keywordsList = document.querySelector('.keywords-list');

            if (container && keywordsList) {
                const matchesHtml = Object.entries(data.exactMatches)
                    .map(([kw, count]) =>
                        `<span class="keyword-tag">${kw} (${count})</span>`
                    ).join('');

                keywordsList.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <strong>Found Keywords:</strong> 
                        ${data.foundKeywords.length > 0 ? data.foundKeywords.join(', ') : 'None'}
                    </div>
                    <div>
                        <strong>Exact Matches:</strong><br>
                        ${matchesHtml || 'No exact matches found'}
                    </div>
                `;

                container.style.background = data.save ? '#e8f5e9' : '#ffebee';
            }
        }, result);
    }

    async processTenderDetails(tender) {
        try {
            logger.info(`Processing tender: ${tender.number}`);
            await this.initBrowser();
            await this.page.goto(tender.link, {waitUntil: 'networkidle0'});

            await this.injectStyles();
            await this.setupAnalysisUI(tender);

            const content = await this.page.evaluate(() => document.documentElement.innerText);
            const result = await this.analyzeContent(content);
            await this.updateResults(result);

            if (result.save) {
                await this.db.saveTenderDetails({
                    tenderId: tender.number,
                    analysis: result.message,
                    keywords: result.foundKeywords,
                    exactMatches: result.exactMatches,
                    originalTender: tender,
                    fullContent: content
                }, SCRAPER_TYPES.DETAILED);
                logger.info(`✓ Saved tender ${tender.number}`);
            } else {
                logger.info(`✗ Rejected tender ${tender.number}: ${result.message}`);
            }

            await new Promise(r => setTimeout(r, 3000));
        } catch (error) {
            logger.error(`Error processing tender ${tender.number}:`, error);
        } finally {
            await this.cleanup();
        }
    }

    async startProcessing() {
        try {
            await this.initialize();
            const tenders = await this.db.findUnprocessedListings();
            logger.info(`Found ${tenders.length} unprocessed tenders`);

            for (const tender of tenders) {
                await this.processTenderDetails(tender);
                await this.db.markListingAsProcessed(tender._id);
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (error) {
            logger.error('Critical error:', error);
            throw error;
        } finally {
            await this.db.disconnect().catch(() => {
            });
        }
    }
}


module.exports = new DetailedScraperWorker();