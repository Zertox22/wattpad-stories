// Vercel Speed Insights Initialization
// This script initializes Vercel Speed Insights to track web performance metrics

// Initialize the Speed Insights queue
window.si = window.si || function(...params) {
  (window.siq = window.siq || []).push(params);
};

// Configuration
const speedInsightsConfig = {
  sdkn: '@vercel/speed-insights',
  sdkv: '2.0.0'
};

// Create and inject the Speed Insights script
const script = document.createElement('script');
script.src = '/_vercel/speed-insights/script.js';
script.defer = true;

// Add configuration as data attributes
Object.entries(speedInsightsConfig).forEach(([key, value]) => {
  script.dataset[key] = value;
});

// Error handler
script.onerror = () => {
  console.warn('[Vercel Speed Insights] Failed to load. Ensure Speed Insights is enabled in your Vercel dashboard.');
};

// Inject the script into the page
document.head.appendChild(script);
