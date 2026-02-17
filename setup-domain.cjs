const { execSync } = require('child_process');

// Get wrangler oauth token from config
const fs = require('fs');
const path = require('path');
const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.wrangler', 'config', 'default.toml');
let token = '';
try {
    const cfg = fs.readFileSync(configPath, 'utf8');
    const match = cfg.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) token = match[1];
} catch(e) {}

if (!token) {
    // Try access token
    try {
        const cfg = fs.readFileSync(configPath, 'utf8');
        const match = cfg.match(/access_token\s*=\s*"([^"]+)"/);
        if (match) token = match[1];
    } catch(e) {}
}

if (!token) {
    console.log('No token found, trying env...');
    token = process.env.CLOUDFLARE_API_TOKEN || '';
}

const https = require('https');

function cfApi(method, path, body) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4${path}`,
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log('Token length:', token.length);
    
    // 1. Find zone for raspbabyinc.com
    const zones = await cfApi('GET', '/zones?name=raspbabyinc.com');
    if (!zones.result || zones.result.length === 0) {
        console.log('Zone not found:', JSON.stringify(zones.errors || zones));
        return;
    }
    const zoneId = zones.result[0].id;
    console.log('Zone ID:', zoneId);
    console.log('Zone status:', zones.result[0].status);

    // 2. Add custom domain to Pages project
    const addDomain = await cfApi('POST', `/accounts/24c5b14aa2682075334c8be529c6ea9f/pages/projects/raspbaby/domains`, {
        name: 'raspbabyinc.com'
    });
    console.log('Add domain result:', JSON.stringify(addDomain, null, 2));

    // 3. Also try www
    const addWww = await cfApi('POST', `/accounts/24c5b14aa2682075334c8be529c6ea9f/pages/projects/raspbaby/domains`, {
        name: 'www.raspbabyinc.com'
    });
    console.log('Add www result:', JSON.stringify(addWww, null, 2));
}

main().catch(console.error);
