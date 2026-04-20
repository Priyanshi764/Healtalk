const API_URL = "https://your-backend.onrender.com";
const token = localStorage.getItem("token");
if (!token) location.href = "index.html";
const authHeaders = { Authorization: "Bearer " + token };
let me = null;
let currentChat = null;

const toastEl = document.getElementById("toast");
const searchResults = document.getElementById("searchResults");
const searchList = document.getElementById("searchList");
const feedList = document.getElementById("feedList");
const matchList = document.getElementById("matchList");
const groupList = document.getElementById("groupList");
const leaderboardList = document.getElementById("leaderboardList");
const notifList = document.getElementById("notifList");
const notifBadge = document.getElementById("notifBadge");
const inboxList = document.getElementById("inboxList");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const chatInputRow = document.getElementById("chatInput");
const msgInput = document.getElementById("msgInput");
const typingIndicator = document.getElementById("typingIndicator");

function showSection(section) {
  document.querySelectorAll(".section").forEach((el) => {
    el.classList.toggle("active", el.id === "sec-" + section);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle(
      "active",
      item.getAttribute("onclick")?.includes(`showSection('${section}')`)
    );
  });
  if (section === "chat") loadInbox();
  if (section === "notifications") loadNotifications();
  if (section === "profile") loadProfile();
  if (section === "feed") loadFeed();
  if (section === "match") loadMatch();
  if (section === "groups") loadGroups();
  if (section === "leaderboard") loadLeaderboard();
}

async function init() {
  await loadProfile();
  await loadFeed();
  await loadMatch();
  await loadGroups();
  await loadLeaderboard();
  await loadNotifications();
  await loadInbox();
}

async function apiGet(path) {
  const res = await fetch(API + path, { headers: authHeaders });
  if (res.status === 401) return logout();
  return res.json();
}

async function apiPost(path, body, isForm = false) {
  const opts = { method: "POST", headers: { Authorization: authHeaders.Authorization } };
  if (!isForm) opts.headers["Content-Type"] = "application/json";
  opts.body = isForm ? body : JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) return logout();
  return res.json();
}

async function apiPut(path, body, isForm = false) {
  const opts = { method: "PUT", headers: { Authorization: authHeaders.Authorization } };
  if (!isForm) opts.headers["Content-Type"] = "application/json";
  opts.body = isForm ? body : JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) return logout();
  return res.json();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "index.html";
}

function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2800);
}

async function loadProfile() {
  const user = await apiGet("/users/me");
  if (!user || user.error) return;
  me = user;
  const avatar = document.getElementById("profileAvatar");
  const topAvatar = document.getElementById("topAvatar");
  const profileName = document.getElementById("profileName");
  const profileDisease = document.getElementById("profileDisease");
  const profileBio = document.getElementById("profileBio");
  const statFollowers = document.getElementById("statFollowers");
  const statFollowing = document.getElementById("statFollowing");
  const statRating = document.getElementById("statRating");
  const editName = document.getElementById("editName");
  const editDisease = document.getElementById("editDisease");
  const editBio = document.getElementById("editBio");

  const photo = user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0072ff&color=fff`;
  if (avatar) avatar.src = photo;
  if (topAvatar) topAvatar.src = photo;
  if (profileName) profileName.textContent = user.name;
  if (profileDisease) profileDisease.textContent = user.disease || "No health tag";
  if (profileBio) profileBio.textContent = user.bio || "Share a little about yourself.";
  if (statFollowers) statFollowers.textContent = (user.followers || []).length;
  if (statFollowing) statFollowing.textContent = (user.following || []).length;
  if (statRating) statRating.textContent = user.rating?.toFixed(1) || "0.0";
  if (editName) editName.value = user.name || "";
  if (editDisease) editDisease.value = user.disease || "";
  if (editBio) editBio.value = user.bio || "";
}

async function loadFeed() {
  const posts = await apiGet("/posts/feed");
  if (!posts || posts.error) return;
  feedList.innerHTML = "";
  if (!posts.length) {
    feedList.innerHTML = `<div class="card"><p style=\"color:#cbd5e1;\">No posts yet. Create one to start the conversation.</p></div>`;
    return;
  }
  posts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="post-header">
        <img src="${post.userId.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userId.name)}&background=0072ff&color=fff`}" alt="avatar">
        <div>
          <div class="pname">${post.userId.name}</div>
          <div class="pdisease">@${post.userId.username} · ${post.userId.disease || "General"}</div>
        </div>
      </div>
      <div class="post-content">${post.content || ""}</div>
      ${post.imageUrl ? `<img class="post-img" src="${post.imageUrl}" alt="post image">` : ""}
      <div class="post-footer">
        <button class="post-btn" onclick="toggleLike('${post._id}')">❤️ ${post.likes?.length || 0}</button>
        <button class="post-btn" onclick="commentPost('${post._id}')">💬 ${post.comments?.length || 0}</button>
      </div>
    `;
    feedList.appendChild(card);
  });
}

async function toggleLike(postId) {
  await apiPost(`/posts/like/${postId}`, {});
  await loadFeed();
}

async function commentPost(postId) {
  const text = prompt("Write a comment:");
  if (!text) return;
  await apiPost(`/posts/comment/${postId}`, { text });
  await loadFeed();
}

function previewPostImg(event) {
  const preview = document.getElementById("postImgPreview");
  const file = event.target.files[0];
  if (!file) {
    preview.style.display = "none";
    preview.src = "";
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
}

async function createPost() {
  const content = document.getElementById("postContent").value.trim();
  const disease = document.getElementById("postDisease").value.trim();
  const image = document.getElementById("postImage").files[0];
  if (!content && !image) return toast("Add a post or image first.");
  const form = new FormData();
  form.append("content", content);
  form.append("disease", disease);
  if (image) form.append("image", image);
  await apiPost("/posts/create", form, true);
  document.getElementById("postContent").value = "";
  document.getElementById("postDisease").value = "";
  document.getElementById("postImage").value = "";
  document.getElementById("postImgPreview").style.display = "none";
  toast("Post created.");
  await loadFeed();
}

async function loadMatch() {
  const users = await apiGet("/users/match/disease");
  matchList.innerHTML = "";
  if (!users || users.error || !users.length) {
    matchList.innerHTML = `<div class="card"><p style=\"color:#cbd5e1;\">No matching members found yet. Update your condition to get better matches.</p></div>`;
    return;
  }
  users.forEach((user) => {
    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
      <img src="${user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0072ff&color=fff`}" alt="avatar">
      <div class="uname">${user.name}</div>
      <div class="udisease">${user.disease || "Health peer"}</div>
      <button class="btn-sm btn-primary" onclick="followUser('${user._id}')">Follow</button>
    `;
    matchList.appendChild(card);
  });
}

async function followUser(userId) {
  await apiPost(`/users/follow/${userId}`, {});
  toast("Followed successfully.");
  await loadProfile();
}

async function loadGroups() {
  const groups = await apiGet("/groups/all");
  groupList.innerHTML = "";
  if (!groups || groups.error || !groups.length) {
    groupList.innerHTML = `<div class="card"><p style=\"color:#cbd5e1;\">No groups yet. Create one or join an existing group.</p></div>`;
    return;
  }
  groups.forEach((group) => {
    const card = document.createElement("div");
    card.className = "group-card";
    const members = group.members?.length || 0;
    card.innerHTML = `
      <div>
        <div class="gname">${group.name}</div>
        <div class="gdisease">${group.disease}</div>
        <div class="gmembers">${members} members</div>
      </div>
      <button class="btn-sm btn-primary" onclick="joinGroup('${group._id}')">Join</button>
    `;
    groupList.appendChild(card);
  });
}

async function createGroup() {
  const name = document.getElementById("newGroupName").value.trim();
  const disease = document.getElementById("newGroupDisease").value.trim();
  if (!name || !disease) return toast("Enter group name and disease.");
  await apiPost("/groups/create", { name, disease });
  toast("Group created.");
  document.getElementById("newGroupName").value = "";
  document.getElementById("newGroupDisease").value = "";
  await loadGroups();
}

async function joinGroup(groupId) {
  await apiPost(`/groups/join/${groupId}`, {});
  toast("Joined group.");
  await loadGroups();
}

async function loadLeaderboard() {
  const users = await apiGet("/users/leaderboard/top");
  leaderboardList.innerHTML = "";
  if (!users || users.error || !users.length) {
    leaderboardList.innerHTML = `<div class="card"><p style=\"color:#cbd5e1;\">No leaderboard data yet.</p></div>`;
    return;
  }
  users.forEach((user, index) => {
    const item = document.createElement("div");
    item.className = "lb-item";
    item.innerHTML = `
      <div class="lb-rank">${index + 1}</div>
      <img src="${user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0072ff&color=fff`}" alt="avatar">
      <div class="lb-info"><div class="lbname">${user.name}</div><div class="lbdisease">${user.disease || "Health peer"}</div></div>
      <div class="lb-rating">${user.rating?.toFixed(1) || "0.0"}</div>
    `;
    leaderboardList.appendChild(item);
  });
}

async function loadNotifications() {
  const notes = await apiGet("/notifications");
  notifList.innerHTML = "";
  if (!notes || notes.error || !notes.length) {
    notifList.innerHTML = `<div class="card"><p style=\"color:#cbd5e1;\">No notifications yet.</p></div>`;
  } else {
    notes.forEach((note) => {
      const item = document.createElement("div");
      item.className = `notif-item ${note.isRead ? "" : "unread"}`;
      item.innerHTML = `
        <img src="${note.fromUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(note.fromUser?.name||'User')}&background=0072ff&color=fff`}" alt="avatar">
        <div class="notif-text"><strong>${note.fromUser?.name || "System"}</strong> ${note.message}</div>
        <div class="notif-time">${new Date(note.createdAt).toLocaleString()}</div>
      `;
      notifList.appendChild(item);
    });
  }
  const unread = (notes || []).filter((n) => !n.isRead).length;
  notifBadge.textContent = unread || "0";
  notifBadge.style.display = unread ? "inline-flex" : "none";
}

async function markNotifsRead() {
  await apiPut("/notifications/read", {});
  toast("Notifications marked read.");
  await loadNotifications();
}

async function updateProfile() {
  const name = document.getElementById("editName").value.trim();
  const disease = document.getElementById("editDisease").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  await apiPut("/users/update", { name, disease, bio });
  toast("Profile updated.");
  await loadProfile();
}

async function uploadPhoto() {
  const fileInput = document.getElementById("photoInput");
  const file = fileInput.files[0];
  if (!file) return;
  const form = new FormData();
  form.append("photo", file);
  await apiPost("/users/photo", form, true);
  toast("Photo uploaded.");
  await loadProfile();
}

function searchUsers() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) {
    searchResults.style.display = "none";
    return;
  }
  loadSearchResults(query);
}

async function loadSearchResults(query) {
  const users = await apiGet(`/users/search/query?q=${encodeURIComponent(query)}`);
  searchResults.style.display = "block";
  searchList.innerHTML = "";
  if (!users || users.error || !users.length) {
    searchList.innerHTML = `<div class="card"><p style=\"color:#cbd5e1;\">No users found.</p></div>`;
    return;
  }
  users.forEach((user) => {
    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
      <img src="${user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0072ff&color=fff`}" alt="avatar">
      <div class="uname">${user.name}</div>
      <div class="udisease">${user.disease || "Health peer"}</div>
      <button class="btn-sm btn-primary" onclick="followUser('${user._id}')">Follow</button>
    `;
    searchList.appendChild(card);
  });
}

async function loadInbox() {
  const chats = await apiGet("/chat/inbox/list");
  inboxList.innerHTML = "";
  if (!chats || chats.error || !chats.length) {
    inboxList.innerHTML = `<div class="card"><p style=\"color:#cbd5e1;\">No conversations yet. Start chatting from the match or search tab.</p></div>`;
    return;
  }
  chats.forEach((chat) => {
    const partner = chat.senderId?._id === me._id ? chat.receiverId : chat.senderId;
    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
      <strong>${partner.name}</strong>
      <small>@${partner.username}</small>
    `;
    card.onclick = () => selectChat(partner);
    inboxList.appendChild(card);
  });
}

async function selectChat(user) {
  currentChat = user;
  chatHeader.innerHTML = `<div style="padding:16px;display:flex;justify-content:space-between;align-items:center;"><div><strong>${user.name}</strong><div style="color:#a5b4fc;font-size:12px;">@${user.username}</div></div><button class="btn-sm btn-outline" onclick="window.location.href='chat.html'">Open full chat</button></div>`;
  chatInputRow.style.display = "flex";
  await loadMessages(user._id);
}

async function loadMessages(receiverId) {
  const messages = await apiGet(`/chat/${receiverId}`);
  chatMessages.innerHTML = "";
  if (!messages || messages.error || !messages.length) {
    chatMessages.innerHTML = `<p style=\"color:#cbd5e1;\">Start the conversation by sending a message.</p>`;
    return;
  }
  messages.forEach((message) => {
    const senderId = String(message.senderId);
    const isSelf = senderId === String(me._id);
    const item = document.createElement("div");
    item.className = "post-card";
    item.style.background = isSelf ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.06)";
    item.innerHTML = `
      <div style="font-size:13px;color:#f8fafc;">${message.message || message.fileUrl || "(attachment)"}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px;">${isSelf ? "You" : currentChat.name} · ${new Date(message.createdAt).toLocaleTimeString()}</div>
    `;
    chatMessages.appendChild(item);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !currentChat) return;
  msgInput.value = "";
  await apiPost("/chat/send", { receiverId: currentChat._id, message: text });
  await loadMessages(currentChat._id);
}

function onTyping() {
  typingIndicator.style.display = "block";
  clearTimeout(window.typingTimer);
  window.typingTimer = setTimeout(() => {
    typingIndicator.style.display = "none";
  }, 700);
}

function checkSymptoms() {
  const text = document.getElementById("symptomsInput").value.trim().toLowerCase();
  const resultEl = document.getElementById("symptomResult");
  if (!text) return toast("Describe your symptoms first.");
  let response = "Please consult a healthcare provider for a complete diagnosis.";
  if (text.includes("fever")) response = "A fever may indicate infection. Rest, hydrate, and seek medical care if it persists.";
  if (text.includes("headache")) response = "A headache can be from stress or dehydration. Drink water and rest. If it worsens, see a doctor.";
  if (text.includes("fatigue")) response = "Fatigue often improves with sleep, hydration, and gentle exercise, but check with a provider if lasting.";
  resultEl.textContent = response;
  resultEl.style.display = "block";
}

function getHealthSuggestion() {
  const text = document.getElementById("healthQuery").value.trim();
  const resultEl = document.getElementById("healthResult");
  if (!text) return toast("Ask your health question first.");
  resultEl.textContent = "Stay consistent with self-care, eat whole foods, stay hydrated, and consult your doctor for tailored advice.";
  if (text.toLowerCase().includes("diabetes")) resultEl.textContent = "For diabetes, focus on balanced meals, regular activity, and blood sugar monitoring. Reach out to your care team.";
  resultEl.style.display = "block";
}

init();

