// Firebase Authentication & Database Service
// Requires: Firebase SDK loaded in HTML

let auth, db, storage;
let firebaseReady = false;

// Initialize Firebase
function initializeFirebase() {
  try {
    // Check if Firebase SDK is available
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
      console.warn("⚠️ Firebase SDK not loaded yet");
      firebaseReady = false;
      return false;
    }

    // Check if config is loaded
    if (typeof firebaseConfig === 'undefined') {
      console.warn("⚠️ Firebase config not loaded");
      firebaseReady = false;
      return false;
    }

    // Initialize Firebase app if not already initialized
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log("🔧 Firebase app created");
    } else {
      console.log("🔧 Firebase app already initialized");
    }

    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    firebaseReady = true;
    console.log("✅ Firebase initialized successfully");
    return true;
  } catch (err) {
    console.warn("⚠️ Firebase initialization warning: " + err.message);
    console.log("📌 Proceeding without Firebase - OTP flow uses backend API");
    firebaseReady = false;
    return false;
  }
}

// ==================== SMS OTP SERVICE ====================

class SMSService {
  static async sendOTP(phoneNumber) {
    try {
      // Option 1: Using Firebase Phone Authentication (Recommended)
      if (typeof window.RecaptchaVerifier === 'undefined') {
        this.setupRecaptcha();
      }

      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
      
      // Store confirmation result for verification
      window.confirmationResult = confirmationResult;
      console.log("✅ OTP sent to " + phoneNumber);
      return true;
    } catch (error) {
      console.error("SMS Error:", error);
      
      // Fallback: Send via custom backend if Firebase fails
      return await this.sendViaTwilio(phoneNumber);
    }
  }

  static setupRecaptcha() {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {
        console.log("Recaptcha verified");
      },
      'expired-callback': () => {
        console.log("Recaptcha expired");
      }
    });
  }

  static async verifyOTP(otpCode) {
    try {
      const result = await window.confirmationResult.confirm(otpCode);
      return result.user;
    } catch (error) {
      console.error("OTP Verification Error:", error);
      throw new Error("Invalid OTP");
    }
  }

  // Fallback: Send SMS via Twilio (requires backend)
  static async sendViaTwilio(phoneNumber) {
    try {
      const response = await fetch(twilioConfig.smsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, message: 'Your MECH-GO OTP is: XXXX' })
      });

      if (response.ok) {
        console.log("✅ OTP sent via Twilio");
        return true;
      } else {
        throw new Error("Twilio SMS failed");
      }
    } catch (error) {
      console.error("Twilio SMS Error:", error);
      return false;
    }
  }
}

// ==================== AUTHENTICATION SERVICE ====================

class AuthService {
  // Register new user
  static async registerUser(role, userData) {
    try {
      // Create Firebase Auth user
      const userCredential = await auth.createUserWithEmailAndPassword(
        `${userData.phone.replace(/\D/g, '')}@mech-go.app`,
        Math.random().toString(36).slice(2, 15) // Random password
      );

      const uid = userCredential.user.uid;

      // Store user profile in Firestore
      await db.collection(role === 'driver' ? 'drivers' : 'mechanics').doc(uid).set({
        uid,
        phone: userData.phone,
        role,
        verified: false,
        verifiedAt: null,
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...userData
      });

      console.log("✅ User registered:", uid);
      return { uid, ...userData };
    } catch (error) {
      console.error("Registration Error:", error);
      throw new Error(error.message);
    }
  }

  // Find user by phone
  static async findUserByPhone(role, phone) {
    try {
      const collection = role === 'driver' ? 'drivers' : role === 'mechanic' ? 'mechanics' : 'customers';
      
      const snapshot = await db.collection(collection)
        .where('phone', '==', phone)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error("Find User Error:", error);
      return null;
    }
  }

  // Get current user session
  static async getCurrentUser() {
    return new Promise((resolve) => {
      auth.onAuthStateChanged((user) => {
        resolve(user);
      });
    });
  }

  // Logout
  static async logout() {
    try {
      await auth.signOut();
      console.log("✅ User logged out");
    } catch (error) {
      console.error("Logout Error:", error);
      throw error;
    }
  }

  // Update user verification status
  static async updateUserVerification(role, uid, verified, documents = []) {
    try {
      const collection = role === 'driver' ? 'drivers' : 'mechanics';
      
      await db.collection(collection).doc(uid).update({
        verified,
        verifiedAt: verified ? new Date() : null,
        documents,
        updatedAt: new Date()
      });

      console.log("✅ User verification updated");
      return true;
    } catch (error) {
      console.error("Verification Update Error:", error);
      throw error;
    }
  }
}

// ==================== FIRESTORE DATABASE SERVICE ====================

class FirestoreService {
  // Add order (fuel delivery)
  static async createOrder(customerUid, orderData) {
    try {
      const docRef = await db.collection('orders').add({
        customerUid,
        ...orderData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'waiting'
      });

      console.log("✅ Order created:", docRef.id);
      return { id: docRef.id, ...orderData };
    } catch (error) {
      console.error("Create Order Error:", error);
      throw error;
    }
  }

  // Get orders
  static async getOrders(filters = {}) {
    try {
      let query = db.collection('orders');

      if (filters.customerUid) {
        query = query.where('customerUid', '==', filters.customerUid);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Get Orders Error:", error);
      return [];
    }
  }

  // Update order
  static async updateOrder(orderId, updates) {
    try {
      await db.collection('orders').doc(orderId).update({
        ...updates,
        updatedAt: new Date()
      });

      console.log("✅ Order updated:", orderId);
      return true;
    } catch (error) {
      console.error("Update Order Error:", error);
      throw error;
    }
  }

  // Create mechanic request
  static async createMechanicRequest(customerUid, requestData) {
    try {
      const docRef = await db.collection('mechanic_requests').add({
        customerUid,
        ...requestData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'waiting'
      });

      console.log("✅ Mechanic request created:", docRef.id);
      return { id: docRef.id, ...requestData };
    } catch (error) {
      console.error("Create Request Error:", error);
      throw error;
    }
  }

  // Get available jobs/orders
  static async getAvailableJobs(role, limit = 20) {
    try {
      const collection = role === 'driver' ? 'orders' : 'mechanic_requests';
      
      const snapshot = await db.collection(collection)
        .where('status', '==', 'waiting')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Get Available Jobs Error:", error);
      return [];
    }
  }

  // Accept job
  static async acceptJob(role, jobId, workerUid, workerName) {
    try {
      const collection = role === 'driver' ? 'orders' : 'mechanic_requests';
      
      await db.collection(collection).doc(jobId).update({
        acceptedBy: workerUid,
        acceptedByName: workerName,
        acceptedAt: new Date(),
        status: 'accepted',
        updatedAt: new Date()
      });

      console.log("✅ Job accepted");
      return true;
    } catch (error) {
      console.error("Accept Job Error:", error);
      throw error;
    }
  }

  // Save chat message
  static async saveMessage(jobId, role, senderUid, text) {
    try {
      await db.collection('messages').add({
        jobId,
        senderRole: role,
        senderUid,
        text,
        createdAt: new Date()
      });

      return true;
    } catch (error) {
      console.error("Save Message Error:", error);
      throw error;
    }
  }

  // Get chat messages for a job
  static async getMessages(jobId) {
    try {
      const snapshot = await db.collection('messages')
        .where('jobId', '==', jobId)
        .orderBy('createdAt', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Get Messages Error:", error);
      return [];
    }
  }

  // Upload document
  static async uploadDocument(uid, role, file, docType) {
    try {
      const path = `documents/${role}/${uid}/${docType}_${Date.now()}`;
      const ref = storage.ref(path);

      const snapshot = await ref.put(file);
      const downloadUrl = await snapshot.ref.getDownloadURL();

      console.log("✅ Document uploaded:", downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error("Upload Document Error:", error);
      throw error;
    }
  }

  // Get pending verifications for admin
  static async getPendingVerifications(role) {
    try {
      const collection = role === 'driver' ? 'drivers' : 'mechanics';
      
      const snapshot = await db.collection(collection)
        .where('verified', '==', false)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Get Pending Verifications Error:", error);
      return [];
    }
  }
}

// ==================== INITIALIZE ON LOAD ====================

document.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();
});
