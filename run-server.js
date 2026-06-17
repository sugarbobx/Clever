const { execSync } = require('child_process');

// Force production variables natively on Windows
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';
process.env.HOSTNAME = '0.0.0.0';

console.log("🚀 Starting Next.js Production Server on http://0.0.0.0:3000...");

try {
  // Use npx next start explicitly with absolute cross-platform flags
  execSync('npx next start -p 3000 -H 0.0.0.0', { 
    stdio: 'inherit',
    env: process.env 
  });
} catch (error) {
  console.error("🛑 Next.js crashed on startup:", error.message);
  process.exit(1);
}
