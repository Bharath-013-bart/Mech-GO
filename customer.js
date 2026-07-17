// MECH-GO Customer Dashboard
// Allow customers to log in on this page instead of redirecting immediately.
let session = loadSession("customer");
let orders = loadOrders();
let chatMessages = loadChatMessages();
let currentOrderId = null;

const authModal = qs("authModal");
const authForm = qs("authForm");
const authClose = qs("authClose");
const authUsername = qs("authUsername");
const authPhone = qs("authPhone");

const userGreeting = qs("userGreeting");
const logoutBtn = qs("logoutBtn");

const homeSection = qs("homeSection");
const ordersSection = qs("ordersSection");
const trackingSection = qs("trackingSection");
const historySection = qs("historySection");

const homeBtn = qs("homeBtn");
const ordersBtn = qs("ordersBtn");
const historyBtn = qs("historyBtn");

const customerName = qs("customerName");
const fuelOrderForm = qs("fuelOrderForm");
const activeOrdersList = qs("activeOrdersList");
const orderHistory = qs("orderHistory");

const backToOrdersBtn = qs("backToOrdersBtn");
const orderDetails = qs("orderDetails");
const statusTimeline = qs("statusTimeline");
const driverName = qs("driverName");

const chatMessages_el = qs("chatMessages");
const chatForm = qs("chatForm");
const chatInput = qs("chatInput");
const chatStatus = qs("chatStatus");

function setupFirebaseAuthObserver() {
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user && session) {
        await loadOrdersFromFirestore();
      }
    });
  }
}

// Initialize
function init() {
  setupFirebaseAuthObserver();

  if (!session) {
    showAuthModal();
  } else {
    syncUI();
    loadOrdersFromFirestore();
  }
}

function showAuthModal() {
  authModal.classList.remove("hidden");
  authUsername.focus();
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function showSection(section) {
  [homeSection, ordersSection, trackingSection, historySection].forEach(s => {
    if (s) s.classList.add("hidden");
  });
  if (section) section.classList.remove("hidden");
  
  [homeBtn, ordersBtn, historyBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });
}

function syncUI() {
  if (session) {
    customerName.textContent = session.username;
    userGreeting.textContent = `🎉 Welcome, ${session.username}`;
    authModal.classList.add("hidden");
    renderOrders();
  } else {
    showAuthModal();
  }
}

async function loadOrdersFromFirestore() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        const allOrders = await getOrders();
        // Filter to only this customer's orders
        orders = allOrders.filter(o => o.customerId === currentUser.uid);
      }
    }
  } catch (error) {
    console.error("Error loading orders from Firestore:", error);
  }
}

// Event listeners
authClose?.addEventListener("click", closeAuthModal);

authModal?.addEventListener("click", (e) => {
  if (e.target === authModal) closeAuthModal();
});

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = authUsername.value.trim();
  const phone = authPhone.value.trim();
  
  if (!username || !phone) {
    alert("Please enter your name and phone number.");
    return;
  }

  try {
    let userId = `local-${Date.now()}`;
    let isFirebaseUser = false;

    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      try {
        const userCredential = await firebase.auth().signInAnonymously();
        userId = userCredential.user.uid;
        isFirebaseUser = true;

        await firebase.firestore().collection("customers").doc(userId).set({
          uid: userId,
          username,
          phone,
          verified: false,
          createdAt: new Date()
        }, { merge: true });
      } catch (firebaseError) {
        console.warn("Firebase anonymous login failed, continuing with local session:", firebaseError.message);
      }
    }

    session = { uid: userId, username, phone, joinedDate: new Date().toISOString(), isFirebaseUser };
    saveSession("customer", session);
    closeAuthModal();
    syncUI();
    loadOrdersFromFirestore();
    ordersBtn?.click();
  } catch (error) {
    alert("Error: " + error.message);
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

ordersBtn?.addEventListener("click", () => {
  showSection(ordersSection);
  ordersBtn.classList.add("active");
});

historyBtn?.addEventListener("click", () => {
  showSection(historySection);
  historyBtn.classList.add("active");
  renderHistory();
});

requestFuelBtn?.addEventListener("click", () => {
  showSection(ordersSection);
  ordersBtn.classList.add("active");
});

requestMechanicBtn?.addEventListener("click", () => {
  navigateTo("index.html");
});

// Fuel order form
fuelOrderForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const vehicle = qs("vehicle").value.trim();
    const location = qs("location").value.trim();
    const pincode = qs("pincode").value.trim();
    const fuelType = qs("fuelType").value;
    const quantity = Number(qs("quantity").value);
    const notes = qs("notes").value.trim();
    
    if (!vehicle || !location || !pincode || !fuelType || !quantity) {
      alert("Please fill in all order fields, including pincode.");
      return;
    }

    const newOrder = {
      id: Date.now(),
      type: "fuel",
      createdAt: new Date().toISOString(),
      customerId: session?.uid || `local-${Date.now()}`,
      customerName: session?.username || "Customer",
      customerPhone: session?.phone || "Not provided",
      vehicle,
      location,
      pincode,
      fuelType,
      quantity,
      notes,
      status: "waiting",
      acceptedBy: null,
      estimatedCost: quantity * 100 + 50,
    };

    orders.push(newOrder);
    saveOrders(orders);

    if (typeof createOrder === "function") {
      try {
        await createOrder({
          customerUid: session?.uid || null,
          customerName: newOrder.customerName,
          customerPhone: newOrder.customerPhone,
          vehicle,
          location,
          pincode,
          fuelType,
          quantity,
          notes,
          estimatedCost: newOrder.estimatedCost,
        });
      } catch (firebaseError) {
        console.warn("Customer order saved locally; Firestore order sync failed:", firebaseError.message);
      }
    }

    renderOrders();
    fuelOrderForm.reset();
    alert("✅ Fuel order placed! A driver will accept it shortly.");
  } catch (error) {
    console.error("Error placing order:", error);
    alert("Error placing order. Please try again.");
  }
});

function renderOrders() {
  if (!activeOrdersList) return;
  
  const activeOrders = orders.filter(o =>!["completed", "cancelled"].includes(o.status));
  
  if (activeOrders.length === 0) {
    activeOrdersList.innerHTML = '<div class="empty-state">No active orders. Place one above.</div>';
    return;
  }
  
  activeOrdersList.innerHTML = activeOrders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <h3>${order.fuelType.charAt(0).toUpperCase() + order.fuelType.slice(1)} - ${order.quantity}L</h3>
        <span class="badge ${getStatusClass(order.status)}">${formatStatus(order.status)}</span>
      </div>
      <div class="order-info">
        <p><strong>📍 Location:</strong> ${order.location}</p>
        <p><strong>� Pincode:</strong> ${order.pincode || 'N/A'}</p>
        <p><strong>�🚗 Vehicle:</strong> ${order.vehicle}</p>
        <p><strong>💰 Estimated:</strong> ₹${order.estimatedCost}</p>
        <p style="font-size: 0.8rem; color: #9ca3c7;">Placed at ${formatTime(new Date(order.createdAt))}</p>
      </div>
      <button class="btn primary small" onclick="trackOrder(${order.id})">Track Order</button>
    </div>
  `).join("");
}

function trackOrder(orderId) {
  currentOrderId = orderId;
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  
  showSection(trackingSection);
  renderOrderDetails(order);
  renderStatusTimeline(order);
}

function renderOrderDetails(order) {
  orderDetails.innerHTML = `
    <div class="details-grid">
      <div>
        <label>Vehicle</label>
        <p>${order.vehicle}</p>
      </div>
      <div>
        <label>Location</label>
        <p>${order.location}</p>
      </div>
      <div>
        <label>Fuel Type & Quantity</label>
        <p>${order.fuelType.toUpperCase()} - ${order.quantity}L</p>
      </div>
      <div>
        <label>Estimated Cost</label>
        <p>₹${order.estimatedCost}</p>
      </div>
      ${order.notes ? `<div style="grid-column: 1/-1;">
        <label>Notes</label>
        <p>${order.notes}</p>
      </div>` : ""}
    </div>
  `;
}

function renderStatusTimeline(order) {
  const statuses = ["waiting", "accepted", "on-the-way", "arrived", "completed"];
  const currentIndex = statuses.indexOf(order.status);
  
  statusTimeline.innerHTML = statuses.map((status, idx) => `
    <div class="timeline-item ${idx <= currentIndex ? "completed" : ""}">
      <div class="timeline-dot"></div>
      <div class="timeline-label">${formatStatus(status)}</div>
    </div>
  `).join("");
}

function renderHistory() {
  const completed = orders.filter(o => o.status === "completed");
  
  if (completed.length === 0) {
    orderHistory.innerHTML = '<div class="empty-state">No completed orders yet.</div>';
    return;
  }
  
  orderHistory.innerHTML = completed.map(order => `
    <div class="history-item">
      <div class="history-header">
        <h4>${order.fuelType.toUpperCase()} - ${order.quantity}L</h4>
        <span class="history-date">${formatDate(new Date(order.createdAt))}</span>
      </div>
      <p>${order.location}</p>
      <p style="margin-top: 0.5rem; font-weight: bold;">₹${order.estimatedCost}</p>
    </div>
  `).join("");
}

function formatStatus(status) {
  const map = {
    "waiting": "⏳ Waiting for Driver",
    "accepted": "✓ Driver Accepted",
    "on-the-way": "🚗 On the Way",
    "arrived": "📍 Arrived",
    "completed": "✅ Completed",
  };
  return map[status] || status;
}

function getStatusClass(status) {
  return status === "waiting" ? "pending" : 
         status === "accepted" ? "accepted" :
         status === "on-the-way" ? "active" :
         status === "arrived" ? "arriving" : "completed";
}

backToOrdersBtn?.addEventListener("click", () => {
  showSection(ordersSection);
  ordersBtn.classList.add("active");
});

// Chat
chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  
  chatMessages.push({
    id: Date.now(),
    orderId: currentOrderId,
    from: "customer",
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
    chatMessages_el.innerHTML = '<div class="empty-state" style="padding: 1rem;">No messages yet. Start a conversation!</div>';
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

// Initialize app
init();
