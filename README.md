
# Tender Scraping System

A comprehensive system for scraping and analyzing tender data from ezamowienia.gov.pl using multiple scraping strategies and data processing pipelines.

## Architecture

The system consists of multiple components working together to collect, process, and analyze tender data:

1. **Scrapers**
   - Puppeteer Scraper (UI-based)
   - API Scraper (XHR-based)
   - Official API Scraper
   - Details Scraper

2. **Data Processing**
   - Correction Processor
   - Analysis Pipeline

3. **Storage**
   - MongoDB for data persistence

## Prerequisites

```bash
# Required environment variables (.env)
MONGO_URL=mongodb://localhost:27017
MONGO_DB=tenders_db
OPENAI_API_KEY=your_openai_api_key
CHROME_PATH=/path/to/chrome # Optional
```

## Installation

```bash
# Install dependencies
npm install

# Required packages
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth winston chalk dotenv mongodb openai
```

## Usage Commands

### Basic Scraping

```bash
# Run Puppeteer scraper (default)
node index.js normal

# Run XHR-based API scraper
node index.js xhr

# Run Official API scraper
node index.js api

# Run Details scraper only
node index.js details
```

### Advanced Options

```bash
# Run scraper with details processing
node index.js normal --with-details
node index.js xhr --with-details
node index.js api --with-details

# Run only details processing
node index.js normal --only-details
node index.js xhr --only-details
node index.js api --only-details

# Run correction processor
node index.js normal --correction
```

### Mode Flags

```bash
# Presentation mode (non-headless, no scanning visuals)
node index.js normal --presentation

# Server mode (headless, with scanning visuals)
node index.js normal --server
```

## Component Description

### Scrapers

1. **Puppeteer Scraper (`listings-scraper.js`)**
   - UI-based scraping using browser automation
   - Handles pagination and dynamic content
   - Visual feedback during scanning (optional)

2. **API Scraper (`api-scraper.js`)**
   - XHR-based data collection
   - Direct API calls to the tender platform
   - Efficient for bulk data collection

3. **Official API Scraper (`official-api-scraper.js`)**
   - Uses the official API endpoints
   - Structured data collection
   - Supports filtering and pagination

4. **Details Scraper (`details-scraper.js`)**
   - Processes individual tender details
   - Extracts comprehensive information
   - Supports parallel processing

### Data Processing

1. **Correction Processor (`correction-processor.js`)**
   - Analyzes tender details using OpenAI
   - Identifies Microsoft-specific tenders
   - Extracts key information (prices, licenses, etc.)

### Configuration

The system can be configured through:
- Environment variables
- `config.js` file
- Command-line arguments

Key configuration options:
```javascript
{
    baseUrl: 'https://ezamowienia.gov.pl/mo-client-board/bzp/list',
    scanning: true/false, // Visual feedback
    puppeteer: {
        headless: true/false,
        // Other browser options
    }
}
```

## Error Handling

The system implements:
- Automatic retries for failed requests
- Graceful error recovery
- Detailed logging
- Browser session recovery

## Logging

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

Log levels:
- ERROR: Critical failures
- WARN: Non-critical issues
- INFO: Operation progress
- DEBUG: Detailed debugging

## Database Collections

1. **tender_listings_{scraper_type}**
   - Basic tender information
   - Scraper-specific data

2. **tender_details**
   - Comprehensive tender information
   - Raw content and processed data

3. **tender_analysis**
   - AI-processed analysis results
   - Microsoft-specific information

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
