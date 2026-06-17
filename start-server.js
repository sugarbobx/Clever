const { execSync } = require('child_process');
try {
  console.log("Launching Next.js production engine on port 3000...");
  execSync('npx next start -p 3000 -H 0.0.0.0', { stdio: 'inherit' });
} catch (error) {
  console.error("Server stopped execution:", error);
}
