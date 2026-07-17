// MECH-GO Mechanic Dashboard
// Don't auto-redirect; let `init()` show auth modal when no session.

let session = loadSession("mechanic");
let mechanicRequests = loadMechanicRequests();
let chatMessages = loadChatMessages();
let currentJobId = null;
let isOnline = false;

const authModal = qs("authModal");
const authForm = qs("authForm");
const authClose = qs("authClose");
const authUsername = qs("authUsername");
const authPhone = qs("authPhone");
const specializations = qs("specializations");

const userGreeting = qs("userGreeting");
const logoutBtn = qs("logoutBtn");

const homeSection = qs("homeSection");
const activeSection = qs("activeSection");
const completedSection = qs("completedSection");
const earningsSection = qs("earningsSection");
const profileSection = qs("profileSection");

const homeBtn = qs("homeBtn");
const activeBtn = qs("activeBtn");
const completedBtn = qs("completedBtn");
const earningsBtn = qs("earningsBtn");
const profileBtn = qs("profileBtn");

const toggleOnline = qs("toggleOnline");
const statusBadge = qs("statusBadge");
const issueFilter = qs("issueFilter");
const mechanicPincode = qs("mechanicPincode");
const availableRequestsList = qs("availableRequestsList");

const activeJobDetails = qs("activeJobDetails");
const quoteForm = qs("quoteForm");
const partsCost = qs("partsCost");
const laborCost = qs("laborCost");
const additionalCost = qs("additionalCost");
const totalAmount = qs("totalAmount");
const workCompleted = qs("workCompleted");

const chatMessages_el = qs("chatMessages");
const chatForm = qs("chatForm");
const chatInput = qs("chatInput");
const chatStatus = qs("chatStatus");

// Earnings elements
const todayEarnings = qs("todayEarnings");
const monthEarnings = qs("monthEarnings");
const todayJobs = qs("todayJobs");
const monthJobs = qs("monthJobs");
const rating = qs("rating");
const ratingCount = qs("ratingCount");
const acceptanceRate = qs("acceptanceRate");
const earningsBreakdown = qs("earningsBreakdown");

// Profile elements
const profileName = qs("profileName");
const profilePhone = qs("profilePhone");
const profileSpecializations = qs("profileSpecializations");
const profileSince = qs("profileSince");
const profileJobs = qs("profileJobs");
const completedJobsList = qs("completedJobsList");

const verificationBadge = qs("verificationBadge");

// Demo stats
const mechanicStats = {
  todayEarnings: 2850,
  monthEarnings: 42500,
  todayJobs: 2,
  monthJobs: 18,
  rating: 4.9,
  ratingCount: 87,
  acceptanceRate: 98,
  completedJobs: 245,
};

// Sample mechanic requests (simulating from customers)
const sampleRequests = [
  {
    id: 1,
    customerName: "Rajesh Kumar",
    customerPhone: "+91 98765 43210",
    vehicleType: "Car",
    problemType: "won't-start",
    problemDesc: "Car won't start. Last serviced 6 months ago.",
    location: "Whitefield, Bangalore",
    createdAt: new Date(Date.now() - 10 * 60000),
    status: "waiting",
  },
  {
    id: 2,
    customerName: "Priya Sharma",
    customerPhone: "+91 87654 32109",
    vehicleType: "Bike",
    problemType: "battery",
    problemDesc: "Battery seems weak. Lights are dim.",
    location: "Indiranagar, Bangalore",
    createdAt: new Date(Date.now() - 25 * 60000),
    status: "waiting",
  },
  {
    id: 3,
    customerName: "Amit Patel",
    customerPhone: "+91 76543 21098",
    vehicleType: "Car",
    problemType: "tyre",
    problemDesc: "Got a puncture on the highway. Need immediate help.",
    location: "Silk Board, Bangalore",
    createdAt: new Date(Date.now() - 5 * 60000),
    status: "waiting",
  },
];

// Initialize
function init() {
  // Add sample requests if none exist
  if (mechanicRequests.length === 0) {
    mechanicRequests = [...sampleRequests];
    saveMechanicRequests(mechanicRequests);
  }
  
  if (!session) {
    showAuthModal();
  } else {
    // Check if user is verified
    const users = getUserDB("mechanic");
    const user = users.find(u => u.phone === session.phone);
    
    if (user && !user.verified) {
      // Show pending verification badge
      if (verificationBadge) {
        verificationBadge.classList.remove("hidden");
      }
    }
    
    syncUI();
  }
}

function showAuthModal() {
  authModal?.classList.remove("hidden");
  authUsername?.focus();
}

function closeAuthModal() {
  authModal?.classList.add("hidden");
}

function showSection(section) {
  [homeSection, activeSection, completedSection, earningsSection, profileSection].forEach(s => {
    if (s) s.classList.add("hidden");
  });
  if (section) section.classList.remove("hidden");
  
  [homeBtn, activeBtn, completedBtn, earningsBtn, profileBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });
}

function syncUI() {
  if (session) {
    userGreeting.textContent = `👋 Welcome, ${session.username}`;
    authModal?.classList.add("hidden");
    updateOnlineStatus();
    renderAvailableRequests();
    updateStats();
  } else {
    showAuthModal();
  }
}

function updateOnlineStatus() {
  if (isOnline) {
    toggleOnline.textContent = "Go Offline";
    toggleOnline.classList.add("primary");
    statusBadge.textContent = "Online";
    statusBadge.classList.remove("offline");
  } else {
    toggleOnline.textContent = "Go Online";
    toggleOnline.classList.remove("primary");
    statusBadge.textContent = "Offline";
    statusBadge.classList.add("offline");
  }
}

// Event listeners
authClose?.addEventListener("click", closeAuthModal);

authModal?.addEventListener("click", (e) => {
  if (e.target === authModal) closeAuthModal();
});

authForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const phone = authPhone.value.trim();
  
  if (!phone) return;
  
  // Check if phone already exists
  const user = findUserByPhone("mechanic", phone);
  
  if (user) {
    // User exists - allow login
    session = { phone, id: user.id };
    saveSession("mechanic", session);
    closeAuthModal();
    syncUI();
    homeBtn?.click();
  } else {
    // New user - redirect to verification
    alert("New mechanics need to complete verification. Redirecting you now...");
    window.location.href = "mechanic-verify.html";
  }
});

logoutBtn?.addEventListener("click", () => {
  if (confirm("Are you sure you want to logout?")) {
    logout();
  }
});

homeBtn?.addEventListener("click", () => {
  showSection(homeSection);
  homeBtn.classList.add("active");
});

activeBtn?.addEventListener("click", () => {
  showSection(activeSection);
  activeBtn.classList.add("active");
  renderActiveJob();
});

completedBtn?.addEventListener("click", () => {
  showSection(completedSection);
  completedBtn.classList.add("active");
  renderCompleted();
});

earningsBtn?.addEventListener("click", () => {
  showSection(earningsSection);
  earningsBtn.classList.add("active");
});

profileBtn?.addEventListener("click", () => {
  showSection(profileSection);
  profileBtn.classList.add("active");
  renderProfile();
});

toggleOnline?.addEventListener("click", () => {
  isOnline = !isOnline;
  updateOnlineStatus();
  if (isOnline) {
    renderAvailableRequests();
  } else {
    availableRequestsList.innerHTML = '<div class="empty-state">Go online to see available repair requests in your area</div>';
  }
});

mechanicPincode?.addEventListener("input", renderAvailableRequests);
issueFilter?.addEventListener("change", renderAvailableRequests);

// Available requests
function renderAvailableRequests() {
  if (!availableRequestsList) return;
  
  if (!isOnline) {
    availableRequestsList.innerHTML = '<div class="empty-state">Go online to see available repair requests in your area</div>';
    return;
  }
  
  try {
    const filter = issueFilter?.value || "";
    const pincode = mechanicPincode?.value.trim();
    
    const available = mechanicRequests.filter(r => 
      r.status === "waiting" &&
      (!filter || r.problemType === filter) &&
      (!pincode || r.pincode === pincode)
    );
    
    if (available.length === 0) {
      availableRequestsList.innerHTML = '<div class="empty-state">No available requests right now. Check back soon!</div>';
      return;
    }
    
    availableRequestsList.innerHTML = available.map(req => `
      <div class="request-card mechanic-request">
        <div class="request-header">
          <h3>${req.vehicleType} • ${formatProblemType(req.problemType)}</h3>
          <span class="time-badge">Recently posted</span>
        </div>
        <div class="request-info">
          <p><strong>📍 Location:</strong> ${req.location}</p>
          <p><strong>🔧 Issue:</strong> ${req.problemDesc}</p>
        </div>
        <button class="btn primary full" onclick="acceptJob('${req.id}')">Accept Job</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading requests:", error);
    availableRequestsList.innerHTML = '<div class="empty-state">Error loading requests. Please try again.</div>';
  }
}

function acceptJob(jobId) {
  try {
    if (!session) {
      alert("Please sign in first");
      return;
    }

    const mechanicName = session.username || session.phone || "Mechanic";
    const requestIndex = mechanicRequests.findIndex(r => r.id.toString() === jobId.toString());
    if (requestIndex === -1) {
      alert("Request not found.");
      return;
    }

    mechanicRequests[requestIndex] = {
      ...mechanicRequests[requestIndex],
      status: "accepted",
      acceptedBy: session.phone || mechanicName,
      acceptedByName: mechanicName,
      acceptedAt: new Date().toISOString()
    };
    saveMechanicRequests(mechanicRequests);

    currentJobId = jobId;
    activeBtn.click();
    renderAvailableRequests();
    alert(`✅ Job accepted!`);
  } catch (error) {
    console.error("Error accepting job:", error);
    alert("Error accepting job. Please try again.");
  }
}

function renderActiveJob() {
  const userId = session.phone || session.username;
  const active = mechanicRequests.find(r => r.acceptedBy === userId && r.status !== "completed");
  
  if (!active) {
    activeJobDetails.innerHTML = '<div class="empty-state">No active job. Accept one from available requests to start.</div>';
    quoteForm.classList.add("hidden");
    return;
  }
  
  currentJobId = active.id;
  quoteForm.classList.remove("hidden");
  activeJobDetails.innerHTML = `
    <div class="details-grid">
      <div>
        <label>Customer</label>
        <p>${active.customerName}</p>
      </div>
      <div>
        <label>Phone</label>
        <p>${active.customerPhone}</p>
      </div>
      <div>
        <label>Vehicle</label>
        <p>${active.vehicleType}</p>
      </div>
      <div>
        <label>Location</label>
        <p>${active.location}</p>
      </div>
      <div style="grid-column: 1/-1;">
        <label>Problem Description</label>
        <p>${active.problemDesc}</p>
      </div>
    </div>
  `;
  
  renderChat();
}

// Quote calculation
[partsCost, laborCost, additionalCost].forEach(input => {
  input?.addEventListener("input", updateTotal);
});

function updateTotal() {
  const parts = Number(partsCost?.value || 0);
  const labor = Number(laborCost?.value || 0);
  const additional = Number(additionalCost?.value || 0);
  const total = parts + labor + additional;
  
  if (totalAmount) {
    totalAmount.textContent = total;
  }
}

quoteForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const active = mechanicRequests.find(r => r.id === currentJobId);
  if (!active) return;
  
  const parts = Number(partsCost?.value || 0);
  const labor = Number(laborCost?.value || 0);
  const additional = Number(additionalCost?.value || 0);
  const total = parts + labor + additional;
  const serviceDesc = qs("serviceDesc").value.trim();
  
  if (!serviceDesc || total === 0) {
    alert("Please fill in service description and at least one cost");
    return;
  }
  
  // Send quote to customer
  active.quote = {
    partsCost: parts,
    laborCost: labor,
    additionalCost: additional,
    totalCost: total,
    serviceDesc: serviceDesc,
    quotedAt: new Date(),
    status: "pending_approval",
  };
  
  if (workCompleted.checked) {
    active.status = "completed";
    active.quote.status = "approved";
    mechanicStats.todayEarnings += total;
    mechanicStats.todayJobs += 1;
    alert(`🎉 Job marked complete! ₹${total} added to your earnings.`);
    renderCompleted();
  } else {
    alert(`✅ Quote sent to customer: ₹${total}\nWaiting for approval...`);
  }
  
  saveMechanicRequests(mechanicRequests);
  updateStats();
  quoteForm.reset();
  updateTotal();
  renderActiveJob();
});

// Chat
chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  
  chatMessages.push({
    id: Date.now(),
    jobId: currentJobId,
    from: "mechanic",
    text,
    ts: formatTime(),
  });
  saveChatMessages(chatMessages);
  renderChat();
  chatInput.value = "";
});

function renderChat() {
  if (!chatMessages_el) return;
  
  const messages = chatMessages.filter(m => m.jobId === currentJobId);
  if (!messages.length) {
    chatMessages_el.innerHTML = '<div class="empty-state" style="padding: 1rem;">No messages yet. Chat with customer here!</div>';
    return;
  }
  
  chatMessages_el.innerHTML = messages.map(msg => `
    <div class="chat-message ${msg.from}">
      <div>${msg.text}</div>
      <span class="chat-meta">${msg.ts}</span>
    </div>
  `).join("");
  
  chatMessages_el.scrollTop = chatMessages_el.scrollHeight;
}

// Completed jobs
function renderCompleted() {
  const completed = mechanicRequests.filter(r => r.acceptedBy === session.username && r.status === "completed");
  
  if (completed.length === 0) {
    completedJobsList.innerHTML = '<div class="empty-state">No completed jobs yet.</div>';
    return;
  }
  
  completedJobsList.innerHTML = completed.map(job => `
    <div class="job-item">
      <div class="job-header">
        <h4>${job.customerName} • ${job.vehicleType}</h4>
        <span class="amount">₹${job.quote?.totalCost || 0}</span>
      </div>
      <p>${job.location}</p>
      <p style="font-size: 0.8rem; color: #9ca3c7;">
        ${job.quote?.serviceDesc || job.problemDesc}
      </p>
    </div>
  `).join("");
}

// Earnings
function updateStats() {
  if (todayEarnings) todayEarnings.textContent = mechanicStats.todayEarnings;
  if (monthEarnings) monthEarnings.textContent = mechanicStats.monthEarnings;
  if (todayJobs) todayJobs.textContent = mechanicStats.todayJobs;
  if (monthJobs) monthJobs.textContent = mechanicStats.monthJobs;
  if (rating) rating.textContent = mechanicStats.rating;
  if (ratingCount) ratingCount.textContent = mechanicStats.ratingCount;
  if (acceptanceRate) acceptanceRate.textContent = mechanicStats.acceptanceRate;
  
  if (earningsBreakdown) {
    const completed = mechanicRequests.filter(r => r.acceptedBy === session.username && r.status === "completed");
    if (completed.length === 0) {
      earningsBreakdown.innerHTML = '<div class="empty-state">No completed jobs yet. Start accepting requests to track earnings.</div>';
      return;
    }
    
    earningsBreakdown.innerHTML = completed.map(job => `
      <div class="earnings-row">
        <div>
          <p><strong>${job.customerName}</strong></p>
          <p style="font-size: 0.8rem; color: #9ca3c7;">${job.location} • ${job.vehicleType}</p>
        </div>
        <p style="font-weight: bold;">₹${job.quote?.totalCost || 0}</p>
      </div>
    `).join("");
  }
}

// Profile
function renderProfile() {
  if (profileName) profileName.textContent = session.username || session.phone;
  if (profilePhone) profilePhone.textContent = session.phone;
  if (profileSpecializations) profileSpecializations.textContent = (session.specializations || []).join(", ");
  if (profileSince) profileSince.textContent = formatDate(new Date(session.joinedDate));
  if (profileJobs) profileJobs.textContent = mechanicStats.completedJobs;
}

// Utilities
function formatProblemType(type) {
  const map = {
    "won't-start": "Won't Start",
    "battery": "Battery Issue",
    "tyre": "Tyre Issue",
    "overheat": "Overheating",
    "other": "Other",
  };
  return map[type] || type;
}

function getMinutesAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 60000);
  return diff;
}

// Initialize app
init();
