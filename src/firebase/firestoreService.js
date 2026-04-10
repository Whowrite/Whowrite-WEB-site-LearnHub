// src/firebase/firestoreService.js
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './config';

// ==================== LESSONS ====================

// Додати новий урок
export const addLesson = async (lessonData) => {
  const lessonRef = await addDoc(collection(db, 'lessons'), {
    ...lessonData,
    uploaded_at: serverTimestamp(),
    views_count: 0,
    likes_count: 0,
    completions_count: 0,
    is_approved: false,
  });
  return lessonRef.id;
};

// Отримати всі уроки (для головної сторінки)
export const getAllLessons = async () => {
  const q = query(collection(db, 'lessons'), orderBy('uploaded_at', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Отримати один урок
export const getLessonById = async (lessonId) => {
  const docRef = doc(db, 'lessons', lessonId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

// Оновити лічильник переглядів
export const incrementViews = async (lessonId) => {
  const lessonRef = doc(db, 'lessons', lessonId);
  await updateDoc(lessonRef, {
    views_count: increment(1)
  });
};

// ==================== USERS ====================

export const createUserProfile = async (userId, userData) => {
  await setDoc(doc(db, 'users', userId), {
    ...userData,
    created_at: serverTimestamp(),
    lessons_count: 0,
    learned_count: 0,
  });
};

// ==================== PROGRESS ====================

export const updateLessonProgress = async (userId, lessonId, progressData) => {
  const progressId = `${userId}_${lessonId}`;
  await setDoc(doc(db, 'progress', progressId), {
    user_id: userId,
    lesson_id: lessonId,
    is_completed: progressData.is_completed || false,
    last_position_seconds: progressData.last_position_seconds || 0,
    completed_at: progressData.is_completed ? serverTimestamp() : null,
    updated_at: serverTimestamp()
  }, { merge: true });
};

// ==================== QUIZZES ====================

export const createQuiz = async (lessonId, quizData) => {
  await setDoc(doc(db, 'quizzes', lessonId), {
    lesson_id: lessonId,
    title: quizData.title || "Перевір себе після уроку",
    passing_score: quizData.passing_score || 70,
    created_at: serverTimestamp()
  });
};

export const saveTestResult = async (userId, lessonId, resultData) => {
  const resultRef = await addDoc(
    collection(db, 'quizzes', lessonId, 'testResults'),
    {
      user_id: userId,
      score: resultData.score,
      max_score: resultData.max_score,
      passed: resultData.passed,
      completed_at: serverTimestamp(),
      answers: resultData.answers || []
    }
  );

  // Оновлюємо прогрес користувача
  await updateLessonProgress(userId, lessonId, { is_completed: resultData.passed });

  return resultRef.id;
};

export default {
  addLesson,
  getAllLessons,
  getLessonById,
  incrementViews,
  createUserProfile,
  updateLessonProgress,
  createQuiz,
  saveTestResult,
};