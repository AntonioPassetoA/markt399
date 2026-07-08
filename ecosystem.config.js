// Configuração do PM2 — mantém o Painel de Clientes rodando 24/7,
// reinicia sozinho se cair e volta a subir após reboot do servidor.
// Uso no VPS (dentro da pasta do projeto):
//   pm2 start ecosystem.config.js
//   pm2 save
module.exports = {
  apps: [
    {
      name: "painel-clientes",
      script: "npm",
      args: "start",
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
