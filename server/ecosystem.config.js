module.exports = {
  apps: [{
    name: 'p331-backend',
    script: 'start.sh',
    cwd: '/opt/p331-telegram-platform/server',
    interpreter: '/bin/bash',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // Don't merge with shell environment - start.sh loads .env fresh
    env: {},
  }],
};
