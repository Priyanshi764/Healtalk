// 🔥 IMPORTANT: Replace with your actual backend URL
const API_URL = "https://healtalk.onrender.com/";

const token = localStorage.getItem("token");
if (!token) location.href = "index.html";

const authHeaders = {
  Authorization: "Bearer " + token,
};

let me = null;
let currentChat = null;

// ================= API FUNCTIONS =================

async function apiGet(path) {
  try {
    const res = await fetch(API_URL + path, {
      headers: authHeaders,
    });

    if (res.status === 401) return logout();

    return await res.json();
  } catch (err) {
    console.error("GET Error:", err);
    toast("Server error ❌");
  }
}

async function apiPost(path, body, isForm = false) {
  try {
    const opts = {
      method: "POST",
      headers: {
        Authorization: authHeaders.Authorization,
      },
    };

    if (!isForm) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    } else {
      opts.body = body;
    }

    const res = await fetch(API_URL + path, opts);

    if (res.status === 401) return logout();

    return await res.json();
  } catch (err) {
    console.error("POST Error:", err);
    toast("Server error ❌");
  }
}

async function apiPut(path, body, isForm = false) {
  try {
    const opts = {
      method: "PUT",
      headers: {
        Authorization: authHeaders.Authorization,
      },
    };

    if (!isForm) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    } else {
      opts.body = body;
    }

    const res = await fetch(API_URL + path, opts);

    if (res.status === 401) return logout();

    return await res.json();
  } catch (err) {
    console.error("PUT Error:", err);
    toast("Server error ❌");
  }
}

// ================= AUTH =================

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "index.html";
}

// ================= UI =================

const toastEl = document.getElementById("toast");

function toast(message) {
  if (!toastEl) return;

  toastEl.textContent = message;
  toastEl.classList.add("show");

  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2500);
}

// ================= PROFILE =================

async function loadProfile() {
  const user = await apiGet("/users/me");

  if (!user || user.error) return;

  me = user;

  document.getElementById("profileName").textContent = user.name;
}

// ================= FEED =================

async function loadFeed() {
  const posts = await apiGet("/posts/feed");

  if (!posts || posts.error) return;

  const feedList = document.getElementById("feedList");
  feedList.innerHTML = "";

  posts.forEach((post) => {
    const div = document.createElement("div");

    div.innerHTML = `
      <p><strong>${post.userId.name}</strong></p>
      <p>${post.content}</p>
      <button onclick="toggleLike('${post._id}')">
        ❤️ ${post.likes.length}
      </button>
    `;

    feedList.appendChild(div);
  });
}

async function toggleLike(postId) {
  await apiPost(`/posts/like/${postId}`, {});
  loadFeed();
}

// ================= CHAT =================

async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();

  if (!text || !currentChat) return;

  input.value = "";

  await apiPost("/chat/send", {
    receiverId: currentChat._id,
    message: text,
  });

  loadMessages(currentChat._id);
}

async function loadMessages(id) {
  const messages = await apiGet(`/chat/${id}`);

  const box = document.getElementById("chatMessages");
  box.innerHTML = "";

  messages.forEach((msg) => {
    const div = document.createElement("div");
    div.innerText = msg.message;
    box.appendChild(div);
  });
}

// ================= INIT =================

async function init() {
  await loadProfile();
  await loadFeed();
}

init();

