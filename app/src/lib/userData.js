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
// Read by the scheduled digest job (digest/send-digest.js) directly from
// Firestore — this is just the client-side save/load for the checkbox.
export async function loadEmailOptIn(uid) {
  const snap = await getDoc(userDoc(uid))
  return snap.exists() ? !!snap.data().emailOptIn : false
}

export async function saveEmailOptIn(uid, optedIn) {
  await setDoc(userDoc(uid), { emailOptIn: optedIn, updatedAt: Date.now() }, { merge: true })
}

// Whether we may keep this user's profile (resume facts) in Firestore between
// visits. `storeData` is the same field the register page's consent checkbox
// writes (public/register.js), so the choice made at sign-up and the one on the
// account page are the same switch. Off unless the user turns it on.
export async function loadStoreData(uid) {
  const snap = await getDoc(userDoc(uid))
  return snap.exists() ? !!snap.data().storeData : false
}

export async function saveStoreData(uid, allowed) {
  const payload = { storeData: allowed, consentAt: Date.now(), updatedAt: Date.now() }
  // Turning it off has to remove what we already stored, not just stop saving.
  if (!allowed) payload.profile = null
  await setDoc(userDoc(uid), payload, { merge: true })
}
