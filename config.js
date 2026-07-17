// Firebase Configuration
// Get these from your Firebase Console: https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "AIzaSyCl2atFau9gDH3ZWcRFY39U8tk9FMLiuqg",
  authDomain: "mech-go-70469.firebaseapp.com",
  projectId: "mech-go-70469",
  storageBucket: "mech-go-70469.firebasestorage.app",
  messagingSenderId: "616425040145",
  appId: "1:616425040145:web:3cb7202ebb8289d60444b0",
  measurementId: "G-ZG5MC1P603"
};
// Twilio Configuration
// Get these from your Twilio Console: https://www.twilio.com/console
// IMPORTANT: Do NOT commit real secrets to source control.
// Replace the values below with your own in a local config file or environment variables.
const twilioConfig = {
  accountSid: "<YOUR_TWILIO_ACCOUNT_SID>",
  authToken: "<YOUR_TWILIO_AUTH_TOKEN>",
  phoneNumber: "+1XXXXXXXXXX",
  // Backend endpoint that sends SMS
  // For local development: "http://localhost:3000"
  // For production: Update this to your backend URL
  smsEndpoint: "http://localhost:3000"
};

// Backend API Configuration
// For local development: point to backend server on port 3000
// For Vercel: use relative paths (empty baseURL)
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const apiConfig = {
  baseURL: isLocalhost && window.location.port === "5501" ? "http://localhost:3000" : "",
  endpoints: {
    sendOTP: "/api/send-otp",
    verifyOTP: "/api/verify-otp"
  }
};

// Firebase will be initialized by firebase-service.js after CDN loads
