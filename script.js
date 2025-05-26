import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, getDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBevLNp5ZnrnBol3Kp0FCR_uyS1eqcWQCY",
  authDomain: "weminthu-2b12a.firebaseapp.com",
  databaseURL: "https://weminthu-2b12a-default-rtdb.firebaseio.com",
  projectId: "weminthu-2b12a",
  storageBucket: "weminthu-2b12a.appspot.com",
  messagingSenderId: "181634107230",
  appId: "1:181634107230:web:9fb4cfb725b1b5cd1bf1cf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

const postForm = document.getElementById("post-form");
const postText = document.getElementById("post-text");
const postsContainer = document.getElementById("posts-container");

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

let currentUser = null;

// Auth State
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    postForm.style.display = "block";
    logoutBtn.style.display = "inline-block";
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
  } else {
    postForm.style.display = "none";
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
    signupBtn.style.display = "inline-block";
  }
});

// Signup
signupBtn.onclick = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value);
    alert("Registered!");
  } catch (e) {
    alert(e.message);
  }
};

// Login
loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    alert("Logged in!");
  } catch (e) {
    alert(e.message);
  }
};

// Logout
logoutBtn.onclick = async () => {
  await signOut(auth);
};

// Create post
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return alert("You must login first!");
  const text = postText.value.trim();
  if (!text) return;
  await addDoc(collection(db, "posts"), {
    text,
    uid: currentUser.uid,
    author: currentUser.email,
    likes: 0,
    comments: [],
    createdAt: Date.now()
  });
  postForm.reset();
});

// Render posts
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, (snapshot) => {
  postsContainer.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const post = docSnap.data();
    const isOwner = currentUser && post.uid === currentUser.uid;
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <p><strong>${post.author}</strong>: ${post.text}</p>
      <div class="actions">
        <button class="like" data-id="${docSnap.id}">❤️ Like (${post.likes})</button>
        <button class="share" data-id="${docSnap.id}">🔗 Share</button>
        ${isOwner ? `
          <button class="edit" data-id="${docSnap.id}">✏️ Edit</button>
          <button class="delete" data-id="${docSnap.id}">🗑️ Delete</button>
        ` : ""}
      </div>
      <div class="comments">
        ${(post.comments || []).map(c => `<div class="comment">💬 ${c}</div>`).join("")}
        <input type="text" placeholder="Write a comment..." class="comment-input" data-id="${docSnap.id}">
      </div>
    `;
    postsContainer.appendChild(div);
  });
});

// Event Delegation
document.body.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (e.target.classList.contains("like")) {
    const ref = doc(db, "posts", id);
    const snap = await getDoc(ref);
    const likes = snap.data().likes || 0;
    await updateDoc(ref, { likes: likes + 1 });
  }

  if (e.target.classList.contains("share")) {
    const link = `${location.href.split("?")[0]}?post=${id}`;
    await navigator.clipboard.writeText(link);
    alert("Link copied!");
  }

  if (e.target.classList.contains("delete")) {
    if (confirm("Delete this post?")) {
      await deleteDoc(doc(db, "posts", id));
    }
  }

  if (e.target.classList.contains("edit")) {
    const snap = await getDoc(doc(db, "posts", id));
    const newText = prompt("Edit your post:", snap.data().text);
    if (newText !== null) {
      await updateDoc(doc(db, "posts", id), { text: newText });
    }
  }
});

// Comment on Enter
document.body.addEventListener("keypress", async (e) => {
  if (e.target.classList.contains("comment-input") && e.key === "Enter") {
    e.preventDefault();
    const id = e.target.dataset.id;
    const comment = e.target.value.trim();
    if (!comment) return;
    await updateDoc(doc(db, "posts", id), {
      comments: arrayUnion(comment)
    });
    e.target.value = "";
  }
});
