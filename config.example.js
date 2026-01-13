// Configuration template for API keys
// Copy this file to config.js and add your actual API keys

const config = {
  // Google Places API key
  // Get your API key from: https://console.cloud.google.com/
  // Enable the Places API (New) for your project
  GOOGLE_PLACES_API_KEY: 'YOUR_API_KEY_HERE'
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

// Also make available globally for browser
if (typeof window !== 'undefined') {
  window.CONFIG = config;
}
