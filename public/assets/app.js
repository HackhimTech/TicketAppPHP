const API = (action) => `/api.php?action=${action}`;
const STORAGE_KEY = "ticketapp_session";

function toast(type, text) {
  const container =
    document.querySelector(".toasts") || createToastsContainer();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function createToastsContainer() {
  const c = document.createElement("div");
  c.className = "toasts";
  document.body.appendChild(c);
  return c;
}

function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// API fetch helper that injects X-Session-Token header if session exists
async function apiFetch(action, opts = {}) {
  const url = API(action);
  const token = getSession()?.session?.token;
  const headers = opts.headers || {};
  headers["Content-Type"] = "application/json";
  if (token) headers["X-Session-Token"] = token;
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "API error");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// --- Auth functions used by login/signup pages ---
async function handleLoginForm(formEl) {
  const username = formEl.querySelector('[name="username"]').value.trim();
  const password = formEl.querySelector('[name="password"]').value.trim();
  if (!username || !password) {
    showFormError(formEl, "Both username and password are required.");
    return;
  }
  try {
    const resp = await apiFetch("login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setSession(resp);
    toast("success", "Logged in — redirecting...");
    window.location.href = "/?page=dashboard";
  } catch (e) {
    showFormError(formEl, e.message || "Login failed");
    toast("error", e.message || "Login failed");
  }
}

async function handleSignupForm(formEl) {
  const name = formEl.querySelector('[name="name"]').value.trim();
  const username = formEl.querySelector('[name="username"]').value.trim();
  const password = formEl.querySelector('[name="password"]').value.trim();
  if (!name || !username || !password) {
    showFormError(formEl, "All fields are required.");
    return;
  }
  try {
    const resp = await apiFetch("signup", {
      method: "POST",
      body: JSON.stringify({ name, username, password }),
    });
    setSession(resp);
    toast("success", "Account created — redirecting...");
    window.location.href = "/?page=dashboard";
  } catch (e) {
    showFormError(formEl, e.message || "Signup failed");
    toast("error", e.message || "Signup failed");
  }
}

function showFormError(formEl, message) {
  let e = formEl.querySelector(".form-error");
  if (!e) {
    e = document.createElement("div");
    e.className = "form-error";
    e.style.color = "var(--error)";
    e.style.marginTop = "8px";
    formEl.appendChild(e);
  }
  e.textContent = message;
}

// --- Dashboard & Tickets functions ---

async function requireAuthOrRedirect() {
  const session = getSession();
  if (!session || !session.session || !session.session.token) {
    // not logged in
    window.location.href = "/?page=auth/login";
    return false;
  }
  return true;
}

// fetch tickets
async function loadTicketsList(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  try {
    const data = await apiFetch("tickets", { method: "GET" });
    const tickets = data.tickets || [];
    renderTickets(container, tickets);
  } catch (e) {
    toast("error", e.message || "Failed to load tickets.");
    container.innerHTML =
      '<p class="helper">Failed to load tickets. Try refreshing.</p>';
  }
}

function renderTickets(container, tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    container.innerHTML =
      '<p class="helper">No tickets yet. Create one to get started.</p>';
    return;
  }
  container.innerHTML = "";
  tickets.forEach((t) => {
    const card = document.createElement("article");
    card.className = "ticket-card";
    card.innerHTML = `
      <div class="ticket-row">
        <div>
          <h4 class="ticket-title">${escapeHtml(t.title)}</h4>
          <p class="ticket-desc">${escapeHtml(t.description || "")}</p>
          <div style="margin-top:8px;"><span class="tag ${
            t.status
          }">${t.status.replace("_", " ")}</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <div class="helper">${new Date(t.created_at).toLocaleString()}</div>
          <div style="display:flex;gap:8px">
            <button class="btn ghost btn-view" data-id="${t.id}">View</button>
            <button class="btn ghost btn-edit" data-id="${t.id}">Edit</button>
            <button class="btn danger btn-delete" data-id="${
              t.id
            }">Delete</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  // attach handlers
  container
    .querySelectorAll(".btn-edit")
    .forEach((b) => b.addEventListener("click", onEditClick));
  container
    .querySelectorAll(".btn-delete")
    .forEach((b) => b.addEventListener("click", onDeleteClick));
  container
    .querySelectorAll(".btn-view")
    .forEach((b) => b.addEventListener("click", onViewClick));
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}

// view ticket (simple page)
function onViewClick(e) {
  const id = e.currentTarget.dataset.id;
  window.location.href = "/?page=tickets&id=" + encodeURIComponent(id);
}

// edit click -> open modal
async function onEditClick(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const t = await apiFetch("tickets", { method: "GET" }); // get list
    const ticket = (t.tickets || []).find((x) => x.id === id);
    if (!ticket) {
      toast("error", "Ticket not found");
      return;
    }
    showEditModal(ticket);
  } catch (err) {
    toast("error", err.message || "Failed to load ticket");
  }
}

// delete click -> confirm -> api delete
function onDeleteClick(e) {
  const id = e.currentTarget.dataset.id;
  showConfirmModal(
    "Delete ticket",
    "Are you sure you want to delete this ticket?",
    async () => {
      try {
        await apiFetch("ticket&id=" + encodeURIComponent(id), {
          method: "DELETE",
        });
        toast("success", "Ticket deleted");
        // refresh list if present
        const list =
          document.querySelector(".ticket-list .card-grid") ||
          document.querySelector("#tickets");
        if (list)
          loadTicketsList(
            list.tagName ? "#tickets" : ".ticket-list .card-grid"
          );
        // reload current page if viewing ticket
        if (
          location.search.includes("page=tickets") &&
          location.search.includes("id=")
        ) {
          window.location.href = "/?page=tickets";
        } else {
          window.location.reload();
        }
      } catch (err) {
        toast("error", err.message || "Failed to delete ticket");
      }
    }
  );
}

// --- Edit Modal functions (creates a simple modal in DOM) ---
function showEditModal(ticket) {
  removeModalIfExists();
  const modalBack = document.createElement("div");
  modalBack.className = "modal-backdrop";
  modalBack.innerHTML = `
    <div class="modal">
      <h3>Edit ticket</h3>
      <form class="edit-form">
        <div class="field">
          <label>Title *</label>
          <input name="title" type="text" value="${escapeAttr(ticket.title)}" />
          <div class="error" style="color:var(--error);display:none"></div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="description">${escapeAttr(
            ticket.description || ""
          )}</textarea>
        </div>
        <div class="field">
          <label>Status *</label>
          <select name="status">
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          <button type="button" class="btn ghost btn-cancel">Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modalBack);
  // set select to ticket status
  modalBack.querySelector('select[name="status"]').value = ticket.status;
  modalBack
    .querySelector(".btn-cancel")
    .addEventListener("click", removeModalIfExists);
  modalBack
    .querySelector(".edit-form")
    .addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      const title = form.querySelector('[name="title"]').value.trim();
      const description = form
        .querySelector('[name="description"]')
        .value.trim();
      const status = form.querySelector('[name="status"]').value;
      // validation
      if (!title) {
        const err = form.querySelector(".error");
        err.style.display = "block";
        err.textContent = "Title is required (3+ chars).";
        return;
      }
      const allowed = ["open", "in_progress", "closed"];
      if (!allowed.includes(status)) {
        toast("error", "Invalid status");
        return;
      }
      try {
        await apiFetch("ticket&id=" + encodeURIComponent(ticket.id), {
          method: "PUT",
          body: JSON.stringify({ title, description, status }),
        });
        toast("success", "Ticket updated");
        removeModalIfExists();
        // refresh
        if (document.querySelector("#tickets")) loadTicketsList("#tickets");
        else window.location.reload();
      } catch (err) {
        toast("error", err.message || "Failed to update ticket");
      }
    });
  modalBack.addEventListener("click", (ev) => {
    if (ev.target === modalBack) removeModalIfExists();
  });
}

function removeModalIfExists() {
  document.querySelectorAll(".modal-backdrop").forEach((n) => n.remove());
}

function escapeAttr(s) {
  return String(s || "")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Confirm modal ---
function showConfirmModal(title, message, onConfirm) {
  removeModalIfExists();
  const modalBack = document.createElement("div");
  modalBack.className = "modal-backdrop";
  modalBack.innerHTML = `
    <div class="modal">
      <h3>${escapeAttr(title)}</h3>
      <p>${escapeAttr(message)}</p>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button class="btn ghost btn-no">No</button>
        <button class="btn danger btn-yes">Yes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalBack);
  modalBack
    .querySelector(".btn-no")
    .addEventListener("click", removeModalIfExists);
  modalBack.querySelector(".btn-yes").addEventListener("click", () => {
    removeModalIfExists();
    onConfirm();
  });
  modalBack.addEventListener("click", (ev) => {
    if (ev.target === modalBack) removeModalIfExists();
  });
}

// --- Ticket details page (when page=tickets&id=...) ---
async function renderTicketDetails(id) {
  try {
    const resp = await apiFetch("tickets", { method: "GET" });
    const ticket = (resp.tickets || []).find((t) => t.id === id);
    const container = document.querySelector("#ticket-detail");
    if (!ticket) {
      container.innerHTML = '<p class="helper">Ticket not found</p>';
      return;
    }
    container.innerHTML = `
      <div class="card">
        <h3>${escapeHtml(ticket.title)}</h3>
        <p class="helper">${escapeHtml(ticket.description || "")}</p>
        <p>Status: <span class="tag ${ticket.status}">${ticket.status.replace(
      "_",
      " "
    )}</span></p>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn ghost btn-edit" data-id="${
            ticket.id
          }">Edit</button>
          <button class="btn danger btn-delete" data-id="${
            ticket.id
          }">Delete</button>
        </div>
      </div>
    `;
    const btnEdit = container.querySelector(".btn-edit");
    const btnDelete = container.querySelector(".btn-delete");
    if (btnEdit)
      btnEdit.addEventListener("click", () =>
        onEditClick({ currentTarget: btnEdit })
      );
    if (btnDelete)
      btnDelete.addEventListener("click", () =>
        onDeleteClick({ currentTarget: btnDelete })
      );
  } catch (e) {
    toast("error", e.message || "Failed to load ticket");
  }
}

// initialize page-specific scripts
document.addEventListener("DOMContentLoaded", () => {
  // protect dashboard and tickets pages by client-side check
  const page =
    new URLSearchParams(window.location.search).get("page") || "landing";
  if (["dashboard", "tickets"].includes(page)) {
    requireAuthOrRedirect();
  }

  // wire forms if present
  const loginForm = document.querySelector("#login-form");
  if (loginForm)
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleLoginForm(loginForm);
    });

  const signupForm = document.querySelector("#signup-form");
  if (signupForm)
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSignupForm(signupForm);
    });

  // dashboard page: load tickets if container exists
  const ticketsContainer = document.querySelector("#tickets");
  if (ticketsContainer) loadTicketsList("#tickets");

  // ticket detail page
  const detailContainer = document.querySelector("#ticket-detail");
  if (detailContainer) {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) renderTicketDetails(id);
  }

  // logout button
  const logoutBtn = document.querySelector("#btn-logout");
  if (logoutBtn)
    logoutBtn.addEventListener("click", async () => {
      const token = getSession()?.session?.token;
      try {
        if (token) {
          await fetch(API("logout"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Token": token,
            },
          });
        }
      } catch (e) {}
      clearSession();
      toast("info", "Logged out");
      window.location.href = "/?page=landing";
    });
});
