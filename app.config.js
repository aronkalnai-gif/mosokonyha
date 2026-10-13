// Adds optional, machine-specific settings on top of app.json.
const fs = require('fs');

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // Needed for push notifications ("notify me when the key is free").
    // Download it from Firebase, see README.
    ...(fs.existsSync('./google-services.json') ? { googleServicesFile: './google-services.json' } : {}),
  },
  extra: {
    ...config.extra,
    eas: { ...config.extra?.eas, projectId: process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId },
  },
});
