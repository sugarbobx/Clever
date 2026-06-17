module.exports = {
  apps: [
    {
      name: "clever",
      script: "C:/Clever/node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 0.0.0.0",
      cwd: "C:/Clever/apps/web-client",
      kill_timeout: 5000,
      wait_ready: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
