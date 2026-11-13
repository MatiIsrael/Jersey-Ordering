import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'

// ------------------------------------------------------------
// Firebase config from environment variables (.env)
// These values identify the project — they are safe to expose;
// real security is enforced by the rules in /firebase/*.rules
// and by Firebase Auth (admin password is NEVER stored in code).
// ------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId) &&
  !String(firebaseConfig.apiKey).includes('YOUR_')

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

/* ---------------- Auth helpers ---------------- */

/** Admin login with email + password (password never stored in code). */
export function adminLogin(email, password) {
  if (!auth) return Promise.reject(new Error('Firebase is not configured'))
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

/** Admin logout. */
export function adminLogout() {
  if (!auth) return Promise.resolve()
  return signOut(auth)
}

/** Subscribe to auth state; returns an unsubscribe function. */
export function onAuth(cb) {
  if (!auth) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(auth, cb)
}

/* ---------------- Firestore: registrations ---------------- */

const REGISTRATIONS = 'registrations'

/** Live subscription to all registrations (newest first). Returns unsubscribe. */
export function subscribeRegistrations(cb, onError) {
  if (!db) {
    onError(new Error('Firebase is not configured'))
    return () => {}
  }
  const q = query(collection(db, REGISTRATIONS), orderBy('created_at', 'desc'))
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

/** Upload a payment screenshot and create the registration document. */
export async function createRegistration({ registrationId, payload, file }) {
  if (!db || !storage) throw new Error('Firebase is not configured')

  // 1. Upload the screenshot to Storage: payment-screenshots/{regId}/payment-proof.ext
  const ext = file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')
  const path = `payment-screenshots/${registrationId}/payment-proof.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })

  // 2. Get a public download URL for the dashboard
  const downloadURL = await getDownloadURL(storageRef)

  // 3. Create the Firestore document
  await addDoc(collection(db, REGISTRATIONS), {
    registration_id: registrationId,
    full_name: payload.full_name,
    jersey_number: payload.jersey_number,
    tshirt_size: payload.tshirt_size,
    no_tshirt_print: payload.no_tshirt_print,
    payment_method: payload.payment_method,
    payment_screenshot: downloadURL,
    payment_path: path,
    status: 'Pending',
    created_at: serverTimestamp(),
  })

  return { registrationId, downloadURL }
}

/** Update the status of a registration (Pending / Verified / Rejected). */
export async function updateRegistrationStatus(docId, status) {
  if (!db) throw new Error('Firebase is not configured')
  await updateDoc(doc(db, REGISTRATIONS, docId), { status })
}

/** Delete a registration (Firestore doc + its screenshot in Storage). */
export async function deleteRegistration(reg) {
  if (!db) throw new Error('Firebase is not configured')
  await deleteDoc(doc(db, REGISTRATIONS, reg.id))
  // Best-effort cleanup of the screenshot file
  if (reg.payment_path && storage) {
    await deleteObject(ref(storage, reg.payment_path)).catch(() => {})
  }
}
