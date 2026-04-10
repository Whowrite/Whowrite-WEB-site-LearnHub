import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKiWH7kB2AupoAoGTHrDfHDCet4oO12KA",
  authDomain: "learnhub-be20e.firebaseapp.com",
  databaseURL: "https://learnhub-be20e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "learnhub-be20e",
  storageBucket: "learnhub-be20e.firebasestorage.app",
  messagingSenderId: "241871942247",
  appId: "1:241871942247:web:55564a71122046e5f21ac2",
  measurementId: "G-WN7HHDCVKE"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
// export const storage = getStorage(app);

export default app;