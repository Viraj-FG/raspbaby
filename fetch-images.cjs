// Batch fetch Amazon product images
const fs = require('fs');
const https = require('https');

const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
const asins = [...new Set(products.map(p => p.asin))];
console.log(`Total unique ASINs: ${asins.length}`);

const imageMap = {};
let completed = 0;
let failed = 0;

function fetchPage(asin) {
    return new Promise((resolve) => {
        const url = `https://www.amazon.com/dp/${asin}`;
        const opts = {
            hostname: 'www.amazon.com',
            path: `/dp/${asin}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        };
        https.get(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                // Try hiRes first, then large
                let match = data.match(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
                if (!match) match = data.match(/"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
                if (!match) match = data.match(/"mainUrl"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
                if (!match) {
                    // Try og:image
                    match = data.match(/property="og:image"\s+content="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/);
                }
                if (match) {
                    imageMap[asin] = match[1];
                    completed++;
                } else {
                    failed++;
                }
                process.stdout.write(`\r${completed} found, ${failed} failed, ${completed + failed}/${asins.length}`);
                resolve();
            });
        }).on('error', () => {
            failed++;
            resolve();
        });
    });
}

async function run() {
    const BATCH = 10;
    for (let i = 0; i < asins.length; i += BATCH) {
        const batch = asins.slice(i, i + BATCH);
        await Promise.all(batch.map(a => fetchPage(a)));
        // Small delay between batches
        if (i + BATCH < asins.length) await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log(`\nDone! ${completed} images found, ${failed} failed`);
    
    // Update products.json
    let updated = 0;
    for (const p of products) {
        if (imageMap[p.asin]) {
            p.image = imageMap[p.asin];
            updated++;
        }
    }
    
    fs.writeFileSync('data/products.json', JSON.stringify(products, null, 2));
    console.log(`Updated ${updated} products with images`);
}

run();
