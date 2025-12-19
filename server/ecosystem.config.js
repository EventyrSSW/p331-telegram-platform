const path = require('path');
const fs = require('fs');

// Load .env file manually
const envPath = path.join(__dirname, '.env');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
}

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
      ...envVars,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
