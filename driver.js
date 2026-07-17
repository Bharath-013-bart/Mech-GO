// MECH-GO Driver Dashboard
// Check if user is authenticated
if (!hasActiveSession("driver")) {
  navigateTo("index.html");
}

let session = loadSession("driver");
let orders = loadOrders();
let chatMessages = loadChatMessages();
let currentOrderId = null;
let isOnline = false;

const authModal = qs("authModal");
const authForm = qs("authForm");
const authClose = qs("authClose");
const authUsername = qs("authUsername");
const authPhone = qs("authPhone");
const vehicleType = qs("vehicleType");

const userGreeting = qs("userGreeting");
const logoutBtn = qs("logoutBtn");

const homeSection = qs("homeSection");
const activeSection = qs("activeSection");
const earningsSection = qs("earningsSection");
const profileSection = qs("profileSection");

const homeBtn = qs("homeBtn");
const activeBtn = qs("activeBtn");
const earningsBtn = qs("earningsBtn");
const profileBtn = qs("profileBtn");

const toggleOnline = qs("toggleOnline");
const statusBadge = qs("statusBadge");
const fuelFilter = qs("fuelFilter");
const driverPincode = qs("driverPincode");
const availableOrdersList = qs("availableOrdersList");

const activeOrderDetails = qs("activeOrderDetails");
const locationMap = qs("locationMap");
const statusControls = document.querySelectorAll(".status-btn");

const chatMessages_el = qs("chatMessages");
const chatForm = qs("chatForm");
const chatInput = qs("chatInput");
const chatStatus = qs("chatStatus");

// Earnings elements
const todayEarnings = qs("todayEarnings");
const weekEarnings = qs("weekEarnings");
const todayOrders = qs("todayOrders");
const weekOrders = qs("weekOrders");
const rating = qs("rating");
const ratingCount = qs("ratingCount");
const acceptanceRate = qs("acceptanceRate");
const earningsBreakdown = qs("earningsBreakdown");

// Profile elements
const profileName = qs("profileName");
const profilePhone = qs("profilePhone");
const profileSince = qs("profileSince");

const verificationBadge = qs("verificationBadge");

// Demo ratings and performance data
const driverStats = {
  todayEarnings: 1250,
  weekEarnings: 8750,
  todayOrders: 5,
  weekOrders: 35,
  rating: 4.8,
  ratingCount: 120,
  acceptanceRate: 95,
  completedOrders: 245,
};

// Initialize
function init() {
  if (!session) {
    showAuthModal();
  } else {
    // Check if user is verified
    const users = getUserDB("driver");
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
  [homeSection, activeSection, earningsSection, profileSection].forEach(s => {
    if (s) s.classList.add("hidden");
  });
  if (section) section.classList.remove("hidden");
  
  [homeBtn, activeBtn, earningsBtn, profileBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });
}

function syncUI() {
  if (session) {
    userGreeting.textContent = `👋 Welcome, ${session.username}`;
    authModal?.classList.add("hidden");
    updateOnlineStatus();
    renderAvailableOrders();
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
  const user = findUserByPhone("driver", phone);
  
  if (user) {
    // User exists - allow login
    session = { phone, id: user.id };
    saveSession("driver", session);
    closeAuthModal();
    syncUI();
    homeBtn?.click();
  } else {
    // New user - redirect to verification
    alert("New drivers need to complete verification. Redirecting you now...");
    window.location.href = "driver-verify.html";
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
  renderActiveOrder();
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
    renderAvailableOrders();
  } else {
    availableOrdersList.innerHTML = '<div class="empty-state">Go online to see available orders in your area</div>';
  }
});

fuelFilter?.addEventListener("change", renderAvailableOrders);

// Available orders
async function renderAvailableOrders() {
  if (!availableOrdersList) return;
  
  if (!isOnline) {
    availableOrdersList.innerHTML = '<div class="empty-state">Go online to see available orders in your area</div>';
    return;
  }
  
  try {
    // Load orders from Firestore
    const availableOrders = await getAvailableOrders();
    const filter = fuelFilter.value;
    
    const available = availableOrders.filter(o => 
      !filter || o.fuelType === filter
    );
    
    if (available.length === 0) {
      availableOrdersList.innerHTML = '<div class="empty-state">No available orders right now. Check back soon!</div>';
      return;
    }
    
    availableOrdersList.innerHTML = available.map(order => `
      <div class="order-card driver-order">
        <div class="order-header-driver">
          <h3>${order.fuelType.toUpperCase()} • ${order.quantity}L</h3>
          <span class="price">₹${order.estimatedCost}</span>
        </div>
        <div class="order-info">
          <p><strong>📍 Location:</strong> ${order.location}</p>
          <p><strong>🚗 Vehicle:</strong> ${order.vehicle}</p>
          <p><strong>🎯 Quantity:</strong> ${order.quantity}L</p>
          ${order.notes ? `<p><strong>📝 Notes:</strong> ${order.notes}</p>` : ""}
          <p style="font-size: 0.8rem; color: #9ca3c7; margin-top: 0.5rem;">Posted just now</p>
        </div>
        <button class="btn primary full" onclick="acceptOrder('${order.id}')">Accept Order (₹${order.estimatedCost})</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading orders:", error);
    availableOrdersList.innerHTML = '<div class="empty-state">Error loading orders. Please try again.</div>';
  }
}

function acceptOrder(orderId) {
  try {
    if (!session) {
      alert("Please sign in first");
      return;
    }

    const driverName = session.username || session.phone || "Driver";
    const orderIndex = orders.findIndex(o => o.id.toString() === orderId.toString());
    if (orderIndex === -1) {
      alert("Order not found.");
      return;
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      status: "accepted",
      acceptedBy: session.phone || driverName,
      acceptedByName: driverName,
      acceptedAt: new Date().toISOString()
    };
    saveOrders(orders);

    currentOrderId = orderId;
    activeBtn.click();
    renderAvailableOrders();
    alert(`✅ Order accepted!`);
  } catch (error) {
    console.error("Error accepting order:", error);
    alert("Error accepting order. Please try again.");
  }
}

function renderActiveOrder() {
  try {
    if (!session) {
      activeOrderDetails.innerHTML = '<div class="empty-state">Please sign in to view your active order.</div>';
      locationMap.innerHTML = '<p>📍 Customer location will appear here</p>';
      return;
    }

    const driverId = session.phone || session.username;
    const active = orders.find(o => 
      o.acceptedBy === driverId &&
      !["completed", "cancelled"].includes(o.status)
    );
    
    if (!active) {
      activeOrderDetails.innerHTML = '<div class="empty-state">No active order. Accept one from available orders to start.</div>';
      locationMap.innerHTML = '<p>📍 Customer location will appear here</p>';
      return;
    }
    
    currentOrderId = active.id;
    activeOrderDetails.innerHTML = `
      <div class="details-grid">
        <div>
          <label>Location</label>
          <p>${active.location}</p>
        </div>
        <div>
          <label>Fuel Type & Qty</label>
          <p>${active.fuelType.toUpperCase()} - ${active.quantity}L</p>
        </div>
        <div>
          <label>Earning</label>
          <p style="font-size: 1.2rem; color: #f5c542; font-weight: bold;">₹${active.estimatedCost}</p>
        </div>
        <div>
          <label>Status</label>
          <p>${active.status}</p>
        </div>
        ${active.notes ? `<div style="grid-column: 1/-1;">
          <label>Customer Notes</label>
          <p>${active.notes}</p>
        </div>` : ""}
      </div>
    `;
    
    locationMap.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="font-size: 2rem;">📍</p>
        <p><strong>${active.location}</strong></p>
        <p style="font-size: 0.9rem; color: #9ca3c7;">Customer is waiting for your arrival</p>
      </div>
    `;
    
    renderChat();
  } catch (error) {
    console.error("Error loading active order:", error);
    activeOrderDetails.innerHTML = '<div class="empty-state">Error loading order. Please try again.</div>';
  }
}

statusControls.forEach(btn => {
  btn.addEventListener("click", async () => {
    try {
      const newStatus = btn.dataset.status;
      
      if (!currentOrderId) {
        alert("No active order selected");
        return;
      }
      
      // Update order status in Firestore
      await updateOrder(currentOrderId, {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date().toISOString() : null
      });
      
      if (newStatus === "completed") {
        alert(`🎉 Order completed!`);
      }
      
      renderActiveOrder();
      updateStats();
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error updating order. Please try again.");
    }
  });
});

// Chat
chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  
  chatMessages.push({
    id: Date.now(),
    orderId: currentOrderId,
    from: "driver",
    text,
    ts: formatTime(),
  });
  saveChatMessages(chatMessages);
  renderChat();
  chatInput.value = "";
});

function renderChat() {
  if (!chatMessages_el) return;
  
  const messages = chatMessages.filter(m => m.orderId === currentOrderId);
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

// Earnings
function updateStats() {
  if (todayEarnings) todayEarnings.textContent = driverStats.todayEarnings;
  if (weekEarnings) weekEarnings.textContent = driverStats.weekEarnings;
  if (todayOrders) todayOrders.textContent = driverStats.todayOrders;
  if (weekOrders) weekOrders.textContent = driverStats.weekOrders;
  if (rating) rating.textContent = driverStats.rating;
  if (ratingCount) ratingCount.textContent = driverStats.ratingCount;
  if (acceptanceRate) acceptanceRate.textContent = driverStats.acceptanceRate;
  
  if (earningsBreakdown) {
    const driverId = session.phone || session.username;
  const completed = orders.filter(o => o.acceptedBy === driverId && o.status === "completed");
    if (completed.length === 0) {
      earningsBreakdown.innerHTML = '<div class="empty-state">No completed orders yet. Start accepting orders to track earnings.</div>';
      return;
    }
    
    earningsBreakdown.innerHTML = completed.map(order => `
      <div class="earnings-row">
        <div>
          <p><strong>${order.fuelType.toUpperCase()} - ${order.quantity}L</strong></p>
          <p style="font-size: 0.8rem; color: #9ca3c7;">${order.location}</p>
        </div>
        <p style="font-weight: bold;">₹${order.estimatedCost}</p>
      </div>
    `).join("");
  }
}

// Profile
function renderProfile() {
  if (profileName) profileName.textContent = session.username;
  if (profilePhone) profilePhone.textContent = session.phone;
  if (profileSince) profileSince.textContent = formatDate(new Date(session.joinedDate));
}

// Initialize app
init();
