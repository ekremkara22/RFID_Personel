module.exports = {
  apps: [
    {
      name: "checkinqr",
      cwd: "/var/www/checkinqr",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
