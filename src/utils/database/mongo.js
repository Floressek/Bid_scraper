const {MongoClient} = require('mongodb');
const {createLogger} = require('../../utils/logger/logger');

const logger = createLogger(__filename);
require('dotenv').config();

class MongoDB {
    constructor() {
        this.client = new MongoClient(process.env.MONGO_URL);
        this.db = null;
    }

    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db(process.env.MONGO_DB);
            logger.info('MongoDB connected');
        } catch (error) {
            logger.error('MongoDB connection error:', error);
        }
    }

    async saveListings(listings, scraperType) {
        const collectionName = `tender_listings_${scraperType.toLowerCase()}`;
        const collection = this.db.collection(collectionName);
        const documents = listings.map(listing => ({
            ...listing,
            scraperType,
            scrapedAt: new Date(),
            processed: false,
            source: 'ezamowienia'
        }));
        logger.info(`Inserting ${documents.length} listings to ${collectionName}`);
        return await collection.insertMany(documents);
    }

    async saveTenderDetails(details, scraperId) {
        const collection = this.db.collection('tender_details');
        logger.info(`Inserting details for tender ${details.tenderId}`);
        return await collection.insertOne({
            ...details,
            scraperId,
            scrapedAt: new Date()
        });
    }

    async findUnprocessedListings() {
        const collection = this.db.collection('tender_listings');
        logger.info('Finding unprocessed listings');
        return await collection.find({processed: false}).toArray();
    }

    async markListingAsProcessed(listingId) {
        const collection = this.db.collection('tender_listings');
        logger.info(`Marking listing ${listingId} as processed`);
        return await collection.updateOne(
            {_id: listingId},
            {$set: {processed: true}}
        );
    }

    async disconnect() {
        await this.client.close();
        logger.info('MongoDB disconnected');
    }
}

module.exports = new MongoDB();