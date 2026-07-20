/**
 * 🎛️ SYSTEM CONFIGURATION PANEL
 * Modify the values below to customize the behavior of your presence application.
 */
window.APP_CONFIG = {
  // 🌐 Update this with your live production Vercel URL!
  vercelGatewayUrl: "https://ivy-seven-phi.vercel.app",

  // --- Geofencing & Location Safeguards ---
  officeLocation: {
    latitude: -7.2423393, // Example coordinates (Surabaya)
    longitude: 112.6379209,
    radiusMeters: 8.0, // Geofence strict activation barrier threshold
  },

  // --- Hardcoded Network Anchor ---
  // Fallback SSID validation matching parameter for the native app check
  targetWifiSSID: "Office_Corp_Network",

  // --- Visual Configuration Options ---
  defaultTheme: "auto", // Options: "auto" (system sync), "dark", "light"
  enableHighContrast: false, // 💡 SET TO FALSE FOR SOFT PALETTE.

  // --- Login Persistence Management 🔒 ---
  // Options:
  // "daily" -> Wipes the logged-in session automatically at midnight.
  // "duration" -> Persists for a specific time window defined below.
  persistenceStrategy: "duration",
  persistenceDurationMs: 8 * 60 * 60 * 1000, // 8 hours in milliseconds (only used if strategy is "duration")
};
