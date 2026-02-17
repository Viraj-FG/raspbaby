const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.wrangler', 'config', 'default.toml');
const cfg = fs.readFileSync(configPath, 'utf8');
const match = cfg.match(/oauth_token\s*=\s*"([^"]+)"/);
const token = match[1];

const ZONE_ID = '6de1e245ada2b0dd250b9b534efecb9f';

function cfApi(method, apiPath, body) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4${apiPath}`,
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        };
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    // Check existing DNS records
    const existing = await cfApi('GET', `/zones/${ZONE_ID}/dns_records`);
    console.log('Existing records:', existing.result?.map(r => `${r.type} ${r.name} -> ${r.content}`));

    // Add CNAME for root @ -> raspbaby.pages.dev
    const rootCname = await cfApi('POST', `/zones/${ZONE_ID}/dns_records`, {
        type: 'CNAME',
        name: '@',
        content: 'raspbaby.pages.dev',
        proxied: true,
        ttl: 1
    });
    console.log('Root CNAME:', rootCname.success ? 'SUCCESS' : JSON.stringify(rootCname.errors));

    // Add CNAME for www -> raspbaby.pages.dev
    const wwwCname = await cfApi('POST', `/zones/${ZONE_ID}/dns_records`, {
        type: 'CNAME',
        name: 'www',
        content: 'raspbaby.pages.dev',
        proxied: true,
        ttl: 1
    });
    console.log('WWW CNAME:', wwwCname.success ? 'SUCCESS' : JSON.stringify(wwwCname.errors));
}

main().catch(console.error);
