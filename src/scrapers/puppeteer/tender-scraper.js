const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('../../utils/config/config');
const logger = require('../../utils/logger/logger');

puppeteer.use(StealthPlugin()); // Use stealth plugin

async function scrapeTenders() {
    const browser = await puppeteer.launch(config.puppeteer);
    const page = await browser.newPage();

    try {
        await page.goto(config.baseUrl);
        await page.waitForSelector(config.tenderSelector);

        // Dane które zbieramy z głównej strony - OBECNA WERSJA DEMO:
        // - Tytuł przetargu
        // - Link do szczegółów
        // - Data publikacji
        // - Status
        // - Numer referencyjny

        const tenders = await page.evaluate((selectors) => {
            const items = document.querySelectorAll(selectors.tenderSelector.container);
            // Tutaj zwracamy dane które nas interesują w formie tablicy obiektów
            return Array.from(items).map(item => ({
                title: item.querySelector(selectors.tenderItem.title)?.textContent.trim(),
                link: item.querySelector(selectors.tenderItem.link)?.href,
                date: item.querySelector(selectors.tenderItem.date)?.textContent.trim(),
                status: item.querySelector(selectors.tenderItem.status)?.textContent.trim(),
            }));
        }, config.selectors);

        logger.info(`Scraped ${tenders.length} tenders`);
        return tenders;
    } catch (error) {
        logger.error('Error scraping tenders:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = { scrapeTenders };