const { execSync } = require('child_process');
console.log("Starting Next.js production server...");
execSync('npx next start -p 3000 -H 0.0.0.0', { stdio: 'inherit' });
