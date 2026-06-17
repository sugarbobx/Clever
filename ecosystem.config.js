module.exports = {
  apps: [
    {
      name: "clever-monolith",
      script: "./node_modules/next/dist/cli/next-start.js",
      cwd: "C:\\Clever",
      mode: "fork",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0"
      }
    }
  ]
};
