module.exports = {
  apps: [{
    name: 'p331-backend',
    script: 'dist/index.js',
    cwd: '/opt/p331-telegram-platform/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5331,
    },
    // Load .env file from the server directory
    node_args: '-r dotenv/config',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
