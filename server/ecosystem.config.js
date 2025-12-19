const fs = require('fs');
const path = require('path');

// Load .env file directly
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }

  return env;
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
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // Load env directly from .env file
    env: loadEnv(),
  }],
};
