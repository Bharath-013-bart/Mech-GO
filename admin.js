// Admin Dashboard
// Page protection - will be handled by initAdmin() function
// But ensure navigation is available first

let adminSession = loadSession("admin");
let selectedUser = null;
let selectedUserType = null;

const logoutBtn = qs("logoutBtn");
const adminTabs = document.querySelectorAll(".admin-tab");
const driversList = qs("driversList");
const mechanicsList = qs("mechanicsList");
const approvedDriversList = qs("approvedDriversList");
const approvedMechanicsList = qs("approvedMechanicsList");
const driverCount = qs("driverCount");
const mechanicCount = qs("mechanicCount");

const detailModal = qs("detailModal");
const detailClose = qs("detailClose");
const detailName = qs("detailName");
const detailRole = qs("detailRole");
const detailPhone = qs("detailPhone");
const detailSubmittedAt = qs("detailSubmittedAt");
const detailDocuments = qs("detailDocuments");
const detailExtra = qs("detailExtra");
const approveBtn = qs("approveBtn");
const rejectBtn = qs("rejectBtn");

const adminTabsSubElements = document.querySelectorAll(".admin-tab-sub");
const approvedDriversSection = qs("approvedDriversSection");
const approvedMechanicsSection = qs("approvedMechanicsSection");

// Check admin access
function initAdmin() {
  if (!adminSession) {
    const username = prompt("Enter admin username:");
    const password = prompt("Enter admin password:");

    if (username === "admin" && password === "admin123") {
      adminSession = { username, role: "admin", loginTime: new Date().toISOString() };
      saveSession("admin", adminSession);
    } else {
      alert("❌ Invalid admin credentials");
      navigateTo("index.html");
    }
  }
}

function logoutAdmin() {
  clearSession("admin");
  navigateTo("index.html");
}

// Tab switching
adminTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    
    adminTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    
    document.querySelectorAll(".admin-tab-content").forEach(el => el.classList.add("hidden"));
    document.getElementById(tabName + "Tab")?.classList.remove("hidden");
    
    if (tabName === "drivers") renderPendingDrivers();
    else if (tabName === "mechanics") renderPendingMechanics();
    else if (tabName === "approved") renderApprovedUsers();
  });
});

// Sub-tabs for approved users
adminTabsSubElements.forEach(tab => {
  tab.addEventListener("click", () => {
    const subtab = tab.dataset.subtab;
    
    adminTabsSubElements.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    
    [approvedDriversSection, approvedMechanicsSection].forEach(el => el.classList.add("hidden"));
    
    if (subtab === "approved-drivers") approvedDriversSection?.classList.remove("hidden");
    else if (subtab === "approved-mechanics") approvedMechanicsSection?.classList.remove("hidden");
  });
});

// Render pending drivers
async function renderPendingDrivers() {
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection("drivers").where("verified", "==", false).get();
    const pending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    driverCount.textContent = pending.length;
    
    if (pending.length === 0) {
      driversList.innerHTML = '<div class="empty-state">No pending driver verifications</div>';
      return;
    }
    
    driversList.innerHTML = pending.map(driver => `
      <div class="verification-card-item">
        <div class="verification-header">
          <h3>${driver.phone}</h3>
          <span class="status-badge pending">Pending Review</span>
        </div>
        <div class="verification-info">
          <p><strong>Status:</strong> Awaiting approval</p>
          <p style="font-size: 0.85rem; color: var(--muted);">Submitted: ${driver.createdAt ? new Date(driver.createdAt.toDate()).toLocaleString() : "Unknown"}</p>
        </div>
        <button class="btn primary small" onclick="viewDetails('driver', '${driver.id}')">Review</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading pending drivers:", error);
    driversList.innerHTML = '<div class="empty-state">Error loading drivers. Please try again.</div>';
  }
}

// Render pending mechanics
async function renderPendingMechanics() {
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection("mechanics").where("verified", "==", false).get();
    const pending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    mechanicCount.textContent = pending.length;
    
    if (pending.length === 0) {
      mechanicsList.innerHTML = '<div class="empty-state">No pending mechanic verifications</div>';
      return;
    }
    
    mechanicsList.innerHTML = pending.map(mechanic => `
      <div class="verification-card-item">
        <div class="verification-header">
          <h3>${mechanic.phone}</h3>
          <span class="status-badge pending">Pending Review</span>
        </div>
        <div class="verification-info">
          <p><strong>Specializations:</strong> ${mechanic.specializations?.join(", ") || "Not specified"}</p>
          <p><strong>Experience:</strong> ${mechanic.experience || 0} years</p>
          <p style="font-size: 0.85rem; color: var(--muted);">Submitted: ${mechanic.createdAt ? new Date(mechanic.createdAt.toDate()).toLocaleString() : "Unknown"}</p>
        </div>
        <button class="btn primary small" onclick="viewDetails('mechanic', '${mechanic.id}')">Review</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading pending mechanics:", error);
    mechanicsList.innerHTML = '<div class="empty-state">Error loading mechanics. Please try again.</div>';
  }
}

// Render approved users
function renderApprovedUsers() {
  renderApprovedDrivers();
  renderApprovedMechanics();
}

function renderApprovedDrivers() {
  const drivers = getUserDB("driver");
  const approved = drivers.filter(d => d.verified);
  
  if (approved.length === 0) {
    approvedDriversList.innerHTML = '<div class="empty-state">No approved drivers yet</div>';
    return;
  }
  
  approvedDriversList.innerHTML = approved.map(driver => `
    <div class="verification-card-item">
      <div class="verification-header">
        <h3>${driver.phone}</h3>
        <span class="status-badge verified">✓ Verified</span>
      </div>
      <div class="verification-info">
        <p><strong>Status:</strong> Active</p>
        <p><strong>Verified At:</strong> ${formatDate(new Date(driver.verifiedAt))}</p>
        <p style="font-size: 0.85rem; color: var(--muted);">Total orders: ${Math.floor(Math.random() * 50) + 10}</p>
      </div>
    </div>
  `).join("");
}

function renderApprovedMechanics() {
  const mechanics = getUserDB("mechanic");
  const approved = mechanics.filter(m => m.verified);
  
  if (approved.length === 0) {
    approvedMechanicsList.innerHTML = '<div class="empty-state">No approved mechanics yet</div>';
    return;
  }
  
  approvedMechanicsList.innerHTML = approved.map(mechanic => `
    <div class="verification-card-item">
      <div class="verification-header">
        <h3>${mechanic.phone}</h3>
        <span class="status-badge verified">✓ Verified</span>
      </div>
      <div class="verification-info">
        <p><strong>Specializations:</strong> ${mechanic.specializations?.join(", ") || "General"}</p>
        <p><strong>Rating:</strong> ⭐ ${(4.5 + Math.random()).toFixed(1)}</p>
        <p><strong>Verified At:</strong> ${formatDate(new Date(mechanic.verifiedAt))}</p>
      </div>
    </div>
  `).join("");
}

// View verification details
async function viewDetails(type, userId) {
  try {
    selectedUserType = type;
    const db = firebase.firestore();
    const doc = await db.collection(type === "driver" ? "drivers" : "mechanics").doc(userId).get();
    
    if (!doc.exists) {
      alert("User not found");
      return;
    }
    
    selectedUser = { id: doc.id, ...doc.data() };
    
    detailName.textContent = selectedUser.phone;
    detailRole.textContent = `${type === "driver" ? "🚗 Driver" : "🔧 Mechanic"} Verification`;
    detailPhone.textContent = selectedUser.phone;
    detailSubmittedAt.textContent = selectedUser.createdAt ? new Date(selectedUser.createdAt.toDate()).toLocaleString() : "Unknown";
    
    // Documents
    detailDocuments.innerHTML = (selectedUser.documents || []).map(doc => `
      <div class="document-preview">
        <div class="doc-icon" style="font-size: 2rem;">📄</div>
        <div class="doc-name">${doc.name || "Document"}</div>
        <div class="doc-status">
          <span class="badge">Uploaded</span>
        </div>
      </div>
    `).join("");
    
    // Extra details
    if (type === "driver") {
      detailExtra.innerHTML = `
        <div class="detail-section">
          <h3>Driver Information</h3>
          <div class="detail-grid">
            <div>
              <label>Name</label>
              <p>${selectedUser.name || "Not provided"}</p>
            </div>
          </div>
        </div>
      `;
    } else if (type === "mechanic") {
      detailExtra.innerHTML = `
        <div class="detail-section">
          <h3>Professional Details</h3>
          <div class="detail-grid">
            <div>
              <label>Years of Experience</label>
              <p>${selectedUser.experience || 0} years</p>
            </div>
            <div>
              <label>Specializations</label>
              <p>${selectedUser.specializations?.join(", ") || "General"}</p>
            </div>
          </div>
        </div>
      `;
    }
    
    detailModal.classList.remove("hidden");
  } catch (error) {
    console.error("Error loading user details:", error);
    alert("Error loading user details. Please try again.");
  }
}

// Approve user
approveBtn?.addEventListener("click", async () => {
  if (!selectedUser || !selectedUserType) return;
  
  try {
    const db = firebase.firestore();
    const collection = selectedUserType === "driver" ? "drivers" : "mechanics";
    
    await db.collection(collection).doc(selectedUser.id).update({
      verified: true,
      verifiedAt: new Date()
    });
    
    alert(`✅ ${selectedUserType === "driver" ? "Driver" : "Mechanic"} approved successfully!`);
    detailModal.classList.add("hidden");
    
    // Refresh the appropriate tab
    document.querySelector(`[data-tab="${selectedUserType === "driver" ? "drivers" : "mechanics"}"]`)?.click();
  } catch (error) {
    console.error("Error approving user:", error);
    alert("Error approving user. Please try again.");
  }
});

// Reject user
rejectBtn?.addEventListener("click", async () => {
  if (!selectedUser || !selectedUserType) return;
  
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;
  
  try {
    const db = firebase.firestore();
    const collection = selectedUserType === "driver" ? "drivers" : "mechanics";
    
    await db.collection(collection).doc(selectedUser.id).update({
      verified: false,
      rejectionReason: reason,
      rejectedAt: new Date()
    });
    
    alert(`Documents rejected. User has been notified.`);
    detailModal.classList.add("hidden");
    
    // Refresh
    document.querySelector(`[data-tab="${selectedUserType === "driver" ? "drivers" : "mechanics"}"]`)?.click();
  } catch (error) {
    console.error("Error rejecting user:", error);
    alert("Error rejecting user. Please try again.");
  }
});

detailClose?.addEventListener("click", () => {
  detailModal.classList.add("hidden");
});

logoutBtn?.addEventListener("click", () => {
  if (confirm("Are you sure you want to logout?")) {
    logoutAdmin();
  }
});

// Initialize
initAdmin();
renderPendingDrivers();
renderPendingMechanics();
