import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNENu4wgBH_0Oyj9yEiT83r7Cn8yIx4wA",
  authDomain: "login-sasehack.firebaseapp.com",
  projectId: "login-sasehack",
  appId: "1:480797784311:web:6e0d2d46891760fa67bbf2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
