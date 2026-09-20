import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const box = document.getElementById("message");

function show(type, text) {
  box.innerHTML = "";
  const div = document.createElement("div");
  div.className = "alert alert--" + type;
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

    // Record the "save my profile" choice while the new user is still signed in.
    // Unticked writes nothing to Firestore. A failure here must not block sign-up.
    let prefSaved = true;
    if (document.getElementById("store-data").checked) {
      try {
        await setDoc(
          doc(db, "users", cred.user.uid),
          { storeData: true, email: cred.user.email, consentAt: Date.now() },
          { merge: true }
        );
      } catch (err) {
        console.error("STORAGE CONSENT ERROR:", err);
        prefSaved = false;
      }
    }

    await sendEmailVerification(cred.user);
    await signOut(auth);
    show(
      "success",
      "Account created. Check your email and click the verification link, then log in." +
        (prefSaved ? "" : " We couldn't save your data preference, so you can turn it on from your account page.")
    );
    e.target.reset();
  } catch (err) {
    console.error(err);
    if (err.code === "auth/email-already-in-use") {
      show("danger", "Email already in use");
    } else if (err.code === "auth/weak-password") {
      show("danger", "Password is too weak");
    } else {
      show("danger", "Could not create account (" + (err.code || err.message) + ")");
    }
  }
});
