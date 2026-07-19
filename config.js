/**
 * 🎛️ SYSTEM CONFIGURATION PANEL
 * Modify the values below to customize the behavior of your presence application.
 */
window.APP_CONFIG = {
    // --- API & Database Gateways ---
    // Your deployed Google Apps Script URL handling authentication & data writes
    googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbwVneFswdVzE2eVK_ne_VwKKOO0dhsXytby-IenoUvxnuQq7RL3yU4PWsHzsopE47Vs/exec",

    // The public CSV export URLs of your master spreadsheets
    spreadsheetCsvLinks: {
        users: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxj20AptQytiRU-pQvL6_G8SzxHro26XSwLa3u0-RsuDB0CEJLUh4CRg1U-K2J0mMiLpey04LfDIVg/pub?gid=0&single=true&output=csv",
        tasks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxj20AptQytiRU-pQvL6_G8SzxHro26XSwLa3u0-RsuDB0CEJLUh4CRg1U-K2J0mMiLpey04LfDIVg/pub?gid=474170713&single=true&output=csv",
        absence: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxj20AptQytiRU-pQvL6_G8SzxHro26XSwLa3u0-RsuDB0CEJLUh4CRg1U-K2J0mMiLpey04LfDIVg/pub?gid=1980617504&single=true&output=csv" // Added for completeness ✅
    },

    // --- Geofencing & Location Safeguards ---
    officeLocation: {
        latitude: -7.2423393,     // Example coordinates (Surabaya)
        longitude: 112.6379209,
        radiusMeters: 5.0      // Geofence strict activation barrier threshold
    },

    // --- Hardcoded Network Anchor ---
    // Fallback SSID validation matching parameter for the native app check
    targetWifiSSID: "Office_Corp_Network",

    // --- Visual Configuration Options ---
    defaultTheme: "auto",         // Options: "auto" (system sync), "dark", "light"
    enableHighContrast: false,    // 💡 SET TO FALSE FOR SOFT PALETTE.

    // --- Login Persistence Management 🔒 ---
    // Options: 
    // "daily" -> Wipes the logged-in session automatically at midnight.
    // "duration" -> Persists for a specific time window defined below.
    persistenceStrategy: "duration",
    persistenceDurationMs: 8 * 60 * 60 * 1000 // 8 hours in milliseconds (only used if strategy is "duration")
};
