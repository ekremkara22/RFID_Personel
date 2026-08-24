module.exports = {
  apps: [
    {
      name: "rfid-personel-takip",
      cwd: "/var/www/rfid-personel-takip",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
