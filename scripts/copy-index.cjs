const fs = require('node:fs');

fs.copyFileSync('dist/index.html', 'dist/404.html');