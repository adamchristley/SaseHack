import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
onAuthStateChanged(auth, (user) => {
  if (!user || !user.emailVerified) {
    window.location = "login.html";
    return;
  }
  document.getElementById("who").textContent = user.displayName || user.email;
  document.getElementById("app").hidden = false;
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location = "login.html";
});
