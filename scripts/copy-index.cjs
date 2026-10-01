const fs = require('node:fs');

fs.copyFileSync('dist/index.html', 'dist/404.html');
if (fs.existsSync('public/_redirects')) {
  fs.copyFileSync('public/_redirects', 'dist/_redirects');
}