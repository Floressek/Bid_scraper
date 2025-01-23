module.exports = {
    baseUrl: 'https://ezamowienia.gov.pl/mo-client-board/bzp/list',
    searchTerms: ['microsoft', 'license'],
    puppeteer: {
        headless: false,
        timeout: 30000,
        slowMo: 250
    },
    selectors: {
        searchBox: 'input[placeholder="Wyszukaj ogłoszenia"]',
        tenderList: 'div.relative.overflow-hidden',
        tenderItem: {
            container: 'div.card',
            title: 'h3',
            link: 'a',
            date: 'span.date',
            status: 'span.status'
        }
    }
};