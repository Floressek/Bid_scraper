const db = require('../../utils/database/mongo');
const config = require('../../utils/config/config');

class BaseScraper {
    constructor(scraperType) {
        this.scraperType = scraperType;
        this.db = db;
    }

    async initialize() {
        await this.db.connect();
    }

    async saveListings(listings) {
        return await this.db.saveListings(listings, this.scraperType);
    }

    async saveTednerDetails(details) {
        return await this.db.saveTenderDetails(details, this.scraperType);
    }
}

module.exports = BaseScraper;