// init.js
const fs = require('fs');
const path = require('path');

const structure = {
    'src': {
        'utils': {
            'config': ['config.js'],
            'logger': ['logger.js'],
            'helpers': ['helpers.js']
        },
        'scrapers': {
            'puppeteer': ['browser.js', 'tender-scraper.js'],
            'cheerio': ['parser.js'],
            'playwright': ['playwright-scraper.js'],
            'selenium': ['selenium-scraper.js']
        },
        'models': ['tender.js'],
        'index.js': `
const puppeteerScraper = require('./scrapers/puppeteer/tender-scraper');
const cheerioParser = require('./scrapers/cheerio/parser');
const logger = require('./utils/logger/logger');

async function main() {
  try {
    const tenders = await puppeteerScraper.scrape();
    const parsedData = cheerioParser.parse(tenders);
    // TODO: Add other scrapers
    
    return parsedData;
  } catch (error) {
    logger.error(error);
  }
}

main();
`
    },
    'logs': {},
    'tests': {
        'scrapers': ['puppeteer.test.js', 'cheerio.test.js']
    },
    'data': {
        'raw': {},
        'processed': {}
    }
};

function createStructure(structure, basePath = __dirname) {
    Object.entries(structure).forEach(([dir, content]) => {
        const fullPath = path.join(basePath, dir);
        fs.mkdirSync(fullPath, { recursive: true });

        if (Array.isArray(content)) {
            content.forEach(file => {
                const filePath = path.join(fullPath, file);
                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, '// TODO: Implement\n');
                }
            });
        } else if (typeof content === 'object') {
            createStructure(content, fullPath);
        }
    });
}

createStructure(structure);
console.log('Project structure created successfully!');