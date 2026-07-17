// Backend Server for MECH-GO OTP Verification
// Make sure to run: npm install express cors dotenv twilio firebase-admin

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const twilio = require('twilio');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Firebase Admin (optional - use if you have service account JSON)
// For demo: Firebase will be accessed from frontend
const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;

let db;
try {
  if (firebaseServiceAccountPath) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(path.resolve(firebaseServiceAccountPath), 'utf8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log(`Firebase Admin initialized from service account: ${firebaseServiceAccountPath}`);
  } else if (firebaseProjectId && firebasePrivateKey && firebaseClientEmail) {
    admin.initializeApp({
      projectId: firebaseProjectId,
      privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
      clientEmail: firebaseClientEmail
    });
    db = admin.firestore();
    console.log('Firebase Admin initialized from environment variables');
  } else {
    console.log('Firebase Admin not initialized: missing Firebase configuration');
  }
} catch (err) {
  console.error('Firebase initialization failed:', err.message);
}

// ========== ENDPOINTS ==========

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Send SMS OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    console.log(`\n📱 OTP Generated: ${otp} for ${phoneNumber}`);

    // Store OTP in memory (expires in 10 minutes)
    otpStorage.set(phoneNumber, {
      code: otp.toString(),
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Try to send SMS via Twilio
    try {
      const message = await twilioClient.messages.create({
        body: `Your MECH-GO verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      console.log(`✅ SMS sent via Twilio - SID: ${message.sid}`);
    } catch (twilioError) {
      console.log(`⚠️ Twilio SMS failed: ${twilioError.message}`);
      console.log(`📌 For testing, use demo OTP: ${otp}`);
    }

    // Store OTP in localStorage via frontend (or in session)
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      demoOTP: otp // For testing only - remove in production
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP (in-memory storage for demo)
const otpStorage = new Map();

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }

    // For demo: check if OTP matches what was sent
    // In production: verify against Firestore
    const storedOTP = otpStorage.get(phoneNumber);

    if (!storedOTP) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (storedOTP.code !== otp.toString()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() > storedOTP.expiresAt) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Mark as verified
    otpStorage.delete(phoneNumber);
    console.log(`✅ OTP verified for ${phoneNumber}`);
    
    res.json({ 
      success: true, 
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 MECH-GO Backend Server running on http://localhost:${PORT}`);
  console.log(`✅ /api/send-otp endpoint ready`);
  console.log(`✅ /api/verify-otp endpoint ready`);
  console.log(`\n📝 For testing: Check console logs for demo OTPs\n`);
});
