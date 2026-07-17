// Shared utilities and storage management
const STORAGE_KEYS = {
  CUSTOMER_SESSION: "mechgo_customer_session",
  DRIVER_SESSION: "mechgo_driver_session",
  MECHANIC_SESSION: "mechgo_mechanic_session",
  ADMIN_SESSION: "mechgo_admin_session",
  ORDERS: "mechgo_orders",
  MECHANIC_REQUESTS: "mechgo_mechanic_requests",
  CHAT_MESSAGES: "mechgo_chat_messages",
  CUSTOMERS: "mechgo_customers_db",
  DRIVERS: "mechgo_drivers_db",
  MECHANICS: "mechgo_mechanics_db",
};

function getSessionStorageKey(role) {
  return role === "customer" ? STORAGE_KEYS.CUSTOMER_SESSION :
         role === "driver" ? STORAGE_KEYS.DRIVER_SESSION :
         role === "mechanic" ? STORAGE_KEYS.MECHANIC_SESSION :
         role === "admin" ? STORAGE_KEYS.ADMIN_SESSION : null;
}

// Utility functions
function qs(id) {
  return document.getElementById(id);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors in demo
  }
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// Session management
function saveSession(role, sessionData) {
  const key = getSessionStorageKey(role);
  if (!key) return;
  saveStorage(key, sessionData);
}

function loadSession(role) {
  const key = getSessionStorageKey(role);
  if (!key) return null;
  return loadStorage(key, null);
}

function clearSession(role) {
  const key = getSessionStorageKey(role);
  if (!key) return;
  localStorage.removeItem(key);
}

// User database functions
function getUserDB(role) {
  const key = role === "customer" ? STORAGE_KEYS.CUSTOMERS :
              role === "driver" ? STORAGE_KEYS.DRIVERS :
              STORAGE_KEYS.MECHANICS;
  return loadStorage(key, []);
}

function saveUserDB(role, users) {
  const key = role === "customer" ? STORAGE_KEYS.CUSTOMERS :
              role === "driver" ? STORAGE_KEYS.DRIVERS :
              STORAGE_KEYS.MECHANICS;
  saveStorage(key, users);
}

function findUserByPhone(role, phone) {
  const users = getUserDB(role);
  return users.find(u => u.phone === phone);
}

function registerUser(role, userData) {
  const users = getUserDB(role);
  const existingUser = findUserByPhone(role, userData.phone);
  
  if (existingUser) {
    throw new Error("Phone number already registered");
  }
  
  const newUser = {
    id: Date.now(),
    ...userData,
    createdAt: new Date().toISOString(),
    verified: false,
    verifiedAt: null,
    documents: [],
    otpCode: null,
    otpExpiry: null,
  };
  
  users.push(newUser);
  saveUserDB(role, users);
  return newUser;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendOTP(phone) {
  const otp = generateOTP();
  // In real app: Send via SMS/WhatsApp
  // For demo: Log to console and store
  console.log(`📱 OTP for ${phone}: ${otp}`);
  alert(`📱 Demo OTP: ${otp}\n(Check browser console)`);
  return otp;
}

function verifyOTP(role, phone, enteredOTP, storedOTP) {
  const user = findUserByPhone(role, phone);
  if (!user) return false;
  
  // In demo, just check if OTP matches
  return enteredOTP === storedOTP && storedOTP !== null;
}

function updateUserVerification(role, userId, verified, documents = []) {
  const users = getUserDB(role);
  const user = users.find(u => u.id === userId);
  
  if (user) {
    user.verified = verified;
    user.verifiedAt = verified ? new Date().toISOString() : null;
    user.documents = documents;
    saveUserDB(role, users);
  }
  
  return user;
}

// Data management
function saveOrders(orders) {
  saveStorage(STORAGE_KEYS.ORDERS, orders);
}

function loadOrders() {
  return loadStorage(STORAGE_KEYS.ORDERS, []);
}

function saveMechanicRequests(requests) {
  saveStorage(STORAGE_KEYS.MECHANIC_REQUESTS, requests);
}

function loadMechanicRequests() {
  return loadStorage(STORAGE_KEYS.MECHANIC_REQUESTS, []);
}

function saveChatMessages(messages) {
  saveStorage(STORAGE_KEYS.CHAT_MESSAGES, messages);
}

function loadChatMessages() {
  return loadStorage(STORAGE_KEYS.CHAT_MESSAGES, []);
}

// Year footer
const yearSpan = qs("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}
