// src/firebase/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { createUserProfile } from './firestoreService';

// Реєстрація
export const registerUser = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Оновлюємо профіль (ім'я)
  await updateProfile(user, { displayName });

  // Створюємо профіль у Firestore
  await createUserProfile(user.uid, {
    email: user.email,
    username: displayName.toLowerCase().replace(/\s+/g, ''),
    full_name: displayName,
    avatar_url: user.photoURL || `https://i.pravatar.cc/128?u=${user.uid}`,
    bio: '',
  });

  return user;
};

// Логін
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Вихід
export const logoutUser = async () => {
  await signOut(auth);
};

// Слухач стану авторизації
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};