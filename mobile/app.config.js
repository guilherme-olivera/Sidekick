const fs = require('fs');
const path = require('path');

let envApiUrl = '';
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_API_URL\s*=\s*(.+)/);
    if (match && match[1]) {
      envApiUrl = match[1].trim();
    }
  }
} catch (e) {
  console.log('Failed to read .env file:', e);
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    API_URL: envApiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.11:3000',
  },
});
