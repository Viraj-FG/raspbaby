const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.wrangler', 'config', 'default.toml');
const cfg = fs.readFileSync(configPath, 'utf8');
const match = cfg.match(/oauth_token\s*=\s*"([^"]+)"/);
const token = match[1];

function cfApi(method, apiPath) {
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
        req.end();
    });
}

async function main() {
    const domains = await cfApi('GET', '/accounts/24c5b14aa2682075334c8be529c6ea9f/pages/projects/raspbaby/domains');
    console.log(JSON.stringify(domains.result, null, 2));
}

main().catch(console.error);
