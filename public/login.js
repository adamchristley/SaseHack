import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const box = document.getElementById("message");

function show(type, text) {
  box.innerHTML = "";

  const div = document.createElement("div");
  div.className = "alert alert--" + type;
  div.textContent = text;

  box.appendChild(div);
}

async function finishLogin(user) {
  await user.reload();

  if (!user.emailVerified) {
    await signOut(auth);

    show(
      "danger",
      "Please verify your email first. Check your inbox for the verification link."
    );

    return;
  }

  window.location.href = "/tool/#scholarships";
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await finishLogin(cred.user);

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    show(
      "danger",
      "Login failed: " + (err.code || err.message)
    );
  }
});

document.getElementById("google-btn").addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();

    const cred = await signInWithPopup(auth, provider);

    await finishLogin(cred.user);

  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);

    if (err.code !== "auth/popup-closed-by-user") {
      show(
        "danger",
        "Google sign-in failed: " + (err.code || err.message)
      );
    }
  }
});

document.getElementById("forgot-link").addEventListener("click", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    show(
      "danger",
      "Enter your email address first."
    );
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    show(
      "success",
      "If that email has an account, a password reset email was sent."
    );

  } catch (err) {
    console.error("PASSWORD RESET ERROR:", err);

    show(
      "danger",
      "Password reset failed: " + (err.code || err.message)
    );
  }
});