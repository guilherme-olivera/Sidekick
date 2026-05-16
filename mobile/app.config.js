module.exports = ({ config }) => ({
  ...config,
  extra: {
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.11:3000',
  },
});
