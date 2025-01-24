const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const BasicScraper = require('../base/base-scraper');
const {getRandomUserAgent} = require('../../utils/helpers/browser-helpers');
const config = require('../../utils/config/config');
const {createLogger} = require('../../utils/logger/logger');

const logger = createLogger(__filename);

puppeteer.use(StealthPlugin());

async function scrapeTenders() {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // użyj lokalnego Chrome
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });

    const page = await browser.newPage();

    // Dodaj więcej headerów
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
    });

    // Emuluj normalną przeglądarkę - agents
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Włącz JavaScript
    await page.setJavaScriptEnabled(true);

    try {
        await page.goto('https://ezamowienia.gov.pl/mo-client-board/bzp/list', {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 30000
        });

        // Czekamy na załadowanie tabeli i paginacji
        await page.waitForSelector('lib-table');
        await page.waitForSelector('.pagination-container');

        const allTenders = [];
        let hasNextPage = true;
        let pageNumber = 1;

        while (hasNextPage) {
            logger.info(`Scraping page ${pageNumber}`);

            // Czekamy na załadowanie danych w tabeli
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Pobierz dane z aktualnej strony
            const pageTenders = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('tbody tr'));
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

            allTenders.push(...pageTenders);
            logger.info(`Found ${pageTenders.length} tenders on page ${pageNumber}`);

            // Sprawdź czy jest następna strona i kliknij jeśli jest
            const hasNext = await page.evaluate(() => {
                const nextButton = document.querySelector('.btn.btn-sm.btn-outline-secondary.append-arrow');
                return !nextButton.classList.contains('disabled');
            });

            if (hasNext) {
                await page.click('.btn.btn-sm.btn-outline-secondary.append-arrow');
                pageNumber++;
            } else {
                hasNextPage = false;
            }
        }

        logger.info(`Total tenders scraped: ${allTenders.length}`);
        return allTenders;

    } catch (error) {
        logger.error('Error:', error);
        throw error;
    }
    // Nie zamykamy przeglądarki żeby zobaczyć co się dzieje
}

module.exports = {scrapeTenders};