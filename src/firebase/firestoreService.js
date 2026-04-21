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
  increment,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from './config';

// Додати новий урок
export const addLesson = async (lessonData) => {
  const lessonRef = await addDoc(collection(db, 'lessons'), {
    ...lessonData,
    uploaded_at: serverTimestamp(),
    views_count: 0,
    likes_count: 0,
    completions_count: 0,
    //is_approved: false,
    status: 'pending',
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

export const getAllLessonsWithFilter = async (status = 'approved') => {
  const q = query(collection(db, 'lessons'), where('status', '==', status), orderBy('uploaded_at', 'desc'));
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

export const createUserProfile = async (userId, userData) => {
  await setDoc(doc(db, 'users', userId), {
    ...userData,
    created_at: serverTimestamp(),
    lessons_count: 0,
    learned_count: 0,
  });
};

// Оновити прогрес уроку для користувача
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

// Зберегти результат тесту
export const saveTestResult = async (userId, lessonId, resultData) => {
  const resultRef = await addDoc(
    collection(db, 'testResults'),
    {
      user_id: userId,
      lesson_id: lessonId,
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

// Поставити/зняти лайк уроку
export const toggleLike = async (userId, lessonId) => {
  const likeId = `${userId}_${lessonId}`;
  const likeRef = doc(db, 'likes', likeId);
  const lessonRef = doc(db, 'lessons', lessonId);

  const likeSnap = await getDoc(likeRef);

  const batch = writeBatch(db);

  if (likeSnap.exists()) {
    // Видаляємо лайк
    batch.delete(likeRef);
    batch.update(lessonRef, { likes_count: increment(-1) });
  } else {
    // Ставимо лайк
    batch.set(likeRef, {
      user_id: userId,
      lesson_id: lessonId,
      created_at: serverTimestamp()
    });
    batch.update(lessonRef, { likes_count: increment(1) });
  }

  await batch.commit();
  return !likeSnap.exists(); // повертаємо true, якщо лайк поставлено
};

// Перевірити, чи користувач вже лайкнув урок
export const hasUserLikedLesson = async (userId, lessonId) => {
  const likeId = `${userId}_${lessonId}`;
  const likeRef = doc(db, 'likes', likeId);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
};

// Додати коментар до уроку
export const addComment = async (lessonId, userId, userName, text, userAvatar) => {
  if (!text || text.trim() === '') throw new Error("Текст коментаря не може бути порожнім");

  const commentRef = await addDoc(collection(db, 'comments'), {
    lesson_id: lessonId,
    user_id: userId,
    user_name: userName,
    user_avatar: userAvatar || `https://i.pravatar.cc/128?u=${userId}`,
    text: text.trim(),
    created_at: serverTimestamp()
  });

  return commentRef.id;
};

// Отримати коментарі до уроку (останні 10)
export const getLessonComments = async (lessonId) => {
  const q = query(
    collection(db, 'comments'),
    where('lesson_id', '==', lessonId),
    orderBy('created_at', 'desc'),
    limit(10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export default {
  addLesson,
  getAllLessons,
  getLessonById,
  incrementViews,
  createUserProfile,
  updateLessonProgress,
  saveTestResult,
};