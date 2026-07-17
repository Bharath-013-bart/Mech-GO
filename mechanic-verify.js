// Mechanic Verification Flow - Using Firebase Auth + Firestore
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
const API_BASE = apiConfig?.baseURL || "http://localhost:3000";
const OTP_API_SEND = `${API_BASE}/api/send-otp`;
const OTP_API_VERIFY = `${API_BASE}/api/verify-otp`;
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
const idFile = qs("idFile");
const certFile = qs("certFile");
const selfieFile = qs("selfieFile");
const experience = qs("experience");
const specializations = qs("specializations");
const bankAccount = qs("bankAccount");
const agreeCheckbox = qs("agreeCheckbox");

const idStatus = qs("idStatus");
const certStatus = qs("certStatus");
const selfieStatus = qs("selfieStatus");

const pendingApprovalStep = qs("pendingApprovalStep");
const alreadyVerifiedStep = qs("alreadyVerifiedStep");

// Check if user already exists
function checkExistingUser() {
  const session = loadSession("mechanic");
  if (session) {
    const user = findUserByPhone("mechanic", session.phone);
    if (user) {
      currentUser = user;
      if (user.verified) {
        showStep("alreadyVerified");
      } else {
        showStep("pendingApproval");
      }
    }
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

// Step 1: Phone Verification
phoneForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const phone = phoneInput.value.trim();
  
  if (!phone) {
    alert("❌ Please enter a phone number");
    return;
  }
  
  try {
    await waitForFirebase();
    
    phoneForm.disabled = true;
    currentPhone = phone;
    otpPhone.textContent = `OTP will be sent to ${phone}`;
    
    await sendBackendOTP(phone);
    
    showStep("otp");
    otpInput.focus();
    if (demoOTP) {
      console.log(`Demo OTP: ${demoOTP}`);
    }
  } catch (error) {
    console.error("Phone verification error:", error);
    alert("❌ Error: " + error.message);
    phoneForm.disabled = false;
  }
});

// Step 2: OTP Verification
otpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const enteredOTP = otpInput.value.trim();
  
  if (!enteredOTP || enteredOTP.length !== 6) {
    alert("❌ Please enter a valid 6-digit OTP");
    return;
  }
  
  try {
    await waitForFirebase();
    
    otpForm.disabled = true;
    await verifyBackendOTP(currentPhone, enteredOTP);

    let user = findUserByPhone("mechanic", currentPhone);
    if (!user) {
      user = {
        id: Date.now(),
        phone: currentPhone,
        createdAt: new Date().toISOString(),
        verified: false,
        verifiedAt: null,
        documents: [],
        experience: null,
        specializations: [],
        bankAccount: ""
      };
      const users = getUserDB("mechanic");
      users.push(user);
      saveUserDB("mechanic", users);
    }

    currentUser = user;
    saveSession("mechanic", { username: currentPhone, phone: currentPhone, userId: user.id });

    showStep("documents");
    documentForm.reset();
    alert("✅ Phone verified! Now upload your documents.");
    otpForm.disabled = false;
  } catch (error) {
    console.error("OTP verification error:", error);
    alert("❌ Error: " + error.message);
    otpForm.disabled = false;
  }
});

// Resend OTP
resendOtpBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  
  try {
    if (!currentPhone) {
      alert("❌ Please start phone verification again");
      return;
    }
    await sendBackendOTP(currentPhone);
    alert("✅ OTP resent to " + currentPhone);
  } catch (error) {
    console.error("Resend OTP error:", error);
    alert("❌ Error: " + error.message);
  }
});

// File upload handlers
[idFile, certFile, selfieFile].forEach(input => {
  input?.addEventListener("change", (e) => {
    const status = e.target.id === "idFile" ? idStatus :
                   e.target.id === "certFile" ? certStatus :
                   selfieStatus;
    
    if (e.target.files && e.target.files.length > 0) {
      const fileName = e.target.files[0].name;
      status.textContent = `✓ ${fileName}`;
      status.style.color = "var(--accent-gold)";
    }
  });
});

// Step 3: Document Upload
documentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!idFile.files.length) {
    alert("❌ Please upload ID Proof");
    return;
  }
  
  if (!certFile.files.length) {
    alert("❌ Please upload Technical Certificate");
    return;
  }
  
  if (!selfieFile.files.length) {
    alert("❌ Please upload Selfie with ID");
    return;
  }
  
  if (!experience.value) {
    alert("❌ Please enter years of experience");
    return;
  }
  
  if (!specializations.value.trim()) {
    alert("❌ Please enter your specializations");
    return;
  }
  
  if (!bankAccount.value.trim()) {
    alert("❌ Please enter Bank Account Number");
    return;
  }
  
  if (!agreeCheckbox.checked) {
    alert("❌ Please agree to terms and conditions");
    return;
  }
  
  try {
    documentForm.disabled = true;

    let user = currentUser;
    if (!user) {
      const session = loadSession("mechanic");
      user = session ? findUserByPhone("mechanic", session.phone) : null;
    }

    if (!user) {
      alert("❌ Please verify your phone first");
      documentForm.disabled = false;
      return;
    }

    const documents = [];
    const files = [
      { file: idFile.files[0], name: "id-proof" },
      { file: certFile.files[0], name: "certificate" },
      { file: selfieFile.files[0], name: "selfie" }
    ];

    for (const { file, name } of files) {
      documents.push({
        name: file.name,
        type: name,
        uploadedAt: new Date().toISOString()
      });
    }

    const users = getUserDB("mechanic");
    const storedUser = users.find(u => u.phone === user.phone);
    if (storedUser) {
      storedUser.documents = documents;
      storedUser.experience = Number(experience.value);
      storedUser.specializations = specializations.value.split(",").map(s => s.trim());
      storedUser.bankAccount = bankAccount.value;
      storedUser.verified = false;
      saveUserDB("mechanic", users);
    }

    showStep("pendingApproval");
    alert("✅ Documents submitted! Admin will review within 24 hours.");
  } catch (error) {
    console.error("Document upload error:", error);
    alert("❌ Error uploading documents: " + error.message);
  } finally {
    documentForm.disabled = false;
  }
});

// Initialize
checkExistingUser();
if (!currentUser) {
  showStep("phone");
}
