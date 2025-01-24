require('dotenv').config();

module.exports = {
    baseUrl: 'https://ezamowienia.gov.pl/mo-client-board/bzp/list',
    searchTerms: ['microsoft', 'license'],
    puppeteer: {
        browserless: {
            endpoint: process.env.BROWSER_WS_ENDPOINT,
            options: {
                timeout: 30000,
                protocolTimeout: 30000
            }
        }
    },
    selectors: {
        searchInput: 'input.form-control.ng-untouched.ng-pristine.ng-valid',
        moduleSearch: '.module.module-search',
        tenderList: '.row.container',
        tenderItem: {
            container: '.col-12',
            title: '.text',
            link: 'a.form-control',
            date: '.lib-date-0',
            status: '.form-select'
        }
    },
    mongodb: {
        url: process.env.MONGO_URL,
        dbName: 'tenders_db'
    }
};