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

/**
 * Cheap probe: does the Storage bucket actually exist?
 * A missing bucket makes uploadBytes retry for many minutes before failing,
 * so we check once (and cache the result) instead of hanging the submit button.
 */
let storageAvailable = null

async function checkStorageAvailable() {
  if (storageAvailable !== null) return storageAvailable
  try {
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o?maxResults=1`,
    )
    // 404 = bucket does not exist → Storage unusable; anything else → usable
    storageAvailable = res.status !== 404
  } catch {
    storageAvailable = false
  }
  return storageAvailable
}

/** Compress + convert a File to a base64 data URL (kept small for Firestore). */
async function fileToDataURL(file, { maxDim = 1280, quality = 0.82 } = {}) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const dataUrl = `data:image/jpeg;base64,${btoa(bin)}`
  if (bitmap.close) bitmap.close()
  return dataUrl
}

/** Upload a payment screenshot and create the registration document. */
export async function createRegistration({ registrationId, payload, file }) {
  if (!db) throw new Error('Firebase is not configured')

  // 1. Try Firebase Storage ONLY if the bucket actually exists
  //    (a missing bucket makes uploadBytes retry for minutes → submit hangs)
  let screenshot = ''
  let paymentPath = `inline/${registrationId}`

  const canUseStorage = Boolean(storage) && (await checkStorageAvailable())

  if (canUseStorage) {
    try {
      const ext = file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')
      const path = `payment-screenshots/${registrationId}/payment-proof.${ext}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file, { contentType: file.type })
      screenshot = await getDownloadURL(storageRef)
      paymentPath = path
    } catch (storageErr) {
      // Storage failed at upload time → inline fallback
      screenshot = await fileToDataURL(file)
      paymentPath = `inline/${registrationId}`
    }
  } else {
    // Storage not available → store as base64 data URL directly in Firestore
    screenshot = await fileToDataURL(file)
  }

  // Keep the document safely under Firestore's 1MB limit
  if (screenshot.startsWith('data:') && screenshot.length > 900000) {
    screenshot = await fileToDataURL(file, { maxDim: 900, quality: 0.6 })
  }

  // 3. Create the Firestore document
  await addDoc(collection(db, REGISTRATIONS), {
    registration_id: registrationId,
    full_name: payload.full_name,
    jersey_number: payload.jersey_number,
    tshirt_size: payload.tshirt_size,
    no_tshirt_print: payload.no_tshirt_print,
    payment_method: payload.payment_method,
    payment_screenshot: screenshot,
    payment_path: paymentPath,
    status: 'Pending',
    created_at: serverTimestamp(),
  })

  return { registrationId, downloadURL: screenshot }
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
  // Best-effort cleanup of the screenshot file (skip inline base64 entries)
  if (reg.payment_path && storage && !String(reg.payment_path).startsWith('inline/')) {
    await deleteObject(ref(storage, reg.payment_path)).catch(() => {})
  }
}
