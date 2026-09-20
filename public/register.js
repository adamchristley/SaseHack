import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const box = document.getElementById("message");

function show(type, text) {
  box.innerHTML = "";
  const div = document.createElement("div");
  div.className = "alert alert-" + type;
  div.textContent = text;
  box.appendChild(div);
}

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fullName = document.getElementById("fullname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const repeat = document.getElementById("repeat").value;

  if (!fullName) return show("danger", "All fields are required");
  if (password.length < 8) return show("danger", "Password must be at least 8 characters long");
  if (password !== repeat) return show("danger", "Passwords do not match");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    await sendEmailVerification(cred.user);
    await signOut(auth);
    show("success", "Account created. Check your email and click the verification link, then log in.");
    e.target.reset();
  } catch (err) {
    console.error(err);
    if (err.code === "auth/email-already-in-use") {
      show("danger", "Email already in use");
    } else if (err.code === "auth/weak-password") {
      show("danger", "Password is too weak");
    } else {
      show("danger", "Cod not create account (" + (err.code || err.message) + ")");
    }
  }
});
