// Driver Verification Flow - Using Firebase Auth + Firestore
let currentPhone = null;
let confirmationResult = null;
let currentUser = null;

// Wait for Firebase to be available
function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => clearInterval(checkInterval), 5000); // Timeout after 5s
    }
  });
}

// Use API configuration from config.js
const API_BASE = apiConfig?.baseURL || "";
const OTP_API_SEND = `${API_BASE}${apiConfig?.endpoints?.sendOTP || '/api/send-otp'}`;
const OTP_API_VERIFY = `${API_BASE}${apiConfig?.endpoints?.verifyOTP || '/api/verify-otp'}`;
let demoOTP = null;

async function sendBackendOTP(phone) {
  const response = await fetch(OTP_API_SEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: phone })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to send OTP');
  }

  if (data.demoOTP) {
    demoOTP = data.demoOTP;
    console.log(`Demo OTP for ${phone}: ${data.demoOTP}`);
  }

  return data;
}

async function verifyBackendOTP(phone, otp) {
  const response = await fetch(OTP_API_VERIFY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: phone, otp })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'OTP verification failed');
  }

  return data;
}

async function ensureAnonymousAuth() {
  if (!firebase || !firebase.auth) {
    throw new Error('Firebase Auth not available');
  }
  const user = firebase.auth().currentUser;
  if (user) return user;
  const credential = await firebase.auth().signInAnonymously();
  return credential.user;
}

const phoneForm = qs("phoneForm");
const phoneInput = qs("phoneInput");
const phoneVerificationStep = qs("phoneVerificationStep");

const otpForm = qs("otpForm");
const otpInput = qs("otpInput");
const otpVerificationStep = qs("otpVerificationStep");
const otpPhone = qs("otpPhone");
const resendOtpBtn = qs("resendOtpBtn");

const documentForm = qs("documentForm");
const documentUploadStep = qs("documentUploadStep");
const licenseFile = qs("licenseFile");
const registrationFile = qs("registrationFile");
const selfieFile = qs("selfieFile");
const bankAccount = qs("bankAccount");
const agreeCheckbox = qs("agreeCheckbox");

const licenseStatus = qs("licenseStatus");
const registrationStatus = qs("registrationStatus");
const selfieStatus = qs("selfieStatus");

const pendingApprovalStep = qs("pendingApprovalStep");
const alreadyVerifiedStep = qs("alreadyVerifiedStep");

// Check if user already exists in Firestore
async function checkExistingUser() {
  try {
    const user = firebase.auth().currentUser;
    if (user) {
      const driverDoc = await firebase.firestore().collection("drivers").doc(user.uid).get();
      if (driverDoc.exists) {
        currentUser = driverDoc.data();
        if (currentUser.verified) {
          showStep("alreadyVerified");
        } else {
          showStep("pendingApproval");
        }
      }
    }
  } catch (error) {
    console.error("Error checking existing user:", error);
  }
}

function showStep(step) {
  [phoneVerificationStep, otpVerificationStep, documentUploadStep, pendingApprovalStep, alreadyVerifiedStep].forEach(el => {
    if (el) el.classList.add("hidden");
  });
  
  if (step === "phone") phoneVerificationStep?.classList.remove("hidden");
  else if (step === "otp") otpVerificationStep?.classList.remove("hidden");
  else if (step === "documents") documentUploadStep?.classList.remove("hidden");
  else if (step === "pendingApproval") pendingApprovalStep?.classList.remove("hidden");
  else if (step === "alreadyVerified") alreadyVerifiedStep?.classList.remove("hidden");
}

// Step 1: Phone Verification with backend OTP
phoneForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const phone = phoneInput.value.trim();
  
  if (!phone) {
    alert("Please enter a phone number");
    return;
  }
  
  try {
    await waitForFirebase();
    
    phoneForm.disabled = true;
    currentPhone = phone;
    otpPhone.textContent = `OTP sent to ${phone}`;
    
    await sendBackendOTP(phone);
    
    showStep("otp");
    otpInput.focus();
    if (demoOTP) {
      console.log(`Demo OTP: ${demoOTP}`);
    }
  } catch (error) {
    console.error("❌ Phone verification error:", error);
    alert("Error sending OTP: " + error.message);
    phoneForm.disabled = false;
  }
});

// Step 2: OTP Verification with backend
otpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const enteredOTP = otpInput.value.trim();
  
  if (!enteredOTP || enteredOTP.length !== 6) {
    alert("Please enter a valid 6-digit OTP");
    return;
  }
  
  try {
    await waitForFirebase();
    
    otpForm.disabled = true;
    await verifyBackendOTP(currentPhone, enteredOTP);

    let user = findUserByPhone("driver", currentPhone);
    if (!user) {
      user = {
        id: Date.now(),
        phone: currentPhone,
        createdAt: new Date().toISOString(),
        verified: false,
        verifiedAt: null,
        documents: [],
        bankAccount: ""
      };
      const users = getUserDB("driver");
      users.push(user);
      saveUserDB("driver", users);
    }

    currentUser = user;
    saveSession("driver", { username: currentPhone, phone: currentPhone, userId: user.id });

    // OTP verified - proceed to documents
    showStep("documents");
    documentForm.reset();
  } catch (error) {
    console.error("OTP verification error:", error);
    alert("Invalid OTP. Please try again.");
    otpForm.disabled = false;
  }
});

resendOtpBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    if (!currentPhone) {
      alert("Please start phone verification again");
      return;
    }
    await sendBackendOTP(currentPhone);
    alert("OTP resent!");
    otpInput.value = "";
    otpInput.focus();
  } catch (error) {
    alert("Error resending OTP: " + error.message);
  }
});

// File upload handlers
[licenseFile, registrationFile, selfieFile].forEach(input => {
  input?.addEventListener("change", (e) => {
    const status = e.target.id === "licenseFile" ? licenseStatus :
                   e.target.id === "registrationFile" ? registrationStatus :
                   selfieStatus;
    
    if (e.target.files && e.target.files.length > 0) {
      const fileName = e.target.files[0].name;
      status.textContent = `✓ ${fileName}`;
      status.style.color = "var(--accent-gold)";
    }
  });
});

// Step 3: Document Upload to Firebase Storage
documentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!licenseFile.files.length) {
    alert("Please upload Driver's License");
    return;
  }
  
  if (!registrationFile.files.length) {
    alert("Please upload Vehicle Registration");
    return;
  }
  
  if (!selfieFile.files.length) {
    alert("Please upload Selfie with ID");
    return;
  }
  
  if (!bankAccount.value.trim()) {
    alert("Please enter Bank Account Number");
    return;
  }
  
  if (!agreeCheckbox.checked) {
    alert("Please agree to terms and conditions");
    return;
  }
  
  try {
    documentForm.disabled = true;
    let user = currentUser;
    if (!user) {
      const session = loadSession("driver");
      user = session ? findUserByPhone("driver", session.phone) : null;
    }

    if (!user) {
      alert("User not authenticated. Please start over.");
      documentForm.disabled = false;
      return;
    }

    const documents = [];
    const files = [
      { file: licenseFile.files[0], type: "license" },
      { file: registrationFile.files[0], type: "registration" },
      { file: selfieFile.files[0], type: "selfie" }
    ];
    
    for (const { file, type } of files) {
      documents.push({
        type: type,
        fileName: file.name,
        uploadedAt: new Date().toISOString()
      });
    }

    const users = getUserDB("driver");
    const storedUser = users.find(u => u.phone === user.phone);
    if (storedUser) {
      storedUser.documents = documents;
      storedUser.bankAccount = bankAccount.value.trim();
      storedUser.verifiedAt = null;
      storedUser.statusMessage = "Pending admin review";
      saveUserDB("driver", users);
    }

    showStep("pendingApproval");
  } catch (error) {
    console.error("Document upload error:", error);
    alert("Error uploading documents: " + error.message);
    documentForm.disabled = false;
  }
});

// Initialize
window.addEventListener("load", async () => {
  await checkExistingUser();
  if (!currentUser) {
    showStep("phone");
  }
});
