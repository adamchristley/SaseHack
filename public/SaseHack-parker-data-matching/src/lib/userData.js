import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from '../firebase-config.js'

function userDoc(uid) {
  return doc(db, 'users', uid)
}

export async function loadProfile(uid) {
  const snap = await getDoc(userDoc(uid))
  return snap.exists() ? snap.data().profile || null : null
}

export async function saveProfile(uid, profile) {
  await setDoc(userDoc(uid), { profile, updatedAt: Date.now() }, { merge: true })
}

export async function loadAlertedIds(uid) {
  const snap = await getDoc(userDoc(uid))
  return new Set(snap.exists() ? snap.data().alertedIds || [] : [])
}

export async function saveAlertedIds(uid, idsSet) {
  await setDoc(userDoc(uid), { alertedIds: [...idsSet], updatedAt: Date.now() }, { merge: true })
}

// Whether this user wants the weekly "best matches" email digest.
// Read by the scheduled Cloud Function (functions/index.js) directly from
// Firestore — this is just the client-side save/load for the checkbox.
export async function loadEmailOptIn(uid) {
  const snap = await getDoc(userDoc(uid))
  return snap.exists() ? !!snap.data().emailOptIn : false
}

export async function saveEmailOptIn(uid, optedIn) {
  await setDoc(userDoc(uid), { emailOptIn: optedIn, updatedAt: Date.now() }, { merge: true })
}