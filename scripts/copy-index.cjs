const fs = require('node:fs');
const path = require('node:path');

// 1. Ensure 404.html fallback exists for SPA routing
if (fs.existsSync('dist/index.html')) {
  fs.copyFileSync('dist/index.html', 'dist/404.html');
}

// 2. CRITICAL: Purge any cached or stray _redirects file
// Cloudflare Workers with Assets handles SPA routing via wrangler.jsonc ("not_found_handling": "single-page-application").
// If a _redirects file with "/* /index.html 200" is present, Cloudflare rejects deployment with error code 100324 (infinite loop).
const possibleRedirects = [
  path.resolve('dist/_redirects'),
  path.resolve('public/_redirects'),
  path.resolve('_redirects')
];

possibleRedirects.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[postbuild] Removed ${filePath} to prevent Cloudflare redirect loop.`);
    } catch (err) {
      console.error(`[postbuild] Failed to remove ${filePath}:`, err);
    }
  }
});