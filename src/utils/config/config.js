require('dotenv').config();

module.exports = {
    baseUrl: 'https://ezamowienia.gov.pl/mo-client-board/bzp/list',
    searchTerms: ['microsoft', 'license'],
    puppeteer: {
        headless: false,
        timeout: 30000,
        slowMo: 250
    },
    selectors: {
        // Bazując na HTMLu, widzę te klasy:
        searchInput: 'input.form-control.ng-untouched.ng-pristine.ng-valid',
        moduleSearch: '.module.module-search',
        tenderList: '.row.container',
        tenderItem: {
            container: '.col-12',
            title: '.text', // lub bardziej specyficzny selektor jak będzie potrzebny
            link: 'a.form-control',
            date: '.lib-date-0', // jeden z datepickerów
            status: '.form-select'
        }
    }
};