import { initializeApp, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"
import { getStorage, FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let appInternal: FirebaseApp | null = null
let authInternal: Auth | null = null
let dbInternal: Firestore | null = null
let storageInternal: FirebaseStorage | null = null

try {
  // Initialize Firebase
  appInternal = initializeApp(firebaseConfig)
  authInternal = getAuth(appInternal)
  dbInternal = getFirestore(appInternal)
  storageInternal = getStorage(appInternal)
} catch (error) {
  console.warn("Firebase initialization failed:", error)
  // Keep internals null; exports below are typed but will fail at runtime if used.
}
// Export typed instances to satisfy TypeScript signatures across the app.
// If Firebase is not configured, using these will throw at runtime when first used.
export const auth = authInternal as unknown as Auth
export const db = dbInternal as unknown as Firestore
export const storage = storageInternal as unknown as FirebaseStorage
export default appInternal
