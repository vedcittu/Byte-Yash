// server.js
async function fetchWhoJson() {
const res = await axios.get(WHO_JSON, { timeout: 10000 });
if (res.status === 200 && res.data) {
const items = res.data?.items || res.data?.results || res.data?.data || res.data;
if (Array.isArray(items)) return items.map(mapWhoItem);
// if items is an object containing results
if (items && typeof items === 'object') {
// try common arrays inside
const arr = items.results || items.items || items.data || [];
return Array.isArray(arr) ? arr.map(mapWhoItem) : [];
}
}
throw new Error('WHO JSON not available or unexpected format');
}


async function fetchWhoRss() {
const res = await axios.get(WHO_RSS, { timeout: 10000, responseType: 'text' });
const parsed = await xml2js.parseStringPromise(res.data, { explicitArray: false });
const items = parsed?.rss?.channel?.item || [];
const arr = Array.isArray(items) ? items : (items ? [items] : []);
return arr.map(it => ({
title: it.title || '',
summary: it.description || '',
link: it.link || '',
date: it.pubDate || it.date || '',
location: it['dc:coverage'] || it.category || '',
severity: '',
source: 'WHO-RSS'
}));
}


app.get('/api/alerts', async (req, res) => {
try {
const now = Date.now();
if (cache.data && (now - cache.ts) < CACHE_TTL_MS) {
return res.json({ source: 'cache', data: cache.data });
}


// Try WHO JSON API first
try {
const data = await fetchWhoJson();
cache = { ts: now, data };
return res.json({ source: 'who-json', data });
} catch (e) {
console.warn('WHO JSON failed:', e.message);
}


// Fallback to RSS
try {
const rssData = await fetchWhoRss();
cache = { ts: now, data: rssData };
return res.json({ source: 'who-rss', data: rssData });
} catch (e2) {
console.error('WHO RSS failed:', e2.message);
return res.status(502).json({ error: 'Unable to fetch WHO feeds', details: e2.message });
}
} catch (err) {
console.error(err);
res.status(500).json({ error: err.message });
}
});


app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));