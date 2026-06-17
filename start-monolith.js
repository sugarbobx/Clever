const { execSync } = require('child_process');

process.env.NODE_ENV = 'production';
process.env.PORT = '3000';
process.env.HOSTNAME = '0.0.0.0';

console.log("Starting Next.js production engine...");
try {
  execSync('npx next start', { stdio: 'inherit', env: process.env });
} catch (err) {
  console.error("Monolith process exited:", err.message);
  process.exit(1);
}
