// Backend API URL
const API_URL = "https://healtalk-4.onrender.com/api";

const token = localStorage.getItem("token");
if (!token) location.href = "index.html";

const authHeaders = {
  Authorization: "Bearer " + token,
  "Content-Type": "application/json"
};

let me = null;
let currentChat = null;
let socket = null;

// ================= API FUNCTIONS =================

async function apiGet(path) {
  try {
    const res = await fetch(API_URL + path, { headers: authHeaders });
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
      headers: { Authorization: authHeaders.Authorization }
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
      headers: { Authorization: authHeaders.Authorization }
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
  setTimeout(() => toastEl.classList.remove("show"), 2500);
}

// ================= NAVIGATION =================

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".section").forEach(el => el.classList.remove("active"));
  
  // Show selected section
  const section = document.getElementById("sec-" + sectionId);
  if (section) {
    section.classList.add("active");
    
    // Load data for the section
    if (sectionId === "feed") loadFeed();
    else if (sectionId === "match") loadMatch();
    else if (sectionId === "chat") loadInbox();
    else if (sectionId === "groups") loadGroups();
    else if (sectionId === "notifications") loadNotifications();
    else if (sectionId === "leaderboard") loadLeaderboard();
    else if (sectionId === "profile") loadProfile();
  }
  
  // Update nav items
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  event.target.closest(".nav-item")?.classList.add("active");
}

// ================= PROFILE =================

async function loadProfile() {
  const user = await apiGet("users/me");
  if (!user || user.error) return;
  
  me = user;
  
  document.getElementById("profileName").textContent = user.name;
  document.getElementById("profileDisease").textContent = user.disease || "No condition";
  document.getElementById("profileBio").textContent = user.bio || "";
  document.getElementById("profileAvatar").src = user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=0072ff&color=fff`;
  document.getElementById("topAvatar").src = user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=0072ff&color=fff`;
  
  document.getElementById("statFollowers").textContent = user.followers?.length || 0;
  document.getElementById("statFollowing").textContent = user.following?.length || 0;
  document.getElementById("statRating").textContent = (user.rating || 0).toFixed(1);
  
  document.getElementById("editName").value = user.name;
  document.getElementById("editDisease").value = user.disease || "";
  document.getElementById("editBio").value = user.bio || "";
}

async function updateProfile() {
  const name = document.getElementById("editName").value.trim();
  const disease = document.getElementById("editDisease").value.trim();
  const bio = document.getElementById("editBio").value.trim();
  
  if (!name) { toast("Name required"); return; }
  
  const result = await apiPut("users/me", { name, disease, bio });
  if (result && !result.error) {
    toast("Profile updated ✅");
    await loadProfile();
  } else {
    toast("Update failed ❌");
  }
}

async function uploadPhoto() {
  const file = document.getElementById("photoInput").files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append("photo", file);
  
  const result = await apiPost("users/upload-photo", formData, true);
  if (result && !result.error) {
    toast("Photo updated ✅");
    await loadProfile();
  }
}

// ================= FEED =================

async function loadFeed() {
  const posts = await apiGet("posts/feed");
  if (!posts || posts.error) return;
  
  const feedList = document.getElementById("feedList");
  feedList.innerHTML = "";
  
  posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post-card";
    
    const liked = post.likes?.includes(me?._id);
    div.innerHTML = `
      <div class="post-header">
        <img src="${post.userId?.photo || 'https://ui-avatars.com/api/?name=User&background=0072ff&color=fff'}" alt="">
        <div>
          <div class="pname">${post.userId?.name || 'Unknown'}</div>
          <div class="pdisease">${post.userId?.disease || 'No condition'}</div>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      ${post.image ? `<img src="${post.image}" class="post-img" alt="">` : ''}
      <div class="post-footer">
        <button class="post-btn ${liked ? 'liked' : ''}" onclick="toggleLike('${post._id}')">❤️ ${post.likes?.length || 0}</button>
        <button class="post-btn" onclick="commentPost('${post._id}')">💬 ${post.comments?.length || 0}</button>
        <button class="post-btn" onclick="sharePost('${post._id}')">📤 Share</button>
      </div>
    `;
    feedList.appendChild(div);
  });
}

async function createPost() {
  const content = document.getElementById("postContent").value.trim();
  const disease = document.getElementById("postDisease").value.trim();
  const imageFile = document.getElementById("postImage").files[0];
  
  if (!content) { toast("Post content required"); return; }
  
  let image = null;
  if (imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);
    const uploadRes = await apiPost("posts/upload-image", formData, true);
    image = uploadRes?.imageUrl;
  }
  
  const result = await apiPost("posts/create", { content, disease, image });
  if (result && !result.error) {
    toast("Post created ✅");
    document.getElementById("postContent").value = "";
    document.getElementById("postDisease").value = "";
    document.getElementById("postImage").value = "";
    document.getElementById("postImgPreview").style.display = "none";
    await loadFeed();
  }
}

async function toggleLike(postId) {
  await apiPost(`posts/like/${postId}`, {});
  await loadFeed();
}

function commentPost(postId) {
  toast("Comment feature coming soon 💬");
}

function sharePost(postId) {
  toast("Share feature coming soon 📤");
}

function previewPostImg(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("postImgPreview").src = e.target.result;
      document.getElementById("postImgPreview").style.display = "block";
    };
    reader.readAsDataURL(file);
  }
}

// ================= MATCH =================

async function loadMatch() {
  const users = await apiGet("users/search/query?q=");
  if (!users || users.error) return;
  
  const matchList = document.getElementById("matchList");
  matchList.innerHTML = "";
  
  users.filter(u => u._id !== me?._id).forEach(user => {
    const div = document.createElement("div");
    div.className = "user-card";
    div.innerHTML = `
      <img src="${user.photo || 'https://ui-avatars.com/api/?name=' + user.name + '&background=0072ff&color=fff'}" alt="">
      <div class="uname">${user.name}</div>
      <div class="udisease">${user.disease || 'No condition'}</div>
      <div class="stars">${'⭐'.repeat(Math.min(5, Math.ceil(user.rating || 0)))}</div>
      <button class="btn-sm btn-primary" onclick="sendMessage('${user._id}')">Message</button>
      <button class="btn-sm btn-outline" onclick="viewProfile('${user._id}')">View</button>
    `;
    matchList.appendChild(div);
  });
}

function sendMessage(userId) {
  toast("Opening chat...");
  showSection("chat");
}

function viewProfile(userId) {
  toast("Profile view coming soon 👤");
}

// ================= CHAT =================

async function loadInbox() {
  const chats = await apiGet("chat/inbox/list");
  if (!chats || chats.error) return;
  
  const inboxList = document.getElementById("inboxList");
  inboxList.innerHTML = "";
  
  chats.forEach(chat => {
    const partner = chat.senderId._id === me?._id ? chat.receiverId : chat.senderId;
    const div = document.createElement("div");
    div.className = "user-card";
    div.style.cursor = "pointer";
    div.innerHTML = `
      <strong>${partner.name}</strong>
      <small>@${partner.username}</small>
    `;
    div.onclick = () => selectChat(partner);
    inboxList.appendChild(div);
  });
}

async function selectChat(user) {
  currentChat = user;
  document.getElementById("chatHeader").innerHTML = `
    <img src="${user.photo || 'https://ui-avatars.com/api/?name=' + user.name + '&background=0072ff&color=fff'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
    <div>
      <div style="font-weight:600;color:#fff;">${user.name}</div>
      <small style="color:#00c6ff;">@${user.username}</small>
    </div>
  `;
  document.getElementById("chatInput").style.display = "flex";
  await loadMessages(user._id);
}

async function loadMessages(userId) {
  const messages = await apiGet(`chat/${userId}`);
  if (!messages || messages.error) return;
  
  const box = document.getElementById("chatMessages");
  box.innerHTML = "";
  
  messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.senderId === me?._id ? 'self' : 'other'}`;
    div.innerHTML = `
      <div>${msg.message}</div>
      <small>${msg.senderId === me?._id ? 'You' : currentChat?.name}</small>
    `;
    box.appendChild(div);
  });
  
  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  
  if (!text || !currentChat) return;
  
  input.value = "";
  
  await apiPost("chat/send", {
    receiverId: currentChat._id,
    message: text
  });
  
  await loadMessages(currentChat._id);
}

function onTyping() {
  if (socket && currentChat) {
    socket.emit("typing", { receiverId: currentChat._id, senderId: me?._id });
  }
}

function sendFile() {
  toast("File sharing coming soon 📁");
}

// ================= GROUPS =================

async function loadGroups() {
  const groups = await apiGet("groups/list");
  if (!groups || groups.error) return;
  
  const groupList = document.getElementById("groupList");
  groupList.innerHTML = "";
  
  groups.forEach(group => {
    const div = document.createElement("div");
    div.className = "group-card";
    div.innerHTML = `
      <div>
        <div class="gname">${group.name}</div>
        <div class="gdisease">${group.disease}</div>
        <div class="gmembers">${group.members?.length || 0} members</div>
      </div>
      <button class="btn-sm btn-primary" onclick="joinGroup('${group._id}')">Join</button>
    `;
    groupList.appendChild(div);
  });
}

async function createGroup() {
  const name = document.getElementById("newGroupName").value.trim();
  const disease = document.getElementById("newGroupDisease").value.trim();
  
  if (!name || !disease) { toast("Fill all fields"); return; }
  
  const result = await apiPost("groups/create", { name, disease });
  if (result && !result.error) {
    toast("Group created ✅");
    document.getElementById("newGroupName").value = "";
    document.getElementById("newGroupDisease").value = "";
    await loadGroups();
  }
}

async function joinGroup(groupId) {
  const result = await apiPost(`groups/join/${groupId}`, {});
  if (result && !result.error) {
    toast("Joined group ✅");
    await loadGroups();
  }
}

// ================= AI HEALTH =================

async function checkSymptoms() {
  const symptoms = document.getElementById("symptomsInput").value.trim();
  if (!symptoms) { toast("Describe symptoms"); return; }
  
  toast("Analyzing symptoms... 🤖");
  
  // Simulated AI response (replace with actual API call)
  const result = document.getElementById("symptomResult");
  result.innerHTML = `
    <strong>Analysis Results:</strong><br>
    Based on your symptoms: "${symptoms}"<br><br>
    <strong>Possible conditions:</strong><br>
    • Common cold or flu<br>
    • Allergies<br>
    • Stress-related symptoms<br><br>
    <strong>Recommendations:</strong><br>
    • Rest and hydration<br>
    • Monitor symptoms for 3-5 days<br>
    • Consult a doctor if symptoms persist<br><br>
    <em>⚠️ This is not medical advice. Always consult a healthcare professional.</em>
  `;
  result.style.display = "block";
}

async function getHealthSuggestion() {
  const query = document.getElementById("healthQuery").value.trim();
  if (!query) { toast("Ask a question"); return; }
  
  toast("Getting suggestions... 💡");
  
  // Simulated AI response
  const result = document.getElementById("healthResult");
  result.innerHTML = `
    <strong>Health Suggestion:</strong><br>
    For: "${query}"<br><br>
    <strong>Tips:</strong><br>
    • Maintain a balanced diet<br>
    • Exercise regularly (30 mins/day)<br>
    • Get adequate sleep (7-8 hours)<br>
    • Manage stress through meditation<br>
    • Stay hydrated<br><br>
    <em>💡 Connect with others in your condition group for more personalized advice.</em>
  `;
  result.style.display = "block";
}

// ================= NOTIFICATIONS =================

async function loadNotifications() {
  const notifs = await apiGet("notifications/list");
  if (!notifs || notifs.error) return;
  
  const notifList = document.getElementById("notifList");
  notifList.innerHTML = "";
  
  notifs.forEach(notif => {
    const div = document.createElement("div");
    div.className = `notif-item ${notif.read ? '' : 'unread'}`;
    div.innerHTML = `
      <img src="${notif.fromUser?.photo || 'https://ui-avatars.com/api/?name=User&background=0072ff&color=fff'}" alt="">
      <div>
        <div class="notif-text">${notif.message}</div>
        <div class="notif-time">${new Date(notif.createdAt).toLocaleDateString()}</div>
      </div>
    `;
    notifList.appendChild(div);
  });
}

async function markNotifsRead() {
  await apiPost("notifications/mark-read", {});
  await loadNotifications();
  toast("Marked as read ✅");
}

// ================= LEADERBOARD =================

async function loadLeaderboard() {
  const users = await apiGet("users/leaderboard");
  if (!users || users.error) return;
  
  const leaderboardList = document.getElementById("leaderboardList");
  leaderboardList.innerHTML = "";
  
  users.slice(0, 10).forEach((user, index) => {
    const div = document.createElement("div");
    div.className = "lb-item";
    div.innerHTML = `
      <div class="lb-rank">#${index + 1}</div>
      <img src="${user.photo || 'https://ui-avatars.com/api/?name=' + user.name + '&background=0072ff&color=fff'}" alt="">
      <div class="lb-info">
        <div class="lbname">${user.name}</div>
        <div class="lbdisease">${user.disease || 'No condition'}</div>
      </div>
      <div class="lb-rating">⭐ ${(user.rating || 0).toFixed(1)}</div>
    `;
    leaderboardList.appendChild(div);
  });
}

// ================= SEARCH =================

async function searchUsers() {
  const query = document.getElementById("searchInput").value.trim();
  
  if (query.length < 2) {
    document.getElementById("searchResults").style.display = "none";
    return;
  }
  
  const users = await apiGet(`users/search/query?q=${encodeURIComponent(query)}`);
  if (!users || users.error) return;
  
  const searchList = document.getElementById("searchList");
  searchList.innerHTML = "";
  
  users.filter(u => u._id !== me?._id).forEach(user => {
    const div = document.createElement("div");
    div.className = "user-card";
    div.innerHTML = `
      <img src="${user.photo || 'https://ui-avatars.com/api/?name=' + user.name + '&background=0072ff&color=fff'}" alt="">
      <div class="uname">${user.name}</div>
      <div class="udisease">${user.disease || 'No condition'}</div>
      <button class="btn-sm btn-primary" onclick="sendMessage('${user._id}')">Message</button>
    `;
    searchList.appendChild(div);
  });
  
  document.getElementById("searchResults").style.display = "block";
}

// ================= THEME =================

function toggleDark() {
  document.body.style.filter = document.body.style.filter === "invert(1)" ? "invert(0)" : "invert(1)";
}

// ================= INIT =================

async function init() {
  await loadProfile();
  await loadFeed();
  
  // Initialize Socket.io for real-time features
  try {
    socket = io("https://healtalk-4.onrender.com");
    socket.on("connect", () => console.log("Socket connected"));
    socket.on("receive-message", (data) => {
      if (currentChat && data.senderId === currentChat._id) {
        loadMessages(currentChat._id);
      }
    });
  } catch (err) {
    console.log("Socket.io not available");
  }
}

init();
