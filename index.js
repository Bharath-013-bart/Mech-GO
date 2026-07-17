// MECH-GO Landing Page Logic
// All event listeners are attached when DOM is ready

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}

function initializeEventListeners() {
  // Get DOM elements
  const quickRequestForm = qs("quickRequestForm");
  const primaryBookNow = qs("primaryBookNow");
  const secondaryFleetBtn = qs("secondaryFleetBtn");
  const loginDriverBtn = qs("loginDriverBtn");
  const loginMechanicBtn = qs("loginMechanicBtn");
  const loginCustomerBtn = qs("loginCustomerBtn");
  const loginAdminBtn = qs("loginAdminBtn");
  const qrPincode = qs("qrPincode");
  const mechanicForm = qs("mechanicForm");
  const mPincode = qs("mPincode");
  const authModal = qs("authModal");
  const authForm = qs("authForm");
  const authClose = qs("authClose");
  const authRole = qs("authRole");
  const authName = qs("authName");
  const authPhone = qs("authPhone");
  const authPassword = qs("authPassword");
  const authTitle = qs("authTitle");
  const authSubtitle = qs("authSubtitle");
  const adminNote = qs("adminNote");
  const estimateCostBtn = qs("estimateCostBtn");
  const bookCallBtn = qs("bookCallBtn");
  const contactForm = qs("contactForm");

  // Auth functions
  function openAuthModal(role = "customer") {
    if (!authModal) return;
    authRole.value = role;
    updateAuthFields(role);
    authModal.classList.remove("hidden");
    authName?.focus();
  }

  function closeAuthModal() {
    authModal?.classList.add("hidden");
  }

  function updateAuthFields(role) {
    if (!authRole) return;
    const showAdminFields = role === "admin";
    authTitle.textContent = showAdminFields ? "Admin Login" : "MECH-GO Login";
    authSubtitle.textContent = showAdminFields
      ? "Enter admin username and password to continue."
      : "Enter your name and mobile number to continue.";
    authPhone?.parentElement?.classList.toggle("hidden", showAdminFields);
    authPassword?.parentElement?.classList.toggle("hidden", !showAdminFields);
    adminNote?.classList.toggle("hidden", !showAdminFields);
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    if (!authForm) return;
    const role = authRole?.value || "customer";
    const name = authName?.value.trim();
    const phone = authPhone?.value.trim();
    const password = authPassword?.value.trim();

    if (role === "admin") {
      if (!name || !password) {
        alert("Please enter admin username and password.");
        return;
      }
      if (name !== "admin" || password !== "admin123") {
        alert("Invalid admin credentials.");
        return;
      }
      saveSession("admin", { username: name, role: "admin", loginTime: new Date().toISOString() });
      closeAuthModal();
      navigateTo("admin.html");
      return;
    }

    if (!name || !phone) {
      alert("Please enter your name and mobile number.");
      return;
    }
    saveSession(role, { username: name, phone, role, loginTime: new Date().toISOString() });
    closeAuthModal();

    if (role === "customer") {
      navigateTo("customer.html");
    } else if (role === "driver") {
      navigateTo("driver.html");
    } else if (role === "mechanic") {
      navigateTo("mechanic.html");
    }
  }

  // Quick request form
  quickRequestForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = qs("qrName").value.trim();
    const loc = qs("qrLocation").value.trim();
    const fuel = qs("qrFuelType").value;
    const qty = Number(qs("qrQuantity").value);

    if (!name || !loc || !qty) return;

    const orders = loadOrders();
    const newOrder = {
      id: Date.now(),
      type: "fuel",
      createdAt: new Date(),
      customerName: name,
      customerPhone: "Not provided",
      vehicle: "From quick request",
      location: loc,
      pincode: qrPincode?.value.trim() || "",
      fuelType: fuel,
      quantity: qty,
      notes: "",
      status: "waiting",
      acceptedBy: null,
      estimatedCost: qty * 100 + 50,
    };

    orders.push(newOrder);
    saveOrders(orders);

    const sessionData = { username: name, phone: "Not provided", role: "customer", loginTime: new Date().toISOString() };
    saveSession("customer", sessionData);

    setTimeout(() => {
      navigateTo("customer.html");
    }, 300);
  });

  // Hero buttons
  primaryBookNow?.addEventListener("click", () => {
    const nameInput = qs("qrName");
    if (nameInput) {
      nameInput.focus();
      nameInput.scrollIntoView({ behavior: 'smooth' });
    }
  });

  secondaryFleetBtn?.addEventListener("click", () => {
    alert("For fleet inquiries, contact: fleet@mech-go.com");
  });

  // Auth buttons
  loginDriverBtn?.addEventListener("click", () => {
    if (hasActiveSession("driver")) {
      navigateTo("driver.html");
    } else {
      navigateTo("driver-verify.html");
    }
  });

  loginMechanicBtn?.addEventListener("click", () => {
    if (hasActiveSession("mechanic")) {
      navigateTo("mechanic.html");
    } else {
      navigateTo("mechanic-verify.html");
    }
  });

  loginCustomerBtn?.addEventListener("click", () => {
    if (hasActiveSession("customer")) {
      navigateTo("customer.html");
    } else {
      openAuthModal("customer");
    }
  });

  loginAdminBtn?.addEventListener("click", () => {
    openAuthModal("admin");
  });

  // Auth modal
  authClose?.addEventListener("click", closeAuthModal);
  authModal?.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuthModal();
  });
  authRole?.addEventListener("change", () => updateAuthFields(authRole.value));
  authForm?.addEventListener("submit", handleAuthSubmit);

  // Contact form
  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    contactForm.reset();
    alert("Thank you! Our MECH-GO team will get back to you shortly.");
  });

  // Mechanic form
  mechanicForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = qs("mName").value.trim();
    const phone = qs("mPhone").value.trim();
    const vehicle = qs("mVehicle").value.trim();
    const problem = qs("mProblem").value || "Other";
    const location = qs("mLocation").value.trim();
    const pincode = mPincode?.value.trim() || "";
    const description = qs("mDescription").value.trim();

    if (!name || !phone || !vehicle || !location || !pincode) return;

    const requests = loadMechanicRequests();
    const newReq = {
      id: Date.now(),
      customerName: name,
      customerPhone: phone,
      vehicleType: vehicle.split(" - ")[0] || "Vehicle",
      problemType: problem,
      problemDesc: description || "Not specified",
      location: location,
      pincode,
      createdAt: new Date(),
      status: "waiting",
      acceptedBy: null,
    };

    requests.push(newReq);
    saveMechanicRequests(requests);

    mechanicForm.reset();
    alert("Your mechanic request has been received. The MECH-GO team will contact you soon.");
  });

  // Pricing section
  estimateCostBtn?.addEventListener("click", () => {
    const qty = qs("qrQuantity")?.value || "20";
    const estimatedCost = (qty * 100) + 50;
    alert(`Estimated Cost:\n\nFuel: ${qty}L x 100 = ${qty * 100}\nDelivery Fee: 50\n\nTotal: ${estimatedCost}\n\nNote: Final price depends on fuel type, distance, and current market rates.`);
  });

  bookCallBtn?.addEventListener("click", () => {
    alert("Fleet Specialist Booking\n\nOur fleet specialists will call you within 2 hours.\n\nPlease share your details via the contact form above.\n\nEmail: fleet@mech-go.com\nPhone: +1-000-000-000");
  });

  console.log("Landing page initialized - all buttons connected");
}
