// init.js
const fs = require('fs');
const path = require('path');

const structure = {
    'src': {
        'utils': {
            'config': ['index.js'],
            'logger': ['logger.js'],
            'helpers': ['file-helpers.js', 'json-helpers.js']
        },
        'scrapers': {
            'base': ['base-scraper.js'],
            'puppeteer': [
                'browser.js',
                'listings-scraper.js',
                'details-scraper.js'
            ],
            'cheerio': ['parser.js'],
            'playwright': ['placeholder.js'],
            'selenium': ['placeholder.js']
        },
        'processors': {
            'keyword-analyzer.js': '',
            'file-downloader.js': ''
        },
        'models': ['tender.js', 'tender-details.js']
    },
    'data': {
        'raw': {
            'listings': {},
            'tender_details': {}
        },
        'processed': {}
    },
    'logs': {}
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